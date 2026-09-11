"use client";

import clsx from "clsx";
import { CountdownRing } from "./CountdownRing";

export type Phase = "waiting" | "open" | "locked" | "resolving";

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

export function MatchHeader({
  phase,
  secondsLeft,
  totalSeconds,
  windowLabel,
}: {
  phase: Phase;
  secondsLeft: number;
  totalSeconds: number;
  windowLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/60 p-5">
      <div>
        <div className="text-xs text-text-faint uppercase tracking-wide">Current window</div>
        <div className="font-display font-semibold text-2xl mt-1">{windowLabel}</div>
        <div
          className="mt-2 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: PHASE_COLOR[phase] }}
        >
          <span
            className={clsx("w-1.5 h-1.5 rounded-full", phase === "open" && "pulse-ring")}
            style={{ background: PHASE_COLOR[phase] }}
          />
          {PHASE_LABEL[phase]}
        </div>
      </div>
      <CountdownRing
        secondsLeft={secondsLeft}
        totalSeconds={totalSeconds}
        color={PHASE_COLOR[phase]}
        label={phase === "open" ? "to lock" : phase === "locked" ? "to close" : ""}
      />
    </div>
  );
}
