import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { newWorkbook, addSheet, type Col } from "@/lib/excel";
import { xlsxResponse } from "@/lib/excel";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [{ data: onHand }, { data: cost }, { data: sellers }] = await Promise.all([
    supabase.from("v_stock_on_hand").select("holder_type, seller_id, product_name, quantity, retail_value, consignment_value"),
    supabase.from("v_stock_cost").select("holder_type, seller_id, product_id, cost_value"), // director only (else empty)
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "seller"),
  ]);

  const sellerName = new Map((sellers ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]));
  const hasCost = (cost ?? []).length > 0;
  // cost is keyed differently (by product), so we sum cost per holder for an aggregate column is non-trivial per row;
  // include cost only as a director-only separate column keyed by holder+product is omitted for simplicity — show qty/values.

  const cols: Col[] = [
    { header: "Sahib", key: "holder", width: 22 },
    { header: "Məhsul", key: "product", width: 22 },
    { header: "Miqdar", key: "qty", width: 10 },
    { header: "Pərakəndə dəyəri", key: "retail", width: 18 },
    { header: "Konsiqnasiya dəyəri", key: "consignment", width: 20 },
  ];

  const rows = (onHand ?? [])
    .filter((r) => r.holder_type)
    .map((r) => ({
      holder: r.holder_type === "warehouse" ? "Sahibkar anbarı" : (r.seller_id ? sellerName.get(r.seller_id) ?? "Satıcı" : "Satıcı"),
      product: r.product_name ?? "",
      qty: Number(r.quantity),
      retail: Number(r.retail_value),
      consignment: Number(r.consignment_value),
    }));

  const wb = newWorkbook();
  addSheet(wb, "Anbar", cols, rows);
  // Director-only: a cost sheet (by holder/product) when cost rows are visible.
  if (hasCost) {
    addSheet(
      wb,
      "Maya dəyəri",
      [
        { header: "Sahib", key: "holder", width: 22 },
        { header: "Maya dəyəri (cəmi)", key: "cost", width: 20 },
      ],
      Object.entries(
        (cost ?? []).reduce<Record<string, number>>((acc, c) => {
          const key = c.holder_type === "warehouse" ? "Sahibkar anbarı" : (c.seller_id ? sellerName.get(c.seller_id) ?? "Satıcı" : "Satıcı");
          acc[key] = (acc[key] ?? 0) + Number(c.cost_value);
          return acc;
        }, {}),
      ).map(([holder, cost]) => ({ holder, cost })),
    );
  }
  return xlsxResponse(wb, "anbar.xlsx");
}
