"""Maps an admin page href to the API write-module it controls, so a user's
per-page "edit" grants translate into module write permissions."""

PAGE_MODULE = {
    '/admin/products': 'products',
    '/admin/products/categories': 'products',
    '/admin/products/add': 'products',
    '/admin/products/sections': 'products',
    '/admin/inventory/list': 'inventory',
    '/admin/inventory/warehouses': 'inventory',
    '/admin/purchases': 'purchases',
    '/admin/purchases/add': 'purchases',
    '/admin/supplier-products': 'purchases',
    '/admin/purchases/returns': 'purchases',
    '/admin/company/suppliers': 'suppliers',
    '/admin/sale': 'sales',
    '/admin/orders': 'sales',
    '/admin/sales': 'sales',
    '/admin/invoices': 'sales',
    '/admin/sale-returns': 'sales',
    '/admin/tracking': 'sales',
    '/admin/company/customers': 'customers',
    '/admin/payments': 'payments',
    '/admin/income': 'payments',
    '/admin/expense': 'payments',
    '/admin/company/categories': 'payments',
    '/admin/company/areas': 'areas',
    '/admin/users': 'users',
    '/admin/users/roles': 'users',
    '/admin/users/permissions': 'users',
    '/admin/website-settings': 'settings',
    '/admin/settings': 'settings',
}


def editable_modules(page_edit_permissions):
    """Set of module keys a user may write to, derived from their editable pages."""
    mods = set()
    for href in (page_edit_permissions or []):
        m = PAGE_MODULE.get(href)
        if m:
            mods.add(m)
    return mods
