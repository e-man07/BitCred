"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet, formatSTT } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function WalletBadge() {
  const { address, balance, ready, connecting, connect, disconnect, requestFaucet, faucetPending } =
    useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  if (!ready || !address) {
    return (
      <button
        onClick={async () => {
          setError(null);
          try {
            await connect();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        disabled={connecting}
        className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm font-medium text-text hover:border-text-faint transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-eth" />
        {connecting ? "connecting…" : "Connect wallet"}
        {error && <span className="text-lose text-xs max-w-40">{error}</span>}
      </button>
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

  async function disconnectWallet() {
    setMenuOpen(false);
    setError(null);
    try {
      await disconnect();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const low = balance < 10n ** 16n; // < 0.01 STT

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm flex items-center gap-2 hover:border-text-faint transition-colors"
        title={address}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-eth" />
        <span className="tabular">{shortAddr(address)}</span>
        <span className="text-text-dim tabular">{formatSTT(balance, 3)} STT</span>
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

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-44 corner-panel-sm border border-border bg-surface py-1 z-20 shadow-lg">
          <button
            onClick={() => {
              copy();
            }}
            className="w-full text-left px-4 py-2 text-sm text-text-dim hover:text-text hover:bg-surface-2 transition-colors"
          >
            {copied ? "Copied!" : "Copy address"}
          </button>
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="block px-4 py-2 text-sm text-text-dim hover:text-text hover:bg-surface-2 transition-colors"
          >
            Profile
          </Link>
          <button
            onClick={disconnectWallet}
            className="w-full text-left px-4 py-2 text-sm text-lose hover:bg-surface-2 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
