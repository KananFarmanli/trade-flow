-- 0002_catalog_stock: products, batches (director-only cost), stock balances + ledger

-- ---------- enums ----------
create type public.holder_type as enum ('warehouse', 'seller');
create type public.stock_movement_type as enum (
  'arrival', 'transfer_to_seller', 'sale', 'consignment',
  'return_doctor_to_seller', 'return_seller_to_warehouse', 'free_bonus', 'adjustment'
);

-- ---------- products (no cost here; retail/consignment are current prices) ----------
create table public.products (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  category                  text,
  current_retail_price      numeric(14,2) not null default 0 check (current_retail_price >= 0),
  current_consignment_price numeric(14,2) not null default 0 check (current_consignment_price >= 0),
  is_active                 boolean not null default true,
  comment                   text,
  created_at                timestamptz not null default now()
);
create index products_active_idx on public.products (is_active);
create index products_name_idx on public.products (lower(name));

-- ---------- batches (DIRECTOR-ONLY: holds unit cost = the sensitive value) ----------
create table public.batches (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products (id),
  unit_cost         numeric(14,2) not null check (unit_cost >= 0),
  qty_received      integer not null check (qty_received > 0),
  arrival_date      date not null,                       -- when goods physically arrived
  record_created_at timestamptz not null default now(),  -- when the record was entered (may differ)
  comment           text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);
create index batches_fifo_idx on public.batches (product_id, arrival_date, created_at);

-- ---------- stock_balances (maintained by RPCs; one row per holder+batch) ----------
create table public.stock_balances (
  id          uuid primary key default gen_random_uuid(),
  holder_type public.holder_type not null,
  seller_id   uuid references public.profiles (id),   -- null = owner warehouse
  product_id  uuid not null references public.products (id),
  batch_id    uuid not null references public.batches (id),
  quantity    integer not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  constraint stock_balances_seller_required
    check ((holder_type = 'seller') = (seller_id is not null))
);
create unique index stock_balances_warehouse_key on public.stock_balances (batch_id) where holder_type = 'warehouse';
create unique index stock_balances_seller_key on public.stock_balances (seller_id, batch_id) where holder_type = 'seller';
create index stock_balances_seller_idx on public.stock_balances (seller_id) where holder_type = 'seller';
create index stock_balances_product_idx on public.stock_balances (product_id);

-- ---------- stock_movements (append-only ledger; cost only via director-only batch join) ----------
create table public.stock_movements (
  id               uuid primary key default gen_random_uuid(),
  movement_type    public.stock_movement_type not null,
  product_id       uuid not null references public.products (id),
  batch_id         uuid not null references public.batches (id),
  quantity         integer not null check (quantity > 0),
  from_holder_type public.holder_type,
  from_seller_id   uuid references public.profiles (id),
  to_holder_type   public.holder_type,
  to_seller_id     uuid references public.profiles (id),
  source_op_type   text,
  source_op_id     uuid,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  comment          text
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at);
create index stock_movements_from_seller_idx on public.stock_movements (from_seller_id, created_at);
create index stock_movements_to_seller_idx on public.stock_movements (to_seller_id, created_at);
create index stock_movements_source_idx on public.stock_movements (source_op_type, source_op_id);

-- ================= RLS =================
alter table public.products enable row level security;
alter table public.batches enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;

-- products: everyone reads catalog; only director writes.
create policy products_select on public.products for select to authenticated using (true);
create policy products_insert_director on public.products for insert to authenticated
  with check (private.current_user_role() = 'director');
create policy products_update_director on public.products for update to authenticated
  using (private.current_user_role() = 'director') with check (private.current_user_role() = 'director');

-- batches: DIRECTOR ONLY (read + write) — this is how cost stays hidden.
create policy batches_all_director on public.batches for all to authenticated
  using (private.current_user_role() = 'director') with check (private.current_user_role() = 'director');

-- stock_balances: director/manager see all qty; seller sees only own. Writes via RPC (definer).
create policy stock_balances_select_dir_mgr on public.stock_balances for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy stock_balances_select_seller on public.stock_balances for select to authenticated
  using (holder_type = 'seller' and seller_id = (select auth.uid()));

-- stock_movements: director/manager see all; seller sees movements touching her. Writes via RPC.
create policy stock_movements_select_dir_mgr on public.stock_movements for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy stock_movements_select_seller on public.stock_movements for select to authenticated
  using (from_seller_id = (select auth.uid()) or to_seller_id = (select auth.uid()));

-- ================= grants (Data API exposure) =================
grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.batches to authenticated;
grant select on public.stock_balances to authenticated;
grant select on public.stock_movements to authenticated;
