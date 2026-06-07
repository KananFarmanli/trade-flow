import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { manat } from "@/lib/format";

export default async function ManagerDashboard() {
  const supabase = await createClient();
  const [{ count: doctors }, { data: status }, { data: stock }] = await Promise.all([
    supabase.from("doctors").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("v_realization_status").select("remaining, is_overdue"),
    supabase.from("v_stock_on_hand").select("retail_value, consignment_value"),
  ]);
  const debt = (status ?? []).reduce((a, r) => a + Number(r.remaining ?? 0), 0);
  const overdue = (status ?? []).filter((r) => r.is_overdue).length;
  const retail = (stock ?? []).reduce((a, r) => a + Number(r.retail_value ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">İcmal</h1>
        <p className="text-sm text-muted-foreground">Əməliyyat göstəriciləri (maliyyə məlumatı göstərilmir).</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Aktiv həkimlər" value={String(doctors ?? 0)} />
        <Kpi title="Ümumi borc" value={manat(debt)} />
        <Kpi title="Gecikmiş konsiqnasiya" value={String(overdue)} />
        <Kpi title="Anbar (pərakəndə dəyəri)" value={manat(retail)} />
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
