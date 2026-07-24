import type { SlotKind } from "./types";
import type { ScheduleCell } from "./mock-schedule";

/** Em dash / en dash / hyphen placeholders used as empty cell lines. */
const PLACEHOLDER_DETAIL = /^(?:—|–|-|−)$/;

/** True when membership detail is empty or only a dash placeholder. */
export function isBlankMembershipDetail(value: string): boolean {
  const t = value.trim();
  return t.length === 0 || PLACEHOLDER_DETAIL.test(t);
}

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
  const membershipLine = isBlankMembershipDetail(md) ? "" : md;

  switch (kind) {
    case "available":
      return { kind: "available" };
    case "booked":
      return {
        kind: "booked",
        label: "BOOKED",
        subtitle: sub || "Open slot",
      };
    case "coaching":
      return {
        kind: "coaching",
        label: "COACHING",
        subtitle: sub || "—",
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
    case "cancelled":
      return {
        kind: "cancelled",
        label: "CANCELLED",
        subtitle: sub || "—",
      };
    case "membership":
      return {
        kind: "membership",
        label: "MEMBERSHIP",
        membershipDetail: membershipLine || "—",
        notes: nt,
        subtitle: [membershipLine, nt].filter(Boolean).join(" · ") || "—",
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
  const rawMd = cell.membershipDetail ?? "";
  return {
    kind: cell.kind,
    subtitle: cell.subtitle ?? "",
    // Don't pre-fill the input with a dash placeholder — show empty + hint instead.
    membershipDetail: isBlankMembershipDetail(rawMd) ? "" : rawMd,
    notes: cell.notes ?? "",
  };
}
