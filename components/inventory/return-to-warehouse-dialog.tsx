"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { returnToWarehouse } from "@/app/seller/inventory/actions";
import { qty as fqty } from "@/lib/format";

export function ReturnToWarehouseDialog({ products }: { products: { id: string; name: string; available: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [pid, setPid] = useState("");
  const [q, setQ] = useState("1");
  const sel = products.find((p) => p.id === pid);

  function submit() {
    if (!pid) return toast.error("Məhsul seçin.");
    const n = Number(q);
    if (!n || n <= 0) return toast.error("Miqdar daxil edin.");
    if (sel && n > sel.available) return toast.error(`Maksimum ${sel.available}.`);
    start(async () => {
      const r = await returnToWarehouse({ product_id: pid, qty: n });
      if (r.ok) {
        toast.success("Anbara qaytarıldı.");
        setOpen(false);
        setPid("");
        setQ("1");
        router.refresh();
      } else {
        toast.error(r.error ?? "Xəta baş verdi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={products.length === 0}>Anbara qaytar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anbara qaytarma</DialogTitle>
          <DialogDescription>Məhsul sizin anbardan sahibkar anbarına qayıdır (eyni maya dəyəri ilə).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Məhsul</Label>
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger><SelectValue placeholder="Məhsul seçin" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} — {fqty(p.available)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Miqdar</Label>
            <Input type="number" min="1" step="1" max={sel?.available} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? "Qaytarılır…" : "Qaytar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
