import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesTable } from "@/components/sales/sales-table";
import { ConsignmentTable } from "@/components/consignment/consignment-table";
import { flattenSales, type RawSale } from "@/lib/flatten";
import { buildConsignmentRows, REALIZATION_LIST_SELECT } from "@/lib/consignment";
import { manat, qty as fqty, shortDate } from "@/lib/format";

const SALE_SELECT =
  "id, sale_date, seller_id, seller:profiles!sales_seller_id_fkey(first_name,last_name), doctor:doctors(first_name,last_name), items:sale_items(id, quantity, price_type, actual_unit_price, unit_retail_snapshot, unit_consignment_snapshot, line_amount, is_free, bonus_reason, product:products(name))";

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("first_name, last_name, seller_color, role").eq("id", id).maybeSingle();
  if (!profile || profile.role !== "seller") notFound();

  const [{ data: cash }, { data: onHand }, { data: cost }, { data: sales }, { data: reals }, { data: statuses }, { data: logs }] =
    await Promise.all([
      supabase.from("v_seller_cash").select("cash_balance, in_transit").eq("seller_id", id).maybeSingle(),
      supabase.from("v_stock_on_hand").select("product_id, product_name, quantity, retail_value, consignment_value").eq("holder_type", "seller").eq("seller_id", id),
      supabase.from("v_stock_cost").select("product_id, cost_value").eq("holder_type", "seller").eq("seller_id", id),
      supabase.from("sales").select(SALE_SELECT).eq("seller_id", id).order("sale_date", { ascending: false }),
      supabase.from("realizations").select(REALIZATION_LIST_SELECT).eq("seller_id", id).order("realization_date", { ascending: false }),
      supabase.from("v_realization_status").select("realization_id, billed_net, paid, remaining, overpaid, status_color, is_overdue").eq("seller_id", id),
      supabase.from("audit_logs").select("id, created_at, action, entity_type, comment").eq("actor_id", id).order("created_at", { ascending: false }).limit(100),
    ]);

  const saleRows = flattenSales((sales ?? []) as unknown as RawSale[]);
  const consRows = buildConsignmentRows(
    (reals ?? []) as unknown as Parameters<typeof buildConsignmentRows>[0],
    (statuses ?? []) as unknown as Parameters<typeof buildConsignmentRows>[1],
  );
  const costByProduct = new Map((cost ?? []).map((c) => [c.product_id, Number(c.cost_value)]));
  const inv = (onHand ?? []).filter((r) => r.product_id).map((r) => ({
    id: r.product_id as string,
    name: r.product_name ?? "",
    qty: Number(r.quantity),
    cost: costByProduct.get(r.product_id as string) ?? 0,
    retail: Number(r.retail_value),
    consignment: Number(r.consignment_value),
  }));

  const salesTotal = saleRows.reduce((a, r) => a + r.amount, 0);
  const debt = consRows.reduce((a, r) => a + r.remaining, 0);
  const invCost = inv.reduce((a, r) => a + r.cost, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/director/sellers" className="text-sm text-muted-foreground hover:underline">← Satıcılar</Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: profile.seller_color ?? "#999" }} />
          {profile.first_name} {profile.last_name}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Kpi title="Kassa" value={manat(cash?.cash_balance)} highlight />
        <Kpi title="Yolda" value={manat(cash?.in_transit)} />
        <Kpi title="Satış (cəmi)" value={manat(salesTotal)} />
        <Kpi title="Borc (həkimlərdə)" value={manat(debt)} />
        <Kpi title="Anbar (maya)" value={manat(invCost)} />
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Anbar</TabsTrigger>
          <TabsTrigger value="sales">Satışlar</TabsTrigger>
          <TabsTrigger value="consignment">Konsiqnasiya</TabsTrigger>
          <TabsTrigger value="history">Tarixçə</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Məhsul</TableHead><TableHead className="text-right">Miqdar</TableHead><TableHead className="text-right">Maya dəyəri</TableHead><TableHead className="text-right">Pərakəndə dəyəri</TableHead><TableHead className="text-right">Konsiqnasiya dəyəri</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {inv.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Anbar boşdur.</TableCell></TableRow>)}
                {inv.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{fqty(r.qty)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{manat(r.cost)}</TableCell>
                    <TableCell className="text-right">{manat(r.retail)}</TableCell>
                    <TableCell className="text-right">{manat(r.consignment)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-4"><SalesTable rows={saleRows} /></TabsContent>
        <TabsContent value="consignment" className="mt-4"><ConsignmentTable rows={consRows} basePath="/director/consignment" /></TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader><TableRow><TableHead>Vaxt</TableHead><TableHead>Əməliyyat</TableHead><TableHead>Obyekt</TableHead></TableRow></TableHeader>
              <TableBody>
                {(logs ?? []).length === 0 && (<TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Qeyd yoxdur.</TableCell></TableRow>)}
                {(logs ?? []).map((l) => (
                  <TableRow key={l.id}><TableCell className="text-muted-foreground">{shortDate(l.created_at)}</TableCell><TableCell className="font-medium">{l.action}</TableCell><TableCell>{l.entity_type}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
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
