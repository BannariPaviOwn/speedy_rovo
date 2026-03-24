"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createVenueAction,
  deleteVenueAction,
  updateVenueAction,
} from "@/app/(app)/venues/actions";
import { initialVenueActionState } from "@/app/(app)/venues/types";
import { ROW_STATUSES } from "@/lib/db/row-lifecycle";
import type { VenueMasterRow } from "@/lib/venues-server";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const HOURS_START = Array.from({ length: 24 }, (_, i) => i);
const HOURS_END = Array.from({ length: 24 }, (_, i) => i + 1);

function VenueSlotWindowFields({
  idPrefix,
  defaultStart,
  defaultEnd,
}: {
  idPrefix: string;
  defaultStart: number;
  defaultEnd: number;
}) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <label
          htmlFor={`${idPrefix}-start`}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
        >
          First slot hour (24h)
        </label>
        <select
          id={`${idPrefix}-start`}
          name="schedule_start_hour"
          defaultValue={defaultStart}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
        >
          {HOURS_START.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label
          htmlFor={`${idPrefix}-end`}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
        >
          End hour (exclusive)
        </label>
        <select
          id={`${idPrefix}-end`}
          name="schedule_end_hour"
          defaultValue={defaultEnd}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
        >
          {HOURS_END.map((h) => (
            <option key={h} value={h}>
              {h === 24 ? "24:00 (midnight)" : `${String(h).padStart(2, "0")}:00`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function formatVenueWindowLine(start: number, end: number) {
  return `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`;
}

function VenueLifecycleFields({
  idPrefix,
  defaultStatus,
  defaultIsActive,
}: {
  idPrefix: string;
  defaultStatus: string;
  defaultIsActive: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[160px] space-y-2">
        <label
          htmlFor={`${idPrefix}-status`}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
        >
          Status
        </label>
        <select
          id={`${idPrefix}-status`}
          name="status"
          required
          defaultValue={defaultStatus}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
        >
          {ROW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <label className="flex cursor-pointer items-center gap-2 pt-2 sm:pt-6">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={defaultIsActive}
          className="h-4 w-4 rounded border-[var(--border-subtle)]"
        />
        <span className="text-sm text-[var(--text-primary)]">
          Active (show on schedule and staff lists)
        </span>
      </label>
    </div>
  );
}

export function VenuesPageClient({ rows }: { rows: VenueMasterRow[] }) {
  const createFormRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, createPending] = useActionState(
    createVenueAction,
    initialVenueActionState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateVenueAction,
    initialVenueActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteVenueAction,
    initialVenueActionState,
  );

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (createState.ok) {
      createFormRef.current?.reset();
    }
  }, [createState.ok]);

  useEffect(() => {
    if (updateState.ok) {
      setEditingId(null);
    }
  }, [updateState.ok]);

  const actionError =
    createState.error ?? updateState.error ?? deleteState.error;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
          Venues
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Create each venue with how many courts it has and which hours appear on
          the schedule. Slot rows follow that window (hourly, end time exclusive);
          admins only see their venue&apos;s courts and hours.
        </p>
      </div>

      {actionError ? (
        <p
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Add venue
        </h2>
        <form
          ref={createFormRef}
          action={createAction}
          className="mt-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[200px] flex-1 space-y-2">
              <label
                htmlFor="new-name"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Name
              </label>
              <input
                id="new-name"
                name="name"
                required
                placeholder="e.g. Main arena"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div className="min-w-[120px] space-y-2">
              <label
                htmlFor="new-courts"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Courts
              </label>
              <input
                id="new-courts"
                name="court_count"
                type="number"
                min={1}
                max={50}
                defaultValue={5}
                required
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div className="min-w-[160px] flex-1 space-y-2">
              <label
                htmlFor="new-city"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                City (optional)
              </label>
              <input
                id="new-city"
                name="city"
                placeholder="Bengaluru"
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              />
            </div>
            <Button
              type="submit"
              disabled={createPending}
              className="rounded-xl bg-[var(--accent)] px-6 py-5 text-sm font-bold text-[var(--accent-foreground)] hover:brightness-105 disabled:opacity-60"
            >
              {createPending ? "Saving…" : "Add venue"}
            </Button>
          </div>
          <VenueSlotWindowFields
            idPrefix="new"
            defaultStart={18}
            defaultEnd={22}
          />
          <VenueLifecycleFields
            idPrefix="new"
            defaultStatus="active"
            defaultIsActive
          />
          <p className="text-xs text-[var(--text-muted)]">
            Example: 18:00 and 22:00 gives hourly slots 18:00–21:00 (6–10 PM). The
            end hour is exclusive, same as before.
          </p>
        </form>
      </section>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          All venues ({rows.length})
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--text-muted)]">
            No venues yet. Add one above.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {rows.map((v) => (
              <li key={v.id} className="px-4 py-4">
                {editingId === v.id ? (
                  <form
                    key={v.id}
                    action={updateAction}
                    className="flex flex-col gap-4"
                  >
                    <input type="hidden" name="id" value={v.id} />
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="min-w-[180px] flex-1 space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Name
                        </label>
                        <input
                          name="name"
                          required
                          defaultValue={v.name}
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="min-w-[100px] space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Courts
                        </label>
                        <input
                          name="court_count"
                          type="number"
                          min={1}
                          max={50}
                          required
                          defaultValue={v.courtCount}
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="min-w-[140px] flex-1 space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          City
                        </label>
                        <input
                          name="city"
                          defaultValue={v.city ?? ""}
                          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={updatePending}
                          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-foreground)]"
                        >
                          {updatePending ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                    <VenueSlotWindowFields
                      idPrefix={`edit-${v.id}`}
                      defaultStart={v.schedule_start_hour ?? 6}
                      defaultEnd={v.schedule_end_hour ?? 22}
                    />
                    <VenueLifecycleFields
                      idPrefix={`edit-${v.id}`}
                      defaultStatus={v.status ?? "active"}
                      defaultIsActive={v.is_active !== false}
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                      Lowering the court count removes the extra courts and their
                      slot rows (cascade).
                    </p>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
                        <MapPin className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-display text-lg font-bold text-[var(--text-primary)]">
                          {v.name}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {v.city ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {v.courtCount} court{v.courtCount === 1 ? "" : "s"} ·{" "}
                          {formatVenueWindowLine(
                            v.schedule_start_hour ?? 6,
                            v.schedule_end_hour ?? 22,
                          )}{" "}
                          · {v.status ?? "active"}
                          {v.is_active === false ? " · hidden" : ""} · added{" "}
                          {formatDate(v.created_at)}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {!v.createdByUsername && !v.updatedByUsername ? (
                            "Audit: —"
                          ) : (
                            <>
                              {v.createdByUsername ? (
                                <>
                                  Created by{" "}
                                  <span className="font-medium text-[var(--text-primary)]">
                                    {v.createdByUsername}
                                  </span>
                                </>
                              ) : null}
                              {v.createdByUsername && v.updatedByUsername
                                ? " · "
                                : null}
                              {v.updatedByUsername ? (
                                <>
                                  Last updated by{" "}
                                  <span className="font-medium text-[var(--text-primary)]">
                                    {v.updatedByUsername}
                                  </span>
                                </>
                              ) : null}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => setEditingId(v.id)}
                      >
                        <Pencil className="mr-1.5 h-4 w-4" />
                        Edit
                      </Button>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={v.id} />
                        <Button
                          type="submit"
                          variant="destructive"
                          size="sm"
                          disabled={deletePending}
                          className="rounded-xl"
                          onClick={(e) => {
                            if (
                              !confirm(
                                `Delete "${v.name}"? This removes all courts and slot data for this venue.`,
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
