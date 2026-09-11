"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { WalletBadge } from "@/components/play/WalletBadge";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileHistory } from "@/components/profile/ProfileHistory";
import { useWallet } from "@/lib/wallet";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { address } = useWallet();
  const { entries, stats, loading, refresh } = useProfile(address);

  // Same SSR/client hydration guard as /play — everything here is on-chain
  // wallet-scoped data with nothing meaningful to server-render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex-1 bg-arena bg-grain">
        <div className="max-w-3xl mx-auto px-6 py-6 text-text-faint text-sm">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-arena bg-grain">
      <header className="max-w-3xl mx-auto flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <BtcIcon className="w-6 h-6 ring-2 ring-bg rounded-full" />
            <EthIcon className="w-6 h-6 ring-2 ring-bg rounded-full" />
          </div>
          <span className="font-display text-lg tracking-wide">Matchup</span>
        </Link>
        <WalletBadge />
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl">Your record</h1>
          <Link
            href="/play"
            className="text-sm text-text-dim hover:text-text transition-colors"
          >
            ← back to the arena
          </Link>
        </div>

        <ProfileStats stats={stats} />

        <div className="mt-8">
          <h2 className="text-sm text-text-dim mb-3">History</h2>
          <ProfileHistory entries={entries} loading={loading} onClaimed={refresh} />
        </div>
      </main>
    </div>
  );
}
