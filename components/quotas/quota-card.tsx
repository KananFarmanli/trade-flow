import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuotaStatus } from "@/components/status-badge";
import { ExportButton } from "@/components/export-button";
import { manat, shortDate } from "@/lib/format";

export type QuotaMonthView = {
  month_index: number;
  period_start: string;
  period_end: string;
  goal_amount: number;
  collected: number;
  status_color: string | null;
};
export type QuotaView = {
  id: string;
  name: string;
  doctor_name: string;
  seller_name: string;
  status: string;
  start_date: string;
  total_goal: number;
  monthly_goal: number;
  deviation: number;
  months: QuotaMonthView[];
};

export function QuotaCard({ quota, showSeller = false, action }: { quota: QuotaView; showSeller?: boolean; action?: React.ReactNode }) {
  const collectedTotal = quota.months.reduce((a, m) => a + m.collected, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{quota.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{quota.doctor_name}{showSeller ? ` · ${quota.seller_name}` : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {quota.status === "closed" ? (
              <Badge variant="secondary">Bağlı</Badge>
            ) : (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Aktiv</Badge>
            )}
            <ExportButton href={`/api/export/quota?id=${quota.id}`} />
            {action}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">Ümumi hədəf: <b className="text-foreground">{manat(quota.total_goal)}</b></span>
          <span className="text-muted-foreground">Aylıq: <b className="text-foreground">{manat(quota.monthly_goal)}</b></span>
          <span className="text-muted-foreground">Kənarlaşma: <b className="text-foreground">{quota.deviation}%</b></span>
          <span className="text-muted-foreground">Toplanıb: <b className="text-foreground">{manat(collectedTotal)}</b></span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quota.months.map((m) => (
            <div key={m.month_index} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{shortDate(m.period_start)} – {shortDate(m.period_end)}</span>
                <QuotaStatus color={m.status_color} />
              </div>
              <div className="mt-1 text-sm">
                <b>{manat(m.collected)}</b> <span className="text-muted-foreground">/ {manat(m.goal_amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
