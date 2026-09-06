/**
 * Admin design-system tokens.
 *
 * Soft-neutral shell: a warm grey canvas with the console floating on it as one
 * large rounded surface. Cards are pure white and borderless — separation comes
 * from a wide, very soft shadow rather than a hairline.
 *
 * Colour is almost absent by design. Interaction, CTAs and the active nav state
 * are near-black ink; the only saturated colours are the status pills (green for
 * a positive delta, coral for something needing attention). That restraint is
 * the whole look, so resist reintroducing a brand hue for emphasis — use weight,
 * size and the white "lifted" fill instead.
 */

export const adminColors = {
    // Shell
    canvas: '#E6E6E4',             // outer grey the console floats on
    shell: '#F7F7F5',              // the rounded app surface
    sidebarBg: '#1A1A1A',          // dark nav column against the light content
    pageBg: '#F7F7F5',             // content area
    surface: '#FFFFFF',            // cards
    hairline: '#E9E9E6',
    // Accent — the brand pair. Amber carries action, teal carries interaction.
    accent: '#F59E0B',
    accentHover: '#D97706',
    accentText: '#B4780B',        // amber readable as text on a light ground
    accentOnDark: '#FFFFFF',
    accentSoftBg: 'rgba(245,158,11,0.10)',
    // Secondary brand — links, clickable titles, sort and info states.
    info: '#119AB8',
    infoHover: '#0E7F98',
    infoText: '#0E7F98',
    infoSoftBg: 'rgba(17,154,184,0.10)',
    // Secondary — the soft grey chip
    secondary: '#F0F0EE',
    secondaryText: '#5B5B58',
    // Status
    positive: '#16A34A',
    positiveBg: '#DCF3E4',
    negative: '#DC2626',
    negativeBg: '#FCE9E9',
    // Text
    title: '#1A1A1A',
    body: '#5B5B58',
    muted: '#9C9C98',
} as const;

/** Reusable class presets so pages share one language. */
export const ui = {
    page: 'bg-[#F7F7F5] min-h-screen text-[#1A1A1A]',
    /** Borderless white card; the soft shadow does the separating. */
    card: 'bg-white rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_30px_-14px_rgba(0,0,0,0.12)]',
    sectionLabel: 'text-[12px] font-semibold tracking-[-0.01em] text-[#9C9C98]',
    // Fields rest on a faint grey fill with no border, and lift to white with a
    // soft ink ring on focus — the same "lift" language as the active nav pill.
    inputBase:
        'w-full h-10 px-3.5 bg-[#F2F2F0] rounded-xl text-[13.5px] font-medium text-[#1A1A1A] outline-none border border-transparent ' +
        'placeholder:text-[#9C9C98] placeholder:font-normal transition-all ' +
        'hover:bg-[#EDEDEA] focus:bg-white focus:border-[#F59E0B]/40 focus:ring-4 focus:ring-[#F59E0B]/15 ' +
        'focus:shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    /** Disabled/read-only field — clearly inert, not just faded. */
    inputDisabled: 'bg-[#EFEFEC] border-transparent text-[#9C9C98] cursor-not-allowed shadow-none hover:bg-[#EFEFEC]',
    /** Field label above an input. */
    fieldLabel: 'block text-[12.5px] font-medium tracking-[-0.01em] text-[#5B5B58] mb-1.5',
    /** Unit affix (Rs, %) sitting inside a field. */
    fieldAffix: 'absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#9C9C98] pointer-events-none',
    // Shared table presets — quiet rows, no vertical rules, hairline separators.
    tableWrap: 'w-full overflow-x-auto',
    table: 'w-full text-left border-collapse',
    /** Header cell. Every admin table uses exactly this — only alignment varies. */
    th: 'px-5 py-3.5 bg-transparent border-b border-[#EDEDEA] text-[11.5px] font-medium tracking-[-0.01em] text-[#9C9C98] whitespace-nowrap',
    /** Body cell. Emphasis inside a row comes from the content, never the cell. */
    td: 'px-5 py-3.5 text-[13px] text-[#3A3A38] border-b border-[#F2F2F0] align-middle',
    trHover: 'hover:bg-[#FAFAF8] transition-colors',
    /** Empty-state cell spanning the table. */
    tdEmpty: 'px-5 py-16 text-center text-[13px] text-[#9C9C98]',
    /** Accent presets — amber solid for actions, amber soft for emphasis. */
    accentSolid: 'bg-[#F59E0B] hover:bg-[#D97706] text-white',
    accentSoft: 'bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-inset ring-[#F59E0B]/25',
    accentTextCls: 'text-[#B4780B]',
    /** Secondary brand — interaction rather than action. */
    infoSolid: 'bg-[#119AB8] hover:bg-[#0E7F98] text-white',
    infoSoft: 'bg-[#119AB8]/10 text-[#0E7F98] ring-1 ring-inset ring-[#119AB8]/25',
    infoTextCls: 'text-[#119AB8]',
    /** A clickable title or inline link inside a table row. */
    link: 'text-[#119AB8] hover:text-[#0E7F98] hover:underline transition-colors',
    secondarySoft: 'bg-black/[0.05] text-[#5B5B58] ring-1 ring-inset ring-black/[0.06]',
    secondaryTextCls: 'text-[#5B5B58]',
    /** Money figure — big, tight, ink. Colour is reserved for deltas. */
    money: 'font-semibold text-[#1A1A1A] tabular-nums tracking-[-0.02em]',
    /** Display figure, as per the reference's large metric numbers. */
    metric: 'text-[40px] leading-none font-semibold text-[#1A1A1A] tabular-nums tracking-[-0.03em]',
    /** Round icon chip that sits above a metric. */
    iconChip: 'w-14 h-14 rounded-full bg-[#F2F2F0] text-[#1A1A1A] flex items-center justify-center shrink-0',
    /** Delta pills under a metric. */
    deltaUp: 'inline-flex items-center gap-1 h-6 px-2 rounded-lg bg-[#DCF3E4] text-[#16A34A] text-[12px] font-medium',
    deltaDown: 'inline-flex items-center gap-1 h-6 px-2 rounded-lg bg-[#FCE9E9] text-[#DC2626] text-[12px] font-medium',
} as const;
