/**
 * Admin design-system tokens.
 * Shell: dark sidebar + light content. Neutrals: slate.
 *
 * Brand palette — the whole admin follows the New Purchase screen:
 *   PRIMARY   #13B0D1 cyan  — navigation, interaction, focus, primary CTA
 *   SECONDARY #F59E0B amber — money, secondary actions, attention
 * Both are mid-tone and fail contrast as small text on white, so the exact hexes
 * are for fills / borders / rings / solid buttons, and the darkened partners
 * (accentText / secondaryText) are for anything small and typographic.
 */

export const adminColors = {
    // Shell
    sidebarBg: '#0F172A',          // slate-900 (dark sidebar)
    pageBg: '#F8FAFC',             // slate-50 (content area)
    // Accent — brand cyan
    accent: '#13B0D1',
    accentHover: '#0E8CA8',
    accentText: '#0E8CA8',         // legible cyan for small text/icons on white
    accentOnDark: '#22C3E0',       // lifted cyan for the dark sidebar
    // Secondary — brand amber
    secondary: '#F59E0B',
    secondaryText: '#B4780B',      // legible amber for figures on white
    // Text
    title: '#0F172A',              // slate-900
    body: '#475569',               // slate-600
    muted: '#94A3B8',              // slate-400
} as const;

/** Reusable class presets so pages share one language. */
export const ui = {
    page: 'bg-[#F8FAFC] min-h-screen text-slate-800',
    card: 'bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
    sectionLabel: 'text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500',
    // Higher-contrast field. White-on-white reads as "not a field", so inputs rest on a
    // tinted fill with a solid border and lift to white on hover/focus — the edit target
    // is obvious at a glance on every admin page.
    inputBase:
        'w-full h-10 px-3.5 bg-slate-50 rounded-lg text-[13.5px] font-medium text-slate-900 outline-none border border-slate-300 ' +
        'shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 placeholder:font-normal transition-all ' +
        'hover:bg-white hover:border-slate-400 focus:bg-white focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/20 focus:shadow-none',
    /** Disabled/read-only field — clearly inert, not just faded. */
    inputDisabled: 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none hover:bg-slate-100 hover:border-slate-200',
    /** Field label above an input. */
    fieldLabel: 'block text-[12px] font-bold uppercase tracking-[0.04em] text-slate-600 mb-1.5',
    /** Unit affix (Rs, %) sitting inside a field. */
    fieldAffix: 'absolute top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 pointer-events-none',
    // Shared table presets — consistent, readable tables everywhere they're adopted.
    tableWrap: 'w-full overflow-x-auto',
    table: 'w-full text-left border-collapse',
    th: 'px-4 py-3 bg-slate-100 border-b border-slate-300 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 whitespace-nowrap',
    td: 'px-4 py-3 text-[12.5px] text-slate-700 border-b border-slate-100',
    trHover: 'hover:bg-slate-50 transition-colors',
    /** Accent presets so pages stop hand-rolling the brand hexes. */
    accentSolid: 'bg-[#13B0D1] hover:bg-[#0E8CA8] text-white',
    accentSoft: 'bg-[#13B0D1]/10 text-[#0E8CA8] ring-1 ring-inset ring-[#13B0D1]/25',
    accentTextCls: 'text-[#0E8CA8]',
    secondarySoft: 'bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-inset ring-[#F59E0B]/30',
    secondaryTextCls: 'text-[#B4780B]',
    /** Money figure — the amber that reads as a value, not a label. */
    money: 'font-bold text-[#B4780B] tabular-nums',
} as const;
