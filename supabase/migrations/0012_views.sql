-- 0012_views: read-side analytic views. All security_invoker=true so each underlying
-- table's RLS applies to the querying user (cost/profit views also self-guard to director).
--
-- Profit model (documented): cash-basis revenue + proportional COGS.
--   revenue   = (sale cash in + consignment payments in) - refunds out   [from money ledger]
--   COGS      = sale cost (delivered-returned, incl free) full
--             + consignment free-line cost full (rule A)
--             + per consignment: min(1, collected/billed_net) * delivered_paid_cost
--   Simplifications (rare edges, refine later): consignment returns are attributed to the
--   paid-line cost pool; applied (vs paid) doctor credit is not re-counted as revenue.

-- ---------- stock on hand (qty + retail/consignment value; NO cost) ----------
create view public.v_stock_on_hand with (security_invoker = true) as
select sb.holder_type, sb.seller_id, sb.product_id, p.name as product_name, p.category,
       sum(sb.quantity)                                as quantity,
       sum(sb.quantity) * p.current_retail_price       as retail_value,
       sum(sb.quantity) * p.current_consignment_price  as consignment_value
from public.stock_balances sb
join public.products p on p.id = sb.product_id
where sb.quantity > 0
group by sb.holder_type, sb.seller_id, sb.product_id, p.name, p.category,
         p.current_retail_price, p.current_consignment_price;

-- ---------- stock cost value (DIRECTOR ONLY: joins batches + self-guard) ----------
create view public.v_stock_cost with (security_invoker = true) as
select sb.holder_type, sb.seller_id, sb.product_id,
       sum(sb.quantity)               as quantity,
       sum(sb.quantity * b.unit_cost) as cost_value
from public.stock_balances sb
join public.batches b on b.id = sb.batch_id
where sb.quantity > 0 and private.current_user_role() = 'director'
group by sb.holder_type, sb.seller_id, sb.product_id;

-- ---------- consignment status (remaining / overdue / overpaid / colour) ----------
create view public.v_realization_status with (security_invoker = true) as
select base.*,
  greatest(0, billed_net - paid - credit_applied)                                        as remaining,
  greatest(0, paid + credit_applied - billed_net)                                        as overpaid,
  (billed_net - paid - credit_applied > 0
     and current_date - coalesce(last_payment_date, realization_date) > 30)              as is_overdue,
  case
    when (billed_net - paid - credit_applied) <= 0 then 'green'
    when (billed_net - paid - credit_applied > 0
          and current_date - coalesce(last_payment_date, realization_date) > 30) then 'red'
    else 'orange'
  end as status_color
from (
  select r.id as realization_id, r.seller_id, r.doctor_id, r.realization_date, r.quota_id,
    coalesce(li.billed, 0)                          as billed,
    coalesce(rr.returned, 0)                         as returned,
    coalesce(li.billed, 0) - coalesce(rr.returned, 0) as billed_net,
    coalesce(pp.paid, 0)                            as paid,
    coalesce(cc.applied, 0)                         as credit_applied,
    pp.last_payment_date
  from public.realizations r
  left join (select realization_id, sum(line_amount) billed from public.realization_items group by 1) li on li.realization_id = r.id
  left join (select source_op_id, sum(total_amount_delta) returned from public.returns
             where source_op_type = 'realization' group by 1) rr on rr.source_op_id = r.id
  left join (select realization_id, sum(amount) paid, max(payment_date) last_payment_date from public.payments group by 1) pp on pp.realization_id = r.id
  left join (select source_realization_id, -sum(amount) applied from public.doctor_credit_movements
             where reason = 'applied_to_consignment' group by 1) cc on cc.source_realization_id = r.id
) base;

-- ---------- seller cash (balance + in-transit) ----------
create view public.v_seller_cash with (security_invoker = true) as
select p.id as seller_id, p.first_name, p.last_name, p.seller_color,
       coalesce(ab.cash_balance, 0) as cash_balance,
       coalesce(tt.in_transit, 0)   as in_transit
from public.profiles p
left join public.account_balances ab on ab.account_type = 'seller' and ab.seller_id = p.id
left join (select seller_id, sum(amount) in_transit from public.money_transfers where status = 'pending' group by 1) tt on tt.seller_id = p.id
where p.role = 'seller';

-- ---------- business cash identity (DIRECTOR ONLY) ----------
create view public.v_business_cash with (security_invoker = true) as
select
  coalesce((select cash_balance from public.account_balances where account_type = 'director'), 0) as director_cash,
  coalesce((select sum(cash_balance) from public.account_balances where account_type = 'seller'), 0) as sellers_cash,
  coalesce((select sum(amount) from public.money_transfers where status = 'pending'), 0) as in_transit,
  coalesce((select cash_balance from public.account_balances where account_type = 'director'), 0)
    + coalesce((select sum(cash_balance) from public.account_balances where account_type = 'seller'), 0)
    + coalesce((select sum(amount) from public.money_transfers where status = 'pending'), 0) as total_business_cash
where private.current_user_role() = 'director';

-- ---------- doctor advance credit balance ----------
create view public.v_doctor_credit with (security_invoker = true) as
select doctor_id, sum(amount) as credit_balance
from public.doctor_credit_movements
group by doctor_id
having sum(amount) <> 0;

