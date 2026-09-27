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
    canvas: '#F4F6F9',             // outer grey the console floats on
    shell: '#F4F6F9',              // the rounded app surface
    sidebarBg: '#0A6E85',          // floating cyan rail; white text ~5.8:1
    pageBg: '#F4F6F9',             // content area
    surface: '#FFFFFF',            // cards
    hairline: '#E7ECF2',
    // Accent — the brand pair. Amber carries action, teal carries interaction.
    accent: '#1877C2',
    accentHover: '#1567AB',
    accentText: '#1877C2',
    accentOnDark: '#FFFFFF',
    accentSoftBg: '#E8F2FB',
    // Secondary brand — links, clickable titles, sort and info states.
    info: '#1877C2',
    infoHover: '#1567AB',
    infoText: '#1877C2',
    infoSoftBg: '#E8F2FB',
    // Secondary — the soft grey chip
    secondary: '#F4F6F9',
    secondaryText: '#64748B',
    // Status
    positive: '#16A34A',
    positiveBg: '#E7F7EF',
    negative: '#DC2626',
    negativeBg: '#FDECEC',
    // Text
    title: '#0F1A2B',
    body: '#64748B',
    muted: '#94A3B8',
} as const;

/** Reusable class presets so pages share one language. */
export const ui = {
    page: 'bg-[#F4F6F9] min-h-screen text-[#0F1A2B]',
    /** Borderless white card; the soft shadow does the separating. */
    card: 'bg-white rounded-2xl border border-[#E7ECF2]',
    sectionLabel: 'text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]',
    // Fields rest on a faint grey fill with no border, and lift to white with a
    // soft ink ring on focus — the same "lift" language as the active nav pill.
    inputBase:
        'w-full h-11 px-3.5 bg-[#F4F6F9] rounded-xl text-[14px] font-medium text-[#0F1A2B] outline-none border border-transparent ' +
        'placeholder:text-[#94A3B8] placeholder:font-normal transition-all ' +
        'focus:bg-white focus:border-[#1877C2]/40 focus:ring-4 focus:ring-[#1877C2]/10 ' +
        'focus:shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    /** Disabled/read-only field — clearly inert, not just faded. */
    inputDisabled: 'bg-[#EEF2F6] border-transparent text-[#94A3B8] cursor-not-allowed shadow-none',
    /** Field label above an input. */
    fieldLabel: 'block text-[13px] font-semibold tracking-[-0.01em] text-[#0F1A2B] mb-1.5',
    /** Unit affix (Rs, %) sitting inside a field. */
    fieldAffix: 'absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#94A3B8] pointer-events-none',
    // Shared table presets — quiet rows, no vertical rules, hairline separators.
    tableWrap: 'w-full overflow-x-auto',
    table: 'w-full text-left border-collapse',
    /** Header cell. Every admin table uses exactly this — only alignment varies. */
    th: 'px-5 py-3.5 bg-transparent border-b border-[#E7ECF2] text-[11px] font-bold uppercase tracking-[0.08em] text-[#94A3B8] whitespace-nowrap',
    /** Body cell. Emphasis inside a row comes from the content, never the cell. */
    td: 'px-5 py-3.5 text-[13.5px] text-[#334155] border-b border-[#F1F5F9] align-middle',
    trHover: 'hover:bg-[#F8FAFC] transition-colors',
    /** Empty-state cell spanning the table. */
    tdEmpty: 'px-5 py-16 text-center text-[13.5px] text-[#94A3B8]',
    /** Accent presets — amber solid for actions, amber soft for emphasis. */
    accentSolid: 'bg-[#1877C2] hover:bg-[#1567AB] text-white',
    accentSoft: 'bg-[#E8F2FB] text-[#1877C2]',
    accentTextCls: 'text-[#1877C2]',
    /** Secondary brand — interaction rather than action. */
    infoSolid: 'bg-[#1877C2] hover:bg-[#1567AB] text-white',
    infoSoft: 'bg-[#E8F2FB] text-[#1877C2]',
    infoTextCls: 'text-[#1877C2]',
    /** A clickable title or inline link inside a table row. */
    link: 'text-[#1877C2] hover:text-[#1567AB] hover:underline transition-colors',
    secondarySoft: 'bg-[#F4F6F9] text-[#64748B]',
    secondaryTextCls: 'text-[#64748B]',
    /** Money figure — big, tight, ink. Colour is reserved for deltas. */
    money: 'font-bold text-[#0F1A2B] tabular-nums tracking-[-0.02em]',
    /** Display figure, as per the reference's large metric numbers. */
    metric: 'text-[34px] leading-none font-bold text-[#0F1A2B] tabular-nums tracking-[-0.03em]',
    /** Round icon chip that sits above a metric. */
    iconChip: 'w-10 h-10 rounded-xl bg-[#E8F2FB] text-[#1877C2] flex items-center justify-center shrink-0',
    /** Delta pills under a metric. */
    deltaUp: 'inline-flex items-center gap-1 h-6 px-2 rounded-lg bg-[#E7F7EF] text-[#16A34A] text-[12px] font-semibold',
    deltaDown: 'inline-flex items-center gap-1 h-6 px-2 rounded-lg bg-[#FDECEC] text-[#DC2626] text-[12px] font-semibold',
} as const;
