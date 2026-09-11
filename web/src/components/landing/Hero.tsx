"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import {
  LightningClash,
  CLASH_CYCLE_SECONDS,
  CLASH_REST_SECONDS,
} from "@/components/landing/LightningClash";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* the seam: BTC's corner bleeding in from the top-left, ETH's from
          the bottom-right, meeting at a hard diagonal line through center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(122deg, rgba(247,147,26,0.07) 0%, rgba(247,147,26,0.015) 30%, transparent 46%, transparent 54%, rgba(124,140,255,0.015) 70%, rgba(124,140,255,0.07) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 700px 420px at 50% 8%, rgba(255,255,255,0.06), transparent 65%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs text-text-dim mb-10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-win pulse-ring" />
          Live on Somnia Shannon Testnet
        </motion.div>

        {/* the face-off */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="relative flex items-center justify-center gap-6 sm:gap-12 mb-8"
        >
          <LightningClash />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 shrink-0"
          >
            <div className="absolute inset-0 rounded-full bg-btc blur-3xl opacity-30 scale-125" />
            <BtcIcon className="relative w-24 h-24 sm:w-32 sm:h-32" />
          </motion.div>

          <motion.span
            className="relative z-10 font-display text-3xl sm:text-5xl text-text select-none shrink-0"
            style={{ textShadow: "0 0 30px rgba(255,255,255,0.25)" }}
            animate={{ scale: [1, 1.28, 0.96, 1] }}
            transition={{
              duration: CLASH_CYCLE_SECONDS,
              repeat: Infinity,
              repeatDelay: CLASH_REST_SECONDS,
              times: [0, 0.22, 0.32, 0.5],
              ease: "easeOut",
            }}
          >
            VS
          </motion.span>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 shrink-0"
          >
            <div className="absolute inset-0 rounded-full bg-eth blur-3xl opacity-30 scale-125" />
            <EthIcon className="relative w-24 h-24 sm:w-32 sm:h-32" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-display text-6xl sm:text-8xl leading-[0.92] tracking-tight"
        >
          <span className="text-btc">BTC</span> vs <span className="text-eth">ETH</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 text-lg text-text-dim max-w-lg mx-auto leading-relaxed"
        >
          Pick a cadence — 5 minutes, 15 minutes, or an hour. Whichever asset's
          DreamDEX Event Contract resolves Up while the other doesn't wins the
          whole pot. Same direction on both? Everyone gets refunded — no
          house, no ambiguity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <Link
            href="/play"
            className="corner-panel-sm bg-text text-bg font-display text-lg px-9 py-3.5 hover:brightness-110 active:brightness-95 transition-[filter]"
          >
            Enter the Arena
          </Link>
          <span className="text-sm text-text-faint">
            Connect any wallet. Shannon testnet, one click.
          </span>
        </motion.div>
      </div>
    </section>
  );
}
