# TradeFlow — Architecture & Data-Model Document

**Status:** For review. No schema or application code is created until this is approved.
**Domain:** Full business-control system for a cosmetology-products reseller.
**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 + shadcn/ui + TanStack Table · Supabase (Postgres + Auth + RLS) · `exceljs` for reports.
**Locale:** UI in Azerbaijani · currency manat (₼, AZN) `numeric(14,2)` · dates `DD.MM.YY`.

> Implementation note: Next.js 16 APIs (middleware, server actions, `@supabase/ssr`) will be verified against `node_modules/next/dist/docs/` at build time per `AGENTS.md`. This document is design-level.

---

## 0. Decisions this document is built on (from grilling)

| # | Area | Decision |
|---|------|----------|
| 1 | Auth | Supabase Auth under the hood; owner provisions users via admin API; username → hidden synthetic email; `profiles` holds role/color/etc.; role in JWT via access-token hook |
| 2 | Enforcement | DB-level **RLS** for all role separation |
| 3 | Costing | **FIFO lot/batch**; stock tracked per-holder, per-batch |
| 4 | Write path | Append-only **ledgers** + maintained balance tables; transactional ops via `SECURITY DEFINER` RPCs with row locks; plain CRUD via PostgREST+RLS |
| 5 | Profit | **Cash-basis revenue + proportional COGS**; debt tracked separately |
| 6 | Quotas | Goal container; quota ops = sales/consignments tagged `quota_id`; hidden from regular lists; progress = money received bucketed by payment date |
| 7 | Cost hiding | Cost lives only on director-only `batches` + profit views |
| 8 | Money transfer | Seller-entered partial amount + director confirmation; in-transit state |
| 9 | Doctor ownership | One owning seller; auto-own on add; only owner transacts; reassignment logged; history stays, future moves |
| 10 | Overpayment | Advance credit on doctor + manual refund |
| 11 | Sale-return refund | Source chosen at return time, default to current holder |
| A | Free-product COGS | Full cost booked immediately as negative profit (never paid → can't be proportional) |
| B | Overdue | Computed on read, at consignment-header level |
| C | Quota money | Counts in revenue, excluded from sales counts/lists |
| D | Cash identity | Total cash = director + Σ sellers + in-transit |

---

## 1. Application architecture

**Layers**

1. **Postgres (source of truth + rule engine).** Tables, enums, RLS, `SECURITY DEFINER` RPC functions for every transactional operation, append-only ledgers, maintained balance tables, director-only analytic views, triggers for audit on CRUD tables.
2. **Supabase Auth.** Credentials + sessions + JWT. Custom **access-token hook** injects `user_role` and `profile_id` claims so RLS is a fast claim check, not a sub-query.
3. **Next.js server layer.** `@supabase/ssr` cookie sessions; middleware guards routes by role; **server actions** call RPCs (never client-side read-modify-write of stock/cash); Excel/zip generated server-side from live data.
4. **Client (React 19 + shadcn/ui).** Role-specific dashboards, TanStack data tables with filters, colored status chips, forms.

**Two write paths**
- **Transactional** (money/inventory touching): one server action → one RPC → atomic (lock → FIFO → ledger + balances + operation rows + audit). Overselling and half-writes are structurally impossible.
- **Plain CRUD** (doctor/product metadata, etc.): direct PostgREST under RLS; audited via triggers.

**Cash identity (invariant D):** `total_business_cash = director_balance + Σ seller_balances + in_transit_transfers`. Surfaced on the director dashboard so it always reconciles.

**Product-asset identity:** transfers (owner→seller) and seller→owner returns never change total asset value — they relocate batches between holders.

---

## 2. Roles & access (summary; full RLS matrix in §6)

| | Director | Manager | Seller |
|---|---|---|---|
| Cost / COGS / profit / margin | ✅ | ❌ | ❌ |
| Director cash balance & finance | ✅ | ❌ | ❌ |
| Warehouse + all seller inventories (qty, retail/consignment value) | ✅ | ✅ | own only |
| All sales/consignments/returns/free/quotas | ✅ all | ✅ all | own only |
| Create users / set roles / colors | ✅ | ❌ | ❌ |
| Add/edit products, set prices, create batches | ✅ | ❌ | ❌ |
| Add doctors / assign to sellers / record transfers to sellers | ✅ | ✅ | add (auto-owns) |
| Make sale / consignment / return / free / payment / quota work | (via seller profiles) | ❌ | ✅ own |
| Add expense | ✅ (auto-approved) | ✅ (pending) | ❌ |
| Approve/reject expenses, top-up, mark loan | ✅ | ❌ | ❌ |
| Transfer money to director | — | — | ✅ initiate |
| Confirm money transfer | ✅ | ❌ | ❌ |

---

## 3. Data model

Conventions: PK `id uuid default gen_random_uuid()`; money `numeric(14,2)`; qty `integer`; timestamps `timestamptz default now()`; soft-delete via `is_active` (no hard deletes).

### 3.1 Identity
**`profiles`** (1:1 with `auth.users`)
`id (=auth.uid) PK · role user_role · first_name · last_name · username UNIQUE · seller_color (null unless seller) · is_active · comment · created_at`
- Password & session in `auth.users`. Username ↔ synthetic email `username@tradeflow.local` (hidden from UI).
- Access-token hook reads `role` + `id` into JWT claims.

### 3.2 Products & costing
**`products`** *(manager/seller readable; no cost here)*
`id · name · category · current_retail_price · current_consignment_price · is_active · comment · created_at`

**`batches`** ⚠️ **director-only RLS** — holds the sensitive cost
`id · product_id → products · unit_cost · qty_received · arrival_date (date) · record_created_at · comment · created_by · created_at`
- Adding a product creates its first batch. Restocks add new batches (this is the 28-vs-32 case). `arrival_date` ≠ `record_created_at` (kept separate per spec).

### 3.3 Stock (per-holder, per-batch — FIFO)
A *holder* is either the warehouse (singleton) or a seller.

**`stock_balances`** *(maintained; manager-visible: qty only, cost requires `batches`)*
`id · holder_type holder_type · seller_id → profiles (null = warehouse) · product_id · batch_id → batches · quantity (CHECK ≥ 0)` · `UNIQUE(holder_type, seller_id, batch_id)`

**`stock_movements`** *(append-only ledger; manager-visible; cost only via director-only batch join)*
`id · movement_type stock_movement_type · product_id · batch_id · quantity (>0) · from_holder_type · from_seller_id · to_holder_type · to_seller_id · source_op_type · source_op_id · created_by · created_at · comment`
- One logical action that spans multiple FIFO batches produces **multiple** movement rows (one per batch). This ledger *is* the per-batch consumption record → COGS = Σ(qty × `batches.unit_cost`) over a line's movements (director-only).

### 3.4 Doctors
**`doctors`**
`id · first_name · last_name · phone · instagram · clinic · assigned_seller_id → profiles · is_active · comment · created_by · created_at`
- Seller color is **derived** from `assigned_seller.seller_color` (not duplicated). Reassignment updates only `assigned_seller_id` (logged); historical operations keep their original `seller_id`.

**`doctor_credit_movements`** *(advance credit from overpayments — decision 10)*
`id · doctor_id · amount (signed: + earned, − applied/refunded) · reason credit_reason · source_return_id · source_realization_id · created_by · created_at`
- Doctor credit balance = Σ amounts. Applying credit to a new consignment = negative movement + an equivalent payment.

### 3.5 Sales (header + lines) — *immediate, no debt*
**`sales`**: `id · sale_date · seller_id · doctor_id · quota_id (null) → quotas · comment · created_by · created_at`
**`sale_items`**: `id · sale_id · product_id · quantity · price_type price_type · unit_retail_snapshot · unit_consignment_snapshot · actual_unit_price · line_amount · is_free · bonus_reason · comment`
- Snapshots make "standard vs actual (custom)" visible forever. Free line: `price_type=free_bonus`, `actual_unit_price=0`, `is_free=true`, full cost booked immediately (rule A).
- On create: RPC FIFO-depletes seller stock, writes movements, adds cash to seller (full revenue + full COGS recognized now, since paid immediately).

### 3.6 Consignment / Realization (header + lines) — *creates debt*
**`realizations`**: `id · realization_date · seller_id · doctor_id · quota_id (null) · comment · created_by · created_at`
**`realization_items`**: same columns as `sale_items` (`price_type` defaults `consignment`).
**`payments`** *(header-level, each a separate row — never a string)*
`id · realization_id · amount · payment_date · received_by → profiles · created_by · created_at · comment`
- **Derived** per realization: `billed = Σ active line_amount`; `paid = Σ payments`; `remaining = billed − paid`; `overpaid = max(0, paid − billed)`.
- COGS recognized **proportionally** as payments arrive (decision 5); free lines excepted (rule A).
- Payment dates string in Excel (`20.02.26 - 200 ₼; …`) is rendered from these rows.

### 3.7 Returns *(separate linked records — never delete originals)*
**`returns`**
`id · return_date · return_type return_type · source_op_type · source_op_id · source_item_id · seller_id · doctor_id · product_id · quantity · batch_id (restores original batch identity) · refund_amount (null) · refund_source refund_source (null) · total_amount_delta · comment · created_by · created_at`
- `return_type ∈ {doctor_return_sale, doctor_return_consignment, seller_return_to_warehouse}`.
- RPC restores stock to the **original batch** at the right holder, writes movements, recomputes derived consignment figures + overdue, handles overpayment→credit, and (sale returns) deducts the refund from the chosen holder's balance (decision 11; seller may go negative = "owed reimbursement").

### 3.8 Money ledger & balances
**`money_movements`** *(append-only ledger)*
`id · movement_type money_movement_type · amount (>0) · direction (in/out) · account_type account_type · seller_id (null=director/doctor) · source_op_type · source_op_id · created_by · created_at · comment`
**`money_transfers`** *(seller→director workflow + in-transit state — decision 8)*
`id · seller_id · amount · status transfer_status · initiated_at · confirmed_at · confirmed_by · comment`
- Initiate → seller `out` movement (money leaves seller, sits in-transit). Confirm → director `in` movement. Reject → seller `in` reversal.
**`expenses`** *(decision: manager pending / director approved)*
`id · expense_date · category expense_category · amount · status expense_status · added_by · approved_by · approved_at · comment · created_at`
- Approved → director `out` movement + counts in net profit. Pending/rejected → neither.
**`balance_operations`** *(director top-ups / loans)*
`id · op_date · amount · source · is_loan · comment · created_by · created_at` → director `in` movement; `is_loan` flags borrowed cash.
**`account_balances`** *(maintained)*: `account_type · seller_id · cash_balance` — updated inside RPCs; `money_movements` is the audit truth. In-transit = Σ pending `money_transfers`.

### 3.9 Quotas *(decision 6 — tag on real operations)*
**`quota_templates`**: `id · name · duration_months · total_goal · monthly_goal (=total/duration) · allowed_deviation_pct · is_active · created_by · created_at`
**`quotas`** *(instance per doctor+seller; snapshots template so later edits don't mutate open quotas)*
`id · template_id · seller_id · doctor_id · start_date · name_snapshot · duration_snapshot · total_goal_snapshot · monthly_goal_snapshot · deviation_pct_snapshot · status quota_status · created_by · created_at`
**`quota_months`**: `id · quota_id · month_index · period_start · period_end · goal_amount`
- Collected/month = money received (sale amount on sale date, or consignment payments on payment date) on operations whose `quota_id` = this quota, dated within the month → **derived**, not stored.
- Color: green ≥ goal · orange `goal×(1−dev%) … goal−ε` · red `< goal×(1−dev%)`.

### 3.10 Audit
**`audit_logs`**: `id · actor_id → profiles · action audit_action · entity_type · entity_id · old_value jsonb · new_value jsonb · comment · created_at`
- Written inside transactional RPCs; triggers handle plain CRUD (insert/update/delete) auto-capturing old/new.

### 3.11 Enums
`user_role(director,manager,seller)` · `holder_type(warehouse,seller)` · `price_type(retail,consignment,custom,free_bonus)` · `stock_movement_type(arrival,transfer_to_seller,sale,consignment,return_doctor_to_seller,return_seller_to_warehouse,free_bonus,adjustment)` · `return_type(...)` · `refund_source(seller,director,none)` · `money_movement_type(sale_cash_in,payment_in,transfer,topup,expense,refund,advance_credit,adjustment)` · `account_type(director,seller)` · `transfer_status(pending,confirmed,rejected)` · `expense_status(pending,approved,rejected)` · `expense_category(rent,salary,bonus,assistance,unexpected,other)` · `quota_status(active,closed)` · `credit_reason(overpayment_return,manual)` · `audit_action(...)`.

> **Custom price** is *not* a separate table — `price_type='custom'` + the price snapshots make it filterable/visible everywhere. (Deliberate normalization vs the spec's `custom_price_logs`.)

---

## 4. Relationships (key FKs)

- `profiles 1—* doctors` (assigned_seller) · `1—* sales/realizations/quotas` (seller)
- `products 1—* batches` · `products 1—* {sale_items, realization_items, stock_*}`
- `batches 1—* {stock_balances, stock_movements}` (cost carrier)
- `sales 1—* sale_items` · `realizations 1—* realization_items` · `realizations 1—* payments`
- `returns *—1 {sales|realizations}` (polymorphic via source_op_type/id) `*—1 batches`
- `quota_templates 1—* quotas 1—* quota_months` · `quotas 1—* {sales,realizations}` (quota_id)
- `doctors 1—* doctor_credit_movements` · `profiles 1—* money_transfers`

---

## 5. RPC functions (transactional API)

Each is `SECURITY DEFINER`, validates caller's role/ownership from JWT, locks affected balance rows `FOR UPDATE`, and writes operation + ledger + balances + audit atomically.

`create_product_with_batch` · `add_batch` (restock) · `transfer_to_seller(items[])` · `return_seller_to_warehouse(items[])` · `create_sale(header, items[])` · `create_consignment(header, items[])` · `add_payment(realization_id, amount, date)` · `apply_doctor_credit(realization_id, amount)` · `return_from_doctor(return rows, refund_source?)` · `give_free_bonus` (or `is_free` line inside sale/consignment) · `initiate_money_transfer(amount)` · `confirm_money_transfer(id)` / `reject_money_transfer(id)` · `add_expense` · `approve_expense(id)` / `reject_expense(id)` · `director_topup(amount, is_loan)` · `open_quota(template_id, doctor_id, start_date)` · `close_quota(id)`.

FIFO helper: given (holder, product, qty), select batches oldest-first under lock, decrement, emit one movement per batch.

---

## 6. RLS matrix (per table)

| Table | Director | Manager | Seller |
|---|---|---|---|
| profiles | all | read all | read all (for doctor colors), self-write none |
| products | all | read | read |
| **batches** | **all** | **deny** | **deny** |
| stock_balances / stock_movements | all | read (qty) | read own (seller_id = uid) |
| doctors | all | read+write | read all, write own (assigned=uid) |
| doctor_credit_movements | all | read | read own doctors |
| sales / sale_items | all | read | read+write own |
| realizations / realization_items / payments | all | read | read+write own |
| returns | all | read | read+write own |
| money_movements / account_balances | director rows: dir only; seller rows: own | deny financial | own seller rows |
| money_transfers | all + confirm | deny | own (initiate) |
| expenses | all + approve | insert(pending)+read | deny |
| balance_operations | all | deny | deny |
| quota_templates | all | read | read |
| quotas / quota_months | all | read | read+work own |
| audit_logs | all | read (non-financial) | read own |
| director-only views (profit/cost/margin) | all | deny | deny |

JWT claim `user_role` drives the `USING`/`WITH CHECK` predicates; `seller` rows scoped by `seller_id = auth.uid()`.

---

## 7. Director-only analytic views

- `v_cost_valuation` — per holder/product: qty × batch cost (exact FIFO).
- `v_profit_events` — per money event: revenue (sale amount on sale date / payment on payment date) and COGS (full for sales; proportional for consignment payments; **full upfront for free lines, rule A**). Rolls up to gross profit; net = gross − approved expenses.
- `v_margin`, `v_business_cash` (identity D), `v_total_product_asset`.

Retail/consignment valuations (manager-visible) = qty × **current** product price (potential value).

---

## 8. Pages / routes

**Shared:** `/login`. Middleware redirects by role to `/director`, `/manager`, or `/seller`.

**Director:** dashboard (KPIs, cash identity, tops, overdue, quotas) · warehouse (owner + every seller inventory, 3 valuations) · products & batches · sales · consignment · returns · doctors · quotas + templates · **finance** (balance, expenses approval, top-ups/loans, profit/margin, asset value) · sellers → **seller profile** (Sales / Consignment / Inventory / Statistics / Action history) · analytics · audit log · Excel/zip exports.

**Manager:** dashboard (no cost/profit/balance) · warehouse (qty + retail/consignment value) · sales · consignment · returns · doctors (add/edit/assign) · **transfers to sellers** · quotas (read) · expenses (add→pending) · movements · custom-price view · Excel (no cost/profit).

**Seller:** dashboard · tabs: Sales · Consignment · Returns · Free/Bonus · Quotas · Inventory (own; retail/consignment value) · Statistics · **Transfer money to Director** · own Excel.

---

## 9. Excel / reports

Server-side `exceljs`, always from live DB (DB is source of truth — old files never are). Multi-file quota export zipped. Quota filename: `Seller_Quota_Doctor_Nmonths_Total.xlsx`; one sheet per quota month with the spec's columns + footer (goal/collected/deviation/status). Sales/consignment/returns/quota sheets per §10 of the spec. Cost/profit columns only in the Director's exports.

---

## 10. Mapping to your 25 deliverables

1 Architecture §1 · 2 Pages §8 · 3 Roles §2,§6 · 4–6 DB §3,§4 · 7 Rules §0,§11 below · 8 Warehouse §3.3,§5 · 9 Seller inventory §3.3 · 10 Valuation §7 · 11 Sales §3.5 · 12 Consignment §3.6 · 13 Partial pay §3.6 · 14 Overdue rule B · 15 Returns §3.7 · 16 Free rule A · 17 Quotas §3.9 · 18 Balance §3.8 · 19 Transfers §3.8 · 20 Expenses §3.8 · 21 Custom price §3.11 note · 22 Excel §9 · 23 Audit §3.10 · 24–25 Risks §11.

---

## 11. Risks & contradictions (resolved)

1. **Free product vs proportional COGS** — never paid, so proportional rule can't fire → free lines book full cost upfront as negative profit (rule A). ✔
2. **Overdue "per line"** undefined with header-level payments → computed at consignment level (rule B). ✔
3. **"Quotas not mixed" vs quota = real money** → tagged operations, hidden from sales lists but counted in revenue (rule C). ✔
4. **Cost on returns after price change** → batch identity preserves exact original cost (FIFO). ✔
5. **Refund when cash already with director** → refund source chosen at return time; seller-negative = owed reimbursement (decision 11). ✔
6. **"One row per product"** is Excel flattening, not the model → header + multi-line operations. ✔
7. **Custom price below cost** → allowed; director sees standard-vs-actual gap. ✔
8. **Manager records transfers but mustn't see cost** → RPC runs as definer; manager UI shows qty only; cost stays in director-only `batches`. ✔
9. **Overpayment** → doctor advance credit + manual refund (decision 10). ✔
10. **Double-counting quota cash** → single money ledger; quota is a tag, not a second channel. ✔

---

## 12. Open items for your confirmation

- **Doctor "activity"** field in the spec — interpret as a derived last-activity timestamp (from latest operation), not a manual field? (assumed yes)
- **Manager seeing seller cash balances / transfers** — spec excludes balance from managers; I've hidden seller cash from managers too. Confirm.
- **Loan/credit (`is_loan`) repayment tracking** — track as a flag now; full loan-repayment schedule out of scope for v1 unless you want it.
