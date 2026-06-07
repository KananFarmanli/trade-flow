// Verify manager RLS boundaries under a real JWT. Run: node --env-file=.env.local scripts/smoke-manager.mjs
import { createClient } from "@supabase/supabase-js";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
await supa.auth.signInWithPassword({ email: "manager@tradeflow.local", password: "Manager!2026" });

async function count(table) {
  const { count, error } = await supa.from(table).select("*", { count: "exact", head: true });
  return error ? `ERR(${error.code})` : count;
}

const allowed = {}; for (const t of ["v_stock_on_hand", "products", "doctors", "sales", "realizations", "v_realization_status", "quotas", "expenses"]) allowed[t] = await count(t);
const denied = {}; for (const t of ["v_stock_cost", "batches", "v_profit_summary", "v_business_cash", "money_movements", "balance_operations", "account_balances"]) denied[t] = await count(t);

console.log("manager CAN read (expect >0 where data exists):", JSON.stringify(allowed));
console.log("manager BLOCKED (expect 0 or ERR):", JSON.stringify(denied));
const leak = Object.entries(denied).filter(([, v]) => typeof v === "number" && v > 0);
console.log(leak.length === 0 ? "✓ no financial leakage to manager" : `✗ LEAK: ${JSON.stringify(leak)}`);
