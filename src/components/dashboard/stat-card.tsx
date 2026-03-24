import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
      <p className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
