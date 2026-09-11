"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { MarketCard } from "@/components/markets/MarketCard";
import { CADENCES } from "@/lib/chain";

export default function MarketsPage() {
  // Same SSR/client hydration guard as /play and /profile — every card here
  // is live on-chain data with nothing meaningful to server-render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex-1 bg-arena bg-grain">
        <div className="max-w-4xl mx-auto px-6 py-6 text-text-faint text-sm">Loading markets…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-arena bg-grain">
      <SiteHeader maxWidth="max-w-4xl" />

      <main className="max-w-4xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl">All markets</h1>
            <p className="mt-1 text-sm text-text-dim">
              Every cadence, running concurrently — pick one to jump in.
            </p>
          </div>
          <Link
            href="/play"
            className="text-sm text-text-dim hover:text-text transition-colors hidden sm:inline"
          >
            back to the arena →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CADENCES.map((c) => (
            <MarketCard key={c.sec} cadence={c} />
          ))}
        </div>
      </main>
    </div>
  );
}
