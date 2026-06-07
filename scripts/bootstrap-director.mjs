// One-time bootstrap of the first director account.
// Run with:  node --env-file=.env.local scripts/bootstrap-director.mjs
// Optional overrides: BOOTSTRAP_USERNAME, BOOTSTRAP_PASSWORD, BOOTSTRAP_FIRST, BOOTSTRAP_LAST
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (run with --env-file=.env.local)");
  process.exit(1);
}

const DOMAIN = "tradeflow.local";
const username = (process.env.BOOTSTRAP_USERNAME || "director").toLowerCase();
const password = process.env.BOOTSTRAP_PASSWORD || "Director!2026";
const first = process.env.BOOTSTRAP_FIRST || "Owner";
const last = process.env.BOOTSTRAP_LAST || "Director";
const email = `${username}@${DOMAIN}`;

const admin = createClient(url, secret, { auth: { persistSession: false } });

// If this username already has a profile, do nothing.
const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
if (existing) {
  console.log(`Director "${username}" already exists (profile ${existing.id}). Nothing to do.`);
  process.exit(0);
}

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { user_role: "director" },
});
if (createErr) {
  console.error("createUser failed:", createErr.message);
  process.exit(1);
}

const id = created.user.id;
const { error: profErr } = await admin
  .from("profiles")
  .insert({ id, role: "director", first_name: first, last_name: last, username });
if (profErr) {
  // roll back the auth user so we don't strand a user without a profile
  await admin.auth.admin.deleteUser(id);
  console.error("profile insert failed (auth user rolled back):", profErr.message);
  process.exit(1);
}

console.log("✅ Director created.");
console.log(`   username: ${username}`);
console.log(`   password: ${password}   (change this after first login)`);
console.log(`   email(hidden): ${email}`);
console.log(`   id: ${id}`);
