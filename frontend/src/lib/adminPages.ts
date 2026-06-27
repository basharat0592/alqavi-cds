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
            { n: 'Invoices', h: '/admin/invoices' },
            { n: 'Sale Returns', h: '/admin/sale-returns' },
            { n: 'Order List', h: '/admin/orders' },
            { n: 'Order Tracking', h: '/admin/tracking' },
            { n: 'Delivery Persons', h: '/admin/delivery' },
            { n: 'Recent Activity', h: '/admin/sales/recent' },
        ],
    },
    {
        group: 'Inventory & Stock',
        items: [
            { n: 'Product List', h: '/admin/products' },
            { n: 'Add Product', h: '/admin/products/add' },
            { n: 'Product Categories', h: '/admin/products/categories' },
            { n: 'Product Sections', h: '/admin/products/sections' },
            { n: 'Current Stocks', h: '/admin/inventory/list' },
            { n: 'Warehouses', h: '/admin/inventory/warehouses' },
        ],
    },
    {
        group: 'Procurement',
        items: [
            { n: 'New Purchase Order', h: '/admin/purchases/add' },
            { n: 'Purchase History', h: '/admin/purchases' },
            { n: 'Purchase Returns', h: '/admin/purchases/returns' },
            { n: 'Supplier Registry', h: '/admin/company/suppliers' },
            { n: 'Supplier Catalog', h: '/admin/supplier-products' },
        ],
    },
    {
        group: 'Customers & Company',
        items: [
            { n: 'Customer Registry', h: '/admin/company/customers' },
            { n: 'Company Categories', h: '/admin/company/categories' },
            { n: 'Areas / Territories', h: '/admin/company/areas' },
        ],
    },
    {
        group: 'Finance',
        items: [
            { n: 'Income', h: '/admin/income' },
            { n: 'Expense', h: '/admin/expense' },
            { n: 'Global Payments', h: '/admin/payments' },
            { n: 'Receivables', h: '/admin/reports/receivables' },
            { n: 'Payables', h: '/admin/reports/payables' },
        ],
    },
    {
        group: 'Reports',
        items: [
            { n: 'Reports Center', h: '/admin/reports' },
            { n: 'Accounting & Finance', h: '/admin/reports/accounting' },
            { n: 'Sales Reports', h: '/admin/reports/sales' },
            { n: 'Purchase Reports', h: '/admin/reports/purchases' },
            { n: 'Inventory Reports', h: '/admin/reports/inventory' },
            { n: 'Customer Reports', h: '/admin/reports/customers' },
            { n: 'Returns Reports', h: '/admin/reports/sales-returns' },
            { n: 'Area-wise Report', h: '/admin/reports/by-area' },
            { n: 'My Performance', h: '/admin/reports/by-user' },
            { n: 'Data Hub', h: '/admin/reports/data-hub' },
        ],
    },
    {
        group: 'Administration',
        items: [
            { n: 'Branches & Admins', h: '/admin/branches' },
            { n: 'Internal Users', h: '/admin/users' },
            { n: 'Staff Roles', h: '/admin/users/roles' },
            { n: 'Permissions', h: '/admin/users/permissions' },
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
    { name: 'Invoices', href: '/admin/invoices', keywords: ['billing', 'receipts', 'print', 'invoice', 'sales invoices'] },
    { name: 'Reports Center', href: '/admin/reports', keywords: ['hub', 'audits', 'graphs', 'reports'] },
    { name: 'Accounting & Finance', href: '/admin/reports/accounting', keywords: ['p&l', 'cashflow', 'tax', 'finance', 'ledger'] },
    { name: 'Income', href: '/admin/income', keywords: ['income', 'money in', 'revenue', 'earnings', 'sales income', 'inbound'] },
    { name: 'Expense', href: '/admin/expense', keywords: ['expense', 'money out', 'spending', 'costs', 'outbound', 'payments out'] },
    { name: 'Order List', href: '/admin/orders', keywords: ['orders', 'shipping', 'list'] },
    { name: 'Product List', href: '/admin/products', keywords: ['items', 'catalog', 'skus', 'edit', 'products'] },
    { name: 'Add Product', href: '/admin/products/add', keywords: ['create', 'new item', 'upload', 'add product'] },
    { name: 'Current Stocks', href: '/admin/inventory/list', keywords: ['volumes', 'quantities', 'adjustments', 'stock', 'inventory'] },
    { name: 'Warehouses', href: '/admin/inventory/warehouses', keywords: ['storage', 'depots', 'distribution', 'warehouse'] },
    { name: 'Branches & Admins', href: '/admin/branches', keywords: ['branch', 'branches', 'city', 'assign', 'warehouse admin', 'multi branch', 'who manages'] },
    { name: 'My Performance / Staff Comparison', href: '/admin/reports/by-user', keywords: ['my performance', 'staff comparison', 'staff-wise', 'per admin', 'by user', 'staff report', 'sales by staff'] },
    { name: 'Order Tracking', href: '/admin/tracking', keywords: ['delivery', 'courier', 'dispatch', 'tracking'] },
    { name: 'Supplier Registry', href: '/admin/company/suppliers', keywords: ['vendors', 'manufacturers', 'contacts', 'supplier'] },
    { name: 'Customer Registry', href: '/admin/company/customers', keywords: ['clients', 'profiles', 'ledger', 'customer'] },
    { name: 'Delivery Persons', href: '/admin/delivery', keywords: ['rider', 'riders', 'courier', 'dispatch', 'delivery boy', 'delivery person', 'driver'] },
    { name: 'System Alerts', href: '/admin/alerts', keywords: ['errors', 'warnings', 'alarms', 'alerts'] },
    { name: 'Website CMS', href: '/admin/website-settings', keywords: ['slider', 'banners', 'content', 'seo', 'footer', 'cms', 'website', 'storefront', 'landing'] },
    { name: 'System Settings', href: '/admin/settings', keywords: ['config', 'sidebar', 'site details', 'settings', 'configure'] },

    // ── Other pages ──
    { name: 'Sales History', href: '/admin/sales', keywords: ['sales list', 'transactions', 'revenue ledger'] },
    { name: 'Activity Logs', href: '/admin/sales/recent', keywords: ['audit', 'logs', 'actions', 'history'] },
    { name: 'Sale Returns', href: '/admin/sale-returns', keywords: ['returns', 'refunds', 'customer returns'] },
    { name: 'Product Categories', href: '/admin/products/categories', keywords: ['taxonomies', 'groups', 'labels'] },
    { name: 'Product Sections', href: '/admin/products/sections', keywords: ['blocks', 'sliders', 'banners'] },
    { name: 'Purchase History', href: '/admin/purchases', keywords: ['expenses', 'vendor orders', 'invoices'] },
    { name: 'Supplier Catalog', href: '/admin/supplier-products', keywords: ['prices', 'vendor catalog', 'items'] },
    { name: 'Purchase Returns', href: '/admin/purchases/returns', keywords: ['refunds', 'damaged', 'shipback'] },
    { name: 'Internal Users', href: '/admin/users', keywords: ['staff', 'logins', 'accounts'] },
    { name: 'Staff Roles', href: '/admin/users/roles', keywords: ['groups', 'privileges', 'ranks'] },
    { name: 'Permissions', href: '/admin/users/permissions', keywords: ['rules', 'gates', 'granular'] },
    { name: 'Sales Reports', href: '/admin/reports/sales', keywords: ['revenue', 'growth', 'metrics'] },
    { name: 'Purchase Reports', href: '/admin/reports/purchases', keywords: ['costs', 'purchases value'] },
    { name: 'Inventory Reports', href: '/admin/reports/inventory', keywords: ['valuation', 'stock level reports'] },
    { name: 'Customer Reports', href: '/admin/reports/customers', keywords: ['balances', 'rankings', 'activity'] },
    { name: 'Returns Reports', href: '/admin/reports/sales-returns', keywords: ['refunds', 'returns reasons'] },
    { name: 'Data Hub', href: '/admin/reports/data-hub', keywords: ['consolidated grid', 'tables', 'custom reports'] },
    { name: 'Company Categories', href: '/admin/company/categories', keywords: ['company tax categories', 'industry classifications'] },
    { name: 'Global Payments', href: '/admin/payments', keywords: ['payment methods', 'stripe', 'paypal', 'banks'] },
];
