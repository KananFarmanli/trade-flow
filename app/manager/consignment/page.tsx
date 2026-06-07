import { createClient } from "@/utils/supabase/server";
import { ConsignmentExplorer } from "@/components/consignment/consignment-explorer";
import { buildConsignmentRows, REALIZATION_LIST_SELECT } from "@/lib/consignment";

export default async function ManagerConsignmentPage() {
  const supabase = await createClient();
  const [{ data: reals }, { data: statuses }, { data: sellers }] = await Promise.all([
    supabase.from("realizations").select(REALIZATION_LIST_SELECT).is("quota_id", null).order("realization_date", { ascending: false }),
    supabase.from("v_realization_status").select("realization_id, billed_net, paid, remaining, overpaid, status_color, is_overdue"),
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "seller"),
  ]);
  const rows = buildConsignmentRows(
    (reals ?? []) as unknown as Parameters<typeof buildConsignmentRows>[0],
    (statuses ?? []) as unknown as Parameters<typeof buildConsignmentRows>[1],
  );
  const sellerOpts = (sellers ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Konsiqnasiya</h1>
        <p className="text-sm text-muted-foreground">Bütün satıcıların konsiqnasiyaları, borclar və statuslar (yalnız baxış).</p>
      </div>
      <ConsignmentExplorer rows={rows} sellers={sellerOpts} basePath="/manager/consignment" canPay={false} />
    </div>
  );
}
