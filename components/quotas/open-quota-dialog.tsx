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
import { openQuotaAction } from "@/app/actions/quota";

export function OpenQuotaDialog({
  templates,
  doctors,
}: {
  templates: { id: string; name: string }[];
  doctors: { id: string; first_name: string; last_name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [tpl, setTpl] = useState("");
  const [doc, setDoc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function submit() {
    if (!tpl) return toast.error("Şablon seçin.");
    if (!doc) return toast.error("Həkim seçin.");
    start(async () => {
      const r = await openQuotaAction({ template_id: tpl, doctor_id: doc, start_date: date });
      if (r.ok) {
        toast.success("Kvota açıldı.");
        setOpen(false);
        setTpl("");
        setDoc("");
        router.refresh();
      } else {
        toast.error(r.error ?? "Xəta baş verdi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Kvota aç</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kvota aç</DialogTitle>
          <DialogDescription>Şablon və həkim seçin. Aylar başlanğıc tarixindən hesablanır.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Şablon</Label>
            <Select value={tpl} onValueChange={setTpl}>
              <SelectTrigger><SelectValue placeholder="Şablon seçin" /></SelectTrigger>
              <SelectContent>{templates.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Həkim</Label>
            <Select value={doc} onValueChange={setDoc}>
              <SelectTrigger><SelectValue placeholder="Həkim seçin" /></SelectTrigger>
              <SelectContent>{doctors.map((d) => (<SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Başlanğıc tarixi</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={pending}>{pending ? "Açılır…" : "Aç"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
