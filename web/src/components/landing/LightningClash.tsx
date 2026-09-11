"use client";

import { motion } from "framer-motion";

// An 8-point starburst polygon (comic-impact shape), computed once.
function starPoints(spikes: number, outerR: number, innerR: number) {
  const pts: string[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x = 50 + Math.cos(angle) * r;
    const y = 50 + Math.sin(angle) * r;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const BURST_POINTS = starPoints(9, 46, 15);

const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return { dx: Math.cos(angle) * 46, dy: Math.sin(angle) * 46, orange: i % 2 === 0 };
});

const CYCLE = 2.6;
const REST = 1.4;

/**
 * An impact burst — a jagged starburst split BTC-orange/ETH-violet, punching
 * outward at the VS point with a spark shower on every hit. Reads as an
 * actual collision (comic "POW" impact language), not an ambient glow.
 */
export function LightningClash() {
  return (
    <div className="absolute inset-0 z-0 flex items-center pointer-events-none">
      <motion.div
        className="flex-1 h-1"
        style={{ background: "linear-gradient(to right, transparent, var(--btc))" }}
        animate={{ opacity: [0.4, 1, 0.4], scaleY: [1, 1.8, 1] }}
        transition={{ duration: CYCLE, repeat: Infinity, repeatDelay: REST, ease: "easeInOut" }}
      />

      <div className="relative shrink-0 w-2 h-2">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -m-9 w-20 h-20 overflow-visible">
          <defs>
            <linearGradient id="burst-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--btc)" />
              <stop offset="48%" stopColor="var(--btc-glow)" />
              <stop offset="52%" stopColor="var(--eth-glow)" />
              <stop offset="100%" stopColor="var(--eth)" />
            </linearGradient>
            <filter id="burst-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <motion.polygon
            points={BURST_POINTS}
            fill="url(#burst-fill)"
            filter="url(#burst-glow)"
            style={{ transformOrigin: "50px 50px" }}
            initial={{ scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{ scale: [0.3, 1.15, 0.75], opacity: [0, 1, 0], rotate: [0, 14, 14] }}
            transition={{
              duration: CYCLE,
              repeat: Infinity,
              repeatDelay: REST,
              times: [0, 0.22, 0.55],
              ease: "easeOut",
            }}
          />
        </svg>

        {SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full"
            style={{ background: s.orange ? "var(--btc-glow)" : "var(--eth-glow)" }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: [0, s.dx], y: [0, s.dy], opacity: [0, 1, 0], scale: [0.6, 1, 0.3] }}
            transition={{
              duration: CYCLE,
              repeat: Infinity,
              repeatDelay: REST,
              times: [0, 0.4, 1],
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="flex-1 h-1"
        style={{ background: "linear-gradient(to left, transparent, var(--eth))" }}
        animate={{ opacity: [0.4, 1, 0.4], scaleY: [1, 1.8, 1] }}
        transition={{ duration: CYCLE, repeat: Infinity, repeatDelay: REST, ease: "easeInOut" }}
      />
    </div>
  );
}

export const CLASH_CYCLE_SECONDS = CYCLE;
export const CLASH_REST_SECONDS = REST;
