# Branch-Admin Side — Complete Functionality Enhancement Prompt

> Paste this whole file as the task prompt for an implementing agent (Claude Code).
> It is grounded in the actual codebase: a Django REST backend (`backend/`) + Next.js
> admin frontend (`frontend/`) for **Al-Qavi Hub**, a multi-branch cosmetics distribution app.

---

## 0. MISSION

Complete and harden **every branch-admin functional area**: POS sales (full / partial / credit),
collecting payments later, sales returns + refunds, purchases, receiving stock, purchase
payments (incl. partial), purchase returns + refunds, products (add/edit), stocks (add/adjust/
transfer), the payments/ledger system, finance reports, dashboard, alerts, and system-user/role
management. Fix the known bugs listed in §3, then implement the per-module enhancements in §5.

Work **incrementally and verifiably**. Do not rewrite working modules. Preserve the existing
design system (dark sidebar + light content, indigo accent).

---

## 1. ARCHITECTURE & ISOLATION INVARIANTS (read first, never violate)

**Two isolation axes — `backend/core/scoping.py` owns them:**
- **Tenant (PRIMARY)** = the owning Admin. Each branch admin is a tenant; staff sub-users share
  their admin's tenant; Super Admin / superuser is the cross-tenant platform operator.
  Helpers: `tenant_id_for(user)`, `scope_to_tenant(user, qs, field='tenant')`,
  `is_platform_operator(user)`, `user_can_use_tenant`.
- **Branch (warehouse) = SECONDARY within a tenant.** Helpers: `user_warehouse_ids(user)`
  (None = unscoped, set = scoped, empty = fail-closed), `scope_queryset`, `user_can_use_warehouse`,
  `apply_report_scope(request, qs, branch_field, creator_field, tenant_field='tenant')`,
  and `BranchScopedQuerysetMixin` (hooks `filter_queryset`).

**Hard invariants — every change MUST keep these true:**
1. A branch admin can only ever read/write rows of **their own tenant**, and act on **their own
   warehouse(s)**. Stock deductions, payments, returns, and reports must never touch another
   branch/tenant.
2. Any new admin-facing viewset that exposes business data MUST set `tenant_field='tenant'`
   (and `branch_field`), and any custom `@action`/aggregate MUST call `scope_to_tenant` /
   `apply_report_scope` manually (the mixin does not cover custom actions).
3. Money events go through `backend/modules/payments/services.py` (idempotent upserts keyed by
   `source_type` + `source_id`). Ledger rows MUST be stamped with `warehouse_id` + `tenant_id`.
4. Stamp `tenant_id` + `created_by` on every write path. Stamp `warehouse` where the model has it.
5. The public storefront, supplier/customer/delivery shadow logins, and anonymous requests are
   NOT tenant-scoped (governed by their own view logic) — don't break them.

**Frontend auth context:** `frontend/src/lib/auth.ts` → `authService.getUser()` returns
`{ is_super_admin, warehouses: [{id,name,area}], role, ... }`; `authService.isSuperAdmin()`.
Branch context is read from here (session storage), not refetched.

**After backend changes, restart the Django dev server.** Run `python manage.py check` and the
relevant module before declaring done.

---

## 2. HOW TO WORK (process the implementing agent must follow)

1. **Read before editing.** For each module below, open the listed files end-to-end first.
2. **Fix bugs in §3 before features in §5** — they corrupt money/stock numbers.
3. **One module at a time**, smallest correct diff. Match surrounding code style.
4. **Verify isolation after each change**: as a branch admin you see only your branch; as Super
   Admin the default lists are correct; cross-tenant access returns 403/empty.
5. **Test the money math**: total = paid + remaining; ledger income/expense matches the event;
   reversing an event removes its ledger row.
6. Keep an explicit checklist; report what was changed, tested, and skipped.

---

## 3. CRITICAL BUGS TO FIX FIRST (money/stock correctness)

