/** First slot starts at this hour (24h). */
export const SCHEDULE_START_HOUR = 6;
/** Schedule runs until this hour (24h); last hour block ends at this time. */
export const SCHEDULE_END_HOUR = 22;
/** Each row is one hour (60 minutes). */
export const SLOT_STEP_MINUTES = 60;

export type SlotTime = {
  /** Unique key, e.g. "09:00" */
  key: string;
  label: string;
  startMinutes: number;
};

/**
 * Hourly slot starts from startHour through endHour (exclusive end),
 * e.g. 6:00 … 21:00 when end is 22:00 and step is 60.
 */
export function generateSlotTimes(
  startHour = SCHEDULE_START_HOUR,
  endHour = SCHEDULE_END_HOUR,
  stepMinutes = SLOT_STEP_MINUTES,
): SlotTime[] {
  const out: SlotTime[] = [];
  let t = startHour * 60;
  const end = endHour * 60;
  while (t < end) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    out.push({
      key,
      label: key,
      startMinutes: t,
    });
    t += stepMinutes;
  }
  return out;
}
