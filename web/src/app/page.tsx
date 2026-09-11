import Link from "next/link";
import { BtcIcon, EthIcon } from "@/components/AssetIcon";
import { Hero } from "@/components/landing/Hero";
import { StatCard } from "@/components/landing/StatCard";
import { HowItWorks } from "@/components/landing/HowItWorks";

export default function Home() {
  return (
    <div className="flex-1 bg-noise grid-lines">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <BtcIcon className="w-7 h-7 ring-2 ring-bg rounded-full" />
            <EthIcon className="w-7 h-7 ring-2 ring-bg rounded-full" />
          </div>
          <span className="font-semibold tracking-tight text-lg">Matchup</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-text-dim">
          <a
            href="https://shannon-explorer.somnia.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text transition-colors hidden sm:inline"
          >
            Shannon Testnet
          </a>
          <Link
            href="/play"
            className="rounded-full bg-text text-bg font-medium px-4 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            Enter the Arena
          </Link>
        </nav>
      </header>

      <Hero />

      <section className="max-w-6xl mx-auto px-6 py-20 grid gap-4 md:grid-cols-3">
        <StatCard
          value="83.5%"
          label="of DreamDEX markets never traded"
          detail="“Will BTC go up” is a question about market beta — everyone answers the same way, so the book goes one-sided and dies."
          accent="draw"
        />
        <StatCard
          value="~85%"
          label="of BTC vs ETH windows are a draw"
          detail="We measured it against live Shannon testnet data before building this. BTC and ETH move together most of the time — so a draw is the main event, not an edge case."
          accent="eth"
        />
        <StatCard
          value="100%"
          label="of settlement comes from DreamDEX"
          detail="No oracle of our own, no admin override. Remove DreamDEX Event Contracts and this product cannot resolve — that's the whole integration story."
          accent="btc"
        />
      </section>

      <HowItWorks />

      <footer className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-faint border-t border-border">
        <span>Built on Somnia · Settled by DreamDEX Event Contracts</span>
        <span className="tabular">Shannon Testnet · Chain 50312</span>
      </footer>
    </div>
  );
}
