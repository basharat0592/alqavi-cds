/*
 * Product names with their size / pack written small, like a subscript:
 * "Me and my magic jumbo(m)72pcs" -> "Me and my magic jumbo" + small "(m)72pcs",
 * "Lotion 100ml" -> "Lotion" + small "100ml". Used in every Trade grid and on
 * the printed invoice.
 */
import type { ReactNode } from 'react';

// Optional size code in brackets — (m), (xl), (L)… — then a number with a unit.
const SIZE_RE = /((?:\((?:xxxl|xxl|xl|xs|s|m|l|nb)\)\s?(?:\d+(?:\.\d+)?\s?(?:ml|mg|gm|g|kg|ltr|l|pcs?)?)?|\d+(?:\.\d+)?\s?(?:ml|mg|gm|g|kg|ltr|l|pcs?))(?![a-z]))/gi;

export function pn(name: string | null | undefined, small: string | number = '0.72em'): ReactNode {
    const text = String(name ?? '');
    const parts = text.split(SIZE_RE);
    if (parts.length === 1) return text;
    return (
        <span data-name={text}>
            {parts.map((p, i) => (i % 2 ? <span key={i} style={{ fontSize: small, fontWeight: 400, opacity: 0.8 }}>{p}</span> : p))}
        </span>
    );
}

/** Tooltip text for a grid cell value (plain value or a pn() name). */
export function tip(v: any): string {
    if (v && typeof v === 'object' && v.props && v.props['data-name']) return v.props['data-name'];
    return v === null || v === undefined ? '' : String(v);
}
