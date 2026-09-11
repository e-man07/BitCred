import { createPublicClient, defineChain, http } from "viem";
import abi from "./MatchupMarket.abi.json";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://dream-rpc.somnia.network";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "50312");
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "") as `0x${string}`;
export type Cadence = { sec: number; label: string };

export const CADENCES: Cadence[] = (process.env.NEXT_PUBLIC_CADENCES_SEC ?? "300,900,3600")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => n > 0)
  .map((sec) => ({ sec, label: cadenceLabel(sec) }));

function cadenceLabel(sec: number): string {
  if (sec % 3600 === 0) return `${sec / 3600}h`;
  return `${sec / 60}m`;
}

// windowId = expiresAt * CADENCE_MODULUS + cadenceSec — must match
// MatchupMarket.sol's on-chain derivation exactly.
export const CADENCE_MODULUS = 1_000_000n;

export function windowIdFor(expiry: number, cadenceSec: number): bigint {
  return BigInt(expiry) * CADENCE_MODULUS + BigInt(cadenceSec);
}

export const shannon = defineChain({
  id: CHAIN_ID,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: shannon,
  // Shannon has no Multicall3 deployed, but its RPC supports native JSON-RPC
  // batching — this collapses many concurrent eth_call reads (e.g. the
  // profile page probing dozens of past windows) into a handful of HTTP
  // round-trips instead of one each.
  transport: http(RPC_URL, { batch: true }),
});

export const MATCHUP_ABI = abi;

export enum Side {
  BTC = 0,
  ETH = 1,
}

export enum Status {
  OPEN = 0,
  SETTLED = 1,
  DRAW = 2,
}

export type ChainWindow = {
  id: bigint;
  opensAt: number;
  locksAt: number;
  expiresAt: number;
  cadenceSec: number;
  status: Status;
  winner: Side;
  potBTC: bigint;
  potETH: bigint;
  btcUp: boolean;
  ethUp: boolean;
  btcMarketId: `0x${string}`;
  ethMarketId: `0x${string}`;
};

export function currentBoundary(cadenceSec: number, nowMs = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000);
  return Math.ceil(nowSec / cadenceSec) * cadenceSec;
}

type RawWindow = {
  id: bigint;
  opensAt: number;
  locksAt: number;
  expiresAt: number;
  cadenceSec: number;
  status: number;
  winner: number;
  potBTC: bigint;
  potETH: bigint;
  btcUp: boolean;
  ethUp: boolean;
  btcMarketId: `0x${string}`;
  ethMarketId: `0x${string}`;
};

export async function readWindow(windowId: bigint): Promise<ChainWindow> {
  const w = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: MATCHUP_ABI,
    functionName: "getWindow",
    args: [windowId],
  })) as unknown as RawWindow;

  return {
    id: w.id,
    opensAt: Number(w.opensAt),
    locksAt: Number(w.locksAt),
    expiresAt: Number(w.expiresAt),
    cadenceSec: Number(w.cadenceSec),
    status: w.status as Status,
    winner: w.winner as Side,
    potBTC: w.potBTC,
    potETH: w.potETH,
    btcUp: w.btcUp,
    ethUp: w.ethUp,
    btcMarketId: w.btcMarketId,
    ethMarketId: w.ethMarketId,
  };
}

export async function readStakes(windowId: bigint, address: `0x${string}`) {
  const [stakeBTC, stakeETH, claimed, claimable] = await Promise.all([
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "stakeBTC",
      args: [windowId, address],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "stakeETH",
      args: [windowId, address],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "claimed",
      args: [windowId, address],
    }) as Promise<boolean>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "claimable",
      args: [windowId, address],
    }) as Promise<bigint>,
  ]);
  return { stakeBTC, stakeETH, claimed, claimable };
}
