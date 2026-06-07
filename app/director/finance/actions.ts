"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";
import type { ExpenseCategory } from "@/lib/expense";

function rv() {
  revalidatePath("/director/finance");
}

export async function topUp(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const amount = Number(fd.get("amount") ?? 0);
  const source = String(fd.get("source") ?? "").trim();
  const is_loan = fd.get("is_loan") === "on";
  const op_date = String(fd.get("op_date") ?? "") || new Date().toISOString().slice(0, 10);
  const comment = String(fd.get("comment") ?? "").trim();
  if (amount <= 0) return { error: "Məbləğ 0-dan böyük olmalıdır." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("director_topup", {
    p_amount: amount,
    p_source: source,
    p_is_loan: is_loan,
    p_date: op_date,
    p_comment: comment || undefined,
  });
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function addExpenseAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const category = String(fd.get("category") ?? "") as ExpenseCategory;
  const amount = Number(fd.get("amount") ?? 0);
  const date = String(fd.get("expense_date") ?? "") || new Date().toISOString().slice(0, 10);
  const comment = String(fd.get("comment") ?? "").trim();
  if (!category) return { error: "Kateqoriya seçin." };
  if (amount <= 0) return { error: "Məbləğ 0-dan böyük olmalıdır." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_expense", {
    p_category: category,
    p_amount: amount,
    p_date: date,
    p_comment: comment || undefined,
  });
  if (error) return { error: error.message };
  rv();
  return { ok: true };
}

export async function approveExpense(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("approve_expense", { p_id: id });
  rv();
}

export async function rejectExpense(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("reject_expense", { p_id: id });
  rv();
}

export async function confirmTransfer(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("confirm_money_transfer", { p_id: id });
  rv();
  revalidatePath("/seller/cash");
}

export async function rejectTransfer(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("reject_money_transfer", { p_id: id });
  rv();
  revalidatePath("/seller/cash");
}
