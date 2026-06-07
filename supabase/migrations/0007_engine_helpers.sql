-- 0007_engine_helpers: private helper functions shared by the transactional RPCs.
-- All are SECURITY DEFINER, search_path='' (everything schema-qualified), owned by postgres
-- (so they bypass RLS as table owner). They are in the private schema = not API-callable.

-- Raise unless the caller's role is allowed; returns the role.
create or replace function private.require_role(p_allowed public.user_role[])
returns public.user_role
language plpgsql stable security definer set search_path = ''
as $$
declare r public.user_role;
begin
  r := private.current_user_role();
  if r is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not (r = any (p_allowed)) then
    raise exception 'forbidden: role % not permitted', r using errcode = '42501';
  end if;
  return r;
end;
$$;

-- Adjust a cash balance by delta (creates the row on first touch). Locks the row.
create or replace function private.adjust_cash(p_account public.account_type, p_seller uuid, p_delta numeric)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_account = 'director' then
    select id into v_id from public.account_balances where account_type = 'director' for update;
    if v_id is null then
      insert into public.account_balances (account_type, seller_id, cash_balance) values ('director', null, p_delta);
    else
      update public.account_balances set cash_balance = cash_balance + p_delta, updated_at = now() where id = v_id;
    end if;
  else
    if p_seller is null then raise exception 'seller_id required for seller balance'; end if;
    select id into v_id from public.account_balances where account_type = 'seller' and seller_id = p_seller for update;
    if v_id is null then
      insert into public.account_balances (account_type, seller_id, cash_balance) values ('seller', p_seller, p_delta);
    else
      update public.account_balances set cash_balance = cash_balance + p_delta, updated_at = now() where id = v_id;
    end if;
  end if;
end;
$$;

