import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { manat, qty as fqty } from "@/lib/format";
import { ExportButton } from "@/components/export-button";

type OnHand = {
  holder_type: string;
  seller_id: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  retail_value: number;
  consignment_value: number;
};

export default async function ManagerWarehousePage() {
  const supabase = await createClient();
  const [{ data: onHandRaw }, { data: sellers }] = await Promise.all([
    supabase.from("v_stock_on_hand").select("holder_type, seller_id, product_id, product_name, quantity, retail_value, consignment_value"),
    supabase.from("profiles").select("id, first_name, last_name, seller_color").eq("role", "seller"),
  ]);

  const rows: OnHand[] = (onHandRaw ?? [])
    .filter((r) => r.holder_type && r.product_id)
    .map((r) => ({
      holder_type: r.holder_type as string,
      seller_id: r.seller_id,
      product_id: r.product_id as string,
      product_name: r.product_name ?? "",
      quantity: Number(r.quantity),
      retail_value: Number(r.retail_value),
      consignment_value: Number(r.consignment_value),
    }));

  const warehouse = rows.filter((r) => r.holder_type === "warehouse");
  const sellerRows = rows.filter((r) => r.holder_type === "seller");
  const bySeller = new Map<string, OnHand[]>();
  for (const r of sellerRows) {
    const k = r.seller_id as string;
    (bySeller.get(k) ?? bySeller.set(k, []).get(k)!).push(r);
  }
  const sum = (rs: OnHand[]) => rs.reduce((a, r) => ({ retail: a.retail + r.retail_value, consignment: a.consignment + r.consignment_value }), { retail: 0, consignment: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Anbar</h1>
          <p className="text-sm text-muted-foreground">Sahibkar anbarı və satıcı anbarları (pərakəndə və konsiqnasiya dəyəri ilə).</p>
        </div>
        <ExportButton href="/api/export/warehouse" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ValueCard title="Sahibkar anbarı" t={sum(warehouse)} />
        <ValueCard title="Satıcılarda" t={sum(sellerRows)} />
        <ValueCard title="Ümumi" t={sum(rows)} highlight />
      </div>

      <StockSection title="Sahibkar anbarı" rows={warehouse} />
      {[...bySeller.entries()].map(([sid, rs]) => {
        const s = (sellers ?? []).find((x) => x.id === sid);
        return <StockSection key={sid} title={s ? `${s.first_name} ${s.last_name}` : "Satıcı"} color={s?.seller_color ?? undefined} rows={rs} />;
      })}
    </div>
  );
}

function ValueCard({ title, t, highlight }: { title: string; t: { retail: number; consignment: number }; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-foreground/30" : ""}>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pərakəndə</span><span className="font-medium">{manat(t.retail)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Konsiqnasiya</span><span className="font-medium">{manat(t.consignment)}</span></div>
      </CardContent>
    </Card>
  );
}

function StockSection({ title, color, rows }: { title: string; color?: string; rows: OnHand[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {color ? <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: color }} /> : null}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Məhsul</TableHead>
              <TableHead className="text-right">Miqdar</TableHead>
              <TableHead className="text-right">Pərakəndə dəyəri</TableHead>
              <TableHead className="text-right">Konsiqnasiya dəyəri</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Boşdur.</TableCell></TableRow>)}
            {rows.map((r) => (
              <TableRow key={r.product_id}>
                <TableCell className="font-medium">{r.product_name}</TableCell>
                <TableCell className="text-right">{fqty(r.quantity)}</TableCell>
                <TableCell className="text-right">{manat(r.retail_value)}</TableCell>
                <TableCell className="text-right">{manat(r.consignment_value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
