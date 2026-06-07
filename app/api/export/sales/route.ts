import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { newWorkbook, addSheet, xlsxResponse } from "@/lib/excel";
import { flattenSales, type RawSale } from "@/lib/flatten";
import { PRICE_TYPE_LABEL } from "@/lib/price";
import { shortDate } from "@/lib/format";

const SALE_SELECT =
  "id, sale_date, seller_id, seller:profiles!sales_seller_id_fkey(first_name,last_name), doctor:doctors(first_name,last_name), items:sale_items(id, quantity, price_type, actual_unit_price, unit_retail_snapshot, unit_consignment_snapshot, line_amount, is_free, bonus_reason, product:products(name))";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: sales } = await supabase.from("sales").select(SALE_SELECT).is("quota_id", null).order("sale_date", { ascending: false });
  const rows = flattenSales((sales ?? []) as unknown as RawSale[]);

  const wb = newWorkbook();
  addSheet(
    wb,
    "Satışlar",
    [
      { header: "Tarix", key: "date", width: 12 },
      { header: "Satıcı", key: "seller", width: 20 },
      { header: "Həkim", key: "doctor", width: 22 },
      { header: "Məhsul", key: "product", width: 22 },
      { header: "Say", key: "qty", width: 8 },
      { header: "Qiymət növü", key: "ptype", width: 16 },
      { header: "Standart qiymət", key: "standard", width: 16 },
      { header: "Faktiki qiymət", key: "actual", width: 16 },
      { header: "Məbləğ", key: "amount", width: 14 },
      { header: "Bonus səbəbi", key: "reason", width: 24 },
    ],
    rows.map((r) => ({
      date: shortDate(r.date),
      seller: r.seller_name,
      doctor: r.doctor_name,
      product: r.product_name,
      qty: r.qty,
      ptype: PRICE_TYPE_LABEL[r.price_type],
      standard: r.standard_price,
      actual: r.actual_unit_price,
      amount: r.amount,
      reason: r.bonus_reason ?? "",
    })),
  );
  return xlsxResponse(wb, "satislar.xlsx");
}
