import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminsPageClient } from "@/components/admins/admins-page-client";
import { createClient } from "@/lib/server";
import {
  hasSupabaseServiceRole,
  listStaffDirectory,
  listVenuesForStaffInvite,
} from "@/lib/staff-admin-server";

export default async function AdminsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  try {
    const rows = await listStaffDirectory();
    const venues = await listVenuesForStaffInvite();
    const hasServiceRole = hasSupabaseServiceRole();
    const needsUsernameSetupHint =
      !hasServiceRole && rows.some((r) => !r.username);
    return (
      <AdminsPageClient
        rows={rows}
        venues={venues}
        currentUserId={user?.id ?? ""}
        canManageStaff={hasServiceRole}
        needsUsernameSetupHint={needsUsernameSetupHint}
      />
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      redirect("/login?next=/admins");
    }
    if (msg === "Forbidden") {
      return (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Admins
          </h1>
          <p className="text-[var(--text-muted)]">
            Only superadmins can manage staff accounts.
          </p>
          <Link
            href="/slots"
            className="inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            Back to schedule
          </Link>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Admins
        </h1>
        <p className="text-sm text-rose-100/90">
          Could not load admins: {msg}
        </p>
        {msg.includes("login_username") ? (
          <p className="text-sm text-[var(--text-muted)]">
            Run{" "}
            <code className="text-xs">
              docs/supabase/staff_roles_login_username.sql
            </code>{" "}
            in the Supabase SQL Editor (or{" "}
            <code className="text-xs">supabase db push</code>), then reload this
            page.
          </p>
        ) : null}
        {msg.includes("policy") || msg.includes("permission") ? (
          <p className="text-sm text-[var(--text-muted)]">
            If you recently pulled app changes, apply the latest Supabase
            migrations (superadmin read access on{" "}
            <code className="text-xs">staff_roles</code>) via SQL Editor or{" "}
            <code className="text-xs">supabase db push</code>.
          </p>
        ) : null}
      </div>
    );
  }
}
