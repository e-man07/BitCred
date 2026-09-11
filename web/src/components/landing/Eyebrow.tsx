export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="corner-panel-sm inline-flex items-center gap-2 border border-border bg-surface/70 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-text-dim">
      <span className="h-1.5 w-1.5 rotate-45 bg-win" />
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-display text-4xl sm:text-5xl">{title}</h2>
      {subtitle && (
        <p
          className={`mt-3 text-text-dim leading-relaxed ${
            align === "center" ? "max-w-xl mx-auto" : "max-w-xl"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
