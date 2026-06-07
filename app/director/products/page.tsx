import { createClient } from "@/utils/supabase/server";
import { ProductsManager, type ProductRow } from "@/components/products/products-manager";

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: onHand }, { data: cost }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category, current_retail_price, current_consignment_price, is_active")
      .order("name"),
    supabase
      .from("v_stock_on_hand")
      .select("product_id, quantity, retail_value, consignment_value")
      .eq("holder_type", "warehouse"),
    supabase.from("v_stock_cost").select("product_id, quantity, cost_value").eq("holder_type", "warehouse"),
  ]);

  const onHandBy = new Map((onHand ?? []).map((r) => [r.product_id, r]));
  const costBy = new Map((cost ?? []).map((r) => [r.product_id, r]));

  const rows: ProductRow[] = (products ?? []).map((p) => {
    const oh = onHandBy.get(p.id);
    const c = costBy.get(p.id);
    return {
      ...p,
      wh_qty: Number(oh?.quantity ?? 0),
      retail_value: Number(oh?.retail_value ?? 0),
      consignment_value: Number(oh?.consignment_value ?? 0),
      cost_value: Number(c?.cost_value ?? 0),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Məhsullar</h1>
        <p className="text-sm text-muted-foreground">Məhsulları əlavə edin, qiymət təyin edin və mədaxil (anbar gəliri) qeyd edin.</p>
      </div>
      <ProductsManager products={rows} />
    </div>
  );
}
