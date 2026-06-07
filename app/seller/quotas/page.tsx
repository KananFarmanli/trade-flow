import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { OpenQuotaDialog } from "@/components/quotas/open-quota-dialog";
import { QuotasList } from "@/components/quotas/quotas-list";
import { buildQuotaViews, QUOTA_SELECT } from "@/lib/quotas";
import { ExportButton } from "@/components/export-button";

export default async function SellerQuotasPage() {
  const profile = await getCurrentProfile();
  const me = profile!.id;
  const supabase = await createClient();

  const [{ data: templates }, { data: doctors }, { data: quotas }, { data: progress }] = await Promise.all([
    supabase.from("quota_templates").select("id, name").eq("is_active", true).order("name"),
    supabase.from("doctors").select("id, first_name, last_name").eq("assigned_seller_id", me).eq("is_active", true).order("last_name"),
    supabase.from("quotas").select(QUOTA_SELECT).eq("seller_id", me).order("created_at", { ascending: false }),
    supabase.from("v_quota_progress").select("quota_id, month_index, period_start, period_end, goal_amount, collected, status_color").eq("seller_id", me),
  ]);

  const views = buildQuotaViews(
    (quotas ?? []) as unknown as Parameters<typeof buildQuotaViews>[0],
    (progress ?? []) as unknown as Parameters<typeof buildQuotaViews>[1],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kvotalar</h1>
          <p className="text-sm text-muted-foreground">Şablon əsasında həkim üçün kvota açın və aylıq toplanmaya baxın.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton href="/api/export/quotas" label="ZIP" />
          <OpenQuotaDialog templates={templates ?? []} doctors={doctors ?? []} />
        </div>
      </div>
      <QuotasList quotas={views} />
    </div>
  );
}
