"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { formatPct, formatUsd } from "@/lib/format";
import type { AssetPrice } from "@/hooks/usePrices";

function Corner({
  name,
  icon,
  price,
  accent,
  align,
}: {
  name: string;
  icon: React.ReactNode;
  price: AssetPrice;
  accent: "btc" | "eth";
  align: "left" | "right";
}) {
  const up = (price.pctChange ?? 0) >= 0;
  const colorVar = accent === "btc" ? "var(--btc)" : "var(--eth)";

  return (
    <div
      className={clsx(
        "flex-1 p-5 sm:p-7 flex flex-col",
        align === "left" ? "items-start" : "items-end text-right"
      )}
    >
      <div className={clsx("flex items-center gap-3", align === "right" && "flex-row-reverse")}>
        {icon}
        <div className="font-display text-2xl" style={{ color: colorVar }}>
          {name}
        </div>
      </div>
      <div className="text-[11px] text-text-faint mt-3">Mark price</div>
      <div className="font-mono tabular text-2xl sm:text-3xl font-medium leading-tight">
        ${formatUsd(price.mark)}
      </div>
      <span
        className={clsx(
          "font-mono tabular text-sm font-semibold mt-0.5",
          price.pctChange === null ? "text-text-faint" : up ? "text-win" : "text-lose"
        )}
      >
        {formatPct(price.pctChange)}
      </span>
      <div className="text-xs text-text-faint font-mono tabular mt-3 pt-2 border-t border-border w-full">
        spot ${formatUsd(price.live)}
      </div>
    </div>
  );
}

export function RaceView({ btc, eth }: { btc: AssetPrice; eth: AssetPrice }) {
  const b = btc.pctChange ?? 0;
  const e = eth.pctChange ?? 0;
  const delta = b - e; // >0 => BTC ahead
  const SCALE = 0.4; // % delta that maps to a full-width lead
  const lead = Math.max(-1, Math.min(1, delta / SCALE));
  const pullPct = 50 + lead * 42; // meter's marker position, 8–92%

  return (
    <div className="corner-panel seam relative overflow-hidden">
      <div className="relative flex items-stretch">
        <Corner name="BTC" icon={<BtcIcon className="w-8 h-8 sm:w-9 sm:h-9" />} price={btc} accent="btc" align="left" />

        <div className="w-px bg-border-strong my-6" />

        <Corner name="ETH" icon={<EthIcon className="w-8 h-8 sm:w-9 sm:h-9" />} price={eth} accent="eth" align="right" />

        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-xl text-text-faint bg-surface px-2 select-none hidden sm:block"
          style={{ textShadow: "0 0 20px rgba(11,8,6,0.8)" }}
        >
          VS
        </span>
      </div>

      {/* the power meter — a tug-of-war rope, pulled toward whoever's ahead */}
      <div className="relative border-t border-border px-5 sm:px-7 py-4">
        <div className="relative h-2 bg-bg-elevated">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-border-strong" />
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 h-2"
            style={{
              background: lead >= 0 ? "var(--btc)" : "var(--eth)",
              left: lead >= 0 ? "50%" : `${pullPct}%`,
              right: lead >= 0 ? `${100 - pullPct}%` : "50%",
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          <motion.div
            className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2"
            style={{ background: lead >= 0 ? "var(--btc)" : "var(--eth)", left: `${pullPct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-faint mt-2">
          <span>BTC ahead</span>
          <span>ETH ahead</span>
        </div>
      </div>
    </div>
  );
}
