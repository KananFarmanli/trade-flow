import { QuotaCard, type QuotaView } from "@/components/quotas/quota-card";
import { CloseQuotaButton } from "@/components/quotas/close-quota-button";

export function QuotasList({
  quotas,
  showSeller = false,
  canClose = false,
}: {
  quotas: QuotaView[];
  showSeller?: boolean;
  canClose?: boolean;
}) {
  if (quotas.length === 0) return <p className="text-sm text-muted-foreground">Kvota yoxdur.</p>;
  return (
    <div className="space-y-4">
      {quotas.map((q) => (
        <QuotaCard
          key={q.id}
          quota={q}
          showSeller={showSeller}
          action={canClose && q.status === "active" ? <CloseQuotaButton id={q.id} /> : undefined}
        />
      ))}
    </div>
  );
}
