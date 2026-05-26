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
import type {
  SportCatalogRow,
  VenueMasterRow,
} from "@/lib/venues-server";

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

function defaultCreateSportSlugs(catalog: SportCatalogRow[]): string[] {
  const badminton = catalog.find((s) => s.slug === "badminton");
  if (badminton) {
    return ["badminton"];
  }
  return catalog[0]?.slug ? [catalog[0].slug] : [];
}

function OfferedSportsPicker({
  idPrefix,
  sportsCatalog,
  value,
  onChange,
}: {
  idPrefix: string;
  sportsCatalog: SportCatalogRow[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Sports at this venue
      </p>
      <p className="text-[11px] text-[var(--text-muted)]">
        The schedule can be filtered by sport. Cricket uses 30-minute rows with
        1h / 1.5h / 2h bookings; most other sports use hourly slots.
      </p>
      <div className="flex flex-wrap gap-3">
        {sportsCatalog.map((s) => {
          const checked = value.includes(s.slug);
          return (
            <label
              key={s.id}
              htmlFor={`${idPrefix}-sp-${s.slug}`}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] has-[:checked]:border-[var(--accent)]/40 has-[:checked]:bg-[var(--accent)]/10"
            >
              <input
                id={`${idPrefix}-sp-${s.slug}`}
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border-subtle)]"
                checked={checked}
                onChange={() => {
                  onChange(
                    checked
                      ? value.filter((x) => x !== s.slug)
                      : [...value, s.slug],
                  );
                }}
              />
              {s.name}
            </label>
          );
        })}
      </div>
      {value.map((slug) => (
        <input key={slug} type="hidden" name="sport_slugs" value={slug} />
      ))}
    </div>
  );
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

