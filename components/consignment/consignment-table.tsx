"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsignmentStatus } from "@/components/status-badge";
import { manat, shortDate } from "@/lib/format";
import { PaymentDialog } from "./payment-dialog";

export type ConsignmentRow = {
  id: string;
  date: string;
  seller_id: string;
  seller_name: string;
  doctor_name: string;
  billed: number;
  paid: number;
  remaining: number;
  overpaid: number;
  status_color: string | null;
  is_overdue: boolean;
  payment_dates: string;
};

export function ConsignmentTable({
  rows,
  basePath,
  showSeller = false,
  canPay = true,
}: {
  rows: ConsignmentRow[];
  basePath: string;
  showSeller?: boolean;
  canPay?: boolean;
}) {
  const cols = showSeller ? 9 : 8;
  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarix</TableHead>
            {showSeller && <TableHead>Satıcı</TableHead>}
            <TableHead>Həkim</TableHead>
            <TableHead className="text-right">Məbləğ</TableHead>
            <TableHead className="text-right">Ödənilib</TableHead>
            <TableHead className="text-right">Qalıq</TableHead>
            <TableHead>Ödəniş tarixləri</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Əməliyyat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols} className="text-center text-sm text-muted-foreground">Konsiqnasiya yoxdur.</TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{shortDate(r.date)}</TableCell>
              {showSeller && <TableCell>{r.seller_name}</TableCell>}
              <TableCell className="font-medium">{r.doctor_name}</TableCell>
              <TableCell className="text-right">{manat(r.billed)}</TableCell>
              <TableCell className="text-right">{manat(r.paid)}</TableCell>
              <TableCell className="text-right font-medium">{manat(r.remaining)}</TableCell>
              <TableCell className="max-w-48 text-xs text-muted-foreground">{r.payment_dates}</TableCell>
              <TableCell><ConsignmentStatus color={r.status_color} overpaid={r.overpaid} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {canPay && r.remaining > 0 && <PaymentDialog realizationId={r.id} remaining={r.remaining} />}
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`${basePath}/${r.id}`}>Detallar</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
