/**
 * Flat directory of every admin console page — used by the global navbar search
 * so users can jump to any page from the top search field.
 */

export interface AdminPage {
    name: string;
    href: string;
    keywords?: string[];
}

/**
 * Operational "floor" pages a Super Admin never works in day-to-day (they oversee
 * branches; branch admins run the counter). These are hidden from the Super Admin's
 * sidebar and dashboard directory. Branch admins still see them normally.
 * Add/remove a single href here to change what's hidden.
 */
export const SUPER_ADMIN_HIDDEN_HREFS: string[] = [
    '/admin/sale',              // Point of Sale (POS)
    '/admin/sale-returns',      // Sale Returns
    '/admin/purchases/add',     // New Purchase Order
    '/admin/purchases/returns', // Purchase Returns
    '/admin/tracking',          // Order Tracking
    '/admin/delivery',          // Delivery Persons
    '/admin/system-users',      // System Users (branch-admin-only)
    '/admin/sales',             // Sales History
    '/admin/orders',            // Order List
    '/admin/purchases',         // Purchase History
    '/admin/products',          // Product List
    '/admin/products/add',      // Add Listing
    '/admin/inventory/list',    // Current Stocks
    '/admin/inventory/warehouses', // Warehouses
    '/admin/company/companies', // Companies
    '/admin/users/roles',       // Staff Roles
    // Finance is a branch-admin concern — hidden from the Super Admin side.
    '/admin/payments',          // Global Payments
    '/admin/income',            // Income
    '/admin/expense',           // Expense
    '/admin/reports',           // Reports Center
    '/admin/company/customers', // Customer Registry
    '/admin/company/suppliers', // Supplier Registry
    '/admin/alerts',            // System Alerts
];

/**
 * Pages only the Super Admin may see — hidden from a branch admin's sidebar,
 * dashboard, AND the Sidebar-Pages settings panel (a branch admin can't toggle
 * what they're not allowed to see).
 */
export const SUPER_ONLY_HREFS: string[] = [
    '/admin/branches',                // Branches
    '/admin/users',                   // Admins
    '/admin/website-settings',        // Website CMS
    '/admin/company/areas',           // Areas / Territories
    '/admin/income',                  // Income — branch admins use the unified Global Payments page
    '/admin/expense',                 // Expense — branch admins use the unified Global Payments page
];

/**
 * Every admin page, grouped — the single source of truth for the sidebar-visibility
 * panel (System Settings → Sidebar Pages). Toggling a page off there hides it from
 * the sidebar AND the dashboard directory (both read `sidebar_visibility`).
 */
export const ADMIN_PAGE_GROUPS: { group: string; items: { n: string; h: string }[] }[] = [
    {
        group: 'Main',
        items: [
            { n: 'Dashboard', h: '/admin/dashboard' },
            { n: 'Point of Sale (POS)', h: '/admin/sale' },
            { n: 'Sales History', h: '/admin/sales' },
            { n: 'Sale Returns', h: '/admin/sale-returns' },
            { n: 'Recent Orders', h: '/admin/orders' },
            { n: 'Order Tracking', h: '/admin/tracking' },
            { n: 'Delivery Persons', h: '/admin/delivery' },
        ],
    },
    {
        group: 'Inventory & Stock',
        items: [
            { n: 'Live Products', h: '/admin/products' },
            { n: 'Add Listing', h: '/admin/products/add' },
            { n: 'Current Stocks', h: '/admin/inventory/list' },
        ],
    },
    {
        group: 'Procurement',
        items: [
            { n: 'New Purchase Order', h: '/admin/purchases/add' },
            { n: 'Purchase History', h: '/admin/purchases' },
            { n: 'Purchase Returns', h: '/admin/purchases/returns' },
            { n: 'Supplier Registry', h: '/admin/company/suppliers' },
        ],
    },
    {
        group: 'Customers & Company',
        items: [
            { n: 'Customer Registry', h: '/admin/company/customers' },
            { n: 'Areas / Territories', h: '/admin/company/areas' },
        ],
    },
    {
        group: 'Finance',
        items: [
            { n: 'Income', h: '/admin/income' },
            { n: 'Expense', h: '/admin/expense' },
            { n: 'Global Payments', h: '/admin/payments' },
        ],
    },
    {
        group: 'Reports',
        items: [
            { n: 'Reports Center', h: '/admin/reports' },
        ],
    },
    {
        group: 'Administration',
        items: [
            { n: 'Branches', h: '/admin/branches' },
            { n: 'Admins', h: '/admin/users' },
            { n: 'Staff Roles', h: '/admin/users/roles' },
        ],
    },
    {
        group: 'System & CMS',
        items: [
            { n: 'Website CMS', h: '/admin/website-settings' },
            { n: 'System Settings', h: '/admin/settings' },
            { n: 'System Alerts', h: '/admin/alerts' },
            { n: 'Notifications', h: '/admin/notifications' },
        ],
    },
];

