"use client";

import clsx from "clsx";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { Side, Status } from "@/lib/chain";
import type { HistoryEntry } from "@/hooks/useWindow";

export function HistoryStrip({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="text-sm text-text-faint text-center py-6 border border-border">
        No settled windows yet — the first one is on the way.
      </div>
    );
  }

  return (
    <div className="flex gap-px bg-border overflow-x-auto">
      {history.map((h) => {
        const isDraw = h.status === Status.DRAW;
        const time = new Date(h.expiresAt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div key={h.windowId.toString()} className="shrink-0 w-32 bg-bg p-3">
            <div className="flex items-center justify-between">
              {isDraw ? (
                <span className="text-draw font-display text-base leading-none">Draw</span>
              ) : h.winner === Side.BTC ? (
                <BtcIcon className="w-6 h-6" />
              ) : (
                <EthIcon className="w-6 h-6" />
              )}
              <span className="text-xs text-text-faint font-mono">{time}</span>
            </div>
            {!isDraw && (
              <div className={clsx("text-xs mt-1.5 font-medium", h.winner === Side.BTC ? "text-btc" : "text-eth")}>
                {h.winner === Side.BTC ? "BTC" : "ETH"} won
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
