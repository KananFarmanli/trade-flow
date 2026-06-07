// Smoke-test create_sale as seller 'aysen' (real JWT). Idempotent-ish: only runs if she has ARDIV stock.
// Run: node --env-file=.env.local scripts/smoke-sale.mjs
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
await supa.auth.signInWithPassword({ email: "aysen@tradeflow.local", password: "Aysen!2026" });

const { data: me } = await supa.auth.getUser();
const sellerId = me.user.id;
const { data: doctor } = await supa.from("doctors").select("id").eq("assigned_seller_id", sellerId).limit(1).maybeSingle();
const { data: product } = await supa.from("products").select("id").eq("name", "ARDIV").maybeSingle();
if (!doctor || !product) { console.error("need a doctor + ARDIV product"); process.exit(1); }

const before = await supa.from("v_stock_on_hand").select("quantity").eq("holder_type", "seller").eq("seller_id", sellerId).eq("product_id", product.id).maybeSingle();
const haveQty = Number(before.data?.quantity ?? 0);
if (haveQty < 3) { console.log(`aysen has only ${haveQty} ARDIV — skipping sale to stay idempotent.`); process.exit(0); }

const { error } = await supa.rpc("create_sale", {
  p_seller: sellerId,
  p_doctor: doctor.id,
  p_sale_date: "2026-03-12",
  p_quota_id: null,
  p_comment: "demo sale",
  p_items: [
    { product_id: product.id, qty: 2, price_type: "retail" },
    { product_id: product.id, qty: 1, price_type: "free_bonus", bonus_reason: "10 alana 1 hədiyyə" },
  ],
});
if (error) { console.error("create_sale failed:", error.message); process.exit(1); }
console.log("✓ create_sale ok (2 retail + 1 free)");

const after = await supa.from("v_stock_on_hand").select("quantity").eq("holder_type", "seller").eq("seller_id", sellerId).eq("product_id", product.id).maybeSingle();
const { data: cash } = await supa.from("v_seller_cash").select("cash_balance").eq("seller_id", sellerId).maybeSingle();
console.log(`stock ARDIV: ${haveQty} → ${Number(after.data?.quantity ?? 0)} (expected -3)`);
console.log(`seller cash: ${cash?.cash_balance} (expected +100 from this sale)`);
