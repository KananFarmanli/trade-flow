import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { zipResponse } from "@/lib/excel";
import { buildQuotaWorkbook, groupOpsByMonth, quotaFilename, type QuotaExport, type QuotaExportMonth, type QuotaOp } from "@/lib/quota-export";
import { QUOTA_SELECT } from "@/lib/quotas";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [{ data: quotas }, { data: progress }, { data: salesAll }, { data: realsAll }] = await Promise.all([
    supabase.from("quotas").select(QUOTA_SELECT).order("created_at", { ascending: false }),
    supabase.from("v_quota_progress").select("quota_id, month_index, period_start, period_end, goal_amount, collected, status_color"),
    supabase
      .from("sales")
      .select("quota_id, sale_date, items:sale_items(quantity, line_amount, product:products(name))")
      .not("quota_id", "is", null),
    supabase.from("realizations").select("id, quota_id").not("quota_id", "is", null),
  ]);
  if (!quotas || quotas.length === 0) return new NextResponse("Kvota yoxdur", { status: 404 });

  const realIds = (realsAll ?? []).map((r) => r.id).filter(Boolean) as string[];
  const { data: paymentsAll } = realIds.length
    ? await supabase.from("payments").select("realization_id, amount, payment_date").in("realization_id", realIds)
    : { data: [] };
  const realQuota = new Map<string, string>((realsAll ?? []).map((r) => [r.id as string, r.quota_id as string]));

  // months by quota
  const monthsByQuota = new Map<string, QuotaExportMonth[]>();
  for (const m of progress ?? []) {
    if (!m.quota_id) continue;
    const arr = monthsByQuota.get(m.quota_id) ?? monthsByQuota.set(m.quota_id, []).get(m.quota_id)!;
    arr.push({
      month_index: Number(m.month_index ?? 0),
      period_start: m.period_start ?? "",
      period_end: m.period_end ?? "",
      goal_amount: Number(m.goal_amount ?? 0),
      collected: Number(m.collected ?? 0),
      status_color: m.status_color,
    });
  }

  // ops by quota
  const opsByQuota = new Map<string, QuotaOp[]>();
  const push = (q: string, op: QuotaOp) => {
    const arr = opsByQuota.get(q) ?? opsByQuota.set(q, []).get(q)!;
    arr.push(op);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (salesAll ?? []) as any[]) {
    if (!s.quota_id) continue;
    for (const it of s.items ?? []) {
      push(s.quota_id, { date: s.sale_date, type: "Satış", product: it.product?.name ?? "—", qty: Number(it.quantity), amount: Number(it.line_amount) });
    }
  }
  for (const p of paymentsAll ?? []) {
    const qid = realQuota.get(p.realization_id as string);
    if (qid) push(qid, { date: p.payment_date, type: "Ödəniş", product: "—", qty: null, amount: Number(p.amount) });
  }

  const workbooks = quotas.map((q) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qq = q as any;
    const months = monthsByQuota.get(qq.id) ?? [];
    const exp: QuotaExport = {
      name: qq.name_snapshot,
      sellerName: qq.seller ? `${qq.seller.first_name} ${qq.seller.last_name}` : "",
      doctorName: qq.doctor ? `${qq.doctor.first_name} ${qq.doctor.last_name}` : "",
      duration: Number(qq.duration_snapshot),
      totalGoal: Number(qq.total_goal_snapshot),
      deviation: Number(qq.deviation_pct_snapshot),
      months,
    };
    const ops = opsByQuota.get(qq.id) ?? [];
    return { name: quotaFilename(exp), wb: buildQuotaWorkbook(exp, groupOpsByMonth(months, ops)) };
  });

  return zipResponse(workbooks, "kvotalar.zip");
}
