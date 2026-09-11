import "dotenv/config";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ABI = JSON.parse(readFileSync(path.join(__dirname, "../../shared/MatchupMarket.abi.json"), "utf8"));

const PRIVATE_KEY = requireEnv("SOMNIA_PRIVATE_KEY") as `0x${string}`;
const CONTRACT_ADDRESS = requireEnv("CONTRACT_ADDRESS") as `0x${string}`;
const RPC_URL = requireEnv("RPC_URL");
const INDEXER_URL = requireEnv("INDEXER_URL");
const WS_RPC_URL = process.env.WS_RPC_URL ?? "";
const CADENCE_SEC = Number(process.env.CADENCE_SEC ?? "300");

const TICK_MS = 5_000;
const MIN_OPEN_LEAD_SEC = 20; // don't bother opening a window with less runway than this
const LOOKBACK_WINDOWS = 24; // how many past cadence boundaries to check for pending settlement
const GAS_LIMIT_OPEN = 3_000_000n;
const GAS_LIMIT_SETTLE = 2_000_000n;
const GAS_LIMIT_REFUND = 1_000_000n;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing required env var ${name}`);
  return v;
}

function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

const account = privateKeyToAccount(PRIVATE_KEY);

const chain = defineChain({
  ...somniaShannon,
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

const exchange = new SomniaMarkets({
  indexerUrl: INDEXER_URL,
  chain: somniaShannon,
  wsRpcUrl: WS_RPC_URL,
  addresses: SOMNIA_TESTNET_ADDRESSES,
});
const dreamdex = exchange.client;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function currentBoundary(): number {
  return Math.ceil(nowSec() / CADENCE_SEC) * CADENCE_SEC;
}

type ChainWindow = {
  id: bigint;
  opensAt: number;
  locksAt: number;
  expiresAt: number;
  status: number; // 0 OPEN, 1 SETTLED, 2 DRAW
  winner: number;
  potBTC: bigint;
  potETH: bigint;
  btcUp: boolean;
  ethUp: boolean;
  btcMarketId: `0x${string}`;
  ethMarketId: `0x${string}`;
};

async function readWindow(expiry: number): Promise<ChainWindow> {
  const w = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getWindow",
    args: [BigInt(expiry)],
  })) as any;
  return {
    id: w.id,
    opensAt: Number(w.opensAt),
    locksAt: Number(w.locksAt),
    expiresAt: Number(w.expiresAt),
    status: w.status,
    winner: w.winner,
    potBTC: w.potBTC,
    potETH: w.potETH,
    btcUp: w.btcUp,
    ethUp: w.ethUp,
    btcMarketId: w.btcMarketId,
    ethMarketId: w.ethMarketId,
  };
}

/** true = resolved UP, false = resolved DOWN, null = not resolved yet on DreamDEX. */
async function getUpOutcome(marketId: string, label: string): Promise<boolean | null> {
  const m = await dreamdex.getBinaryMarket(marketId);
  if (!m) {
    log(`  [${label}] market ${marketId} not found in indexer yet`);
    return null;
  }
  if (m.voided) {
    log(`  [${label}] market ${marketId} VOIDED on DreamDEX — treating as unresolved`);
    return null;
  }
  if (m.winningOutcome === null || m.winningOutcome === undefined) {
    return null;
  }
  return m.winningOutcome === 0; // 0 = YES = "closes at or above opening price" = Up
}

async function maybeOpenNextWindow() {
  const expiry = currentBoundary();
  if (expiry - nowSec() < MIN_OPEN_LEAD_SEC) return; // too close, wait for the following boundary next tick

  const existing = await readWindow(expiry);
  if (existing.expiresAt !== 0) return; // already open

  const [btcRows, ethRows] = await Promise.all([
    dreamdex.listBinaryMarkets({ asset: "BTC", status: "Trading", intervalSec: CADENCE_SEC, limit: 10 }),
    dreamdex.listBinaryMarkets({ asset: "ETH", status: "Trading", intervalSec: CADENCE_SEC, limit: 10 }),
  ]);
  const btc = btcRows.find((m) => m.mode === "reference" && Number(m.expiry) === expiry);
  const eth = ethRows.find((m) => m.mode === "reference" && Number(m.expiry) === expiry);

  if (!btc || !eth) {
    log(`waiting for DreamDEX to list BTC/ETH ${CADENCE_SEC}s markets expiring at ${expiry}`);
    return;
  }

  log(`opening window ${expiry} — btc=${btc.marketId} eth=${eth.marketId}`);
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "openWindow",
    args: [BigInt(expiry), btc.marketId as `0x${string}`, eth.marketId as `0x${string}`],
    gas: GAS_LIMIT_OPEN,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  log(`  window ${expiry} opened (tx ${hash})`);
}

async function trySettlePendingWindows() {
  const boundary = currentBoundary();
  for (let i = 1; i <= LOOKBACK_WINDOWS; i++) {
    const expiry = boundary - CADENCE_SEC * i;
    if (expiry <= 0) break;

    const w = await readWindow(expiry);
    if (w.expiresAt === 0) continue; // never opened, nothing to settle
    if (w.status !== 0) continue; // already SETTLED or DRAW
    if (nowSec() < w.expiresAt) continue; // shouldn't happen given i>=1, but guard anyway

    const gracePeriod = 30 * 60; // mirrors contract GRACE_PERIOD; keep resolver ahead of the timeout
    const stuckDeadline = w.expiresAt + gracePeriod - 60;

    const [btcUp, ethUp] = await Promise.all([
      getUpOutcome(w.btcMarketId, "BTC"),
      getUpOutcome(w.ethMarketId, "ETH"),
    ]);

    if (btcUp === null || ethUp === null) {
      log(`window ${expiry}: DreamDEX not resolved yet (btc=${btcUp} eth=${ethUp})`);
      if (nowSec() >= stuckDeadline) {
        log(`window ${expiry}: approaching grace-period timeout, forcing refund`);
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "refundStuckWindow",
          args: [BigInt(expiry)],
          gas: GAS_LIMIT_REFUND,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log(`  window ${expiry} force-refunded (tx ${hash})`);
      }
      continue;
    }

    log(`window ${expiry}: settling btcUp=${btcUp} ethUp=${ethUp}`);
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "settle",
      args: [BigInt(expiry), btcUp, ethUp],
      gas: GAS_LIMIT_SETTLE,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    log(`  window ${expiry} settled (tx ${hash})`);
  }
}

async function tick() {
  try {
    await maybeOpenNextWindow();
  } catch (err) {
    log("openWindow tick error:", (err as Error).message);
  }
  try {
    await trySettlePendingWindows();
  } catch (err) {
    log("settle tick error:", (err as Error).message);
  }
}

async function main() {
  log("resolver starting");
  log("  contract:", CONTRACT_ADDRESS);
  log("  operator:", account.address);
  log("  cadence:", CADENCE_SEC, "seconds");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, TICK_MS));
  }
}

main().catch((err) => {
  console.error("resolver crashed:", err);
  process.exit(1);
});
