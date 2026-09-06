/* Neutral surface tokens for the dashboard/menu pill BUTTONS. Each page href (or
   group label) maps through here so the same button looks the same everywhere
   (branch + super admin, mobile + desktop).
     from/to → the pill background
     ink     → the icon/label colour
   */

export type Grad = { from: string; to: string; ink: string };

/* The console is monochrome: destinations are told apart by icon and label, not
   by hue. A single neutral entry keeps every existing call site working while
   guaranteeing the soft-grey look everywhere a tile or pill is drawn. */
export const GRADIENTS: Grad[] = [
    { from: '#F5F5F3', to: '#EDEDEA', ink: '#1A1A1A' },
];

/** Stable gradient for a key (href or group label) — same key ⇒ same gradient. */
export function gradientFor(key: string): Grad {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return GRADIENTS[h % GRADIENTS.length];
}

export const gradientCss = (g: Grad) => `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`;
