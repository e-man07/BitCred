"use client";

import { useEffect, useState } from "react";
import { getDreamDexExchange } from "@/lib/dreamdex";

type PriceWatchHandle = { stop?: () => void } | undefined;

export type AssetPrice = {
  live: number | null;
  opening: number | null;
  pctChange: number | null; // (live - opening) / opening * 100
};

const EMPTY: AssetPrice = { live: null, opening: null, pctChange: null };

function pct(live: number | null, opening: number | null): number | null {
  if (live === null || opening === null || opening === 0) return null;
  return ((live - opening) / opening) * 100;
}

/**
 * Live BTC/ETH index prices plus the opening price of the two specific
 * DreamDEX markets bound to the active window, so the UI can show each
 * asset's live % move since the window opened — the same number the
 * Event Contract itself settles against.
 */
export function usePrices(btcMarketId: string | null, ethMarketId: string | null) {
  const [btc, setBtc] = useState<AssetPrice>(EMPTY);
  const [eth, setEth] = useState<AssetPrice>(EMPTY);

  // Live index prices — pushed over the SDK's websocket, no polling.
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
      const b = exchange.client.getLivePrice("BTC");
      const e = exchange.client.getLivePrice("ETH");
      if (b) setBtc((s) => ({ ...s, live: Number(b.price) }));
      if (e) setEth((s) => ({ ...s, live: Number(e.price) }));
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
      handleBtc?.stop?.();
      handleEth?.stop?.();
    };
  }, []);

  // Opening prices for the two markets bound to the current window.
  useEffect(() => {
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
        setBtc((s) => ({ ...s, opening: bOpen ? Number(bOpen) / 100 : null }));
        setEth((s) => ({ ...s, opening: eOpen ? Number(eOpen) / 100 : null }));
      } catch {
        /* ignore — race view falls back to raw price only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [btcMarketId, ethMarketId]);

  return {
    btc: { ...btc, pctChange: pct(btc.live, btc.opening) },
    eth: { ...eth, pctChange: pct(eth.live, eth.opening) },
  };
}
