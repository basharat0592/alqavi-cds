/*
 * Search ranking for every Find / search box: what was typed first matches
 * names that START with it, then names with a WORD starting with it, then
 * names that only contain it ("bi" → "Bio …" before "Al Arabia …").
 */
const WORD_START = /[\s\-_/(.,&+]/;

/** 0 exact · 1 starts with · 2 a word starts with · 3 contains · null no match (best of the fields). */
export function matchRank(q: string, ...fields: unknown[]): number | null {
    const s = q.trim().toLowerCase();
    if (!s) return 0;
    let best: number | null = null;
    for (const f of fields) {
        const v = String(f ?? '').toLowerCase();
        if (!v) continue;
        const i = v.indexOf(s);
        if (i < 0) continue;
        let r = v === s ? 0 : i === 0 ? 1 : 3;
        if (r === 3) {
            // a later word may start with it even when the first hit is inside a word
            for (let k = i; k >= 0; k = v.indexOf(s, k + 1)) { if (k === 0 || WORD_START.test(v[k - 1])) { r = 2; break; } }
        }
        if (best === null || r < best) best = r;
        if (best === 0) break;
    }
    return best;
}

/** The same list, best matches first (stable: equal matches keep their order). Nothing typed → unchanged. */
export function sortByMatch<T>(list: T[], q: string, fields: (row: T) => unknown[]): T[] {
    if (!q.trim()) return list;
    return list
        .map((row, i) => ({ row, i, r: matchRank(q, ...fields(row)) ?? 9 }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map((x) => x.row);
}