### 3.1 Dashboard low-stock is tenant-wide, not per-branch
`backend/modules/sales/views.py` (`OrderViewSet.stats`, ~lines 283–313) computes low stock with
`scope_to_tenant(... Stock ...)` only — it sums a product across ALL the tenant's warehouses, so a
branch admin's low-stock alert is suppressed when one branch is empty but another is full.
**Fix:** when the requester is branch-scoped (`user_warehouse_ids` not None), also filter Stock by
`warehouse_id__in` those ids; honor an optional `?warehouse=` drill-down. Super Admin stays tenant-wide.

### 3.2 Profit overstates — returns not deducted
`backend/modules/sales/reports.py` (`_order_profit`, ~lines 45–46) and
`backend/modules/sales/views.py` (`stats` profit aggregate, ~lines 337–343) sum
`(price - cost_price) * qty` over all delivered items and never subtract **ACCEPTED SaleReturn**
items. **Fix:** subtract refunded items' profit (and ideally their revenue) for delivered orders
that have accepted returns. Apply the same correction to dashboard and reports consistently.

### 3.3 Manual payment silently defaults the branch
`backend/modules/payments/views.py` (`perform_create`, ~lines 94–110) falls back to
`sorted(ids)[0]` when no warehouse is sent, and the frontend form
(`frontend/src/app/admin/payments/page.tsx`) has **no warehouse field and no date field**.
**Fix:** add a warehouse selector (limited to the admin's own warehouses, auto-selected + locked
when they have one) and a date picker to the manual-payment form; backend keeps validating
`user_can_use_warehouse`.

### 3.4 Stock transfer can cross tenants
`backend/modules/inventory/views.py` (`StockViewSet.transfer`, ~lines 127–261) creates the
destination Stock with `tenant_id=stock.tenant_id` but never verifies the **destination warehouse
belongs to the same tenant**. **Fix:** validate `destination_warehouse.tenant_id == stock.tenant_id`
(and that the actor `user_can_use_warehouse` both ends); reject otherwise. Also fix the carton
remainder rounding (~line 238) so fractional cartons aren't lost.

### 3.5 Low-stock threshold hardcoded, ignores `Product.min_count`
Frontend `frontend/src/app/admin/alerts/page.tsx` (~lines 64–86) hardcodes `qty < 10`.
`Product.min_count` exists but is never consulted server-side. **Fix:** add a server endpoint
`GET /v1/inventory/low-stock/` (tenant + branch scoped) that compares per-warehouse stock to each
product's `min_count`, and have alerts + dashboard consume it instead of the client-side `< 10`.

### 3.6 Partial POS sale: installment creation can fail silently
`frontend/src/app/admin/sale/page.tsx` (`handleSave`, ~lines 442–454) records the initial
installment in a `try/catch` that only `console.log`s on failure — the sale succeeds but the
payment history is incomplete. **Fix:** surface the failure (toast + retry), or create the order +
initial installment atomically on the backend so they can't diverge.

---

## 4. CROSS-CUTTING CONSISTENCY TO ESTABLISH

- **Unify the partial-payment model.** Sales use `TransactionPayment` installments
  (`backend/modules/payments/`), but **purchases use a single `PurchaseOrder.paid_amount`** with no
  installment audit trail (resubmitting overwrites history). Bring purchases (and purchase/sale
  returns refunds) onto the same `TransactionPayment` + `services.record_installment` /
  `recompute_parent` mechanism so every transaction type has: a payment history, partial settlement,
  pending-verification, and an idempotent ledger row. The `_LEDGER_SOURCE` / `_LEDGER_CATEGORY` maps
  in `services.py` already support `purchaseorder`, `salereturn`, `purchasereturn`.
- **Reuse the shared `PaymentPanel`** (`frontend/src/components/admin/PaymentPanel.tsx`) and
  `LedgerView` (`frontend/src/components/admin/LedgerView.tsx`) everywhere a balance is collected,
  so POS, purchases, and both return types share one "collect / settle" UX.
- **Reversal symmetry.** Every event that posts to the ledger must remove its row when reversed
  (cancel / reject / delete). Verify `order_to_ledger` (`sales/signals.py`) already reverses sale
  income when an order leaves DELIVERED, and add the equivalent for any new flows.

---

