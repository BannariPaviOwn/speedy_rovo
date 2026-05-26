import { AdminShell } from "@/components/layout/admin-shell";
import { RoleProvider } from "@/components/providers/role-provider";
import { getStaffAuthContextForLayout } from "@/lib/auth/staff-auth-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = await getStaffAuthContextForLayout();

  return (
    <RoleProvider initial={initial}>
      <AdminShell>{children}</AdminShell>
    </RoleProvider>
  );
}
