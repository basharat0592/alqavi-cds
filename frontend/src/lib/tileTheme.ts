/* ═══════════════════════════════════════════════════════════════════════════
   Fancy gradient palette for the dashboard/menu pill BUTTONS. Each page href (or
   group label) maps to a stable gradient so the same button keeps the same look
   everywhere (branch + super admin, mobile + desktop).
     from/to → the pill's linear-gradient
     ink     → the icon colour inside the white circle (a saturated mid-tone)
   ═══════════════════════════════════════════════════════════════════════════ */

export type Grad = { from: string; to: string; ink: string };

export const GRADIENTS: Grad[] = [
    { from: '#A9F1DF', to: '#FFBBBB', ink: '#10B981' },
    { from: '#D8B5FF', to: '#1EAE98', ink: '#14B8A6' },
    { from: '#BFF098', to: '#6FD6FF', ink: '#0EA5E9' },
    { from: '#C6EA8D', to: '#FE90AF', ink: '#F43F5E' },
    { from: '#F1EAB9', to: '#FF8C8C', ink: '#F97316' },
    { from: '#EA8D8D', to: '#A890FE', ink: '#8B5CF6' },
    { from: '#00B7FF', to: '#FFFFC7', ink: '#0891B2' },
    { from: '#FCA5F1', to: '#B5FFFF', ink: '#EC4899' },
    { from: '#D74177', to: '#FFE98A', ink: '#DB2777' },
    { from: '#38ADAE', to: '#CD295A', ink: '#0D9488' },
    { from: '#F6D365', to: '#FDA085', ink: '#F59E0B' },
    { from: '#A1C4FD', to: '#C2E9FB', ink: '#3B82F6' },
    { from: '#84FAB0', to: '#8FD3F4', ink: '#10B981' },
    { from: '#FBC2EB', to: '#A6C1EE', ink: '#A78BFA' },
];

/** Stable gradient for a key (href or group label) — same key ⇒ same gradient. */
export function gradientFor(key: string): Grad {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return GRADIENTS[h % GRADIENTS.length];
}

export const gradientCss = (g: Grad) => `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`;
