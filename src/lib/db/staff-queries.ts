import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole } from "@/lib/types";

export type StaffContext = {
  role: AdminRole;
  /** Set for `admin`; `null` for `superadmin` */
  venueId: string | null;
};

export async function fetchStaffContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<StaffContext | null> {
  const { data, error } = await supabase
    .from("staff_roles")
    .select("role, venue_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.role) {
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
): Promise<AdminRole | null> {
  const ctx = await fetchStaffContext(supabase, userId);
  return ctx?.role ?? null;
}
