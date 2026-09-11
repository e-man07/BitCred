"use client";

import { useState } from "react";
import { useWallet, formatSTT } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function WalletBadge() {
  const { address, balance, ready, requestFaucet, faucetPending } = useWallet();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready || !address) {
    return (
      <div className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-text-faint">
        connecting…
      </div>
    );
  }

  async function copy() {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function faucet() {
    setError(null);
    try {
      await requestFaucet();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const low = balance < 10n ** 16n; // < 0.01 STT

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={copy}
        className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm flex items-center gap-2 hover:border-text-faint transition-colors"
        title={address}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-win" />
        <span className="tabular">{shortAddr(address)}</span>
        <span className="text-text-dim tabular">{formatSTT(balance, 3)} STT</span>
        {copied && <span className="text-win text-xs">copied</span>}
      </button>
      <button
        onClick={faucet}
        disabled={faucetPending}
        className="rounded-full px-3 py-2 text-sm font-medium border transition-colors disabled:opacity-50"
        style={{
          borderColor: low ? "var(--draw)" : "var(--border)",
          color: low ? "var(--draw)" : "var(--text-dim)",
        }}
      >
        {faucetPending ? "sending…" : "Get test STT"}
      </button>
      {error && <span className="text-lose text-xs max-w-40">{error}</span>}
    </div>
  );
}
