import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { manat } from "@/lib/format";

export default async function SellerDashboard() {
  const profile = await getCurrentProfile();
  const me = profile!.id;
  const supabase = await createClient();
  const [{ data: cash }, { data: status }, { data: stock }] = await Promise.all([
    supabase.from("v_seller_cash").select("cash_balance, in_transit").eq("seller_id", me).maybeSingle(),
    supabase.from("v_realization_status").select("remaining, is_overdue").eq("seller_id", me),
    supabase.from("v_stock_on_hand").select("retail_value").eq("holder_type", "seller").eq("seller_id", me),
  ]);
  const debt = (status ?? []).reduce((a, r) => a + Number(r.remaining ?? 0), 0);
  const overdue = (status ?? []).filter((r) => r.is_overdue).length;
  const invRetail = (stock ?? []).reduce((a, r) => a + Number(r.retail_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İcmal</h1>
        <p className="text-sm text-muted-foreground">Xoş gəldiniz, {profile?.first_name}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Kpi title="Kassa balansı" value={manat(cash?.cash_balance)} highlight />
        <Kpi title="Yolda" value={manat(cash?.in_transit)} />
        <Kpi title="Həkim borcları" value={manat(debt)} />
        <Kpi title="Gecikmiş" value={String(overdue)} />
        <Kpi title="Anbar (pərakəndə)" value={manat(invRetail)} />
      </div>
    </div>
  );
}

function Kpi({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-foreground/30" : ""}>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
