export function shortAddr(addr: string, chars = 4): string {
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function formatPct(pct: number | null, digits = 2): string {
  if (pct === null || Number.isNaN(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

export function formatUsd(price: number | null, digits = 2): string {
  if (price === null || Number.isNaN(price)) return "—";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
