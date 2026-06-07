"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { OperationPayload } from "@/lib/operations";
import type { Json } from "@/utils/supabase/database.types";

export async function createSaleAction(payload: OperationPayload): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tapılmadı." };

  const { error } = await supabase.rpc("create_sale", {
    p_seller: user.id,
    p_doctor: payload.doctor_id,
    p_sale_date: payload.op_date,
    p_quota_id: (payload.quota_id ?? null) as unknown as string, // nullable uuid; generated type is imprecise
    p_comment: payload.comment || "",
    p_items: payload.items as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidatePath("/seller/sales");
  return { ok: true };
}
