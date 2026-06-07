"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeQuotaAction } from "@/app/director/quotas/actions";

export function CloseQuotaButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => { await closeQuotaAction(id); toast.success("Kvota bağlandı."); router.refresh(); })}
    >
      Bağla
    </Button>
  );
}
