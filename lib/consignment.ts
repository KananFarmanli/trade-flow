import { paymentDatesSummary } from "@/lib/format";
import type { ConsignmentRow } from "@/components/consignment/consignment-table";

export const REALIZATION_LIST_SELECT =
  "id, realization_date, seller_id, doctor:doctors(first_name,last_name), seller:profiles!realizations_seller_id_fkey(first_name,last_name), payments(amount, payment_date)";

export const REALIZATION_DETAIL_SELECT =
  "id, realization_date, seller_id, doctor_id, doctor:doctors(first_name,last_name), seller:profiles!realizations_seller_id_fkey(first_name,last_name), items:realization_items(id, quantity, price_type, actual_unit_price, unit_retail_snapshot, unit_consignment_snapshot, line_amount, is_free, bonus_reason, product:products(name)), payments(id, amount, payment_date)";

type RawRealization = {
  id: string;
  realization_date: string;
  seller_id: string;
  doctor: { first_name: string; last_name: string } | null;
  seller: { first_name: string; last_name: string } | null;
  payments: { amount: number; payment_date: string }[] | null;
};
type StatusRow = {
  realization_id: string;
  billed_net: number | null;
  paid: number | null;
  remaining: number | null;
  overpaid: number | null;
  status_color: string | null;
  is_overdue: boolean | null;
};

export function buildConsignmentRows(reals: RawRealization[], statuses: StatusRow[]): ConsignmentRow[] {
  const sMap = new Map(statuses.map((s) => [s.realization_id, s]));
  return reals.map((r) => {
    const st = sMap.get(r.id);
    return {
      id: r.id,
      date: r.realization_date,
      seller_id: r.seller_id,
      seller_name: r.seller ? `${r.seller.first_name} ${r.seller.last_name}` : "",
      doctor_name: r.doctor ? `${r.doctor.first_name} ${r.doctor.last_name}` : "—",
      billed: Number(st?.billed_net ?? 0),
      paid: Number(st?.paid ?? 0),
      remaining: Number(st?.remaining ?? 0),
      overpaid: Number(st?.overpaid ?? 0),
      status_color: st?.status_color ?? null,
      is_overdue: !!st?.is_overdue,
      payment_dates: paymentDatesSummary(r.payments ?? []),
    };
  });
}
