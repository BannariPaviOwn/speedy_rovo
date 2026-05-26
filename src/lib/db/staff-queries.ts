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