export const ADMIN_PAGES: AdminPage[] = [
    // ── Core operations ──
    { name: 'Point of Sale (POS)', href: '/admin/sale', keywords: ['counter', 'cashier', 'barcode', 'checkout', 'pos', 'sales'] },
    { name: 'New Purchase Order', href: '/admin/purchases/add', keywords: ['draft', 'buy', 'stock order', 'procurement', 'purchase'] },
    { name: 'Reports Center', href: '/admin/reports', keywords: ['hub', 'audits', 'graphs', 'reports'] },
    { name: 'Income', href: '/admin/income', keywords: ['income', 'money in', 'revenue', 'earnings', 'sales income', 'inbound'] },
    { name: 'Expense', href: '/admin/expense', keywords: ['expense', 'money out', 'spending', 'costs', 'outbound', 'payments out'] },
    { name: 'Recent Orders', href: '/admin/orders', keywords: ['orders', 'shipping', 'list', 'recent', 'active'] },
    { name: 'Live Products', href: '/admin/products', keywords: ['items', 'catalog', 'skus', 'edit', 'products', 'live products'] },
    { name: 'Add Listing', href: '/admin/products/add', keywords: ['create', 'new item', 'upload', 'add product', 'add listing'] },
    { name: 'Current Stocks', href: '/admin/inventory/list', keywords: ['volumes', 'quantities', 'adjustments', 'stock', 'inventory'] },
    { name: 'Branches', href: '/admin/branches', keywords: ['branch', 'branches', 'city', 'assign', 'warehouse admin', 'multi branch', 'who manages'] },
    { name: 'Order Tracking', href: '/admin/tracking', keywords: ['delivery', 'courier', 'dispatch', 'tracking'] },
    { name: 'Supplier Registry', href: '/admin/company/suppliers', keywords: ['vendors', 'manufacturers', 'contacts', 'supplier'] },
    { name: 'Customer Registry', href: '/admin/company/customers', keywords: ['clients', 'profiles', 'ledger', 'customer'] },
    { name: 'Delivery Persons', href: '/admin/delivery', keywords: ['rider', 'riders', 'courier', 'dispatch', 'delivery boy', 'delivery person', 'driver'] },
    { name: 'System Alerts', href: '/admin/alerts', keywords: ['errors', 'warnings', 'alarms', 'alerts'] },
    { name: 'Website CMS', href: '/admin/website-settings', keywords: ['slider', 'banners', 'content', 'seo', 'footer', 'cms', 'website', 'storefront', 'landing'] },
    { name: 'System Settings', href: '/admin/settings', keywords: ['config', 'sidebar', 'site details', 'settings', 'configure'] },

    // ── Other pages ──
    { name: 'Sales History', href: '/admin/sales', keywords: ['sales list', 'transactions', 'revenue ledger'] },
    { name: 'Sale Returns', href: '/admin/sale-returns', keywords: ['returns', 'refunds', 'customer returns'] },
    { name: 'Purchase History', href: '/admin/purchases', keywords: ['expenses', 'vendor orders', 'invoices'] },
    { name: 'Purchase Returns', href: '/admin/purchases/returns', keywords: ['refunds', 'damaged', 'shipback'] },
    { name: 'Admins', href: '/admin/users', keywords: ['staff', 'logins', 'accounts'] },
    { name: 'Staff Roles', href: '/admin/users/roles', keywords: ['groups', 'privileges', 'ranks'] },
    { name: 'Global Payments', href: '/admin/payments', keywords: ['payment methods', 'stripe', 'paypal', 'banks'] },
];
