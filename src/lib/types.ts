export type AdminRole = "superadmin" | "admin";

/** Schedule cell category — matches admin legend + membership. */
export type SlotKind =
  | "booked"
  | "coaching"
  | "reserved"
  | "maintenance"
  | "available"
  | "blocked"
  | "membership"
  | "cancelled";

export const SLOT_KIND_OPTIONS: { value: SlotKind; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "booked", label: "Booked" },
  { value: "coaching", label: "Coaching" },
  { value: "cancelled", label: "Cancelled" },
  { value: "reserved", label: "Reserved" },
  { value: "membership", label: "Membership" },
  { value: "maintenance", label: "Maintenance" },
  { value: "blocked", label: "Blocked" },
];
