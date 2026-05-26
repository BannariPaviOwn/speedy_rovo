"use client";

import { useEffect, useMemo, useState } from "react";
import { SLOT_KIND_OPTIONS, type SlotKind } from "@/lib/types";
import type { ScheduleCell } from "@/lib/mock-schedule";
import { cellFromForm, formDefaultsFromCell } from "@/lib/schedule-cell";

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
  onSave: (payload: { cell: ScheduleCell; tillDate: string }) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<SlotKind>(initialCell.kind);
  const [subtitle, setSubtitle] = useState("");
  const [membershipDetail, setMembershipDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [tillDate, setTillDate] = useState(scheduleDate);
  const [durationMinutes, setDurationMinutes] = useState(60);

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

  useEffect(() => {
    const f = formDefaultsFromCell(initialCell);
    setKind(f.kind);
    setSubtitle(f.subtitle);
    setMembershipDetail(f.membershipDetail);
    setNotes(f.notes);
    const end = initialCell.tillDate ?? scheduleDate;
    setTillDate(end < scheduleDate ? scheduleDate : end);
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
  }, [initialCell, scheduleDate, slotStepMinutes, durationChoices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = () => {
    const cell = cellFromForm(kind, {
      subtitle,
      membershipDetail,
      notes,
    });
    const end =
      tillDate && tillDate >= scheduleDate ? tillDate : scheduleDate;
    const anchor = initialCell.slotAnchorTimeKey ?? anchorTimeKey;
    onSave({
      cell: {
        ...cell,
        tillDate: end,
        durationMinutes,
        slotAnchorTimeKey: anchor,
      },
      tillDate: end,
    });
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
        className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="slot-edit-title"
          className="font-display text-lg font-bold text-[var(--text-primary)]"
        >
          Edit slot
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {courtName} · {timeLabel}
        </p>

        <div className="mt-5 space-y-4">
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
              onChange={(e) => setKind(e.target.value as SlotKind)}
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
                  Membership details
                </label>
                <input
                  id="membership-detail"
                  value={membershipDetail}
                  onChange={(e) => setMembershipDetail(e.target.value)}
                  placeholder="e.g. Gold plan · Member ID #4821"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
                />
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
              Same court and time on each day from {scheduleDate} through this
              date.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-5">
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
            Save slot
          </button>
        </div>
      </div>
    </div>
  );
}
