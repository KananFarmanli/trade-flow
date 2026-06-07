import "server-only";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export type Col = { header: string; key: string; width?: number };

export function newWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TradeFlow";
  wb.created = new Date();
  return wb;
}

/** Excel sheet names: max 31 chars, no : \ / ? * [ ] */
export function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Sheet";
}

export function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: Col[],
  rows: Record<string, unknown>[],
  footer?: Record<string, unknown>[],
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(sanitizeSheetName(name));
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  if (footer && footer.length) {
    ws.addRow({});
    for (const f of footer) ws.addRow(f);
  }
  return ws;
}

async function buffer(wb: ExcelJS.Workbook): Promise<ArrayBuffer> {
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function xlsxResponse(wb: ExcelJS.Workbook, filename: string): Promise<NextResponse> {
  const body = await buffer(wb);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function zipResponse(workbooks: { name: string; wb: ExcelJS.Workbook }[], filename: string): Promise<NextResponse> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const { name, wb } of workbooks) {
    zip.file(name, await buffer(wb));
  }
  const out = await zip.generateAsync({ type: "arraybuffer" });
  return new NextResponse(out, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** ASCII-safe filename fragment (for the Seller_Quota_Doctor_… convention). */
export function slug(s: string): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "x";
}
