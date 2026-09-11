"use client";

import { useState } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { Side } from "@/lib/chain";
import { useWallet, formatSTT } from "@/lib/wallet";

const QUICK_AMOUNTS = ["0.01", "0.05", "0.1", "0.25"];

export function PickPanel({
  windowId,
  locked,
  userStakeBTC,
  userStakeETH,
  onPicked,
}: {
  windowId: bigint;
  locked: boolean;
  userStakeBTC: bigint;
  userStakeETH: bigint;
  onPicked: () => void;
}) {
  const { pick, balance } = useWallet();
  const [amount, setAmount] = useState("0.05");
  const [pending, setPending] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alreadyPicked = userStakeBTC > 0n || userStakeETH > 0n;
  const pickedSide = userStakeBTC > 0n ? Side.BTC : userStakeETH > 0n ? Side.ETH : null;

  async function submit(side: Side) {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("enter an amount");
      return;
    }
    setPending(side);
    try {
      await pick(windowId, side, amount);
      onPicked();
    } catch (e) {
      setError(shortError((e as Error).message));
    } finally {
      setPending(null);
    }
  }

  if (alreadyPicked) {
    const side = pickedSide === Side.BTC ? "BTC" : "ETH";
    const stake = pickedSide === Side.BTC ? userStakeBTC : userStakeETH;
    return (
      <div
        className={clsx(
          "rounded-2xl border p-5 flex items-center gap-4",
          pickedSide === Side.BTC ? "border-btc/40 bg-btc/5" : "border-eth/40 bg-eth/5"
        )}
      >
        {pickedSide === Side.BTC ? <BtcIcon className="w-10 h-10" /> : <EthIcon className="w-10 h-10" />}
        <div>
          <div className="font-semibold">You're in on {side}</div>
          <div className="text-sm text-text-dim font-mono tabular">
            {formatSTT(stake, 4)} STT staked
          </div>
        </div>
        {!locked && (
          <div className="ml-auto">
            <QuickAdd side={pickedSide!} onSubmit={submit} pending={pending} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-dim">Stake amount (STT)</span>
        <span className="text-xs text-text-faint font-mono tabular">
          balance: {formatSTT(balance, 3)}
        </span>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 font-mono tabular focus:outline-none focus:border-text-faint"
          placeholder="0.05"
        />
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className="rounded-xl border border-border px-3 py-2.5 text-sm text-text-dim hover:border-text-faint transition-colors"
          >
            {a}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PickButton
          side={Side.BTC}
          icon={<BtcIcon className="w-7 h-7" />}
          label="Pick BTC"
          disabled={locked || pending !== null}
          loading={pending === Side.BTC}
          onClick={() => submit(Side.BTC)}
        />
        <PickButton
          side={Side.ETH}
          icon={<EthIcon className="w-7 h-7" />}
          label="Pick ETH"
          disabled={locked || pending !== null}
          loading={pending === Side.ETH}
          onClick={() => submit(Side.ETH)}
        />
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm text-draw">Picks are locked for this window.</p>
      )}
      {error && <p className="mt-3 text-center text-sm text-lose">{error}</p>}
    </div>
  );
}

function PickButton({
  icon,
  label,
  disabled,
  loading,
  onClick,
  side,
}: {
  side: Side;
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const accent = side === Side.BTC ? "btc" : "eth";
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center gap-2.5 rounded-xl py-4 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        accent === "btc" ? "bg-btc/15 text-btc hover:bg-btc/25" : "bg-eth/15 text-eth hover:bg-eth/25"
      )}
    >
      {loading ? <span className="animate-pulse">confirming…</span> : (
        <>
          {icon}
          {label}
        </>
      )}
    </motion.button>
  );
}

function QuickAdd({
  side,
  onSubmit,
  pending,
}: {
  side: Side;
  onSubmit: (side: Side) => void;
  pending: Side | null;
}) {
  return (
    <button
      onClick={() => onSubmit(side)}
      disabled={pending !== null}
      className="text-xs rounded-full border border-border px-3 py-1.5 text-text-dim hover:border-text-faint transition-colors disabled:opacity-50"
    >
      {pending === side ? "adding…" : "+ add more"}
    </button>
  );
}

function shortError(msg: string): string {
  if (msg.includes("ALREADY_ON_OTHER_SIDE")) return "you already picked the other side";
  if (msg.includes("PICKS_LOCKED")) return "picks just locked — wait for the next window";
  if (msg.includes("insufficient funds")) return "insufficient STT — use \"Get test STT\"";
  return msg.slice(0, 120);
}
