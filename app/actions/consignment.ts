"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { OperationPayload } from "@/lib/operations";
import type { Json } from "@/utils/supabase/database.types";

type Result = { error?: string; ok?: boolean };

function revalidateLists(id?: string) {
  revalidatePath("/seller/consignment");
  revalidatePath("/director/consignment");
  if (id) {
    revalidatePath(`/seller/consignment/${id}`);
    revalidatePath(`/director/consignment/${id}`);
  }
}

export async function createConsignmentAction(payload: OperationPayload): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tapılmadı." };
  const { error } = await supabase.rpc("create_consignment", {
    p_seller: user.id,
    p_doctor: payload.doctor_id,
    p_date: payload.op_date,
    p_quota_id: (payload.quota_id ?? null) as unknown as string,
    p_comment: payload.comment || "",
    p_items: payload.items as unknown as Json,
  });
  if (error) return { error: error.message };
  revalidateLists();
  return { ok: true };
}

export async function addPaymentAction(input: { realization_id: string; amount: number; payment_date: string }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_payment", {
    p_realization: input.realization_id,
    p_amount: input.amount,
    p_payment_date: input.payment_date,
  });
  if (error) return { error: error.message };
  revalidateLists(input.realization_id);
  return { ok: true };
}

export async function returnConsignmentAction(input: { realization_id: string; item_id: string; qty: number }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_from_doctor", {
    p_source_op_type: "realization",
    p_source_op_id: input.realization_id,
    p_source_item_id: input.item_id,
    p_qty: input.qty,
  });
  if (error) return { error: error.message };
  revalidateLists(input.realization_id);
  return { ok: true };
}

export async function applyCreditAction(input: { realization_id: string; amount: number }): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_doctor_credit", {
    p_realization: input.realization_id,
    p_amount: input.amount,
  });
  if (error) return { error: error.message };
  revalidateLists(input.realization_id);
  return { ok: true };
}
