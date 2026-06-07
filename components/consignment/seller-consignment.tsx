"use client";

import { OperationFormDialog, type DoctorLite, type ProductLite } from "@/components/operations/operation-form-dialog";
import { ConsignmentTable, type ConsignmentRow } from "@/components/consignment/consignment-table";
import { createConsignmentAction } from "@/app/actions/consignment";
import { ExportButton } from "@/components/export-button";
import type { QuotaOption } from "@/lib/operations";

export function SellerConsignment({
  doctors,
  products,
  quotas,
  rows,
}: {
  doctors: DoctorLite[];
  products: ProductLite[];
  quotas: QuotaOption[];
  rows: ConsignmentRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <ExportButton href="/api/export/consignment" />
        <OperationFormDialog
          triggerLabel="Yeni konsiqnasiya"
          title="Yeni konsiqnasiya"
          description="Məhsul həkimə verilir; borc yaranır, ödəniş sonra daxil edilir."
          doctors={doctors}
          products={products}
          quotas={quotas}
          defaultPriceType="consignment"
          submit={createConsignmentAction}
          successMessage="Konsiqnasiya qeyd olundu."
        />
      </div>
      <ConsignmentTable rows={rows} basePath="/seller/consignment" />
    </div>
  );
}
