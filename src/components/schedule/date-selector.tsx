"use client";

import { useMemo, useState } from "react";
import { eachDay, isSameDay, startOfDay } from "@/lib/date-helpers";

type DateSelectorProps = {
  /** Number of days to show (scroll horizontally when needed). */
  dayCount?: number;
  /** Controlled selected day (midnight). Omit for uncontrolled. */
  value?: Date;
  /** Called when the user picks a day. */
  onChange?: (date: Date) => void;
  className?: string;
};

export function DateSelector({
  dayCount = 14,
  value: valueProp,
  onChange,
  className = "",
}: DateSelectorProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(() => eachDay(today, dayCount), [today, dayCount]);

  const [uncontrolled, setUncontrolled] = useState(() => today);
  const selected = valueProp !== undefined ? startOfDay(valueProp) : uncontrolled;

  const setSelected = (d: Date) => {
    const next = startOfDay(d);
    if (valueProp === undefined) {
      setUncontrolled(next);
    }
    onChange?.(next);
  };

  return (
    <div
      className={[
        "-mx-1 px-1",
        "scrollbar-thin flex gap-2 overflow-x-auto overflow-y-visible py-1",
        "snap-x snap-mandatory scroll-pl-2 scroll-pr-2 md:scroll-pl-0 md:scroll-pr-0",
        "[&::-webkit-scrollbar]:h-1.5",
        className,
      ].join(" ")}
      role="tablist"
      aria-label="Select date"
    >
      {days.map((d) => {
        const active = isSameDay(d, selected);
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
        const dayNum = d.getDate();

        return (
          <button
            key={d.toISOString()}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setSelected(d)}
            className={[
              "snap-start shrink-0 rounded-2xl px-3 py-2.5 text-center transition-all md:min-w-[3.75rem] md:px-4 md:py-3",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
              active
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/20"
                : "bg-[#222834] text-[var(--text-primary)] hover:bg-white/[0.06]",
            ].join(" ")}
          >
            <span
              className={[
                "block text-[10px] font-semibold uppercase tracking-wide md:text-[11px]",
                active ? "text-[var(--accent-foreground)]/90" : "text-[var(--text-muted)]",
              ].join(" ")}
            >
              {dayLabel}
            </span>
            <span
              className={[
                "mt-0.5 block text-lg font-bold tabular-nums leading-none md:text-xl",
                active ? "text-[var(--accent-foreground)]" : "text-[var(--text-primary)]",
              ].join(" ")}
            >
              {dayNum}
            </span>
          </button>
        );
      })}
    </div>
  );
}
