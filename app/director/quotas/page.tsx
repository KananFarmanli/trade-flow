import { createClient } from "@/utils/supabase/server";
import { TemplatesManager } from "@/components/quotas/templates-manager";
import { QuotasList } from "@/components/quotas/quotas-list";
import { buildQuotaViews, QUOTA_SELECT } from "@/lib/quotas";
import { ExportButton } from "@/components/export-button";

export default async function DirectorQuotasPage() {
  const supabase = await createClient();
  const [{ data: templates }, { data: quotas }, { data: progress }] = await Promise.all([
    supabase
      .from("quota_templates")
      .select("id, name, duration_months, total_goal, monthly_goal, allowed_deviation_pct, is_active")
      .order("created_at", { ascending: false }),
    supabase.from("quotas").select(QUOTA_SELECT).order("created_at", { ascending: false }),
    supabase.from("v_quota_progress").select("quota_id, month_index, period_start, period_end, goal_amount, collected, status_color"),
  ]);

  const views = buildQuotaViews(
    (quotas ?? []) as unknown as Parameters<typeof buildQuotaViews>[0],
    (progress ?? []) as unknown as Parameters<typeof buildQuotaViews>[1],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kvotalar</h1>
          <p className="text-sm text-muted-foreground">Şablonları yaradın; satıcılar onları həkimlərə açır. Toplanma faktiki alınan pula görə hesablanır.</p>
        </div>
        <ExportButton href="/api/export/quotas" label="Bütün kvotalar (ZIP)" />
      </div>
      <TemplatesManager templates={templates ?? []} />
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Açılmış kvotalar</h2>
        <QuotasList quotas={views} showSeller canClose />
      </div>
    </div>
  );
}