## 5. MODULE-BY-MODULE WORK

For each module: **read these files → implement the tasks → meet the acceptance criteria.**

### 5.1 POS Sale (full / partial / credit)
**Read:** `frontend/src/app/admin/sale/page.tsx`; `backend/modules/sales/serializers.py`
(`CreateOrderSerializer.create`, ~76–278); `OrderViewSet.perform_create` + `partial_update`
(`backend/modules/sales/views.py`); `backend/modules/sales/models.py` (Order).
**Tasks:**
- Enforce credit/partial preconditions on the **backend** too (registered customer + due date +
  `0 <= amount_paid <= total`), not only in the UI (`sale/page.tsx` ~407–415).
- Resolve the cross-tenant edge case: if a staff user picks a warehouse, the order's `tenant` must
  be the **warehouse owner's** tenant, and the staff must be allowed to use that warehouse — reject
  mismatches instead of silently stamping the actor's tenant (serializers.py ~152–163).
- Hard-block over-stock at checkout (server validates against this branch's `Stock.total_quantity`).
- Fix 3.6 (atomic order + initial installment).
**Acceptance:** A partial POS sale creates the order + one confirmed installment + one ledger income
row, all tenant/branch-stamped; `amount_paid` + `remaining` are correct; over-stock is rejected;
no cross-tenant order can be created.

### 5.2 Collect payment later / partial settlement
**Read:** `frontend/src/app/admin/sales/page.tsx` (Collect button), `PaymentPanel.tsx`,
`backend/modules/payments/views.py` (`TransactionPaymentViewSet`), `services.py`
(`record_installment`, `recompute_parent`).
**Tasks:**
- Ensure every installment ledger row inherits `tenant_id` + `warehouse_id` from the parent
  (services.py ~250–252) even when the actor is a shadow/None user.
- Build the **pending-verification** loop: a UI to confirm/reject pending installments; pending rows
  stay off-ledger until confirmed; on confirm they post and `recompute_parent` runs.
- Validate slip uploads (type/size) and show a preview.
**Acceptance:** Collecting installments drives `payment_status` PAID/PARTIAL/UNPAID correctly; the
ledger total for an order equals the sum of its confirmed installments; pending never double-counts.

### 5.3 Sales returns + refunds
**Read:** `frontend/src/app/admin/sale-returns/page.tsx`; `SaleReturnViewSet` (`sales/views.py`,
incl. the accept/restock block); `services.record_sale_return`; `SaleReturn` model.
**Tasks:**
- Add a UI + field to set a **partial `refund_amount`** (e.g. restocking fee) instead of always
  `items_total`; prevent refunding > return value.
- Validate on the backend that a refund can only be settled when the return is **ACCEPTED**.
- Make restock **branch-aware**: restock to the originating order's warehouse, not just by
  `product_name + tenant` (so multi-branch tenants don't restock the wrong branch).
- Wrap accept+restock atomically; on failure roll back the status change.
**Acceptance:** Accepting a return restocks the correct branch, posts exactly one outbound (refund)
ledger row, and `refund_status` flips to PAID only when fully settled.

### 5.4 Purchases (create / receive / edit)
**Read:** `frontend/src/app/admin/purchases/add/page.tsx`, `purchases/page.tsx`,
`purchases/[id]/edit/page.tsx`; `PurchaseViewSet` (`create_purchase`, `_sync_to_inventory`,
`update_status`, `edit_full`) in `sales/views.py`.
**Tasks:**
- Fix the **warehouse fallback** in `_sync_to_inventory` (~872–877): if `created_by` has no
  warehouse, fail with a clear error instead of creating NULL-warehouse Stock.
- Prevent `Stock.total_quantity`/`SupplierProduct.quantity` going **negative** on sync.
- Validate uniqueness of `purchase_number` on `edit_full`.
- Filter **inactive suppliers** out of the supplier/product pickers.
**Acceptance:** Receiving a PO creates batch Stock + a `PURCHASE` StockMovement in the correct
branch/tenant, never NULL-warehouse, never negative; edits are blocked once received.

### 5.5 Purchase payments (full / partial / credit to supplier)
**Read:** `purchases/page.tsx` PaymentModal; `accept_payment` / `reject_payment`
(`sales/views.py`); `services.record_purchase_payment` / `remove_purchase_payment`.
**Tasks:**
- Migrate to the shared `TransactionPayment` installment model (see §4) so partial supplier
  payments have a history and an audit trail rather than overwriting `paid_amount`.
- Default `payment_date` to today when omitted; show an "Accounts Payable" (unpaid) vs "Paid"
  distinction.
- Ensure ledger rows are tenant-stamped even for legacy NULL-tenant POs (resolve via
  `parent_tenant_id`).
**Acceptance:** A partial purchase payment posts an installment + an outbound ledger row scoped to
the PO's branch/tenant; supplier accept/reject toggles the ledger correctly; history is preserved.

### 5.6 Purchase returns + refunds
**Read:** `purchases/returns/page.tsx`, `purchases/returns/add/page.tsx`; `PurchaseReturnViewSet`
(`create_return`, `accept_return`, `reject_return`); `services.record_purchase_return`.
**Tasks:**
- Restrict the return product picker to items **actually on the referenced PO**, and validate
  return qty ≤ received qty.
- Add a **refund-received workflow** (inverse of purchase payment) so the admin can record when the
  supplier's refund actually arrives; drive `refund_status` via `recompute_parent`, not a one-shot
  set in `accept_return` (~1514).
- Make the accept-time stock deduction **warehouse-aware** (not just `product_name + supplier +
  tenant`).
- Show the return reason in the list.
**Acceptance:** Accepting a return deducts the right branch's stock, posts an inbound ledger row, and
`refund_status` reflects actual settlement; you cannot return more than was purchased.

### 5.7 Products (add / edit listing)
**Read:** `frontend/src/app/admin/products/page.tsx`, `products/add/page.tsx`,
`frontend/src/components/admin/products/ProductForm.tsx`; `ProductViewSet`
(`perform_create`/`perform_update`) + `Product` model + `inventory/signals.py`.
**Tasks:**
- Validate that the selected `stock` belongs to one of the actor's warehouses (block guessed
  cross-tenant stock ids).
- Add **gallery-image delete** on edit.
- Fix the `total_quantity` sync fragility (`signals.py` ~32): it matches `price_per_item ==
  cost_price`; editing `Product.cost_price` orphans stock from the sum. Re-derive on product save
  or relax the match. Also reconcile `Product.warehouse` vs `Stock.warehouse` denormalization.
**Acceptance:** Adding/editing a product keeps `total_quantity` correct per branch; no cross-tenant
stock can be attached; gallery images are fully manageable.

### 5.8 Stocks (current list / add / adjust / transfer / movements)
**Read:** `frontend/src/app/admin/inventory/list/page.tsx`,
`frontend/src/app/admin/inventory/warehouses/page.tsx`; `StockViewSet` (all actions) + `Stock`,
`StockMovement`, `Warehouse` models + `inventory/signals.py`.
**Tasks:**
- Add a real **manual stock adjustment** action that writes an `ADJUSTMENT` StockMovement (for
  loss/damage/count correction) instead of editing quantity with no audit.
- Add `weight`/`size`/SKU/barcode to the Add-Stock form and SKU/barcode search to the stock list.
- Fix 3.4 (transfer tenant validation + carton rounding).
- Wire **SALE / RETURN** StockMovement rows when sales deduct and returns restock (currently those
  movement types are never created), so movement history is complete.
**Acceptance:** Every stock change (purchase, sale, return, transfer, adjustment) leaves a correct,
tenant-scoped StockMovement; transfers stay within the tenant; stock can't silently change without a
movement.

### 5.9 Payments / Income / Expense (ledger)
**Read:** `frontend/src/app/admin/income/page.tsx`, `expense/page.tsx`, `payments/page.tsx`,
`LedgerView.tsx`; `PaymentViewSet` + `payment_stats` (`payments/views.py`); `Payment` model.
**Tasks:**
- Fix 3.3 (warehouse + date fields on manual entry).
- Clarify the "Internal" stat label (manual outbound only) in `payment_stats`.
- Add **receivables/payables aging** using the already-written but unused
  `services.aging_buckets` — expose it in a report and on the dashboard.
**Acceptance:** Manual entries are correctly branch/tenant-stamped and visible only to the right
admin; income/expense totals reconcile with auto + manual rows; aging is shown.

### 5.10 Reports & Dashboard
**Read:** `frontend/src/app/admin/reports/page.tsx`, `dashboard/page.tsx`; `sales/reports.py`
(by_area/by_user/statements/returns), `OrderViewSet.stats`, `payments_due`.
**Tasks:**
- Apply the profit-vs-returns fix (3.2) and low-stock branch fix (3.1) consistently here.
- Make "Settle"/due links deep-link to the specific record, not just the list page
  (`alerts/page.tsx` `DUE_LINK`).
- Add an exposed **aging report** and per-user **profitability**.
- Confirm every aggregate calls `apply_report_scope(..., tenant_field='tenant')` (audit each).
**Acceptance:** Numbers are tenant+branch correct, profit nets out returns, and a branch admin can
never see another branch/tenant's figures even with `?warehouse=`/`?created_by=` params.

### 5.11 System Users & Roles
**Read:** `frontend/src/app/admin/system-users/page.tsx`, `system-users/add/page.tsx`,
`users/roles/page.tsx`; `backend/modules/users/` (views/models, `UserActivityLog`).
**Tasks:**
- Confirm/enforce that a branch admin's newly created staff inherit `tenant_id = actor.tenant_id`
  and are assigned the admin's warehouse(s); add a **warehouse selector** to the Add-User form.
- Add a **password-reset** endpoint + UI for staff users.
- Add an **audit log** entry for user create/update/delete.
- Persist role→default-permission presets server-side instead of only in the frontend
  `getRolePreset()` (so role changes don't require a code deploy).
**Acceptance:** New staff are correctly tenant/branch scoped; admins can reset staff passwords;
user-management actions are audited; role presets live in the DB.

### 5.12 Alerts & Notifications
**Read:** `frontend/src/app/admin/alerts/page.tsx`, `notifications/page.tsx`.
**Tasks:**
- Consume the new server low-stock endpoint (3.5) instead of client-side `< 10`.
- Add backend filtering + pagination for activity logs (currently fetches 100 and filters client-side).
- Replace 5s polling with a lighter mechanism (longer interval or SSE) — at minimum make it
  configurable and backoff-friendly.
**Acceptance:** Alerts reflect real per-branch shortages and overdue balances; the notifications feed
scales without hammering the DB.

---

## 6. DEFINITION OF DONE

- All §3 bugs fixed; all §5 module acceptance criteria met.
- `python manage.py check` clean; new/changed flows manually exercised as **both** a branch admin
  and the Super Admin.
- Isolation re-verified: no cross-tenant or cross-branch read/write anywhere touched.
- Every money/stock mutation has a matching, reversible ledger/movement row.
- No regression to storefront / supplier / customer / delivery portals.
- A short CHANGELOG of what changed, what was tested, and anything deferred.

---

## 7. FILE INDEX (quick reference)

**Backend:** `core/scoping.py` · `modules/sales/{models,serializers,views,reports,signals}.py` ·
`modules/payments/{models,views,services}.py` · `modules/inventory/{models,views,signals,serializers}.py` ·
`modules/products/{models,views,serializers}.py` · `modules/users/` · `modules/supplier/`.

**Frontend:** `src/app/admin/{sale,sales,sale-returns,orders,invoices}/…` ·
`src/app/admin/purchases/…` · `src/app/admin/inventory/{list,warehouses}/…` ·
`src/app/admin/products/…` · `src/app/admin/{income,expense,payments,reports,dashboard,alerts,notifications}/…` ·
`src/app/admin/system-users/…`, `users/roles/…` ·
`src/components/admin/{PaymentPanel,LedgerView,products/ProductForm}.tsx` ·
`src/services/*.service.ts` · `src/lib/{auth,scoping,api}.ts`.
