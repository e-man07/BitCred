"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet, formatSTT } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function WalletBadge() {
  const { address, balance, ready, connecting, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
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

  async function disconnectWallet() {
    setMenuOpen(false);
    setError(null);
    try {
      await disconnect();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-full border border-border bg-surface/60 px-4 py-2 text-sm flex items-center gap-2 hover:border-text-faint transition-colors"
        title={address}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-eth" />
        <span className="tabular">{shortAddr(address)}</span>
      </button>
      {error && <span className="text-lose text-xs max-w-40">{error}</span>}

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-44 corner-panel-sm border border-border bg-surface py-1 z-20 shadow-lg">
          <div className="px-4 py-2 text-sm border-b border-border">
            <div className="text-text-faint text-xs">Balance</div>
            <div className="tabular text-text">{formatSTT(balance, 3)} STT</div>
          </div>
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
