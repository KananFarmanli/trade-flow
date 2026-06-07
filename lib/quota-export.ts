import "server-only";
import ExcelJS from "exceljs";
import { newWorkbook, addSheet, slug, type Col } from "@/lib/excel";
import { shortDate } from "@/lib/format";

export type QuotaExportMonth = {
  month_index: number;
  period_start: string;
  period_end: string;
  goal_amount: number;
  collected: number;
  status_color: string | null;
};
export type QuotaExport = {
  name: string;
  sellerName: string;
  doctorName: string;
  duration: number;
  totalGoal: number;
  deviation: number;
  months: QuotaExportMonth[];
};

/** A money event that counts toward a quota (a sale line or a consignment payment). */
export type QuotaOp = { date: string; type: string; product: string; qty: number | null; amount: number };

function statusLabel(c: string | null): string {
  return c === "green" ? "Yerinə yetirilib" : c === "orange" ? "Yol verilən hədddə" : c === "red" ? "Aşağı" : "—";
}

/** Seller_Quota_Doctor_Nmonths_Total.xlsx */
export function quotaFilename(q: QuotaExport): string {
  return `${slug(q.sellerName)}_${slug(q.name)}_${slug(q.doctorName)}_${q.duration}_months_${Math.round(q.totalGoal)}.xlsx`;
}

/** Bucket ops into the quota month whose [period_start, period_end] contains the date (ISO date strings compare lexically). */
export function groupOpsByMonth(months: QuotaExportMonth[], ops: QuotaOp[]): Map<number, QuotaOp[]> {
  const map = new Map<number, QuotaOp[]>();
  for (const m of months) map.set(m.month_index, []);
  for (const o of ops) {
    const m = months.find((mm) => o.date >= mm.period_start && o.date <= mm.period_end);
    if (m) map.get(m.month_index)!.push(o);
  }
  return map;
}

/** One sheet per quota month: the contributing operations + a summary footer (goal/collected/deviation/status). */
export function buildQuotaWorkbook(q: QuotaExport, opsByMonth?: Map<number, QuotaOp[]>): ExcelJS.Workbook {
  const wb = newWorkbook();
  const cols: Col[] = [
    { header: "Tarix", key: "date", width: 12 },
    { header: "Növ", key: "type", width: 14 },
    { header: "Məhsul", key: "product", width: 22 },
    { header: "Say", key: "qty", width: 8 },
    { header: "Məbləğ", key: "amount", width: 14 },
  ];
  const months = q.months.slice().sort((a, b) => a.month_index - b.month_index);
  if (months.length === 0) {
    addSheet(wb, "Xülasə", cols, []);
    return wb;
  }
  for (const m of months) {
    const ops = (opsByMonth?.get(m.month_index) ?? []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const rows = ops.map((o) => ({ date: shortDate(o.date), type: o.type, product: o.product, qty: o.qty ?? "", amount: o.amount }));
    const footer = [
      { type: "Aylıq hədəf", amount: m.goal_amount },
      { type: "Toplanıb", amount: m.collected },
      { type: "Yol verilən kənarlaşma %", amount: q.deviation },
      { type: "Status", product: statusLabel(m.status_color) },
    ];
    addSheet(wb, `Ay ${m.month_index}`, cols, rows, footer);
  }
  return wb;
}
