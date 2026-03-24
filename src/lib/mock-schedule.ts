import type { SlotKind } from "./types";
import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  SLOT_STEP_MINUTES,
  generateSlotTimes,
} from "./schedule-config";

export type CourtInfo = {
  id: string;
  name: string;
};

export const mockCourts: CourtInfo[] = [
  { id: "c1", name: "COURT 01" },
  { id: "c2", name: "COURT 02" },
  { id: "c3", name: "COURT 03" },
  { id: "c4", name: "COURT 04" },
  { id: "c5", name: "COURT 05" },
];

export type ScheduleCell = {
  kind: SlotKind;
  label?: string;
  subtitle?: string;
  /** Plan / tier / member id line (membership slots). */
  membershipDetail?: string;
  /** Short admin note (membership slots). */
  notes?: string;
};

const allBlocked: ScheduleCell = {
  kind: "blocked",
  label: "BLOCKED",
  subtitle: "—",
};

/** Every court × hour is blocked (swap when wiring real availability). */
export function buildMockScheduleGrid(): Map<string, ScheduleCell> {
  const times = generateSlotTimes(
    SCHEDULE_START_HOUR,
    SCHEDULE_END_HOUR,
    SLOT_STEP_MINUTES,
  );
  const map = new Map<string, ScheduleCell>();

  mockCourts.forEach((court) => {
    times.forEach((slot) => {
      map.set(`${court.id}::${slot.key}`, allBlocked);
    });
  });

  return map;
}

export const mockScheduleGrid = buildMockScheduleGrid();
