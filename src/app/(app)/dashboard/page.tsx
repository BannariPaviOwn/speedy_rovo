import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, Grid3X3 } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { mockWeekSummary } from "@/lib/mock-slots";
import { mockCourts } from "@/lib/mock-schedule";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            <Grid3X3 className="h-3.5 w-3.5" />
            Operations
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[var(--text-primary)] md:text-4xl">
            Dashboard
          </h1>
          <p className="text-base leading-relaxed text-[var(--text-muted)]">
            High-level view of courts and bookings. Open Schedule for the full
            time × court grid with live-style status cards.
          </p>
        </div>
        <Link
          href="/slots"
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/15 transition hover:brightness-105"
        >
          Open schedule
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Courts live"
          value={String(mockCourts.length)}
          hint="Venue capacity — wire to API."
          icon={Grid3X3}
        />
        <StatCard
          title="Slots (week)"
          value={String(mockWeekSummary.totalSlots)}
          hint="Placeholder metric."
          icon={CalendarClock}
        />
        <StatCard
          title="Check-ins"
          value={String(mockWeekSummary.bookedPlayers)}
          hint="Placeholder metric."
          icon={BarChart3}
        />
        <StatCard
          title="Peak window"
          value={mockWeekSummary.peakHour}
          hint="From analytics later."
          icon={CalendarClock}
        />
      </section>

      <section className="glass-panel rounded-2xl border border-[var(--border-subtle)] p-6 md:p-8">
        <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
          Schedule at a glance
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
          The schedule page matches the elite admin layout: legend, hourly rows,
          court columns, and booking blocks for booked / reserved / maintenance
          / available.
        </p>
        <Link
          href="/slots"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Go to court schedule
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
