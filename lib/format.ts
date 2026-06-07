const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("az-AZ");

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  const v = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(v) ? v : 0;
}

/** Format an amount in manat, e.g. "1 234,50 ₼". */
export function manat(n: number | string | null | undefined): string {
  return `${money.format(toNum(n))} ₼`;
}

/** Format a quantity / integer. */
export function qty(n: number | string | null | undefined): string {
  return int.format(toNum(n));
}

/** Build the "20.02.26 - 200,00 ₼; 25.02.26 - 50,00 ₼" payment-dates string from payment rows. */
export function paymentDatesSummary(payments: { payment_date: string; amount: number | string }[]): string {
  if (!payments || payments.length === 0) return "—";
  return payments
    .slice()
    .sort((a, b) => (a.payment_date < b.payment_date ? -1 : 1))
    .map((p) => `${shortDate(p.payment_date)} - ${manat(p.amount)}`)
    .join("; ");
}

/** Format an ISO date as DD.MM.YY (the spec's display format). */
export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const yy = String(dt.getFullYear()).slice(-2);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${yy}`;
}
