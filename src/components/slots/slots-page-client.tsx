"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ScheduleTop } from "@/components/schedule/schedule-top";
import {
  ScheduleInteractiveSkeleton,
  StatCardsSkeleton,
} from "@/components/slots/slots-loading-ui";
import { startOfDay } from "@/lib/date-helpers";

const ScheduleInteractive = dynamic(
  () =>
    import("@/components/slots/schedule-interactive").then((m) => ({
      default: m.ScheduleInteractive,
    })),
  {
    ssr: false,
    loading: () => <ScheduleInteractiveSkeleton />,
  },
);

const ScheduleStatCards = dynamic(
  () =>
    import("@/components/schedule/schedule-stat-cards").then((m) => ({
      default: m.ScheduleStatCards,
    })),
  {
    ssr: false,
    loading: () => <StatCardsSkeleton />,
  },
);

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
