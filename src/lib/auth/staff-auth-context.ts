import type { Session, User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/server";
import { fetchStaffContext } from "@/lib/db/staff-queries";
import { formatSupabaseError } from "@/lib/db/supabase-errors";
import type { AdminRole } from "@/lib/types";
import { readStaffContextCookie } from "@/lib/auth/staff-cookie";
import {
  hasSupabaseAuthCookies,
  MIDDLEWARE_AUTH_HEADER,
  MIDDLEWARE_USER_EMAIL_HEADER,
  MIDDLEWARE_USER_ID_HEADER,
} from "@/lib/auth/supabase-env";

export type StaffAuthContext = {
  user: User | null;
  session: Session | null;
  role: AdminRole | null;
  venueId: string | null;
};

const empty: StaffAuthContext = {
  user: null,
  session: null,
  role: null,
  venueId: null,
};

async function staffContextForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
  session: Session | null,
  options?: { skipDbFetch?: boolean },
): Promise<StaffAuthContext> {
  const cookieHint = await readStaffContextCookie();
  let role: AdminRole | null = cookieHint?.role ?? null;
  let venueId: string | null = cookieHint?.venueId ?? null;

  if (role && options?.skipDbFetch) {
    return { user, session, role, venueId };
  }

  try {
    const ctx = await fetchStaffContext(supabase, user.id, {
      skipSessionWait: true,
      accessToken: session?.access_token,
    });
    if (ctx?.role) {
      role = ctx.role;
      venueId = ctx.venueId;
    } else if (!role) {
      role = null;
      venueId = null;
    }
  } catch (err) {
    console.error(
      "[getStaffAuthContext] staff role lookup failed",
      formatSupabaseError(err),
      { userId: user.id },
    );
    if (!role) {
      role = null;
      venueId = null;
    }
  }

  return {
    user,
    session,
    role,
    venueId,
  };
}

function userFromMiddlewareHeaders(
  userId: string,
  email: string | null,
): User {
  return {
    id: userId,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;
}

const AUTH_CONTEXT_TIMEOUT_MS = 4_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Session + staff role for Server Components/actions that need auth on the server.
 * Do not call from `(app)/layout` — it blocks dev compiles and duplicates middleware.
 * Uses getSession() only — middleware already refreshed cookies via getUser().
 */
export async function getStaffAuthContext(): Promise<StaffAuthContext> {
  try {
    return await withTimeout(
      getStaffAuthContextInner(),
      AUTH_CONTEXT_TIMEOUT_MS,
      "getStaffAuthContext",
    );
  } catch {
    return empty;
  }
}

async function getStaffAuthContextInner(): Promise<StaffAuthContext> {
  const supabase = await createClient();
  await supabase.auth.stopAutoRefresh();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (!error && session?.user) {
    const cookieHint = await readStaffContextCookie();
    if (cookieHint?.role) {
      return {
        user: session.user,
        session,
        role: cookieHint.role,
        venueId: cookieHint.venueId,
      };
    }
    return staffContextForUser(supabase, session.user, session);
  }

  const hdrs = await headers();
  const middlewareUserId = hdrs.get(MIDDLEWARE_USER_ID_HEADER);
  const middlewareEmail = hdrs.get(MIDDLEWARE_USER_EMAIL_HEADER);
  const middlewareValidated =
    hdrs.get(MIDDLEWARE_AUTH_HEADER) === "1" &&
    Boolean(middlewareUserId) &&
    hasSupabaseAuthCookies((await cookies()).getAll());

  if (middlewareValidated && middlewareUserId) {
    const user = userFromMiddlewareHeaders(
      middlewareUserId,
      middlewareEmail,
    );
    return staffContextForUser(supabase, user, session);
  }

  return empty;
}

function readMiddlewareUser(hdrs: Headers, cookieList: { name: string; value: string }[]) {
  const middlewareUserId = hdrs.get(MIDDLEWARE_USER_ID_HEADER);
  const middlewareEmail = hdrs.get(MIDDLEWARE_USER_EMAIL_HEADER);
  const middlewareValidated =
    hdrs.get(MIDDLEWARE_AUTH_HEADER) === "1" &&
    Boolean(middlewareUserId) &&
    hasSupabaseAuthCookies(cookieList);

  if (!middlewareValidated || !middlewareUserId) {
    return null;
  }

  return userFromMiddlewareHeaders(middlewareUserId, middlewareEmail);
}

/** Middleware-validated user only (headers). No Supabase or DB — safe for layouts. */
export async function getStaffAuthContextFromMiddleware(): Promise<StaffAuthContext> {
  const hdrs = await headers();
  const user = readMiddlewareUser(hdrs, (await cookies()).getAll());
  if (!user) {
    return empty;
  }

  return {
    user,
    session: null,
    role: null,
    venueId: null,
  };
}

/**
 * Initial auth for `(app)/layout`: middleware user + staff cookie hint, with at most
 * one staff_roles query when the cookie is missing. No getUser() — middleware refreshes.
 */
export async function getStaffAuthContextForLayout(): Promise<StaffAuthContext> {
  try {
    return await withTimeout(
      getStaffAuthContextForLayoutInner(),
      AUTH_CONTEXT_TIMEOUT_MS,
      "getStaffAuthContextForLayout",
    );
  } catch {
    return empty;
  }
}

async function getStaffAuthContextForLayoutInner(): Promise<StaffAuthContext> {
  const hdrs = await headers();
  const cookieList = (await cookies()).getAll();
  const user = readMiddlewareUser(hdrs, cookieList);
  if (!user) {
    return empty;
  }

  const cookieHint = await readStaffContextCookie();
  if (cookieHint?.role) {
    return {
      user,
      session: null,
      role: cookieHint.role,
      venueId: cookieHint.venueId,
    };
  }

  const supabase = await createClient();
  await supabase.auth.stopAutoRefresh();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return staffContextForUser(supabase, user, session, { skipDbFetch: false });
}
