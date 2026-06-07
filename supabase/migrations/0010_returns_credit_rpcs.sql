-- 0010_returns_credit_rpcs: return_from_doctor, apply_doctor_credit, refund_doctor_credit
-- Returns never delete originals. Stock is restored to the exact batches the operation
-- consumed (cost-exact). Consignment overpayment is minted as doctor credit. Sale refunds
-- come from the chosen balance (seller may go negative = owed reimbursement).

create or replace function private.doctor_credit_balance(p_doctor uuid)
returns numeric
language sql stable security definer set search_path = ''
as $$ select coalesce(sum(amount), 0) from public.doctor_credit_movements where doctor_id = p_doctor; $$;

create or replace function public.return_from_doctor(
  p_source_op_type text, p_source_op_id uuid, p_source_item_id uuid, p_qty integer,
  p_refund_source public.refund_source default null, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  r public.user_role;
  v_seller uuid; v_doctor uuid; v_product uuid; v_unit_price numeric; v_line_qty integer;
  v_already_returned integer; v_rtype public.return_type; v_refund_source public.refund_source;
  v_left integer; v_take integer; v_last_ret uuid; v_refund_total numeric;
  v_billed_net numeric; v_in numeric; v_overpay numeric; v_minted numeric; v_delta numeric;
  br record;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  if p_source_op_type not in ('sale', 'realization') then
    raise exception 'source_op_type must be sale or realization';
  end if;
  if p_qty <= 0 then raise exception 'return qty must be > 0'; end if;

  if p_source_op_type = 'sale' then
    select seller_id, doctor_id into v_seller, v_doctor from public.sales where id = p_source_op_id;
    if not found then raise exception 'unknown sale %', p_source_op_id; end if;
    select product_id, actual_unit_price, quantity into v_product, v_unit_price, v_line_qty
      from public.sale_items where id = p_source_item_id and sale_id = p_source_op_id;
    if not found then raise exception 'sale line % not in sale %', p_source_item_id, p_source_op_id; end if;
    v_rtype := 'doctor_return_sale';
  else
    select seller_id, doctor_id into v_seller, v_doctor from public.realizations where id = p_source_op_id;
    if not found then raise exception 'unknown consignment %', p_source_op_id; end if;
    select product_id, actual_unit_price, quantity into v_product, v_unit_price, v_line_qty
      from public.realization_items where id = p_source_item_id and realization_id = p_source_op_id;
    if not found then raise exception 'consignment line % not in consignment %', p_source_item_id, p_source_op_id; end if;
    v_rtype := 'doctor_return_consignment';
  end if;

  if r = 'seller' and v_seller <> auth.uid() then
    raise exception 'sellers can only process returns for their own operations' using errcode = '42501';
  end if;

  v_already_returned := coalesce((select sum(quantity) from public.returns where source_item_id = p_source_item_id), 0);
  if p_qty > v_line_qty - v_already_returned then
    raise exception 'return qty % exceeds returnable (% left)', p_qty, v_line_qty - v_already_returned;
  end if;

  -- refund source only meaningful for paid sale lines
  v_refund_source := case
    when p_source_op_type = 'sale' and v_unit_price > 0 then coalesce(p_refund_source, 'seller')
    else 'none' end;

  -- restore stock to the exact batches this operation consumed (newest consumed first)
  v_left := p_qty;
  for br in
    select m.batch_id,
           sum(case when m.movement_type in ('sale', 'consignment', 'free_bonus') then m.quantity
                    when m.movement_type = 'return_doctor_to_seller' then -m.quantity else 0 end) as net_out
    from public.stock_movements m
    where m.source_op_type = p_source_op_type and m.source_op_id = p_source_op_id and m.product_id = v_product
    group by m.batch_id
    having sum(case when m.movement_type in ('sale', 'consignment', 'free_bonus') then m.quantity
                    when m.movement_type = 'return_doctor_to_seller' then -m.quantity else 0 end) > 0
    order by max(m.created_at) desc
  loop
    exit when v_left <= 0;
    v_take := least(v_left, br.net_out::integer);
    perform private.stock_place('seller', v_seller, v_product, br.batch_id, v_take,
      'return_doctor_to_seller', null, null, p_source_op_type, p_source_op_id, p_comment);
    insert into public.returns (return_date, return_type, source_op_type, source_op_id, source_item_id,
      seller_id, doctor_id, product_id, batch_id, quantity, refund_amount, refund_source, total_amount_delta, comment, created_by)
    values (current_date, v_rtype, p_source_op_type, p_source_op_id, p_source_item_id,
      v_seller, v_doctor, v_product, br.batch_id, v_take,
      case when v_refund_source in ('seller', 'director') then v_take * v_unit_price end,
      case when p_source_op_type = 'sale' then v_refund_source end,
      v_take * v_unit_price, p_comment, auth.uid())
    returning id into v_last_ret;
    v_left := v_left - v_take;
  end loop;
  if v_left > 0 then
    raise exception 'could not locate enough consumed stock to restore (short by %)', v_left;
  end if;

  -- sale refund out of the chosen balance
  if p_source_op_type = 'sale' and v_unit_price > 0 and v_refund_source in ('seller', 'director') then
    v_refund_total := p_qty * v_unit_price;
    perform private.post_money('refund', v_refund_total, 'out', v_refund_source,
      case when v_refund_source = 'seller' then v_seller end, 'return', v_last_ret, 'sale return refund');
  end if;

  -- consignment: mint overpayment -> doctor credit (idempotent vs prior mints)
  if p_source_op_type = 'realization' then
    v_billed_net := coalesce((select sum(line_amount) from public.realization_items where realization_id = p_source_op_id), 0)
                  - coalesce((select sum(total_amount_delta) from public.returns
                              where source_op_type = 'realization' and source_op_id = p_source_op_id), 0);
    v_in := coalesce((select sum(amount) from public.payments where realization_id = p_source_op_id), 0)
          + coalesce((select -sum(amount) from public.doctor_credit_movements
                      where source_realization_id = p_source_op_id and reason = 'applied_to_consignment'), 0);
    v_overpay := greatest(0, v_in - v_billed_net);
    v_minted := coalesce((select sum(amount) from public.doctor_credit_movements
                          where source_realization_id = p_source_op_id and reason = 'overpayment_return'), 0);
    v_delta := v_overpay - v_minted;
    if v_delta > 0 then
      insert into public.doctor_credit_movements (doctor_id, amount, reason, source_return_id, source_realization_id, created_by, comment)
      values (v_doctor, v_delta, 'overpayment_return', v_last_ret, p_source_op_id, auth.uid(), 'overpayment after return');
    end if;
  end if;

  perform private.audit_event('return_from_doctor', 'returns', v_last_ret, null,
    jsonb_build_object('source_op_type', p_source_op_type, 'source_op_id', p_source_op_id,
      'item_id', p_source_item_id, 'qty', p_qty, 'refund_source', v_refund_source), p_comment);
  return v_last_ret;
end;
$$;

-- ---------- apply_doctor_credit: use a doctor's advance credit toward a consignment ----------
create or replace function public.apply_doctor_credit(p_realization uuid, p_amount numeric, p_comment text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare r public.user_role; v_seller uuid; v_doctor uuid; v_remaining numeric; v_credit numeric;
begin
  r := private.require_role(array['director', 'seller']::public.user_role[]);
  select seller_id, doctor_id into v_seller, v_doctor from public.realizations where id = p_realization;
  if not found then raise exception 'unknown consignment %', p_realization; end if;
  if r = 'seller' and v_seller <> auth.uid() then
    raise exception 'sellers can only apply credit on their own consignments' using errcode = '42501';
  end if;
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  v_remaining := private.realization_remaining(p_realization);
  if p_amount > v_remaining then raise exception 'credit % exceeds remaining %', p_amount, v_remaining; end if;
  v_credit := private.doctor_credit_balance(v_doctor);
  if p_amount > v_credit then raise exception 'insufficient doctor credit (% available)', v_credit; end if;
  insert into public.doctor_credit_movements (doctor_id, amount, reason, source_realization_id, created_by, comment)
  values (v_doctor, -p_amount, 'applied_to_consignment', p_realization, auth.uid(), p_comment);
  perform private.audit_event('apply_doctor_credit', 'doctor_credit_movements', v_doctor, null,
    jsonb_build_object('realization_id', p_realization, 'amount', p_amount), p_comment);
end;
$$;

-- ---------- refund_doctor_credit: pay out advance credit from the director balance ----------
create or replace function public.refund_doctor_credit(p_doctor uuid, p_amount numeric, p_comment text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_credit numeric;
begin
  perform private.require_role(array['director']::public.user_role[]);
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;
  v_credit := private.doctor_credit_balance(p_doctor);
  if p_amount > v_credit then raise exception 'insufficient doctor credit (% available)', v_credit; end if;
  insert into public.doctor_credit_movements (doctor_id, amount, reason, created_by, comment)
  values (p_doctor, -p_amount, 'refunded', auth.uid(), p_comment);
  perform private.post_money('refund', p_amount, 'out', 'director', null, 'doctor_credit', p_doctor, 'doctor credit refund');
  perform private.audit_event('refund_doctor_credit', 'doctor_credit_movements', p_doctor, null,
    jsonb_build_object('amount', p_amount), p_comment);
end;
$$;

revoke execute on function public.return_from_doctor(text, uuid, uuid, integer, public.refund_source, text) from public, anon;
revoke execute on function public.apply_doctor_credit(uuid, numeric, text) from public, anon;
revoke execute on function public.refund_doctor_credit(uuid, numeric, text) from public, anon;
grant execute on function public.return_from_doctor(text, uuid, uuid, integer, public.refund_source, text) to authenticated;
grant execute on function public.apply_doctor_credit(uuid, numeric, text) to authenticated;
grant execute on function public.refund_doctor_credit(uuid, numeric, text) to authenticated;
