import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsignmentStatus } from "@/components/status-badge";
import { manat, shortDate } from "@/lib/format";

/** Shared doctor profile (director/manager/seller). Shows no cost/profit — safe for all roles. */
export async function DoctorDetail({ id, backHref }: { id: string; backHref: string }) {
  const supabase = await createClient();
  const { data: doctor } = await supabase.from("doctors").select("*").eq("id", id).maybeSingle();
  if (!doctor) notFound();

  const [{ data: seller }, { data: cons }, { data: creditRow }, { data: sales }] = await Promise.all([
    doctor.assigned_seller_id
      ? supabase.from("profiles").select("first_name, last_name, seller_color").eq("id", doctor.assigned_seller_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("v_realization_status")
      .select("realization_id, realization_date, billed_net, paid, remaining, overpaid, is_overdue, status_color")
      .eq("doctor_id", id)
      .order("realization_date", { ascending: false }),
    supabase.from("v_doctor_credit").select("credit_balance").eq("doctor_id", id).maybeSingle(),
    supabase.from("sales").select("id, sale_date, items:sale_items(line_amount)").eq("doctor_id", id).order("sale_date", { ascending: false }),
  ]);

  const consignments = cons ?? [];
  const totalDebt = consignments.reduce((a, c) => a + Number(c.remaining ?? 0), 0);
  const overdueCount = consignments.filter((c) => c.is_overdue).length;
  const credit = Number(creditRow?.credit_balance ?? 0);
  const saleRows = (sales ?? []).map((s) => ({
    id: s.id,
    sale_date: s.sale_date,
    total: (s.items ?? []).reduce((a, it) => a + Number(it.line_amount ?? 0), 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">← Həkimlər</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{doctor.first_name} {doctor.last_name}</h1>
        <p className="text-sm text-muted-foreground">{[doctor.clinic, doctor.phone, doctor.instagram].filter(Boolean).join(" · ") || "—"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Satıcı</CardTitle></CardHeader>
          <CardContent>
            {seller ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: seller.seller_color ?? "#999" }} />
                {seller.first_name} {seller.last_name}
              </span>
            ) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cari borc</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{manat(totalDebt)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gecikmiş</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{overdueCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avans / kredit</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{manat(credit)}</CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Konsiqnasiya / borclar</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tarix</TableHead><TableHead className="text-right">Məbləğ</TableHead><TableHead className="text-right">Ödənilib</TableHead><TableHead className="text-right">Qalıq</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {consignments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Konsiqnasiya yoxdur.</TableCell></TableRow>
              )}
              {consignments.map((c) => (
                <TableRow key={c.realization_id}>
                  <TableCell>{shortDate(c.realization_date)}</TableCell>
                  <TableCell className="text-right">{manat(c.billed_net)}</TableCell>
                  <TableCell className="text-right">{manat(c.paid)}</TableCell>
                  <TableCell className="text-right font-medium">{manat(c.remaining)}</TableCell>
                  <TableCell><ConsignmentStatus color={c.status_color} overpaid={Number(c.overpaid ?? 0)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Satışlar</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader><TableRow><TableHead>Tarix</TableHead><TableHead className="text-right">Məbləğ</TableHead></TableRow></TableHeader>
            <TableBody>
              {saleRows.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground">Satış yoxdur.</TableCell></TableRow>
              )}
              {saleRows.map((s) => (
                <TableRow key={s.id}><TableCell>{shortDate(s.sale_date)}</TableCell><TableCell className="text-right">{manat(s.total)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
