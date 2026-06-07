"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/utils/supabase/database.types";

export async function returnToWarehouse(input: { product_id: string; qty: number }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tapılmadı." };
  const { error } = await supabase.rpc("return_seller_to_warehouse", {
    p_seller: user.id,
    p_items: [{ product_id: input.product_id, qty: input.qty }] as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidatePath("/seller/inventory");
  return { ok: true };
}
