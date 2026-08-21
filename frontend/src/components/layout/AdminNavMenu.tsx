'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN NAV MENU — replaces the left sidebar with a top menu bar of 5 groups
   (Sales · Purchase · Stock · Accounts · Setup) + a Dashboard home link.
   Desktop = hover/click dropdowns; mobile = slide-in accordion drawer.
   Pages are filtered by the same access rules the sidebar used.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, ScanLine, TrendingUp, RotateCcw, ClipboardList, Truck,
    ShoppingCart, History, RefreshCcw, UserCheck, Package, PackagePlus, Boxes, Store,
    CreditCard, ArrowDownLeft, ArrowUpRight, BarChart3, Users, Bell, AlertTriangle,
    Building2, User, MapPin, Globe, Settings, ChevronDown, ChevronRight, X, Bike, LogOut,
} from 'lucide-react';
import { authService, sidebarVisibilityKey } from '@/lib/auth';
import { SUPER_ADMIN_HIDDEN_HREFS, SUPER_ONLY_HREFS } from '@/lib/adminPages';
import { cn } from '@/lib/utils';

type Item = { name: string; href: string; icon: any; action?: 'logout' };
type Group = { label: string; items: Item[] };

/** Standalone accent buttons shown outside the group dropdowns (right side of the
 *  desktop bar; separate pills on the mobile dashboard). */
