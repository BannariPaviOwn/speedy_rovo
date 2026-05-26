/**
 * After login, redirect only to same-origin paths (avoid open redirects).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw == null || raw === "") {
    return fallback;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  if (raw.includes("://") || raw.includes("\\")) {
    return fallback;
  }
  return raw;
}
