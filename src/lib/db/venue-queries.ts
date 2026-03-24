import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
} from "@/lib/schedule-config";

export type VenueListItem = {
  id: string;
  name: string;
};

/** Venues for schedule venue switcher (staff RLS). */
export async function fetchVenuesList(
  supabase: SupabaseClient,
): Promise<VenueListItem[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }
  return (data ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
  }));
}

/** Hourly slot window for the schedule grid (end hour exclusive). */
export async function fetchVenueScheduleWindow(
  supabase: SupabaseClient,
  venueId: string,
): Promise<{ scheduleStartHour: number; scheduleEndHour: number } | null> {
  const { data, error } = await supabase
    .from("venues")
    .select("schedule_start_hour, schedule_end_hour")
    .eq("id", venueId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  const start = data.schedule_start_hour as number | undefined;
  const end = data.schedule_end_hour as number | undefined;
  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    end <= start
  ) {
    return {
      scheduleStartHour: SCHEDULE_START_HOUR,
      scheduleEndHour: SCHEDULE_END_HOUR,
    };
  }
  return { scheduleStartHour: start, scheduleEndHour: end };
}
