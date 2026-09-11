"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { formatEther } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  useWalletClient,
} from "wagmi";
import { CONTRACT_ADDRESS, MATCHUP_ABI, publicClient, shannon, Side } from "./chain";
import { wagmiConfig } from "./wagmiConfig";

type WalletContextValue = {
  address: `0x${string}` | null;
  balance: bigint;
  ready: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  pick: (windowId: bigint, side: Side, amountEth: string) => Promise<`0x${string}`>;
  claim: (windowId: bigint) => Promise<`0x${string}`>;
  requestFaucet: () => Promise<void>;
  faucetPending: boolean;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [faucetPending, setFaucetPending] = useState(false);
  // Tracks only an explicit, user-initiated connect() call — wagmi's own
  // isConnecting also flips true during its silent background
  // auto-reconnect-on-mount check, which left the button stuck reading
  // "connecting…" on first load whenever an injected provider was present,
  // even though nobody had clicked anything yet.
  const [connectingManually, setConnectingManually] = useState(false);

  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { data: activeWriter } = useWalletClient({ chainId: shannon.id });

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
    async (windowId: bigint, side: Side, amountEth: string) => {
      if (!activeWriter || !activeWriter.account) throw new Error("wallet not ready");
      const hash = await activeWriter.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MATCHUP_ABI,
        functionName: "pick",
        args: [windowId, side],
        value: BigInt(Math.round(Number(amountEth) * 1e18)),
        account: activeWriter.account,
        chain: shannon,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshBalance();
      return hash;
    },
    [activeWriter, refreshBalance]
  );

  const claim = useCallback(
    async (windowId: bigint) => {
      if (!activeWriter || !activeWriter.account) throw new Error("wallet not ready");
      const hash = await activeWriter.writeContract({
        address: CONTRACT_ADDRESS,
        abi: MATCHUP_ABI,
        functionName: "claim",
        args: [windowId],
        account: activeWriter.account,
        chain: shannon,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshBalance();
      return hash;
    },
    [activeWriter, refreshBalance]
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

  const connect = useCallback(async () => {
    setConnectingManually(true);
    try {
      await connectAsync({ connector: wagmiConfig.connectors[0] });
    } finally {
      setConnectingManually(false);
    }
  }, [connectAsync]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  return (
    <WalletContext.Provider
      value={{
        address: address ?? null,
        balance,
        ready: isConnected && address != null,
        connecting: connectingManually,
        connect,
        disconnect,
        refreshBalance,
        pick,
        claim,
        requestFaucet,
        faucetPending,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProviderInner>{children}</WalletProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
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
