import { createClient } from "@/utils/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExpenseStatusBadge } from "@/components/status-badge";
import { AddExpenseDialog } from "@/components/finance/add-expense-dialog";
import { addManagerExpense } from "./actions";
import { EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/expense";
import { manat, shortDate } from "@/lib/format";

export default async function ManagerExpensesPage() {
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, expense_date, category, amount, status, comment")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Xərclər</h1>
          <p className="text-sm text-muted-foreground">Əlavə etdiyiniz xərclər direktor təsdiqləyənə qədər “gözləyir” statusunda olur.</p>
        </div>
        <AddExpenseDialog action={addManagerExpense} description="Menecerin əlavə etdiyi xərc direktorun təsdiqini gözləyir." />
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarix</TableHead>
              <TableHead>Kateqoriya</TableHead>
              <TableHead>Şərh</TableHead>
              <TableHead className="text-right">Məbləğ</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(expenses ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Xərc yoxdur.</TableCell></TableRow>
            )}
            {(expenses ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell>{shortDate(e.expense_date)}</TableCell>
                <TableCell>{EXPENSE_CATEGORY_LABEL[e.category as ExpenseCategory]}</TableCell>
                <TableCell className="text-muted-foreground">{e.comment ?? "—"}</TableCell>
                <TableCell className="text-right">{manat(e.amount)}</TableCell>
                <TableCell><ExpenseStatusBadge status={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
