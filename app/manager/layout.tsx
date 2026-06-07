import { requireRole } from "@/lib/guard";
import { AppShell } from "@/components/app-shell";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("manager");
  return (
    <AppShell role="manager" fullName={`${profile.first_name} ${profile.last_name}`}>
      {children}
    </AppShell>
  );
}
