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
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/expense";
import type { ActionState } from "@/lib/actions";

export function AddExpenseDialog({
  action,
  description,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  description: string;
}) {
  const { open, setOpen, formAction, pending } = useFormDialog(action, "Xərc əlavə olundu.");
  const [category, setCategory] = useState("other");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Xərc əlavə et</Button></DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Xərc əlavə et</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Kateqoriya</Label>
              <input type="hidden" name="category" value={category} />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Məbləğ (₼)</Label>
                <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expense_date">Tarix</Label>
                <Input id="expense_date" name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comment">Şərh</Label>
              <Input id="comment" name="comment" />
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Əlavə olunur…" : "Əlavə et"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
