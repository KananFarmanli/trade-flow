"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { manat, qty as fqty } from "@/lib/format";
import { PRICE_TYPES, PRICE_TYPE_LABEL, type PriceType } from "@/lib/price";
import type { OperationItem, OperationPayload, QuotaOption } from "@/lib/operations";

export type DoctorLite = { id: string; first_name: string; last_name: string };
export type ProductLite = { id: string; name: string; available: number; retail: number; consignment: number };

type Line = { key: string; product_id: string; price_type: PriceType; qty: string; price: string; reason: string };

export function OperationFormDialog({
  triggerLabel,
  title,
  description,
  doctors,
  products,
  quotas = [],
  defaultPriceType,
  submit,
  successMessage,
}: {
  triggerLabel: string;
  title: string;
  description: string;
  doctors: DoctorLite[];
  products: ProductLite[];
  quotas?: QuotaOption[];
  defaultPriceType: PriceType;
  submit: (payload: OperationPayload) => Promise<{ error?: string; ok?: boolean }>;
  successMessage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const mk = (): Line => ({ key: crypto.randomUUID(), product_id: "", price_type: defaultPriceType, qty: "1", price: "", reason: "" });
  const [doctorId, setDoctorId] = useState("");
  const [quotaId, setQuotaId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState<Line[]>([mk()]);

  function reset() {
    setDoctorId("");
    setQuotaId("");
    setDate(new Date().toISOString().slice(0, 10));
    setComment("");
    setLines([mk()]);
  }
  const matchingQuotas = quotas.filter((qq) => qq.doctor_id === doctorId);
  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));

  function lineAmount(l: Line): number {
    const p = products.find((x) => x.id === l.product_id);
    const q = Number(l.qty) || 0;
    if (l.price_type === "free_bonus") return 0;
    if (l.price_type === "custom") return (Number(l.price) || 0) * q;
    if (l.price_type === "retail") return (p?.retail ?? 0) * q;
    return (p?.consignment ?? 0) * q;
  }
  const total = lines.reduce((a, l) => a + lineAmount(l), 0);

  function onSubmit() {
    if (!doctorId) return toast.error("Həkim seçin.");
    const items: OperationItem[] = [];
    for (const l of lines) {
      if (!l.product_id) return toast.error("Hər sətirdə məhsul seçin.");
      const q = Number(l.qty);
      if (!q || q <= 0) return toast.error("Miqdar düzgün deyil.");
      if (l.price_type === "custom" && !(l.price !== "" && Number(l.price) >= 0)) return toast.error("Fərdi qiymət daxil edin.");
      if (l.price_type === "free_bonus" && !l.reason.trim()) return toast.error("Pulsuz məhsul üçün səbəb yazın.");
      items.push({
        product_id: l.product_id,
        qty: q,
        price_type: l.price_type,
        actual_unit_price: l.price_type === "custom" ? Number(l.price) : undefined,
        bonus_reason: l.price_type === "free_bonus" ? l.reason.trim() : undefined,
      });
    }
    start(async () => {
      const res = await submit({ doctor_id: doctorId, op_date: date, comment, quota_id: quotaId || null, items });
      if (res.ok) {
        toast.success(successMessage);
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.error ?? "Xəta baş verdi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button>{triggerLabel}</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Həkim</Label>
              <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setQuotaId(""); }}>
                <SelectTrigger><SelectValue placeholder="Həkim seçin" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (<SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tarix</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {matchingQuotas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Kvota (istəyə bağlı)</Label>
              <Select value={quotaId || "none"} onValueChange={(v) => setQuotaId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kvotasız</SelectItem>
                  {matchingQuotas.map((qq) => (<SelectItem key={qq.id} value={qq.id}>{qq.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Məhsullar</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, mk()])}>
                <Plus className="size-4" /> Sətir
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {lines.map((l) => {
                const prod = products.find((x) => x.id === l.product_id);
                const over = prod ? Number(l.qty) > prod.available : false;
                return (
                  <div key={l.key} className="space-y-2 rounded-lg border p-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Select value={l.product_id} onValueChange={(v) => update(l.key, { product_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Məhsul" /></SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} — {fqty(p.available)}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Select value={l.price_type} onValueChange={(v) => update(l.key, { price_type: v as PriceType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRICE_TYPES.map((pt) => (<SelectItem key={pt} value={pt}>{PRICE_TYPE_LABEL[pt]}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min="1" step="1" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(l.key)}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {l.price_type === "custom" && (
                        <Input className="max-w-40" type="number" step="0.01" min="0" value={l.price}
                          onChange={(e) => update(l.key, { price: e.target.value })} placeholder="Fərdi qiymət (₼)" />
                      )}
                      {l.price_type === "free_bonus" && (
                        <Input value={l.reason} onChange={(e) => update(l.key, { reason: e.target.value })} placeholder="Pulsuz vermə səbəbi" />
                      )}
                      <div className="ml-auto text-right text-sm">
                        {over ? <span className="mr-3 text-red-600">Anbarda {fqty(prod!.available)}</span> : null}
                        <span className="font-medium">{manat(lineAmount(l))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Şərh</Label>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Cəmi</span>
            <span className="text-lg font-semibold">{manat(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={pending}>{pending ? "Yadda saxlanılır…" : "Təsdiqlə"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