export const STANDALONE_ITEMS: { name: string; href: string; icon: any; color: string; accent: string; accentActive: string }[] = [
    { name: 'Reports', href: '/admin/reports', icon: BarChart3, color: '#6B46C1', accent: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100', accentActive: 'bg-[#6B46C1] text-white border-[#6B46C1] shadow-sm shadow-violet-700/20' },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard, color: '#553C9A', accent: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100', accentActive: 'bg-[#553C9A] text-white border-[#553C9A] shadow-sm shadow-purple-700/20' },
    { name: 'Order Tracking', href: '/admin/tracking', icon: Truck, color: '#2C5282', accent: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200', accentActive: 'bg-[#2C5282] text-white border-[#2C5282] shadow-sm shadow-blue-800/20' },
];

export const NAV_GROUPS: Group[] = [
    {
        label: 'Sales', items: [
            { name: 'Point of Sale', href: '/admin/sale', icon: ScanLine },
            { name: 'Sales History', href: '/admin/sales', icon: TrendingUp },
            { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            { name: 'Recent Orders', href: '/admin/orders', icon: ClipboardList },
            // Order Tracking is promoted to a stand-alone right-most nav item (see below).
        ],
    },
    {
        label: 'Purchase', items: [
            { name: 'New Purchase', href: '/admin/purchases/add', icon: ShoppingCart },
            { name: 'Purchase History', href: '/admin/purchases', icon: History },
            { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RefreshCcw },
            { name: 'Supplier Registry', href: '/admin/company/suppliers', icon: UserCheck },
        ],
    },
    {
        label: 'Stock', items: [
            { name: 'Live Products', href: '/admin/products', icon: Package },
            { name: 'Add Listing', href: '/admin/products/add', icon: PackagePlus },
            { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes },
            { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store },
        ],
    },
    {
        label: 'Accounts', items: [
            { name: 'Customer Registry', href: '/admin/company/customers', icon: Users },
            { name: 'Companies', href: '/admin/company/companies', icon: Building2 },
            { name: 'Delivery Persons', href: '/admin/delivery', icon: Bike },
            { name: 'Logout', href: '', icon: LogOut, action: 'logout' },
        ],
    },
    {
        label: 'Setup', items: [
            { name: 'Your Profile', href: '/admin/settings', icon: User },
            { name: 'System Settings', href: '/admin/settings?tab=settings', icon: Settings },
            { name: 'View Store', href: '/', icon: Store },
            { name: 'Notifications', href: '/admin/notifications', icon: Bell },
            { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle },
            { name: 'Organizations', href: '/admin/branches', icon: Building2 },
            { name: 'Admins', href: '/admin/users', icon: User },
            { name: 'Areas / Territories', href: '/admin/company/areas', icon: MapPin },
            { name: 'Website CMS', href: '/admin/website-settings', icon: Globe },
            { name: 'Logout', href: '', icon: LogOut, action: 'logout' },
        ],
    },
];

/** Access filter — mirrors the dashboard/sidebar rules. */
export function useVisibleGroups(): { groups: Group[]; canSee: (href: string) => boolean } {
    const [visibility, setVisibility] = useState<Record<string, boolean>>({});
    const [perms, setPerms] = useState<string[] | null>(null);
    const [isSuper, setIsSuper] = useState(false);

    useEffect(() => {
        setIsSuper(authService.isSuperAdmin());
        const u: any = authService.getUser();
        const role = (typeof u?.role === 'string' ? u.role : u?.role_name || '').toLowerCase();
        if (['admin', 'super admin', 'superadmin'].includes(role) || u?.is_superuser) setPerms(null);
        else {
            const p = u?.page_permissions;
            setPerms(Array.isArray(p) && p.length > 0 ? p : null);
        }
        const load = () => {
            try { const s = localStorage.getItem(sidebarVisibilityKey()); setVisibility(s ? JSON.parse(s) : {}); }
            catch { setVisibility({}); }
        };
        load();
        window.addEventListener('sidebar_visibility_change', load);
        window.addEventListener('storage', load);
        return () => {
            window.removeEventListener('sidebar_visibility_change', load);
            window.removeEventListener('storage', load);
        };
    }, []);

    const canSee = (href: string) => {
        const base = href.split('?')[0];
        return (isSuper || !SUPER_ONLY_HREFS.includes(base)) &&
            !(isSuper && SUPER_ADMIN_HIDDEN_HREFS.includes(base)) &&
            visibility[base] !== false &&
            (perms === null || perms.includes(base));
    };

    const groups = NAV_GROUPS
        .map((g) => ({ ...g, items: g.items.filter((i) => i.action ? true : canSee(i.href)) }))
        .filter((g) => g.items.length > 0);

    return { groups, canSee };
}

/* ── DESKTOP: horizontal menu bar with dropdowns ── */
export function DesktopNavMenu() {
    const pathname = usePathname();
    const router = useRouter();
    const { groups, canSee } = useVisibleGroups();
    const [open, setOpen] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    useEffect(() => { setOpen(null); }, [pathname]);

    const doLogout = () => { authService.logout(); router.push('/login'); };
    const isActive = (href: string) => !!href && (pathname === href || pathname.startsWith(href + '/'));
    const groupActive = (g: Group) => g.items.some((i) => isActive(i.href));
    const standalone = STANDALONE_ITEMS.filter((s) => canSee(s.href));

    return (
        <div ref={ref} className="hidden md:flex items-center gap-0.5 h-12 px-4 lg:px-6 bg-white/95 backdrop-blur border-b border-slate-100 shadow-[0_1px_2px_rgba(15,23,42,0.03)] z-[45] print:hidden">
            <Link
                href="/admin/dashboard"
                className={cn('flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-bold transition-all',
                    pathname === '/admin/dashboard' ? 'bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-inset ring-[#F59E0B]/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
            >
                <LayoutDashboard size={15} /> Dashboard
            </Link>

            <span className="mx-1.5 h-6 w-px bg-slate-200/70" />

            {groups.map((g) => (
                <div key={g.label} className="relative" onMouseEnter={() => setOpen(g.label)}>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => (o === g.label ? null : g.label))}
                        className={cn('flex items-center gap-1 h-9 px-3.5 rounded-lg text-[13px] font-bold transition-all',
                            groupActive(g) || open === g.label ? 'bg-[#F59E0B]/10 text-[#B4780B] ring-1 ring-inset ring-[#F59E0B]/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
                    >
                        {g.label}
                        <ChevronDown size={13} className={cn('transition-transform duration-200', open === g.label && 'rotate-180')} />
                    </button>
                    {open === g.label && (
                        <div
                            className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl border border-slate-200 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] py-1.5 z-[70] animate-in fade-in slide-in-from-top-1 duration-150"
                            onMouseLeave={() => setOpen(null)}
                        >
                            {g.items.map((it) => {
                                const Icon = it.icon;
                                const active = isActive(it.href);
                                const cls = cn('flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium transition-colors text-left',
                                    it.action === 'logout' ? 'text-rose-600 hover:bg-rose-50'
                                        : active ? 'bg-[#F59E0B]/10 text-[#B4780B]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900');
                                const iconBox = (
                                    <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                                        it.action === 'logout' ? 'bg-rose-50 text-rose-500'
                                            : active ? 'bg-[#F59E0B]/15 text-[#B4780B]' : 'bg-slate-50 text-slate-400')}>
                                        <Icon size={14} />
                                    </div>
                                );
                                return it.action === 'logout' ? (
                                    <button key="logout" type="button" onClick={() => { setOpen(null); doLogout(); }} className={cls}>
                                        {iconBox}{it.name}
                                    </button>
                                ) : (
                                    <Link key={it.href} href={it.href} onClick={() => setOpen(null)} className={cls}>
                                        {iconBox}{it.name}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}

            {/* Stand-alone accent pills (Reports · Payments · Order Tracking), far right */}
            {standalone.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5">
                    {standalone.map((s) => {
                        const SIcon = s.icon;
                        return (
                            <Link
                                key={s.href}
                                href={s.href}
                                className={cn('flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-bold transition-all border',
                                    isActive(s.href) ? s.accentActive : s.accent)}
                            >
                                <SIcon size={15} /> {s.name}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── MOBILE: slide-in accordion drawer ── */
export function MobileNavMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { groups, canSee } = useVisibleGroups();
    const [expanded, setExpanded] = useState<string | null>('Sales');
    if (!open) return null;
    const isActive = (href: string) => !!href && (pathname === href || pathname.startsWith(href + '/'));
    const doLogout = () => { onClose(); authService.logout(); router.push('/login'); };

    return (
        <div className="fixed inset-0 z-[200] md:hidden print:hidden flex">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 h-full w-[280px] max-w-[82vw] bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
                <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 sticky top-0 bg-white">
                    <span className="font-extrabold text-[15px] tracking-wide text-slate-800">AL-QAVI <span className="text-[#B4780B]">HUB</span></span>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </div>

                <div className="py-2">
                    <Link href="/admin/dashboard" onClick={onClose}
                        className={cn('flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-bold',
                            pathname === '/admin/dashboard' ? 'bg-[#F59E0B]/10 text-[#B4780B]' : 'text-slate-700')}>
                        <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    {canSee('/admin/tracking') && (
                        <Link href="/admin/tracking" onClick={onClose}
                            className={cn('flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-bold',
                                isActive('/admin/tracking') ? 'bg-sky-50 text-sky-700' : 'text-slate-700')}>
                            <Truck size={16} /> Order Tracking
                        </Link>
                    )}

                    {groups.map((g) => (
                        <div key={g.label} className="border-t border-slate-50">
                            <button
                                onClick={() => setExpanded((e) => (e === g.label ? null : g.label))}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-slate-500"
                            >
                                {g.label}
                                <ChevronRight size={14} className={cn('transition-transform', expanded === g.label && 'rotate-90')} />
                            </button>
                            {expanded === g.label && (
                                <div className="pb-1">
                                    {g.items.map((it) => {
                                        const Icon = it.icon;
                                        const active = isActive(it.href);
                                        if (it.action === 'logout') {
                                            return (
                                                <button key="logout" type="button" onClick={doLogout}
                                                    className="flex w-full items-center gap-2.5 pl-6 pr-4 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 text-left">
                                                    <Icon size={15} className="text-rose-500" />
                                                    {it.name}
                                                </button>
                                            );
                                        }
                                        return (
                                            <Link key={it.href} href={it.href} onClick={onClose}
                                                className={cn('flex items-center gap-2.5 pl-6 pr-4 py-2 text-[13px] font-medium',
                                                    active ? 'bg-[#F59E0B]/10 text-[#B4780B]' : 'text-slate-600 hover:bg-slate-50')}>
                                                <Icon size={15} className={active ? 'text-[#B4780B]' : 'text-slate-400'} />
                                                {it.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
