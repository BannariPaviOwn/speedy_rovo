import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_SESSION_EXPIRED_PARAM } from "@/lib/auth/constants";
import {
  getAuthCookieOptions,
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabaseAuthCookies,
  MIDDLEWARE_AUTH_HEADER,
  MIDDLEWARE_USER_EMAIL_HEADER,
  MIDDLEWARE_USER_ID_HEADER,
  serverAuthClientOptions,
} from "@/lib/auth/supabase-env";
import {
  isAuthRateLimitError,
  isTransientAuthError,
  shouldClearSessionOnAuthError,
} from "@/lib/auth/session-errors";

/** Preserve refreshed session cookies when issuing redirects or new responses. */
function withSupabaseCookies(
  target: NextResponse,
  supabaseResponse: NextResponse,
) {
  for (const { name, value, ...options } of supabaseResponse.cookies.getAll()) {
    target.cookies.set(name, value, options);
  }
  return target;
}

function loginRedirect(
  request: NextRequest,
  supabaseResponse: NextResponse,
  options?: { sessionExpired?: boolean; returnTo?: string },
) {
  const loginUrl = new URL("/login", request.url);
  if (options?.returnTo) {
    loginUrl.searchParams.set("next", options.returnTo);
  }
  if (options?.sessionExpired) {
    loginUrl.searchParams.set("error", LOGIN_SESSION_EXPIRED_PARAM);
  }
  return withSupabaseCookies(
    NextResponse.redirect(loginUrl),
    supabaseResponse,
  );
}

function nextForRequest(
  request: NextRequest,
  supabaseResponse: NextResponse,
  user?: { id: string; email?: string | null },
) {
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set(MIDDLEWARE_AUTH_HEADER, "1");
    requestHeaders.set(MIDDLEWARE_USER_ID_HEADER, user.id);
    if (user.email) {
      requestHeaders.set(MIDDLEWARE_USER_EMAIL_HEADER, user.email);
    }
  }
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return withSupabaseCookies(response, supabaseResponse);
}

/**
 * Single server-side refresh point per document navigation.
 * Downstream Server Components should use getSession() only (see getStaffAuthContext).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const path = request.nextUrl.pathname;
  const isLogin = path === "/login" || path.startsWith("/login/");

  if (path === "/" && request.method === "GET") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // No Supabase round-trip on the sign-in page (avoids slow auth on /login).
  if (isLogin) {
    return supabaseResponse;
  }

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    const returnTo = `${path}${request.nextUrl.search}`;
    return loginRedirect(request, supabaseResponse, { returnTo });
  }

  const supabase = createServerClient(url, key, {
    cookieOptions: getAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
    ...serverAuthClientOptions,
  });

  await supabase.auth.stopAutoRefresh();

  let user = null;
  let authFailed = false;
  let authTransient = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const message = error.message;
      if (isAuthRateLimitError(message)) {
        authTransient = true;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        user = session?.user ?? null;
      } else if (isTransientAuthError(message)) {
        authTransient = true;
      } else if (
        hasSupabaseAuthCookies(request.cookies.getAll()) &&
        shouldClearSessionOnAuthError(message)
      ) {
        authFailed = true;
        await supabase.auth.signOut();
      }
    } else {
      user = data.user;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isAuthRateLimitError(message)) {
      authTransient = true;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      user = session?.user ?? null;
    } else if (isTransientAuthError(message)) {
      authTransient = true;
    } else if (
      hasSupabaseAuthCookies(request.cookies.getAll()) &&
      shouldClearSessionOnAuthError(message)
    ) {
      authFailed = true;
      await supabase.auth.signOut();
    }
  }

  if (!isLogin && !user) {
    const hasAuthCookies = hasSupabaseAuthCookies(request.cookies.getAll());
    if (authTransient && hasAuthCookies) {
      return nextForRequest(request, supabaseResponse);
    }
    const returnTo = `${path}${request.nextUrl.search}`;
    return loginRedirect(request, supabaseResponse, {
      returnTo,
      sessionExpired: authFailed,
    });
  }

  return nextForRequest(
    request,
    supabaseResponse,
    user ? { id: user.id, email: user.email } : undefined,
  );
}
