"use client";

import { useEffect, useRef, useState } from "react";
import {
  CADENCE_SEC,
  CONTRACT_ADDRESS,
  ChainWindow,
  MATCHUP_ABI,
  Side,
  Status,
  currentBoundary,
  publicClient,
  readWindow,
} from "@/lib/chain";

export type HistoryEntry = {
  windowId: number;
  status: Status;
  winner: Side;
  potBTC: bigint;
  potETH: bigint;
};

const POLL_MS = 3000;
// Shannon's RPC caps eth_getLogs at a 1000-block range per call (undocumented;
// discovered empirically — larger ranges error with "block range exceeds
// 1000"), so bootstrapping history means paginating backward in 1000-block
// pages rather than one wide query.
const LOG_PAGE_BLOCKS = 1000n;
const MAX_LOG_PAGES = 20;

export function useWindow() {
  const [expiry, setExpiry] = useState<number>(() => currentBoundary());
  const [window_, setWindow] = useState<ChainWindow | null>(null);
  const [prevWindow, setPrevWindow] = useState<ChainWindow | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const expiryRef = useRef(expiry);
  const prevWindowRef = useRef<ChainWindow | null>(null);
  const bootstrapped = useRef(false);

  // Poll the active window on a fixed cadence boundary; keep refreshing the
  // just-closed window until it resolves so the settlement moment has fresh data.
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const boundary = currentBoundary();

      if (boundary !== expiryRef.current) {
        try {
          const closed = await readWindow(expiryRef.current);
          if (!cancelled && closed.expiresAt !== 0) {
            prevWindowRef.current = closed;
            setPrevWindow(closed);
          }
        } catch {
          /* ignore */
        }
        expiryRef.current = boundary;
        setExpiry(boundary);
      }

      try {
        const w = await readWindow(expiryRef.current);
        if (!cancelled) setWindow(w.expiresAt === 0 ? null : w);
      } catch {
        /* transient RPC error, ignore this tick */
      }

      if (prevWindowRef.current && prevWindowRef.current.status === Status.OPEN) {
        try {
          const closed = await readWindow(prevWindowRef.current.expiresAt);
          if (!cancelled) {
            prevWindowRef.current = closed;
            setPrevWindow(closed);
          }
        } catch {
          /* ignore */
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // One-time best-effort history bootstrap from Settled events.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        type SettledLog = { args: { windowId: bigint; status: number; winner: number } };
        const latest = await publicClient.getBlockNumber();
        const collected: HistoryEntry[] = [];
        let toBlock = latest;

        for (let page = 0; page < MAX_LOG_PAGES && collected.length < 8; page++) {
          const fromBlock = toBlock > LOG_PAGE_BLOCKS ? toBlock - LOG_PAGE_BLOCKS + 1n : 0n;
          const logs = await publicClient.getContractEvents({
            address: CONTRACT_ADDRESS,
            abi: MATCHUP_ABI,
            eventName: "Settled",
            fromBlock,
            toBlock,
          });
          for (const log of logs as unknown as SettledLog[]) {
            collected.push({
              windowId: Number(log.args.windowId),
              status: log.args.status as Status,
              winner: log.args.winner as Side,
              potBTC: 0n,
              potETH: 0n,
            });
          }
          if (fromBlock === 0n) break;
          toBlock = fromBlock - 1n;
        }

        const entries = collected.sort((a, b) => b.windowId - a.windowId).slice(0, 8);

        const withPots = await Promise.all(
          entries.map(async (e) => {
            try {
              const w = await readWindow(e.windowId);
              return { ...e, potBTC: w.potBTC, potETH: w.potETH };
            } catch {
              return e;
            }
          })
        );
        setHistory(withPots);
      } catch {
        // RPC may not support wide log ranges — fine, history just starts empty.
      }
    })();
  }, []);

  // Append newly-observed settlements (from prevWindow transitions) to history.
  useEffect(() => {
    if (!prevWindow || prevWindow.status === Status.OPEN) return;
    setHistory((h) => {
      if (h.some((e) => e.windowId === prevWindow.expiresAt)) return h;
      return [
        {
          windowId: prevWindow.expiresAt,
          status: prevWindow.status,
          winner: prevWindow.winner,
          potBTC: prevWindow.potBTC,
          potETH: prevWindow.potETH,
        },
        ...h,
      ].slice(0, 8);
    });
  }, [prevWindow]);

  return { expiry, window: window_, prevWindow, history, cadenceSec: CADENCE_SEC };
}
