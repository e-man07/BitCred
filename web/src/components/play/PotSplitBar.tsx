"use client";

import { motion } from "framer-motion";
import { formatSTT } from "@/lib/wallet";

export function PotSplitBar({ potBTC, potETH }: { potBTC: bigint; potETH: bigint }) {
  const total = potBTC + potETH;
  const hasStakes = total > 0n;
  const btcPct = hasStakes ? Number((potBTC * 10000n) / total) / 100 : 0;
  const ethPct = hasStakes ? 100 - btcPct : 0;

  return (
    <div className="corner-panel corner-panel-sm px-5 py-4">
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-text-dim">The purse</span>
        <span className="font-mono tabular text-text-faint">
          {formatSTT(total, 3)} STT total
        </span>
      </div>
      <div className="h-3 bg-bg overflow-hidden flex">
        {hasStakes ? (
          <>
            <motion.div
              className="h-full bg-btc"
              animate={{ width: `${btcPct}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 22 }}
            />
            <motion.div
              className="h-full bg-eth"
              animate={{ width: `${ethPct}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 22 }}
            />
          </>
        ) : null}
      </div>
      <div className="flex items-center justify-between mt-2 text-sm font-mono tabular">
        <span className="text-btc">
          {hasStakes ? `${btcPct.toFixed(0)}%` : "—"} · {formatSTT(potBTC, 3)} STT
        </span>
        <span className="text-eth">
          {hasStakes ? `${ethPct.toFixed(0)}%` : "—"} · {formatSTT(potETH, 3)} STT
        </span>
      </div>
    </div>
  );
}
