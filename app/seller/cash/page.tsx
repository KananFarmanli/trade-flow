import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransferMoneyDialog } from "@/components/finance/transfer-money-dialog";
import { TransferStatusBadge } from "@/components/status-badge";
import { manat, shortDate } from "@/lib/format";

export default async function SellerCashPage() {
  const profile = await getCurrentProfile();
  const me = profile!.id;
  const supabase = await createClient();

  const [{ data: cash }, { data: transfers }] = await Promise.all([
    supabase.from("v_seller_cash").select("cash_balance, in_transit").eq("seller_id", me).maybeSingle(),
    supabase.from("money_transfers").select("id, amount, initiated_at, confirmed_at, status").eq("seller_id", me).order("initiated_at", { ascending: false }),
  ]);

  const balance = Number(cash?.cash_balance ?? 0);
  const inTransit = Number(cash?.in_transit ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kassa / Köçürmə</h1>
          <p className="text-sm text-muted-foreground">Sizin kassanız və direktora pul köçürmələri.</p>
        </div>
        <TransferMoneyDialog balance={balance} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-foreground/30">
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Kassa balansı</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{manat(balance)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">Yolda (təsdiq gözləyir)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{manat(inTransit)}</CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Köçürmələr</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Göndərilmə</TableHead><TableHead className="text-right">Məbləğ</TableHead><TableHead>Status</TableHead><TableHead>Təsdiq tarixi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(transfers ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Köçürmə yoxdur.</TableCell></TableRow>
              )}
              {(transfers ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{shortDate(t.initiated_at)}</TableCell>
                  <TableCell className="text-right font-medium">{manat(t.amount)}</TableCell>
                  <TableCell><TransferStatusBadge status={t.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{shortDate(t.confirmed_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
