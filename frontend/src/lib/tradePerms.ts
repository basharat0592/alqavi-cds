/*
 * Trade 1.0 User Permissions on the client: the signed-in login's rights,
 * fetched once per page. Full access when not restricted. A window opens when
 * the login has any right on it; the server refuses the actions not granted.
 */
import api from '@/lib/axios';

export type PermRow = { key: string; label: string; actions: string[]; hrefs: string[] };
export type PermSection = { id: string; rows: PermRow[] };
export type MyPerms = { restricted: boolean; perms: string[]; catalog: PermSection[] };

let cache: Promise<MyPerms> | null = null;
export function loadMyPerms(): Promise<MyPerms> {
    if (!cache) {
        cache = api.get('v1/sales/trade-permissions/me/').then(({ data }) => data as MyPerms)
            .catch(() => ({ restricted: false, perms: [], catalog: [] }));
    }
    return cache;
}

/** The permission row a window belongs to (null: not covered). */
export function rowForHref(p: MyPerms, href: string): PermRow | null {
    const path = href.split('?')[0].replace(/\/$/, '');
    for (const s of p.catalog) for (const r of s.rows) if (r.hrefs.some((h) => h === path)) return r;
    return null;
}

export function canOpen(p: MyPerms | null, href: string) {
    if (!p || !p.restricted) return true;
    const row = rowForHref(p, href);
    return !row || p.perms.some((x) => x.startsWith(`${row.key}.`));
}
