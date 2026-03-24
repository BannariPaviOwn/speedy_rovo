"use client";

import { DateSelector } from "@/components/schedule/date-selector";
import { ScheduleToolbar } from "@/components/schedule/schedule-toolbar";
import { isBeforeToday, isSameDay, startOfDay } from "@/lib/date-helpers";

type ScheduleTopProps = {
  selected: Date;
  onSelectedChange: (d: Date) => void;
};

export function ScheduleTop({ selected, onSelectedChange }: ScheduleTopProps) {
  const today = startOfDay(new Date());

  const dateLine = selected.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const todayLabel = isSameDay(selected, today);
  const pastDay = isBeforeToday(selected);

  return (
    <div className="space-y-5 border-b border-[var(--border-subtle)] pb-6 md:space-y-6 md:pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl lg:text-4xl">
            Court schedule
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)] md:text-base">
            {dateLine}
            {todayLabel ? (
              <span className="text-[var(--accent)]"> · Today</span>
            ) : null}
            {pastDay ? (
              <span className="text-sky-400/90"> · View only</span>
            ) : null}
          </p>
        </div>
        <ScheduleToolbar />
      </div>

      <DateSelector value={selected} onChange={onSelectedChange} />
    </div>
  );
}
