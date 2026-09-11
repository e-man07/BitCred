"use client";

import { useMemo } from "react";
import type { PricePoint } from "@/hooks/usePrices";

const W = 600;
const H = 180;
const PAD_Y = 14;

function buildLine(points: PricePoint[], xScale: (t: number) => number, yScale: (p: number) => number) {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.t).toFixed(1)},${yScale(p.pct).toFixed(1)}`).join(" ");
}

function buildFill(
  points: PricePoint[],
  xScale: (t: number) => number,
  yScale: (p: number) => number,
  zeroY: number
) {
  if (points.length === 0) return "";
  const line = points.map((p) => `${xScale(p.t).toFixed(1)},${yScale(p.pct).toFixed(1)}`).join(" L");
  const first = xScale(points[0].t).toFixed(1);
  const last = xScale(points[points.length - 1].t).toFixed(1);
  return `M${first},${zeroY} L${line} L${last},${zeroY} Z`;
}

export function MatchChart({
  btcHistory,
  ethHistory,
  cadenceSec,
}: {
  btcHistory: PricePoint[];
  ethHistory: PricePoint[];
  cadenceSec: number;
}) {
  const { btcLine, ethLine, btcFill, ethFill, zeroY, hasData } = useMemo(() => {
    const allPts = [...btcHistory, ...ethHistory];
    const maxAbs = allPts.reduce((m, p) => Math.max(m, Math.abs(p.pct)), 0);
    const range = Math.max(maxAbs * 1.25, 0.02); // never a fully flat scale

    const xScale = (t: number) => (Math.min(t, cadenceSec) / cadenceSec) * W;
    const yScale = (p: number) => H / 2 - (p / range) * (H / 2 - PAD_Y);
    const zeroY = yScale(0);

    return {
      btcLine: buildLine(btcHistory, xScale, yScale),
      ethLine: buildLine(ethHistory, xScale, yScale),
      btcFill: buildFill(btcHistory, xScale, yScale, zeroY),
      ethFill: buildFill(ethHistory, xScale, yScale, zeroY),
      zeroY,
      hasData: allPts.length > 1,
    };
  }, [btcHistory, ethHistory, cadenceSec]);

  const btcLast = btcHistory[btcHistory.length - 1];
  const ethLast = ethHistory[ethHistory.length - 1];

  return (
    <div className="corner-panel px-5 py-4">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-text-dim">Live move since opening price</span>
        <div className="flex items-center gap-4 font-mono tabular text-xs">
          <span className="flex items-center gap-1.5 text-btc">
            <span className="w-2 h-2 rounded-full bg-btc" /> BTC
          </span>
          <span className="flex items-center gap-1.5 text-eth">
            <span className="w-2 h-2 rounded-full bg-eth" /> ETH
          </span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-36 sm:h-44 overflow-visible">
          <defs>
            <linearGradient id="chart-btc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--btc)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--btc)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="chart-eth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--eth)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--eth)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 4" />

          {!hasData ? (
            <text x={W / 2} y={H / 2 + 4} textAnchor="middle" className="fill-text-faint" fontSize="12">
              collecting live ticks…
            </text>
          ) : (
            <>
              {btcFill && <path d={btcFill} fill="url(#chart-btc-fill)" />}
              {ethFill && <path d={ethFill} fill="url(#chart-eth-fill)" />}
              {btcLine && (
                <path d={btcLine} fill="none" stroke="var(--btc)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {ethLine && (
                <path d={ethLine} fill="none" stroke="var(--eth)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-1 text-xs font-mono tabular text-text-faint">
        <span>window open</span>
        <span>
          {btcLast ? `${btcLast.pct >= 0 ? "+" : ""}${btcLast.pct.toFixed(3)}%` : "—"} ·{" "}
          {ethLast ? `${ethLast.pct >= 0 ? "+" : ""}${ethLast.pct.toFixed(3)}%` : "—"}
        </span>
        <span>lock</span>
      </div>
    </div>
  );
}
