"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveSlotEditorUsernames } from "@/app/(app)/slots/actions";
import { ScheduleGrid } from "@/components/slots/schedule-grid";
import { SlotEditModal } from "@/components/slots/slot-edit-modal";
import { useRole } from "@/components/providers/role-provider";
import { createClient } from "@/lib/client";
import { isBeforeToday, toLocalDateString } from "@/lib/date-helpers";
import { parseSlotKey } from "@/lib/db/mappers";
import {
  fetchCourtSlugToIdMap,
  fetchCourtsForSchedule,
  loadScheduleForDate,
  type CourtsScheduleFilter,
  upsertSlotEntry,
} from "@/lib/db/schedule-queries";
import { formatSupabaseError } from "@/lib/db/supabase-errors";
import {
  fetchVenueScheduleWindow,
  fetchVenuesList,
} from "@/lib/db/venue-queries";
import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
} from "@/lib/schedule-config";
import type { CourtInfo, ScheduleCell } from "@/lib/mock-schedule";

type ScheduleInteractiveProps = {
  selectedDate: Date;
};

/** Venue list for schedule (superadmin + admin can browse any active venue). */
type ScheduleVenuesState =
  | { status: "inactive" }
  | { status: "loading" }
  | { status: "ready"; venues: { id: string; name: string }[] };

