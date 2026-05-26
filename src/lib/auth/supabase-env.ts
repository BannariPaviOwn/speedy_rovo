import type { CookieOptions } from "@supabase/ssr";

/** Header set by middleware after a successful `getUser()` for this navigation. */
export const MIDDLEWARE_AUTH_HEADER = "x-supabase-middleware-auth";
export const MIDDLEWARE_USER_ID_HEADER = "x-supabase-user-id";
export const MIDDLEWARE_USER_EMAIL_HEADER = "x-supabase-user-email";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabaseEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

/** True when Supabase auth cookies are present (any chunk). */
export function hasSupabaseAuthCookies(
  cookies: { name: string; value: string }[],
) {
  return cookies.some(
    (c) =>
      c.name.startsWith("sb-") &&
      (c.name.includes("auth-token") || c.name.includes("auth-token-code-verifier")),
  );
}

/** Cookie names for Supabase auth (any chunk). */
export function listSupabaseAuthCookieNames(
  cookies: { name: string }[],
): string[] {
  return cookies
    .map((c) => c.name)
    .filter(
      (name) =>
        name.startsWith("sb-") &&
        (name.includes("auth-token") ||
          name.includes("auth-token-code-verifier")),
    );
}

/**
 * Shared cookie options for browser + server Supabase clients.
 * `secure: false` in development so http://localhost can persist `sb-*-auth-token`.
 */
export function getAuthCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: isProd,
  };
}

export const serverAuthClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
  },
} as const;

/** Runs auth storage work without navigator.locks (avoids stolen-lock races after server sign-in). */
export async function browserAuthLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return fn();
}

export const browserAuthClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
    lock: browserAuthLock,
  },
} as const;
