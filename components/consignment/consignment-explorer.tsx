"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConsignmentTable, type ConsignmentRow } from "@/components/consignment/consignment-table";
import { ExportButton } from "@/components/export-button";
import { manat } from "@/lib/format";

export function ConsignmentExplorer({
  rows,
  sellers,
  basePath = "/director/consignment",
  canPay = true,
}: {
  rows: ConsignmentRow[];
  sellers: { id: string; name: string }[];
  basePath?: string;
  canPay?: boolean;
}) {
  const [q, setQ] = useState("");
  const [seller, setSeller] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !`${r.doctor_name} ${r.seller_name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (seller !== "all" && r.seller_id !== seller) return false;
        if (status === "overdue" && !r.is_overdue) return false;
        if (status === "open" && !(r.remaining > 0)) return false;
        if (status === "closed" && r.remaining > 0) return false;
        return true;
      }),
    [rows, q, seller, status],
  );

  const totals = filtered.reduce(
    (a, r) => ({ billed: a.billed + r.billed, paid: a.paid + r.paid, remaining: a.remaining + r.remaining }),
    { billed: 0, paid: 0, remaining: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Sum title="Verilmiş (məbləğ)" value={manat(totals.billed)} />
        <Sum title="Ödənilib" value={manat(totals.paid)} />
        <Sum title="Qalıq borc" value={manat(totals.remaining)} highlight />
      </div>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Axtarış (həkim, satıcı)" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-60" />
        <Select value={seller} onValueChange={setSeller}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün satıcılar</SelectItem>
            {sellers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Bütün statuslar</SelectItem>
            <SelectItem value="open">Açıq</SelectItem>
            <SelectItem value="overdue">Gecikmiş</SelectItem>
            <SelectItem value="closed">Bağlı</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto"><ExportButton href="/api/export/consignment" /></div>
      </div>
      <ConsignmentTable rows={filtered} basePath={basePath} showSeller canPay={canPay} />
    </div>
  );
}

function Sum({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-foreground/30" : ""}>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}
