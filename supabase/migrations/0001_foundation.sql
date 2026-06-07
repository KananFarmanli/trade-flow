-- 0001_foundation: private schema, role helpers, profiles
-- Mirrors what is applied to the remote project via MCP apply_migration.
-- Notes:
--  * No anon access anywhere (no public signup). All grants target `authenticated`.
--  * public tables are NOT auto-exposed to the Data API (Supabase change 2026-04-28),
--    so every table is explicitly GRANTed in addition to RLS.
--  * Role is read live from profiles via a SECURITY DEFINER helper in the private
--    schema (always fresh on role change; avoids JWT-claim staleness).

create schema if not exists private;

-- ---------- enums ----------
create type public.user_role as enum ('director', 'manager', 'seller');

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null,
  first_name   text not null,
  last_name    text not null,
  username     text not null,
  seller_color text,                       -- hex colour, sellers only (doctor-list dot)
  is_active    boolean not null default true,
  comment      text,
  created_at   timestamptz not null default now()
);
create unique index profiles_username_lower_key on public.profiles (lower(username));
create index profiles_role_idx on public.profiles (role) where is_active;

comment on table public.profiles is
  'App users (1:1 auth.users). Username maps to synthetic email username@tradeflow.local.';

-- ---------- role helpers (private schema, not API-exposed) ----------
create or replace function private.current_user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()); $$;

create or replace function private.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select is_active from public.profiles where id = (select auth.uid())), false); $$;

revoke all on function private.current_user_role() from public;
revoke all on function private.is_active_user() from public;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_active_user() to authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;

-- Every signed-in staff member can read profiles (names, roles, seller colours).
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

-- Only a director may create/edit profiles in-app.
-- (Initial bootstrap + admin provisioning use the service role, which bypasses RLS.)
create policy profiles_insert_director on public.profiles
  for insert to authenticated
  with check (private.current_user_role() = 'director');

create policy profiles_update_director on public.profiles
  for update to authenticated
  using (private.current_user_role() = 'director')
  with check (private.current_user_role() = 'director');

-- ---------- grants (Data API exposure) ----------
grant select, insert, update on public.profiles to authenticated;
