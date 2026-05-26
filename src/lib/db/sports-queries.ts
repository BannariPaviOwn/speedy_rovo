import type { SupabaseClient } from "@supabase/supabase-js";

export type VenueSportScheduleConfig = {
  sportId: string;
  slug: string;
  name: string;
  slotStepMinutes: number;
  durationOptionsMinutes: number[];
};

/** Sports offered at a venue + grid / booking settings (staff RLS). */
export async function fetchVenueSportsForSchedule(
  supabase: SupabaseClient,
  venueId: string,
): Promise<VenueSportScheduleConfig[]> {
  const { data, error } = await supabase
    .from("venue_sports")
    .select(
      `
      sport_id,
      slot_step_minutes,
      duration_options_minutes,
      sports ( id, slug, name, sort_order )
    `,
    )
    .eq("venue_id", venueId);

  if (error) {
    throw error;
  }

  type JoinRow = {
    sport_id: string;
    slot_step_minutes: number;
    duration_options_minutes: number[] | null;
    sports:
      | {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
        }
      | {
          id: string;
          slug: string;
          name: string;
          sort_order: number;
        }[]
      | null;
  };

  const rows = (data ?? []) as unknown as JoinRow[];

  const out: VenueSportScheduleConfig[] = [];
  for (const r of rows) {
    const sp = r.sports;
    const s = Array.isArray(sp) ? sp[0] : sp;
    if (!s?.id) {
      continue;
    }
    const opts = r.duration_options_minutes;
    out.push({
      sportId: r.sport_id,
      slug: s.slug,
      name: s.name,
      slotStepMinutes: r.slot_step_minutes,
      durationOptionsMinutes:
        Array.isArray(opts) && opts.length > 0 ? opts : [r.slot_step_minutes],
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
