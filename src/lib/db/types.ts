/**
 * Mirrors `supabase/migrations/*_rovo_court_schema.sql` for typed queries.
 * Regenerate with Supabase CLI later: `supabase gen types typescript`
 */

import type { SlotKind } from "@/lib/types";

export type DbSlotKind = SlotKind;

export type DbAdminRole = "superadmin" | "admin";

export type DbBookingStatus = "confirmed" | "waitlist" | "cancelled";

export type VenueRow = {
  id: string;
  name: string;
  city: string | null;
  /** First slot hour (0–23), inclusive. */
  schedule_start_hour: number;
  /** Exclusive end hour (1–24). Last slot starts at end − 1. */
  schedule_end_hour: number;
  /** Lifecycle: active, inactive, draft, archived. */
  status: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CourtRow = {
  id: string;
  venue_id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  status: string;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
};

/** One grid cell: court × date × hour — maps to ScheduleCell + slot edit modal. */
export type CourtSlotEntryRow = {
  id: string;
  court_id: string;
  slot_date: string;
  start_time: string;
  kind: DbSlotKind;
  label: string | null;
  subtitle: string | null;
  membership_detail: string | null;
  notes: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type BookingRow = {
  id: string;
  court_slot_entry_id: string | null;
  player_name: string;
  status: DbBookingStatus;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type StaffRoleRow = {
  user_id: string;
  role: DbAdminRole;
  venue_id: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
};
