"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/app/account/actions";
import type { ActionState } from "@/lib/actions";

export function AccountForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, null);
  useEffect(() => {
    if (state?.ok) toast.success("Şifrə yeniləndi.");
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-background p-6">
      <h2 className="text-sm font-semibold">Şifrəni dəyiş</h2>
      <div className="space-y-1.5">
        <Label htmlFor="password">Yeni şifrə</Label>
        <Input id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Təkrar</Label>
        <Input id="confirm" name="confirm" type="password" minLength={6} autoComplete="new-password" required />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Yadda saxlanılır…" : "Yadda saxla"}</Button>
    </form>
  );
}
