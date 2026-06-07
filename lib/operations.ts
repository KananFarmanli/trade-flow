import type { PriceType } from "@/lib/price";

/** A single line in a create-sale / create-consignment payload (matches the RPC item shape). */
export type OperationItem = {
  product_id: string;
  qty: number;
  price_type: PriceType;
  actual_unit_price?: number;
  bonus_reason?: string;
};

export type OperationPayload = {
  doctor_id: string;
  op_date: string;
  comment: string;
  quota_id: string | null;
  items: OperationItem[];
};

/** A quota a seller can tag an operation to (shown for the matching doctor). */
export type QuotaOption = { id: string; doctor_id: string; name: string };

/** A flattened sale/consignment line for display in tables. */
export type SaleLineRow = {
  sale_id: string;
  line_id: string;
  date: string;
  seller_id: string;
  seller_name: string;
  doctor_name: string;
  product_name: string;
  qty: number;
  price_type: PriceType;
  standard_price: number;
  actual_unit_price: number;
  amount: number;
  is_free: boolean;
  bonus_reason: string | null;
};
