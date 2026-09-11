"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function ClosingCta() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="corner-panel seam relative overflow-hidden px-8 py-14 sm:py-16 text-center"
      >
        <h2 className="font-display text-4xl sm:text-5xl">
          <span className="text-btc">BTC</span> or <span className="text-eth">ETH</span>?
        </h2>
        <p className="mt-3 text-text-dim max-w-md mx-auto leading-relaxed">
          Pick a cadence, pick a side, and watch it settle live off real
          DreamDEX resolutions.
        </p>
        <Link
          href="/play"
          className="mt-8 inline-block corner-panel-sm bg-text text-bg font-display text-lg px-9 py-3.5 hover:brightness-110 active:brightness-95 transition-[filter]"
        >
          Enter the Arena
        </Link>
      </motion.div>
    </section>
  );
}
