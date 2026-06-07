import { createClient } from "@/utils/supabase/server";
import { QuotasList } from "@/components/quotas/quotas-list";
import { buildQuotaViews, QUOTA_SELECT } from "@/lib/quotas";
import { ExportButton } from "@/components/export-button";

export default async function ManagerQuotasPage() {
  const supabase = await createClient();
  const [{ data: quotas }, { data: progress }] = await Promise.all([
    supabase.from("quotas").select(QUOTA_SELECT).order("created_at", { ascending: false }),
    supabase.from("v_quota_progress").select("quota_id, month_index, period_start, period_end, goal_amount, collected, status_color"),
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
          <p className="text-sm text-muted-foreground">Bütün satıcıların açılmış kvotaları və aylıq toplanma.</p>
        </div>
        <ExportButton href="/api/export/quotas" label="Bütün kvotalar (ZIP)" />
      </div>
      <QuotasList quotas={views} showSeller />
    </div>
  );
}
