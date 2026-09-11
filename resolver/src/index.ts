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

// windowId = expiresAt * CADENCE_MODULUS + cadenceSec (see MatchupMarket.sol)
// — must match the contract's on-chain derivation exactly.
const CADENCE_MODULUS = 1_000_000n;
const CADENCES_SEC: number[] = (process.env.CADENCES_SEC ?? "300")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => n > 0);

const TICK_MS = 5_000;
const MIN_OPEN_LEAD_SEC = 20; // don't bother opening a window with less runway than this
const LOOKBACK_WINDOWS = 24; // how many past cadence boundaries to check for pending settlement, per cadence
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

const publicClient = createPublicClient({ chain, transport: http(RPC_URL, { batch: true }) });
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

function currentBoundary(cadenceSec: number): number {
  return Math.ceil(nowSec() / cadenceSec) * cadenceSec;
}

function windowIdOf(expiry: number, cadenceSec: number): bigint {
  return BigInt(expiry) * CADENCE_MODULUS + BigInt(cadenceSec);
}

type ChainWindow = {
  expiresAt: number;
  status: number; // 0 OPEN, 1 SETTLED, 2 DRAW
  potBTC: bigint;
  potETH: bigint;
  btcUp: boolean;
  ethUp: boolean;
  btcMarketId: `0x${string}`;
  ethMarketId: `0x${string}`;
};

async function readWindow(windowId: bigint): Promise<ChainWindow> {
  const w = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getWindow",
    args: [windowId],
  })) as any;
  return {
    expiresAt: Number(w.expiresAt),
    status: w.status,
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

async function maybeOpenNextWindow(cadenceSec: number) {
  const expiry = currentBoundary(cadenceSec);
  if (expiry - nowSec() < MIN_OPEN_LEAD_SEC) return; // too close, wait for the following boundary next tick

  const windowId = windowIdOf(expiry, cadenceSec);
  const existing = await readWindow(windowId);
  if (existing.expiresAt !== 0) return; // already open

  const [btcRows, ethRows] = await Promise.all([
    dreamdex.listBinaryMarkets({ asset: "BTC", status: "Trading", intervalSec: cadenceSec, limit: 10 }),
    dreamdex.listBinaryMarkets({ asset: "ETH", status: "Trading", intervalSec: cadenceSec, limit: 10 }),
  ]);
  const btc = btcRows.find((m) => m.mode === "reference" && Number(m.expiry) === expiry);
  const eth = ethRows.find((m) => m.mode === "reference" && Number(m.expiry) === expiry);

  if (!btc || !eth) {
    log(`[${cadenceSec}s] waiting for DreamDEX to list BTC/ETH markets expiring at ${expiry}`);
    return;
  }

  log(`[${cadenceSec}s] opening window ${windowId} (expiry ${expiry}) — btc=${btc.marketId} eth=${eth.marketId}`);
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "openWindow",
    args: [BigInt(expiry), cadenceSec, btc.marketId as `0x${string}`, eth.marketId as `0x${string}`],
    gas: GAS_LIMIT_OPEN,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  log(`  [${cadenceSec}s] window ${windowId} opened (tx ${hash})`);
}

async function trySettlePendingWindows(cadenceSec: number) {
  const boundary = currentBoundary(cadenceSec);
  for (let i = 1; i <= LOOKBACK_WINDOWS; i++) {
    const expiry = boundary - cadenceSec * i;
    if (expiry <= 0) break;
    const windowId = windowIdOf(expiry, cadenceSec);

    const w = await readWindow(windowId);
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
      log(`[${cadenceSec}s] window ${windowId}: DreamDEX not resolved yet (btc=${btcUp} eth=${ethUp})`);
      if (nowSec() >= stuckDeadline) {
        log(`[${cadenceSec}s] window ${windowId}: approaching grace-period timeout, forcing refund`);
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "refundStuckWindow",
          args: [windowId],
          gas: GAS_LIMIT_REFUND,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        log(`  [${cadenceSec}s] window ${windowId} force-refunded (tx ${hash})`);
      }
      continue;
    }

    log(`[${cadenceSec}s] window ${windowId}: settling btcUp=${btcUp} ethUp=${ethUp}`);
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "settle",
      args: [windowId, btcUp, ethUp],
      gas: GAS_LIMIT_SETTLE,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    log(`  [${cadenceSec}s] window ${windowId} settled (tx ${hash})`);
  }
}

async function tick(cadenceSec: number) {
  try {
    await maybeOpenNextWindow(cadenceSec);
  } catch (err) {
    log(`[${cadenceSec}s] openWindow tick error:`, (err as Error).message);
  }
  try {
    await trySettlePendingWindows(cadenceSec);
  } catch (err) {
    log(`[${cadenceSec}s] settle tick error:`, (err as Error).message);
  }
}

async function main() {
  log("resolver starting");
  log("  contract:", CONTRACT_ADDRESS);
  log("  operator:", account.address);
  log("  cadences:", CADENCES_SEC.join(", "), "seconds");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Cadences run sequentially per tick (not in parallel) so writes from
    // this single nonce-tracked account never race each other.
    for (const cadenceSec of CADENCES_SEC) {
      await tick(cadenceSec);
    }
    await new Promise((r) => setTimeout(r, TICK_MS));
  }
}

main().catch((err) => {
  console.error("resolver crashed:", err);
  process.exit(1);
});
