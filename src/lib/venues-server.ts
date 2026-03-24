import { usernamesForUserIds } from "@/lib/audit-usernames";
import { createClient } from "@/lib/server";
import type { RowStatus } from "@/lib/db/row-lifecycle";
import type { VenueRow } from "@/lib/db/types";
import { assertSuperadmin } from "@/lib/staff-admin-server";

export type VenueMasterRow = VenueRow & {
  courtCount: number;
  createdByUsername: string | null;
  updatedByUsername: string | null;
};

function courtsPayload(venueId: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      venue_id: venueId,
      slug: `c${n}`,
      label: `COURT ${String(n).padStart(2, "0")}`,
      sort_order: n,
      status: "active",
      is_active: true,
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

  const { data: courts, error: cErr } = await supabase
    .from("courts")
    .select("venue_id");

  if (cErr) {
    throw new Error(cErr.message);
  }

  const countByVenue = new Map<string, number>();
  for (const row of courts ?? []) {
    const vid = row.venue_id as string;
    countByVenue.set(vid, (countByVenue.get(vid) ?? 0) + 1);
  }

  const rows = venues ?? [];
  const labelMap = await usernamesForUserIds(
    rows.flatMap((v) => [v.created_by, v.updated_by]),
  );

  return rows.map((v) => {
    const row = v as VenueRow;
    const cb = row.created_by;
    const ub = row.updated_by;
    return {
      ...row,
      courtCount: countByVenue.get(row.id) ?? 0,
      createdByUsername: cb ? (labelMap.get(cb) ?? null) : null,
      updatedByUsername: ub ? (labelMap.get(ub) ?? null) : null,
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
}): Promise<void> {
  await assertSuperadmin();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Venue name is required.");
  }
  const courtCount = input.courtCount;
  const { schedule_start_hour, schedule_end_hour } = {
    schedule_start_hour: input.schedule_start_hour,
    schedule_end_hour: input.schedule_end_hour,
  };
  const supabase = await createClient();
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
  const { error: courtsErr } = await supabase
    .from("courts")
    .insert(courtsPayload(venueId, courtCount));
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
  },
): Promise<void> {
  await assertSuperadmin();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Venue name is required.");
  }
  const courtCount = input.courtCount;
  const { schedule_start_hour, schedule_end_hour } = {
    schedule_start_hour: input.schedule_start_hour,
    schedule_end_hour: input.schedule_end_hour,
  };
  const supabase = await createClient();

  const { data: existingCourts, error: listErr } = await supabase
    .from("courts")
    .select("id, sort_order")
    .eq("venue_id", id)
    .order("sort_order", { ascending: true });

  if (listErr) {
    throw new Error(listErr.message);
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

  const current = (existingCourts ?? []).length;
  if (courtCount > current) {
    const { error: addErr } = await supabase.from("courts").insert(
      Array.from({ length: courtCount - current }, (_, i) => {
        const n = current + i + 1;
        return {
          venue_id: id,
          slug: `c${n}`,
          label: `COURT ${String(n).padStart(2, "0")}`,
          sort_order: n,
          status: "active",
          is_active: true,
        };
      }),
    );
    if (addErr) {
      throw new Error(addErr.message);
    }
  } else if (courtCount < current) {
    const excess = (existingCourts ?? [])
      .filter((c) => (c.sort_order as number) > courtCount)
      .map((c) => c.id as string);
    if (excess.length > 0) {
      const { error: delErr } = await supabase
        .from("courts")
        .delete()
        .in("id", excess);
      if (delErr) {
        throw new Error(delErr.message);
      }
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
