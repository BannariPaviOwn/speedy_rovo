/** Default schedule granularity + booking lengths when a sport is added to a venue. */
export function defaultVenueSportSettings(slug: string): {
  slot_step_minutes: 30 | 60;
  duration_options_minutes: number[];
} {
  if (slug === "cricket") {
    return {
      slot_step_minutes: 30,
      duration_options_minutes: [60, 90, 120],
    };
  }
  return {
    slot_step_minutes: 60,
    duration_options_minutes: [60],
  };
}
