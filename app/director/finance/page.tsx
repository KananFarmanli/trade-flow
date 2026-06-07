import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FinanceActions } from "@/components/finance/finance-actions";
import { ExpenseRowActions, TransferRowActions } from "@/components/finance/row-actions";
import { ExpenseStatusBadge, TransferStatusBadge } from "@/components/status-badge";
import { EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/expense";
import { manat, shortDate } from "@/lib/format";

export default async function FinancePage() {
  const supabase = await createClient();
  const [{ data: cash }, { data: pnl }, { data: expenses }, { data: transfers }, { data: topups }] = await Promise.all([
    supabase.from("v_business_cash").select("*").maybeSingle(),
    supabase.from("v_profit_summary").select("*").maybeSingle(),
    supabase.from("expenses").select("id, expense_date, category, amount, status, comment").order("created_at", { ascending: false }),
    supabase
      .from("money_transfers")
      .select("id, amount, initiated_at, status, seller:profiles!money_transfers_seller_id_fkey(first_name,last_name)")
      .order("initiated_at", { ascending: false }),
    supabase.from("balance_operations").select("id, op_date, amount, source, is_loan, comment").order("op_date", { ascending: false }).limit(10),
  ]);

  const pending = (transfers ?? []).filter((t) => t.status === "pending");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Maliyyə</h1>
          <p className="text-sm text-muted-foreground">Kassa, mənfəət, xərclər və köçürmələr.</p>
        </div>
        <FinanceActions />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Direktor kassası" value={manat(cash?.director_cash)} />
        <Stat title="Satıcılarda" value={manat(cash?.sellers_cash)} />
        <Stat title="Yolda" value={manat(cash?.in_transit)} />
        <Stat title="Ümumi nağd" value={manat(cash?.total_business_cash)} highlight />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Mənfəət (nağd əsaslı)</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <Stat title="Dövriyyə" value={manat(pnl?.revenue)} />
          <Stat title="Maya dəyəri" value={manat(pnl?.cogs)} />
          <Stat title="Ümumi mənfəət" value={manat(pnl?.gross_profit)} />
          <Stat title="Təsdiqlənmiş xərc" value={manat(pnl?.approved_expenses)} />
          <Stat title="Xalis mənfəət" value={manat(pnl?.net_profit)} highlight />
        </div>
      </section>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Gözləyən köçürmələr</h2>
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Satıcı</TableHead><TableHead>Tarix</TableHead><TableHead className="text-right">Məbləğ</TableHead><TableHead className="text-right">Əməliyyat</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.seller ? `${t.seller.first_name} ${t.seller.last_name}` : "—"}</TableCell>
                    <TableCell>{shortDate(t.initiated_at)}</TableCell>
                    <TableCell className="text-right font-medium">{manat(t.amount)}</TableCell>
                    <TableCell className="text-right"><TransferRowActions id={t.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Xərclər</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarix</TableHead><TableHead>Kateqoriya</TableHead><TableHead>Şərh</TableHead>
                <TableHead className="text-right">Məbləğ</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expenses ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Xərc yoxdur.</TableCell></TableRow>
              )}
              {(expenses ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{shortDate(e.expense_date)}</TableCell>
                  <TableCell>{EXPENSE_CATEGORY_LABEL[e.category as ExpenseCategory]}</TableCell>
                  <TableCell className="text-muted-foreground">{e.comment ?? "—"}</TableCell>
                  <TableCell className="text-right">{manat(e.amount)}</TableCell>
                  <TableCell><ExpenseStatusBadge status={e.status} /></TableCell>
                  <TableCell className="text-right">{e.status === "pending" ? <ExpenseRowActions id={e.id} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Balans əməliyyatları (son 10)</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tarix</TableHead><TableHead>Mənbə</TableHead><TableHead>Növ</TableHead><TableHead className="text-right">Məbləğ</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(topups ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Qeyd yoxdur.</TableCell></TableRow>
              )}
              {(topups ?? []).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{shortDate(b.op_date)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.source ?? "—"}</TableCell>
                  <TableCell>{b.is_loan ? "Borc/kredit" : "Daxilolma"}</TableCell>
                  <TableCell className="text-right">{manat(b.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-foreground/30" : ""}>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
