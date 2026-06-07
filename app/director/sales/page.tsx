import { createClient } from "@/utils/supabase/server";
import { SalesExplorer } from "@/components/sales/sales-explorer";
import { flattenSales, type RawSale } from "@/lib/flatten";

const SALE_SELECT =
  "id, sale_date, seller_id, seller:profiles!sales_seller_id_fkey(first_name,last_name), doctor:doctors(first_name,last_name), items:sale_items(id, quantity, price_type, actual_unit_price, unit_retail_snapshot, unit_consignment_snapshot, line_amount, is_free, bonus_reason, product:products(name))";

export default async function DirectorSalesPage() {
  const supabase = await createClient();
  const [{ data: sales }, { data: econ }, { data: sellers }] = await Promise.all([
    supabase.from("sales").select(SALE_SELECT).is("quota_id", null).order("sale_date", { ascending: false }),
    supabase.from("v_sale_economics").select("sale_id, revenue, cogs"),
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "seller"),
  ]);

  const rows = flattenSales((sales ?? []) as unknown as RawSale[]);
  const econMap = Object.fromEntries(
    (econ ?? []).map((e) => [e.sale_id as string, { revenue: Number(e.revenue), cogs: Number(e.cogs) }]),
  );
  const sellerOpts = (sellers ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Satışlar</h1>
        <p className="text-sm text-muted-foreground">Bütün satıcıların satışları. Mənfəət və maya dəyəri yalnız direktora görünür.</p>
      </div>
      <SalesExplorer rows={rows} econ={econMap} sellers={sellerOpts} />
    </div>
  );
}
