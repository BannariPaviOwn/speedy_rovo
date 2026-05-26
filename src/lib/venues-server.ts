import { usernamesForUserIds } from "@/lib/audit-usernames";
import { createClient } from "@/lib/server";
import type { RowStatus } from "@/lib/db/row-lifecycle";
import type { VenueRow } from "@/lib/db/types";
import { assertSuperadmin } from "@/lib/staff-admin-server";
import { defaultVenueSportSettings } from "@/lib/venue-sport-defaults";

export type VenueSportOffered = {
  id: string;
  slug: string;
  name: string;
};

export type VenueCourtEdit = {
  id: string;
  slug: string;
  label: string;
  sportId: string;
  isActive: boolean;
  status: string;
};

export type VenueMasterRow = VenueRow & {
  courtCount: number;
  /** Courts shown on the schedule (`is_active` + `status = active`). */
  courtsOnScheduleCount: number;
  createdByUsername: string | null;
  updatedByUsername: string | null;
  offeredSports: VenueSportOffered[];
  courts: VenueCourtEdit[];
};

export type SportCatalogRow = {
  id: string;
  slug: string;
  name: string;
};

function courtsPayload(venueId: string, count: number, sportId: string) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      venue_id: venueId,
      slug: `c${n}`,
      label: `COURT ${String(n).padStart(2, "0")}`,
      sort_order: n,
      status: "active",
      is_active: true,
      sport_id: sportId,
    };
  });
}

function parseScheduleHours(
  startRaw: unknown,
  endRaw: unknown,
): { schedule_start_hour: number; schedule_end_hour: number } {
  const schedule_start_hour = Number(startRaw);
  const schedule_end_hour = Number(endRaw);
  if (
    !Number.isInteger(schedule_start_hour) ||
    schedule_start_hour < 0 ||
    schedule_start_hour > 23
  ) {
    throw new Error("Choose a valid opening hour (0–23).");
  }
  if (
    !Number.isInteger(schedule_end_hour) ||
    schedule_end_hour < 1 ||
    schedule_end_hour > 24
  ) {
    throw new Error("Choose a valid closing hour (1–24).");
  }
  if (schedule_end_hour <= schedule_start_hour) {
    throw new Error("Closing time must be after opening time (same calendar day).");
  }
  return { schedule_start_hour, schedule_end_hour };
}

function parseCourtCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 50) {
    throw new Error("Number of courts must be between 1 and 50.");
  }
  return n;
}

async function sportIdsForSlugs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slugs: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase
    .from("sports")
    .select("id, slug")
    .in("slug", unique);
  if (error) {
    throw new Error(error.message);
  }
  const m = new Map<string, string>();
  for (const row of data ?? []) {
    m.set(row.slug as string, row.id as string);
  }
  if (m.size !== unique.length) {
    throw new Error("One or more sports are unknown. Refresh and try again.");
  }
  return m;
}

export async function listSportsCatalog(): Promise<SportCatalogRow[]> {
  await assertSuperadmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sports")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
  }));
}

export async function listVenuesMaster(): Promise<VenueMasterRow[]> {
  await assertSuperadmin();
  const supabase = await createClient();

  const { data: venues, error: vErr } = await supabase
    .from("venues")
    .select(
      "id, name, city, schedule_start_hour, schedule_end_hour, status, is_active, created_at, created_by, updated_by",
    )
    .order("name", { ascending: true });

  if (vErr) {
    throw new Error(vErr.message);
  }

  const venueIds = (venues ?? []).map((v) => v.id as string);

  let courts: {
    id: unknown;
    venue_id: unknown;
    slug: unknown;
    label: unknown;
    sport_id: unknown;
    sort_order: unknown;
    is_active: unknown;
    status: unknown;
  }[] = [];
  if (venueIds.length > 0) {
    const { data, error: cErr } = await supabase
      .from("courts")
      .select("id, venue_id, slug, label, sport_id, sort_order, is_active, status")
      .in("venue_id", venueIds)
      .order("sort_order", { ascending: true });
    if (cErr) {
      throw new Error(cErr.message);
    }
    courts = data ?? [];
  }

  let vsRows: {
    venue_id: unknown;
    sport_id: unknown;
    sports: unknown;
  }[] = [];
  if (venueIds.length > 0) {
    const { data, error: vsErr } = await supabase
      .from("venue_sports")
      .select(
        `
        venue_id,
        sport_id,
        sports ( id, slug, name )
      `,
      )
      .in("venue_id", venueIds);
    if (vsErr) {
      throw new Error(vsErr.message);
    }
    vsRows = data ?? [];
  }

  const courtsByVenue = new Map<string, VenueCourtEdit[]>();
  for (const row of courts ?? []) {
    const vid = row.venue_id as string;
    const list = courtsByVenue.get(vid) ?? [];
    list.push({
      id: row.id as string,
      slug: row.slug as string,
      label: row.label as string,
      sportId: row.sport_id as string,
      isActive: row.is_active !== false,
      status: (row.status as string) ?? "active",
    });
    courtsByVenue.set(vid, list);
  }

  const sportsByVenue = new Map<string, VenueSportOffered[]>();
  for (const row of vsRows ?? []) {
    const vid = row.venue_id as string;
    const sp = row.sports as { id: string; slug: string; name: string } | null;
    if (!sp?.id) {
      continue;
    }
    const list = sportsByVenue.get(vid) ?? [];
    list.push({ id: sp.id, slug: sp.slug, name: sp.name });
    sportsByVenue.set(vid, list);
  }

  const rows = venues ?? [];
  const labelMap = await usernamesForUserIds(
    rows.flatMap((v) => [v.created_by, v.updated_by]),
  );

  return rows.map((v) => {
    const row = v as VenueRow;
    const cb = row.created_by;
    const ub = row.updated_by;
    const vc = courtsByVenue.get(row.id) ?? [];
    const onSchedule = vc.filter(
      (c) => c.isActive && c.status === "active",
    ).length;
    return {
      ...row,
      courtCount: vc.length,
      courtsOnScheduleCount: onSchedule,
      createdByUsername: cb ? (labelMap.get(cb) ?? null) : null,
      updatedByUsername: ub ? (labelMap.get(ub) ?? null) : null,
      offeredSports: sportsByVenue.get(row.id) ?? [],
      courts: vc,
    };
  });
}

