import Link from "next/link";
import Image from "next/image";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Problem } from "@/components/landing/Problem";
import { WhatIsBitcred } from "@/components/landing/WhatIsBitcred";
import { SectionHeading } from "@/components/landing/Eyebrow";
import { StatRow } from "@/components/landing/StatCard";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { ClosingCta } from "@/components/landing/ClosingCta";

export default function Home() {
  return (
    <div className="flex-1 bg-arena bg-grain">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Image src="/bitcred-logo.png" alt="Bitcred" width={40} height={40} priority />
          <span className="font-display text-xl tracking-wide">Bitcred</span>
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
            href="/profile"
            className="hover:text-text transition-colors hidden sm:inline"
          >
            Profile
          </Link>
          <Link
            href="/play"
            className="corner-panel-sm bg-text text-bg font-medium px-4 py-2 text-sm hover:brightness-110 transition-[filter]"
          >
            Enter the Arena
          </Link>
        </nav>
      </header>

      <Hero />
      <TrustStrip />
      <Problem />
      <WhatIsBitcred />

      <section className="max-w-3xl mx-auto px-6 py-20 border-t border-border">
        <SectionHeading
          eyebrow="The insight"
          title="What we measured before building"
          subtitle="We checked how often BTC and ETH actually resolve in the same direction against live Shannon testnet data, then built the settlement path around it."
        />
        <div className="mt-10">
          <StatRow
            index={0}
            value="~85%"
            label="of BTC vs ETH windows are a draw"
            detail="BTC and ETH move together most of the time — so a draw is the main event, not an edge case. The UI treats it as a first-class outcome."
            accent="eth"
          />
          <StatRow
            index={1}
            value="100%"
            label="of settlement comes from DreamDEX"
            detail="No oracle of our own, no admin override. Remove DreamDEX Event Contracts and this product cannot resolve — that's the whole integration story."
            accent="btc"
          />
        </div>
      </section>

      <HowItWorks />
      <WhatYouGet />
      <ClosingCta />

      <footer className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-faint border-t border-border">
        <span>Built on Somnia · Settled by DreamDEX Event Contracts</span>
        <span className="tabular">Shannon Testnet · Chain 50312</span>
      </footer>
    </div>
  );
}
