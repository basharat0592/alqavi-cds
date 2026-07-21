// Page-access presets per role. When an admin picks one of these roles while
// creating/editing a user, the page checkboxes auto-fill to this template
// (still fully editable afterwards). Keyed by lowercased role name.
// "Super Admin"/"Admin" are full-access and intentionally have NO preset
// (the form treats them as unrestricted and stores no page list).

export const ROLE_PAGE_PRESETS: Record<string, string[]> = {
    'operations manager': [
        '/admin/dashboard', '/admin/orders', '/admin/sales', '/admin/tracking',
        '/admin/products', '/admin/products/add',
        '/admin/inventory/list',
        '/admin/purchases/add', '/admin/purchases', '/admin/purchases/returns',
        '/admin/sale', '/admin/payments', '/admin/sale-returns',
        '/admin/company/suppliers', '/admin/company/customers', '/admin/alerts',
        '/admin/reports',
    ],
    'sales manager': [
        '/admin/dashboard', '/admin/orders', '/admin/sales', '/admin/tracking',
        '/admin/sale', '/admin/payments', '/admin/sale-returns',
        '/admin/company/customers',
        '/admin/reports',
    ],
    'inventory manager': [
        '/admin/dashboard',
        '/admin/products', '/admin/products/add',
        '/admin/inventory/list',
        '/admin/purchases/add', '/admin/purchases', '/admin/purchases/returns',
        '/admin/company/suppliers',
        '/admin/reports',
    ],
    'accountant': [
        '/admin/dashboard',
        '/admin/payments',
        '/admin/reports',
    ],
    'area manager': [
        '/admin/dashboard', '/admin/orders', '/admin/sales', '/admin/tracking',
        '/admin/sale', '/admin/payments', '/admin/sale-returns',
        '/admin/company/customers', '/admin/inventory/list',
        '/admin/reports',
    ],
    'cashier': [
        '/admin/dashboard', '/admin/sale', '/admin/orders', '/admin/sales',
    ],
};

/** The 6 recommended roles (besides Super Admin / Admin which are full-access). */
export const PRESET_ROLE_NAMES = [
    'Operations Manager', 'Sales Manager', 'Inventory Manager', 'Accountant', 'Area Manager', 'Cashier',
];

/** Returns the page-access preset for a role name, or null if none. */
export function getRolePreset(roleName: string | undefined | null): string[] | null {
    if (!roleName) return null;
    return ROLE_PAGE_PRESETS[roleName.trim().toLowerCase()] || null;
}
