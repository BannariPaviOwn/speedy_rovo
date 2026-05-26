import type { SupabaseClient } from "@supabase/supabase-js";
import { eachLocalDateInRangeInclusive } from "@/lib/date-helpers";
import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  SLOT_STEP_MINUTES,
  addMinutesToTimeKey,
  generateSlotTimes,
} from "@/lib/schedule-config";
import type { CourtInfo, ScheduleCell } from "@/lib/mock-schedule";
import {
  makeSlotKey,
  mapCourtSlotEntryToScheduleCell,
  normalizeTimeKey,
  scheduleCellToDbPayload,
  type CourtSlotEntryDbRow,
} from "@/lib/db/mappers";

const defaultBlocked: ScheduleCell = {
  kind: "blocked",
  label: "BLOCKED",
  subtitle: "—",
};

export type CourtsScheduleFilter = {
  /** When set, only courts belonging to this venue */
  venueId: string;
  /** When set, only courts for this sport (must be offered at the venue). */
  sportId?: string | null;
};

/** Active courts for the schedule grid (`id` = slug for map keys, e.g. c1). */
export async function fetchCourtsForSchedule(
  supabase: SupabaseClient,
  filter?: CourtsScheduleFilter,
): Promise<CourtInfo[]> {
  let q = supabase
    .from("courts")
    .select("slug, label")
    .eq("is_active", true)
    .eq("status", "active");
  if (filter?.venueId) {
    q = q.eq("venue_id", filter.venueId);
  }
  if (filter?.sportId) {
    q = q.eq("sport_id", filter.sportId);
  }
  const { data, error } = await q.order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((r) => ({
    id: r.slug,
    name: r.label,
  }));
}

/** slug → court uuid (optionally limited to one venue for slot saves) */
export async function fetchCourtSlugToIdMap(
  supabase: SupabaseClient,
  filter?: CourtsScheduleFilter,
): Promise<Map<string, string>> {
  let q = supabase
    .from("courts")
    .select("id, slug")
    .eq("is_active", true)
    .eq("status", "active");
  if (filter?.venueId) {
    q = q.eq("venue_id", filter.venueId);
  }
  if (filter?.sportId) {
    q = q.eq("sport_id", filter.sportId);
  }
  const { data, error } = await q;

  if (error) {
    throw error;
  }

  const m = new Map<string, string>();
  for (const row of data ?? []) {
    m.set(row.slug, row.id);
  }
  return m;
}

function invertIdToSlug(slugToId: Map<string, string>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [slug, id] of slugToId) {
    m.set(id, slug);
  }
  return m;
}

/**
 * Loads all hour cells for `slotDate` (YYYY-MM-DD). Missing DB rows stay default blocked.
 * Pass `filter` when scoping to a single venue so slug→id maps are unique.
 */
export async function loadScheduleForDate(
  supabase: SupabaseClient,
  slotDate: string,
  courts: CourtInfo[],
  filter?: CourtsScheduleFilter,
  slotWindow?: { startHour: number; endHour: number },
  slotStepMinutes: number = SLOT_STEP_MINUTES,
): Promise<Map<string, ScheduleCell>> {
  const startHour = slotWindow?.startHour ?? SCHEDULE_START_HOUR;
  const endHour = slotWindow?.endHour ?? SCHEDULE_END_HOUR;
  const step = slotStepMinutes > 0 ? slotStepMinutes : SLOT_STEP_MINUTES;
  const times = generateSlotTimes(startHour, endHour, step);

  const slugToId = await fetchCourtSlugToIdMap(supabase, filter);
  const idToSlug = invertIdToSlug(slugToId);

  const courtIds = courts
    .map((c) => slugToId.get(c.id))
    .filter((id): id is string => Boolean(id));

  const map = new Map<string, ScheduleCell>();

  for (const court of courts) {
    for (const t of times) {
      map.set(makeSlotKey(court.id, t.key), { ...defaultBlocked });
    }
  }

  if (courtIds.length === 0) {
    return map;
  }

  const { data: rows, error } = await supabase
    .from("court_slot_entries")
    .select(
      "court_id, start_time, kind, label, subtitle, membership_detail, notes, till_date, updated_by, duration_minutes",
    )
    .eq("slot_date", slotDate)
    .eq("is_active", true)
    .eq("status", "active")
    .in("court_id", courtIds);

  if (error) {
    throw error;
  }

  const timeKeys = new Set(times.map((t) => t.key));

  for (const raw of rows ?? []) {
    const row = raw as CourtSlotEntryDbRow;
    const slug = idToSlug.get(row.court_id);
    if (!slug) {
      continue;
    }
    const cell = mapCourtSlotEntryToScheduleCell(row);
    const duration = cell.durationMinutes ?? step;
    const anchorKey = cell.slotAnchorTimeKey ?? normalizeTimeKey(row.start_time);
    const steps = Math.max(1, Math.round(duration / step));
    for (let i = 0; i < steps; i++) {
      const tk = addMinutesToTimeKey(anchorKey, i * step);
      if (!timeKeys.has(tk)) {
        continue;
      }
      const key = makeSlotKey(slug, tk);
      map.set(key, { ...cell, slotAnchorTimeKey: anchorKey, durationMinutes: duration });
    }
  }

  return map;
}

export async function upsertSlotEntry(
  supabase: SupabaseClient,
  params: {
    slotDate: string;
    /** Inclusive last calendar day to apply the same slot (defaults to `slotDate`). */
    tillDate?: string;
    courtSlug: string;
    timeKey: string;
    cell: ScheduleCell;
    slotStepMinutes?: number;
  },
  slugToId: Map<string, string>,
): Promise<void> {
  const court_id = slugToId.get(params.courtSlug);
  if (!court_id) {
    throw new Error(`Unknown court slug: ${params.courtSlug}`);
  }

  const step =
    params.slotStepMinutes && params.slotStepMinutes > 0
      ? params.slotStepMinutes
      : SLOT_STEP_MINUTES;
  const till =
    params.tillDate && params.tillDate >= params.slotDate
      ? params.tillDate
      : params.slotDate;
  const dates = eachLocalDateInRangeInclusive(params.slotDate, till);
  const [th, tm] = params.timeKey.split(":").map((x) => Number(x));
  const start_time = `${String(th).padStart(2, "0")}:${String(tm | 0).padStart(2, "0")}:00`;
  const cellPayload = scheduleCellToDbPayload(params.cell, step);
  const rows = dates.map((slot_date) => ({
    court_id,
    slot_date,
    start_time,
    till_date: till,
    ...cellPayload,
  }));

  const { error } = await supabase.from("court_slot_entries").upsert(rows, {
    onConflict: "court_id,slot_date,start_time",
  });

  if (error) {
    throw error;
  }
}
