"use client";

import { useEffect, useRef, useState } from "react";
import { getDreamDexExchange } from "@/lib/dreamdex";

type PriceWatchHandle = { stop?: () => void } | undefined;

export type AssetPrice = {
  live: number | null;
  opening: number | null;
  pctChange: number | null; // (live - opening) / opening * 100
};

export type PricePoint = { t: number; pct: number };

const EMPTY: AssetPrice = { live: null, opening: null, pctChange: null };
const MAX_POINTS = 900; // caps memory/render cost even on the 1h cadence

function pct(live: number | null, opening: number | null): number | null {
  if (live === null || opening === null || opening === 0) return null;
  return ((live - opening) / opening) * 100;
}

/**
 * Live BTC/ETH index prices, the opening price of the two DreamDEX markets
 * bound to the active window, and a running history of % -change ticks
 * since the window opened (for charting the live race, not just a single
 * number) — reset whenever the window (marketId pair) changes.
 */
export function usePrices(
  btcMarketId: string | null,
  ethMarketId: string | null,
  windowOpensAt: number | null
) {
  const [btc, setBtc] = useState<AssetPrice>(EMPTY);
  const [eth, setEth] = useState<AssetPrice>(EMPTY);
  const [btcHistory, setBtcHistory] = useState<PricePoint[]>([]);
  const [ethHistory, setEthHistory] = useState<PricePoint[]>([]);

  // Refs so the tick interval (set up once) always sees the latest opening
  // price and window-start anchor without needing to be re-created. Anchored
  // to the window's real on-chain opensAt, not "whenever this tab first
  // rendered" — otherwise joining a window already in progress plots every
  // point near t=0 instead of where it actually falls in the window.
  const openingRef = useRef<{ btc: number | null; eth: number | null }>({ btc: null, eth: null });
  const opensAtRef = useRef<number | null>(windowOpensAt);

  // Reset on window change, then fetch this window's opening prices.
  useEffect(() => {
    openingRef.current = { btc: null, eth: null };
    opensAtRef.current = windowOpensAt;
    setBtc(EMPTY);
    setEth(EMPTY);
    setBtcHistory([]);
    setEthHistory([]);

    if (!btcMarketId || !ethMarketId) return;
    let cancelled = false;
    (async () => {
      try {
        const exchange = getDreamDexExchange();
        const openings = await exchange.client.getOpeningPrices([btcMarketId, ethMarketId]);
        if (cancelled) return;
        const bOpen = openings[btcMarketId.toLowerCase()];
        const eOpen = openings[ethMarketId.toLowerCase()];
        // getOpeningPrices returns a raw numericValue with the scale NOT
        // carried in the response — empirically ORACLE_PRICE_DECIMALS = 2.
        const bVal = bOpen ? Number(bOpen) / 100 : null;
        const eVal = eOpen ? Number(eOpen) / 100 : null;
        openingRef.current = { btc: bVal, eth: eVal };
        setBtc((s) => ({ ...s, opening: bVal }));
        setEth((s) => ({ ...s, opening: eVal }));
      } catch {
        /* ignore — race view falls back to raw price only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [btcMarketId, ethMarketId, windowOpensAt]);

  // Live index prices — pushed over the SDK's websocket, sampled on a
  // fixed tick for both the display value and the chart history.
  useEffect(() => {
    const exchange = getDreamDexExchange();
    let cancelled = false;
    let handleBtc: PriceWatchHandle;
    let handleEth: PriceWatchHandle;

    (async () => {
      try {
        handleBtc = await exchange.client.watchPrice("BTC");
        handleEth = await exchange.client.watchPrice("ETH");
      } catch {
        /* ignore — falls back to no live ticker */
      }
    })();

    const id = setInterval(() => {
      if (cancelled) return;
      if (opensAtRef.current === null) return;
      const b = exchange.client.getLivePrice("BTC");
      const e = exchange.client.getLivePrice("ETH");
      const t = Date.now() / 1000 - opensAtRef.current;

      if (b) {
        const live = Number(b.price);
        setBtc((s) => ({ ...s, live }));
        const p = pct(live, openingRef.current.btc);
        if (p !== null) {
          setBtcHistory((h) => (h.length >= MAX_POINTS ? h : [...h, { t, pct: p }]));
        }
      }
      if (e) {
        const live = Number(e.price);
        setEth((s) => ({ ...s, live }));
        const p = pct(live, openingRef.current.eth);
        if (p !== null) {
          setEthHistory((h) => (h.length >= MAX_POINTS ? h : [...h, { t, pct: p }]));
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
      handleBtc?.stop?.();
      handleEth?.stop?.();
    };
  }, []);

  return {
    btc: { ...btc, pctChange: pct(btc.live, btc.opening) },
    eth: { ...eth, pctChange: pct(eth.live, eth.opening) },
    btcHistory,
    ethHistory,
  };
}
