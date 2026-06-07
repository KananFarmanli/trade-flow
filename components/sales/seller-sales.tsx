"use client";

import { OperationFormDialog, type DoctorLite, type ProductLite } from "@/components/operations/operation-form-dialog";
import { SalesTable } from "@/components/sales/sales-table";
import { createSaleAction } from "@/app/seller/sales/actions";
import { ExportButton } from "@/components/export-button";
import type { SaleLineRow, QuotaOption } from "@/lib/operations";

export function SellerSales({
  doctors,
  products,
  quotas,
  rows,
}: {
  doctors: DoctorLite[];
  products: ProductLite[];
  quotas: QuotaOption[];
  rows: SaleLineRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <ExportButton href="/api/export/sales" />
        <OperationFormDialog
          triggerLabel="Yeni satış"
          title="Yeni satış"
          description="Məhsul dərhal satılır; məbləğ kassanıza əlavə olunur."
          doctors={doctors}
          products={products}
          quotas={quotas}
          defaultPriceType="retail"
          submit={createSaleAction}
          successMessage="Satış qeyd olundu."
        />
      </div>
      <SalesTable rows={rows} />
    </div>
  );
}
