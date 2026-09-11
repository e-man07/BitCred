import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import ABI from "./MatchupMarket.abi.json";

export interface Env {
  SOMNIA_PRIVATE_KEY: string;
  CONTRACT_ADDRESS: string;
  RPC_URL: string;
  INDEXER_URL: string;
  WS_RPC_URL: string;
  CADENCES_SEC: string;
}

// windowId = expiresAt * CADENCE_MODULUS + cadenceSec (see MatchupMarket.sol)
// — must match the contract's on-chain derivation exactly.
const CADENCE_MODULUS = 1_000_000n;
const MIN_OPEN_LEAD_SEC = 20; // don't bother opening a window with less runway than this
// Cloudflare's Cron Trigger fires this worker every minute, so a missed tick
// is caught within ~60s — a much shorter lookback than the old always-on
// loop needed suffices, and keeps each invocation's CPU time down.
const LOOKBACK_WINDOWS = 6;
const GAS_LIMIT_OPEN = 3_000_000n;
const GAS_LIMIT_SETTLE = 2_000_000n;
const GAS_LIMIT_REFUND = 1_000_000n;

function log(...args: unknown[]) {
  console.log(`[${new Date().toISOString()}]`, ...args);
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

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function currentBoundary(cadenceSec: number): number {
  return Math.ceil(nowSec() / cadenceSec) * cadenceSec;
}

function windowIdOf(expiry: number, cadenceSec: number): bigint {
  return BigInt(expiry) * CADENCE_MODULUS + BigInt(cadenceSec);
}

class Resolver {
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  dreamdex: any;
  contractAddress: `0x${string}`;

  constructor(env: Env) {
    const account = privateKeyToAccount(env.SOMNIA_PRIVATE_KEY as `0x${string}`);
    const chain = defineChain({
      ...somniaShannon,
      rpcUrls: { default: { http: [env.RPC_URL] } },
    });

    this.contractAddress = env.CONTRACT_ADDRESS as `0x${string}`;
    this.publicClient = createPublicClient({ chain, transport: http(env.RPC_URL, { batch: true }) });
    this.walletClient = createWalletClient({ account, chain, transport: http(env.RPC_URL) });

    const exchange = new SomniaMarkets({
      indexerUrl: env.INDEXER_URL,
      chain: somniaShannon,
      wsRpcUrl: env.WS_RPC_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
    });
    this.dreamdex = exchange.client;
  }

  async readWindow(windowId: bigint): Promise<ChainWindow> {
    const w = (await this.publicClient.readContract({
      address: this.contractAddress,
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
  async getUpOutcome(marketId: string, label: string): Promise<boolean | null> {
    const m = await this.dreamdex.getBinaryMarket(marketId);
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

  async maybeOpenNextWindow(cadenceSec: number) {
    const expiry = currentBoundary(cadenceSec);
    if (expiry - nowSec() < MIN_OPEN_LEAD_SEC) return; // too close, wait for the following boundary next tick

    const windowId = windowIdOf(expiry, cadenceSec);
    const existing = await this.readWindow(windowId);
    if (existing.expiresAt !== 0) return; // already open

    const [btcRows, ethRows] = await Promise.all([
      this.dreamdex.listBinaryMarkets({ asset: "BTC", status: "Trading", intervalSec: cadenceSec, limit: 10 }),
      this.dreamdex.listBinaryMarkets({ asset: "ETH", status: "Trading", intervalSec: cadenceSec, limit: 10 }),
    ]);
    const btc = btcRows.find((m: any) => m.mode === "reference" && Number(m.expiry) === expiry);
    const eth = ethRows.find((m: any) => m.mode === "reference" && Number(m.expiry) === expiry);

    if (!btc || !eth) {
      log(`[${cadenceSec}s] waiting for DreamDEX to list BTC/ETH markets expiring at ${expiry}`);
      return;
    }

    log(`[${cadenceSec}s] opening window ${windowId} (expiry ${expiry}) — btc=${btc.marketId} eth=${eth.marketId}`);
    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ABI,
      functionName: "openWindow",
      args: [BigInt(expiry), cadenceSec, btc.marketId as `0x${string}`, eth.marketId as `0x${string}`],
      gas: GAS_LIMIT_OPEN,
    } as any);
    await this.publicClient.waitForTransactionReceipt({ hash });
    log(`  [${cadenceSec}s] window ${windowId} opened (tx ${hash})`);
  }

  async trySettlePendingWindows(cadenceSec: number) {
    const boundary = currentBoundary(cadenceSec);
    for (let i = 1; i <= LOOKBACK_WINDOWS; i++) {
      const expiry = boundary - cadenceSec * i;
      if (expiry <= 0) break;
      const windowId = windowIdOf(expiry, cadenceSec);

      const w = await this.readWindow(windowId);
      if (w.expiresAt === 0) continue; // never opened, nothing to settle
      if (w.status !== 0) continue; // already SETTLED or DRAW
      if (nowSec() < w.expiresAt) continue; // shouldn't happen given i>=1, but guard anyway

      const gracePeriod = 30 * 60; // mirrors contract GRACE_PERIOD; keep resolver ahead of the timeout
      const stuckDeadline = w.expiresAt + gracePeriod - 60;

      const [btcUp, ethUp] = await Promise.all([
        this.getUpOutcome(w.btcMarketId, "BTC"),
        this.getUpOutcome(w.ethMarketId, "ETH"),
      ]);

      if (btcUp === null || ethUp === null) {
        log(`[${cadenceSec}s] window ${windowId}: DreamDEX not resolved yet (btc=${btcUp} eth=${ethUp})`);
        if (nowSec() >= stuckDeadline) {
          log(`[${cadenceSec}s] window ${windowId}: approaching grace-period timeout, forcing refund`);
          const hash = await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: ABI,
            functionName: "refundStuckWindow",
            args: [windowId],
            gas: GAS_LIMIT_REFUND,
          } as any);
          await this.publicClient.waitForTransactionReceipt({ hash });
          log(`  [${cadenceSec}s] window ${windowId} force-refunded (tx ${hash})`);
        }
        continue;
      }

      log(`[${cadenceSec}s] window ${windowId}: settling btcUp=${btcUp} ethUp=${ethUp}`);
      const hash = await this.walletClient.writeContract({
        address: this.contractAddress,
        abi: ABI,
        functionName: "settle",
        args: [windowId, btcUp, ethUp],
        gas: GAS_LIMIT_SETTLE,
      } as any);
      await this.publicClient.waitForTransactionReceipt({ hash });
      log(`  [${cadenceSec}s] window ${windowId} settled (tx ${hash})`);
    }
  }

  async tick(cadenceSec: number) {
    try {
      await this.maybeOpenNextWindow(cadenceSec);
    } catch (err) {
      log(`[${cadenceSec}s] openWindow tick error:`, (err as Error).message);
    }
    try {
      await this.trySettlePendingWindows(cadenceSec);
    } catch (err) {
      log(`[${cadenceSec}s] settle tick error:`, (err as Error).message);
    }
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cadences = env.CADENCES_SEC.split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
    const resolver = new Resolver(env);
    log("resolver tick starting, cadences:", cadences.join(", "));

    // Cadences run sequentially (not in parallel) so writes from this single
    // nonce-tracked account never race each other.
    for (const cadenceSec of cadences) {
      await resolver.tick(cadenceSec);
    }
    log("resolver tick done");
  },

  // A GET on the worker's own URL runs one tick on demand and reports what
  // happened at each step — handy for manually verifying a deploy without
  // waiting for the next cron minute, and for debugging without relying on
  // `wrangler tail` log capture.
  async fetch(_req: Request, env: Env, ctx: ExecutionContext) {
    const steps: Record<string, string> = {};
    const t0 = Date.now();
    try {
      steps.construct = "starting";
      const resolver = new Resolver(env);
      steps.construct = "ok";

      const cadences = env.CADENCES_SEC.split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
      for (const cadenceSec of cadences) {
        const key = `cadence_${cadenceSec}`;
        try {
          steps[key] = "maybeOpenNextWindow starting";
          await resolver.maybeOpenNextWindow(cadenceSec);
          steps[key] = "maybeOpenNextWindow ok";
        } catch (err) {
          steps[key] = `maybeOpenNextWindow ERROR: ${(err as Error).name}: ${(err as Error).message}\n${(err as Error).stack}`;
        }
        try {
          steps[key] += "; trySettlePendingWindows starting";
          await resolver.trySettlePendingWindows(cadenceSec);
          steps[key] += "; trySettlePendingWindows ok";
        } catch (err) {
          steps[key] += `; trySettlePendingWindows ERROR: ${(err as Error).name}: ${(err as Error).message}\n${(err as Error).stack}`;
        }
      }
    } catch (err) {
      steps.fatal = `${(err as Error).name}: ${(err as Error).message}\n${(err as Error).stack}`;
    }
    steps.totalMs = String(Date.now() - t0);
    return new Response(JSON.stringify(steps, null, 2), {
      headers: { "content-type": "application/json" },
    });
  },
};