export function VenuesPageClient({
  rows,
  sportsCatalog,
}: {
  rows: VenueMasterRow[];
  sportsCatalog: SportCatalogRow[];
}) {
  const createFormRef = useRef<HTMLFormElement>(null);
  const [createSports, setCreateSports] = useState<string[]>(() =>
    defaultCreateSportSlugs(sportsCatalog),
  );
  const [editSports, setEditSports] = useState<string[]>([]);
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
  const [editCourtCount, setEditCourtCount] = useState(1);
  const [pendingCourtDeletes, setPendingCourtDeletes] = useState<string[]>(
    [],
  );

  useEffect(() => {
    const v = rows.find((r) => r.id === editingId);
    if (v) {
      setEditCourtCount(v.courtCount);
      setPendingCourtDeletes([]);
    }
  }, [editingId, rows]);

  useEffect(() => {
    if (createState.ok) {
      createFormRef.current?.reset();
      setCreateSports(defaultCreateSportSlugs(sportsCatalog));
    }
  }, [createState.ok, sportsCatalog]);

  useEffect(() => {
    if (updateState.ok) {
      setEditingId(null);
      setEditSports([]);
      setPendingCourtDeletes([]);
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
          Add sports offered at each venue, assign a sport per court, and set
          schedule hours. The live grid filters by sport; cricket-style sports
          support longer session lengths (1h–2h) on a finer time grid.
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
            <OfferedSportsPicker
              idPrefix="new"
              sportsCatalog={sportsCatalog}
              value={createSports}
              onChange={setCreateSports}
            />
            <div className="w-full space-y-2 sm:max-w-xs">
              <label
                htmlFor="new-court-sport"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                Sport for new courts
              </label>
              <select
                id="new-court-sport"
                name="court_sport"
                required
                key={createSports.join(",")}
                defaultValue={createSports[0] ?? ""}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30"
              >
                {sportsCatalog
                  .filter((s) => createSports.includes(s.slug))
                  .map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
              </select>
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
                    <OfferedSportsPicker
                      idPrefix={`edit-${v.id}`}
                      sportsCatalog={sportsCatalog}
                      value={editSports}
                      onChange={setEditSports}
                    />
                    <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Courts · sport · schedule
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Uncheck &quot;On schedule&quot; to hide a court from the
                        live grid (data kept). Remove deletes the court and its
                        slot rows. You can also lower the court count to drop the
                        highest-numbered courts.
                      </p>
                      {pendingCourtDeletes.map((cid) => (
                        <input
                          key={cid}
                          type="hidden"
                          name="deleted_court_id"
                          value={cid}
                        />
                      ))}
                      <ul className="space-y-3">
                        {v.courts
                          .filter((c) => !pendingCourtDeletes.includes(c.id))
                          .map((c) => {
                            const onSchedule =
                              c.isActive && c.status === "active";
                            return (
                              <li
                                key={c.id}
                                className="rounded-lg border border-[var(--border-subtle)]/80 bg-[var(--bg-card)]/50 p-3"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                      {c.label}{" "}
                                      <span className="text-[var(--text-muted)]">
                                        ({c.slug})
                                      </span>
                                    </span>
                                    {!onSchedule ? (
                                      <span className="ml-2 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                                        Off schedule
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--text-muted)]">
                                      <input
                                        type="hidden"
                                        name={`court_on_schedule_${c.id}`}
                                        value="0"
                                      />
                                      <input
                                        type="checkbox"
                                        name={`court_on_schedule_${c.id}`}
                                        value="1"
                                        defaultChecked={onSchedule}
                                        className="h-4 w-4 rounded border-[var(--border-subtle)]"
                                      />
                                      On schedule
                                    </label>
                                    <select
                                      name={`court_sport_${c.id}`}
                                      defaultValue={c.sportId}
                                      className="min-w-[140px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm sm:max-w-[220px]"
                                    >
                                      {sportsCatalog
                                        .filter((s) =>
                                          editSports.includes(s.slug),
                                        )
                                        .map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name}
                                          </option>
                                        ))}
                                    </select>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg border-rose-500/35 text-rose-200 hover:bg-rose-500/10"
                                      disabled={editCourtCount <= 1}
                                      title={
                                        editCourtCount <= 1
                                          ? "Keep at least one court"
                                          : "Delete this court and its slots"
                                      }
                                      onClick={() => {
                                        if (editCourtCount <= 1) {
                                          return;
                                        }
                                        setPendingCourtDeletes((p) => [
                                          ...p,
                                          c.id,
                                        ]);
                                        setEditCourtCount((n) =>
                                          Math.max(1, n - 1),
                                        );
                                      }}
                                    >
                                      <Trash2
                                        className="mr-1 h-3.5 w-3.5"
                                        strokeWidth={2}
                                      />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                      <div className="pt-2">
                        <label
                          htmlFor={`edit-${v.id}-new-court-sport`}
                          className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                        >
                          Sport for newly added courts
                        </label>
                        <select
                          id={`edit-${v.id}-new-court-sport`}
                          name="new_courts_sport"
                          required
                          defaultValue={
                            sportsCatalog.find((s) =>
                              editSports.includes(s.slug),
                            )?.id ?? ""
                          }
                          className="mt-1.5 w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
                        >
                          {sportsCatalog
                            .filter((s) => editSports.includes(s.slug))
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
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
                          value={editCourtCount}
                          onChange={(e) =>
                            setEditCourtCount(
                              Math.min(
                                50,
                                Math.max(1, Number(e.target.value) || 1),
                              ),
                            )
                          }
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
                          onClick={() => {
                            setEditingId(null);
                            setEditSports([]);
                            setPendingCourtDeletes([]);
                          }}
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
                      Increasing the number adds courts. Decreasing it removes
                      the highest-numbered courts (after any marked Remove).
                      At least one court must remain.
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
                          {v.courtCount} court{v.courtCount === 1 ? "" : "s"} (
                          {v.courtsOnScheduleCount} on schedule) ·{" "}
                          {formatVenueWindowLine(
                            v.schedule_start_hour ?? 6,
                            v.schedule_end_hour ?? 22,
                          )}{" "}
                          · {v.status ?? "active"}
                          {v.is_active === false ? " · hidden" : ""} · added{" "}
                          {formatDate(v.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Sports:{" "}
                          {v.offeredSports.length > 0
                            ? v.offeredSports.map((s) => s.name).join(", ")
                            : "—"}
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
                        onClick={() => {
                          setEditSports(v.offeredSports.map((o) => o.slug));
                          setEditCourtCount(v.courtCount);
                          setPendingCourtDeletes([]);
                          setEditingId(v.id);
                        }}
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
