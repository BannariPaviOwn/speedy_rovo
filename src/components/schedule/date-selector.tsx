"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addDays,
  eachDay,
  isSameDay,
  startOfDay,
} from "@/lib/date-helpers";

type DateSelectorProps = {
  /** Number of days to show in the strip. */
  dayCount?: number;
  /** Controlled selected day (midnight). Omit for uncontrolled. */
  value?: Date;
  /** Called when the user picks a day or when the range shifts and selection is clamped. */
  onChange?: (date: Date) => void;
  className?: string;
};

export function DateSelector({
  dayCount = 14,
  value: valueProp,
  onChange,
  className = "",
}: DateSelectorProps) {
  const [rangeStart, setRangeStart] = useState(() =>
    valueProp !== undefined ? startOfDay(valueProp) : startOfDay(new Date()),
  );
  const [uncontrolled, setUncontrolled] = useState(() => startOfDay(new Date()));

  const selected = valueProp !== undefined ? startOfDay(valueProp) : uncontrolled;

  const days = useMemo(
    () => eachDay(rangeStart, dayCount),
    [rangeStart, dayCount],
  );

  const setSelected = useCallback(
    (d: Date) => {
      const next = startOfDay(d);
      if (valueProp === undefined) {
        setUncontrolled(next);
      }
      onChange?.(next);
    },
    [valueProp, onChange],
  );

  const shiftRange = useCallback(
    (direction: -1 | 1) => {
      setRangeStart((current) => addDays(current, direction * dayCount));
    },
    [dayCount],
  );

  /** After moving the window, keep the highlighted day inside the visible strip. */
  useEffect(() => {
    const first = startOfDay(rangeStart);
    const last = startOfDay(addDays(rangeStart, dayCount - 1));
    const sel = startOfDay(selected);
    if (sel.getTime() < first.getTime() || sel.getTime() > last.getTime()) {
      setSelected(first);
    }
  }, [rangeStart, dayCount, selected, setSelected]);

  return (
    <div
      className={[
        "flex items-stretch gap-2 md:gap-3",
        className,
      ].join(" ")}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-auto min-h-[4.25rem] shrink-0 rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 text-[var(--text-primary)] hover:bg-white/[0.06] md:min-h-[4.75rem]"
        onClick={() => shiftRange(-1)}
        aria-label="Show earlier dates"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2} />
      </Button>

      <div
        className={[
          "min-w-0 flex-1",
          "-mx-1 px-1",
          "scrollbar-thin flex gap-2 overflow-x-auto overflow-y-visible py-1",
          "snap-x snap-mandatory scroll-pl-2 scroll-pr-2 md:scroll-pl-0 md:scroll-pr-0",
          "[&::-webkit-scrollbar]:h-1.5",
        ].join(" ")}
        role="tablist"
        aria-label="Select date"
      >
        {days.map((d) => {
          const active = isSameDay(d, selected);
          const dayLabel = d
            .toLocaleDateString("en-US", { weekday: "short" })
            .toUpperCase();
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
                  active
                    ? "text-[var(--accent-foreground)]/90"
                    : "text-[var(--text-muted)]",
                ].join(" ")}
              >
                {dayLabel}
              </span>
              <span
                className={[
                  "mt-0.5 block text-lg font-bold tabular-nums leading-none md:text-xl",
                  active
                    ? "text-[var(--accent-foreground)]"
                    : "text-[var(--text-primary)]",
                ].join(" ")}
              >
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-auto min-h-[4.25rem] shrink-0 rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 text-[var(--text-primary)] hover:bg-white/[0.06] md:min-h-[4.75rem]"
        onClick={() => shiftRange(1)}
        aria-label="Show later dates"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2} />
      </Button>
    </div>
  );
}
