-- 0013_sale_economics_view: per-sale revenue & COGS (DIRECTOR ONLY).
-- Sales are paid in full at the moment of sale, so revenue is the line total (net of sale returns),
-- and COGS is the cost of delivered units (incl. free) net of returned units. profit = revenue - cogs (in app).
create view public.v_sale_economics with (security_invoker = true) as
select
  s.id as sale_id,
  coalesce((select sum(si.line_amount) from public.sale_items si where si.sale_id = s.id), 0)
    - coalesce((select sum(rt.total_amount_delta) from public.returns rt
                where rt.source_op_type = 'sale' and rt.source_op_id = s.id), 0) as revenue,
  coalesce((select sum(m.quantity * b.unit_cost) from public.stock_movements m join public.batches b on b.id = m.batch_id
            where m.source_op_type = 'sale' and m.source_op_id = s.id and m.movement_type in ('sale', 'free_bonus')), 0)
    - coalesce((select sum(m.quantity * b.unit_cost) from public.stock_movements m join public.batches b on b.id = m.batch_id
            where m.source_op_type = 'sale' and m.source_op_id = s.id and m.movement_type = 'return_doctor_to_seller'), 0) as cogs
from public.sales s
where private.current_user_role() = 'director';

grant select on public.v_sale_economics to authenticated;
