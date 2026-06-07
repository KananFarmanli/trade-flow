import { requireRole } from "@/lib/guard";
import { AppShell } from "@/components/app-shell";

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("director");
  return (
    <AppShell role="director" fullName={`${profile.first_name} ${profile.last_name}`}>
      {children}
    </AppShell>
  );
}
