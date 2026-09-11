"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { ChainWindow, Side, Status, readStakes } from "@/lib/chain";
import { useWallet, formatSTT } from "@/lib/wallet";

export function SettlementOverlay({ window: w }: { window: ChainWindow | null }) {
  const { address, claim } = useWallet();
  const [dismissedId, setDismissedId] = useState<bigint | null>(null);
  const [stake, setStake] = useState<{ btc: bigint; eth: bigint; claimed: boolean; claimable: bigint } | null>(
    null
  );
  const [claiming, setClaiming] = useState(false);
  const [claimedTx, setClaimedTx] = useState<string | null>(null);

  useEffect(() => {
    setStake(null);
    setClaimedTx(null);
    if (!w || !address || w.status === Status.OPEN) return;
    let cancelled = false;
    readStakes(w.id, address).then((s) => {
      if (!cancelled)
        setStake({ btc: s.stakeBTC, eth: s.stakeETH, claimed: s.claimed, claimable: s.claimable });
    });
    return () => {
      cancelled = true;
    };
  }, [w?.id, w?.status, address]);

  if (!w || w.status === Status.OPEN || dismissedId === w.id) return null;

  const isDraw = w.status === Status.DRAW;
  const userInvolved = stake && (stake.btc > 0n || stake.eth > 0n);
  const userWon =
    !isDraw && stake && ((w.winner === Side.BTC && stake.btc > 0n) || (w.winner === Side.ETH && stake.eth > 0n));
  const winnerColor = w.winner === Side.BTC ? "var(--btc)" : "var(--eth)";

  async function handleClaim() {
    setClaiming(true);
    try {
      const hash = await claim(w!.id);
      setClaimedTx(hash);
      const s = await readStakes(w!.id, address!);
      setStake({ btc: s.stakeBTC, eth: s.stakeETH, claimed: s.claimed, claimable: s.claimable });
    } finally {
      setClaiming(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="bell-in corner-panel relative mb-6 overflow-hidden"
        style={{ borderColor: isDraw ? "var(--draw)" : "var(--win)" }}
      >
        {!isDraw && userWon && <Confetti />}

        <button
          onClick={() => setDismissedId(w.id)}
          className="absolute top-4 right-4 text-text-faint hover:text-text text-sm z-10"
        >
          dismiss
        </button>

        <div className="px-6 py-6">
          <div className="text-xs text-text-faint mb-1">
            {isDraw ? "Decision" : "Winner by resolution"}
          </div>
          <div className="flex items-center gap-4">
            {isDraw ? (
              <div className="w-14 h-14 shrink-0 flex items-center justify-center text-draw font-display text-2xl border-2 border-draw">
                =
              </div>
            ) : w.winner === Side.BTC ? (
              <BtcIcon className="w-14 h-14 shrink-0" />
            ) : (
              <EthIcon className="w-14 h-14 shrink-0" />
            )}

            <div>
              <div
                className="font-display text-3xl sm:text-4xl leading-none"
                style={{ color: isDraw ? "var(--draw)" : winnerColor }}
              >
                {isDraw ? "Draw" : `${w.winner === Side.BTC ? "BTC" : "ETH"} wins`}
              </div>
              <div className="text-sm text-text-dim mt-2">
                {isDraw
                  ? "Both resolved the same direction. Every stake is refunded in full."
                  : `${w.winner === Side.BTC ? "BTC" : "ETH"} resolved ${w.winner === Side.BTC ? (w.btcUp ? "Up" : "Down") : w.ethUp ? "Up" : "Down"} while the other didn't.`}
              </div>
            </div>
          </div>

          {userInvolved && stake && (
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <div className="text-sm">
                {isDraw ? (
                  <span className="text-draw">Your stake is fully refundable</span>
                ) : userWon ? (
                  <span className="text-win">You won this round</span>
                ) : (
                  <span className="text-text-dim">Not this round — the pot went the other way</span>
                )}
              </div>
              {stake.claimable > 0n && !stake.claimed ? (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="corner-panel-sm bg-text text-bg text-sm font-semibold px-4 py-2 disabled:opacity-50"
                >
                  {claiming ? "claiming…" : `Claim ${formatSTT(stake.claimable, 4)} STT`}
                </button>
              ) : stake.claimed || claimedTx ? (
                <span className="text-xs text-text-faint">claimed ✓</span>
              ) : null}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 1, rotate: 0 }}
          animate={{ y: "120%", opacity: 0, rotate: 360 }}
          transition={{ duration: 1.6 + Math.random(), delay: Math.random() * 0.4, ease: "easeIn" }}
          className="absolute w-1.5 h-3 rounded-sm"
          style={{ background: i % 2 === 0 ? "var(--win)" : "var(--btc)" }}
        />
      ))}
    </div>
  );
}