-- ---------- derived doctor last-activity ----------
create view public.v_doctor_activity with (security_invoker = true) as
select d.id as doctor_id,
  nullif(greatest(
    coalesce((select max(sale_date) from public.sales where doctor_id = d.id), '-infinity'::date),
    coalesce((select max(realization_date) from public.realizations where doctor_id = d.id), '-infinity'::date),
    coalesce((select max(p.payment_date) from public.payments p join public.realizations r on r.id = p.realization_id where r.doctor_id = d.id), '-infinity'::date),
    coalesce((select max(return_date) from public.returns where doctor_id = d.id), '-infinity'::date)
  ), '-infinity'::date) as last_activity_at
from public.doctors d;

-- ---------- quota progress per month (collected + deviation colour) ----------
create view public.v_quota_progress with (security_invoker = true) as
select qm.id as quota_month_id, qm.quota_id, q.seller_id, q.doctor_id, q.name_snapshot,
       qm.month_index, qm.period_start, qm.period_end, qm.goal_amount, q.deviation_pct_snapshot,
       coalesce(s.amt, 0) + coalesce(pp.amt, 0) as collected,
       case
         when coalesce(s.amt, 0) + coalesce(pp.amt, 0) >= qm.goal_amount then 'green'
         when coalesce(s.amt, 0) + coalesce(pp.amt, 0) >= qm.goal_amount * (1 - q.deviation_pct_snapshot / 100) then 'orange'
         else 'red'
       end as status_color
from public.quota_months qm
join public.quotas q on q.id = qm.quota_id
left join lateral (
  select sum(si.line_amount) amt from public.sales s
  join public.sale_items si on si.sale_id = s.id
  where s.quota_id = qm.quota_id and s.sale_date between qm.period_start and qm.period_end
) s on true
left join lateral (
  select sum(p.amount) amt from public.payments p
  join public.realizations r on r.id = p.realization_id
  where r.quota_id = qm.quota_id and p.payment_date between qm.period_start and qm.period_end
) pp on true;

-- ---------- P&L summary (DIRECTOR ONLY) ----------
create view public.v_profit_summary with (security_invoker = true) as
with
revenue as (
  select
    coalesce(sum(amount) filter (where direction = 'in' and movement_type in ('sale_cash_in', 'payment_in')), 0)
    - coalesce(sum(amount) filter (where direction = 'out' and movement_type = 'refund'), 0) as revenue
  from public.money_movements
),
sale_cogs as (
  select
    coalesce(sum(m.quantity * b.unit_cost) filter (where m.movement_type in ('sale', 'free_bonus')), 0)
    - coalesce(sum(m.quantity * b.unit_cost) filter (where m.movement_type = 'return_doctor_to_seller'), 0) as c
  from public.stock_movements m join public.batches b on b.id = m.batch_id
  where m.source_op_type = 'sale'
),
cons_free_cogs as (
  select coalesce(sum(m.quantity * b.unit_cost), 0) as c
  from public.stock_movements m join public.batches b on b.id = m.batch_id
  where m.source_op_type = 'realization' and m.movement_type = 'free_bonus'
),
cons as (
  select r.id,
    coalesce((select sum(p.amount) from public.payments p where p.realization_id = r.id), 0) as collected,
    coalesce((select sum(ri.line_amount) from public.realization_items ri where ri.realization_id = r.id), 0)
      - coalesce((select sum(rt.total_amount_delta) from public.returns rt where rt.source_op_type = 'realization' and rt.source_op_id = r.id), 0) as billed_net,
    coalesce((select sum(m.quantity * b.unit_cost) from public.stock_movements m join public.batches b on b.id = m.batch_id
              where m.source_op_type = 'realization' and m.source_op_id = r.id and m.movement_type = 'consignment'), 0)
      - coalesce((select sum(m.quantity * b.unit_cost) from public.stock_movements m join public.batches b on b.id = m.batch_id
              where m.source_op_type = 'realization' and m.source_op_id = r.id and m.movement_type = 'return_doctor_to_seller'), 0) as delivered_paid_cost
  from public.realizations r
),
cons_paid_cogs as (
  select coalesce(sum(case when billed_net > 0 then least(1.0, collected / billed_net) * delivered_paid_cost else 0 end), 0) as c
  from cons
),
calc as (
  select
    (select revenue from revenue) as revenue,
    (select c from sale_cogs) + (select c from cons_free_cogs) + (select c from cons_paid_cogs) as cogs,
    coalesce((select sum(amount) from public.expenses where status = 'approved'), 0) as approved_expenses
)
select
  revenue,
  cogs,
  revenue - cogs as gross_profit,
  approved_expenses,
  revenue - cogs - approved_expenses as net_profit
from calc
where private.current_user_role() = 'director';

-- ---------- grants ----------
grant select on public.v_stock_on_hand, public.v_stock_cost, public.v_realization_status,
  public.v_seller_cash, public.v_business_cash, public.v_doctor_credit, public.v_doctor_activity,
  public.v_quota_progress, public.v_profit_summary to authenticated;
