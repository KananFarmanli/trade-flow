import { createClient } from "@/utils/supabase/server";
import { UsersManager } from "@/components/users/users-manager";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, username, seller_color, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İstifadəçilər</h1>
        <p className="text-sm text-muted-foreground">Menecer və satıcı hesablarını yaradın və idarə edin.</p>
      </div>
      <UsersManager users={users ?? []} />
    </div>
  );
}
