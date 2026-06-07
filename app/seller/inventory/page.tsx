import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReturnToWarehouseDialog } from "@/components/inventory/return-to-warehouse-dialog";
import { ExportButton } from "@/components/export-button";
import { manat, qty as fqty } from "@/lib/format";

export default async function SellerInventoryPage() {
  const profile = await getCurrentProfile();
  const me = profile!.id;
  const supabase = await createClient();
  const { data: stock } = await supabase
    .from("v_stock_on_hand")
    .select("product_id, product_name, quantity, retail_value, consignment_value")
    .eq("holder_type", "seller")
    .eq("seller_id", me);

  const rows = (stock ?? [])
    .filter((r) => r.product_id)
    .map((r) => ({
      id: r.product_id as string,
      name: r.product_name ?? "",
      qty: Number(r.quantity),
      retail: Number(r.retail_value),
      consignment: Number(r.consignment_value),
    }));
  const products = rows.filter((r) => r.qty > 0).map((r) => ({ id: r.id, name: r.name, available: r.qty }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mənim anbarım</h1>
          <p className="text-sm text-muted-foreground">Şəxsi anbarınızdakı qalıqlar.</p>
        </div>
        <div className="flex gap-2">
          <ExportButton href="/api/export/warehouse" />
          <ReturnToWarehouseDialog products={products} />
        </div>
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
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Anbarınız boşdur.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">{fqty(r.qty)}</TableCell>
                <TableCell className="text-right">{manat(r.retail)}</TableCell>
                <TableCell className="text-right">{manat(r.consignment)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