export function ScheduleInteractive({ selectedDate }: ScheduleInteractiveProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const {
    session,
    user,
    role,
    venueId: staffVenueId,
    loading: authLoading,
  } = useRole();
  const isStaff = role === "admin" || role === "superadmin";

  const [courts, setCourts] = useState<CourtInfo[]>([]);
  const [cells, setCells] = useState<Map<string, ScheduleCell>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [usingRemote, setUsingRemote] = useState(false);

  useEffect(() => {
    try {
      setSupabase(createClient());
    } catch {
      setError(
        "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (e.g. in Vercel environment variables).",
      );
      setLoading(false);
    }
  }, []);

  const [scheduleVenues, setScheduleVenues] =
    useState<ScheduleVenuesState>({ status: "inactive" });
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [adminVenueName, setAdminVenueName] = useState<string | null>(null);
  const [venueSlotWindow, setVenueSlotWindow] = useState<{
    startHour: number;
    endHour: number;
  } | null>(null);

  const venueOptions =
    scheduleVenues.status === "ready" ? scheduleVenues.venues : [];

  /** Derive each render so the grid always matches the calendar day (avoid stale useMemo if Date identity is reused). */
  const slotDate = toLocalDateString(selectedDate);

  const scheduleFilter: CourtsScheduleFilter | undefined = useMemo(() => {
    if ((role === "admin" || role === "superadmin") && selectedVenueId) {
      return { venueId: selectedVenueId };
    }
    return undefined;
  }, [role, selectedVenueId]);

  /** Admins may view any active venue; edits only when selected === assigned venue. */
  const canEditAssignedVenue =
    role === "superadmin" ||
    (role === "admin" &&
      Boolean(staffVenueId) &&
      selectedVenueId === staffVenueId);

  const isPastScheduleDay = isBeforeToday(selectedDate);

  /** Past calendar days are view-only; today and future are editable when venue allows. */
  const canEditSlots = !isPastScheduleDay && canEditAssignedVenue;

  /** Load venue list for admin + superadmin */
  useEffect(() => {
    if (!supabase) {
      return;
    }
    if (authLoading || !session) {
      setScheduleVenues((prev) =>
        prev.status === "inactive" ? prev : { status: "inactive" },
      );
      setSelectedVenueId(null);
      return;
    }
    if (role !== "admin" && role !== "superadmin") {
      setScheduleVenues((prev) =>
        prev.status === "inactive" ? prev : { status: "inactive" },
      );
      setSelectedVenueId(null);
      return;
    }
    if (role === "admin" && !staffVenueId) {
      setScheduleVenues({ status: "ready", venues: [] });
      setSelectedVenueId(null);
      return;
    }
    let cancelled = false;
    setScheduleVenues({ status: "loading" });
    void fetchVenuesList(supabase)
      .then((list) => {
        if (cancelled) {
          return;
        }
        setScheduleVenues({ status: "ready", venues: list });
        setSelectedVenueId((prev) => {
          if (role === "admin" && staffVenueId) {
            if (prev && list.some((v) => v.id === prev)) {
              return prev;
            }
            return staffVenueId;
          }
          return prev ?? list[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setScheduleVenues({ status: "ready", venues: [] });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, session, role, staffVenueId, supabase]);

  /** Admin: show venue name next to schedule */
  useEffect(() => {
    if (!supabase) {
      return;
    }
    if (authLoading || role !== "admin" || !staffVenueId) {
      setAdminVenueName(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("venues")
      .select("name")
      .eq("id", staffVenueId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setAdminVenueName((data?.name as string | undefined) ?? null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, role, staffVenueId, supabase]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!supabase) {
      return;
    }

    const sb = supabase;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setInfo(null);

      if (!session || !isStaff) {
        setVenueSlotWindow(null);
        setCourts([]);
        setCells(new Map());
        setUsingRemote(false);
        setInfo(
          !session
            ? "Sign in with your staff username (admin or superadmin) to load and edit the live schedule."
            : "This account is not in staff_roles. Contact a superadmin for access.",
        );
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (role === "admin" && !staffVenueId) {
        setVenueSlotWindow(null);
        setCourts([]);
        setCells(new Map());
        setUsingRemote(false);
        setError(
          "Your admin account has no venue assigned. Ask a superadmin to set your venue in Admins.",
        );
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (
        (role === "admin" || role === "superadmin") &&
        scheduleVenues.status === "loading"
      ) {
        if (!cancelled) {
          setLoading(true);
        }
        return;
      }

      if (
        (role === "admin" || role === "superadmin") &&
        scheduleVenues.status === "ready" &&
        venueOptions.length === 0
      ) {
        setVenueSlotWindow(null);
        setCourts([]);
        setCells(new Map());
        setUsingRemote(false);
        setInfo(
          "Add at least one venue under Venues to manage court schedules.",
        );
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (
        (role === "admin" || role === "superadmin") &&
        !selectedVenueId
      ) {
        if (!cancelled) {
          setVenueSlotWindow(null);
          setLoading(true);
        }
        return;
      }

      const filter = scheduleFilter;
      if (!filter?.venueId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const slotWindow = await fetchVenueScheduleWindow(
          sb,
          filter.venueId,
        );
        const startH =
          slotWindow?.scheduleStartHour ?? SCHEDULE_START_HOUR;
        const endH = slotWindow?.scheduleEndHour ?? SCHEDULE_END_HOUR;
        if (!cancelled) {
          setVenueSlotWindow({ startHour: startH, endHour: endH });
        }
        const remoteCourts = await fetchCourtsForSchedule(sb, filter);
        const courtList = remoteCourts;
        const grid = await loadScheduleForDate(
          sb,
          slotDate,
          courtList,
          filter,
          { startHour: startH, endHour: endH },
        );
        if (cancelled) {
          return;
        }
        setCourts(courtList);
        setCells(grid);
        setUsingRemote(true);
        if (courtList.length === 0) {
          setInfo(
            "This venue has no active courts yet. Add courts under Venues.",
          );
        }
      } catch (e) {
        if (cancelled) {
          return;
        }
        setVenueSlotWindow(null);
        setCourts([]);
        setCells(new Map());
        setUsingRemote(false);
        setError(
          `Could not load schedule from Supabase (${formatSupabaseError(e)}).`,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    slotDate,
    session,
    isStaff,
    authLoading,
    role,
    staffVenueId,
    selectedVenueId,
    scheduleVenues,
    scheduleFilter,
  ]);

  const [slugMap, setSlugMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!supabase) {
      return;
    }
    if (authLoading || !session || !isStaff || !scheduleFilter?.venueId) {
      setSlugMap(new Map());
      return;
    }
    let cancelled = false;
    fetchCourtSlugToIdMap(supabase, scheduleFilter)
      .then((m) => {
        if (!cancelled) {
          setSlugMap(m);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlugMap(new Map());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, authLoading, session, isStaff, scheduleFilter]);

  const slotEditorUserIdKey = useMemo(() => {
    if (role !== "superadmin" || !session) {
      return "";
    }
    return [
      ...new Set(
        [...cells.values()]
          .map((c) => c.updatedByUserId)
          .filter((x): x is string => Boolean(x)),
      ),
    ]
      .sort()
      .join("|");
  }, [cells, role, session]);

  const [slotEditorLabels, setSlotEditorLabels] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (role !== "superadmin" || !session) {
      setSlotEditorLabels(new Map());
      return;
    }
    const ids = slotEditorUserIdKey
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      setSlotEditorLabels(new Map());
      return;
    }
    let cancelled = false;
    void resolveSlotEditorUsernames(ids)
      .then((record) => {
        if (cancelled) {
          return;
        }
        setSlotEditorLabels(new Map(Object.entries(record)));
      })
      .catch(() => {
        if (!cancelled) {
          setSlotEditorLabels(new Map());
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slotEditorUserIdKey, role, session]);

  const [edit, setEdit] = useState<{
    slotKey: string;
    courtName: string;
    timeLabel: string;
    cell: ScheduleCell;
  } | null>(null);

  const handleSlotClick = useCallback(
    (args: {
      slotKey: string;
      cell: ScheduleCell;
      courtName: string;
      timeLabel: string;
    }) => {
      setEdit({
        slotKey: args.slotKey,
        courtName: args.courtName,
        timeLabel: args.timeLabel,
        cell: args.cell,
      });
    },
    [],
  );

  const handleSave = async (payload: {
    cell: ScheduleCell;
    tillDate: string;
  }) => {
    if (!edit || !isStaff) {
      return;
    }
    if (
      role === "admin" &&
      staffVenueId &&
      scheduleFilter?.venueId !== staffVenueId
    ) {
      setError("You can only save slot changes for your assigned venue.");
      setEdit(null);
      return;
    }
    const { cell: next, tillDate: till } = payload;
    const slotKey = edit.slotKey;
    setError(null);

    const cellForGrid =
      user?.id != null ? { ...next, updatedByUserId: user.id } : next;

    setCells((prev) => {
      const m = new Map(prev);
      m.set(slotKey, cellForGrid);
      return m;
    });
    setEdit(null);

    if (!usingRemote) {
      setError(
        "Schedule is not connected to the database (preview or load failed). Nothing was saved — fix the error above or sign in as staff.",
      );
      return;
    }

    const filter = scheduleFilter;
    if (!filter?.venueId) {
      setError("No venue scope — cannot save. Admins need a venue; superadmins must pick a venue.");
      return;
    }
    if (!supabase) {
      return;
    }

    let map = slugMap;
    if (map.size === 0) {
      try {
        map = await fetchCourtSlugToIdMap(supabase, filter);
        setSlugMap(map);
      } catch (e) {
        setError(
          `Could not resolve courts for save: ${formatSupabaseError(e)}`,
        );
        return;
      }
    }
    if (map.size === 0) {
      setError(
        "No courts found for this venue. Add courts under Venues, then try again.",
      );
      return;
    }

    try {
      const { courtSlug, timeKey } = parseSlotKey(slotKey);
      await upsertSlotEntry(
        supabase,
        {
          slotDate,
          tillDate: till,
          courtSlug,
          timeKey,
          cell: cellForGrid,
        },
        map,
      );
    } catch (e) {
      setError(
        `Failed to save slot: ${formatSupabaseError(e)}. Sign in or adjust RLS policies if needed.`,
      );
    }
  };

  const selectedVenueLabel =
    venueOptions.find((v) => v.id === selectedVenueId)?.name ?? null;

  const scheduleVenueLoading =
    (role === "admin" || role === "superadmin") &&
    scheduleVenues.status === "loading";

  return (
    <div className="space-y-3">
      {session && isStaff && (role === "superadmin" || role === "admin") ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            id="venue-field-label"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
          >
            {role === "admin" ? "View venue" : "Venue"}
          </span>
          {scheduleVenueLoading ? (
            <select
              id="schedule-venue"
              disabled
              aria-labelledby="venue-field-label"
              className="w-full max-w-md cursor-wait rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-muted)] sm:ml-auto"
              aria-busy="true"
            >
              <option>Loading venue list…</option>
            </select>
          ) : venueOptions.length === 0 ? (
            <p
              role="status"
              aria-labelledby="venue-field-label"
              className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 px-4 py-3 text-sm text-[var(--text-muted)] sm:ml-auto"
            >
              No venues yet. Add one under{" "}
              <span className="font-medium text-[var(--text-primary)]">Venues</span>
              .
            </p>
          ) : (
            <select
              id="schedule-venue"
              aria-labelledby="venue-field-label"
              value={selectedVenueId ?? ""}
              onChange={(e) =>
                setSelectedVenueId(e.target.value || null)
              }
              className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/30 sm:ml-auto"
            >
              {venueOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      {session && isStaff && role === "admin" && adminVenueName ? (
        <p className="text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-primary)]">
            Your assigned venue:
          </span>{" "}
          {adminVenueName}
          {venueSlotWindow ? (
            <>
              {" "}
              · Slot window{" "}
              {String(venueSlotWindow.startHour).padStart(2, "0")}:00–
              {String(venueSlotWindow.endHour).padStart(2, "0")}:00 (end
              exclusive)
            </>
          ) : null}
        </p>
      ) : null}

      {authLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Checking your session…</p>
      ) : loading ? (
        <p className="text-sm text-[var(--text-muted)]">
          Loading courts and slot data for this day…
        </p>
      ) : null}
      {info ? (
        <p
          className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sm text-sky-100/90"
          role="status"
        >
          {info}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90"
          role="status"
        >
          {error}
        </p>
      ) : null}

      {selectedVenueLabel && role === "superadmin" ? (
        <p className="text-xs text-[var(--text-muted)]">
          Showing courts for{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {selectedVenueLabel}
          </span>
          {venueSlotWindow ? (
            <>
              {" "}
              · Slot window{" "}
              {String(venueSlotWindow.startHour).padStart(2, "0")}:00–
              {String(venueSlotWindow.endHour).padStart(2, "0")}:00 (end
              exclusive)
            </>
          ) : null}
        </p>
      ) : null}

      {session && isStaff && isPastScheduleDay ? (
        <p
          className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sm text-sky-100/90"
          role="status"
        >
          View only — this date is in the past. Open today or a future day to edit
          slots.
        </p>
      ) : null}

      {session &&
      isStaff &&
      role === "admin" &&
      !canEditAssignedVenue &&
      !isPastScheduleDay &&
      selectedVenueLabel ? (
        <p
          className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-100/85"
          role="status"
        >
          Read-only: you can browse{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {selectedVenueLabel}
          </span>{" "}
          but only slots for{" "}
          <span className="font-medium text-[var(--text-primary)]">
            {adminVenueName ?? "your venue"}
          </span>{" "}
          can be edited.
        </p>
      ) : null}

      {courts.length > 0 ? (
        <ScheduleGrid
          courts={courts}
          cells={cells}
          startHour={venueSlotWindow?.startHour ?? SCHEDULE_START_HOUR}
          endHour={venueSlotWindow?.endHour ?? SCHEDULE_END_HOUR}
          onSlotClick={isStaff && canEditSlots ? handleSlotClick : undefined}
          showSlotEditors={role === "superadmin"}
          editorLabelByUserId={slotEditorLabels}
        />
      ) : !loading ? (
        <div
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-14 text-center text-sm text-[var(--text-muted)]"
          role="status"
        >
          No court grid to display. Sign in as staff, pick a venue, or fix the
          messages above.
        </div>
      ) : null}
      {edit ? (
        <SlotEditModal
          key={edit.slotKey}
          courtName={edit.courtName}
          timeLabel={edit.timeLabel}
          scheduleDate={slotDate}
          initialCell={edit.cell}
          onSave={(p) => void handleSave(p)}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}
