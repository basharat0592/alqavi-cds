/**
 * Admin design-system tokens.
 * Shell: dark sidebar + light content. Accent: indigo. Neutrals: slate.
 * These are reference values + reusable class presets for the admin UI kit.
 */

export const adminColors = {
    // Shell
    sidebarBg: '#0F172A',          // slate-900 (dark sidebar)
    pageBg: '#F8FAFC',             // slate-50 (content area)
    // Accent
    accent: '#4F46E5',             // indigo-600
    accentHover: '#4338CA',        // indigo-700
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
        'hover:bg-white hover:border-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 focus:shadow-none',
    /** Disabled/read-only field — clearly inert, not just faded. */
    inputDisabled: 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed shadow-none hover:bg-slate-100 hover:border-slate-200',
    /** Field label above an input. */
    fieldLabel: 'block text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 mb-1.5',
    /** Unit affix (Rs, %) sitting inside a field. */
    fieldAffix: 'absolute top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 pointer-events-none',
    // Shared table presets — consistent, readable tables everywhere they're adopted.
    tableWrap: 'w-full overflow-x-auto',
    table: 'w-full text-left border-collapse',
    th: 'px-4 py-3 bg-slate-50 border-b-2 border-slate-200/70 text-[10.5px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap',
    td: 'px-4 py-3 text-[13px] text-slate-700 border-b border-slate-100',
    trHover: 'hover:bg-indigo-50/40 transition-colors',
} as const;
