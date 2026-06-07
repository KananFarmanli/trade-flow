-- 0011_money_expense_quota_rpcs: transfers, expenses, top-ups, quotas

-- ---------- seller -> director money transfer (in-transit until confirmed) ----------
create or replace function public.initiate_money_transfer(p_amount numeric, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_seller uuid := auth.uid(); v_balance numeric; v_id uuid;
begin
  perform private.require_role(array['seller']::public.user_role[]);
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  v_balance := coalesce((select cash_balance from public.account_balances where account_type = 'seller' and seller_id = v_seller), 0);
  if p_amount > v_balance then raise exception 'transfer % exceeds your balance %', p_amount, v_balance; end if;
  insert into public.money_transfers (seller_id, amount, status, initiated_by)
  values (v_seller, p_amount, 'pending', v_seller) returning id into v_id;
  -- money leaves the seller now and sits in-transit until the director confirms
  perform private.post_money('transfer', p_amount, 'out', 'seller', v_seller, 'transfer', v_id, 'transfer to director (initiated)');
  perform private.audit_event('initiate_money_transfer', 'money_transfers', v_id, null,
    jsonb_build_object('amount', p_amount), p_comment);
  return v_id;
end;
$$;

create or replace function public.confirm_money_transfer(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_amount numeric; v_status public.transfer_status;
begin
  perform private.require_role(array['director']::public.user_role[]);
  select amount, status into v_amount, v_status from public.money_transfers where id = p_id for update;
  if not found then raise exception 'unknown transfer %', p_id; end if;
  if v_status <> 'pending' then raise exception 'transfer is % (not pending)', v_status; end if;
  update public.money_transfers set status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid() where id = p_id;
  perform private.post_money('transfer', v_amount, 'in', 'director', null, 'transfer', p_id, 'transfer from seller (confirmed)');
  perform private.audit_event('confirm_money_transfer', 'money_transfers', p_id, null, jsonb_build_object('amount', v_amount), null);
end;
$$;

create or replace function public.reject_money_transfer(p_id uuid, p_comment text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare r public.user_role; v_seller uuid; v_amount numeric; v_status public.transfer_status;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  select seller_id, amount, status into v_seller, v_amount, v_status from public.money_transfers where id = p_id for update;
  if not found then raise exception 'unknown transfer %', p_id; end if;
  if r = 'seller' and v_seller <> auth.uid() then raise exception 'not your transfer' using errcode = '42501'; end if;
  if v_status <> 'pending' then raise exception 'transfer is % (not pending)', v_status; end if;
  update public.money_transfers set status = 'rejected', confirmed_at = now(), confirmed_by = auth.uid() where id = p_id;
  -- money returns to the seller
  perform private.post_money('transfer', v_amount, 'in', 'seller', v_seller, 'transfer', p_id, 'transfer rejected/cancelled');
  perform private.audit_event('reject_money_transfer', 'money_transfers', p_id, null, jsonb_build_object('amount', v_amount), p_comment);
end;
$$;

-- ---------- expenses ----------
create or replace function public.add_expense(
  p_category public.expense_category, p_amount numeric, p_date date, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare r public.user_role; v_status public.expense_status; v_id uuid;
begin
  r := private.require_role(array['director', 'manager']::public.user_role[]);
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  v_status := case when r = 'director' then 'approved' else 'pending' end::public.expense_status;
  insert into public.expenses (expense_date, category, amount, status, added_by, approved_by, approved_at, comment)
  values (coalesce(p_date, current_date), p_category, p_amount, v_status, auth.uid(),
    case when r = 'director' then auth.uid() end, case when r = 'director' then now() end, p_comment)
  returning id into v_id;
  if v_status = 'approved' then
    perform private.post_money('expense', p_amount, 'out', 'director', null, 'expense', v_id, 'expense');
  end if;
  perform private.audit_event('add_expense', 'expenses', v_id, null,
    jsonb_build_object('category', p_category, 'amount', p_amount, 'status', v_status), p_comment);
  return v_id;
end;
$$;

create or replace function public.approve_expense(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_amount numeric; v_status public.expense_status;
begin
  perform private.require_role(array['director']::public.user_role[]);
  select amount, status into v_amount, v_status from public.expenses where id = p_id for update;
  if not found then raise exception 'unknown expense %', p_id; end if;
  if v_status <> 'pending' then raise exception 'expense is % (not pending)', v_status; end if;
  update public.expenses set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = p_id;
  perform private.post_money('expense', v_amount, 'out', 'director', null, 'expense', p_id, 'expense approved');
  perform private.audit_event('approve_expense', 'expenses', p_id, null, jsonb_build_object('amount', v_amount), null);
end;
$$;

create or replace function public.reject_expense(p_id uuid, p_comment text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_status public.expense_status;
begin
  perform private.require_role(array['director']::public.user_role[]);
  select status into v_status from public.expenses where id = p_id for update;
  if not found then raise exception 'unknown expense %', p_id; end if;
  if v_status <> 'pending' then raise exception 'expense is % (not pending)', v_status; end if;
  update public.expenses set status = 'rejected', approved_by = auth.uid(), approved_at = now() where id = p_id;
  perform private.audit_event('reject_expense', 'expenses', p_id, null, null, p_comment);
end;
$$;

-- ---------- director balance top-up / loan ----------
create or replace function public.director_topup(
  p_amount numeric, p_source text, p_is_loan boolean, p_date date, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  perform private.require_role(array['director']::public.user_role[]);
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  insert into public.balance_operations (op_date, amount, source, is_loan, comment, created_by)
  values (coalesce(p_date, current_date), p_amount, p_source, coalesce(p_is_loan, false), p_comment, auth.uid())
  returning id into v_id;
  perform private.post_money('topup', p_amount, 'in', 'director', null, 'balance_op', v_id,
    case when p_is_loan then 'loan top-up' else 'balance top-up' end);
  perform private.audit_event('director_topup', 'balance_operations', v_id, null,
    jsonb_build_object('amount', p_amount, 'is_loan', coalesce(p_is_loan, false), 'source', p_source), p_comment);
  return v_id;
end;
$$;

-- ---------- quotas ----------
create or replace function public.open_quota(p_template uuid, p_seller uuid, p_doctor uuid, p_start_date date)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role; v_id uuid; i integer;
  v_name text; v_dur integer; v_total numeric; v_monthly numeric; v_dev numeric;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  if r = 'seller' and p_seller <> auth.uid() then
    raise exception 'sellers can only open quotas for themselves' using errcode = '42501';
  end if;
  if not exists (select 1 from public.doctors where id = p_doctor and assigned_seller_id = p_seller and is_active) then
    raise exception 'doctor % is not an active doctor assigned to seller %', p_doctor, p_seller;
  end if;
  select name, duration_months, total_goal, monthly_goal, allowed_deviation_pct
    into v_name, v_dur, v_total, v_monthly, v_dev
    from public.quota_templates where id = p_template and is_active;
  if not found then raise exception 'unknown or inactive quota template %', p_template; end if;

  insert into public.quotas (template_id, seller_id, doctor_id, start_date,
    name_snapshot, duration_snapshot, total_goal_snapshot, monthly_goal_snapshot, deviation_pct_snapshot, status, created_by)
  values (p_template, p_seller, p_doctor, p_start_date, v_name, v_dur, v_total, v_monthly, v_dev, 'active', auth.uid())
  returning id into v_id;

  for i in 1 .. v_dur loop
    insert into public.quota_months (quota_id, month_index, period_start, period_end, goal_amount)
    values (v_id, i,
      (p_start_date + ((i - 1) || ' months')::interval)::date,
      (p_start_date + (i || ' months')::interval - interval '1 day')::date,
      v_monthly);
  end loop;

  perform private.audit_event('open_quota', 'quotas', v_id, null,
    jsonb_build_object('template_id', p_template, 'seller_id', p_seller, 'doctor_id', p_doctor, 'start_date', p_start_date), null);
  return v_id;
end;
$$;

create or replace function public.close_quota(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_role(array['director']::public.user_role[]);
  update public.quotas set status = 'closed' where id = p_id;
  if not found then raise exception 'unknown quota %', p_id; end if;
  perform private.audit_event('close_quota', 'quotas', p_id, null, null, null);
end;
$$;

-- ---------- lock down execute ----------
revoke execute on function public.initiate_money_transfer(numeric, text) from public, anon;
revoke execute on function public.confirm_money_transfer(uuid) from public, anon;
revoke execute on function public.reject_money_transfer(uuid, text) from public, anon;
revoke execute on function public.add_expense(public.expense_category, numeric, date, text) from public, anon;
revoke execute on function public.approve_expense(uuid) from public, anon;
revoke execute on function public.reject_expense(uuid, text) from public, anon;
revoke execute on function public.director_topup(numeric, text, boolean, date, text) from public, anon;
revoke execute on function public.open_quota(uuid, uuid, uuid, date) from public, anon;
revoke execute on function public.close_quota(uuid) from public, anon;
grant execute on function public.initiate_money_transfer(numeric, text) to authenticated;
grant execute on function public.confirm_money_transfer(uuid) to authenticated;
grant execute on function public.reject_money_transfer(uuid, text) to authenticated;
grant execute on function public.add_expense(public.expense_category, numeric, date, text) to authenticated;
grant execute on function public.approve_expense(uuid) to authenticated;
grant execute on function public.reject_expense(uuid, text) to authenticated;
grant execute on function public.director_topup(numeric, text, boolean, date, text) to authenticated;
grant execute on function public.open_quota(uuid, uuid, uuid, date) to authenticated;
grant execute on function public.close_quota(uuid) to authenticated;
