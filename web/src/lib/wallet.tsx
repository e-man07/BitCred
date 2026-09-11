"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createWalletClient, http, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { CONTRACT_ADDRESS, MATCHUP_ABI, publicClient, shannon, Side } from "./chain";

const STORAGE_KEY = "matchup.burner.pk";

type WalletContextValue = {
  address: `0x${string}` | null;
  balance: bigint;
  ready: boolean;
  refreshBalance: () => Promise<void>;
  pick: (windowId: number, side: Side, amountEth: string) => Promise<`0x${string}`>;
  claim: (windowId: number) => Promise<`0x${string}`>;
  requestFaucet: () => Promise<void>;
  faucetPending: boolean;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function loadOrCreateKey(): `0x${string}` {
  if (typeof window === "undefined") return generatePrivateKey();
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing as `0x${string}`;
  const fresh = generatePrivateKey();
  window.localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [faucetPending, setFaucetPending] = useState(false);

  // Lazy initializer runs exactly once on mount — no setState-during-render.
  const [walletClient] = useState(() => {
    if (typeof window === "undefined") return null;
    const pk = loadOrCreateKey();
    const account = privateKeyToAccount(pk);
    return createWalletClient({ account, chain: shannon, transport: http() });
  });

  const address = walletClient?.account?.address ?? null;
  const ready = address !== null;

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    const bal = await publicClient.getBalance({ address });
    setBalance(bal);
  }, [address]);

  useEffect(() => {
    if (address) {
      refreshBalance();
      const id = setInterval(refreshBalance, 5000);
      return () => clearInterval(id);
    }
  }, [address, refreshBalance]);

  const pick = useCallback(
    async (windowId: number, side: Side, amountEth: string) => {
      if (!walletClient || !walletClient.account) throw new Error("wallet not ready");
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MATCHUP_ABI,
        functionName: "pick",
        args: [BigInt(windowId), side],
        value: BigInt(Math.round(Number(amountEth) * 1e18)),
        account: walletClient.account,
        chain: shannon,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshBalance();
      return hash;
    },
    [walletClient, refreshBalance]
  );

  const claim = useCallback(
    async (windowId: number) => {
      if (!walletClient || !walletClient.account) throw new Error("wallet not ready");
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MATCHUP_ABI,
        functionName: "claim",
        args: [BigInt(windowId)],
        account: walletClient.account,
        chain: shannon,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshBalance();
      return hash;
    },
    [walletClient, refreshBalance]
  );

  const requestFaucet = useCallback(async () => {
    if (!address) return;
    setFaucetPending(true);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "faucet request failed");
      }
      await refreshBalance();
    } finally {
      setFaucetPending(false);
    }
  }, [address, refreshBalance]);

  return (
    <WalletContext.Provider
      value={{ address, balance, ready, refreshBalance, pick, claim, requestFaucet, faucetPending }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function formatSTT(value: bigint, digits = 4): string {
  return Number(formatEther(value)).toFixed(digits);
}
