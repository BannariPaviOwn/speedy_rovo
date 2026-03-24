const admins = [
  { name: "You (superadmin)", email: "super@example.com", scope: "All venues" },
  { name: "Court lead", email: "admin@example.com", scope: "Rovo Arena" },
];

export default function AdminsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
          Admins
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
          Superadmin-only: invite venue admins and scope their access. Static
          preview rows for now.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border-subtle)] bg-black/25 text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
              <th className="px-4 py-3 font-medium">Scope</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr
                key={a.email}
                className="border-b border-[var(--border-subtle)] last:border-0"
              >
                <td className="px-4 py-4 font-semibold text-[var(--text-primary)]">
                  {a.name}
                </td>
                <td className="hidden px-4 py-4 text-[var(--text-muted)] sm:table-cell">
                  {a.email}
                </td>
                <td className="px-4 py-4 text-[var(--text-muted)]">{a.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
