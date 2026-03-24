import type { SlotKind } from "./types";
import type { ScheduleCell } from "./mock-schedule";

/** Builds a cell payload from the edit form. */
export function cellFromForm(
  kind: SlotKind,
  input: {
    subtitle: string;
    membershipDetail: string;
    notes: string;
  },
): ScheduleCell {
  const sub = input.subtitle.trim();
  const md = input.membershipDetail.trim();
  const nt = input.notes.trim();

  switch (kind) {
    case "available":
      return { kind: "available" };
    case "booked":
      return {
        kind: "booked",
        label: "BOOKED",
        subtitle: sub || "Open slot",
      };
    case "reserved":
      return {
        kind: "reserved",
        label: "RESERVED",
        subtitle: sub || "—",
      };
    case "maintenance":
      return {
        kind: "maintenance",
        label: "MAINTENANCE",
        subtitle: sub || "—",
      };
    case "blocked":
      return {
        kind: "blocked",
        label: "BLOCKED",
        subtitle: sub || "—",
      };
    case "membership":
      return {
        kind: "membership",
        label: "MEMBERSHIP",
        membershipDetail: md || "—",
        notes: nt,
        subtitle: [md, nt].filter(Boolean).join(" · ") || "—",
      };
    default:
      return { kind: "available" };
  }
}

export function formDefaultsFromCell(cell: ScheduleCell): {
  kind: SlotKind;
  subtitle: string;
  membershipDetail: string;
  notes: string;
} {
  return {
    kind: cell.kind,
    subtitle: cell.subtitle ?? "",
    membershipDetail: cell.membershipDetail ?? "",
    notes: cell.notes ?? "",
  };
}
