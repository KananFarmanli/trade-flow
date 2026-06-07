// Smoke-test money transfer (initiate→confirm), expense, and the cash identity. Idempotent-ish.
// Run: node --env-file=.env.local scripts/smoke-finance.mjs
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pk = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dir = createClient(url, pk, { auth: { persistSession: false } });
const sel = createClient(url, pk, { auth: { persistSession: false } });
await dir.auth.signInWithPassword({ email: "director@tradeflow.local", password: "Director!2026" });
await sel.auth.signInWithPassword({ email: "aysen@tradeflow.local", password: "Aysen!2026" });
const { data: meSel } = await sel.auth.getUser();
const sellerId = meSel.user.id;

const { count: tCount } = await sel.from("money_transfers").select("id", { count: "exact", head: true }).eq("seller_id", sellerId);
const bal = await sel.from("v_seller_cash").select("cash_balance").eq("seller_id", sellerId).maybeSingle();
const balance = Number(bal.data?.cash_balance ?? 0);
console.log(`aysen balance before: ${balance}, transfers: ${tCount}`);

if ((tCount ?? 0) === 0 && balance >= 200) {
  const { error } = await sel.rpc("initiate_money_transfer", { p_amount: 200 });
  if (error) { console.error("initiate failed:", error.message); process.exit(1); }
  console.log("✓ initiated transfer 200");
  const { data: pend } = await dir.from("money_transfers").select("id").eq("seller_id", sellerId).eq("status", "pending").limit(1).maybeSingle();
  const { error: cErr } = await dir.rpc("confirm_money_transfer", { p_id: pend.id });
  if (cErr) { console.error("confirm failed:", cErr.message); process.exit(1); }
  console.log("✓ director confirmed transfer");
}

const { count: eCount } = await dir.from("expenses").select("id", { count: "exact", head: true });
if ((eCount ?? 0) === 0) {
  const { error } = await dir.rpc("add_expense", { p_category: "rent", p_amount: 50, p_date: "2026-03-31", p_comment: "demo rent" });
  if (error) { console.error("add_expense failed:", error.message); process.exit(1); }
  console.log("✓ director added expense (rent 50, auto-approved)");
}

const { data: cash } = await dir.from("v_business_cash").select("*").maybeSingle();
const { data: pnl } = await dir.from("v_profit_summary").select("*").maybeSingle();
console.log("business cash:", JSON.stringify(cash));
console.log("identity check: director+sellers+in_transit =",
  Number(cash.director_cash) + Number(cash.sellers_cash) + Number(cash.in_transit), "== total", Number(cash.total_business_cash));
console.log("P&L:", JSON.stringify(pnl));
