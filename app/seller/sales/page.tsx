import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { SellerSales } from "@/components/sales/seller-sales";
import { flattenSales, type RawSale } from "@/lib/flatten";

const SALE_SELECT =
  "id, sale_date, seller_id, doctor:doctors(first_name,last_name), items:sale_items(id, quantity, price_type, actual_unit_price, unit_retail_snapshot, unit_consignment_snapshot, line_amount, is_free, bonus_reason, product:products(name))";

export default async function SellerSalesPage() {
  const profile = await getCurrentProfile();
  const me = profile!.id;
  const supabase = await createClient();

  const [{ data: doctors }, { data: products }, { data: stock }, { data: quotas }, { data: sales }] = await Promise.all([
    supabase.from("doctors").select("id, first_name, last_name").eq("assigned_seller_id", me).eq("is_active", true).order("last_name"),
    supabase.from("products").select("id, name, current_retail_price, current_consignment_price").eq("is_active", true),
    supabase.from("v_stock_on_hand").select("product_id, quantity").eq("holder_type", "seller").eq("seller_id", me),
    supabase.from("quotas").select("id, doctor_id, name_snapshot").eq("seller_id", me).eq("status", "active"),
    supabase.from("sales").select(SALE_SELECT).eq("seller_id", me).is("quota_id", null).order("sale_date", { ascending: false }),
  ]);

  const qtyByProduct = new Map((stock ?? []).map((s) => [s.product_id, Number(s.quantity)]));
  const sellableProducts = (products ?? [])
    .map((p) => ({
      id: p.id,
      name: p.name,
      available: qtyByProduct.get(p.id) ?? 0,
      retail: Number(p.current_retail_price),
      consignment: Number(p.current_consignment_price),
    }))
    .filter((p) => p.available > 0);

  const rows = flattenSales((sales ?? []) as unknown as RawSale[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Satışlar</h1>
        <p className="text-sm text-muted-foreground">Dərhal satış — borc yaranmır, məbləğ kassanıza əlavə olunur.</p>
      </div>
      <SellerSales
        doctors={doctors ?? []}
        products={sellableProducts}
        quotas={(quotas ?? []).map((q) => ({ id: q.id, doctor_id: q.doctor_id, name: q.name_snapshot }))}
        rows={rows}
      />
    </div>
  );
}
