"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormDialog } from "@/lib/use-form-dialog";
import { transferToSeller } from "@/app/director/warehouse/actions";
import { qty as fqty } from "@/lib/format";

type Seller = { id: string; first_name: string; last_name: string };
type Prod = { id: string; name: string; wh_qty: number };

export function TransferDialog({ sellers, products }: { sellers: Seller[]; products: Prod[] }) {
  const { open, setOpen, formAction, pending } = useFormDialog(transferToSeller, "Məhsul satıcıya ötürüldü.");
  const [sellerId, setSellerId] = useState("");
  const [productId, setProductId] = useState("");
  const selected = products.find((p) => p.id === productId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Satıcıya ötür</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Satıcıya ötürmə</DialogTitle>
            <DialogDescription>Anbardan satıcının şəxsi anbarına. Bu satış deyil — yalnız hərəkətdir (FIFO).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Satıcı</Label>
              <input type="hidden" name="seller_id" value={sellerId} />
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger><SelectValue placeholder="Satıcı seçin" /></SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Məhsul</Label>
              <input type="hidden" name="product_id" value={productId} />
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Məhsul seçin" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {fqty(p.wh_qty)} anbarda</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Miqdar</Label>
              <Input id="qty" name="qty" type="number" min="1" step="1" max={selected?.wh_qty} required />
              {selected ? <p className="text-xs text-muted-foreground">Anbarda mövcud: {fqty(selected.wh_qty)}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !sellerId || !productId}>
              {pending ? "Ötürülür…" : "Ötür"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
