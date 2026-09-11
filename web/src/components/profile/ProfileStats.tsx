"use client";

import { formatSTT } from "@/lib/wallet";
import type { ProfileStats as Stats } from "@/hooks/useProfile";

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="text-xs text-text-faint uppercase tracking-wide">{label}</div>
      <div
        className="mt-1 font-display font-semibold text-2xl tabular"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function ProfileStats({ stats }: { stats: Stats }) {
  const winRate =
    stats.wins + stats.losses > 0
      ? `${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(0)}%`
      : "—";

  const net = stats.totalClaimed + stats.totalClaimable - stats.totalStaked;
  const netLabel = `${net >= 0n ? "+" : ""}${formatSTT(net, 4)} STT`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Tile label="Windows played" value={String(stats.windowsPlayed)} />
      <Tile label="Record (W-L-D)" value={`${stats.wins}-${stats.losses}-${stats.draws}`} />
      <Tile label="Win rate" value={winRate} />
      <Tile label="Total staked" value={`${formatSTT(stats.totalStaked, 3)} STT`} />
      <Tile
        label="Unclaimed"
        value={`${formatSTT(stats.totalClaimable, 4)} STT`}
        accent={stats.totalClaimable > 0n ? "var(--draw)" : undefined}
      />
      <Tile
        label="Net (claimed + pending − staked)"
        value={netLabel}
        accent={net >= 0n ? "var(--win)" : "var(--lose)"}
      />
    </div>
  );
}
