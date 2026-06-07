// Seed a demo doctor assigned to seller 'aysen' (idempotent), as the director (RLS path).
// Run: node --env-file=.env.local scripts/seed-doctor.mjs
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
await supa.auth.signInWithPassword({ email: "director@tradeflow.local", password: process.env.BOOTSTRAP_PASSWORD || "Director!2026" });

const { data: seller } = await supa.from("profiles").select("id").eq("username", "aysen").single();
const { data: existing } = await supa.from("doctors").select("id").eq("first_name", "Pərvanə").eq("last_name", "Əliyeva").maybeSingle();
if (existing) { console.log("Doctor already exists:", existing.id); process.exit(0); }

const { data, error } = await supa
  .from("doctors")
  .insert({ first_name: "Pərvanə", last_name: "Əliyeva", clinic: "Estetik klinika", phone: "+994 50 000 00 00", assigned_seller_id: seller.id })
  .select("id")
  .single();
if (error) { console.error("doctor insert failed (RLS?):", error.message); process.exit(1); }
console.log("✓ doctor created (insert under RLS ok):", data.id);
