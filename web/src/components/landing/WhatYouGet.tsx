"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/landing/Eyebrow";
import { ChartIcon, WalletIcon, CheckCircleIcon } from "@/components/landing/LineIcons";

const CARDS = [
  {
    icon: ChartIcon,
    accent: "text-btc",
    title: "Live race view",
    body: "Mark price for both assets, a momentum gauge, and a mark-price chart since the window opened — updated in real time.",
  },
  {
    icon: WalletIcon,
    accent: "text-win",
    title: "Connect your own wallet",
    body: "MetaMask or any injected wallet on Shannon testnet. No custodial account, no embedded key — you hold it.",
  },
  {
    icon: CheckCircleIcon,
    accent: "text-eth",
    title: "One-tap claim",
    body: "Win, lose, or draw, your payout or refund is a single on-chain claim away. Your full pick history lives on your profile.",
  },
];

export function WhatYouGet() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border">
      <SectionHeading
        eyebrow="On the arena"
        title="What you get"
        subtitle="Everything you need to watch the race and act on it, nothing you don't."
      />
      <div className="mt-10 grid sm:grid-cols-3 gap-px bg-border">
        {CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="bg-bg p-6"
          >
            <div className={`corner-panel-sm w-11 h-11 flex items-center justify-center border border-border bg-surface-2 ${c.accent}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="mt-4 font-display text-xl">{c.title}</div>
            <p className="mt-2 text-sm text-text-dim leading-relaxed">{c.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
