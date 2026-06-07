import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { roleHome, roleLabel, type Role } from "@/lib/auth";
import { AccountForm } from "@/components/account-form";
import { LogoutButton } from "@/components/logout-button";

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) redirect("/login");
  const role = profile.role as Role;

  return (
    <main className="mx-auto max-w-md space-y-6 p-8">
      <Link href={roleHome(role)} className="text-sm text-muted-foreground hover:underline">← Panelə qayıt</Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hesab</h1>
        <p className="text-sm text-muted-foreground">
          {profile.first_name} {profile.last_name} · {roleLabel(role)} · {profile.username}
        </p>
      </div>
      <AccountForm />
      <LogoutButton />
    </main>
  );
}
