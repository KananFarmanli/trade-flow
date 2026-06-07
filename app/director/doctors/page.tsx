import { createClient } from "@/utils/supabase/server";
import { DoctorsManager, type DoctorRow, type SellerLite } from "@/components/doctors/doctors-manager";

export default async function DoctorsPage() {
  const supabase = await createClient();
  const [{ data: doctors }, { data: sellers }, { data: activity }] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, first_name, last_name, phone, instagram, clinic, comment, is_active, assigned_seller_id, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, first_name, last_name, seller_color, is_active").eq("role", "seller"),
    supabase.from("v_doctor_activity").select("doctor_id, last_activity_at"),
  ]);

  const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s]));
  const activityMap = new Map((activity ?? []).map((a) => [a.doctor_id, a.last_activity_at]));

  const rows: DoctorRow[] = (doctors ?? []).map((d) => {
    const s = d.assigned_seller_id ? sellerMap.get(d.assigned_seller_id) : undefined;
    return {
      ...d,
      seller: s ? { id: s.id, first_name: s.first_name, last_name: s.last_name, seller_color: s.seller_color } : null,
      last_activity_at: (d.id && activityMap.get(d.id)) || null,
    };
  });

  const activeSellers: SellerLite[] = (sellers ?? [])
    .filter((s) => s.is_active)
    .map((s) => ({ id: s.id, first_name: s.first_name, last_name: s.last_name, seller_color: s.seller_color }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Həkimlər</h1>
        <p className="text-sm text-muted-foreground">Bütün satıcıların həkimləri. Rəng təyin olunmuş satıcını göstərir.</p>
      </div>
      <DoctorsManager doctors={rows} sellers={activeSellers} basePath="/director/doctors" />
    </div>
  );
}
