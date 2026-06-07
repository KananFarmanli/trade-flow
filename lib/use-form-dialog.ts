"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";

/** Wires a form server action to a dialog: toasts, closes on success, refreshes data. */
export function useFormDialog(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  successMessage: string,
) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(successMessage);
      setOpen(false);
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return { open, setOpen, state, formAction, pending };
}
