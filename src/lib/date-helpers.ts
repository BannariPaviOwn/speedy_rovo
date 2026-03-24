export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Calendar day `d` plus `delta` days (local timezone). */
export function addDays(d: Date, delta: number): Date {
  const x = new Date(startOfDay(d));
  x.setDate(x.getDate() + delta);
  return x;
}

/** True if `day` is strictly before today's calendar date (local). */
export function isBeforeToday(day: Date): boolean {
  return startOfDay(day).getTime() < startOfDay(new Date()).getTime();
}

/** Consecutive calendar days starting at `start` (inclusive). */
export function eachDay(start: Date, count: number): Date[] {
  const s = startOfDay(start);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(s);
    d.setDate(s.getDate() + i);
    return d;
  });
}

/** Local calendar date as `YYYY-MM-DD` (for DB `date` columns). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseLocalDateString(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Every local calendar day from `startYmd` through `endYmd` (inclusive), as `YYYY-MM-DD`.
 * If `endYmd` is before `startYmd`, returns only `startYmd`.
 */
export function eachLocalDateInRangeInclusive(
  startYmd: string,
  endYmd: string,
): string[] {
  const start = startOfDay(parseLocalDateString(startYmd));
  const end = startOfDay(parseLocalDateString(endYmd));
  if (end < start) {
    return [startYmd];
  }
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(toLocalDateString(d));
  }
  return out;
}
