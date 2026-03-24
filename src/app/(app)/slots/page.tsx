import { ScheduleInteractive } from "@/components/slots/schedule-interactive";
import { ScheduleStatCards } from "@/components/schedule/schedule-stat-cards";
import { ScheduleTop } from "@/components/schedule/schedule-top";

export default function SlotsPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <ScheduleTop />

      <ScheduleInteractive />

      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Overview
        </h2>
        <ScheduleStatCards />
      </section>
    </div>
  );
}