export async function insertVenue(input: {
  name: string;
  city: string | null;
  courtCount: number;
  schedule_start_hour: number;
  schedule_end_hour: number;
  status: RowStatus;
  is_active: boolean;
  offeredSportSlugs: string[];
  courtSportSlug: string;
}): Promise<void> {
  await assertSuperadmin();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Venue name is required.");
  }
  if (input.offeredSportSlugs.length === 0) {
    throw new Error("Select at least one sport for this venue.");
  }
  if (!input.courtSportSlug.trim()) {
    throw new Error("Choose which sport the new courts belong to.");
  }
  if (!input.offeredSportSlugs.includes(input.courtSportSlug)) {
    throw new Error("Court sport must be one of the venue’s selected sports.");
  }
  const courtCount = input.courtCount;
  const { schedule_start_hour, schedule_end_hour } = {
    schedule_start_hour: input.schedule_start_hour,
    schedule_end_hour: input.schedule_end_hour,
  };
  const supabase = await createClient();
  const slugMap = await sportIdsForSlugs(supabase, input.offeredSportSlugs);
  const courtSportId = slugMap.get(input.courtSportSlug)!;

  const { data: inserted, error } = await supabase
    .from("venues")
    .insert({
      name,
      city: input.city?.trim() || null,
      schedule_start_hour,
      schedule_end_hour,
      status: input.status,
      is_active: input.is_active,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(error.message);
  }
  const venueId = inserted?.id as string;

  const vsPayload = input.offeredSportSlugs.map((slug) => {
    const sportId = slugMap.get(slug)!;
    const def = defaultVenueSportSettings(slug);
    return {
      venue_id: venueId,
      sport_id: sportId,
      slot_step_minutes: def.slot_step_minutes,
      duration_options_minutes: def.duration_options_minutes,
    };
  });
  const { error: vsErr } = await supabase.from("venue_sports").insert(vsPayload);
  if (vsErr) {
    await supabase.from("venues").delete().eq("id", venueId);
    throw new Error(vsErr.message);
  }

  const { error: courtsErr } = await supabase
    .from("courts")
    .insert(courtsPayload(venueId, courtCount, courtSportId));
  if (courtsErr) {
    await supabase.from("venues").delete().eq("id", venueId);
    throw new Error(courtsErr.message);
  }
}

