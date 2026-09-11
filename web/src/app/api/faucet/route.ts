import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, isAddress, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, shannon } from "@/lib/chain";

const FAUCET_AMOUNT = parseEther("0.5");
const COOLDOWN_MS = 60_000;

// In-memory per-address cooldown — good enough for a hackathon demo instance.
const lastRequest = new Map<string, number>();

export async function POST(req: NextRequest) {
  const privateKey = process.env.FAUCET_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ error: "faucet not configured" }, { status: 500 });
  }

  const { address } = await req.json().catch(() => ({ address: null }));
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const last = lastRequest.get(address.toLowerCase());
  if (last && Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json({ error: "try again in a minute" }, { status: 429 });
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: shannon, transport: http() });

  try {
    const hash = await walletClient.sendTransaction({
      to: address,
      value: FAUCET_AMOUNT,
      account,
      chain: shannon,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    lastRequest.set(address.toLowerCase(), Date.now());
    return NextResponse.json({ hash });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
