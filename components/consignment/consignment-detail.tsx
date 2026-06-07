import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsignmentStatus } from "@/components/status-badge";
import { SalesTable } from "@/components/sales/sales-table";
import { ConsignmentActions, type ReturnableItem } from "@/components/consignment/consignment-actions";
import { flattenSales, type RawSale } from "@/lib/flatten";
import { REALIZATION_DETAIL_SELECT } from "@/lib/consignment";
import { manat, qty as fqty, shortDate } from "@/lib/format";

export async function ConsignmentDetail({ id, backHref, canAct = true }: { id: string; backHref: string; canAct?: boolean }) {
  const supabase = await createClient();
  const { data: r } = await supabase.from("realizations").select(REALIZATION_DETAIL_SELECT).eq("id", id).maybeSingle();
  if (!r) notFound();

  const [{ data: st }, { data: returns }, { data: creditRow }] = await Promise.all([
    supabase.from("v_realization_status").select("billed_net, paid, remaining, overpaid, status_color, is_overdue").eq("realization_id", id).maybeSingle(),
    supabase.from("returns").select("id, return_date, quantity, source_item_id, product:products(name)").eq("source_op_type", "realization").eq("source_op_id", id).order("return_date"),
    supabase.from("v_doctor_credit").select("credit_balance").eq("doctor_id", r.doctor_id).maybeSingle(),
  ]);

  const returnedByItem = new Map<string, number>();
  for (const ret of returns ?? []) {
    if (ret.source_item_id) returnedByItem.set(ret.source_item_id, (returnedByItem.get(ret.source_item_id) ?? 0) + Number(ret.quantity));
  }

  const items = r.items ?? [];
  const returnableItems: ReturnableItem[] = items.map((it) => ({
    id: it.id,
    product_name: it.product?.name ?? "—",
    returnable: Number(it.quantity) - (returnedByItem.get(it.id) ?? 0),
  }));

  const lineRows = flattenSales([
    { id: r.id, sale_date: r.realization_date, seller_id: r.seller_id, doctor: r.doctor, seller: r.seller, items: r.items },
  ] as unknown as RawSale[]);

  const remaining = Number(st?.remaining ?? 0);
  const credit = Number(creditRow?.credit_balance ?? 0);
  const doctorName = r.doctor ? `${r.doctor.first_name} ${r.doctor.last_name}` : "—";
  const sellerName = r.seller ? `${r.seller.first_name} ${r.seller.last_name}` : "—";

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">← Konsiqnasiya</Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{doctorName}</h1>
          <ConsignmentStatus color={st?.status_color ?? null} overpaid={Number(st?.overpaid ?? 0)} />
        </div>
        <p className="text-sm text-muted-foreground">{shortDate(r.realization_date)} · Satıcı: {sellerName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Verilmiş məbləğ" value={manat(st?.billed_net)} />
        <Stat title="Ödənilib" value={manat(st?.paid)} />
        <Stat title="Qalıq" value={manat(remaining)} />
        <Stat title="Artıq ödəniş / avans" value={manat(Number(st?.overpaid ?? 0) || credit)} />
      </div>

      {canAct && <ConsignmentActions realizationId={id} remaining={remaining} creditBalance={credit} items={returnableItems} />}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Məhsullar</h2>
        <SalesTable rows={lineRows} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Ödənişlər</h2>
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Tarix</TableHead><TableHead className="text-right">Məbləğ</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(r.payments ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-sm text-muted-foreground">Ödəniş yoxdur.</TableCell></TableRow>
                )}
                {(r.payments ?? []).map((p) => (
                  <TableRow key={p.id}><TableCell>{shortDate(p.payment_date)}</TableCell><TableCell className="text-right">{manat(p.amount)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Qaytarmalar</h2>
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Tarix</TableHead><TableHead>Məhsul</TableHead><TableHead className="text-right">Say</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(returns ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Qaytarma yoxdur.</TableCell></TableRow>
                )}
                {(returns ?? []).map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell>{shortDate(ret.return_date)}</TableCell>
                    <TableCell>{ret.product?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{fqty(ret.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
