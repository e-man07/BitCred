"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

type Accent = "btc" | "eth" | "draw";

export function StatCard({
  value,
  label,
  detail,
  accent,
}: {
  value: string;
  label: string;
  detail: string;
  accent: Accent;
}) {
  const accentClass = {
    btc: "text-btc",
    eth: "text-eth",
    draw: "text-draw",
  }[accent];

  const glowClass = {
    btc: "group-hover:shadow-[0_0_40px_-8px_rgba(247,147,26,0.35)]",
    eth: "group-hover:shadow-[0_0_40px_-8px_rgba(123,143,255,0.35)]",
    draw: "group-hover:shadow-[0_0_40px_-8px_rgba(242,195,77,0.35)]",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={clsx(
        "group rounded-2xl border border-border bg-surface/60 p-6 transition-shadow",
        glowClass
      )}
    >
      <div className={clsx("font-display font-semibold text-4xl tabular", accentClass)}>
        {value}
      </div>
      <div className="mt-2 font-medium text-text">{label}</div>
      <p className="mt-3 text-sm text-text-dim leading-relaxed">{detail}</p>
    </motion.div>
  );
}
