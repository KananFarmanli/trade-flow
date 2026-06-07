-- 0004_sales_consignment: sales + items, realizations (consignment) + items, payments
-- Headers carry date/seller/doctor/quota_id; lines carry product/qty/price snapshots.
-- A free line: price_type='free_bonus', actual_unit_price=0, is_free=true (full cost booked at creation).
-- Writes happen via SECURITY DEFINER RPCs (later migration); these tables expose SELECT only.

create type public.price_type as enum ('retail', 'consignment', 'custom', 'free_bonus');

-- ---------- sales (immediate, no debt) ----------
create table public.sales (
  id         uuid primary key default gen_random_uuid(),
  sale_date  date not null default current_date,
  seller_id  uuid not null references public.profiles (id),
  doctor_id  uuid not null references public.doctors (id),
  quota_id   uuid,                       -- FK to quotas added in 0006
  comment    text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index sales_seller_idx on public.sales (seller_id, sale_date);
create index sales_doctor_idx on public.sales (doctor_id, sale_date);
create index sales_quota_idx on public.sales (quota_id) where quota_id is not null;

create table public.sale_items (
  id                        uuid primary key default gen_random_uuid(),
  sale_id                   uuid not null references public.sales (id) on delete cascade,
  product_id                uuid not null references public.products (id),
  quantity                  integer not null check (quantity > 0),
  price_type                public.price_type not null,
  unit_retail_snapshot      numeric(14,2) not null default 0,
  unit_consignment_snapshot numeric(14,2) not null default 0,
  actual_unit_price         numeric(14,2) not null check (actual_unit_price >= 0),
  line_amount               numeric(14,2) not null check (line_amount >= 0),
  is_free                   boolean not null default false,
  bonus_reason              text,
  comment                   text
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (product_id);

-- ---------- realizations (consignment; creates debt) ----------
create table public.realizations (
  id               uuid primary key default gen_random_uuid(),
  realization_date date not null default current_date,
  seller_id        uuid not null references public.profiles (id),
  doctor_id        uuid not null references public.doctors (id),
  quota_id         uuid,
  comment          text,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index realizations_seller_idx on public.realizations (seller_id, realization_date);
create index realizations_doctor_idx on public.realizations (doctor_id, realization_date);
create index realizations_quota_idx on public.realizations (quota_id) where quota_id is not null;

create table public.realization_items (
  id                        uuid primary key default gen_random_uuid(),
  realization_id            uuid not null references public.realizations (id) on delete cascade,
  product_id                uuid not null references public.products (id),
  quantity                  integer not null check (quantity > 0),
  price_type                public.price_type not null,
  unit_retail_snapshot      numeric(14,2) not null default 0,
  unit_consignment_snapshot numeric(14,2) not null default 0,
  actual_unit_price         numeric(14,2) not null check (actual_unit_price >= 0),
  line_amount               numeric(14,2) not null check (line_amount >= 0),
  is_free                   boolean not null default false,
  bonus_reason              text,
  comment                   text
);
create index realization_items_realization_idx on public.realization_items (realization_id);
create index realization_items_product_idx on public.realization_items (product_id);

-- ---------- payments (header-level on a realization; each a separate row) ----------
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  realization_id uuid not null references public.realizations (id),
  amount         numeric(14,2) not null check (amount > 0),
  payment_date   date not null default current_date,
  received_by    uuid references public.profiles (id),
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  comment        text
);
create index payments_realization_idx on public.payments (realization_id, payment_date);

-- ================= RLS (SELECT only; writes via RPC) =================
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.realizations enable row level security;
alter table public.realization_items enable row level security;
alter table public.payments enable row level security;

create policy sales_select_dir_mgr on public.sales for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy sales_select_seller on public.sales for select to authenticated
  using (seller_id = (select auth.uid()));

create policy sale_items_select_dir_mgr on public.sale_items for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy sale_items_select_seller on public.sale_items for select to authenticated
  using (exists (select 1 from public.sales s where s.id = sale_id and s.seller_id = (select auth.uid())));

create policy realizations_select_dir_mgr on public.realizations for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy realizations_select_seller on public.realizations for select to authenticated
  using (seller_id = (select auth.uid()));

create policy realization_items_select_dir_mgr on public.realization_items for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy realization_items_select_seller on public.realization_items for select to authenticated
  using (exists (select 1 from public.realizations r where r.id = realization_id and r.seller_id = (select auth.uid())));

create policy payments_select_dir_mgr on public.payments for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy payments_select_seller on public.payments for select to authenticated
  using (exists (select 1 from public.realizations r where r.id = realization_id and r.seller_id = (select auth.uid())));

-- ================= grants =================
grant select on public.sales to authenticated;
grant select on public.sale_items to authenticated;
grant select on public.realizations to authenticated;
grant select on public.realization_items to authenticated;
grant select on public.payments to authenticated;
