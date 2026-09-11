"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Pick a side",
    body: "Tap BTC or ETH and stake a bit of STT. One tap, wallet confirms instantly — no popup, no gas fumbling.",
  },
  {
    n: "02",
    title: "Window locks",
    body: "30 seconds before close, picks freeze. The race plays out live against real BTC/ETH price feeds.",
  },
  {
    n: "03",
    title: "DreamDEX resolves",
    body: "Both underlying DreamDEX Event Contracts settle Up or Down. Our resolver reads both outcomes and writes them on-chain.",
  },
  {
    n: "04",
    title: "Pot pays out",
    body: "One side up, one side not: winners split both pots pro-rata. Same direction: instant, exact refund. Either way, claim in one tap.",
  },
];

export function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-display font-semibold text-3xl sm:text-4xl mb-10"
      >
        How a window plays out
      </motion.h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-surface/50 p-6"
          >
            <div className="font-mono text-text-faint text-sm">{s.n}</div>
            <div className="mt-2 font-semibold text-lg">{s.title}</div>
            <p className="mt-2 text-sm text-text-dim leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
