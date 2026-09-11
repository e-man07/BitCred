"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

type Accent = "btc" | "eth" | "draw";

const ACCENT_CLASS: Record<Accent, string> = {
  btc: "text-btc",
  eth: "text-eth",
  draw: "text-win",
};

export function StatRow({
  value,
  label,
  detail,
  accent,
  index,
}: {
  value: string;
  label: string;
  detail: string;
  accent: Accent;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="grid grid-cols-[auto_1fr] sm:grid-cols-[140px_1fr] gap-4 sm:gap-8 py-6 border-t border-border first:border-t-0"
    >
      <div className={clsx("font-display text-4xl sm:text-5xl tabular leading-none", ACCENT_CLASS[accent])}>
        {value}
      </div>
      <div>
        <div className="font-medium text-text">{label}</div>
        <p className="mt-1.5 text-sm text-text-dim leading-relaxed max-w-xl">{detail}</p>
      </div>
    </motion.div>
  );
}
