// Confirm exceljs + jszip produce valid buffers in this Node runtime. Run: node scripts/smoke-excel.mjs
import ExcelJS from "exceljs";
import JSZip from "jszip";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Satışlar");
ws.columns = [{ header: "Tarix", key: "d" }, { header: "Məbləğ", key: "m" }];
ws.getRow(1).font = { bold: true };
ws.addRow({ d: "12.03.26", m: 100 });
const buf = await wb.xlsx.writeBuffer();
const xlsxBytes = buf.byteLength ?? buf.length;

const zip = new JSZip();
zip.file("Aysen_Tayland_Pervane_3_months_9000.xlsx", buf);
const zbuf = await zip.generateAsync({ type: "arraybuffer" });

console.log("xlsx bytes:", xlsxBytes, "| zip bytes:", zbuf.byteLength);
console.log(xlsxBytes > 0 && zbuf.byteLength > 0 ? "✓ exceljs + jszip produce valid output" : "✗ FAILED");
