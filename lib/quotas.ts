import type { QuotaView } from "@/components/quotas/quota-card";

export const QUOTA_SELECT =
  "id, name_snapshot, start_date, total_goal_snapshot, monthly_goal_snapshot, deviation_pct_snapshot, status, seller_id, doctor:doctors(first_name,last_name), seller:profiles!quotas_seller_id_fkey(first_name,last_name)";

type RawQuota = {
  id: string;
  name_snapshot: string;
  start_date: string;
  total_goal_snapshot: number;
  monthly_goal_snapshot: number;
  deviation_pct_snapshot: number;
  status: string;
  seller_id: string;
  doctor: { first_name: string; last_name: string } | null;
  seller: { first_name: string; last_name: string } | null;
};
type ProgressRow = {
  quota_id: string | null;
  month_index: number | null;
  period_start: string | null;
  period_end: string | null;
  goal_amount: number | null;
  collected: number | null;
  status_color: string | null;
};

export function buildQuotaViews(quotas: RawQuota[], progress: ProgressRow[]): QuotaView[] {
  const byQuota = new Map<string, ProgressRow[]>();
  for (const p of progress) {
    if (!p.quota_id) continue;
    (byQuota.get(p.quota_id) ?? byQuota.set(p.quota_id, []).get(p.quota_id)!).push(p);
  }
  return quotas.map((q) => ({
    id: q.id,
    name: q.name_snapshot,
    doctor_name: q.doctor ? `${q.doctor.first_name} ${q.doctor.last_name}` : "—",
    seller_name: q.seller ? `${q.seller.first_name} ${q.seller.last_name}` : "",
    status: q.status,
    start_date: q.start_date,
    total_goal: Number(q.total_goal_snapshot),
    monthly_goal: Number(q.monthly_goal_snapshot),
    deviation: Number(q.deviation_pct_snapshot),
    months: (byQuota.get(q.id) ?? [])
      .slice()
      .sort((a, b) => (a.month_index ?? 0) - (b.month_index ?? 0))
      .map((m) => ({
        month_index: m.month_index ?? 0,
        period_start: m.period_start ?? "",
        period_end: m.period_end ?? "",
        goal_amount: Number(m.goal_amount ?? 0),
        collected: Number(m.collected ?? 0),
        status_color: m.status_color,
      })),
  }));
}
