"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";

export async function createProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  const category = String(fd.get("category") ?? "").trim() || null;
  const retail = Number(fd.get("retail") ?? 0);
  const consignment = Number(fd.get("consignment") ?? 0);
  if (!name) return { error: "Məhsul adı tələb olunur." };
  if (retail < 0 || consignment < 0) return { error: "Qiymət mənfi ola bilməz." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .insert({ name, category, current_retail_price: retail, current_consignment_price: consignment });
  if (error) return { error: "Məhsul əlavə olunmadı." };
  revalidatePath("/director/products");
  return { ok: true };
}

export async function addArrival(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const product_id = String(fd.get("product_id") ?? "");
  const unit_cost = Number(fd.get("unit_cost") ?? 0);
  const qty = Number(fd.get("qty") ?? 0);
  const arrival_date = String(fd.get("arrival_date") ?? "") || new Date().toISOString().slice(0, 10);
  const comment = String(fd.get("comment") ?? "").trim();
  if (!product_id) return { error: "Məhsul seçin." };
  if (qty <= 0) return { error: "Miqdar 0-dan böyük olmalıdır." };
  if (unit_cost < 0) return { error: "Maya dəyəri mənfi ola bilməz." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_batch", {
    p_product: product_id,
    p_unit_cost: unit_cost,
    p_qty: qty,
    p_arrival_date: arrival_date,
    p_comment: comment || undefined,
  });
  if (error) return { error: error.message };
  revalidatePath("/director/products");
  revalidatePath("/director/warehouse");
  return { ok: true };
}

export async function updateProductPrices(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const retail = Number(fd.get("retail") ?? 0);
  const consignment = Number(fd.get("consignment") ?? 0);
  if (!id) return { error: "Məhsul tapılmadı." };
  if (retail < 0 || consignment < 0) return { error: "Qiymət mənfi ola bilməz." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ current_retail_price: retail, current_consignment_price: consignment })
    .eq("id", id);
  if (error) return { error: "Yenilənmədi." };
  revalidatePath("/director/products");
  return { ok: true };
}
