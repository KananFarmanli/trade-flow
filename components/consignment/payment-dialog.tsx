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
import { addPaymentAction } from "@/app/actions/consignment";
import { manat } from "@/lib/format";

export function PaymentDialog({ realizationId, remaining }: { realizationId: string; remaining: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function submit() {
    const a = Number(amount);
    if (!a || a <= 0) return toast.error("Məbləğ daxil edin.");
    if (a > remaining) return toast.error(`Qalıqdan çox ola bilməz (${manat(remaining)}).`);
    start(async () => {
      const r = await addPaymentAction({ realization_id: realizationId, amount: a, payment_date: date });
      if (r.ok) {
        toast.success("Ödəniş əlavə olundu.");
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
        <Button size="sm" variant="outline">Ödəniş</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ödəniş əlavə et</DialogTitle>
          <DialogDescription>Qalıq borc: {manat(remaining)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Məbləğ (₼)</Label>
            <Input type="number" step="0.01" min="0" max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tarix</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>{pending ? "Əlavə olunur…" : "Təsdiqlə"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
