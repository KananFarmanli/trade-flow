import type { SaleLineRow } from "@/lib/operations";
import type { PriceType } from "@/lib/price";

/** Loose shape of a sale row with embedded doctor/seller/items (cast the Supabase result to this). */
export type RawSale = {
  id: string;
  sale_date: string;
  seller_id?: string | null;
  seller?: { first_name: string; last_name: string } | null;
  doctor?: { first_name: string; last_name: string } | null;
  items?: Array<{
    id: string;
    quantity: number;
    price_type: string;
    actual_unit_price: number;
    unit_retail_snapshot: number;
    unit_consignment_snapshot: number;
    line_amount: number;
    is_free: boolean;
    bonus_reason: string | null;
    product?: { name: string } | null;
  }> | null;
};

/** Flatten sales → one row per line item for table display. */
export function flattenSales(sales: RawSale[]): SaleLineRow[] {
  const out: SaleLineRow[] = [];
  for (const s of sales) {
    const doctorName = s.doctor ? `${s.doctor.first_name} ${s.doctor.last_name}` : "—";
    const sellerName = s.seller ? `${s.seller.first_name} ${s.seller.last_name}` : "";
    for (const it of s.items ?? []) {
      const pt = it.price_type as PriceType;
      const standard = pt === "consignment" ? Number(it.unit_consignment_snapshot) : Number(it.unit_retail_snapshot);
      out.push({
        sale_id: s.id,
        line_id: it.id,
        date: s.sale_date,
        seller_id: s.seller_id ?? "",
        seller_name: sellerName,
        doctor_name: doctorName,
        product_name: it.product?.name ?? "—",
        qty: Number(it.quantity),
        price_type: pt,
        standard_price: standard,
        actual_unit_price: Number(it.actual_unit_price),
        amount: Number(it.line_amount),
        is_free: it.is_free,
        bonus_reason: it.bonus_reason,
      });
    }
  }
  return out;
}
