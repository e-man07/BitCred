"use client";

import { useState } from "react";
import clsx from "clsx";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { Side } from "@/lib/chain";
import { useWallet, formatSTT } from "@/lib/wallet";
import type { ProfileEntry } from "@/hooks/useProfile";

const OUTCOME_LABEL: Record<ProfileEntry["outcome"], string> = {
  win: "Won",
  loss: "Lost",
  draw: "No Contest",
  pending: "In progress",
};

const OUTCOME_COLOR: Record<ProfileEntry["outcome"], string> = {
  win: "var(--win)",
  loss: "var(--lose)",
  draw: "var(--draw)",
  pending: "var(--text-dim)",
};

function Row({ entry, onClaimed }: { entry: ProfileEntry; onClaimed: () => void }) {
  const { claim } = useWallet();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const time = new Date(entry.expiresAt * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const cadenceLabel = entry.cadenceSec % 3600 === 0 ? `${entry.cadenceSec / 3600}h` : `${entry.cadenceSec / 60}m`;

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      await claim(entry.windowId);
      onClaimed();
    } catch (e) {
      setError((e as Error).message.slice(0, 80));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/50 p-4">
      {entry.side === Side.BTC ? <BtcIcon className="w-8 h-8 shrink-0" /> : <EthIcon className="w-8 h-8 shrink-0" />}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{entry.side === Side.BTC ? "BTC" : "ETH"}</span>
          <span className="text-text-faint">·</span>
          <span className="text-text-faint tabular">{time}</span>
          <span className="text-text-faint">·</span>
          <span className="text-text-faint font-mono">{cadenceLabel}</span>
        </div>
        <div className="text-xs text-text-dim font-mono tabular mt-0.5">
          {formatSTT(entry.staked, 4)} STT staked
        </div>
      </div>

      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ color: OUTCOME_COLOR[entry.outcome], background: `${OUTCOME_COLOR[entry.outcome]}1a` }}
      >
        {OUTCOME_LABEL[entry.outcome]}
      </span>

      {entry.claimable > 0n && !entry.claimed ? (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="shrink-0 rounded-full bg-text text-bg text-xs font-semibold px-3 py-2 disabled:opacity-50"
        >
          {claiming ? "claiming…" : `Claim ${formatSTT(entry.claimable, 3)}`}
        </button>
      ) : entry.claimed ? (
        <span className="shrink-0 text-xs text-text-faint">claimed ✓</span>
      ) : entry.outcome === "pending" ? (
        <span className="shrink-0 text-xs text-text-faint">awaiting settlement</span>
      ) : null}

      {error && <span className="text-xs text-lose">{error}</span>}
    </div>
  );
}

export function ProfileHistory({
  entries,
  loading,
  onClaimed,
}: {
  entries: ProfileEntry[];
  loading: boolean;
  onClaimed: () => void;
}) {
  if (loading && entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-text-faint shimmer">
        Scanning your on-chain history…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-8 text-center text-text-faint">
        No picks yet — head to the arena and pick a side.
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-2", loading && "opacity-70")}>
      {entries.map((e) => (
        <Row key={e.windowId.toString()} entry={e} onClaimed={onClaimed} />
      ))}
    </div>
  );
}
