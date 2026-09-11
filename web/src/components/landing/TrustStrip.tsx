"use client";

import { motion } from "framer-motion";

const MARKS = [
  "Somnia Shannon Testnet",
  "DreamDEX Event Contracts",
  "Chain 50312",
  "Foundry-tested contract",
  "viem + wagmi",
];

export function TrustStrip() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="border-y border-border py-6"
    >
      <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {MARKS.map((mark) => (
          <span
            key={mark}
            className="font-mono text-xs uppercase tracking-[0.1em] text-text-faint"
          >
            {mark}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
