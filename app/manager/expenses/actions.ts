"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";
import type { ExpenseCategory } from "@/lib/expense";

export async function addManagerExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const category = String(fd.get("category") ?? "") as ExpenseCategory;
  const amount = Number(fd.get("amount") ?? 0);
  const date = String(fd.get("expense_date") ?? "") || new Date().toISOString().slice(0, 10);
  const comment = String(fd.get("comment") ?? "").trim();
  if (!category) return { error: "Kateqoriya seçin." };
  if (amount <= 0) return { error: "Məbləğ 0-dan böyük olmalıdır." };

  const supabase = await createClient();
  // RPC sets status = 'pending' for managers (director approval required).
  const { error } = await supabase.rpc("add_expense", { p_category: category, p_amount: amount, p_date: date, p_comment: comment || undefined });
  if (error) return { error: error.message };
  revalidatePath("/manager/expenses");
  return { ok: true };
}
