-- 0009_sales_consignment_rpcs: create_sale, create_consignment, add_payment
-- Sale = product leaves seller stock + full cash to seller immediately (no debt).
-- Consignment = product leaves seller stock + debt; cash arrives later via add_payment.
-- Free line (price_type=free_bonus): qty leaves stock, amount 0, bonus_reason required.

-- Net remaining owed on a consignment (billed - returns - payments - applied credit).
create or replace function private.realization_remaining(p_realization uuid)
returns numeric
language sql stable security definer set search_path = ''
as $$
  select
      coalesce((select sum(line_amount) from public.realization_items where realization_id = p_realization), 0)
    - coalesce((select sum(total_amount_delta) from public.returns
                where source_op_type = 'realization' and source_op_id = p_realization), 0)
    - coalesce((select sum(amount) from public.payments where realization_id = p_realization), 0)
    - coalesce((select -sum(amount) from public.doctor_credit_movements
                where source_realization_id = p_realization and reason = 'applied_to_consignment'), 0);
$$;

-- ---------- create_sale ----------
create or replace function public.create_sale(
  p_seller uuid, p_doctor uuid, p_sale_date date, p_quota_id uuid, p_comment text, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role; v_sale uuid; it jsonb;
  v_product uuid; v_qty integer; v_ptype public.price_type;
  v_retail numeric; v_consign numeric; v_actual numeric; v_line numeric;
  v_is_free boolean; v_total numeric := 0; v_mtype public.stock_movement_type;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  if r = 'seller' and p_seller <> auth.uid() then
    raise exception 'sellers can only sell as themselves' using errcode = '42501';
  end if;
  if not exists (select 1 from public.doctors where id = p_doctor and assigned_seller_id = p_seller and is_active) then
    raise exception 'doctor % is not an active doctor assigned to seller %', p_doctor, p_seller;
  end if;
  if p_quota_id is not null and not exists (
      select 1 from public.quotas where id = p_quota_id and seller_id = p_seller and doctor_id = p_doctor and status = 'active') then
    raise exception 'quota % is not active for this seller/doctor', p_quota_id;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  insert into public.sales (sale_date, seller_id, doctor_id, quota_id, comment, created_by)
  values (coalesce(p_sale_date, current_date), p_seller, p_doctor, p_quota_id, p_comment, auth.uid())
  returning id into v_sale;

  for it in select value from jsonb_array_elements(p_items) loop
    v_product := (it->>'product_id')::uuid;
    v_qty := (it->>'qty')::integer;
    v_ptype := (it->>'price_type')::public.price_type;
    select current_retail_price, current_consignment_price into v_retail, v_consign
      from public.products where id = v_product and is_active;
    if not found then raise exception 'unknown or inactive product %', v_product; end if;
    v_is_free := (v_ptype = 'free_bonus');
    if v_is_free and coalesce(it->>'bonus_reason', '') = '' then
      raise exception 'a free bonus line requires a bonus_reason';
    end if;
    v_actual := case v_ptype
      when 'retail' then v_retail
      when 'consignment' then v_consign
      when 'custom' then (it->>'actual_unit_price')::numeric
      when 'free_bonus' then 0 end;
    if v_ptype = 'custom' and not (it ? 'actual_unit_price') then
      raise exception 'custom price line requires actual_unit_price';
    end if;
    v_line := v_qty * v_actual;
    v_mtype := case when v_is_free then 'free_bonus' else 'sale' end;
    perform private.stock_consume_fifo('seller', p_seller, v_product, v_qty, v_mtype, 'sale', v_sale, it->>'comment');
    insert into public.sale_items (sale_id, product_id, quantity, price_type,
      unit_retail_snapshot, unit_consignment_snapshot, actual_unit_price, line_amount, is_free, bonus_reason, comment)
    values (v_sale, v_product, v_qty, v_ptype, v_retail, v_consign, v_actual, v_line, v_is_free, it->>'bonus_reason', it->>'comment');
    v_total := v_total + v_line;
  end loop;

  if v_total > 0 then
    perform private.post_money('sale_cash_in', v_total, 'in', 'seller', p_seller, 'sale', v_sale, 'cash sale');
  end if;
  perform private.audit_event('create_sale', 'sales', v_sale, null,
    jsonb_build_object('seller_id', p_seller, 'doctor_id', p_doctor, 'total', v_total, 'items', p_items), p_comment);
  return v_sale;
end;
$$;

-- ---------- create_consignment ----------
create or replace function public.create_consignment(
  p_seller uuid, p_doctor uuid, p_date date, p_quota_id uuid, p_comment text, p_items jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role; v_real uuid; it jsonb;
  v_product uuid; v_qty integer; v_ptype public.price_type;
  v_retail numeric; v_consign numeric; v_actual numeric; v_line numeric;
  v_is_free boolean; v_mtype public.stock_movement_type;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  if r = 'seller' and p_seller <> auth.uid() then
    raise exception 'sellers can only consign as themselves' using errcode = '42501';
  end if;
  if not exists (select 1 from public.doctors where id = p_doctor and assigned_seller_id = p_seller and is_active) then
    raise exception 'doctor % is not an active doctor assigned to seller %', p_doctor, p_seller;
  end if;
  if p_quota_id is not null and not exists (
      select 1 from public.quotas where id = p_quota_id and seller_id = p_seller and doctor_id = p_doctor and status = 'active') then
    raise exception 'quota % is not active for this seller/doctor', p_quota_id;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;

  insert into public.realizations (realization_date, seller_id, doctor_id, quota_id, comment, created_by)
  values (coalesce(p_date, current_date), p_seller, p_doctor, p_quota_id, p_comment, auth.uid())
  returning id into v_real;

  for it in select value from jsonb_array_elements(p_items) loop
    v_product := (it->>'product_id')::uuid;
    v_qty := (it->>'qty')::integer;
    v_ptype := (it->>'price_type')::public.price_type;
    select current_retail_price, current_consignment_price into v_retail, v_consign
      from public.products where id = v_product and is_active;
    if not found then raise exception 'unknown or inactive product %', v_product; end if;
    v_is_free := (v_ptype = 'free_bonus');
    if v_is_free and coalesce(it->>'bonus_reason', '') = '' then
      raise exception 'a free bonus line requires a bonus_reason';
    end if;
    v_actual := case v_ptype
      when 'retail' then v_retail
      when 'consignment' then v_consign
      when 'custom' then (it->>'actual_unit_price')::numeric
      when 'free_bonus' then 0 end;
    if v_ptype = 'custom' and not (it ? 'actual_unit_price') then
      raise exception 'custom price line requires actual_unit_price';
    end if;
    v_line := v_qty * v_actual;
    v_mtype := case when v_is_free then 'free_bonus' else 'consignment' end;
    perform private.stock_consume_fifo('seller', p_seller, v_product, v_qty, v_mtype, 'realization', v_real, it->>'comment');
    insert into public.realization_items (realization_id, product_id, quantity, price_type,
      unit_retail_snapshot, unit_consignment_snapshot, actual_unit_price, line_amount, is_free, bonus_reason, comment)
    values (v_real, v_product, v_qty, v_ptype, v_retail, v_consign, v_actual, v_line, v_is_free, it->>'bonus_reason', it->>'comment');
  end loop;

  perform private.audit_event('create_consignment', 'realizations', v_real, null,
    jsonb_build_object('seller_id', p_seller, 'doctor_id', p_doctor, 'items', p_items), p_comment);
  return v_real;
end;
$$;

-- ---------- add_payment ----------
create or replace function public.add_payment(
  p_realization uuid, p_amount numeric, p_payment_date date, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare r public.user_role; v_seller uuid; v_remaining numeric; v_payment uuid;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  select seller_id into v_seller from public.realizations where id = p_realization;
  if not found then raise exception 'unknown consignment %', p_realization; end if;
  if r = 'seller' and v_seller <> auth.uid() then
    raise exception 'sellers can only record payments on their own consignments' using errcode = '42501';
  end if;
  if p_amount <= 0 then raise exception 'payment amount must be > 0'; end if;
  v_remaining := private.realization_remaining(p_realization);
  if p_amount > v_remaining then
    raise exception 'payment % exceeds remaining balance %', p_amount, v_remaining;
  end if;

  insert into public.payments (realization_id, amount, payment_date, received_by, created_by, comment)
  values (p_realization, p_amount, coalesce(p_payment_date, current_date), v_seller, auth.uid(), p_comment)
  returning id into v_payment;
  perform private.post_money('payment_in', p_amount, 'in', 'seller', v_seller, 'payment', v_payment, 'consignment payment');
  perform private.audit_event('add_payment', 'payments', v_payment, null,
    jsonb_build_object('realization_id', p_realization, 'amount', p_amount, 'remaining_before', v_remaining), p_comment);
  return v_payment;
end;
$$;

revoke execute on function public.create_sale(uuid, uuid, date, uuid, text, jsonb) from public, anon;
revoke execute on function public.create_consignment(uuid, uuid, date, uuid, text, jsonb) from public, anon;
revoke execute on function public.add_payment(uuid, numeric, date, text) from public, anon;
grant execute on function public.create_sale(uuid, uuid, date, uuid, text, jsonb) to authenticated;
grant execute on function public.create_consignment(uuid, uuid, date, uuid, text, jsonb) to authenticated;
grant execute on function public.add_payment(uuid, numeric, date, text) to authenticated;
