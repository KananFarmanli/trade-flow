import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { SellerConsignment } from "@/components/consignment/seller-consignment";
import { buildConsignmentRows, REALIZATION_LIST_SELECT } from "@/lib/consignment";

export default async function SellerConsignmentPage() {
  const profile = await getCurrentProfile();
  const me = profile!.id;
  const supabase = await createClient();

  const [{ data: doctors }, { data: products }, { data: stock }, { data: quotas }, { data: reals }, { data: statuses }] = await Promise.all([
    supabase.from("doctors").select("id, first_name, last_name").eq("assigned_seller_id", me).eq("is_active", true).order("last_name"),
    supabase.from("products").select("id, name, current_retail_price, current_consignment_price").eq("is_active", true),
    supabase.from("v_stock_on_hand").select("product_id, quantity").eq("holder_type", "seller").eq("seller_id", me),
    supabase.from("quotas").select("id, doctor_id, name_snapshot").eq("seller_id", me).eq("status", "active"),
    supabase.from("realizations").select(REALIZATION_LIST_SELECT).eq("seller_id", me).is("quota_id", null).order("realization_date", { ascending: false }),
    supabase.from("v_realization_status").select("realization_id, billed_net, paid, remaining, overpaid, status_color, is_overdue").eq("seller_id", me),
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

  const rows = buildConsignmentRows(
    (reals ?? []) as unknown as Parameters<typeof buildConsignmentRows>[0],
    (statuses ?? []) as unknown as Parameters<typeof buildConsignmentRows>[1],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Konsiqnasiya</h1>
        <p className="text-sm text-muted-foreground">Məhsul həkimə verilir; borc, ödənişlər və qaytarmalar izlənilir.</p>
      </div>
      <SellerConsignment
        doctors={doctors ?? []}
        products={sellableProducts}
        quotas={(quotas ?? []).map((q) => ({ id: q.id, doctor_id: q.doctor_id, name: q.name_snapshot }))}
        rows={rows}
      />
    </div>
  );
}
