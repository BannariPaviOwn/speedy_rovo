"use client";

import { useState } from "react";
import { ScheduleStatCards } from "@/components/schedule/schedule-stat-cards";
import { ScheduleTop } from "@/components/schedule/schedule-top";
import { ScheduleInteractive } from "@/components/slots/schedule-interactive";
import { startOfDay } from "@/lib/date-helpers";

export function SlotsPageClient() {
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  return (
    <div className="space-y-6 md:space-y-8">
      <ScheduleTop selected={selected} onSelectedChange={setSelected} />

      <ScheduleInteractive selectedDate={selected} />

      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Overview
        </h2>
        <ScheduleStatCards />
      </section>
    </div>
  );
}
