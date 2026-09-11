"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WalletBadge } from "@/components/play/WalletBadge";
import { MatchHeader, Phase } from "@/components/play/MatchHeader";
import { CadenceTabs } from "@/components/play/CadenceTabs";
import { RaceView } from "@/components/play/RaceView";
import { MatchChart } from "@/components/play/MatchChart";
import { PotSplitBar } from "@/components/play/PotSplitBar";
import { PickPanel } from "@/components/play/PickPanel";
import { SettlementOverlay } from "@/components/play/SettlementOverlay";
import { HistoryStrip } from "@/components/play/HistoryStrip";
import { useWindow } from "@/hooks/useWindow";
import { usePrices } from "@/hooks/usePrices";
import { useWallet } from "@/lib/wallet";
import { CADENCES, readStakes } from "@/lib/chain";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function PlayPage() {
  const [cadenceSec, setCadenceSec] = useState(CADENCES[0]?.sec ?? 300);
  const { expiry, window: win, prevWindow, history } = useWindow(cadenceSec);
  const { address } = useWallet();
  const now = useNow();
  const nowSec = Math.floor(now / 1000);

  // This whole page is live/on-chain data with no meaningful server-rendered
  // state (wallet, countdowns, locale-formatted times) — render a stable
  // placeholder for the SSR pass and swap in real content after mount so
  // client vs. server locale/time differences never cause a hydration diff.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const prices = usePrices(win?.btcMarketId ?? null, win?.ethMarketId ?? null, win?.opensAt ?? null);

  const [userStake, setUserStake] = useState<{ btc: bigint; eth: bigint }>({ btc: 0n, eth: 0n });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!address || !win) {
      setUserStake({ btc: 0n, eth: 0n });
      return;
    }
    let cancelled = false;
    readStakes(win.id, address).then((s) => {
      if (!cancelled) setUserStake({ btc: s.stakeBTC, eth: s.stakeETH });
    });
    return () => {
      cancelled = true;
    };
  }, [address, win?.id, refreshTick]);

  let phase: Phase = "waiting";
  let secondsLeft = 0;
  const totalSeconds = cadenceSec;

  if (win) {
    if (nowSec < win.locksAt) {
      phase = "open";
      secondsLeft = win.locksAt - nowSec;
    } else if (nowSec < win.expiresAt) {
      phase = "locked";
      secondsLeft = win.expiresAt - nowSec;
    } else {
      phase = "resolving";
      secondsLeft = 0;
    }
  }

  const windowLabel = win
    ? new Date(win.expiresAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " close"
    : new Date(expiry * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " close";

  if (!mounted) {
    return (
      <div className="flex-1 bg-arena bg-grain">
        <div className="max-w-3xl mx-auto px-6 py-6 text-text-faint text-sm">Loading arena…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-arena bg-grain">
      <header className="max-w-3xl mx-auto flex items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/bitcred-logo.png" alt="Bitcred" width={34} height={34} />
          <span className="font-display text-lg tracking-wide">Bitcred</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="text-sm text-text-dim hover:text-text transition-colors hidden sm:inline"
          >
            Profile
          </Link>
          <WalletBadge />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-20">
        <div className="flex justify-center mb-6">
          <CadenceTabs value={cadenceSec} onChange={setCadenceSec} />
        </div>

        <SettlementOverlay window={prevWindow} />

        <MatchHeader
          phase={phase}
          secondsLeft={secondsLeft}
          totalSeconds={totalSeconds}
          windowLabel={windowLabel}
        />

        <div className="mt-6">
          <RaceView btc={prices.btc} eth={prices.eth} />
        </div>

        <div className="mt-6">
          <MatchChart
            btcHistory={prices.btcHistory}
            ethHistory={prices.ethHistory}
            cadenceSec={cadenceSec}
          />
        </div>

        <div className="mt-6">
          <PotSplitBar potBTC={win?.potBTC ?? 0n} potETH={win?.potETH ?? 0n} />
        </div>

        <div className="mt-6">
          {!address ? (
            <div className="corner-panel p-8 text-center text-text-faint">
              Connect a wallet to place a pick.
            </div>
          ) : win ? (
            <PickPanel
              windowId={win.id}
              locked={phase !== "open"}
              userStakeBTC={userStake.btc}
              userStakeETH={userStake.eth}
              onPicked={() => setRefreshTick((t) => t + 1)}
            />
          ) : (
            <div className="corner-panel p-8 text-center text-text-faint shimmer">
              Waiting for the resolver to open this window…
            </div>
          )}
        </div>

        <div className="mt-10">
          <h3 className="text-sm text-text-dim mb-3">Recent decisions</h3>
          <HistoryStrip history={history} />
        </div>
      </main>
    </div>
  );
}
