"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFormDialog } from "@/lib/use-form-dialog";
import { manat } from "@/lib/format";
import { createTemplate, setTemplateActive } from "@/app/director/quotas/actions";

export type TemplateRow = {
  id: string;
  name: string;
  duration_months: number;
  total_goal: number;
  monthly_goal: number;
  allowed_deviation_pct: number;
  is_active: boolean;
};

export function TemplatesManager({ templates }: { templates: TemplateRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Kvota şablonları</h2>
        <AddTemplateDialog />
      </div>
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead className="text-right">Müddət (ay)</TableHead>
              <TableHead className="text-right">Ümumi hədəf</TableHead>
              <TableHead className="text-right">Aylıq hədəf</TableHead>
              <TableHead className="text-right">Kənarlaşma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Əməliyyat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Şablon yoxdur.</TableCell></TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id} className={t.is_active ? "" : "opacity-50"}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-right">{t.duration_months}</TableCell>
                <TableCell className="text-right">{manat(t.total_goal)}</TableCell>
                <TableCell className="text-right">{manat(t.monthly_goal)}</TableCell>
                <TableCell className="text-right">{t.allowed_deviation_pct}%</TableCell>
                <TableCell>
                  {t.is_active ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Aktiv</Badge> : <Badge variant="secondary">Deaktiv</Badge>}
                </TableCell>
                <TableCell className="text-right"><ToggleButton id={t.id} active={t.is_active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending}
      onClick={() => start(async () => { await setTemplateActive(id, !active); router.refresh(); })}>
      {active ? "Deaktiv et" : "Aktiv et"}
    </Button>
  );
}

function AddTemplateDialog() {
  const { open, setOpen, formAction, pending } = useFormDialog(createTemplate, "Şablon əlavə olundu.");
  const [total, setTotal] = useState("");
  const [dur, setDur] = useState("");
  const monthly = Number(total) > 0 && Number(dur) > 0 ? Number(total) / Number(dur) : 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Yeni şablon</Button></DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Yeni kvota şablonu</DialogTitle>
            <DialogDescription>Aylıq hədəf avtomatik hesablanır: ümumi / müddət.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Ad</Label>
              <Input id="name" name="name" placeholder="məs. Tayland" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="duration_months">Müddət (ay)</Label>
                <Input id="duration_months" name="duration_months" type="number" min="1" step="1" value={dur} onChange={(e) => setDur(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total_goal">Ümumi hədəf (₼)</Label>
                <Input id="total_goal" name="total_goal" type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allowed_deviation_pct">Kənarlaşma (%)</Label>
                <Input id="allowed_deviation_pct" name="allowed_deviation_pct" type="number" min="0" max="100" step="0.01" defaultValue="15" required />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              Aylıq hədəf: <b>{manat(monthly)}</b>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Yaradılır…" : "Yarat"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
