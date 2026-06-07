-- 0005_returns_money: returns, money ledger, seller→director transfers, expenses, balance ops, balances
-- Manager is fully blocked from cash/transfers/balances (director + seller-own only).
-- Loan support is a simple is_loan flag now; a future loan_repayments table can reference
-- balance_operations(id) without altering this schema.

create type public.return_type as enum (
  'doctor_return_sale', 'doctor_return_consignment', 'seller_return_to_warehouse'
);
create type public.refund_source as enum ('seller', 'director', 'none');
create type public.money_movement_type as enum (
  'sale_cash_in', 'payment_in', 'transfer', 'topup', 'expense', 'refund', 'advance_credit', 'adjustment'
);
create type public.money_direction as enum ('in', 'out');
create type public.account_type as enum ('director', 'seller');
create type public.transfer_status as enum ('pending', 'confirmed', 'rejected');
create type public.expense_status as enum ('pending', 'approved', 'rejected');
create type public.expense_category as enum ('rent', 'salary', 'bonus', 'assistance', 'unexpected', 'other');

-- ---------- returns (separate linked records; never delete originals) ----------
create table public.returns (
  id                 uuid primary key default gen_random_uuid(),
  return_date        date not null default current_date,
  return_type        public.return_type not null,
  source_op_type     text,                       -- 'sale' | 'realization' | null
  source_op_id       uuid,
  source_item_id     uuid,
  seller_id          uuid references public.profiles (id),
  doctor_id          uuid references public.doctors (id),
  product_id         uuid not null references public.products (id),
  batch_id           uuid not null references public.batches (id),   -- restores original batch identity
  quantity           integer not null check (quantity > 0),
  refund_amount      numeric(14,2),
  refund_source      public.refund_source,
  total_amount_delta numeric(14,2) not null default 0,
  comment            text,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now()
);
create index returns_source_idx on public.returns (source_op_type, source_op_id);
create index returns_seller_idx on public.returns (seller_id, return_date);
create index returns_doctor_idx on public.returns (doctor_id, return_date);
create index returns_product_idx on public.returns (product_id);

-- ---------- money_movements (append-only ledger) ----------
create table public.money_movements (
  id             uuid primary key default gen_random_uuid(),
  movement_type  public.money_movement_type not null,
  amount         numeric(14,2) not null check (amount >= 0),
  direction      public.money_direction not null,
  account_type   public.account_type not null,
  seller_id      uuid references public.profiles (id),   -- null when account_type='director'
  source_op_type text,
  source_op_id   uuid,
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  comment        text,
  constraint money_seller_required check ((account_type = 'seller') = (seller_id is not null))
);
create index money_movements_seller_idx on public.money_movements (seller_id, created_at);
create index money_movements_account_idx on public.money_movements (account_type, created_at);
create index money_movements_source_idx on public.money_movements (source_op_type, source_op_id);

-- ---------- money_transfers (seller→director workflow + in-transit state) ----------
create table public.money_transfers (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles (id),
  amount       numeric(14,2) not null check (amount > 0),
  status       public.transfer_status not null default 'pending',
  initiated_at timestamptz not null default now(),
  initiated_by uuid references public.profiles (id),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id),
  comment      text
);
create index money_transfers_seller_idx on public.money_transfers (seller_id, initiated_at);
create index money_transfers_status_idx on public.money_transfers (status);

-- ---------- expenses (manager adds pending; director approves) ----------
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category     public.expense_category not null,
  amount       numeric(14,2) not null check (amount > 0),
  status       public.expense_status not null default 'pending',
  added_by     uuid references public.profiles (id),
  approved_by  uuid references public.profiles (id),
  approved_at  timestamptz,
  comment      text,
  created_at   timestamptz not null default now()
);
create index expenses_status_idx on public.expenses (status, expense_date);
create index expenses_category_idx on public.expenses (category);

-- ---------- balance_operations (director top-ups / loans) ----------
create table public.balance_operations (
  id         uuid primary key default gen_random_uuid(),
  op_date    date not null default current_date,
  amount     numeric(14,2) not null check (amount > 0),
  source     text,
  is_loan    boolean not null default false,
  comment    text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index balance_operations_date_idx on public.balance_operations (op_date);

-- ---------- account_balances (maintained; director singleton + per seller) ----------
create table public.account_balances (
  id           uuid primary key default gen_random_uuid(),
  account_type public.account_type not null,
  seller_id    uuid references public.profiles (id),
  cash_balance numeric(14,2) not null default 0,
  updated_at   timestamptz not null default now(),
  constraint account_balances_seller_required check ((account_type = 'seller') = (seller_id is not null))
);
create unique index account_balances_director_key on public.account_balances ((true)) where account_type = 'director';
create unique index account_balances_seller_key on public.account_balances (seller_id) where account_type = 'seller';

-- ================= RLS =================
alter table public.returns enable row level security;
alter table public.money_movements enable row level security;
alter table public.money_transfers enable row level security;
alter table public.expenses enable row level security;
alter table public.balance_operations enable row level security;
alter table public.account_balances enable row level security;

-- returns: director/manager all; seller own.
create policy returns_select_dir_mgr on public.returns for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy returns_select_seller on public.returns for select to authenticated
  using (seller_id = (select auth.uid()));

-- money_movements: director all; seller own; manager NONE.
create policy money_movements_select_director on public.money_movements for select to authenticated
  using (private.current_user_role() = 'director');
create policy money_movements_select_seller on public.money_movements for select to authenticated
  using (account_type = 'seller' and seller_id = (select auth.uid()));

-- money_transfers: director all; seller own; manager NONE.
create policy money_transfers_select_director on public.money_transfers for select to authenticated
  using (private.current_user_role() = 'director');
create policy money_transfers_select_seller on public.money_transfers for select to authenticated
  using (seller_id = (select auth.uid()));

-- expenses: director + manager see (operational); seller none.
create policy expenses_select_dir_mgr on public.expenses for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));

-- balance_operations: director only.
create policy balance_operations_select_director on public.balance_operations for select to authenticated
  using (private.current_user_role() = 'director');

-- account_balances: director all; seller own; manager NONE.
create policy account_balances_select_director on public.account_balances for select to authenticated
  using (private.current_user_role() = 'director');
create policy account_balances_select_seller on public.account_balances for select to authenticated
  using (account_type = 'seller' and seller_id = (select auth.uid()));

-- ================= grants =================
grant select on public.returns to authenticated;
grant select on public.money_movements to authenticated;
grant select on public.money_transfers to authenticated;
grant select on public.expenses to authenticated;
grant select on public.balance_operations to authenticated;
grant select on public.account_balances to authenticated;
