-- 0008_inventory_rpcs: arrival, transfer to seller, seller->warehouse return.
-- Public SECURITY DEFINER (owned by postgres = bypasses RLS as table owner).
-- execute revoked from public/anon, granted to authenticated; role checked inside each.

-- audit helper (private)
create or replace function private.audit_event(
  p_action text, p_entity text, p_entity_id uuid, p_old jsonb, p_new jsonb, p_comment text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value, comment)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_old, p_new, p_comment);
$$;

-- ---------- add_batch: product arrival (director) ----------
create or replace function public.add_batch(
  p_product uuid, p_unit_cost numeric, p_qty integer, p_arrival_date date, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_batch uuid;
begin
  perform private.require_role(array['director']::public.user_role[]);
  if p_qty <= 0 then raise exception 'qty must be > 0'; end if;
  if p_unit_cost < 0 then raise exception 'unit_cost must be >= 0'; end if;
  if not exists (select 1 from public.products where id = p_product) then
    raise exception 'unknown product %', p_product;
  end if;
  insert into public.batches (product_id, unit_cost, qty_received, arrival_date, comment, created_by)
  values (p_product, p_unit_cost, p_qty, coalesce(p_arrival_date, current_date), p_comment, auth.uid())
  returning id into v_batch;
  perform private.stock_place('warehouse', null, p_product, v_batch, p_qty, 'arrival', null, null, 'batch', v_batch, p_comment);
  perform private.audit_event('arrival', 'batches', v_batch, null,
    jsonb_build_object('product_id', p_product, 'unit_cost', p_unit_cost, 'qty', p_qty, 'arrival_date', coalesce(p_arrival_date, current_date)), p_comment);
  return v_batch;
end;
$$;

-- ---------- transfer_to_seller: warehouse -> seller (director/manager) ----------
create or replace function public.transfer_to_seller(p_seller uuid, p_items jsonb, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_group uuid := gen_random_uuid(); it jsonb;
begin
  perform private.require_role(array['director', 'manager']::public.user_role[]);
  if not exists (select 1 from public.profiles where id = p_seller and role = 'seller' and is_active) then
    raise exception 'target % is not an active seller', p_seller;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;
  for it in select value from jsonb_array_elements(p_items) loop
    perform private.stock_move_fifo('warehouse', null, 'seller', p_seller,
      (it->>'product_id')::uuid, (it->>'qty')::integer, 'transfer_to_seller', 'transfer', v_group, p_comment);
  end loop;
  perform private.audit_event('transfer_to_seller', 'transfer', v_group, null,
    jsonb_build_object('seller_id', p_seller, 'items', p_items), p_comment);
  return v_group;
end;
$$;

-- ---------- return_seller_to_warehouse: seller -> warehouse (seller own / director / manager) ----------
create or replace function public.return_seller_to_warehouse(p_seller uuid, p_items jsonb, p_comment text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare r public.user_role; v_group uuid := gen_random_uuid(); it jsonb;
begin
  r := private.require_role(array['director', 'manager', 'seller']::public.user_role[]);
  if r = 'seller' and p_seller <> auth.uid() then
    raise exception 'sellers can only return their own stock' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array';
  end if;
  for it in select value from jsonb_array_elements(p_items) loop
    perform private.stock_move_fifo('seller', p_seller, 'warehouse', null,
      (it->>'product_id')::uuid, (it->>'qty')::integer, 'return_seller_to_warehouse', 'seller_return', v_group, p_comment);
  end loop;
  perform private.audit_event('return_seller_to_warehouse', 'return', v_group, null,
    jsonb_build_object('seller_id', p_seller, 'items', p_items), p_comment);
  return v_group;
end;
$$;

-- ---------- lock down execute ----------
revoke execute on function public.add_batch(uuid, numeric, integer, date, text) from public, anon;
revoke execute on function public.transfer_to_seller(uuid, jsonb, text) from public, anon;
revoke execute on function public.return_seller_to_warehouse(uuid, jsonb, text) from public, anon;
grant execute on function public.add_batch(uuid, numeric, integer, date, text) to authenticated;
grant execute on function public.transfer_to_seller(uuid, jsonb, text) to authenticated;
grant execute on function public.return_seller_to_warehouse(uuid, jsonb, text) to authenticated;
