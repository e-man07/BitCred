"use client";

import { formatCountdown } from "@/lib/format";

export function CountdownRing({
  secondsLeft,
  totalSeconds,
  color,
  label,
}: {
  secondsLeft: number;
  totalSeconds: number;
  color: string;
  label: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const frac = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const offset = c * (1 - frac);

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl tabular leading-none">
          {formatCountdown(secondsLeft)}
        </span>
        {label && <span className="mt-1 text-[11px] text-text-faint">{label}</span>}
      </div>
    </div>
  );
}
