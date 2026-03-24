"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function ScheduleToolbar() {
  const [view, setView] = useState<"day" | "week">("day");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
        <button
          type="button"
          onClick={() => setView("day")}
          className={[
            "rounded-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm",
            view === "day"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          ].join(" ")}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => setView("week")}
          className={[
            "rounded-lg px-4 py-2 text-xs font-semibold transition-colors md:text-sm",
            view === "week"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          ].join(" ")}
        >
          Week
        </button>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent)] md:text-sm"
      >
        <Download className="h-4 w-4" strokeWidth={1.75} />
        Export
      </button>
    </div>
  );
}
