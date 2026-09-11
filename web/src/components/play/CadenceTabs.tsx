"use client";

import clsx from "clsx";
import { CADENCES } from "@/lib/chain";

export function CadenceTabs({
  value,
  onChange,
}: {
  value: number;
  onChange: (sec: number) => void;
}) {
  if (CADENCES.length <= 1) return null;

  return (
    <div className="inline-flex rounded-full border border-border bg-surface/60 p-1 gap-1">
      {CADENCES.map((c) => (
        <button
          key={c.sec}
          onClick={() => onChange(c.sec)}
          className={clsx(
            "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
            value === c.sec ? "bg-text text-bg" : "text-text-dim hover:text-text"
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
