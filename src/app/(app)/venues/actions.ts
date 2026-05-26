"use server";

import { revalidatePath } from "next/cache";
import type { VenueActionState } from "@/app/(app)/venues/types";
import {
  parseIsActiveFromForm,
  parseRowStatus,
} from "@/lib/db/row-lifecycle";
import {
  deleteVenue,
  insertVenue,
  parseCourtCount,
  parseScheduleHours,
  updateVenue,
} from "@/lib/venues-server";

const okState: VenueActionState = { ok: true, error: null };
const err = (message: string): VenueActionState => ({
  ok: false,
  error: message,
});

function sportSlugsFromForm(formData: FormData): string[] {
  return formData
    .getAll("sport_slugs")
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function courtSportsFromForm(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    const m = k.match(/^court_sport_([0-9a-f-]{36})$/i);
    if (m) {
      out[m[1]] = String(v).trim();
    }
  }
  return out;
}

function deletedCourtIdsFromForm(formData: FormData): string[] {
  return formData
    .getAll("deleted_court_id")
    .map((x) => String(x).trim())
    .filter(Boolean);
}

/** Hidden `0` + checkbox `1` per court → true when checked. */
function courtScheduleActiveFromForm(
  formData: FormData,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const keys = new Set<string>();
  formData.forEach((_, k) => keys.add(k));
  for (const k of keys) {
    const m = k.match(/^court_on_schedule_([0-9a-f-]{36})$/i);
    if (!m) {
      continue;
    }
    const vals = formData.getAll(k).map(String);
    out[m[1]] = vals.includes("1");
  }
  return out;
}

export async function createVenueAction(
  _prev: VenueActionState,
  formData: FormData,
): Promise<VenueActionState> {
  try {
    const name = String(formData.get("name") ?? "");
    const city = String(formData.get("city") ?? "");
    const courtCount = parseCourtCount(formData.get("court_count"));
    const hours = parseScheduleHours(
      formData.get("schedule_start_hour"),
      formData.get("schedule_end_hour"),
    );
    const status = parseRowStatus(formData.get("status"));
    const is_active = parseIsActiveFromForm(formData.get("is_active"));
    const offeredSportSlugs = sportSlugsFromForm(formData);
    const courtSportSlug = String(formData.get("court_sport") ?? "").trim();
    await insertVenue({
      name,
      city: city.trim() || null,
      courtCount,
      ...hours,
      status,
      is_active,
      offeredSportSlugs,
      courtSportSlug,
    });
    revalidatePath("/venues");
    return okState;
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not create venue.");
  }
}

export async function updateVenueAction(
  _prev: VenueActionState,
  formData: FormData,
): Promise<VenueActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) {
      return err("Missing venue id.");
    }
    const name = String(formData.get("name") ?? "");
    const city = String(formData.get("city") ?? "");
    const courtCount = parseCourtCount(formData.get("court_count"));
    const hours = parseScheduleHours(
      formData.get("schedule_start_hour"),
      formData.get("schedule_end_hour"),
    );
    const status = parseRowStatus(formData.get("status"));
    const is_active = parseIsActiveFromForm(formData.get("is_active"));
    const offeredSportSlugs = sportSlugsFromForm(formData);
    const courtSportsById = courtSportsFromForm(formData);
    const newCourtsSportId = String(
      formData.get("new_courts_sport") ?? "",
    ).trim();
    const deletedCourtIds = deletedCourtIdsFromForm(formData);
    const courtScheduleActiveById = courtScheduleActiveFromForm(formData);
    await updateVenue(id, {
      name,
      city: city.trim() || null,
      courtCount,
      ...hours,
      status,
      is_active,
      offeredSportSlugs,
      courtSportsById,
      newCourtsSportId,
      deletedCourtIds,
      courtScheduleActiveById,
    });
    revalidatePath("/venues");
    return okState;
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not update venue.");
  }
}

export async function deleteVenueAction(
  _prev: VenueActionState,
  formData: FormData,
): Promise<VenueActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) {
      return err("Missing venue id.");
    }
    await deleteVenue(id);
    revalidatePath("/venues");
    return okState;
  } catch (e) {
    return err(e instanceof Error ? e.message : "Could not delete venue.");
  }
}
