// Smoke-test consignment lifecycle as seller 'aysen' (real JWT). Skips if she already has a consignment.
// Run: node --env-file=.env.local scripts/smoke-consignment.mjs
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
await supa.auth.signInWithPassword({ email: "aysen@tradeflow.local", password: "Aysen!2026" });
const { data: me } = await supa.auth.getUser();
const sellerId = me.user.id;

const { count } = await supa.from("realizations").select("id", { count: "exact", head: true }).eq("seller_id", sellerId);
if ((count ?? 0) > 0) { console.log(`aysen already has ${count} consignment(s) — skipping seed.`); process.exit(0); }

const { data: doctor } = await supa.from("doctors").select("id").eq("assigned_seller_id", sellerId).limit(1).maybeSingle();
const { data: product } = await supa.from("products").select("id").eq("name", "ARDIV").maybeSingle();
const stock = await supa.from("v_stock_on_hand").select("quantity").eq("holder_type", "seller").eq("seller_id", sellerId).eq("product_id", product.id).maybeSingle();
if (Number(stock.data?.quantity ?? 0) < 5) { console.log("not enough ARDIV stock for demo consignment — skipping."); process.exit(0); }

const { data: realId, error: cErr } = await supa.rpc("create_consignment", {
  p_seller: sellerId, p_doctor: doctor.id, p_date: "2026-03-12", p_quota_id: null, p_comment: "demo consignment",
  p_items: [{ product_id: product.id, qty: 5, price_type: "consignment" }],
});
if (cErr) { console.error("create_consignment failed:", cErr.message); process.exit(1); }
console.log("✓ create_consignment ok (5 @ 80 = 400)");

await supa.rpc("add_payment", { p_realization: realId, p_amount: 300, p_payment_date: "2026-03-20" });
console.log("✓ add_payment 300 ok");

const { data: item } = await supa.from("realization_items").select("id").eq("realization_id", realId).maybeSingle();
const { error: rErr } = await supa.rpc("return_from_doctor", {
  p_source_op_type: "realization", p_source_op_id: realId, p_source_item_id: item.id, p_qty: 2,
});
if (rErr) { console.error("return failed:", rErr.message); process.exit(1); }
console.log("✓ return 2 ok");

const { data: status } = await supa.from("v_realization_status").select("billed_net, paid, remaining, overpaid, status_color").eq("realization_id", realId).maybeSingle();
const { data: credit } = await supa.from("v_doctor_credit").select("credit_balance").eq("doctor_id", doctor.id).maybeSingle();
const { data: after } = await supa.from("v_stock_on_hand").select("quantity").eq("holder_type", "seller").eq("seller_id", sellerId).eq("product_id", product.id).maybeSingle();
console.log("status:", JSON.stringify(status), "(expect billed 240, paid 300, remaining 0, overpaid 60)");
console.log("doctor credit:", credit?.credit_balance, "(expect 60)");
console.log("ARDIV stock now:", after?.quantity, "(expect 6: 9 - 5 + 2)");
