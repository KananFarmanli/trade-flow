import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { newWorkbook, addSheet, xlsxResponse } from "@/lib/excel";
import { buildConsignmentRows, REALIZATION_LIST_SELECT } from "@/lib/consignment";
import { shortDate } from "@/lib/format";

function statusLabel(color: string | null, overpaid: number): string {
  if (overpaid > 0) return "Artıq ödəniş";
  return color === "green" ? "Bağlı" : color === "red" ? "Gecikmiş" : color === "orange" ? "Açıq" : "—";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [{ data: reals }, { data: statuses }] = await Promise.all([
    supabase.from("realizations").select(REALIZATION_LIST_SELECT).is("quota_id", null).order("realization_date", { ascending: false }),
    supabase.from("v_realization_status").select("realization_id, billed_net, paid, remaining, overpaid, status_color, is_overdue"),
  ]);
  const rows = buildConsignmentRows(
    (reals ?? []) as unknown as Parameters<typeof buildConsignmentRows>[0],
    (statuses ?? []) as unknown as Parameters<typeof buildConsignmentRows>[1],
  );

  const wb = newWorkbook();
  addSheet(
    wb,
    "Konsiqnasiya",
    [
      { header: "Tarix", key: "date", width: 12 },
      { header: "Satıcı", key: "seller", width: 20 },
      { header: "Həkim", key: "doctor", width: 22 },
      { header: "Məbləğ", key: "billed", width: 14 },
      { header: "Ödənilib", key: "paid", width: 14 },
      { header: "Qalıq", key: "remaining", width: 14 },
      { header: "Ödəniş tarixləri", key: "dates", width: 40 },
      { header: "Status", key: "status", width: 16 },
    ],
    rows.map((r) => ({
      date: shortDate(r.date),
      seller: r.seller_name,
      doctor: r.doctor_name,
      billed: r.billed,
      paid: r.paid,
      remaining: r.remaining,
      dates: r.payment_dates,
      status: statusLabel(r.status_color, r.overpaid),
    })),
  );
  return xlsxResponse(wb, "konsiqnasiya.xlsx");
}
