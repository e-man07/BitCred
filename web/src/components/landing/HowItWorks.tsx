"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/landing/Eyebrow";

const STEPS = [
  {
    n: "01",
    title: "Pick a side",
    body: "Connect a wallet, tap BTC or ETH, and stake some STT. Confirm from your wallet — Somnia settles in well under a second.",
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
    <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border">
      <SectionHeading
        eyebrow="Pick · Lock · Resolve · Claim"
        title="How a window plays out"
      />
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="bg-bg p-6"
          >
            <div className="font-mono text-text-faint text-sm tabular">{s.n}</div>
            <div className="mt-2 font-display text-2xl">{s.title}</div>
            <p className="mt-2 text-sm text-text-dim leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
