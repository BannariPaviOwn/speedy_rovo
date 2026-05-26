import { cookies } from "next/headers";
import type { AdminRole } from "@/lib/types";
import type { StaffContext } from "@/lib/db/staff-queries";
import { getAuthCookieOptions } from "@/lib/auth/supabase-env";

export const STAFF_CONTEXT_COOKIE = "speedy-staff-context";

export type StaffContextCookie = {
  role: AdminRole;
  venueId: string | null;
};

function parseStaffContextCookie(
  value: string | undefined,
): StaffContextCookie | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as StaffContextCookie;
    if (parsed.role !== "superadmin" && parsed.role !== "admin") {
      return null;
    }
    return {
      role: parsed.role,
      venueId: parsed.venueId ?? null,
    };
  } catch {
    return null;
  }
}

/** Read staff role hint set after server sign-in (optional fast path). */
export async function readStaffContextCookie(): Promise<StaffContextCookie | null> {
  const jar = await cookies();
  return parseStaffContextCookie(jar.get(STAFF_CONTEXT_COOKIE)?.value);
}

export async function setStaffContextCookie(ctx: StaffContext | null): Promise<void> {
  const jar = await cookies();
  const base = getAuthCookieOptions();
  if (!ctx?.role) {
    jar.set(STAFF_CONTEXT_COOKIE, "", {
      ...base,
      maxAge: 0,
    });
    return;
  }
  const payload: StaffContextCookie = {
    role: ctx.role,
    venueId: ctx.venueId,
  };
  jar.set(STAFF_CONTEXT_COOKIE, JSON.stringify(payload), {
    ...base,
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
  });
}

export async function clearStaffContextCookie(): Promise<void> {
  await setStaffContextCookie(null);
}