-- Write a money_movements ledger row and apply it to the balance. Returns the movement id.
create or replace function private.post_money(
  p_type public.money_movement_type, p_amount numeric, p_dir public.money_direction,
  p_account public.account_type, p_seller uuid, p_src_type text, p_src_id uuid, p_comment text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_amount < 0 then raise exception 'amount must be >= 0'; end if;
  insert into public.money_movements (movement_type, amount, direction, account_type, seller_id, source_op_type, source_op_id, created_by, comment)
  values (p_type, p_amount, p_dir, p_account, p_seller, p_src_type, p_src_id, auth.uid(), p_comment)
  returning id into v_id;
  perform private.adjust_cash(p_account, p_seller, case when p_dir = 'in' then p_amount else -p_amount end);
  return v_id;
end;
$$;

-- Increment a holder's balance for a specific batch (no ledger movement). Locks the row.
create or replace function private._stock_incr(
  p_holder public.holder_type, p_seller uuid, p_product uuid, p_batch uuid, p_qty integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_qty <= 0 then raise exception 'qty must be > 0'; end if;
  if p_holder = 'warehouse' then
    select id into v_id from public.stock_balances where holder_type = 'warehouse' and batch_id = p_batch for update;
  else
    if p_seller is null then raise exception 'seller_id required for seller holder'; end if;
    select id into v_id from public.stock_balances where holder_type = 'seller' and seller_id = p_seller and batch_id = p_batch for update;
  end if;
  if v_id is null then
    insert into public.stock_balances (holder_type, seller_id, product_id, batch_id, quantity)
    values (p_holder, case when p_holder = 'seller' then p_seller end, p_product, p_batch, p_qty);
  else
    update public.stock_balances set quantity = quantity + p_qty, updated_at = now() where id = v_id;
  end if;
end;
$$;

-- Place stock into a holder for a specific batch AND record a ledger movement.
-- Used for arrivals (no source holder) and doctor->seller returns (restore exact batch).
create or replace function private.stock_place(
  p_holder public.holder_type, p_seller uuid, p_product uuid, p_batch uuid, p_qty integer,
  p_mtype public.stock_movement_type, p_from_holder public.holder_type, p_from_seller uuid,
  p_src_type text, p_src_id uuid, p_comment text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private._stock_incr(p_holder, p_seller, p_product, p_batch, p_qty);
  insert into public.stock_movements (movement_type, product_id, batch_id, quantity,
    from_holder_type, from_seller_id, to_holder_type, to_seller_id, source_op_type, source_op_id, created_by, comment)
  values (p_mtype, p_product, p_batch, p_qty, p_from_holder, p_from_seller, p_holder,
    case when p_holder = 'seller' then p_seller end, p_src_type, p_src_id, auth.uid(), p_comment);
end;
$$;

-- FIFO-consume qty from a holder (product leaves the holder; destination is "outside" / a doctor).
-- One ledger movement per batch touched. Raises 23514 if insufficient stock.
create or replace function private.stock_consume_fifo(
  p_holder public.holder_type, p_seller uuid, p_product uuid, p_qty integer,
  p_mtype public.stock_movement_type, p_src_type text, p_src_id uuid, p_comment text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_left integer := p_qty; v_take integer; r record;
begin
  if p_qty <= 0 then raise exception 'qty must be > 0'; end if;
  for r in
    select sb.id, sb.batch_id, sb.quantity
    from public.stock_balances sb
    join public.batches b on b.id = sb.batch_id
    where sb.product_id = p_product and sb.quantity > 0
      and ((p_holder = 'warehouse' and sb.holder_type = 'warehouse')
        or (p_holder = 'seller' and sb.holder_type = 'seller' and sb.seller_id = p_seller))
    order by b.arrival_date, b.created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, r.quantity);
    update public.stock_balances set quantity = quantity - v_take, updated_at = now() where id = r.id;
    insert into public.stock_movements (movement_type, product_id, batch_id, quantity,
      from_holder_type, from_seller_id, to_holder_type, to_seller_id, source_op_type, source_op_id, created_by, comment)
    values (p_mtype, p_product, r.batch_id, v_take, p_holder,
      case when p_holder = 'seller' then p_seller end, null, null, p_src_type, p_src_id, auth.uid(), p_comment);
    v_left := v_left - v_take;
  end loop;
  if v_left > 0 then
    raise exception 'insufficient stock for product % (short by %)', p_product, v_left using errcode = '23514';
  end if;
end;
$$;

-- FIFO-move qty between holders preserving batch identity (transfer to seller, return to warehouse).
-- Decrements source batch, increments destination same batch, one movement per batch.
create or replace function private.stock_move_fifo(
  p_from_holder public.holder_type, p_from_seller uuid,
  p_to_holder public.holder_type, p_to_seller uuid,
  p_product uuid, p_qty integer, p_mtype public.stock_movement_type,
  p_src_type text, p_src_id uuid, p_comment text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_left integer := p_qty; v_take integer; r record;
begin
  if p_qty <= 0 then raise exception 'qty must be > 0'; end if;
  for r in
    select sb.id, sb.batch_id, sb.quantity
    from public.stock_balances sb
    join public.batches b on b.id = sb.batch_id
    where sb.product_id = p_product and sb.quantity > 0
      and ((p_from_holder = 'warehouse' and sb.holder_type = 'warehouse')
        or (p_from_holder = 'seller' and sb.holder_type = 'seller' and sb.seller_id = p_from_seller))
    order by b.arrival_date, b.created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, r.quantity);
    update public.stock_balances set quantity = quantity - v_take, updated_at = now() where id = r.id;
    perform private._stock_incr(p_to_holder, p_to_seller, p_product, r.batch_id, v_take);
    insert into public.stock_movements (movement_type, product_id, batch_id, quantity,
      from_holder_type, from_seller_id, to_holder_type, to_seller_id, source_op_type, source_op_id, created_by, comment)
    values (p_mtype, p_product, r.batch_id, v_take,
      p_from_holder, case when p_from_holder = 'seller' then p_from_seller end,
      p_to_holder, case when p_to_holder = 'seller' then p_to_seller end,
      p_src_type, p_src_id, auth.uid(), p_comment);
    v_left := v_left - v_take;
  end loop;
  if v_left > 0 then
    raise exception 'insufficient stock to move for product % (short by %)', p_product, v_left using errcode = '23514';
  end if;
end;
$$;
