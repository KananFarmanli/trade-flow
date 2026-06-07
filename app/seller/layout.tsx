import { requireRole } from "@/lib/guard";
import { AppShell } from "@/components/app-shell";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("seller");
  return (
    <AppShell role="seller" fullName={`${profile.first_name} ${profile.last_name}`}>
      {children}
    </AppShell>
  );
}
