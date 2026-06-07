// Verify the login path end-to-end against real GoTrue + RLS (uses the PUBLISHABLE key, like the app).
// Run with:  node --env-file=.env.local scripts/verify-login.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supa = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supa.auth.signInWithPassword({
  email: "director@tradeflow.local",
  password: process.env.BOOTSTRAP_PASSWORD || "Director!2026",
});
if (error) {
  console.error("❌ LOGIN FAILED:", error.message);
  process.exit(1);
}
console.log("✅ login ok — user", data.user.id);

const { data: prof, error: e2 } = await supa
  .from("profiles")
  .select("role,is_active,username")
  .eq("id", data.user.id)
  .single();
if (e2) {
  console.error("❌ profile read (RLS) failed:", e2.message);
  process.exit(1);
}
console.log("✅ profile read (RLS) ok —", JSON.stringify(prof));

const { data: cash, error: e3 } = await supa.from("v_business_cash").select("*").maybeSingle();
if (e3) {
  console.error("❌ director view read failed:", e3.message);
  process.exit(1);
}
console.log("✅ director-only view ok — v_business_cash:", JSON.stringify(cash));
