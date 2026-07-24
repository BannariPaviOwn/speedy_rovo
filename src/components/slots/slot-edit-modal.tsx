"use client";

import { useEffect, useMemo, useState } from "react";
import { makeSlotKey } from "@/lib/db/mappers";
import type { CourtInfo, ScheduleCell } from "@/lib/mock-schedule";
import { shouldShowIncludeWeekendsOption } from "@/lib/date-helpers";
import {
  cellFromForm,
  formDefaultsFromCell,
  isBlankMembershipDetail,
} from "@/lib/schedule-cell";
import {
  courtHasSlotConflictAtTime,
  formatSlotEditHeader,
} from "@/lib/schedule-slot-conflict";
import { SLOT_KIND_OPTIONS, type SlotKind } from "@/lib/types";

function shouldShowWeekendOptionForKind(kind: SlotKind): boolean {
  return (
    kind === "available" ||
    kind === "booked" ||
    kind === "coaching" ||
    kind === "cancelled" ||
    kind === "reserved" ||
    kind === "membership" ||
    kind === "maintenance" ||
    kind === "blocked"
  );
}

function normalizeDateValue(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (!dmy) {
    return null;
  }

  const [, day, month, year] = dmy;
  return `${year}-${month}-${day}`;
}

function formatDurationLabel(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 60) {
    const h = minutes / 60;
    return h === 1 ? "1 hour" : `${h} hours`;
  }
  if (minutes === 90) {
    return "1.5 hours";
  }
  return `${minutes} min`;
}

