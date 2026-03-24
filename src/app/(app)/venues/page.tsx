import Link from "next/link";
import { redirect } from "next/navigation";
import { VenuesPageClient } from "@/components/venues/venues-page-client";
import { listVenuesMaster } from "@/lib/venues-server";

export default async function VenuesPage() {
  try {
    const rows = await listVenuesMaster();
    return <VenuesPageClient rows={rows} />;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Unauthorized") {
      redirect("/login?next=/venues");
    }
    if (msg === "Forbidden") {
      return (
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Venues
          </h1>
          <p className="text-[var(--text-muted)]">
            Only superadmins can manage venues.
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
      <p className="text-sm text-rose-100/90">
        Could not load venues: {msg}
      </p>
    );
  }
}
