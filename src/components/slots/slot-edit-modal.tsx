"use client";

import { useEffect, useState } from "react";
import { SLOT_KIND_OPTIONS, type SlotKind } from "@/lib/types";
import type { ScheduleCell } from "@/lib/mock-schedule";
import { cellFromForm, formDefaultsFromCell } from "@/lib/schedule-cell";

export function SlotEditModal({
  courtName,
  timeLabel,
  initialCell,
  onSave,
  onClose,
}: {
  courtName: string;
  timeLabel: string;
  initialCell: ScheduleCell;
  onSave: (cell: ScheduleCell) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<SlotKind>(initialCell.kind);
  const [subtitle, setSubtitle] = useState("");
  const [membershipDetail, setMembershipDetail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const f = formDefaultsFromCell(initialCell);
    setKind(f.kind);
    setSubtitle(f.subtitle);
    setMembershipDetail(f.membershipDetail);
    setNotes(f.notes);
  }, [initialCell]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = () => {
    onSave(
      cellFromForm(kind, {
        subtitle,
        membershipDetail,
        notes,
      }),
    );
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
                    : "Short line shown on the cell"
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
          ) : null}
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
