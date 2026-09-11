"use client";

import { motion } from "framer-motion";

const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { dx: Math.cos(angle) * 34, dy: Math.sin(angle) * 34, orange: i % 2 === 0 };
});

/**
 * Two glowing currents — BTC orange, ETH violet — pushing in from each coin
 * and contesting at a bright flashpoint exactly on the VS mark, with a spark
 * burst on every surge. Plain gradient bars + a glow, not hand-drawn path
 * art — robust at any row width instead of a fixed-viewBox SVG stretching
 * unevenly across a row that's far wider than tall.
 */
export function LightningClash() {
  return (
    <div className="absolute inset-0 z-0 flex items-center pointer-events-none">
      <motion.div
        className="flex-1 h-[3px]"
        style={{ background: "linear-gradient(to right, transparent, var(--btc-glow))" }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative shrink-0 w-1 h-1">
        <motion.div
          className="absolute inset-0 -m-px rounded-full"
          style={{ background: "var(--text)" }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 -m-2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(243,236,221,0.55), transparent 70%)" }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full"
            style={{ background: s.orange ? "var(--btc-glow)" : "var(--eth-glow)" }}
            animate={{
              x: [0, s.dx],
              y: [0, s.dy],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", times: [0, 0.35, 1] }}
          />
        ))}
      </div>

      <motion.div
        className="flex-1 h-[3px]"
        style={{ background: "linear-gradient(to left, transparent, var(--eth-glow))" }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
