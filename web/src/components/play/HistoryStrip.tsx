"use client";

import clsx from "clsx";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { Side, Status } from "@/lib/chain";
import type { HistoryEntry } from "@/hooks/useWindow";

export function HistoryStrip({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="text-sm text-text-faint text-center py-6">
        No settled windows yet — the first one is on the way.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {history.map((h) => {
        const isDraw = h.status === Status.DRAW;
        const time = new Date(h.expiresAt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div
            key={h.windowId.toString()}
            className={clsx(
              "shrink-0 w-36 rounded-xl border p-3",
              isDraw ? "border-draw/30 bg-draw/5" : "border-border bg-surface/50"
            )}
          >
            <div className="flex items-center justify-between">
              {isDraw ? (
                <span className="text-draw font-display font-bold text-sm">No Contest</span>
              ) : h.winner === Side.BTC ? (
                <BtcIcon className="w-6 h-6" />
              ) : (
                <EthIcon className="w-6 h-6" />
              )}
              <span className="text-xs text-text-faint font-mono">{time}</span>
            </div>
            {!isDraw && (
              <div className={clsx("text-xs mt-1 font-medium", h.winner === Side.BTC ? "text-btc" : "text-eth")}>
                {h.winner === Side.BTC ? "BTC" : "ETH"} won
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
