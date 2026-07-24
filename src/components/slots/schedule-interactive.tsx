"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveVenueAdminUsernames } from "@/app/(app)/slots/actions";
import { ScheduleGrid } from "@/components/slots/schedule-grid";
import { ScheduleVenueHeader } from "@/components/slots/schedule-venue-header";
import { useRole } from "@/components/providers/role-provider";
import { createClient } from "@/lib/client";
import { isBeforeToday, toLocalDateString } from "@/lib/date-helpers";
import { makeSlotKey, parseSlotKey } from "@/lib/db/mappers";
import {
  fetchCourtSlugToIdMap,
  fetchCourtsForSchedule,
  loadScheduleForDate,
  type CourtsScheduleFilter,
  upsertSlotEntry,
} from "@/lib/db/schedule-queries";
import {
  fetchVenueSportsForSchedule,
  type VenueSportScheduleConfig,
} from "@/lib/db/sports-queries";
import { formatSupabaseError } from "@/lib/db/supabase-errors";
import {
  fetchVenueAdminContacts,
  type VenueAdminContact,
} from "@/lib/db/staff-queries";
import {
  fetchVenueScheduleWindow,
  fetchVenuesList,
} from "@/lib/db/venue-queries";
import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  SLOT_STEP_MINUTES,
  addMinutesToTimeKey,
} from "@/lib/schedule-config";
import { courtHasSlotConflictAtTime } from "@/lib/schedule-slot-conflict";
import type { CourtInfo, ScheduleCell } from "@/lib/mock-schedule";

