import { MapPin } from "lucide-react";

const venues = [
  { name: "North Shuttle Club", courts: 4, city: "Bengaluru" },
  { name: "Rovo Arena — Indiranagar", courts: 6, city: "Bengaluru" },
  { name: "Feather Base", courts: 3, city: "Hyderabad" },
];

export default function VenuesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
          Courts
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Superadmin-only surface: list venues and courts. Hook to your data
          model when you are ready.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {venues.map((v) => (
          <li
            key={v.name}
            className="glass-panel flex flex-col gap-3 rounded-2xl p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
                <MapPin className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-lg font-bold">{v.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{v.city}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {v.courts} courts · slot templates per court (UI only)
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