export function SlotEditModal({
  courtName,
  anchorCourtSlug,
  courts,
  cells,
  timeLabel,
  scheduleDate,
  initialCell,
  anchorTimeKey,
  slotStepMinutes = 60,
  durationOptionsMinutes = [60],
  onSave,
  onClose,
}: {
  courtName: string;
  /** Slug of the court cell that was clicked (always included in save). */
  anchorCourtSlug: string;
  /** All courts on the current venue/sport grid. */
  courts: CourtInfo[];
  /** Live grid cells for conflict hints at `anchorTimeKey`. */
  cells: Map<string, ScheduleCell>;
  timeLabel: string;
  /** Current grid date `YYYY-MM-DD` (minimum for “apply through”). */
  scheduleDate: string;
  initialCell: ScheduleCell;
  /** DB row start key (`HH:MM`) when editing a multi-row booking. */
  anchorTimeKey: string;
  /** Grid row step for this sport (30 or 60). */
  slotStepMinutes?: number;
  /** Allowed booking lengths in minutes (e.g. 60, 90, 120 for cricket). */
  durationOptionsMinutes?: number[];
  onSave: (payload: {
    cell: ScheduleCell;
    tillDate: string;
    includeWeekends?: boolean;
    courtSlugs: string[];
  }) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<SlotKind>(initialCell.kind);
  const [subtitle, setSubtitle] = useState("");
  const [membershipDetail, setMembershipDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [tillDate, setTillDate] = useState(scheduleDate);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedCourtSlugs, setSelectedCourtSlugs] = useState<Set<string>>(
    () => new Set([anchorCourtSlug]),
  );

  useEffect(() => {
    setSelectedCourtSlugs(new Set([anchorCourtSlug]));
  }, [anchorCourtSlug, anchorTimeKey]);

  const selectedCount = selectedCourtSlugs.size;
  const headerLine = formatSlotEditHeader(courtName, selectedCount, timeLabel);
  const multiCourt = courts.length > 1;

  const conflictBySlug = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const court of courts) {
      m.set(
        court.id,
        courtHasSlotConflictAtTime(cells, court.id, anchorTimeKey),
      );
    }
    return m;
  }, [courts, cells, anchorTimeKey]);

  const selectedWithConflict = useMemo(
    () =>
      [...selectedCourtSlugs].filter((slug) => conflictBySlug.get(slug)),
    [selectedCourtSlugs, conflictBySlug],
  );

  const durationChoices = useMemo(() => {
    const raw =
      durationOptionsMinutes.length > 0
        ? durationOptionsMinutes
        : [slotStepMinutes];
    const step = slotStepMinutes > 0 ? slotStepMinutes : 60;
    const out = [...new Set(raw)]
      .filter((m) => Number.isFinite(m) && m >= step && m % step === 0)
      .sort((a, b) => a - b);
    return out.length > 0 ? out : [step];
  }, [durationOptionsMinutes, slotStepMinutes]);

  const showDuration = durationChoices.length > 1;

  const normalizedTill = normalizeDateValue(tillDate);
  const effectiveTill =
    normalizedTill && normalizedTill >= scheduleDate
      ? normalizedTill
      : scheduleDate;

  const statusAllowsWeekendOption = shouldShowWeekendOptionForKind(kind);
  const showWeekendOption =
    statusAllowsWeekendOption &&
    shouldShowIncludeWeekendsOption(scheduleDate, effectiveTill);

  useEffect(() => {
    const f = formDefaultsFromCell(initialCell);
    setKind(f.kind);
    setSubtitle(f.subtitle);
    setMembershipDetail(f.membershipDetail);
    setNotes(f.notes);
    setFormError(null);
    const end = initialCell.tillDate ?? scheduleDate;
    setTillDate(end < scheduleDate ? scheduleDate : end);
  }, [initialCell, scheduleDate]);

  useEffect(() => {
    const step = slotStepMinutes > 0 ? slotStepMinutes : 60;
    const fromCell =
      typeof initialCell.durationMinutes === "number" &&
      initialCell.durationMinutes >= step &&
      initialCell.durationMinutes % step === 0
        ? initialCell.durationMinutes
        : null;
    const pick =
      fromCell && durationChoices.includes(fromCell)
        ? fromCell
        : (durationChoices[0] ?? step);
    setDurationMinutes(pick);
  }, [initialCell, slotStepMinutes, durationChoices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = () => {
    if (kind === "membership" && isBlankMembershipDetail(membershipDetail)) {
      setFormError(
        "Enter membership details (plan, member name, or ID). A dash alone is not enough.",
      );
      return;
    }
    setFormError(null);
    const cell = cellFromForm(kind, {
      subtitle,
      membershipDetail,
      notes,
    });
    const normalizedEnd = normalizeDateValue(tillDate);
    const end =
      normalizedEnd && normalizedEnd >= scheduleDate
        ? normalizedEnd
        : scheduleDate;
    const anchor = initialCell.slotAnchorTimeKey ?? anchorTimeKey;
    const courtSlugs = [...selectedCourtSlugs];
    if (!courtSlugs.includes(anchorCourtSlug)) {
      courtSlugs.unshift(anchorCourtSlug);
    }
    onSave({
      cell: {
        ...cell,
        tillDate: end,
        durationMinutes,
        slotAnchorTimeKey: anchor,
      },
      tillDate: end,
      includeWeekends: showWeekendOption ? includeWeekends : true,
      courtSlugs,
    });
  };

  const toggleCourt = (slug: string) => {
    if (slug === anchorCourtSlug) {
      return;
    }
    setSelectedCourtSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      next.add(anchorCourtSlug);
      return next;
    });
  };

  const selectAllCourts = () => {
    setSelectedCourtSlugs(new Set(courts.map((c) => c.id)));
  };

  const clearExtraCourts = () => {
    setSelectedCourtSlugs(new Set([anchorCourtSlug]));
  };

  const showDetailLine =
    kind !== "available" && kind !== "membership";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl sm:max-h-[90dvh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
          <h2
            id="slot-edit-title"
            className="font-display text-lg font-bold text-[var(--text-primary)]"
          >
            Edit slot
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{headerLine}</p>
        </div>

        <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 sm:px-6">
          {multiCourt ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Also apply to courts
                </span>
                <span className="flex gap-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={selectAllCourts}
                    className="text-[var(--accent)] transition hover:brightness-110"
                  >
                    Select all
                  </button>
                  <span className="text-[var(--text-muted)]">·</span>
                  <button
                    type="button"
                    onClick={clearExtraCourts}
                    className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                  >
                    Clear
                  </button>
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                Same status and details at {timeLabel} on each selected court.
              </p>
              <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                {courts.map((court) => {
                  const checked = selectedCourtSlugs.has(court.id);
                  const isAnchor = court.id === anchorCourtSlug;
                  const conflict = conflictBySlug.get(court.id) ?? false;
                  const existing = cells.get(
                    makeSlotKey(court.id, anchorTimeKey),
                  );
                  const existingKind = existing?.kind;
                  return (
                    <li key={court.id}>
                      <label
                        className={[
                          "flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-0.5",
                          isAnchor ? "cursor-default opacity-90" : "",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAnchor}
                          onChange={() => toggleCourt(court.id)}
                          className="mt-0.5 size-4 shrink-0 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--accent)] focus:ring-[var(--accent)]/30 disabled:opacity-70"
                        />
                        <span className="min-w-0 flex-1 text-sm text-[var(--text-primary)]">
                          <span className="font-medium">{court.name}</span>
                          {isAnchor ? (
                            <span className="ml-1.5 text-[11px] font-normal text-[var(--text-muted)]">
                              (clicked)
                            </span>
                          ) : null}
                          {conflict ? (
                            <span className="mt-0.5 block text-[11px] text-amber-200/90">
                              Part of another session at this time — will be
                              skipped on save.
                            </span>
                          ) : existingKind &&
                            existingKind !== "blocked" &&
                            existingKind !== kind ? (
                            <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                              Currently {existingKind} — will be overwritten.
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {selectedWithConflict.length > 0 ? (
                <p className="mt-2 text-[11px] leading-snug text-amber-200/90">
                  {selectedWithConflict.length} selected court
                  {selectedWithConflict.length === 1 ? "" : "s"} overlap another
                  booking and will not be updated.
                </p>
              ) : null}
            </div>
          ) : null}
          {showDuration ? (
            <div>
              <label
                htmlFor="slot-duration"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                Session length
              </label>
              <select
                id="slot-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
              >
                {durationChoices.map((m) => (
                  <option key={m} value={m}>
                    {formatDurationLabel(m)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Applies from {anchorTimeKey} for this court (same slot step as
                the grid).
              </p>
            </div>
          ) : null}
          <div>
            <label
              htmlFor="slot-status"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Status
            </label>
            <select
              id="slot-status"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as SlotKind);
                setFormError(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
            >
              {SLOT_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {kind === "membership" ? (
            <>
              <div>
                <label
                  htmlFor="membership-detail"
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Membership details{" "}
                  <span className="normal-case tracking-normal text-rose-300/90">
                    (required)
                  </span>
                </label>
                <input
                  id="membership-detail"
                  value={membershipDetail}
                  onChange={(e) => {
                    setMembershipDetail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="e.g. Gold plan · Member ID #4821"
                  aria-invalid={Boolean(formError)}
                  aria-describedby={
                    formError ? "membership-detail-error" : undefined
                  }
                  className={[
                    "mt-1.5 w-full rounded-xl border bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-1",
                    formError
                      ? "border-rose-400/60 focus:border-rose-400/70 focus:ring-rose-400/25"
                      : "border-[var(--border-subtle)] focus:border-[var(--accent)]/50 focus:ring-[var(--accent)]/30",
                  ].join(" ")}
                />
                {formError ? (
                  <p
                    id="membership-detail-error"
                    className="mt-1.5 text-[11px] leading-snug text-rose-200/95"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                    Plan, member name, or ID shown on the grid. A lone “-” is not
                    saved.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="membership-notes"
                  className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Short notes
                </label>
                <textarea
                  id="membership-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal note (visible on grid when space allows)"
                  rows={3}
                  maxLength={200}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
                />
                <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
                  {notes.length}/200
                </p>
              </div>
            </>
          ) : null}

          {showDetailLine ? (
            <div>
              <label
                htmlFor="slot-subtitle"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
              >
                Description
              </label>
              <input
                id="slot-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={
                  kind === "booked"
                    ? "e.g. Chen Long (Training)"
                    : kind === "coaching"
                      ? "e.g. Coach Anil · 4 players"
                      : kind === "cancelled"
                        ? "e.g. Player withdrew · refund pending"
                        : "Short line shown on the cell"
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
          ) : null}

          <div>
            <label
              htmlFor="slot-till-date"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Apply through (inclusive)
            </label>
            <input
              id="slot-till-date"
              type="date"
              min={scheduleDate}
              value={tillDate}
              onChange={(e) => setTillDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
            />
            <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
              {selectedCount > 1
                ? `Same time on ${selectedCount} courts, each day from ${scheduleDate} through this date.`
                : `Same court and time on each day from ${scheduleDate} through this date.`}
              {showWeekendOption
                ? " Range is longer than one week and includes weekend days."
                : null}
              {showWeekendOption && !includeWeekends
                ? " Repeats on weekdays (Mon–Fri) only; weekends are skipped."
                : null}
            </p>
          </div>

          {showWeekendOption ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-3 py-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  id="slot-include-weekends"
                  type="checkbox"
                  checked={includeWeekends}
                  onChange={(e) => setIncludeWeekends(e.target.checked)}
                  aria-describedby="slot-include-weekends-hint"
                  className="mt-0.5 size-4 shrink-0 rounded border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--accent)] focus:ring-[var(--accent)]/30"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  Include weekends
                </span>
              </label>
              <p
                id="slot-include-weekends-hint"
                className="mt-1.5 pl-[1.625rem] text-[11px] leading-snug text-[var(--text-muted)]"
              >
                {includeWeekends
                  ? "Applies every calendar day in the range, including Saturdays and Sundays."
                  : "Applies weekdays only; Saturdays and Sundays in this range are skipped."}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/15 transition hover:brightness-105"
          >
            {selectedCount > 1
              ? `Save ${selectedCount} courts`
              : "Save slot"}
          </button>
        </div>
      </div>
    </div>
  );
}
