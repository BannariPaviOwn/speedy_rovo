import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole } from "@/lib/types";
import { formatSupabaseError } from "@/lib/db/supabase-errors";
import {
  AUTH_RATE_LIMIT_USER_MESSAGE,
  isAuthRateLimitError,
} from "@/lib/auth/session-errors";

export type StaffContext = {
  role: AdminRole;
  /** Set for `admin`; `null` for `superadmin` */
  venueId: string | null;
};

const STAFF_CONTEXT_LOG = "[fetchStaffContext]";

export type FetchStaffContextOptions = {
  /** Known access token — skips any `auth.getSession()` call. */
  accessToken?: string;
  /** Middleware/server already refreshed cookies; query with cookie JWT only. */
  skipSessionWait?: boolean;
};

async function readSessionOnce(
  supabase: SupabaseClient,
): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    const msg = formatSupabaseError(error);
    if (isAuthRateLimitError(msg)) {
      throw new Error(AUTH_RATE_LIMIT_USER_MESSAGE);
    }
    console.warn(
      STAFF_CONTEXT_LOG,
      "getSession before staff_roles query",
      msg,
    );
    return null;
  }
  return data.session?.access_token ? data.session : null;
}

/**
 * Load active staff role for the signed-in auth user.
 * Returns null when there is no row, or the row is inactive (not an RLS error).
 */
export async function fetchStaffContext(
  supabase: SupabaseClient,
  userId: string,
  options?: FetchStaffContextOptions,
): Promise<StaffContext | null> {
  const hasToken =
    Boolean(options?.accessToken) || Boolean(options?.skipSessionWait);

  if (!hasToken) {
    const session = await readSessionOnce(supabase);
    if (!session?.access_token) {
      console.warn(STAFF_CONTEXT_LOG, "no JWT yet — skipping staff_roles query", {
        userId,
      });
      return null;
    }
  }

  const { data, error } = await supabase
    .from("staff_roles")
    .select("role, venue_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    const msg = formatSupabaseError(error);
    console.error(STAFF_CONTEXT_LOG, msg, {
      userId,
      code: (error as { code?: string }).code,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    throw new Error(
      `Could not load staff_roles (check RLS / migrations): ${msg}`,
    );
  }
  if (!data?.role) {
    const { data: inactiveRow, error: inactiveErr } = await supabase
      .from("staff_roles")
      .select("role, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (inactiveErr) {
      const msg = formatSupabaseError(inactiveErr);
      console.error(STAFF_CONTEXT_LOG, "inactive probe failed", msg, {
        userId,
        code: (inactiveErr as { code?: string }).code,
      });
      throw new Error(`Could not load staff_roles: ${msg}`);
    }
    if (inactiveRow) {
      console.warn(STAFF_CONTEXT_LOG, "staff_roles row is inactive or non-active status", {
        userId,
        role: inactiveRow.role,
        status: inactiveRow.status,
        is_active: inactiveRow.is_active,
      });
    } else {
      console.warn(
        STAFF_CONTEXT_LOG,
        "no staff_roles row for user — grant superadmin/admin in Supabase SQL Editor",
        { userId },
      );
    }
    return null;
  }
  return {
    role: data.role as AdminRole,
    venueId: (data.venue_id as string | null) ?? null,
  };
}

export async function fetchStaffRole(
  supabase: SupabaseClient,
  userId: string,
  options?: FetchStaffContextOptions,
): Promise<AdminRole | null> {
  const ctx = await fetchStaffContext(supabase, userId, options);
  return ctx?.role ?? null;
}

export type VenueAdminContact = {
  userId: string;
  /** E.164-ish or local format as stored */
  contactPhone: string | null;
};

/** Active venue admins for schedule “contact” strip (RLS: same venue or superadmin). */
export async function fetchVenueAdminContacts(
  supabase: SupabaseClient,
  venueId: string,
): Promise<VenueAdminContact[]> {
  const { data, error } = await supabase
    .from("staff_roles")
    .select("user_id, contact_phone")
    .eq("role", "admin")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    contactPhone: (r.contact_phone as string | null) ?? null,
  }));
}
