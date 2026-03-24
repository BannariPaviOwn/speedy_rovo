import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";

export function ScheduleStatCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Court utilization
          </p>
          <span className="rounded-lg bg-[var(--accent-dim)] p-2 text-[var(--accent)]">
            <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
          </span>
        </div>
        <p className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
          84%
        </p>
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
          <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--accent-dim)] px-1.5 py-0.5">
            <TrendingUp className="h-3 w-3" />
            +12%
          </span>
          <span className="text-[var(--text-muted)]">vs yesterday</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full w-[84%] rounded-full bg-[var(--accent)]"
            style={{ boxShadow: "0 0 12px rgba(193,255,0,0.35)" }}
          />
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Active bookings
          </p>
          <span className="rounded-lg bg-[var(--accent-dim)] p-2 text-[var(--accent)]">
            <Users className="h-4 w-4" strokeWidth={1.75} />
          </span>
        </div>
        <p className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
          42
        </p>
        <p className="text-xs text-[var(--text-muted)]">Today&apos;s total</p>
        <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-white/[0.06]">
          {[35, 28, 22, 15].map((w, i) => (
            <div
              key={i}
              className="h-full bg-[var(--accent)]/85"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Revenue (est.)
          </p>
          <span className="rounded-lg bg-[var(--accent-dim)] p-2 text-[var(--accent)]">
            <DollarSign className="h-4 w-4" strokeWidth={1.75} />
          </span>
        </div>
        <p className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] md:text-4xl">
          $1,280
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-[var(--accent)]">+5%</span>
          <span className="text-[var(--text-muted)]">from morning · next payout Fri</span>
        </div>
      </div>
    </div>
  );
}
