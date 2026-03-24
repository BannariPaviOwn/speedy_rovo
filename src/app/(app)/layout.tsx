import { AdminShell } from "@/components/layout/admin-shell";
import { RoleProvider } from "@/components/providers/role-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProvider>
      <AdminShell>{children}</AdminShell>
    </RoleProvider>
  );
}
