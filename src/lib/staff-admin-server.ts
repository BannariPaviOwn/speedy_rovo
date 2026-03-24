import { usernamesForUserIds } from "@/lib/audit-usernames";
import { createClient } from "@/lib/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { authEmailToUsername, usernameToAuthEmail } from "@/lib/username-auth";

export type VenueOption = {
  id: string;
  name: string;
};

export async function assertSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized");
  }
  const { data: row, error } = await supabase
    .from("staff_roles")
    .select("role, is_active, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!row || row.role !== "superadmin") {
    throw new Error("Forbidden");
  }
  if (row.is_active === false || row.status !== "active") {
    throw new Error("Forbidden");
  }
  return user;
}

/** Venues shown on the Admins “invite” form (superadmin only). */
export async function listVenuesForStaffInvite(): Promise<VenueOption[]> {
  await assertSuperadmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, name")
    .eq("is_active", true)
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
  }));
}

export type StaffDirectoryRow = {
  userId: string;
  /** Login handle; synthetic-email accounts show username only in UI */
  username: string | null;
  role: string;
  /** Current `staff_roles.venue_id` (admins only). */
  venueId: string | null;
  venueName: string | null;
  createdAt: string;
  rowStatus: string;
  isActive: boolean;
  /** Staff row: who invited / last changed role flags (superadmin). */
  createdByUsername: string | null;
  updatedByUsername: string | null;
};

export async function listStaffDirectory(): Promise<StaffDirectoryRow[]> {
  await assertSuperadmin();
  const admin = createSupabaseAdmin();
  const { data: roles, error } = await admin
    .from("staff_roles")
    .select(
      "user_id, role, venue_id, created_at, status, is_active, created_by, updated_by",
    )
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }

  const { data: venueRows } = await admin.from("venues").select("id, name");
  const venueNameById = new Map(
    (venueRows ?? []).map((v) => [v.id as string, v.name as string]),
  );

  const rels = (roles ?? []) as {
    user_id: string;
    role: string;
    venue_id: string | null;
    created_at: string;
    status: string;
    is_active: boolean;
    created_by: string | null;
    updated_by: string | null;
  }[];

  const labelMap = await usernamesForUserIds(
    rels.flatMap((rel) => [rel.created_by, rel.updated_by]),
  );

  const rows: StaffDirectoryRow[] = [];
  for (const rel of rels) {
    const venueName = rel.venue_id
      ? (venueNameById.get(rel.venue_id) ?? null)
      : null;
    const { data: authData, error: authErr } =
      await admin.auth.admin.getUserById(rel.user_id);
    const cb = rel.created_by ? (labelMap.get(rel.created_by) ?? null) : null;
    const ub = rel.updated_by ? (labelMap.get(rel.updated_by) ?? null) : null;
    if (authErr) {
      rows.push({
        userId: rel.user_id,
        username: null,
        role: rel.role,
        venueId: rel.venue_id,
        venueName,
        createdAt: rel.created_at,
        rowStatus: rel.status,
        isActive: rel.is_active,
        createdByUsername: cb,
        updatedByUsername: ub,
      });
      continue;
    }
    rows.push({
      userId: rel.user_id,
      username: authEmailToUsername(authData.user?.email ?? null),
      role: rel.role,
      venueId: rel.venue_id,
      venueName,
      createdAt: rel.created_at,
      rowStatus: rel.status,
      isActive: rel.is_active,
      createdByUsername: cb,
      updatedByUsername: ub,
    });
  }
  return rows;
}

export async function createAdminUser(params: {
  username: string;
  password: string;
  /** Required: which venue this admin manages (stored in `staff_roles.venue_id`). */
  venueId: string;
}): Promise<{ userId: string }> {
  const actor = await assertSuperadmin();
  const admin = createSupabaseAdmin();
  if (!params.username?.trim() || !params.password) {
    throw new Error("Username and password are required.");
  }
  if (params.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  let email: string;
  try {
    email = usernameToAuthEmail(params.username);
  } catch (e) {
    throw e instanceof Error ? e : new Error("Invalid username.");
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password: params.password,
      email_confirm: true,
    },
  );
  if (createErr || !created.user) {
    throw new Error(createErr?.message ?? "Could not create user.");
  }

  const venueId = params.venueId.trim();
  if (!venueId) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error("Select a venue for this admin.");
  }

  const { error: roleErr } = await admin.from("staff_roles").insert({
    user_id: created.user.id,
    role: "admin",
    venue_id: venueId,
    status: "active",
    is_active: true,
    created_by: actor.id,
    updated_by: actor.id,
  });
  if (roleErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(roleErr.message);
  }

  return { userId: created.user.id };
}

/** Reassign which venue an admin manages (superadmin only, service role). */
export async function updateAdminVenueScope(params: {
  userId: string;
  venueId: string;
}): Promise<void> {
  const actor = await assertSuperadmin();
  if (actor.id === params.userId) {
    throw new Error("Use another superadmin to change your own venue scope.");
  }
  const admin = createSupabaseAdmin();
  const { data: target, error: fetchErr } = await admin
    .from("staff_roles")
    .select("user_id, role")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (fetchErr) {
    throw new Error(fetchErr.message);
  }
  if (!target) {
    throw new Error("Staff member not found.");
  }
  if (target.role !== "admin") {
    throw new Error("Only venue admins have a venue scope to edit.");
  }
  const venueId = params.venueId.trim();
  if (!venueId) {
    throw new Error("Select a venue.");
  }
  const { data: venue, error: vErr } = await admin
    .from("venues")
    .select("id")
    .eq("id", venueId)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();
  if (vErr || !venue) {
    throw new Error("That venue is not available. Pick an active venue.");
  }
  const { error } = await admin
    .from("staff_roles")
    .update({ venue_id: venueId, updated_by: actor.id })
    .eq("user_id", params.userId);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Remove `staff_roles` and delete the auth user (superadmin only).
 * Blocks deleting yourself and removing the last superadmin.
 */
export async function deleteStaffMember(userId: string): Promise<void> {
  const actor = await assertSuperadmin();
  if (actor.id === userId) {
    throw new Error("You cannot delete your own account from this screen.");
  }
  const admin = createSupabaseAdmin();
  const { data: roles, error: listErr } = await admin
    .from("staff_roles")
    .select("user_id, role");
  if (listErr) {
    throw new Error(listErr.message);
  }
  const list = roles ?? [];
  const target = list.find((r) => (r as { user_id: string }).user_id === userId);
  if (!target) {
    throw new Error("Staff member not found.");
  }
  const role = (target as { role: string }).role;
  const superCount = list.filter((r) => (r as { role: string }).role === "superadmin")
    .length;
  if (role === "superadmin" && superCount <= 1) {
    throw new Error("Cannot delete the only superadmin.");
  }
  const { error: delRoleErr } = await admin
    .from("staff_roles")
    .delete()
    .eq("user_id", userId);
  if (delRoleErr) {
    throw new Error(delRoleErr.message);
  }
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    throw new Error(authErr.message);
  }
}
