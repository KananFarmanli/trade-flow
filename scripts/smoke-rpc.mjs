// Smoke-test the RPC path as a real director (publishable key, through PostgREST).
// Seeds demo stock (idempotent on the ARDIV product). Run:
//   node --env-file=.env.local scripts/smoke-rpc.mjs
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

const { error: loginErr } = await supa.auth.signInWithPassword({
  email: "director@tradeflow.local",
  password: process.env.BOOTSTRAP_PASSWORD || "Director!2026",
});
if (loginErr) { console.error("login failed:", loginErr.message); process.exit(1); }

const { data: seller } = await supa.from("profiles").select("id").eq("username", "aysen").single();
if (!seller) { console.error("seller 'aysen' not found — run seed-staff first"); process.exit(1); }

let { data: prod } = await supa.from("products").select("id").eq("name", "ARDIV").maybeSingle();
if (prod) {
  console.log("ARDIV already exists — skipping seed, reporting current stock.");
} else {
  const { data: created, error: pErr } = await supa
    .from("products")
    .insert({ name: "ARDIV", category: "Filler", current_retail_price: 50, current_consignment_price: 80 })
    .select("id")
    .single();
  if (pErr) { console.error("product insert failed (RLS?):", pErr.message); process.exit(1); }
  prod = created;
  console.log("✓ product ARDIV created (insert under RLS ok)");

  const { error: bErr } = await supa.rpc("add_batch", {
    p_product: prod.id, p_unit_cost: 28, p_qty: 20, p_arrival_date: "2026-03-01", p_comment: "demo arrival",
  });
  if (bErr) { console.error("add_batch failed:", bErr.message); process.exit(1); }
  console.log("✓ add_batch ok (20 @ 28)");

  const { error: tErr } = await supa.rpc("transfer_to_seller", {
    p_seller: seller.id, p_items: [{ product_id: prod.id, qty: 12 }],
  });
  if (tErr) { console.error("transfer_to_seller failed:", tErr.message); process.exit(1); }
  console.log("✓ transfer_to_seller ok (12 → aysen)");
}

const { data: stock } = await supa
  .from("v_stock_on_hand")
  .select("holder_type, quantity, retail_value, consignment_value")
  .eq("product_id", prod.id);
console.log("v_stock_on_hand for ARDIV:", JSON.stringify(stock));
