-- 0006_quotas_audit: quota templates/instances/months, audit log + CRUD triggers
-- Quotas are goal containers; sales/realizations carry quota_id (wired here).
-- Quota progress is derived (money received bucketed by date) — not stored.

create type public.quota_status as enum ('active', 'closed');

create table public.quota_templates (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  duration_months       integer not null check (duration_months > 0),
  total_goal            numeric(14,2) not null check (total_goal >= 0),
  monthly_goal          numeric(14,2) not null check (monthly_goal >= 0),
  allowed_deviation_pct numeric(5,2) not null default 0 check (allowed_deviation_pct between 0 and 100),
  is_active             boolean not null default true,
  created_by            uuid references public.profiles (id),
  created_at            timestamptz not null default now()
);

-- A quota instance snapshots its template, so later template edits don't mutate open quotas.
create table public.quotas (
  id                     uuid primary key default gen_random_uuid(),
  template_id            uuid references public.quota_templates (id),
  seller_id              uuid not null references public.profiles (id),
  doctor_id              uuid not null references public.doctors (id),
  start_date             date not null,
  name_snapshot          text not null,
  duration_snapshot      integer not null check (duration_snapshot > 0),
  total_goal_snapshot    numeric(14,2) not null,
  monthly_goal_snapshot  numeric(14,2) not null,
  deviation_pct_snapshot numeric(5,2) not null,
  status                 public.quota_status not null default 'active',
  created_by             uuid references public.profiles (id),
  created_at             timestamptz not null default now()
);
create index quotas_seller_idx on public.quotas (seller_id);
create index quotas_doctor_idx on public.quotas (doctor_id);
create index quotas_status_idx on public.quotas (status);

create table public.quota_months (
  id           uuid primary key default gen_random_uuid(),
  quota_id     uuid not null references public.quotas (id) on delete cascade,
  month_index  integer not null check (month_index >= 1),
  period_start date not null,
  period_end   date not null,
  goal_amount  numeric(14,2) not null,
  unique (quota_id, month_index)
);
create index quota_months_quota_idx on public.quota_months (quota_id);

-- Wire the deferred quota_id FKs from 0004.
alter table public.sales add constraint sales_quota_fk
  foreign key (quota_id) references public.quotas (id);
alter table public.realizations add constraint realizations_quota_fk
  foreign key (quota_id) references public.quotas (id);

-- ---------- audit_logs ----------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  comment     text,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at);
create index audit_logs_created_idx on public.audit_logs (created_at);

-- Generic audit trigger for plain-CRUD tables (transactional tables self-audit in their RPCs).
create or replace function private.log_audit()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function private.log_audit();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function private.log_audit();
create trigger audit_doctors after insert or update or delete on public.doctors
  for each row execute function private.log_audit();

-- ================= RLS =================
alter table public.quota_templates enable row level security;
alter table public.quotas enable row level security;
alter table public.quota_months enable row level security;
alter table public.audit_logs enable row level security;

create policy quota_templates_select on public.quota_templates for select to authenticated using (true);
create policy quota_templates_insert_director on public.quota_templates for insert to authenticated
  with check (private.current_user_role() = 'director');
create policy quota_templates_update_director on public.quota_templates for update to authenticated
  using (private.current_user_role() = 'director') with check (private.current_user_role() = 'director');

create policy quotas_select_dir_mgr on public.quotas for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy quotas_select_seller on public.quotas for select to authenticated
  using (seller_id = (select auth.uid()));

create policy quota_months_select_dir_mgr on public.quota_months for select to authenticated
  using (private.current_user_role() in ('director', 'manager'));
create policy quota_months_select_seller on public.quota_months for select to authenticated
  using (exists (select 1 from public.quotas q where q.id = quota_id and q.seller_id = (select auth.uid())));

-- audit: director sees all; manager sees non-financial entities; seller sees her own actions.
create policy audit_select_director on public.audit_logs for select to authenticated
  using (private.current_user_role() = 'director');
create policy audit_select_manager on public.audit_logs for select to authenticated
  using (
    private.current_user_role() = 'manager'
    and entity_type not in ('batches', 'money_movements', 'money_transfers', 'expenses', 'balance_operations', 'account_balances')
  );
create policy audit_select_seller on public.audit_logs for select to authenticated
  using (actor_id = (select auth.uid()));

-- ================= grants =================
grant select, insert, update on public.quota_templates to authenticated;
grant select on public.quotas to authenticated;
grant select on public.quota_months to authenticated;
grant select on public.audit_logs to authenticated;
