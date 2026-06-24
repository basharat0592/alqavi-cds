// Centralised admin page-access logic.
// `page_permissions` is a per-user JSON array of allowed admin route hrefs
// (e.g. "/admin/orders"). Full-access roles / staff have no restriction.

export const FULL_ACCESS_ROLES = ['admin', 'superadmin', 'super admin'];

// Pages every authenticated admin may always reach (landing + self pages).
const ALWAYS_ALLOWED = ['/admin', '/admin/dashboard', '/admin/profile'];

/**
 * Returns the user's allowed page list, or `null` when the user is
 * unrestricted (full-access role, staff, superuser, or no list set).
 * Mirrors the logic used by AdminSidebar so nav + routing stay consistent.
 */
export function getUserPagePerms(user: any): string[] | null {
    if (!user) return null;
    const role = String(user.role_name || user.role || '').toLowerCase();
    // Full access is decided by ROLE (Admin / Super Admin) or superuser only.
    // NOT is_staff — every internal staff role (Sales Manager, Area Manager, …)
    // is is_staff so they can enter the admin panel, but they are still bound
    // by their page_permissions.
    if (FULL_ACCESS_ROLES.includes(role) || user.is_superuser) {
        return null; // unrestricted
    }
    const perms = user.page_permissions;
    return Array.isArray(perms) && perms.length > 0 ? perms : null;
}

/**
 * Is `pathname` allowed for a user with these page permissions?
 * Allows exact matches and sub-routes (e.g. "/admin/products/edit/5"
 * is allowed when "/admin/products" is granted).
 */
export function isPathAllowed(pagePerms: string[] | null, pathname: string): boolean {
    if (pagePerms === null) return true; // unrestricted
    if (ALWAYS_ALLOWED.includes(pathname)) return true;
    return pagePerms.some(href => pathname === href || pathname.startsWith(href + '/'));
}

/** First page the user is actually allowed to see (fallback redirect target). */
export function firstAllowedPath(pagePerms: string[] | null): string {
    if (pagePerms === null || pagePerms.length === 0) return '/admin/dashboard';
    return pagePerms[0];
}

/**
 * Returns the user's editable page list, or `null` when the user is
 * unrestricted for editing (full-access role / superuser / unconfigured legacy).
 * A user is "page-restricted" once the admin has set any view OR edit list;
 * from then on their EDIT list is authoritative.
 */
export function getUserEditPerms(user: any): string[] | null {
    if (!user) return null;
    const role = String(user.role_name || user.role || '').toLowerCase();
    if (FULL_ACCESS_ROLES.includes(role) || user.is_superuser) {
        return null; // unrestricted
    }
    const view = user.page_permissions;
    const edit = user.page_edit_permissions;
    const hasViewList = Array.isArray(view) && view.length > 0;
    const hasEditList = Array.isArray(edit) && edit.length > 0;
    if (hasViewList || hasEditList) {
        return Array.isArray(edit) ? edit : [];
    }
    return null; // unconfigured -> treat as unrestricted (legacy)
}

/** Always-editable self pages (profile/dashboard never need edit grants). */
const EDIT_ALWAYS_ALLOWED = ['/admin', '/admin/dashboard', '/admin/profile'];

/** May the user edit (mutate) on `pathname`? */
export function isEditAllowed(editPerms: string[] | null, pathname: string): boolean {
    if (editPerms === null) return true; // unrestricted
    if (EDIT_ALWAYS_ALLOWED.includes(pathname)) return true;
    return editPerms.some(href => pathname === href || pathname.startsWith(href + '/'));
}
