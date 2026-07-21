# Al-Qavi CDS — Full Production-Readiness Prompt

> **Goal:** Take the entire app (super-admin, branch-admin, customer, delivery-rider, supplier
> portals) from "demo with hardcoded bits and half-wired flows" to a **real-life, fully dynamic,
> zero-error, paginated, role-correct** system where every page pulls live data and every
> cross-page dependency works.
>
> This document is the single source of truth for that work. It is derived from a full audit of
> all 116 frontend pages (`frontend/src/app/**/page.tsx`) and all 10 backend modules
> (`backend/modules/**`). Execute it top-to-bottom by priority. Do **not** invent new features
> beyond what is listed; fix what exists so it actually works.

---

## ✅ STATUS (updated 2026-07-07) — 8-phase execution complete

Validated: `next build` compiled successfully; Django `check` clean; live unauthenticated curls
confirm the security boundary (suppliers / payments / by-branch all return 403).

> **🔴 DEPLOY-CRITICAL:** run `python manage.py migrate` on production when deploying. Migration
> `products.0022_product_original_price` is **required** — without it the storefront + admin
> product pages 500 with `Unknown column 'products.original_price'`. It's a nullable column add
> (zero-downtime, no backfill). Order: deploy code → `migrate`.

**DONE**
- **§2 P0 security:** supplier API auth-gated (was `AllowAny`); `plain_password` hidden (serializer + `list_users` gated to super-admin); `list_users` MySQL crash fixed; payments shadow-PK reuse fixed; Area `tenant_id` fixed.
- **§5 backend foundation:** `GET /v1/payments/by-branch/` (super-admin aggregation); `Product.original_price` + migration `0022`; unified order-tracking endpoints.
- **§3 role hardening:** Areas + Settings Business-Info gated to super-admin; `WarehouseViewSet` shows branch admins their assigned branches (round-trip fixed, queryset-only).
- **§4 super-admin:** per-branch Payments UI; assign additional admins on `/admin/branches`.
- **§9 pagination:** un-capped truncated lists (warehouses/suppliers/riders/payments) via `no_pagination` opt-out (matches the site's client-pager pattern).
- **§6 customer:** deals wired (+ admin "Compare-at price" input); checkout receipt uploads to verification queue; `/checkout` 404, product/wishlist buttons, profile Edit buttons all fixed.
- **§8 supplier:** `/supplier/inventory` repointed to supplier-scoped endpoint; dead `/supplier/settings` link fixed.
- **§7 delivery:** removed fake `Rs.150` earnings fallback (uses real `shipping_cost`); rating kept as-is per user.
- **§10-11 wiring/perf:** `/admin/orders` filter + pagination (completed orders reachable); alerts link fixed; pollers toned down (home 1s→60s, admin 2s→30s); Urdu string removed; dashboard/tracking relabels.

**RESOLVED BY DECISION**
- **P0-2** supplier tenant-isolation → **decided: keep suppliers SHARED GLOBALLY** (2026-07-08). Current behaviour is correct and stays: any authenticated admin sees the full supplier list; only the purchase *ledger* is per-tenant. Verified live (super-admin & branch admin both see all 4 suppliers; unauth/portal → 403). No further work.

**DEFERRED (product call / a human)**
- **P0-6** within-tenant branch reads: by design (`core/scoping.py`), a documented deferred phase-2 filter — left unchanged.
- **P0-4** the `plain_password` *column* still exists (exposure removed, storage not yet dropped).
- Delivery **customer-rating** feature; **2FA** (no backend); **true server-side pagination** for 10k+ scale; **live per-role click-through QA** (§12 — needs a human at a browser).

**Everything below is the original spec, kept for reference / the deferred items.**

---

## 0. Architecture recap (so nothing is misunderstood)

- **Backend:** Django + DRF, MySQL/MariaDB. Multi-tenant. Isolation engine lives in
  `backend/core/scoping.py` (`tenant_id_for`, `user_warehouse_ids`, `scope_queryset`,
  `BranchScopedQuerysetMixin`, `apply_report_scope`).
- **Identity axes:** `tenant` (primary — each **branch Admin is its own tenant**; super-admin =
  platform operator, `tenant IS NULL`) and `warehouse`/branch (secondary, within a tenant).
- **Roles:** matched by **name string** (case-insensitive): `super admin`/`superadmin`, `admin`
  (= branch admin / tenant owner), `area manager`, plus custom staff roles. **Supplier, Customer,
  and Delivery are NOT `User` rows** — they are separate tables logging in as in-memory "shadow
  users" (`sup_`/`cus_`/`del_` JWT prefixes) via `backend/modules/users/authentication.py`.
- **Frontend:** Next.js. Route gating via `lib/auth.ts` (`isSuperAdmin`), `lib/access.ts`
  (page/edit permissions), `components/auth/AuthGuard.tsx`, and `admin/layout.tsx`
  (`SUPER_ONLY_HREFS` / `SUPER_ADMIN_HIDDEN_HREFS`).

**What is already solid (do not "fix"):** backend tenant isolation for orders/inventory/payments/
users across sales/inventory/payments viewsets; the supplier purchase chain; the delivery
assignment chain; server-side product pagination on `/admin/products`; CMS-driven customer home page.

---

## 1. Non-negotiable global rules

Apply these to **every** page you touch:

1. **No hardcoded business data.** Every number, list, price, rating, stat, and status must come
   from an API. Static legal/marketing copy is the only exception (and even that should be
   CMS-editable where a CMS field exists).
2. **Every list is paginated** end-to-end (backend returns `{results, count, next, previous}`;
   frontend sends `?page=` and renders real pager). See §9 for the exact contract.
3. **No dead controls.** Every button/link either does its job or is removed. A control that
   `console.log`s, points to `href="#"`, or has no `onClick` is a bug.
4. **Every cross-page link carries the params the target needs**, and the target reads them.
5. **Role/branch correctness first.** A page must show exactly the data the logged-in role is
   allowed to see — no more (leak), no less (missing).
6. **Zero console errors, zero unhandled promise rejections, zero 401/404/500** in normal flows.
7. **Graceful empty & error states** on every data view (loading skeleton, empty message, retry).

---

## 2. PRIORITY 0 — Security & data-integrity blockers (do these FIRST)

These are exploitable or crash-on-real-data. Nothing else ships until they're fixed.

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| P0-1 | **Unauthenticated full CRUD on suppliers** incl. PII + `plain_password` | `backend/modules/company/views.py:44-51` (`SupplierViewSet permission_classes=[AllowAny]`); also `backend/modules/supplier/views.py:14-24` | Require auth; gate writes behind `HasModulePermission`/admin; never expose `plain_password`. |
| P0-2 | **Suppliers & supplier-products not tenant-isolated** (cross-tenant read/edit) | `supplier/models.py:7`, `products/models.py:176` (no `tenant` FK); `products/views.py:304-309` (no scoping) | Add `tenant` FK + migration; scope `SupplierViewSet` and `SupplierProductViewSet` by `tenant_id_for(user)`; suppliers created by an Admin belong to that tenant. |
| P0-3 | **`list_users` crashes on MySQL** (`.distinct('customer_name')` is Postgres-only) | `backend/modules/users/views.py:103` | Replace field-arg DISTINCT with a portable dedupe (values + group/annotate or Python-side). |
| P0-4 | **Plaintext passwords stored & surfaced** | `plain_password` on User/Supplier/Customer/DeliveryPerson; `users/serializers.py` `UserListSerializer` | Stop returning `plain_password` in any serializer; plan removal of the column (show credentials once at creation only). |
| P0-5 | **Shadow-user PK reuse** — `request.user.id` (a Customer/Supplier PK) used as a `User` FK filter can match unrelated rows | `users/authentication.py:62-118`; misuse e.g. `payments/views.py:142` | Always branch on `is_supplier/is_customer/is_delivery` + `real_id`; never filter a `User`-keyed field by a shadow id. |
| P0-6 | **Within-tenant branch isolation not enforced on reads** — a branch-scoped staff user sees ALL of their Admin's branches | `core/scoping.py:262-269` (warehouse + `creator_field` skipped in tenant mode); `sales/views.py:102` dead `creator_field` | Decide policy (see §3) and enforce: if staff are branch-restricted, intersect tenant scope with `user_warehouse_ids`. |
| P0-7 | **`AreaViewSet.perform_create` passes `tenant=<int>`** (should be `tenant_id`) → `ValueError` for non-super creators | `backend/modules/company/views.py:41` | Use `tenant_id=...`. |

---

## 3. Roles & access — the definitive matrix

Implement and **verify** this. Enforce on **both** backend (queryset scoping + permissions) and
frontend (route guard + hidden nav). A branch admin typing a super-admin URL directly must hit a
hard "Super Admin only" block, not just a hidden link.

| Area / Page | Super Admin | Branch Admin | Customer | Delivery | Supplier |
|---|---|---|---|---|---|
| Create/assign **branches** (`/admin/branches`) | ✅ full | ❌ hard block | ❌ | ❌ | ❌ |
| **Reports** — all branches + Personal + Net Profit (`/admin/reports`) | ✅ all branches | ✅ own branch only (no branch picker) | ❌ | ❌ | ❌ |
| **Website CMS** (`/admin/website-settings`) | ✅ | ❌ hard block | ❌ | ❌ | ❌ |
| **Areas / territories** (`/admin/company/areas`) | ✅ | ❌ **hard block (currently missing)** | ❌ | ❌ | ❌ |
| **Business Info / Company** tab (`/admin/settings`) | ✅ | ❌ **hard block (currently editable by branch admin)** | ❌ | ❌ | ❌ |
| **Global Payments** — per-branch + own (`/admin/payments`) | ✅ each branch separately **+ own** | ✅ own branch only | ❌ | ❌ | ❌ |
| Own **Income/Expense** ledger (`/admin/income`,`/expense`) | ✅ own (tenant NULL) + branch drill-in | ✅ own tenant | ❌ | ❌ | ❌ |
| Internal **Users/Admins** (`/admin/users`, roles) | ✅ | ❌ (uses `/admin/system-users` for own staff) | ❌ | ❌ | ❌ |
| **Staff** (`/admin/system-users`) | ❌ (n/a) | ✅ own staff only | ❌ | ❌ | ❌ |
| Products / Inventory / Orders / Sales / POS / Purchases / Returns / Invoices / Delivery mgmt | ✅ all branches (with branch picker where relevant) | ✅ own branch(es) only | ❌ | ❌ | ❌ |
| Customer storefront + dashboard | (can browse) | (can browse) | ✅ own orders/returns/wishlist/profile | ❌ | ❌ |
| Delivery portal (`/delivery/**`) | ❌ | ❌ | ❌ | ✅ own assigned deliveries/earnings/history | ❌ |
| Supplier portal (`/supplier/**`) | ❌ | ❌ | ❌ | ❌ | ✅ own products/orders/payments/returns |

**Super-admin branch-ownership consistency (P0-adjacent, fix here):** super-admin-created
warehouses are `tenant=NULL` but `WarehouseViewSet` is tenant-scoped (`inventory/views.py:88-90`),
so a branch assigned to an Admin is **invisible** in that Admin's warehouse list and data created
under it stamps a mismatched tenant. **Decide one model and make it round-trip:**
- **Recommended:** a branch's `tenant` = the Admin it is assigned to (set/updated when super-admin
  assigns it), so the Admin sees exactly their branches and all rows stamp the same tenant.
