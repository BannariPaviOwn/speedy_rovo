import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminsPageClient } from "@/components/admins/admins-page-client";
import { createClient } from "@/lib/server";
import {
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
    return (
      <AdminsPageClient
        rows={rows}
        venues={venues}
        currentUserId={user?.id ?? ""}
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
    if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Add{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          to your server environment (e.g. <code className="text-xs">.env.local</code>
          ) so admins can be created. Never expose this key to the browser.
        </div>
      );
    }
    return (
      <p className="text-sm text-rose-100/90">
        Could not load admins: {msg}
      </p>
    );
  }
}
