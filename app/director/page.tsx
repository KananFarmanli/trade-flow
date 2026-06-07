import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { manat, qty as fqty } from "@/lib/format";

export default async function DirectorDashboard() {
  const supabase = await createClient();
  const [{ data: cash }, { data: pnl }, { data: status }, { data: cost }, { data: sellerCash }, { count: pendingTransfers }, { count: pendingExpenses }] =
    await Promise.all([
      supabase.from("v_business_cash").select("*").maybeSingle(),
      supabase.from("v_profit_summary").select("*").maybeSingle(),
      supabase.from("v_realization_status").select("remaining, is_overdue"),
      supabase.from("v_stock_cost").select("cost_value"),
      supabase.from("v_seller_cash").select("seller_id, first_name, last_name, seller_color, cash_balance, in_transit"),
      supabase.from("money_transfers").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const totalDebt = (status ?? []).reduce((a, r) => a + Number(r.remaining ?? 0), 0);
  const overdue = (status ?? []).filter((r) => r.is_overdue).length;
  const productAsset = (cost ?? []).reduce((a, r) => a + Number(r.cost_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İcmal</h1>
        <p className="text-sm text-muted-foreground">Biznesin ümumi vəziyyəti.</p>
      </div>

      {((pendingTransfers ?? 0) > 0 || (pendingExpenses ?? 0) > 0) && (
        <Link href="/director/finance" className="block rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100">
          Təsdiq gözləyir: {pendingTransfers ?? 0} köçürmə, {pendingExpenses ?? 0} xərc → Maliyyə bölməsinə keçin
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi title="Ümumi nağd" value={manat(cash?.total_business_cash)} />
        <Kpi title="Xalis mənfəət" value={manat(pnl?.net_profit)} highlight />
        <Kpi title="Dövriyyə" value={manat(pnl?.revenue)} />
        <Kpi title="Cari borc" value={manat(totalDebt)} />
        <Kpi title="Gecikmiş" value={String(overdue)} />
        <Kpi title="Məhsul aktivi (maya)" value={manat(productAsset)} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Satıcı kassaları</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Satıcı</TableHead><TableHead className="text-right">Balans</TableHead><TableHead className="text-right">Yolda</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(sellerCash ?? []).length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Satıcı yoxdur.</TableCell></TableRow>
              )}
              {(sellerCash ?? []).map((s) => (
                <TableRow key={s.seller_id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: s.seller_color ?? "#999" }} />
                      {s.first_name} {s.last_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{manat(s.cash_balance)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{manat(s.in_transit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-foreground/30" : ""}>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
