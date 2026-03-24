/** Matches `venues_status_check` and related constraints in migrations. */
export const ROW_STATUSES = [
  "active",
  "inactive",
  "draft",
  "archived",
] as const;

export type RowStatus = (typeof ROW_STATUSES)[number];

export function parseRowStatus(raw: unknown): RowStatus {
  const s = String(raw ?? "active").trim().toLowerCase();
  if ((ROW_STATUSES as readonly string[]).includes(s)) {
    return s as RowStatus;
  }
  throw new Error(`Invalid status. Choose one of: ${ROW_STATUSES.join(", ")}.`);
}

/** HTML checkbox: value "on" / "true" = true; omitted = false (use defaultChecked on inputs). */
export function parseIsActiveFromForm(
  raw: FormDataEntryValue | null,
): boolean {
  if (raw === null) {
    return false;
  }
  const v = String(raw).toLowerCase();
  return v === "on" || v === "true" || v === "1";
}
