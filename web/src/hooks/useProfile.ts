"use client";

import { useEffect, useState } from "react";
import {
  CADENCE_SEC,
  Side,
  Status,
  currentBoundary,
  publicClient,
  readStakes,
  readWindow,
} from "@/lib/chain";

// windowId is a deterministic function of time (multiples of CADENCE_SEC), so
// unlike a Settled/Picked event scan — which on Shannon means paginating
// eth_getLogs in 1000-block pages (FEEDBACK.md #4), far too slow to reach
// back more than ~90 minutes — we can probe a bounded set of recent
// candidate windows directly via eth_call. The public client batches these
// into a handful of HTTP round-trips (see lib/chain.ts), so this stays fast
// even at a few hundred candidates.
const LOOKBACK_WINDOWS = 300; // ~25 hours at the 5-minute cadence

export type ProfileEntry = {
  windowId: number;
  side: Side;
  staked: bigint;
  status: Status;
  winner: Side;
  outcome: "win" | "loss" | "draw" | "pending";
  claimed: boolean;
  claimable: bigint;
};

export type ProfileStats = {
  windowsPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  pending: number;
  totalStaked: bigint;
  totalClaimed: bigint;
  totalClaimable: bigint;
};

const EMPTY_STATS: ProfileStats = {
  windowsPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  pending: 0,
  totalStaked: 0n,
  totalClaimed: 0n,
  totalClaimable: 0n,
};

export function useProfile(address: `0x${string}` | null) {
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    if (!address) {
      setEntries([]);
      setStats(EMPTY_STATS);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const boundary = currentBoundary();
        const candidates = Array.from(
          { length: LOOKBACK_WINDOWS },
          (_, i) => boundary - i * CADENCE_SEC
        ).filter((id) => id > 0);

        // Cheap first pass: just the two stake mappings per candidate,
        // batched by the transport into a few HTTP calls.
        const stakes = await Promise.all(
          candidates.map((windowId) => readStakes(windowId, address))
        );

        const hits = candidates
          .map((windowId, i) => ({ windowId, s: stakes[i] }))
          .filter(({ s }) => s.stakeBTC > 0n || s.stakeETH > 0n);

        const built: (ProfileEntry & { settledPayout: bigint })[] = await Promise.all(
          hits.map(async ({ windowId, s }) => {
            const w = await readWindow(windowId);
            const side = s.stakeBTC > 0n ? Side.BTC : Side.ETH;
            const staked = s.stakeBTC > 0n ? s.stakeBTC : s.stakeETH;

            let outcome: ProfileEntry["outcome"] = "pending";
            if (w.status === Status.DRAW) outcome = "draw";
            else if (w.status === Status.SETTLED) outcome = w.winner === side ? "win" : "loss";

            // The contract's claimable() returns 0 once claimed, so for
            // already-claimed entries we reconstruct what was paid out by
            // re-deriving the same deterministic formula claim() used —
            // pot sizes are immutable post-settlement, so this is exact.
            let settledPayout = 0n;
            if (outcome === "draw") settledPayout = staked;
            else if (outcome === "win") {
              const winningPot = side === Side.BTC ? w.potBTC : w.potETH;
              const losingPot = side === Side.BTC ? w.potETH : w.potBTC;
              settledPayout = staked + (staked * losingPot) / winningPot;
            }

            return {
              windowId,
              side,
              staked,
              status: w.status,
              winner: w.winner,
              outcome,
              claimed: s.claimed,
              claimable: s.claimable,
              settledPayout,
            };
          })
        );

        built.sort((a, b) => b.windowId - a.windowId);
        if (cancelled) return;
        setEntries(built);

        const agg = built.reduce((acc, e) => {
          acc.windowsPlayed++;
          if (e.outcome === "win") acc.wins++;
          else if (e.outcome === "loss") acc.losses++;
          else if (e.outcome === "draw") acc.draws++;
          else acc.pending++;
          acc.totalStaked += e.staked;
          if (e.claimed) acc.totalClaimed += e.settledPayout;
          else acc.totalClaimable += e.claimable;
          return acc;
        }, { ...EMPTY_STATS });

        setStats(agg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, refreshTick]);

  return { entries, stats, loading, refresh };
}
