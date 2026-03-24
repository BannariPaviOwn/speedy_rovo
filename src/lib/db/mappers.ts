import type { SlotKind } from "@/lib/types";
import type { ScheduleCell } from "@/lib/mock-schedule";

/** Row shape returned from `court_slot_entries` + optional `courts` join. */
export type CourtSlotEntryDbRow = {
  court_id: string;
  start_time: string;
  kind: SlotKind;
  label: string | null;
  subtitle: string | null;
  membership_detail: string | null;
  notes: string | null;
  till_date: string | null;
  updated_by: string | null;
};

/** Grid key used in the UI: `c1::09:00` */
export function makeSlotKey(courtSlug: string, timeKey: string): string {
  return `${courtSlug}::${timeKey}`;
}

export function parseSlotKey(key: string): { courtSlug: string; timeKey: string } {
  const idx = key.indexOf("::");
  if (idx === -1) {
    throw new Error(`Invalid slot key: ${key}`);
  }
  return {
    courtSlug: key.slice(0, idx),
    timeKey: key.slice(idx + 2),
  };
}

/** Normalizes DB / API time strings to `HH:MM` for keys. */
export function normalizeTimeKey(t: string): string {
  const s = t.trim();
  if (s.length >= 5) {
    return s.slice(0, 5);
  }
  return s;
}

export function mapCourtSlotEntryToScheduleCell(
  row: CourtSlotEntryDbRow,
): ScheduleCell {
  const kind = row.kind;
  const base: ScheduleCell = {
    kind,
    label: row.label ?? undefined,
    subtitle: row.subtitle ?? undefined,
    membershipDetail: row.membership_detail ?? undefined,
    notes: row.notes ?? undefined,
    tillDate: row.till_date ?? undefined,
    updatedByUserId: row.updated_by ?? undefined,
  };
  return base;
}

export function scheduleCellToDbPayload(cell: ScheduleCell): {
  kind: SlotKind;
  label: string | null;
  subtitle: string | null;
  membership_detail: string | null;
  notes: string | null;
} {
  return {
    kind: cell.kind,
    label: cell.label ?? null,
    subtitle: cell.subtitle ?? null,
    membership_detail: cell.membershipDetail ?? null,
    notes: cell.notes ?? null,
  };
}
