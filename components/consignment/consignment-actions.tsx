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
import { PaymentDialog } from "./payment-dialog";
import { returnConsignmentAction, applyCreditAction } from "@/app/actions/consignment";
import { manat, qty as fqty } from "@/lib/format";

export type ReturnableItem = { id: string; product_name: string; returnable: number };

export function ConsignmentActions({
  realizationId,
  remaining,
  creditBalance,
  items,
}: {
  realizationId: string;
  remaining: number;
  creditBalance: number;
  items: ReturnableItem[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {remaining > 0 && <PaymentDialog realizationId={realizationId} remaining={remaining} />}
      <ReturnDialog realizationId={realizationId} items={items} />
      {creditBalance > 0 && remaining > 0 && (
        <ApplyCreditDialog realizationId={realizationId} max={Math.min(creditBalance, remaining)} creditBalance={creditBalance} />
      )}
    </div>
  );
}

function ReturnDialog({ realizationId, items }: { realizationId: string; items: ReturnableItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const selected = items.find((i) => i.id === itemId);
  const returnable = items.filter((i) => i.returnable > 0);

  function submit() {
    if (!itemId) return toast.error("Məhsul seçin.");
    const q = Number(qty);
    if (!q || q <= 0) return toast.error("Miqdar daxil edin.");
    if (selected && q > selected.returnable) return toast.error(`Maksimum ${selected.returnable} qaytarıla bilər.`);
    start(async () => {
      const r = await returnConsignmentAction({ realization_id: realizationId, item_id: itemId, qty: q });
      if (r.ok) {
        toast.success("Qaytarma qeyd olundu.");
        setOpen(false);
        setItemId("");
        setQty("1");
        router.refresh();
      } else {
        toast.error(r.error ?? "Xəta baş verdi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={returnable.length === 0}>Qaytarma</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Məhsul qaytarması</DialogTitle>
          <DialogDescription>Məhsul satıcının anbarına qayıdır; borc və status yenidən hesablanır.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Məhsul</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Məhsul seçin" /></SelectTrigger>
              <SelectContent>
                {returnable.map((i) => (<SelectItem key={i.id} value={i.id}>{i.product_name} — {fqty(i.returnable)} qaytarıla bilər</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Miqdar</Label>
            <Input type="number" min="1" step="1" max={selected?.returnable} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>{pending ? "Qeyd olunur…" : "Qaytar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplyCreditDialog({ realizationId, max, creditBalance }: { realizationId: string; max: number; creditBalance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");

  function submit() {
    const a = Number(amount);
    if (!a || a <= 0) return toast.error("Məbləğ daxil edin.");
    if (a > max) return toast.error(`Maksimum ${manat(max)}.`);
    start(async () => {
      const r = await applyCreditAction({ realization_id: realizationId, amount: a });
      if (r.ok) {
        toast.success("Avans tətbiq olundu.");
        setOpen(false);
        setAmount("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Xəta baş verdi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Avansı tətbiq et</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Həkim avansını tətbiq et</DialogTitle>
          <DialogDescription>Mövcud avans: {manat(creditBalance)}. Bu borca tətbiq olunur (nağd hərəkəti yoxdur).</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Məbləğ (₼)</Label>
            <Input type="number" step="0.01" min="0" max={max} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>{pending ? "Tətbiq olunur…" : "Tətbiq et"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
