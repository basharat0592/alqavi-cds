/**
 * Flat directory of every admin console page — used by the global navbar search
 * so users can jump to any page from the top search field.
 */

export interface AdminPage {
    name: string;
    href: string;
    keywords?: string[];
}

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
    { name: 'Order Tracking', href: '/admin/tracking', keywords: ['delivery', 'courier', 'dispatch', 'tracking'] },
    { name: 'Supplier Registry', href: '/admin/company/suppliers', keywords: ['vendors', 'manufacturers', 'contacts', 'supplier'] },
    { name: 'Customer Registry', href: '/admin/company/customers', keywords: ['clients', 'profiles', 'ledger', 'customer'] },
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
