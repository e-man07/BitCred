"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/landing/Eyebrow";
import { ClockIcon, ScaleIcon, ShieldIcon } from "@/components/landing/LineIcons";

const CARDS = [
  {
    icon: ClockIcon,
    accent: "text-btc",
    title: "Three cadences, one arena",
    body: "5-minute, 15-minute, and 1-hour windows run concurrently. Switch tabs on /play without leaving the action.",
  },
  {
    icon: ScaleIcon,
    accent: "text-win",
    title: "Parimutuel, no house",
    body: "Every stake pools into one pot per side. Winners split both pots pro-rata — nothing is taken by a market maker on the other side.",
  },
  {
    icon: ShieldIcon,
    accent: "text-eth",
    title: "100% DreamDEX-settled",
    body: "Both BTC and ETH DreamDEX Event Contracts resolve independently. Our resolver reads the outcome and writes it on-chain — nothing else decides who wins.",
  },
];

export function WhatIsBitcred() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <SectionHeading
        eyebrow="Introduction"
        title="What is Bitcred?"
        subtitle="A head-to-head market on BTC vs ETH, settled entirely by DreamDEX Event Contract resolutions on Somnia — no oracle of our own, no admin override."
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
