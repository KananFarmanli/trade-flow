"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveExpense, rejectExpense, confirmTransfer, rejectTransfer } from "@/app/director/finance/actions";

export function ExpenseRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="outline" disabled={pending}
        onClick={() => start(async () => { await approveExpense(id); toast.success("Təsdiqləndi."); router.refresh(); })}>
        Təsdiqlə
      </Button>
      <Button size="sm" variant="ghost" disabled={pending}
        onClick={() => start(async () => { await rejectExpense(id); toast.success("Rədd edildi."); router.refresh(); })}>
        Rədd et
      </Button>
    </div>
  );
}

export function TransferRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" disabled={pending}
        onClick={() => start(async () => { await confirmTransfer(id); toast.success("Daxilolma təsdiqləndi."); router.refresh(); })}>
        Təsdiqlə
      </Button>
      <Button size="sm" variant="ghost" disabled={pending}
        onClick={() => start(async () => { await rejectTransfer(id); toast.success("Rədd edildi."); router.refresh(); })}>
        Rədd et
      </Button>
    </div>
  );
}
