'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE GROUP MENU — tapping a nav group on the dashboard (Sales / Purchase /
   Stock / Accounts / Setup) opens this page, which lists that group's pages as
   the same clean pill buttons. Desktop users use the top nav dropdowns instead.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Boxes, TrendingUp, ShoppingCart, CreditCard, Settings } from 'lucide-react';
import { useVisibleGroups } from '@/components/layout/AdminNavMenu';
import { authService } from '@/lib/auth';

const GROUP_META: Record<string, { icon: any; color: string }> = {
    Sales: { icon: TrendingUp, color: '#2563EB' },
    Purchase: { icon: ShoppingCart, color: '#059669' },
    Stock: { icon: Boxes, color: '#E11D48' },
    Accounts: { icon: CreditCard, color: '#7C3AED' },
    Setup: { icon: Settings, color: '#475569' },
};

const CHILD_COLOR: Record<string, string> = {
    '/admin/sale': '#4F46E5', '/admin/sales': '#2563EB', '/admin/sale-returns': '#0D9488', '/admin/orders': '#0891B2',
    '/admin/purchases/add': '#059669', '/admin/purchases': '#0284C7', '/admin/purchases/returns': '#EA580C', '/admin/company/suppliers': '#D97706',
    '/admin/products': '#C026D3', '/admin/products-list': '#16A34A', '/admin/products/add': '#DC2626', '/admin/inventory/list': '#E11D48',
    '/admin/inventory/warehouses': '#0891B2', '/admin/company/companies': '#4F46E5',
    '/admin/payments': '#7C3AED', '/admin/income': '#059669', '/admin/expense': '#E11D48', '/admin/reports': '#C026D3', '/admin/company/customers': '#0284C7',
    '/admin/delivery': '#DB2777',
    '/admin/notifications': '#0891B2', '/admin/alerts': '#EA580C', '/admin/branches': '#4F46E5', '/admin/users': '#7C3AED',
    '/admin/company/areas': '#0D9488', '/admin/website-settings': '#2563EB', '/admin/settings': '#475569',
};

export default function MenuGroupPage() {
    const params = useParams();
    const router = useRouter();
    const label = decodeURIComponent(String(params?.group || ''));
    const { groups } = useVisibleGroups();
    const group = groups.find((g) => g.label.toLowerCase() === label.toLowerCase());
    const meta = GROUP_META[group?.label || label] || { icon: Boxes, color: '#6366f1' };
    const GIcon = meta.icon;

    const doLogout = () => { authService.logout(); router.push('/login'); };

    const renderPill = (it: { name: string; href: string; icon: any; action?: 'logout' }, color: string) => {
        const Icon = it.icon;
        const inner = (
            <>
                <span className="absolute left-[3px] top-1/2 -translate-y-1/2 z-10 w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
                    <Icon size={24} strokeWidth={2.8} style={{ color }} />
                </span>
                <span className="flex-1 min-w-0 text-left text-white font-extrabold uppercase tracking-wide text-[13px] leading-[1.12] line-clamp-2">{it.name}</span>
                <ChevronRight className="shrink-0 w-4 h-4 text-white/75" />
            </>
        );
        const cls = "w-full relative flex items-center h-[56px] rounded-full pl-[62px] pr-6 shadow-[0_8px_18px_-4px_rgba(15,23,42,0.28)] transition-all duration-300 active:scale-[0.99]";
        return it.action === 'logout' ? (
            <button key="logout" type="button" onClick={doLogout} className={cls} style={{ backgroundColor: color }}>{inner}</button>
        ) : (
            <Link key={it.href} href={it.href} className={cls} style={{ backgroundColor: color }}>{inner}</Link>
        );
    };

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-slate-800 animate-in fade-in duration-300">
            <div className="max-w-[560px] mx-auto px-3 pt-3">
                {/* Header — back + group identity */}
                <div className="flex items-center gap-3 mb-5">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/dashboard')}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-all shrink-0"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: meta.color }}>
                        <GIcon size={20} strokeWidth={2.6} className="text-white" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-[19px] font-bold text-slate-900 leading-tight truncate">{group?.label || label}</h1>
                        <p className="text-[12px] text-slate-500">{group ? `${group.items.length} pages` : 'Menu'}</p>
                    </div>
                </div>

                {/* Pages as pills */}
                {group ? (
                    <div className="space-y-2.5">
                        {group.items.map((it: any) => renderPill(it, CHILD_COLOR[it.href] || meta.color))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-[13px] text-slate-400">
                        This menu isn’t available.
                        <div className="mt-3">
                            <Link href="/admin/dashboard" className="text-indigo-600 font-semibold hover:underline">Back to Dashboard</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
