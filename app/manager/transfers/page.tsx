import { createClient } from "@/utils/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransferDialog } from "@/components/warehouse/transfer-dialog";
import { qty as fqty, shortDate } from "@/lib/format";

export default async function ManagerTransfersPage() {
  const supabase = await createClient();
  const [{ data: sellers }, { data: warehouse }, { data: moves }] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, is_active").eq("role", "seller"),
    supabase.from("v_stock_on_hand").select("product_id, product_name, quantity").eq("holder_type", "warehouse"),
    supabase
      .from("stock_movements")
      .select("id, created_at, quantity, product:products(name), to_seller:profiles!stock_movements_to_seller_id_fkey(first_name,last_name)")
      .eq("movement_type", "transfer_to_seller")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const activeSellers = (sellers ?? []).filter((s) => s.is_active).map((s) => ({ id: s.id, first_name: s.first_name, last_name: s.last_name }));
  const products = (warehouse ?? [])
    .filter((r) => r.product_id && Number(r.quantity) > 0)
    .map((r) => ({ id: r.product_id as string, name: r.product_name ?? "", wh_qty: Number(r.quantity) }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transferlər</h1>
          <p className="text-sm text-muted-foreground">Anbardan satıcının şəxsi anbarına məhsul ötürün.</p>
        </div>
        <TransferDialog sellers={activeSellers} products={products} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Son ötürmələr</h2>
        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tarix</TableHead><TableHead>Məhsul</TableHead><TableHead>Satıcı</TableHead><TableHead className="text-right">Miqdar</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(moves ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Ötürmə yoxdur.</TableCell></TableRow>
              )}
              {(moves ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{shortDate(m.created_at)}</TableCell>
                  <TableCell className="font-medium">{m.product?.name ?? "—"}</TableCell>
                  <TableCell>{m.to_seller ? `${m.to_seller.first_name} ${m.to_seller.last_name}` : "—"}</TableCell>
                  <TableCell className="text-right">{fqty(m.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
