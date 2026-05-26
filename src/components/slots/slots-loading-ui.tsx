/** Shared skeletons for /slots route and dynamic imports (keeps initial compile small). */
export function ScheduleInteractiveSkeleton() {
  return (
    <div
      className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"
      aria-busy="true"
      aria-label="Loading schedule grid"
    >
      <div className="h-10 max-w-md animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="h-4 w-64 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-4 h-[min(50vh,420px)] animate-pulse rounded-xl bg-white/[0.04]" />
    </div>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]"
        />
      ))}
    </div>
  );
}

export function SlotsPageSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-72 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
      </div>
      <ScheduleInteractiveSkeleton />
      <section className="space-y-3 pt-2">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        <StatCardsSkeleton />
      </section>
    </div>
  );
}
