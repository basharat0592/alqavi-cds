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
    card: 'bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
    sectionLabel: 'text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500',
    inputBase:
        'w-full h-10 px-3.5 bg-white rounded-lg text-[13.5px] text-slate-800 outline-none border border-slate-200 ' +
        'placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10',
} as const;
