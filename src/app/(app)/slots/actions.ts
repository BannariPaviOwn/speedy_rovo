"use server";

import { usernamesForUserIds } from "@/lib/audit-usernames";
import { fetchStaffContext } from "@/lib/db/staff-queries";
import { createClient } from "@/lib/server";
import { assertSuperadmin } from "@/lib/staff-admin-server";

/** Resolve login usernames for slot `updated_by` user ids (superadmin only). */
export async function resolveSlotEditorUsernames(
  userIds: string[],
): Promise<Record<string, string>> {
  await assertSuperadmin();
  const map = await usernamesForUserIds(userIds);
  return Object.fromEntries(map);
}

/**
 * Resolve login usernames for venue admins (staff only; ids must belong to that venue).
 */
export async function resolveVenueAdminUsernames(
  venueId: string,
  userIds: string[],
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const ctx = await fetchStaffContext(supabase, user.id);
  if (!ctx) {
    throw new Error("Forbidden");
  }
  if (ctx.role === "admin" && ctx.venueId !== venueId) {
    throw new Error("Forbidden");
  }

  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }

  const { data: rows, error } = await supabase
    .from("staff_roles")
    .select("user_id")
    .eq("venue_id", venueId)
    .eq("role", "admin")
    .eq("is_active", true)
    .eq("status", "active")
    .in("user_id", unique);

  if (error) {
    throw new Error(error.message);
  }

  const allowed = new Set(
    (rows ?? []).map((r) => r.user_id as string),
  );
  const toResolve = unique.filter((id) => allowed.has(id));
  const map = await usernamesForUserIds(toResolve);
  return Object.fromEntries(map);
}