export async function updateVenue(
  id: string,
  input: {
    name: string;
    city: string | null;
    courtCount: number;
    schedule_start_hour: number;
    schedule_end_hour: number;
    status: RowStatus;
    is_active: boolean;
    offeredSportSlugs: string[];
    courtSportsById: Record<string, string>;
    newCourtsSportId: string;
    /** Courts to remove (must belong to this venue). Slot rows cascade. */
    deletedCourtIds: string[];
    /** `court_on_schedule_<uuid>` → visible on schedule when true. */
    courtScheduleActiveById: Record<string, boolean>;
  },
): Promise<void> {
  await assertSuperadmin();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Venue name is required.");
  }
  if (input.offeredSportSlugs.length === 0) {
    throw new Error("Select at least one sport for this venue.");
  }
  const courtCount = input.courtCount;
  const { schedule_start_hour, schedule_end_hour } = {
    schedule_start_hour: input.schedule_start_hour,
    schedule_end_hour: input.schedule_end_hour,
  };
  const supabase = await createClient();
  const offeredSlugMap = await sportIdsForSlugs(supabase, input.offeredSportSlugs);
  const offeredIds = new Set(offeredSlugMap.values());

  if (!offeredIds.has(input.newCourtsSportId)) {
    throw new Error("Sport for new courts must be one of the venue’s selected sports.");
  }

  const { data: existingCourts, error: listErr } = await supabase
    .from("courts")
    .select("id, sort_order")
    .eq("venue_id", id)
    .order("sort_order", { ascending: true });

  if (listErr) {
    throw new Error(listErr.message);
  }

  const allRows = (existingCourts ?? []) as { id: string; sort_order: number }[];
  const byId = new Map(allRows.map((c) => [c.id, c]));

  for (const did of input.deletedCourtIds) {
    if (!byId.has(did)) {
      throw new Error("Removed court not found for this venue. Refresh and try again.");
    }
  }

  const explicitDelete = new Set(input.deletedCourtIds);
  let survivors = [...allRows].filter((c) => !explicitDelete.has(c.id));
  survivors.sort((a, b) => a.sort_order - b.sort_order);
  const autoDeleteIds: string[] = [];
  while (survivors.length > courtCount) {
    const rem = survivors.pop();
    if (!rem) {
      break;
    }
    autoDeleteIds.push(rem.id);
  }
  const allDeleteIds = [...new Set([...explicitDelete, ...autoDeleteIds])];

  const survivorIdsAfterTrim = new Set(survivors.map((c) => c.id));
  const sportsUsedInForm = new Set<string>();
  for (const cid of survivorIdsAfterTrim) {
    const sid = input.courtSportsById[cid];
    if (sid) {
      sportsUsedInForm.add(sid);
    }
  }
  sportsUsedInForm.add(input.newCourtsSportId);

  const { data: existingVs, error: evsErr } = await supabase
    .from("venue_sports")
    .select("sport_id")
    .eq("venue_id", id);

  if (evsErr) {
    throw new Error(evsErr.message);
  }

  const prevSportIds = new Set(
    (existingVs ?? []).map((r) => r.sport_id as string),
  );
  const nextSportIds = new Set(offeredIds);

  for (const sid of prevSportIds) {
    if (nextSportIds.has(sid)) {
      continue;
    }
    if (sportsUsedInForm.has(sid)) {
      throw new Error(
        "Reassign courts (and new-court sport) before removing a sport from this venue.",
      );
    }
    const { error: delVs } = await supabase
      .from("venue_sports")
      .delete()
      .eq("venue_id", id)
      .eq("sport_id", sid);
    if (delVs) {
      throw new Error(delVs.message);
    }
  }

  for (const slug of input.offeredSportSlugs) {
    const sportId = offeredSlugMap.get(slug)!;
    if (prevSportIds.has(sportId)) {
      continue;
    }
    const def = defaultVenueSportSettings(slug);
    const { error: insVs } = await supabase.from("venue_sports").insert({
      venue_id: id,
      sport_id: sportId,
      slot_step_minutes: def.slot_step_minutes,
      duration_options_minutes: def.duration_options_minutes,
    });
    if (insVs) {
      throw new Error(insVs.message);
    }
  }

  const { error: venueErr } = await supabase
    .from("venues")
    .update({
      name,
      city: input.city?.trim() || null,
      schedule_start_hour,
      schedule_end_hour,
      status: input.status,
      is_active: input.is_active,
    })
    .eq("id", id);
  if (venueErr) {
    throw new Error(venueErr.message);
  }

  if (allDeleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from("courts")
      .delete()
      .in("id", allDeleteIds);
    if (delErr) {
      throw new Error(delErr.message);
    }
  }

  const { data: afterDelete, error: adErr } = await supabase
    .from("courts")
    .select("id, sort_order")
    .eq("venue_id", id)
    .order("sort_order", { ascending: true });

  if (adErr) {
    throw new Error(adErr.message);
  }

  const remaining = (afterDelete ?? []) as { id: string; sort_order: number }[];
  if (remaining.length === 0) {
    throw new Error("A venue must keep at least one court.");
  }

  for (const c of remaining) {
    const cid = c.id;
    const sid = input.courtSportsById[cid];
    if (!sid) {
      throw new Error("Each court needs a sport. Refresh and try again.");
    }
    if (!offeredIds.has(sid)) {
      throw new Error("Each court must use a sport offered at this venue.");
    }
    const onSchedule =
      input.courtScheduleActiveById[cid] !== undefined
        ? input.courtScheduleActiveById[cid]
        : true;
    const { error: upErr } = await supabase
      .from("courts")
      .update({
        sport_id: sid,
        is_active: onSchedule,
        status: onSchedule ? "active" : "inactive",
      })
      .eq("id", cid);
    if (upErr) {
      throw new Error(upErr.message);
    }
  }

  const have = remaining.length;
  if (courtCount > have) {
    const maxOrder = Math.max(...remaining.map((c) => c.sort_order));
    const { error: addErr } = await supabase.from("courts").insert(
      Array.from({ length: courtCount - have }, (_, i) => {
        const n = maxOrder + i + 1;
        return {
          venue_id: id,
          slug: `c${n}`,
          label: `COURT ${String(n).padStart(2, "0")}`,
          sort_order: n,
          status: "active",
          is_active: true,
          sport_id: input.newCourtsSportId,
        };
      }),
    );
    if (addErr) {
      throw new Error(addErr.message);
    }
  }
}

export { parseCourtCount, parseScheduleHours };

export async function deleteVenue(id: string): Promise<void> {
  await assertSuperadmin();
  const supabase = await createClient();
  const { error } = await supabase.from("venues").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
