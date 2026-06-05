import { makeSlotKey } from "@/lib/db/mappers";
import type { ScheduleCell } from "@/lib/mock-schedule";

/** True when this time row is covered by another booking's duration anchor. */
export function courtHasSlotConflictAtTime(
  cells: Map<string, ScheduleCell>,
  courtSlug: string,
  anchorTimeKey: string,
): boolean {
  const cell = cells.get(makeSlotKey(courtSlug, anchorTimeKey));
  if (!cell) {
    return false;
  }
  const rowAnchor = cell.slotAnchorTimeKey ?? anchorTimeKey;
  if (rowAnchor === anchorTimeKey) {
    return false;
  }
  return cell.kind !== "blocked" && cell.kind !== "available";
}

export function formatSlotEditHeader(
  anchorCourtName: string,
  selectedCount: number,
  timeLabel: string,
): string {
  if (selectedCount <= 1) {
    return `${anchorCourtName} · ${timeLabel}`;
  }
  const extra = selectedCount - 1;
  const moreLabel = extra === 1 ? "1 more" : `${extra} more`;
  return `${anchorCourtName} + ${moreLabel} · ${timeLabel}`;
}
