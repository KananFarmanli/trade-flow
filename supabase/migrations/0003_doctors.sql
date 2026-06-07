-- 0003_doctors: doctors + advance-credit ledger
-- Doctor "seller colour" is derived from the assigned seller's profile (not stored).
-- last_activity_at is derived at query time (latest sale/consignment/payment/return), not a column.

create type public.credit_reason as enum (
  'overpayment_return', 'manual_adjustment', 'applied_to_consignment', 'refunded'
);

create table public.doctors (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text not null,
  last_name          text not null,
  phone              text,
  instagram          text,
  clinic             text,
  assigned_seller_id uuid references public.profiles (id),
  is_active          boolean not null default true,
  comment            text,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now()
);
create index doctors_assigned_seller_idx on public.doctors (assigned_seller_id);
create index doctors_active_idx on public.doctors (is_active);
create index doctors_name_idx on public.doctors (lower(last_name), lower(first_name));

-- Advance credit ledger; doctor credit balance = sum(amount). Written by RPCs.
-- source_* are soft links (FKs deferred — referenced tables live in later migrations).
create table public.doctor_credit_movements (
  id                    uuid primary key default gen_random_uuid(),
  doctor_id             uuid not null references public.doctors (id),
  amount                numeric(14,2) not null,   -- + earned, - applied/refunded
  reason                public.credit_reason not null,
  source_return_id      uuid,
  source_realization_id uuid,
  created_by            uuid references public.profiles (id),
  created_at            timestamptz not null default now(),
  comment               text
);
create index doctor_credit_doctor_idx on public.doctor_credit_movements (doctor_id, created_at);

-- ================= RLS =================
alter table public.doctors enable row level security;
alter table public.doctor_credit_movements enable row level security;

-- doctors: everyone sees the shared list (with seller colour). Director/manager write freely;
-- a seller may add/edit only doctors assigned to herself (cannot reassign to another seller).
create policy doctors_select on public.doctors for select to authenticated using (true);

create policy doctors_insert on public.doctors for insert to authenticated
  with check (
    private.current_user_role() in ('director', 'manager')
    or (private.current_user_role() = 'seller' and assigned_seller_id = (select auth.uid()))
  );

create policy doctors_update on public.doctors for update to authenticated
  using (
    private.current_user_role() in ('director', 'manager')
    or (private.current_user_role() = 'seller' and assigned_seller_id = (select auth.uid()))
  )
  with check (
    private.current_user_role() in ('director', 'manager')
    or (private.current_user_role() = 'seller' and assigned_seller_id = (select auth.uid()))
  );

-- credit: director/manager see all; seller sees credit for her own doctors. Writes via RPC.
create policy dcm_select_dir_mgr on public.doctor_credit_movements for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy dcm_select_seller on public.doctor_credit_movements for select to authenticated
  using (exists (
    select 1 from public.doctors d
    where d.id = doctor_id and d.assigned_seller_id = (select auth.uid())
  ));

-- ================= grants =================
grant select, insert, update on public.doctors to authenticated;
grant select on public.doctor_credit_movements to authenticated;
