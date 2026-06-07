import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriceTypeBadge } from "@/components/status-badge";
import { manat, qty as fqty, shortDate } from "@/lib/format";
import type { SaleLineRow } from "@/lib/operations";

export function SalesTable({ rows, showSeller = false }: { rows: SaleLineRow[]; showSeller?: boolean }) {
  const cols = showSeller ? 8 : 7;
  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarix</TableHead>
            {showSeller && <TableHead>Satıcı</TableHead>}
            <TableHead>Həkim</TableHead>
            <TableHead>Məhsul</TableHead>
            <TableHead className="text-right">Say</TableHead>
            <TableHead>Qiymət növü</TableHead>
            <TableHead className="text-right">Qiymət</TableHead>
            <TableHead className="text-right">Məbləğ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols} className="text-center text-sm text-muted-foreground">Qeyd yoxdur.</TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.line_id} className={r.price_type === "custom" ? "bg-amber-50" : r.is_free ? "bg-violet-50" : ""}>
              <TableCell>{shortDate(r.date)}</TableCell>
              {showSeller && <TableCell>{r.seller_name}</TableCell>}
              <TableCell>{r.doctor_name}</TableCell>
              <TableCell className="font-medium">
                {r.product_name}
                {r.bonus_reason ? <span className="block text-xs text-muted-foreground">{r.bonus_reason}</span> : null}
              </TableCell>
              <TableCell className="text-right">{fqty(r.qty)}</TableCell>
              <TableCell><PriceTypeBadge type={r.price_type} /></TableCell>
              <TableCell className="text-right">
                {r.price_type === "custom" ? (
                  <span>
                    <span className="mr-1 text-muted-foreground line-through">{manat(r.standard_price)}</span>
                    {manat(r.actual_unit_price)}
                  </span>
                ) : (
                  manat(r.actual_unit_price)
                )}
              </TableCell>
              <TableCell className="text-right font-medium">{manat(r.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
