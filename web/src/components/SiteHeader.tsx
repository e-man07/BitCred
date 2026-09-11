"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { WalletBadge } from "@/components/play/WalletBadge";

const NAV_LINKS = [{ href: "/markets", label: "Markets" }];

export function SiteHeader({ maxWidth = "max-w-6xl" }: { maxWidth?: string }) {
  const pathname = usePathname();

  return (
    <header className={clsx(maxWidth, "mx-auto flex items-center justify-between px-6 py-6 gap-4")}>
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <Image src="/bitcred-logo.png" alt="Bitcred" width={32} height={32} priority />
        <span className="font-display text-lg tracking-wide">Bitcred</span>
      </Link>

      <nav className="flex items-center gap-6 text-sm text-text-dim">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "hover:text-text transition-colors hidden sm:inline",
              pathname === link.href && "text-text"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        <WalletBadge />
        {pathname !== "/play" && (
          <Link
            href="/play"
            className="corner-panel-sm bg-text text-bg font-medium px-4 py-2 text-sm hover:brightness-110 transition-[filter] hidden md:inline-block"
          >
            Enter the Arena
          </Link>
        )}
      </div>
    </header>
  );
}
