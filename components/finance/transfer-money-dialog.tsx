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
import { initiateTransfer } from "@/app/seller/cash/actions";
import { manat } from "@/lib/format";

export function TransferMoneyDialog({ balance }: { balance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("");

  function submit() {
    const a = Number(amount);
    if (!a || a <= 0) return toast.error("Məbləğ daxil edin.");
    if (a > balance) return toast.error(`Balansdan çox ola bilməz (${manat(balance)}).`);
    start(async () => {
      const r = await initiateTransfer({ amount: a });
      if (r.ok) {
        toast.success("Köçürmə göndərildi — direktorun təsdiqini gözləyir.");
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
        <Button disabled={balance <= 0}>Direktora pul köçür</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Direktora pul köçür</DialogTitle>
          <DialogDescription>Balans: {manat(balance)}. Məbləğ direktor təsdiqləyənə qədər “yolda” qalır.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Məbləğ (₼)</Label>
            <Input id="amount" type="number" min="0" step="0.01" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? "Göndərilir…" : "Köçür"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
