/** Shown in UI when Supabase Auth returns HTTP 429. */
export const AUTH_RATE_LIMIT_USER_MESSAGE =
  "Too many sign-in requests. Wait a minute, use a single browser tab, then try again.";

/** True when Supabase Auth is throttling requests (do not sign out or retry in a loop). */
export function isAuthRateLimitError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("over_request_rate_limit") ||
    lower.includes("429")
  );
}

/**
 * Parallel refresh races — keep cookies and let the next navigation or client read succeed.
 * Do not sign out or redirect to login for these.
 */
export function isRefreshTokenRaceError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("refresh_token_already_used") ||
    (lower.includes("already used") && lower.includes("refresh"))
  );
}

/** Transient auth errors: pass the request through without clearing the session. */
export function isTransientAuthError(message: string) {
  return isAuthRateLimitError(message) || isRefreshTokenRaceError(message);
}

/**
 * Session is unusable; clear cookies once and send the user to sign-in.
 * Excludes refresh-token races (handled as transient).
 */
export function shouldClearSessionOnAuthError(message: string) {
  if (isTransientAuthError(message)) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid refresh") ||
    lower.includes("refresh token not found") ||
    lower.includes("refresh_token_not_found") ||
    lower.includes("jwt expired") ||
    lower.includes("token is expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("malformed jwt") ||
    lower.includes("user not found")
  );
}
