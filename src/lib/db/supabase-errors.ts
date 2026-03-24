/**
 * Supabase / PostgREST errors may not stringify as JSON; avoid `console.error(e)` → `{}`.
 */
export function formatSupabaseError(e: unknown): string {
  if (e instanceof Error && e.message) {
    return e.message;
  }
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = o.message;
    const details = o.details;
    const hint = o.hint;
    const code = o.code;
    const parts = [msg, details, hint, code].filter(
      (x) => x !== undefined && x !== null && String(x).length > 0,
    );
    if (parts.length > 0) {
      return parts.map(String).join(" · ");
    }
  }
  if (typeof e === "string") {
    return e;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}
