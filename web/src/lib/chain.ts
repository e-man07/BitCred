import { createPublicClient, defineChain, http } from "viem";
import abi from "./MatchupMarket.abi.json";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://dream-rpc.somnia.network";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "50312");
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "") as `0x${string}`;
export const CADENCE_SEC = Number(process.env.NEXT_PUBLIC_CADENCE_SEC ?? "300");

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
  transport: http(RPC_URL),
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
  status: Status;
  winner: Side;
  potBTC: bigint;
  potETH: bigint;
  btcUp: boolean;
  ethUp: boolean;
  btcMarketId: `0x${string}`;
  ethMarketId: `0x${string}`;
};

export function currentBoundary(nowMs = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000);
  return Math.ceil(nowSec / CADENCE_SEC) * CADENCE_SEC;
}

type RawWindow = {
  id: bigint;
  opensAt: number;
  locksAt: number;
  expiresAt: number;
  status: number;
  winner: number;
  potBTC: bigint;
  potETH: bigint;
  btcUp: boolean;
  ethUp: boolean;
  btcMarketId: `0x${string}`;
  ethMarketId: `0x${string}`;
};

export async function readWindow(expiry: number): Promise<ChainWindow> {
  const w = (await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: MATCHUP_ABI,
    functionName: "getWindow",
    args: [BigInt(expiry)],
  })) as unknown as RawWindow;

  return {
    id: w.id,
    opensAt: Number(w.opensAt),
    locksAt: Number(w.locksAt),
    expiresAt: Number(w.expiresAt),
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

export async function readStakes(expiry: number, address: `0x${string}`) {
  const [stakeBTC, stakeETH, claimed, claimable] = await Promise.all([
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "stakeBTC",
      args: [BigInt(expiry), address],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "stakeETH",
      args: [BigInt(expiry), address],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "claimed",
      args: [BigInt(expiry), address],
    }) as Promise<boolean>,
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: MATCHUP_ABI,
      functionName: "claimable",
      args: [BigInt(expiry), address],
    }) as Promise<bigint>,
  ]);
  return { stakeBTC, stakeETH, claimed, claimable };
}
