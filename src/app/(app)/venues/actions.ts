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
    await insertVenue({
      name,
      city: city.trim() || null,
      courtCount,
      ...hours,
      status,
      is_active,
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
    await updateVenue(id, {
      name,
      city: city.trim() || null,
      courtCount,
      ...hours,
      status,
      is_active,
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
