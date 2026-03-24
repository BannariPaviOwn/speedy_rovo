"use client";

import { useState } from "react";
import { DateSelector } from "@/components/schedule/date-selector";
import { ScheduleToolbar } from "@/components/schedule/schedule-toolbar";
import { isSameDay, startOfDay } from "@/lib/date-helpers";

export function ScheduleTop() {
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const dateLine = selected.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const todayLabel = isSameDay(selected, today);

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
          </p>
        </div>
        <ScheduleToolbar />
      </div>

      <DateSelector value={selected} onChange={setSelected} />
    </div>
  );
}
