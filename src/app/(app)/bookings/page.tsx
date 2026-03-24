import { User } from "lucide-react";

const rows = [
  { player: "Aditi Rao", slot: "18:00–20:00 · Court C", status: "Confirmed" },
  { player: "Rahul M.", slot: "12:00–13:30 · Court A", status: "Waitlist" },
];

export default function BookingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
          Bookings
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Admin-focused view of who booked which slot. Superadmins use Venues /
          Admins; this screen is for day-to-day court ops.
        </p>
      </div>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.player + r.slot}
            className="glass-panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[var(--accent)]">
                <User className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  {r.player}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{r.slot}</p>
              </div>
            </div>
            <span className="self-start rounded-full bg-[var(--accent-dim)] px-3 py-1 text-xs font-semibold text-[var(--accent)] sm:self-center">
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
