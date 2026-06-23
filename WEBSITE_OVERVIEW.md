# Al-Qavi Traders — System Overview

A complete **cosmetics distribution & e-commerce management system** for Al-Qavi Traders
(Al-Qavi Hub), a premium cosmetics and skincare distributor serving Gilgit-Baltistan and
the rest of Pakistan. The platform combines an online storefront, an admin/back-office
management system, and a supplier portal into one application.

---

## 1. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (React 18, TypeScript, Turbopack), Tailwind CSS, Zustand, Framer Motion, Recharts |
| Backend | Django 4.2 (Python), Django REST Framework |
| Database | MySQL 8 (production) / SQLite (local development) |
| Cache / Queue | Redis 7 (+ Celery for background tasks) |
| Web server | Nginx (reverse proxy, HTTPS via Certbot/Let's Encrypt) |
| Deployment | Docker Compose on a Linux VPS |

The frontend talks to the backend through a REST API mounted under `/api/v1/...`. The public
site is live at **https://alqavitraders.com/**.

**API surface (top-level routes):**

| Prefix | Module |
|--------|--------|
| `/api/v1/users/` | Authentication, users, roles, permissions, activity logs |
| `/api/v1/products/` | Products, categories, sections, supplier products, wishlist |
| `/api/v1/sales/` | Orders, purchase orders, sale/purchase returns |
| `/api/v1/inventory/` | Warehouses, stock, stock movements |
| `/api/v1/payments/` | Income/expense ledger, payment categories |
| `/api/v1/company/` | Company settings + supplier endpoints |
| `/api/v1/company/customers/` | Customer registry |
| `/api/v1/cms/` | Site settings, sections, navigation, media |

---

## 2. Three Portals (User Roles)

The system serves three distinct types of users, each with its own area and its own
authentication/registration flow:

1. **Customer Storefront** — the public shop where customers browse and buy.
2. **Admin / Back-office** — staff manage the entire business (Super Admin + staff roles).
3. **Supplier Portal** — suppliers manage their catalog, orders, payments, and returns.

A deliberate design choice in this system is **strict data isolation between roles**:
Customers, Suppliers, and internal Users (admin/staff) are stored in **three separate
database tables**, each with its own login credentials. This keeps customer data, supplier
data, and staff data completely separated rather than sharing one account table.

---

# Part A — Backend Modules (Detailed)

The backend is a Django project split into self-contained apps under `backend/modules/`.
Each module owns its own models, serializers, views, services, and URL routes. Below is a
detailed description of every module.

---

## 3. `users` — Identity, Roles & Permissions

This is the back-office identity module. It governs who staff members are and what they are
allowed to do.

**Key models:**

- **`User`** — a custom user model (extends Django's `AbstractUser`). In addition to the
  standard username/email/password, it stores `phone`, `address`, `city`, `country`,
  `postal_code`, an `avatar` image, `last_login_ip` / `last_login_at` for security auditing,
  a link to a `Role`, and a `page_permissions` JSON list for fine-grained, per-page access
  control. It exposes helpers like `get_permissions()` and `has_permission(code)`.
- **`Role`** — a named job role (e.g. Super Admin, Manager, Cashier) carrying a set of
  permissions. Roles can be flagged `is_default` for system roles.
- **`Permission`** — an individual capability with a unique `code` and a `category`
  (users / products / orders / inventory / settings / roles). Permissions are the atomic
  units that get grouped into roles.
- **`RolePermission`** — the through-table linking roles to permissions (many-to-many).
- **`UserActivityLog`** — an audit trail. Every important action (login, logout, create,
  update, delete, password change/reset, role assignment, status change, export) is logged
  with the user, IP address, user agent, timestamp, and a read/unread flag. This powers the
  admin **Activity Logs** screen and notification badges.
- **`UserSettings`** — one-to-one per-user preferences: notification toggles (new order,
  low stock, new user, weekly report, marketing, SMS) and appearance settings (theme,
  accent color, compact mode, animations, sidebar collapsed state).

**Responsibilities:** staff login/authentication, role-based access control (RBAC),
per-page permission gating, profile management, and the security/audit log.

---

## 4. `customer` — Storefront Accounts

A deliberately standalone module (its own table, not tied to the staff `User` model) so that
customer data stays isolated.

**Key model:**

- **`Customer`** — username, email, hashed `password`, name fields, full contact/shipping
  details (phone, address, city, country, postal code), an `avatar`, an `is_active` flag,
  `status`, and `last_login`. A `name` property returns the full name (or falls back to the
  username). The `plain_password` field exists to let admins view/reset credentials when
  assisting customers.

**Responsibilities:** customer registration and login, profile, and shipping address storage
for checkout. Orders reference this model so a customer can see their order history.

---

## 5. `supplier` — Supplier Accounts

Like customers, suppliers are a standalone, self-authenticating entity with their own table.

**Key model:**

- **`Supplier`** — full auth fields (username, password, email) plus rich business profile:
  business `name`, legal `company` name, `contact_person`, `phone`, full address, `avatar`,
  `status` / `is_active`, and `last_login`. The `plain_password` field allows admin-assisted
  credential management.

**Responsibilities:** supplier onboarding, login to the Supplier Portal, and acting as the
"owner" record that purchase orders, supplier products, stock entries, and purchase returns
point back to.

---

## 6. `products` — Catalog & Pricing

The heart of the storefront catalog and the internal pricing engine. This module models a
two-level category tree, the saleable products, and the supplier-side catalog.

**Key models:**

- **`MainCategory`** (labelled "Section" in the admin) — the broad classification and also a
  storefront merchandising block. It has a name, slug (auto-generated), description, display
  `position`, an `is_visible` toggle, and a many-to-many `products` list — so a Section can
  curate a hand-picked set of products for a homepage slider/grid.
- **`Category`** — a product category (e.g. Lipstick, Serum) belonging to a `MainCategory`.
  It can be linked to a `NavbarPage` (from the CMS) so categories surface in the top
  navigation. Has name, slug, description, and active/inactive status.
- **`Product`** — the **saleable item** customers actually buy. It is the most important
  model in the system and carries:
  - **Identity & classification:** `product_name`, `category`, `supplier`, `warehouse`,
    `sku`, `barcode`, `batch`, `badge` (e.g. "New", "Sale"), plus cosmetics attributes
    `weight` and `size`.
  - **Pricing:** `cost_price` (internal), `selling_price` (public). Profit is derived from
    these (see Pricing & Profit Engine below).
  - **Stock:** linked to an inventory `Stock` record; tracks `total_quantity` (physical),
    `reserved_quantity` (ordered but not yet delivered), and `min_count` (the low-stock
    alert threshold). An `available_quantity` property returns `total − reserved` (never
    below zero) — this is the figure shown to customers.
  - **Media:** a primary `image`, with extra gallery images via `ProductImage`.
  - **Smart `save()` logic:** when a product is saved it auto-fills missing fields from its
    linked `Stock` (and the supplier product behind it) — name, category, supplier,
    warehouse, cost price, SKU, barcode, description, weight, size — and **aggregates total
    quantity across all warehouses/batches** that share the same identity, so the catalog
    shows a single consolidated stock figure. Deleting a product also removes its underlying
    stock record.
- **`SupplierProduct`** — the catalog a **supplier** maintains (separate from the saleable
  `Product`). Holds name, SKU/barcode, category, image, description, multiple price tiers
  (`price`, `cost_price`, `retail_price`), quantity, batch number, weight/size, and an
  `is_approved` flag so admins can approve supplier-submitted items before they enter
  purchasing.
- **`ProductImage`** — additional gallery images attached to a product.
- **`Wishlist`** — links a `Customer` to a `Product` they've saved (unique per
  customer+product).

**Responsibilities:** the public catalog, category/section merchandising, the supplier-side
product list, wishlists, and being the anchor for pricing and stock.

---

## 7. `inventory` — Warehouses & Stock

Tracks physical goods, where they are stored, and every movement in and out.

**Key models:**

- **`Warehouse`** — a storage location (name + location). Stock and products are assigned to
  warehouses, enabling multi-location inventory.
- **`Stock`** — a stock-entry record created when goods arrive. It records the product (by
  name and an optional link to a `SupplierProduct`), category, supplier, warehouse, and the
  `purchase_type` (carton vs single). Quantitative fields capture `cartons`,
  `items_per_carton`, and the resulting `total_quantity`; financial fields capture
  `price_per_carton` and `price_per_item` (the cost basis). Also stores weight/size and the
  entry date.
- **`StockMovement`** — an immutable log of every change to stock, typed as PURCHASE,
  TRANSFER_IN, TRANSFER_OUT, SALE, RETURN, or ADJUSTMENT. For transfers it records the
  source and destination warehouse. This gives a full, auditable history of how stock levels
  reached their current state.

**Responsibilities:** "Current Stocks" levels, warehouse management, stock transfers, and the
movement ledger that ties purchases, sales, and returns to physical inventory changes.

---

## 8. `sales` — Orders, Purchasing & Returns

The largest module. It covers the full money-and-goods flow in both directions: **customer
orders** (goods going out) and **purchase orders** (goods coming in), plus returns on both
sides.

**Key models:**

- **`Order`** — a customer order, keyed by a UUID with a human-friendly, auto-incrementing
  numeric `tracking_id` (starting at 10001, with collision-safe fallback). It links to a
  `Customer` (and/or a staff `User` for POS sales), and stores `status` (PENDING → CONFIRMED
  → PROCESSING → SHIPPED → DELIVERED, plus CANCELLED/REJECTED/CANCEL_REQUESTED),
  `payment_method` (COD / ONLINE / SHOP), `total_amount`, full shipping details
  (address, phone, customer name, notes), timestamps including `delivered_at`, and a
  `is_reserved` flag. It also has built-in **WhatsApp integration** fields (number, sent
  flag, send status, sent-at) for order notifications.
- **`OrderItem`** — a line item on an order. Critically, it **snapshots** both the
  `price` (selling price) and the `cost_price` at the time of sale, so historical profit is
  preserved even if the product's price later changes. A `profit` property computes
  `(price − cost_price) × quantity`.
- **`CustomerBoughtProduct`** — a denormalized "what this customer purchased" record used for
  customer purchase history and analytics, independent of order edits.
- **`PurchaseOrder`** — a restock order placed on a supplier. Auto-numbered (starting at
  50001). Tracks the supplier, warehouse, reference number, financials (`total_amount`,
  `shipping_cost`, `tax_amount`), `status` (PENDING → PROCESSING → SHIPPED/In Transit →
  DELIVERED → RECEIVED, or CANCELLED), and an `is_inventory_synced` guard so stock is only
  added once. It carries a full **payment sub-ledger**: `payment_status`
  (UNPAID/PARTIAL/PAID), `payment_method`, `paid_amount`, payment date/notes, an uploaded
  `payment_slip`, `transaction_id`, and a `payment_confirmed` flag. A `remaining_amount`
  property returns the outstanding balance.
- **`PurchaseOrderItem`** — a line on a purchase order. Supports **carton vs single**
  packaging: if `packaging_type` is CARTON, `total_units` = `quantity × items_per_carton`.
  Stores the supplier `price` (cost) and a planned `selling_price`, plus weight/size.
- **`PurchaseReturn`** / **`PurchaseReturnItem`** — returning goods *to a supplier*.
  Auto-numbered (`PR-70001`), with a supplier-response workflow
  (WAITING_FOR_SUPPLIER → ACCEPTED/REJECTED/CANCELLED), reason, return date, refund total,
  and per-item refund prices.
- **`SaleReturn`** / **`SaleReturnItem`** — a *customer* returning goods. Auto-numbered
  (`SR-80001`), linked to the original order and the returning customer/user, with an
  approval workflow (PENDING → ACCEPTED/REJECTED), reason/notes, and per-item quantities and
  snapshotted prices.

The module also has **`signals.py`** and **`services.py`**, which wire these events into the
rest of the system — e.g. decrementing stock on a sale, increasing stock when a purchase order
is marked RECEIVED, and creating ledger entries in the `payments` module.

**Responsibilities:** online + POS sales, the full purchasing pipeline, and returns in both
directions.

---

## 9. `payments` — Income / Expense Ledger

A unified financial ledger that records all money-in and money-out for the business.

**Key models:**

- **`PaymentCategory`** — buckets for grouping money (e.g. Sales, Rent, Salary), typed as
  `inbound` (income), `outbound` (expense), or `both`.
- **`Payment`** — a single ledger entry: `amount`, `payment_type` (inbound/outbound),
  `method` (cash / bank transfer / check / digital wallet / other), category, reference
  number, payer/payee, description, date, and the staff user who recorded it. Crucially, it
  supports **automatic entries**: a `source` (manual / sale / purchase / sale_return /
  purchase_return) together with `source_type` + `source_id` and an `is_auto` flag. This lets
  the system auto-post a ledger line whenever a sale, purchase payment, or return happens —
  and reverse it if the underlying record is cancelled — using a
  `update_or_create(source, source_type, source_id)` service to keep auto entries unique.

**Responsibilities:** the admin **Income** and **Expense** pages, the manual "Add Payment"
form, and the automatic accounting feed from sales/purchases/returns.

---

## 10. `cms` — Website Content Management

Lets admins control the public storefront's content and branding without code changes.

**Key models:**

- **`SiteSettings`** — a global singleton of branding and configuration: site name, logos
  (header/footer/favicon), brand colors, a configurable **announcement bar** (text, link,
  colors, scroll/marquee behaviour, duration), contact & business info (WhatsApp, phone,
  email, address, Google Maps URL), social links (Instagram, Facebook, TikTok, YouTube), SEO
  fields (meta title/description/keywords, OG image), and analytics IDs (Google Analytics,
  Pixel).
- **`WebsiteSection`** — dynamic, reorderable landing-page blocks. Each has a `section_type`
  chosen from a rich set — hero slider, product grid, category showcase, about/text,
  testimonials, FAQ, newsletter, gallery, video, promotion, brands slider, stats, features,
  steps, spotlight, marquee, split banner, contact, map, parallax, or custom HTML — plus a
  JSON `content` blob holding that block's settings/text/media, an `order`, and a visibility
  toggle. This is what powers the **Landing Manager / Website CMS**.
- **`MediaAsset`** — a central media library of uploaded images/videos with alt text.
- **`NavigationMenu`** / **`NavigationItem`** — header and footer menu management, with
  nested (parent/child) menu items ordered for display, placed in locations like header main
  menu, footer quick links, or footer customer care.
- **`NavbarPage`** — top-navbar groupings (e.g. "Skincare", "About") with a slug, link,
  icon, order, and visibility. Categories attach to these to appear in the navbar.

**Responsibilities:** storefront branding/theme, the announcement bar, the modular landing
page, navigation menus, SEO, and the media library.

---

## 11. `company` — Company Settings

Currently a lightweight module. Its models have been cleared back to essentials, and its URL
prefix (`/api/v1/company/`) is shared with the supplier endpoints. It is reserved for
company-level configuration/categories.

---

## 12. `core` — Shared Foundation

Not a feature module, but the shared base every app builds on:

- **`models.py`** — `BaseModel` providing common fields (timestamps, IDs) inherited by most
  models.
- **`mixins.py`** — reusable mixins such as `StatusMixin`.
- **`permissions.py`** — DRF permission classes for API access control.
- **`middleware.py`** — custom request/response middleware (auth context, logging).
- **`validators.py`**, **`exceptions.py`**, **`constants.py`**, **`utils.py`** — shared
  validation rules, custom error types, constants, and helper functions.

---

# Part B — Frontend Application (Detailed)

The frontend is a Next.js App Router project under `frontend/src/`. Routes are grouped by
portal: `app/customer/...`, `app/admin/...`, `app/supplier/...`, plus public pages and an
`app/(auth)` group for login/registration.

Shared infrastructure: typed API clients live in `src/services/` (one per domain —
`product`, `order`, `purchase`, `sales`, `inventory`, `payment`, `supplier`, `cms`,
`category`, `section`, `user`, `company`, `dashboard`, `supplierProduct`). Client-side cart
and wishlist state are React Contexts (`CartContext`, `WishlistContext`). Admin behaviour is
encapsulated in hooks (`useAdminAuth`, `useAdminDashboard`, `useAdminFilter`,
`useAdminSearch`, `useAdminNotifications`).

---

## 13. Customer Storefront (`app/customer/` + public pages)

What customers can do on the website:

- **Browse & shop** by category and curated sections (Skincare, Makeup, Cosmetics, Haircare,
  Perfume, Deals), via `shop/` and `product/` pages.
- **Product detail pages** with an image gallery, pricing (selling price + crossed-out
  compare price), volume/weight, skin type, key ingredients, and shade/color.
- **Cart & checkout** (`cart/`, `checkout/`) — add to cart, place orders; cart state is held
  in `CartContext`. Orders can be confirmed via WhatsApp.
- **Customer dashboard** (`dashboard/`) — view orders, download invoices (`invoice/`), track
  shipments (`tracking/`), manage profile, request returns, and keep a wishlist
  (`wishlist/`, backed by `WishlistContext`).
- **Order tracking** (`tracking/`, plus the public `track-order/` page) — follow
  delivery/dispatch status by tracking ID.
- **Informational & policy pages** — About, Contact, Blog, Careers, FAQ, Gift Cards, Sitemap,
  and policies (Privacy, Cookies, Terms, Returns, Shipping Policy).

**Important pricing rule:** customers only ever see the *selling price* and *compare price*.
Internal numbers (cost price, profit amount, profit margin) are never exposed on
customer-facing pages or APIs.

---

## 14. Admin / Back-office (`app/admin/`)

The admin dashboard is the control center for the whole business. Areas (mapped to route
folders):

### Core Operations
- **Point of Sale (`sale/`)** — sell at the counter.
- **New Purchase Order (`purchases/`)** — restock inventory from suppliers.
- **Invoices (`invoices/`)** — billing & receipts.
- **Income (`income/`) / Expense (`expense/`)** — money-in and money-out, backed by the
  `payments` ledger; a combined `payments/` view shows the full ledger.

### Sales & Orders
- **Sales History (`sales/`)** & recent activity.
- **Order List (`orders/`)** — manage online orders, with pending-order alerts.
- **Order Tracking (`tracking/`)** — delivery & dispatch status.
- **Sale Returns (`sale-returns/`)** — customer returns & refunds.

### Products & Inventory
- **Products (`products/`)** — list / add / edit catalog and SKUs with full cosmetics fields
  (brand, volume/weight, skin type, key ingredients, expiry, country of origin, shade), plus
  product categories and sections.
- **Supplier Products (`supplier-products/`)** — review/approve the supplier-side catalog.
- **Inventory (`inventory/`)** — current stock levels and warehouses, with a **Low Stock
  Alert** panel on the dashboard (each product compared against its own `min_count`; clicking
  re-orders from the last supplier).

### Purchases & Suppliers
- **Purchases (`purchases/`)** — purchase history and per-supplier detail.
- **Suppliers** — supplier registry and supplier catalog.
- **Purchase Returns** — return goods to suppliers.

### People & Security
- **Users (`users/`)** — internal users, staff roles, granular permissions, and the customer
  registry.
- **Activity Logs / Notifications (`notifications/`, `alerts/`)** — auditing and system
  alerts.

### Reports & Content
- **Reports (`reports/`)** — Accounting & Finance, Sales, Purchases, Inventory, Customer, and
  Returns reports, plus a consolidated Data Hub.
- **Website CMS (`landing-manager/`, `website-settings/`)** — hero banners, sliders,
  sections, navigation menus, site settings, and media.
- **Settings (`settings/`)** — system and per-user settings (theme, accent, notifications).
- **Company (`company/`)** — company-level configuration.

---

## 15. Supplier Portal (`app/supplier/`)

Suppliers get a self-service area to:

- View a **dashboard** (`dashboard/`) of their activity.
- Manage their **product catalog** (`products/`) — add/edit supplier products.
- See **orders** (`orders/`), **sales** (`sales/`), and **inventory** (`inventory/`) related
  to them.
- Track **payments** (`payments/`, with downloadable invoices) and **returns** (`returns/`).
- View their **activity** (`activity/`), manage their **profile** (`profile/`), and contact
  **support** (`support/`).

---

# Part C — Cross-cutting Systems

## 16. Pricing & Profit Engine

A key feature of the system is automatic profit tracking:

- Each product stores **cost price**, **selling price**, and an optional **compare price**.
- **Profit amount** and **profit margin %** are calculated automatically and shown
  (color-coded: green ≥ 40%, amber 20–39%, red < 20%) — **admin only**.
- Order items **snapshot** both selling price and cost price at the moment of sale, so
  historical profit stays accurate even if prices change later.
- When a Purchase Order is marked **RECEIVED**, stock increases automatically (guarded by
  `is_inventory_synced` so it only happens once) and the product's cost price updates from
  the supplier's invoice, with cost-history tracking.
- Supplier outstanding balances and payment status (UNPAID / PARTIAL / PAID) are tracked on
  each purchase order, with a `remaining_amount` calculation.

## 17. Reserved vs Available Stock

Products distinguish `total_quantity` (physical) from `reserved_quantity` (ordered but not
yet delivered). The `available_quantity` shown to customers is `total − reserved`, never
below zero — preventing overselling while an order is in flight.

## 18. Automatic Accounting Feed

The `sales` module's signals/services post entries into the `payments` ledger automatically:
a confirmed sale creates an inbound entry, a purchase payment creates an outbound entry, and
returns reverse the relevant entries — each tagged with `source`/`source_id` so they're
unique and reversible.

---

# Part D — Operations

## 19. Deployment

- The app is containerized with **Docker Compose**. Services: `db` (MySQL), `backend`
  (Django), `redis`, `frontend-builder` (builds the Next.js bundle), `frontend` (Node
  server), `nginx` (reverse proxy + HTTPS), and `certbot` (SSL certificates).
- Deployment is done with `deploy.ps1`, which packages the project, uploads it to the
  production server, rebuilds the containers, runs database migrations, and restarts services.
- Static assets and media are served by Nginx; customer/storefront image assets live in the
  frontend's `public/` folder, while uploaded content (product images, CMS media, avatars)
  is stored in the backend's `media/` folder.
- Django settings are split per environment (`config/settings/base.py`, `development.py`,
  `production.py`, `testing.py`). Background work runs via Celery against Redis.

## 20. Local Development

- **Backend:** `cd backend && ./venv/Scripts/python.exe manage.py runserver`
  → http://127.0.0.1:8000
- **Frontend:** `cd frontend && npm run dev` → http://localhost:3000
- Local data uses `backend/db.sqlite3` (separate from production MySQL).

---

## 21. Backend Data Modules — Quick Reference

| Module | Responsibility (key models) |
|--------|------------------------------|
| `products` | MainCategory (Section), Category, Product, SupplierProduct, ProductImage, Wishlist |
| `sales` | Order, OrderItem, CustomerBoughtProduct, PurchaseOrder(+Item), PurchaseReturn(+Item), SaleReturn(+Item) |
| `inventory` | Warehouse, Stock, StockMovement |
| `supplier` | Supplier |
| `customer` | Customer |
| `payments` | Payment, PaymentCategory (income/expense ledger) |
| `users` | User, Role, Permission, RolePermission, UserActivityLog, UserSettings |
| `cms` | SiteSettings, WebsiteSection, MediaAsset, NavigationMenu/Item, NavbarPage |
| `company` | Company-level settings (minimal) |
| `core` | Shared BaseModel, mixins, permissions, middleware, validators |

---

*This document is a detailed overview of what the Al-Qavi Traders system does, module by
module. It reflects the current structure of the codebase (admin back-office, customer
storefront, and supplier portal) and is intended as a reference for the whole system.*
