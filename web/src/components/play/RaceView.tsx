"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { formatPct, formatUsd } from "@/lib/format";
import type { AssetPrice } from "@/hooks/usePrices";

function AssetCard({
  name,
  icon,
  price,
  accent,
}: {
  name: string;
  icon: React.ReactNode;
  price: AssetPrice;
  accent: "btc" | "eth";
}) {
  const up = (price.pctChange ?? 0) >= 0;
  const colorVar = accent === "btc" ? "var(--btc)" : "var(--eth)";

  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface/60 p-5 relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl"
        style={{ background: colorVar }}
      />
      <div className="relative flex items-center gap-3">
        {icon}
        <div>
          <div className="font-display font-semibold">{name}</div>
          <div className="text-text-faint text-xs">closes at/above opening?</div>
        </div>
      </div>
      <div className="relative mt-4 flex items-end justify-between">
        <span className="font-mono tabular text-2xl font-medium">
          ${formatUsd(price.live)}
        </span>
        <span
          className={clsx(
            "font-mono tabular text-sm font-semibold px-2 py-1 rounded-md",
            price.pctChange === null
              ? "text-text-faint"
              : up
                ? "text-win bg-win/10"
                : "text-lose bg-lose/10"
          )}
        >
          {formatPct(price.pctChange)}
        </span>
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4">
        <AssetCard name="BTC" icon={<BtcIcon className="w-9 h-9" />} price={btc} accent="btc" />
        <AssetCard name="ETH" icon={<EthIcon className="w-9 h-9" />} price={eth} accent="eth" />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface/40 p-4">
        <div className="flex items-center justify-between text-xs text-text-faint mb-2">
          <span>BTC ahead</span>
          <span>momentum</span>
          <span>ETH ahead</span>
        </div>
        <div className="relative h-3 rounded-full bg-bg overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
          <motion.div
            className="absolute top-0 bottom-0 rounded-full"
            style={{
              background:
                lead >= 0
                  ? "linear-gradient(90deg, transparent, var(--btc))"
                  : "linear-gradient(90deg, var(--eth), transparent)",
              left: lead >= 0 ? "50%" : `${50 + lead * 50}%`,
              right: lead >= 0 ? `${50 - lead * 50}%` : "50%",
            }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
    </div>
  );
}
