"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalesTable } from "@/components/sales/sales-table";
import { ExportButton } from "@/components/export-button";
import { manat } from "@/lib/format";
import { PRICE_TYPES, PRICE_TYPE_LABEL, type PriceType } from "@/lib/price";
import type { SaleLineRow } from "@/lib/operations";

type Econ = Record<string, { revenue: number; cogs: number }>;

export function SalesExplorer({
  rows,
  econ,
  sellers,
}: {
  rows: SaleLineRow[];
  econ?: Econ;
  sellers: { id: string; name: string }[];
}) {
  const [q, setQ] = useState("");
  const [seller, setSeller] = useState("all");
  const [pt, setPt] = useState<string>("all");
  const [flag, setFlag] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !`${r.doctor_name} ${r.product_name} ${r.seller_name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (seller !== "all" && r.seller_id !== seller) return false;
        if (pt !== "all" && r.price_type !== (pt as PriceType)) return false;
        if (flag === "custom" && r.price_type !== "custom") return false;
        if (flag === "free" && !r.is_free) return false;
        if (from && r.date < from) return false;
        if (to && r.date > to) return false;
        return true;
      }),
    [rows, q, seller, pt, flag, from, to],
  );

  const saleIds = new Set(filtered.map((r) => r.sale_id));
  let revenue = 0;
  let cogs = 0;
  for (const id of saleIds) {
    const e = econ?.[id];
    if (e) {
      revenue += e.revenue;
      cogs += e.cogs;
    }
  }
  const profit = revenue - cogs;
  const totalAmount = filtered.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="space-y-4">
      {econ ? (
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard title="Dövriyyə (seçilmiş satışlar)" value={manat(revenue)} />
          <SummaryCard title="Maya dəyəri" value={manat(cogs)} />
          <SummaryCard title="Mənfəət" value={manat(profit)} highlight />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard title="Cəmi məbləğ (seçilmiş)" value={manat(totalAmount)} highlight />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Input placeholder="Axtarış (həkim, məhsul, satıcı)" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-60" />
        <FilterSelect value={seller} onChange={setSeller} options={[{ value: "all", label: "Bütün satıcılar" }, ...sellers.map((s) => ({ value: s.id, label: s.name }))]} />
        <FilterSelect value={pt} onChange={setPt} options={[{ value: "all", label: "Bütün növlər" }, ...PRICE_TYPES.map((p) => ({ value: p, label: PRICE_TYPE_LABEL[p] }))]} />
        <FilterSelect value={flag} onChange={setFlag} options={[{ value: "all", label: "Bütün qeydlər" }, { value: "custom", label: "Yalnız fərdi qiymət" }, { value: "free", label: "Yalnız pulsuz" }]} />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-40" />
        <div className="ml-auto"><ExportButton href="/api/export/sales" /></div>
      </div>

      <SalesTable rows={filtered} showSeller />
    </div>
  );
}

function SummaryCard({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-foreground/30" : ""}>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="text-lg font-semibold">{value}</CardContent>
    </Card>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}
