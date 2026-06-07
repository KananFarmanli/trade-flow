import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { xlsxResponse } from "@/lib/excel";
import { buildQuotaWorkbook, groupOpsByMonth, quotaFilename, type QuotaExport, type QuotaOp } from "@/lib/quota-export";
import { QUOTA_SELECT } from "@/lib/quotas";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: q } = await supabase.from("quotas").select(QUOTA_SELECT).eq("id", id).maybeSingle();
  if (!q) return new NextResponse("Not found", { status: 404 });

  const [{ data: monthsRaw }, { data: salesData }, { data: realIds }] = await Promise.all([
    supabase
      .from("v_quota_progress")
      .select("month_index, period_start, period_end, goal_amount, collected, status_color")
      .eq("quota_id", id),
    supabase
      .from("sales")
      .select("sale_date, items:sale_items(quantity, line_amount, product:products(name))")
      .eq("quota_id", id),
    supabase.from("realizations").select("id").eq("quota_id", id),
  ]);
  const ids = (realIds ?? []).map((r) => r.id).filter(Boolean) as string[];
  const { data: paymentsData } = ids.length
    ? await supabase.from("payments").select("amount, payment_date").in("realization_id", ids)
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qq = q as any;
  const exp: QuotaExport = {
    name: qq.name_snapshot,
    sellerName: qq.seller ? `${qq.seller.first_name} ${qq.seller.last_name}` : "",
    doctorName: qq.doctor ? `${qq.doctor.first_name} ${qq.doctor.last_name}` : "",
    duration: Number(qq.duration_snapshot),
    totalGoal: Number(qq.total_goal_snapshot),
    deviation: Number(qq.deviation_pct_snapshot),
    months: (monthsRaw ?? []).map((m) => ({
      month_index: Number(m.month_index ?? 0),
      period_start: m.period_start ?? "",
      period_end: m.period_end ?? "",
      goal_amount: Number(m.goal_amount ?? 0),
      collected: Number(m.collected ?? 0),
      status_color: m.status_color,
    })),
  };

  const ops: QuotaOp[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (salesData ?? []) as any[]) {
    for (const it of s.items ?? []) {
      ops.push({
        date: s.sale_date,
        type: "Satış",
        product: it.product?.name ?? "—",
        qty: Number(it.quantity),
        amount: Number(it.line_amount),
      });
    }
  }
  for (const p of paymentsData ?? []) {
    ops.push({ date: p.payment_date, type: "Ödəniş", product: "—", qty: null, amount: Number(p.amount) });
  }

  const opsByMonth = groupOpsByMonth(exp.months, ops);
  return xlsxResponse(buildQuotaWorkbook(exp, opsByMonth), quotaFilename(exp));
}
