import { createClient } from "@/utils/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { shortDate } from "@/lib/format";

const ENTITY_LABEL: Record<string, string> = {
  sales: "Satış", realizations: "Konsiqnasiya", payments: "Ödəniş", returns: "Qaytarma",
  batches: "Mədaxil", transfer: "Transfer", return: "Qaytarma", money_transfers: "Köçürmə",
  expenses: "Xərc", balance_operations: "Balans", quotas: "Kvota", doctors: "Həkim",
  products: "Məhsul", profiles: "İstifadəçi", doctor_credit_movements: "Avans/kredit",
};

function dt(x: string | null) {
  if (!x) return "—";
  const d = new Date(x);
  return `${shortDate(x)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, created_at, action, entity_type, comment, actor:profiles!audit_logs_actor_id_fkey(first_name,last_name)")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tarixçə</h1>
        <p className="text-sm text-muted-foreground">Bütün əməliyyatların hərəkət jurnalı (son 300).</p>
      </div>
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vaxt</TableHead><TableHead>İstifadəçi</TableHead><TableHead>Əməliyyat</TableHead><TableHead>Obyekt</TableHead><TableHead>Şərh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(logs ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Qeyd yoxdur.</TableCell></TableRow>
            )}
            {(logs ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{dt(l.created_at)}</TableCell>
                <TableCell>{l.actor ? `${l.actor.first_name} ${l.actor.last_name}` : "Sistem"}</TableCell>
                <TableCell className="font-medium">{l.action}</TableCell>
                <TableCell>{ENTITY_LABEL[l.entity_type] ?? l.entity_type}</TableCell>
                <TableCell className="text-muted-foreground">{l.comment ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