const SlotEditModal = dynamic(
  () =>
    import("@/components/slots/slot-edit-modal").then((m) => ({
      default: m.SlotEditModal,
    })),
  { ssr: false },
);

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
  const signedIn = Boolean(session ?? user);
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
  const [venueContacts, setVenueContacts] = useState<VenueAdminContact[]>([]);
  const [venueContactNames, setVenueContactNames] = useState<
    Record<string, string>
  >({});
  const [venueSportConfigs, setVenueSportConfigs] = useState<
    VenueSportScheduleConfig[]
  >([]);
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [sportsLoading, setSportsLoading] = useState(false);

  const venueOptions =
    scheduleVenues.status === "ready" ? scheduleVenues.venues : [];

  /** Derive each render so the grid always matches the calendar day (avoid stale useMemo if Date identity is reused). */
  const slotDate = toLocalDateString(selectedDate);

  const scheduleFilter: CourtsScheduleFilter | undefined = useMemo(() => {
    if (
      (role === "admin" || role === "superadmin") &&
      selectedVenueId &&
      selectedSportId
    ) {
      return { venueId: selectedVenueId, sportId: selectedSportId };
    }
    return undefined;
  }, [role, selectedVenueId, selectedSportId]);

  const activeSportConfig = useMemo(
    () => venueSportConfigs.find((c) => c.sportId === selectedSportId),
    [venueSportConfigs, selectedSportId],
  );

  const slotStepMinutes =
    activeSportConfig?.slotStepMinutes ?? SLOT_STEP_MINUTES;

  const durationOptionsMinutes = useMemo(
    () => activeSportConfig?.durationOptionsMinutes ?? [slotStepMinutes],
    [activeSportConfig?.durationOptionsMinutes, slotStepMinutes],
  );

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
    if (authLoading || !signedIn) {
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
  }, [authLoading, signedIn, role, staffVenueId, supabase]);

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
    if (!supabase || !selectedVenueId || !session || !isStaff) {
      setVenueSportConfigs([]);
      setSelectedSportId(null);
      setSportsLoading(false);
      return;
    }
    if (role !== "admin" && role !== "superadmin") {
      return;
    }
    let cancelled = false;
    setSportsLoading(true);
    void fetchVenueSportsForSchedule(supabase, selectedVenueId)
      .then((list) => {
        if (cancelled) {
          return;
        }
        setVenueSportConfigs(list);
        setSelectedSportId((prev) => {
          if (prev && list.some((x) => x.sportId === prev)) {
            return prev;
          }
          return list[0]?.sportId ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setVenueSportConfigs([]);
          setSelectedSportId(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSportsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, session, isStaff, role, selectedVenueId]);

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

      if (!signedIn || !isStaff) {
        setVenueSlotWindow(null);
        setCourts([]);
        setCells(new Map());
        setUsingRemote(false);
        setInfo(
          !signedIn
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

      if (
        (role === "admin" || role === "superadmin") &&
        selectedVenueId &&
        !selectedSportId
      ) {
        if (sportsLoading) {
          if (!cancelled) {
            setLoading(true);
          }
          return;
        }
        setVenueSlotWindow(null);
        setCourts([]);
        setCells(new Map());
        setUsingRemote(false);
        setInfo(
          "This venue has no sports configured. Open Venues, edit the venue, and select at least one sport.",
        );
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      const filter = scheduleFilter;
      if (!filter?.venueId || !filter.sportId) {
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
          slotStepMinutes,
        );
        if (cancelled) {
          return;
        }
        setCourts(courtList);
        setCells(grid);
        setUsingRemote(true);
        if (courtList.length === 0) {
          setInfo(
            filter.sportId
              ? "No courts for this sport at this venue. Under Venues, assign this sport to a court or pick another sport above."
              : "This venue has no active courts yet. Add courts under Venues.",
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
    signedIn,
    isStaff,
    authLoading,
    role,
    staffVenueId,
    selectedVenueId,
    scheduleVenues,
    scheduleFilter,
    slotStepMinutes,
    selectedSportId,
    sportsLoading,
  ]);

  const [slugMap, setSlugMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!supabase) {
      return;
    }
    if (
      authLoading ||
      !signedIn ||
      !isStaff ||
      !scheduleFilter?.venueId ||
      !scheduleFilter.sportId
    ) {
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
  }, [supabase, authLoading, signedIn, isStaff, scheduleFilter]);

  useEffect(() => {
    if (!supabase || !session || !isStaff || !selectedVenueId) {
      setVenueContacts([]);
      return;
    }
    let cancelled = false;
    void fetchVenueAdminContacts(supabase, selectedVenueId)
      .then((list) => {
        if (!cancelled) {
          setVenueContacts(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVenueContacts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, session, isStaff, selectedVenueId]);

  useEffect(() => {
    if (!selectedVenueId || venueContacts.length === 0) {
      setVenueContactNames({});
      return;
    }
    const ids = venueContacts.map((c) => c.userId);
    let cancelled = false;
    void resolveVenueAdminUsernames(selectedVenueId, ids)
      .then((record) => {
        if (!cancelled) {
          setVenueContactNames(record);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVenueContactNames({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVenueId, venueContacts]);

  const venueContactsForHeader = useMemo(
    () =>
      venueContacts.map((c) => ({
        ...c,
        displayName: venueContactNames[c.userId] ?? null,
      })),
    [venueContacts, venueContactNames],
  );

  const slotEditorUserIdKey = useMemo(() => {
    if (role !== "superadmin" || !signedIn) {
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
  }, [cells, role, signedIn]);

  const [slotEditorLabels, setSlotEditorLabels] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (role !== "superadmin" || !signedIn) {
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
    void import("@/app/(app)/slots/actions")
      .then(({ resolveSlotEditorUsernames }) =>
        resolveSlotEditorUsernames(ids),
      )
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
  }, [slotEditorUserIdKey, role, signedIn]);

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

  const applyCellToGrid = useCallback(
    (
      prev: Map<string, ScheduleCell>,
      courtSlug: string,
      anchor: string,
      dur: number,
      cellForGrid: ScheduleCell,
    ) => {
      const m = new Map(prev);
      const stepsCount = Math.max(1, Math.round(dur / slotStepMinutes));
      for (let i = 0; i < stepsCount; i++) {
        const tk = addMinutesToTimeKey(anchor, i * slotStepMinutes);
        const k = makeSlotKey(courtSlug, tk);
        if (m.has(k)) {
          m.set(k, {
            ...cellForGrid,
            slotAnchorTimeKey: anchor,
            durationMinutes: dur,
          });
        }
      }
      return m;
    },
    [slotStepMinutes],
  );

  const handleSave = async (payload: {
    cell: ScheduleCell;
    tillDate: string;
    includeWeekends?: boolean;
    courtSlugs: string[];
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
    const { cell: next, tillDate: till, includeWeekends, courtSlugs } = payload;
    const slotKey = edit.slotKey;
    setError(null);
    setInfo(null);

    const cellForGrid =
      user?.id != null ? { ...next, updatedByUserId: user.id } : next;

    const { courtSlug: anchorCourtSlug, timeKey } = parseSlotKey(slotKey);
    const anchor = cellForGrid.slotAnchorTimeKey ?? timeKey;
    const dur =
      cellForGrid.durationMinutes && cellForGrid.durationMinutes > 0
        ? cellForGrid.durationMinutes
        : slotStepMinutes;

    const slugsRequested =
      courtSlugs.length > 0 ? courtSlugs : [anchorCourtSlug];
    const slugsUnique = [...new Set(slugsRequested)];
    if (!slugsUnique.includes(anchorCourtSlug)) {
      slugsUnique.unshift(anchorCourtSlug);
    }

    const skippedSlugs: string[] = [];
    const slugsToApply = slugsUnique.filter((slug) => {
      if (courtHasSlotConflictAtTime(cells, slug, anchor)) {
        skippedSlugs.push(slug);
        return false;
      }
      return true;
    });

    if (slugsToApply.length === 0) {
      setError(
        "Could not save — every selected court has another session at this time. Pick fewer courts or choose a different slot.",
      );
      return;
    }

    setCells((prev) => {
      let m = prev;
      for (const slug of slugsToApply) {
        m = applyCellToGrid(m, slug, anchor, dur, cellForGrid);
      }
      return m;
    });
    setEdit(null);

    if (skippedSlugs.length > 0) {
      const skippedNames = skippedSlugs
        .map((slug) => courts.find((c) => c.id === slug)?.name ?? slug)
        .join(", ");
      setInfo(
        `Saved ${slugsToApply.length} court${slugsToApply.length === 1 ? "" : "s"}. Skipped ${skippedSlugs.length} with an overlapping session: ${skippedNames}.`,
      );
    }

    if (!usingRemote) {
      setError(
        "Schedule is not connected to the database (preview or load failed). Nothing was saved — fix the error above or sign in as staff.",
      );
      return;
    }

    const filter = scheduleFilter;
    if (!filter?.venueId || !filter.sportId) {
      setError(
        "Pick a venue and sport before saving slots.",
      );
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
      const anchorKey = cellForGrid.slotAnchorTimeKey ?? timeKey;
      const saveErrors: string[] = [];
      for (const slug of slugsToApply) {
        try {
          await upsertSlotEntry(
            supabase,
            {
              slotDate,
              tillDate: till,
              includeWeekends,
              courtSlug: slug,
              timeKey: anchorKey,
              cell: cellForGrid,
              slotStepMinutes,
            },
            map,
          );
        } catch (e) {
          saveErrors.push(
            `${courts.find((c) => c.id === slug)?.name ?? slug}: ${formatSupabaseError(e)}`,
          );
        }
      }
      if (saveErrors.length > 0) {
        setError(
          saveErrors.length === slugsToApply.length
            ? `Failed to save slot: ${saveErrors[0]}`
            : `Some courts did not save: ${saveErrors.join("; ")}`,
        );
      }
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

  const slotWindowLine =
    venueSlotWindow && session && isStaff
      ? `Slot window ${String(venueSlotWindow.startHour).padStart(2, "0")}:00–${String(
          venueSlotWindow.endHour,
        ).padStart(2, "0")}:00 (end exclusive)`
      : null;

  return (
    <div className="space-y-3">
      {signedIn && isStaff && (role === "superadmin" || role === "admin") ? (
        <ScheduleVenueHeader
          role={role === "superadmin" ? "superadmin" : "admin"}
          venues={venueOptions}
          selectedVenueId={selectedVenueId}
          onVenueChange={setSelectedVenueId}
          loading={scheduleVenueLoading}
          emptyVenuesMessage={
            <>
              No venues yet. Add one under{" "}
              <span className="font-medium text-[var(--text-primary)]">
                Venues
              </span>
              .
            </>
          }
          contacts={venueContactsForHeader}
          slotWindowLine={
            !scheduleVenueLoading && venueOptions.length > 0
              ? slotWindowLine
              : null
          }
          secondaryLine={
            role === "admin" && adminVenueName ? (
              <>
                <span className="font-medium text-[var(--text-primary)]">
                  Your assigned venue:
                </span>{" "}
                {adminVenueName}
              </>
            ) : null
          }
          scheduleSports={venueSportConfigs.map((c) => ({
            id: c.sportId,
            name: c.name,
          }))}
          selectedSportId={selectedSportId}
          onSportChange={(id) => setSelectedSportId(id)}
          sportsLoading={sportsLoading}
        />
      ) : null}

      {authLoading && !user ? (
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

      {signedIn && isStaff && isPastScheduleDay ? (
        <p
          className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-sm text-sky-100/90"
          role="status"
        >
          View only — this date is in the past. Open today or a future day to edit
          slots.
        </p>
      ) : null}

      {signedIn &&
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
          slotStepMinutes={slotStepMinutes}
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
          anchorCourtSlug={parseSlotKey(edit.slotKey).courtSlug}
          courts={courts}
          cells={cells}
          timeLabel={edit.timeLabel}
          scheduleDate={slotDate}
          initialCell={edit.cell}
          anchorTimeKey={
            edit.cell.slotAnchorTimeKey ?? parseSlotKey(edit.slotKey).timeKey
          }
          slotStepMinutes={slotStepMinutes}
          durationOptionsMinutes={durationOptionsMinutes}
          onSave={(p) => void handleSave(p)}
          onClose={() => setEdit(null)}
        />
      ) : null}
    </div>
  );
}
