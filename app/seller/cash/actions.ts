"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function initiateTransfer(input: { amount: number }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("initiate_money_transfer", { p_amount: input.amount });
  if (error) return { error: error.message };
  revalidatePath("/seller/cash");
  revalidatePath("/director/finance");
  return { ok: true };
}
