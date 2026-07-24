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
    Sales: { icon: TrendingUp, color: '#2C5282' },
    Purchase: { icon: ShoppingCart, color: '#2F855A' },
    Stock: { icon: Boxes, color: '#9B2C4E' },
    Accounts: { icon: CreditCard, color: '#553C9A' },
    Setup: { icon: Settings, color: '#4A5568' },
};

const CHILD_COLOR: Record<string, string> = {
    '/admin/sale': '#4C51BF', '/admin/sales': '#2C5282', '/admin/sale-returns': '#285E61', '/admin/orders': '#2C7A7B',
    '/admin/purchases/add': '#2F855A', '/admin/purchases': '#2A4365', '/admin/purchases/returns': '#9C4221', '/admin/company/suppliers': '#975A16',
    '/admin/products': '#6B46C1', '/admin/products-list': '#2F855A', '/admin/products/add': '#9B2C2C', '/admin/inventory/list': '#9B2C4E',
    '/admin/inventory/warehouses': '#2C7A7B', '/admin/company/companies': '#4C51BF',
    '/admin/payments': '#553C9A', '/admin/income': '#2F855A', '/admin/expense': '#9B2C4E', '/admin/reports': '#6B46C1', '/admin/company/customers': '#2C5282',
    '/admin/delivery': '#9B2C4E',
    '/admin/notifications': '#2C7A7B', '/admin/alerts': '#9C4221', '/admin/branches': '#4C51BF', '/admin/users': '#6B46C1',
    '/admin/company/areas': '#285E61', '/admin/website-settings': '#2A4365', '/admin/settings': '#4A5568',
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

    const renderPill = (it: { name: string; href: string; icon: any; action?: 'logout' }) => {
        const Icon = it.icon;
        const inner = (
            <>
                <span className="absolute left-[6px] top-1/2 -translate-y-1/2 z-10 w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-[0_5px_14px_rgba(15,23,42,0.45)]">
                    <Icon size={21} strokeWidth={2.8} style={{ color: '#4F46E5' }} />
                </span>
                <span className="flex-1 min-w-0 text-left text-white font-extrabold uppercase tracking-wide text-[13px] leading-[1.12] line-clamp-2">{it.name}</span>
                <ChevronRight className="shrink-0 w-4 h-4 text-white/80" />
            </>
        );
        const cls = "w-full relative flex items-center h-[56px] rounded-full border-2 pl-[54px] pr-6 shadow-[0_3px_10px_-3px_rgba(15,23,42,0.18)] transition-all duration-300 active:scale-[0.99]";
        const st = { backgroundColor: '#4F46E5', borderColor: '#4338CA' };
        return it.action === 'logout' ? (
            <button key="logout" type="button" onClick={doLogout} className={cls} style={st}>{inner}</button>
        ) : (
            <Link key={it.href} href={it.href} className={cls} style={st}>{inner}</Link>
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
                    <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: '#4F46E5' }}>
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
                        {group.items.map((it: any) => renderPill(it))}
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
