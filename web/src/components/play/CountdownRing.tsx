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
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono tabular font-semibold text-lg">
          {formatCountdown(secondsLeft)}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-text-faint">{label}</span>
      </div>
    </div>
  );
}
