"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFormDialog } from "@/lib/use-form-dialog";
import { manat, qty } from "@/lib/format";
import { createProduct, addArrival, updateProductPrices } from "@/app/director/products/actions";

export type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  current_retail_price: number;
  current_consignment_price: number;
  is_active: boolean;
  wh_qty: number;
  cost_value: number;
  retail_value: number;
  consignment_value: number;
};

export function ProductsManager({ products }: { products: ProductRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <ArrivalDialog products={products} />
        <AddProductDialog />
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Məhsul</TableHead>
              <TableHead>Kateqoriya</TableHead>
              <TableHead className="text-right">Anbarda</TableHead>
              <TableHead className="text-right">Maya dəyəri</TableHead>
              <TableHead className="text-right">Pərakəndə</TableHead>
              <TableHead className="text-right">Konsiqnasiya</TableHead>
              <TableHead className="text-right">Anbar dəyəri (maya)</TableHead>
              <TableHead className="text-right">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Hələ məhsul yoxdur.
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow key={p.id} className={p.is_active ? "" : "opacity-50"}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                <TableCell className="text-right">{qty(p.wh_qty)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {p.wh_qty > 0 ? manat(p.cost_value / p.wh_qty) : "—"}
                </TableCell>
                <TableCell className="text-right">{manat(p.current_retail_price)}</TableCell>
                <TableCell className="text-right">{manat(p.current_consignment_price)}</TableCell>
                <TableCell className="text-right">{manat(p.cost_value)}</TableCell>
                <TableCell className="text-right">
                  <EditPricesDialog product={p} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddProductDialog() {
  const { open, setOpen, formAction, pending } = useFormDialog(createProduct, "Məhsul əlavə olundu.");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Yeni məhsul</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Yeni məhsul</DialogTitle>
            <DialogDescription>Qiymətləri sonradan dəyişə bilərsiniz. Mədaxil ayrıca qeyd olunur.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Ad</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Kateqoriya</Label>
              <Input id="category" name="category" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="retail">Pərakəndə qiymət (₼)</Label>
                <Input id="retail" name="retail" type="number" step="0.01" min="0" defaultValue="0" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consignment">Konsiqnasiya qiyməti (₼)</Label>
                <Input id="consignment" name="consignment" type="number" step="0.01" min="0" defaultValue="0" required />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Yaradılır…" : "Yarat"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArrivalDialog({ products }: { products: ProductRow[] }) {
  const { open, setOpen, formAction, pending } = useFormDialog(addArrival, "Mədaxil qeyd olundu.");
  const [productId, setProductId] = useState<string>("");
  const active = products.filter((p) => p.is_active);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Mədaxil (anbar gəliri)</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Mədaxil</DialogTitle>
            <DialogDescription>Yeni partiya anbara daxil olur. Maya dəyəri partiyaya bağlanır (FIFO).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Məhsul</Label>
              <input type="hidden" name="product_id" value={productId} />
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Məhsul seçin" /></SelectTrigger>
                <SelectContent>
                  {active.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qty">Miqdar</Label>
                <Input id="qty" name="qty" type="number" min="1" step="1" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit_cost">Maya dəyəri / ədəd (₼)</Label>
                <Input id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrival_date">Daxilolma tarixi</Label>
              <Input id="arrival_date" name="arrival_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comment">Şərh</Label>
              <Input id="comment" name="comment" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !productId}>{pending ? "Qeyd olunur…" : "Mədaxil et"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPricesDialog({ product }: { product: ProductRow }) {
  const { open, setOpen, formAction, pending } = useFormDialog(updateProductPrices, "Qiymətlər yeniləndi.");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Düzəliş</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{product.name} — qiymətlər</DialogTitle>
            <DialogDescription>Maya dəyəri partiyalarla təyin olunur və burada dəyişmir.</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="id" value={product.id} />
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor={`retail-${product.id}`}>Pərakəndə (₼)</Label>
              <Input id={`retail-${product.id}`} name="retail" type="number" step="0.01" min="0" defaultValue={product.current_retail_price} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cons-${product.id}`}>Konsiqnasiya (₼)</Label>
              <Input id={`cons-${product.id}`} name="consignment" type="number" step="0.01" min="0" defaultValue={product.current_consignment_price} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Yenilənir…" : "Yadda saxla"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
