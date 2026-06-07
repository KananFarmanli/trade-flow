import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { manat } from "@/lib/format";

export default async function SellersPage() {
  const supabase = await createClient();
  const { data: sellers } = await supabase
    .from("v_seller_cash")
    .select("seller_id, first_name, last_name, seller_color, cash_balance, in_transit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Satıcılar</h1>
        <p className="text-sm text-muted-foreground">Satıcı profillərinə keçin: satışlar, konsiqnasiya, anbar və tarixçə.</p>
      </div>
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Satıcı</TableHead><TableHead className="text-right">Kassa</TableHead><TableHead className="text-right">Yolda</TableHead><TableHead className="text-right">Profil</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(sellers ?? []).length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Satıcı yoxdur.</TableCell></TableRow>
            )}
            {(sellers ?? []).map((s) => (
              <TableRow key={s.seller_id}>
                <TableCell>
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span className="inline-block size-3 rounded-full border" style={{ backgroundColor: s.seller_color ?? "#999" }} />
                    {s.first_name} {s.last_name}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{manat(s.cash_balance)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{manat(s.in_transit)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm"><Link href={`/director/sellers/${s.seller_id}`}>Profil</Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
