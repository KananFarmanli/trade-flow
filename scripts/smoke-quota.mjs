// Smoke-test quota flow: director template → seller opens quota → quota-tagged sale → progress.
// Idempotent-ish. Run: node --env-file=.env.local scripts/smoke-quota.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pk = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const dir = createClient(url, pk, { auth: { persistSession: false } });
const sel = createClient(url, pk, { auth: { persistSession: false } });
await dir.auth.signInWithPassword({ email: "director@tradeflow.local", password: "Director!2026" });
await sel.auth.signInWithPassword({ email: "aysen@tradeflow.local", password: "Aysen!2026" });
const { data: meSel } = await sel.auth.getUser();
const sellerId = meSel.user.id;

let { data: tpl } = await dir.from("quota_templates").select("id").eq("name", "Tayland").maybeSingle();
if (!tpl) {
  const ins = await dir.from("quota_templates").insert({ name: "Tayland", duration_months: 3, total_goal: 9000, monthly_goal: 3000, allowed_deviation_pct: 15 }).select("id").single();
  if (ins.error) { console.error("template insert (RLS?):", ins.error.message); process.exit(1); }
  tpl = ins.data;
  console.log("✓ template 'Tayland' created (3 mo, 9000, monthly 3000, dev 15%)");
}

const { data: doctor } = await sel.from("doctors").select("id").eq("assigned_seller_id", sellerId).limit(1).maybeSingle();
let { data: quota } = await sel.from("quotas").select("id").eq("seller_id", sellerId).eq("doctor_id", doctor.id).maybeSingle();
if (!quota) {
  const { data: qid, error } = await sel.rpc("open_quota", { p_template: tpl.id, p_seller: sellerId, p_doctor: doctor.id, p_start_date: "2026-03-01" });
  if (error) { console.error("open_quota failed:", error.message); process.exit(1); }
  quota = { id: qid };
  console.log("✓ quota opened (start 2026-03-01)");
}

const { count } = await sel.from("sales").select("id", { count: "exact", head: true }).eq("quota_id", quota.id);
const { data: product } = await sel.from("products").select("id").eq("name", "ARDIV").maybeSingle();
const stock = await sel.from("v_stock_on_hand").select("quantity").eq("holder_type", "seller").eq("seller_id", sellerId).eq("product_id", product.id).maybeSingle();
if ((count ?? 0) === 0 && Number(stock.data?.quantity ?? 0) >= 2) {
  const { error } = await sel.rpc("create_sale", {
    p_seller: sellerId, p_doctor: doctor.id, p_sale_date: "2026-03-15", p_quota_id: quota.id, p_comment: "quota sale",
    p_items: [{ product_id: product.id, qty: 2, price_type: "retail" }],
  });
  if (error) { console.error("quota-tagged sale failed:", error.message); process.exit(1); }
  console.log("✓ quota-tagged sale created (2 retail = 100, dated 2026-03-15)");
}

const { data: prog } = await sel.from("v_quota_progress").select("month_index, period_start, period_end, goal_amount, collected, status_color").eq("quota_id", quota.id).order("month_index");
console.log("progress:");
for (const m of prog ?? []) console.log(`  ay ${m.month_index} (${m.period_start}..${m.period_end}): toplanıb ${m.collected} / hədəf ${m.goal_amount} → ${m.status_color}`);
console.log("(expect ay 1 collected 100 → red; min acceptable = 3000*(1-0.15)=2550)");
