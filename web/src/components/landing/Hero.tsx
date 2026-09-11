"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";

export function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-text-dim mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-win pulse-ring" />
            Live on Somnia Shannon Testnet
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-display font-semibold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-[0.98]"
          >
            BTC or ETH.
            <br />
            <span className="text-text-dim">Pick a side.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 text-lg text-text-dim max-w-lg leading-relaxed"
          >
            One five-minute window. Whichever asset's DreamDEX Event Contract
            resolves Up while the other doesn't, wins the whole pot. Same
            direction on both? Everyone gets refunded — no house, no
            ambiguity.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex items-center gap-4"
          >
            <Link
              href="/play"
              className="rounded-full bg-text text-bg font-semibold px-7 py-3.5 text-base hover:scale-[1.03] active:scale-[0.98] transition-transform"
            >
              Enter the Arena →
            </Link>
            <span className="text-sm text-text-faint">
              No signup. Wallet auto-created in your browser.
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative rounded-3xl border border-border bg-surface/70 p-8 overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(247,147,26,0.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(123,143,255,0.2), transparent 45%)",
            }}
          />
          <div className="relative flex items-center justify-center gap-6 py-6">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-3"
            >
              <BtcIcon className="w-20 h-20 drop-shadow-[0_0_30px_rgba(247,147,26,0.45)]" />
              <span className="font-display font-semibold text-xl">BTC</span>
            </motion.div>

            <span className="font-display text-2xl text-text-faint select-none">VS</span>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-3"
            >
              <EthIcon className="w-20 h-20 drop-shadow-[0_0_30px_rgba(123,143,255,0.45)]" />
              <span className="font-display font-semibold text-xl">ETH</span>
            </motion.div>
          </div>

          <div className="relative mt-4 rounded-xl border border-border bg-bg/60 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-text-dim">Pot split (example)</span>
            <span className="tabular text-text-faint">54% / 46%</span>
          </div>
          <div className="relative mt-2 h-2 rounded-full bg-bg/60 overflow-hidden flex">
            <div className="h-full bg-btc" style={{ width: "54%" }} />
            <div className="h-full bg-eth" style={{ width: "46%" }} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
