"use client";

import Link from "next/link";
import clsx from "clsx";
import { Cadence } from "@/lib/chain";
import { useWindow } from "@/hooks/useWindow";
import { useNow } from "@/hooks/useNow";
import { formatCountdown } from "@/lib/format";
import { PotSplitBar } from "@/components/play/PotSplitBar";

type Phase = "waiting" | "open" | "locked" | "resolving";

const PHASE_LABEL: Record<Phase, string> = {
  waiting: "Opening next window…",
  open: "Picks open",
  locked: "Picks locked",
  resolving: "Resolving on DreamDEX…",
};

const PHASE_COLOR: Record<Phase, string> = {
  waiting: "var(--text-faint)",
  open: "var(--win)",
  locked: "var(--draw)",
  resolving: "var(--eth)",
};

export function MarketCard({ cadence }: { cadence: Cadence }) {
  const { window: win } = useWindow(cadence.sec);
  const now = useNow();
  const nowSec = Math.floor(now / 1000);

  let phase: Phase = "waiting";
  let secondsLeft = 0;

  if (win) {
    if (nowSec < win.locksAt) {
      phase = "open";
      secondsLeft = win.locksAt - nowSec;
    } else if (nowSec < win.expiresAt) {
      phase = "locked";
      secondsLeft = win.expiresAt - nowSec;
    } else {
      phase = "resolving";
    }
  }

  return (
    <div className="corner-panel px-6 py-6">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl">{cadence.label}</span>
        <div
          className="inline-flex items-center gap-2 text-xs font-medium"
          style={{ color: PHASE_COLOR[phase] }}
        >
          <span
            className={clsx("w-1.5 h-1.5 rounded-full", phase === "open" && "pulse-ring")}
            style={{ background: PHASE_COLOR[phase] }}
          />
          {PHASE_LABEL[phase]}
        </div>
      </div>

      <div className="mt-1 text-sm text-text-faint font-mono tabular">
        {win ? `${formatCountdown(secondsLeft)} left` : "waiting for the resolver…"}
      </div>

      <div className="mt-4">
        <PotSplitBar potBTC={win?.potBTC ?? 0n} potETH={win?.potETH ?? 0n} />
      </div>

      <Link
        href={`/play?cadence=${cadence.sec}`}
        className="mt-4 block corner-panel-sm bg-text text-bg text-center font-display text-lg py-2.5 hover:brightness-110 transition-[filter]"
      >
        Play {cadence.label}
      </Link>
    </div>
  );
}
