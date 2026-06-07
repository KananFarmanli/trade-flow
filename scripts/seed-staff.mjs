// Seed a manager + a seller (idempotent). Mirrors the createUser server action path.
// Run with:  node --env-file=.env.local scripts/seed-staff.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const staff = [
  { username: "manager", password: "Manager!2026", role: "manager", first: "Menecer", last: "Test", color: null },
  { username: "aysen", password: "Aysen!2026", role: "seller", first: "Aysen", last: "Məmmədova", color: "#e11d48" },
];

for (const s of staff) {
  const { data: existing } = await admin.from("profiles").select("id").eq("username", s.username).maybeSingle();
  if (existing) {
    console.log(`• ${s.username} already exists — skipped`);
    continue;
  }
  const email = `${s.username}@tradeflow.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: s.password, email_confirm: true, app_metadata: { user_role: s.role },
  });
  if (error) {
    console.error(`✗ ${s.username}: ${error.message}`);
    continue;
  }
  const { error: pErr } = await admin.from("profiles").insert({
    id: data.user.id, role: s.role, first_name: s.first, last_name: s.last, username: s.username, seller_color: s.color,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    console.error(`✗ ${s.username} profile: ${pErr.message}`);
    continue;
  }
  console.log(`✓ ${s.role} "${s.username}" / ${s.password}`);
}
