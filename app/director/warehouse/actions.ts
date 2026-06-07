"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";

export async function transferToSeller(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const seller_id = String(fd.get("seller_id") ?? "");
  const product_id = String(fd.get("product_id") ?? "");
  const qty = Number(fd.get("qty") ?? 0);
  if (!seller_id) return { error: "Satıcı seçin." };
  if (!product_id) return { error: "Məhsul seçin." };
  if (qty <= 0) return { error: "Miqdar 0-dan böyük olmalıdır." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_to_seller", {
    p_seller: seller_id,
    p_items: [{ product_id, qty }],
  });
  if (error) return { error: error.message };
  revalidatePath("/director/warehouse");
  return { ok: true };
}