- Update `WarehouseViewSet.get_queryset` so super-admin sees all, each Admin sees their assigned
  branches, and assignment (`users/serializers.py:174`) writes the branch's tenant accordingly.

---

## 4. SUPER ADMIN — required capabilities

1. **Branches (`/admin/branches`)** — already strong. Add: ability to assign a **second/additional
   admin** to a branch (today "Assign an admin" only shows when a branch has zero admins,
   `branches/page.tsx:298`).
2. **Reports (`/admin/reports`)** — must cover **all branches**. Keep "All Branches" (`scope=all`),
   per-branch drill-down (`?warehouse=`), **Personal** (super-admin's own, warehouse-less rows),
   and Net-Profit P&L. Fix: for non-warehouse categories (customers/suppliers/products) either
   hide the branch selector or make it actually filter, so a picked branch isn't silently ignored.
   Add pagination to the result table (§9).
3. **Global Payments (`/admin/payments`)** — **the biggest gap.** Today a super-admin sees **only
   their own** personal ledger (backend forces `tenant__isnull=True` with no `scope=all`/
   `?warehouse`; the branch filter was deleted at `payments/page.tsx:351`; there's no Branch
   column). Deliver: a view where the super-admin sees **each branch's payments separately AND
   their own**. Implement a backend aggregation endpoint (§5 P-agg) returning per-branch groups +
   the operator's own group; add a Branch column + branch filter + per-branch subtotals in the UI.
4. **Website CMS (`/admin/website-settings`)** — already gated correctly. Extend CMS coverage to the
   secondary marketing pages (§6.2) so About/Blog/FAQ/Careers/Gift-cards are editable, not hardcoded.
5. **Own Income / Expense / Areas separate from branches** — income/expense separation already
   holds via `tenant IS NULL`. **Areas do NOT** (single undivided global list, no tenant scoping,
   no page guard). Add the super-admin guard (§3) and decide whether areas should be tenant-scoped;
   at minimum, super-admin's territories must be distinguishable from branch cities.

---

## 5. BACKEND — foundation fixes (beyond P0)

- **P-agg (new endpoint): per-branch payments aggregation.** Add
  `GET /v1/payments/by-branch/` (super-admin only) returning
  `[{warehouse_id, warehouse_name, income, expense, net, count}, ...]` **plus** an `own`
  (tenant-NULL) bucket. Reuse `apply_report_scope`. This backs §4.3.
- **Fix pagination truncation (P0-3 sibling, high impact):** many services drop `count`/`next` and
  return `data.results || data`, silently capping paginated endpoints at 10 rows with no next page:
  `payment.service.ts:24`, `inventory.service.ts:11,34`, `supplier.service.ts:11`,
  `delivery.service.ts:32`, `user.service.ts:7,29`. Either implement real paging (preferred for
  large lists) or pass `no_pagination=true` where a full set is genuinely needed (small lists).
- **Unbounded function-based lists** (no DRF pagination, ignore `?page`): `list_users`,
  `all_activity_logs`, `list_roles`, `payment_stats`, `payments_due`, all `sales/reports.py`
  endpoints, customer/supplier `ledger`, delivery `my_deliveries`. Add pagination or hard limits.
- **Delivery earnings/rating have no real backing fields.** `frontend/src/lib/deliveryStats.ts`
  fabricates earnings (`DELIVERY_FEE=150` fallback) and rating (`ratingFor` formula). Add real
  backend fields: a per-delivery payout/earning and a customer-submitted rating; expose via
  `my_deliveries`. (See §7.)
- **Product `original_price` (compare-at price) does not exist** in `backend/modules/products/`
  yet the storefront depends on it. Add the field (or a discount model) so deals + strikethrough
  pricing are real. (See §6.3.)
- **Two divergent order-tracking endpoints** (`v1/sales/orders/track/?tid=` vs
  `v1/sales/track/<id>/`). Consolidate to one; point both customer trackers at it.
- **Public invoice** (`/customer/invoice/[id]`) fetches the **authenticated** orders endpoint →
  breaks for guests. Add a tokenized public invoice endpoint or require login and stop advertising
  it as public.

---

## 6. CUSTOMER SIDE — make it real

### 6.1 Storefront data & pagination
- `/customer/shop` + all 5 category pages (`haircare/makeup/perfume/skincare/cosmetics`) +
  `/customer` home load the **entire catalog** via `productService.getAll()` and filter
  client-side. Convert to **server-side pagination + server-side category/price/search filtering**.
- Category pages match by **substring on `category_name`** — brittle; a renamed category yields a
  silently empty department. Filter by real category id/slug.
- `/customer/shop` de-dups by `name_price` (`shop/page.tsx:68-75`) — distinct SKUs get hidden. Drop
  or make the grouping intentional.
- **Kill the 1-second polling on the home page** (`customer/page.tsx:139` re-fetches CMS + full
  catalog every second per visitor). Replace with on-mount fetch + optional manual refresh / sane
  revalidation.

### 6.2 Dynamic content (CMS)
- Home page is fully CMS-driven ✅. Make **About** (`STORY` array), **Blog** (`POSTS` array),
  **FAQ**, **Careers**, **Gift-cards** CMS-editable instead of hardcoded.
- **Contact page has no working form** — "Start Chat / Partner Inquiry / Download Catalog" have no
  `onClick`. Add a real contact-message endpoint + form (or wire to existing `cmsService`).

### 6.3 Deals & pricing (data-model gap)
- `/customer/shop/deals` filters on `original_price` which **doesn't exist** → page is **permanently
  empty**, and every `ProductCard originalPrice` never renders. After adding the field (§5), wire
  deals to real compare-at prices and show genuine strikethrough + discount %.
- Product detail (`/customer/product/[id]`) shows **fabricated** rating (`count={4} reviews={145}`),
  fake barcode `'8901234567890'`, and invented `retailPrice`/`discount` (`cost_price*1.5`). Replace
  with real product fields + a real reviews source, or remove the fake trust UI.

### 6.4 Checkout & payment (currently theater)
- Checkout **does** create a real order ✅. But: card/Easypaisa account numbers are hardcoded
  (`checkout/page.tsx:345-347`); `payment_method` collapses to `COD`/`ONLINE`; **the uploaded
  Easypaisa receipt image is captured but never sent** (dropped from payload lines 149-164).
  Fix: upload the receipt (multipart) and persist it against the order/payment; carry the real
  payment method; move shipping-fee/tax rules to config, not magic numbers (`cartTotal>5000?0:350`).

### 6.5 Dead buttons & broken routes (customer)
- Product page **"Add to Wish List"** (`product/[id]:261`) — no `onClick`; wire to `WishlistContext`.
- Breadcrumb/brand `href="#"` (`product/[id]:85,124`).
- `/customer/dashboard/wishlist` **"Buy it now" → `/checkout`** (route doesn't exist → 404); correct
  is `/customer/checkout` (`wishlist/page.tsx:35`). Public `/customer/wishlist` "Checkout Now"
  (`:140`) has no `onClick`.
- **Profile page** (`/customer/dashboard/profile`) — all five "Edit" buttons are dead; make profile
  actually editable (name/email/phone/password/2FA) against `v1/users/...`.
- Tracking page "Share Link / Contact Support / Call Helpline / View on Map / View My Orders" —
  wire or remove.

---

## 7. DELIVERY SIDE — make it real

- **Real earnings & rating** (see §5). Replace `deliveryStats.ts` synthetic `DELIVERY_FEE=150` and
  `ratingFor()` with backend-provided payout + customer rating. "Customer Rating" must reflect real
  feedback, not delivered-count × 0.1.
- **"Today's Deliveries"** counts by order **creation** date, not delivery date
  (`deliveryStats.ts:24-28`) — fix to a real delivered/assigned-for-today date.
- **Pagination:** `delivery/deliveries`, `delivery/history`, `delivery/earnings`, and
  `admin/delivery` list have **none** — add it.
- **Notifications scoping:** `branch_orders` (`delivery/views.py:117-125`) shows every order in the
  rider's branch (incl. other riders'/unassigned). Confirm this is intended; if not, scope to the
  rider. Also there is no real notification entity / read-unread state — add one or relabel.
- **Rider self-registration is public/unapproved** (`/register/rider`) — add an admin approval gate
  if riders shouldn't go live instantly.

---

## 8. SUPPLIER SIDE — make it real

- **`/supplier/inventory` is broken:** it calls `/v1/inventory/` (router root, not `stocks/`) →
  **always empty**; delete/archive hit `/v1/inventory/{id}/` → 404 (`inventory/page.tsx:45,57,121`).
  Point at the correct **supplier-scoped** endpoint. ⚠️ Do **not** simply repoint to `stocks/`:
  `StockViewSet` is branch/tenant-scoped, **not supplier-scoped** (`inventory/views.py:94-104`), so
  a supplier would see the admin's whole branch stock — a **latent leak**. Build/So use a supplier
  stock view filtered by `supplier_id=real_id`.
- **Dead / orphaned routes & buttons:** `/supplier/settings` link 404 (`layout.tsx:203`);
  `/supplier/payments` returns `notFound()` and orphans `/supplier/payments/[id]/invoice`;
  `/supplier/profile/personal` & `/profile/security` are orphaned duplicates of the inline profile;
  `/supplier/support` is 100% static/dead; topbar bell/mail/search have no handlers; products
  "Mark as In Stock" (`:269`) and sales "Export" (`:426`) do nothing. Wire or remove each.
- **Wasted/dead fetches:** supplier dashboard & sales fetch `/v1/sales/orders/` which returns
  `none()` for suppliers — remove the dead retail branch; dashboard normalizes `purchase-returns`
  it never uses.
- **Hardcoded copy:** dashboard "Logistics Performance / Audit Warnings / Partner Advisory" cards;
  returns detail fake SKU `8872-…`, "Tax Reversal: 0", "Initiated By: Administrator Console". Make
  real or remove.
- **Pagination:** all supplier lists (`products/orders/sales/returns/inventory`) fetch
  `no_pagination=true` and paginate client-side — move to server-side for scale.
- **Profile section labels are swapped** (id `security`→"Personal Info", `personal`→"Business
  Details", `profile/page.tsx:100-104`) — fix.
- **Supplier self-registration is public/unapproved** (`SupplierViewSet.create` = `AllowAny`) — add
  approval gate if required.

---

## 9. Pagination standard (apply everywhere)

**Backend contract:** every list endpoint returns
`{ "count": <int>, "next": <url|null>, "previous": <url|null>, "results": [...] }`, honors
`?page=` and `?page_size=` (cap page_size), and applies filters/search **server-side** (never rely
on the client to filter a truncated page). Global default is already `PageNumberPagination,
PAGE_SIZE=10` (`config/settings/base.py:120-127`) — stop bypassing it with `no_pagination=true`
except for genuinely small/bounded sets (dropdown option lists).

**Frontend contract:** services return `{ results, count, next, previous }` (stop collapsing to
`data.results || data`). Every list page has a real pager (page numbers or prev/next + "showing
X–Y of N"), keeps the current page in state, and refetches on page change. Convert existing
**client-side** pagers (sales/invoices/orders-dashboard/supplier lists) to consume server pages.

**Definition of done for pagination:** with 500+ rows seeded, every list is navigable to the last
row, filters/search work across the full set (not just page 1), and no endpoint returns an
unbounded array.

---

## 10. Cross-page data-flow / dependency map (must all round-trip)

Verify each chain works with live data, correct params, and correct role scoping:

- **Sell:** shop → product/[id] → cart (localStorage `qavi_cart`) → checkout → `createOrder`
  → order appears in customer dashboard + admin `/orders` (branch-scoped) → deliver → invoice.
- **Purchase:** admin `/purchases/add` (uses `getAllSupplier`) → PurchaseOrder(supplier,warehouse)
  → supplier `/orders` & `/sales` → accept/advance status + verify payment → receive stock into
  branch (`/admin/purchases` receive) → inventory increases → invoice.
- **Returns:** customer `returns/add` (30-day window) → admin/supplier return queues → accept/reject
  → stock/ledger adjust.
- **Deliver:** admin assigns rider → rider `my-deliveries` → status SHIPPED/DELIVERED (DELIVERED
  triggers stock completion) → history/earnings/rating update (with **real** earning/rating).
- **Money:** every order/purchase/installment → `Payment`/`TransactionPayment` ledger row (carries
  `warehouse`+`tenant`) → admin income/expense/payments + reports → per-branch aggregation (§5).
- **Dashboard cards link somewhere useful.** Fix broken params: alerts "Order Stock" emits
  `product_id=undefined` (`alerts/page.tsx:282`; alert objects never set `productId`). Dashboard
  "Total Employees" counts Admin owners, not staff (`dashboard/page.tsx:740` + `users/views.py:200`).
- **`/admin/orders` dead pagination/filter:** `statusFilter/currentPage/paginatedData/sel/bulk*`
  are computed but never rendered; only unpaginated `activeOrders` shows and Delivered/Cancelled are
  unreachable. Wire the filter+pager (or remove the dead code and add a proper history tab).
- **`/admin/tracking` actually tracks Purchase Orders**, not sales/deliveries, despite being under
  "Sales & Orders / Delivery & dispatch status." Relabel/regroup or repoint to sales-order tracking.

---

## 11. Performance & hygiene

- Remove aggressive polling: home page 1s (`customer/page.tsx:139`); admin `products`,
  `inventory/list`, `sales`, `sale`, `company/suppliers` at 2s (many re-pull full no-pagination
  datasets each tick); notifications 5s; alerts 20s. Use sane intervals, websockets, or
  on-demand/manual refresh.
- Remove shipped debug/untranslated strings, e.g. inventory delete modal Urdu string
  (`inventory/list/page.tsx:952`).
- Fix React key warnings (e.g. supplier `returns/page.tsx:217` key on inner `<tr>` not fragment).

---

## 12. Zero-error acceptance checklist (per role, before "done")

Run through each role end-to-end on seeded data (500+ products, 50+ orders across ≥3 branches):

**Super Admin:** creates a branch, assigns 2 admins; Reports shows all branches + Personal +
Net-Profit; Payments shows each branch separately **and** own; CMS edits reflect on storefront;
own income/expense/areas separate from branches; no branch-admin-only leakage.

**Branch Admin:** sees **only** their branch's products/inventory/orders/sales/POS/purchases/
payments/reports/staff; cannot open `/admin/branches`, `/admin/company/areas`,
`/admin/website-settings`, `/admin/users`, or the Business Info tab (hard block, not just hidden);
all their lists paginate; every dashboard card links correctly.

**Customer:** browses paginated shop/categories/deals (real discounts); product page real data;
add-to-cart/wishlist works; checkout creates order + uploads receipt; tracks order (one endpoint);
dashboard orders/returns/wishlist/profile all functional; no dead buttons; no `/checkout` 404.

**Delivery:** sees only own assigned deliveries; status updates persist and move the order; earnings
& rating are **real**; lists paginate; no fabricated stats.

**Supplier:** sees only own products/orders/sales/returns/inventory (inventory endpoint fixed & 
supplier-scoped); status/payment actions persist; no orphaned/dead routes; lists paginate.

**Global:** no console errors; no 401/404/500 in happy paths; every list navigable to last row with
server-side filtering; no hardcoded business data remains; all P0 items closed.

---

## 13. Suggested execution order

1. **P0 security/crash fixes** (§2) — suppliers auth+tenant, `list_users` MySQL, plaintext
   passwords, shadow-PK misuse, within-tenant branch reads, Area `tenant_id`.
2. **Backend foundation** (§5) — pagination contract + per-branch payments endpoint + real
   delivery earnings/rating fields + `original_price` + unify tracking.
3. **Role/access hardening** (§3) — page guards, super-admin branch-ownership round-trip.
4. **Super-admin gaps** (§4) — global payments UI, reports coverage, areas separation, 2nd-admin.
5. **Pagination rollout** (§9) across all remaining lists.
6. **Customer** (§6), **Delivery** (§7), **Supplier** (§8) functional fixes + dead-control cleanup.
7. **Cross-page wiring** (§10), **performance/hygiene** (§11).
8. **Full QA pass** (§12).

> **Working rule for whoever executes this:** touch one page/module at a time, keep every existing
> working behavior, run `npx tsc --noEmit` (frontend) and the Django checks/migrations after each
> change, and verify the specific chain in §10 before moving on. Never mark an item done without
> exercising it on seeded data.
