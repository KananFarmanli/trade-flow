import { Badge } from "@/components/ui/badge";
import type { PriceType } from "@/lib/price";

/** Price-type chip with the spec's highlight colours (custom=amber, free=violet). */
export function PriceTypeBadge({ type }: { type: PriceType }) {
  if (type === "custom") return <Badge className="bg-amber-500 hover:bg-amber-500">Fərdi</Badge>;
  if (type === "free_bonus") return <Badge className="bg-violet-600 hover:bg-violet-600">Pulsuz</Badge>;
  if (type === "consignment") return <Badge variant="secondary">Konsiqnasiya</Badge>;
  return <Badge variant="outline">Pərakəndə</Badge>;
}

/** Consignment status colour per spec: green=closed, orange=open/partial, red=overdue; violet=overpayment. */
export function ConsignmentStatus({ color, overpaid }: { color: string | null; overpaid?: number }) {
  if (overpaid && overpaid > 0) {
    return <Badge className="bg-violet-600 hover:bg-violet-600">Artıq ödəniş</Badge>;
  }
  const map: Record<string, [string, string]> = {
    green: ["Bağlı", "bg-emerald-600 hover:bg-emerald-600"],
    orange: ["Açıq", "bg-amber-500 hover:bg-amber-500"],
    red: ["Gecikmiş", "bg-red-600 hover:bg-red-600"],
  };
  const [label, cls] = map[color ?? ""] ?? ["—", "bg-muted text-foreground"];
  return <Badge className={cls}>{label}</Badge>;
}

/** Expense status: pending=amber, approved=green, rejected=red. */
export function ExpenseStatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Təsdiqlənib</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rədd edilib</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-500">Gözləyir</Badge>;
}

/** Money-transfer status: pending/in-transit=amber, confirmed=green, rejected=red. */
export function TransferStatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Təsdiqlənib</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rədd edilib</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-500">Yolda</Badge>;
}

/** Quota month colour: green=met, orange=within deviation, red=below. */
export function QuotaStatus({ color }: { color: string | null }) {
  const map: Record<string, [string, string]> = {
    green: ["Yerinə yetirilib", "bg-emerald-600 hover:bg-emerald-600"],
    orange: ["Yol verilən hədddə", "bg-amber-500 hover:bg-amber-500"],
    red: ["Aşağı", "bg-red-600 hover:bg-red-600"],
  };
  const [label, cls] = map[color ?? ""] ?? ["—", "bg-muted text-foreground"];
  return <Badge className={cls}>{label}</Badge>;
}
