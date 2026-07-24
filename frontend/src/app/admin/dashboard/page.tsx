"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package, TrendingUp,
    Boxes, ChevronRight, Settings, UserCheck,
    ShoppingCart, History, RefreshCcw,
    ShieldCheck, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    Truck, AlertTriangle, Globe,
    ScanLine, ClipboardList, PackagePlus,
    ArrowDownLeft, ArrowUpRight, Building2,
    MapPin, Bell, Bike, CalendarClock, Search, LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';
import { useAdminDashboard } from '@/hooks';
import SuperAdminCharts from '@/components/admin/SuperAdminCharts';
import { NAV_GROUPS, STANDALONE_ITEMS } from '@/components/layout/AdminNavMenu';
import { gradientFor, gradientCss } from '@/lib/tileTheme';
import { authService, sidebarVisibilityKey } from '@/lib/auth';
import { SUPER_ADMIN_HIDDEN_HREFS } from '@/lib/adminPages';
import { inventoryService, companyService, supplierService } from '@/lib/api';
import { paymentsDueService } from '@/services/payment.service';

// Dashboard cards/links only a Super Admin should see (cross-branch administration).
// Branch admins run day-to-day ops and don't manage branches, staff, roles or
// global config, so these are hidden from their dashboard.
const SUPER_ONLY_HREFS = new Set<string>([
    '/admin/branches',
    '/admin/users',
    '/admin/users/roles',
    '/admin/settings',
    '/admin/website-settings',
    '/admin/inventory/warehouses',
    '/admin/company/areas',
    '/admin/income',   // branch admins use the unified Global Payments page
    '/admin/expense',  // branch admins use the unified Global Payments page
]);

// On mobile the Super Admin already has these in the fixed bottom tab bar, so the
// duplicate dashboard cards are hidden there (still shown on desktop).
const SUPER_MOBILE_HIDDEN_CARD_HREFS = new Set<string>([
    '/admin/users', '/admin/branches', '/admin/website-settings', '/admin/settings',
]);

// For a Branch Admin, only the day-to-day essentials stay as prominent cards; the
// rest drop into the "Other Pages" list. Tweak this set to change what's featured.
const BRANCH_ADMIN_IMPORTANT_HREFS = new Set<string>([
    // Sales & Orders
    '/admin/sale',            // Point of Sale
    '/admin/sales',           // Sales History
    '/admin/sale-returns',    // Sale Returns
    '/admin/orders',          // Order List
    '/admin/tracking',        // Order Tracking
    // Purchasing & Inventory
    '/admin/purchases/add',   // New Purchase Order
    '/admin/inventory/list',  // Current Stocks
    '/admin/purchases',       // Purchase History
    '/admin/products',        // Product List
    '/admin/purchases/returns', // Purchase Returns
    '/admin/products/add',    // Add Product
    // Finance & Reports
    '/admin/income',          // Income
    '/admin/expense',         // Expense
    '/admin/payments',        // Global Payments
    '/admin/reports',         // Reports Center
]);

interface PageButton {
    name: string;
    desc?: string;
    href: string;
    icon: any;
    theme?: {
        border: string;
        iconBg: string;
        leftBar: string;
        chevron: string;
        hoverGlow: string;
    };
    keywords: string[];
}

interface GroupSection {
    title: string;
    items: Omit<PageButton, 'theme'>[];
}

/* Mobile welcome-hero avatar → tap for Profile / Logout. */
function MobileProfileMenu() {
    const [open, setOpen] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const router = useRouter();
    const user = authService.getUser() as any;
    const name = (user?.name || '').trim();
    const avatar = user?.avatar || null;

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const logout = () => { authService.logout(); router.push('/login'); };

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-label="Account"
                className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-[0_4px_12px_rgba(15,23,42,0.22)] bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-[16px] flex items-center justify-center active:scale-95 transition-transform"
            >
                {avatar
                    ? <img src={getImageUrl(avatar) || ''} alt="Profile" className="w-full h-full object-cover" />
                    : (name ? name[0].toUpperCase() : 'A')}
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] border border-slate-100 py-1.5 z-[60] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{name || 'Account'}</p>
                        <p className="text-[11px] text-slate-400">Signed in</p>
                    </div>
                    <Link href="/admin/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                        <User size={16} className="text-slate-400" /> Profile
                    </Link>
                    <button type="button" onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 text-left">
                        <LogOut size={16} className="text-rose-500" /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}

/* Module-level flag: the hand waves once per real page load. It survives in-app
   navigation (same JS runtime), so returning to the dashboard from another page
   does NOT replay it — only a full refresh/first open resets it. */
let handWavePlayed = false;

/* Shared mobile welcome hero (branch + super admin) with the profile avatar. */
function MobileWelcomeHero({ subtitle }: { subtitle: string }) {
    const nm = ((authService.getUser() as any)?.name || '').trim();
    const first = nm ? nm.split(' ')[0] : '';
    const [animate] = useState(() => !handWavePlayed);
    useEffect(() => { handWavePlayed = true; }, []);
    const handCls = `align-middle ml-4${animate ? ' wave-hand' : ''}`;
    return (
        <div className="md:hidden pt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Welcome back</p>
                <h1 className="text-[26px] font-black text-slate-900 leading-[1.15] mt-0.5">
                    {first
                        ? <>Hi, <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{first}</span> <span className={handCls}>👋</span></>
                        : <>Hello there <span className={handCls}>👋</span></>}
                </h1>
                <p className="text-[12.5px] text-slate-500 mt-1">{subtitle}</p>
            </div>
            <MobileProfileMenu />
        </div>
    );
}

export default function AdminDashboard() {
    const { stats, products, lowStock: serverLowStock, loading, revenueData30 } = useAdminDashboard();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    // Pages this user may open (null = full access). Mirrors the sidebar so the
    // dashboard only shows cards for pages the user actually has access to.
    const [userPagePerms, setUserPagePerms] = useState<string[] | null>(null);
    const [rightTab, setRightTab] = useState<'low_stock' | 'payments_due'>('low_stock');
    useEffect(() => {
        setIsSuperAdmin(authService.isSuperAdmin());
        const u: any = authService.getUser();
        const role = (typeof u?.role === 'string' ? u.role : u?.role_name || '').toLowerCase();
        if (['admin', 'super admin', 'superadmin'].includes(role) || u?.is_superuser) {
            setUserPagePerms(null); // full access — no page restriction
        } else {
            const perms = u?.page_permissions;
            setUserPagePerms(Array.isArray(perms) && perms.length > 0 ? perms : null);
        }
    }, []);

    // Cross-branch counts for the Super Admin "Business Overview" panel. Branches,
    // customers and suppliers aren't in the dashboard stats payload, so fetch them
    // directly (products & employees come from the dashboard hook). null = still loading.
    const [overviewCounts, setOverviewCounts] = useState<{ branches: number | null; customers: number | null; suppliers: number | null }>({ branches: null, customers: null, suppliers: null });
    useEffect(() => {
        if (!isSuperAdmin) return;
        let cancelled = false;
        const len = (r: any) => (Array.isArray(r) ? r.length : (r?.results?.length ?? r?.count ?? 0));
        (async () => {
            const [wh, cust, sup] = await Promise.all([
                inventoryService.getWarehouses().catch(() => []),
                companyService.getCustomers().catch(() => []),
                supplierService.getAll().catch(() => []),
            ]);
            if (cancelled) return;
            setOverviewCounts({ branches: len(wh), customers: len(cust), suppliers: len(sup) });
        })();
        return () => { cancelled = true; };
    }, [isSuperAdmin]);

    // Payments Due (receivables) widget — branch admin only. Shows sales with an
    // outstanding balance, filtered by how soon they fall due.
    const money = (n: number) => `Rs ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const DUE_WINDOWS: { k: string; label: string; days: number }[] = [
        { k: 'overdue', label: 'Overdue only', days: -1 },
        { k: '12h', label: 'Due within 12 hours', days: 0 },
        { k: '1d', label: 'Due within 1 day', days: 1 },
        { k: '2d', label: 'Due within 2 days', days: 2 },
        { k: '3d', label: 'Due within 3 days', days: 3 },
        { k: '1w', label: 'Due within 1 week', days: 7 },
        { k: '1m', label: 'Due within 1 month', days: 30 },
        { k: 'all', label: 'All upcoming', days: 99999 },
    ];
    const [due, setDue] = useState<any[]>([]);
    const [dueWindow, setDueWindow] = useState<string>('3d');
    const [dueSearch, setDueSearch] = useState('');
    useEffect(() => {
        if (isSuperAdmin) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await paymentsDueService.get('all');
                if (!cancelled) setDue(Array.isArray(res?.results) ? res.results : []);
            } catch { if (!cancelled) setDue([]); }
        })();
        return () => { cancelled = true; };
    }, [isSuperAdmin]);

    // Whole-day delta from today (negative = overdue, 0 = due today).
    const daysUntilDue = (d: any) => {
        if (!d?.due_date) return Infinity;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dd = new Date(d.due_date); dd.setHours(0, 0, 0, 0);
        return Math.round((dd.getTime() - today.getTime()) / 86400000);
    };
    const dueLabel = (d: any) => {
        const n = daysUntilDue(d);
        if (!isFinite(n)) return '—';
        if (n < 0) return `${Math.abs(n)}d late`;
        if (n === 0) return 'Today';
        if (n === 1) return 'Tomorrow';
        return `${n}d left`;
    };
    const dueRows = useMemo(() => {
        // Receivables = money customers owe us (sales with a balance).
        let rows = (due || []).filter((d: any) => d.type === 'sale' && d.due_date);
        const win = DUE_WINDOWS.find((w) => w.k === dueWindow) || DUE_WINDOWS[4];
        if (dueWindow === 'overdue') rows = rows.filter((d: any) => daysUntilDue(d) < 0);
        else rows = rows.filter((d: any) => daysUntilDue(d) <= win.days); // overdue always included
        const q = dueSearch.trim().toLowerCase();
        if (q) rows = rows.filter((d: any) =>
            (d.party || '').toLowerCase().includes(q) || (d.products || '').toLowerCase().includes(q));
        // Most urgent first (soonest / most overdue at the top).
        return rows.slice().sort((a: any, b: any) => daysUntilDue(a) - daysUntilDue(b));
    }, [due, dueWindow, dueSearch]);
    const dueOverdueCount = useMemo(() => dueRows.filter((d: any) => daysUntilDue(d) < 0).length, [dueRows]);

    // Sidebar-visibility toggles (System Settings → Sidebar Pages) hide pages here too.
    const [sidebarVisibility, setSidebarVisibility] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const load = () => {
            try { const s = localStorage.getItem(sidebarVisibilityKey()); setSidebarVisibility(s ? JSON.parse(s) : {}); }
            catch { setSidebarVisibility({}); }
        };
        load();
        window.addEventListener('sidebar_visibility_change', load);
        window.addEventListener('storage', load);
        return () => {
            window.removeEventListener('sidebar_visibility_change', load);
            window.removeEventListener('storage', load);
        };
    }, []);

    // A card/link is visible if it's not super-admin-only (or the viewer is a super
    // admin), it isn't an operational page hidden from the super admin, AND it isn't
    // toggled off in the sidebar-visibility settings.
    const canSee = (href: string) => {
        const base = href.split('?')[0];
        return (isSuperAdmin || !SUPER_ONLY_HREFS.has(base)) &&
            !(isSuperAdmin && SUPER_ADMIN_HIDDEN_HREFS.includes(base)) &&
            sidebarVisibility[base] !== false &&
            (userPagePerms === null || userPagePerms.includes(base));
    };

    // ── CORE OPERATIONS & KEY PAGES (PROMINENT BUTTONS) ──
    const corePages: PageButton[] = [
        {
            name: 'Point of Sale (POS)',
            desc: 'Sell at the counter',
            href: '/admin/sale',
            icon: ScanLine,
            theme: {
                border: 'hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
            },
            keywords: ['counter', 'cashier', 'barcode', 'checkout', 'pos', 'sales']
        },
        {
            name: 'New Purchase Order',
            desc: 'Restock your inventory',
            href: '/admin/purchases/add',
            icon: ShoppingCart,
            theme: {
                border: 'hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['draft', 'buy', 'stock order', 'procurement', 'purchase']
        },
        {
            name: 'Reports Center',
            desc: 'Analytics & insights',
            href: '/admin/reports',
            icon: BarChart3,
            theme: {
                border: 'hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['hub', 'audits', 'graphs', 'reports']
        },
        {
            name: 'Income',
            desc: 'Money coming in',
            href: '/admin/income',
            icon: ArrowDownLeft,
            theme: {
                border: 'hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['income', 'money in', 'revenue', 'earnings', 'inbound']
        },
        {
            name: 'Expense',
            desc: 'Money going out',
            href: '/admin/expense',
            icon: ArrowUpRight,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['expense', 'money out', 'spending', 'costs', 'outbound']
        },
        {
            name: 'Sales History',
            desc: 'Past sales & revenue',
            href: '/admin/sales',
            icon: TrendingUp,
            theme: {
                border: 'hover:border-teal-500',
                iconBg: 'bg-teal-50 border-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)]',
                leftBar: 'bg-teal-600',
                chevron: 'text-teal-400 group-hover:text-teal-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(20,184,166,0.06)]'
            },
            keywords: ['sales list', 'transactions', 'revenue ledger', 'sales history']
        },
        {
            name: 'Sale Returns',
            desc: 'Customer returns & refunds',
            href: '/admin/sale-returns',
            icon: RotateCcw,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['returns', 'refunds', 'customer returns', 'sale returns']
        },
        {
            name: 'Purchase History',
            desc: 'Past supplier orders',
            href: '/admin/purchases',
            icon: History,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['expenses', 'vendor orders', 'invoices', 'purchase history']
        },
        {
            name: 'Purchase Returns',
            desc: 'Return goods to suppliers',
            href: '/admin/purchases/returns',
            icon: RefreshCcw,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['refunds', 'damaged', 'shipback', 'purchase returns', 'supplier returns']
        },
        {
            name: 'Recent Orders',
            desc: 'Active orders in progress',
            href: '/admin/orders',
            icon: ClipboardList,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['orders', 'shipping', 'list']
        },
        {
            name: 'Order Tracking',
            desc: 'Delivery & dispatch status',
            href: '/admin/tracking',
            icon: Truck,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(2,132,199,0.06)]'
            },
            keywords: ['delivery', 'courier', 'dispatch', 'order tracking']
        },
        {
            name: 'Admins',
            desc: 'Staff logins & accounts',
            href: '/admin/users',
            icon: User,
            theme: {
                border: 'hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['staff', 'logins', 'accounts', 'internal users']
        },
        {
            name: 'Live Products',
            desc: 'Catalog & SKUs',
            href: '/admin/products',
            icon: Package,
            theme: {
                border: 'hover:border-teal-500',
                iconBg: 'bg-teal-50 border-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)]',
                leftBar: 'bg-teal-600',
                chevron: 'text-teal-400 group-hover:text-teal-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(20,184,166,0.06)]'
            },
            keywords: ['items', 'catalog', 'skus', 'edit']
        },
        {
            name: 'Add Listing',
            desc: 'Create a new item',
            href: '/admin/products/add',
            icon: PackagePlus,
            theme: {
                border: 'hover:border-green-500',
                iconBg: 'bg-green-50 border-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(22,163,74,0.2)]',
                leftBar: 'bg-green-600',
                chevron: 'text-green-400 group-hover:text-green-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(22,163,74,0.06)]'
            },
            keywords: ['create', 'new item', 'upload', 'add product']
        },
        {
            name: 'Current Stocks',
            desc: 'Live stock levels',
            href: '/admin/inventory/list',
            icon: Boxes,
            theme: {
                border: 'hover:border-orange-500',
                iconBg: 'bg-orange-50 border-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(234,88,12,0.2)]',
                leftBar: 'bg-orange-600',
                chevron: 'text-orange-400 group-hover:text-orange-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(234,88,12,0.06)]'
            },
            keywords: ['volumes', 'quantities', 'adjustments', 'stock', 'inventory']
        },
        {
            name: 'Add Stock',
            desc: 'Record new stock arrivals',
            href: '/admin/inventory/list?action=add',
            icon: PackagePlus,
            theme: {
                border: 'hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(79,70,229,0.06)]'
            },
            keywords: ['add stock', 'new stock', 'incoming', 'inventory', 'receive']
        },
        {
            name: 'Website CMS',
            desc: 'Storefront content & banners',
            href: '/admin/website-settings',
            icon: Globe,
            theme: {
                border: 'hover:border-cyan-500',
                iconBg: 'bg-cyan-50 border-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(6,182,212,0.2)]',
                leftBar: 'bg-cyan-600',
                chevron: 'text-cyan-400 group-hover:text-cyan-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(6,182,212,0.06)]'
            },
            keywords: ['slider', 'banners', 'content', 'seo', 'footer', 'cms', 'website', 'storefront', 'landing']
        },
        {
            name: 'System Settings',
            desc: 'Configure the system',
            href: '/admin/settings',
            icon: Settings,
            theme: {
                border: 'hover:border-slate-500',
                iconBg: 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-slate-700 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(71,85,105,0.2)]',
                leftBar: 'bg-slate-700',
                chevron: 'text-slate-400 group-hover:text-slate-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(71,85,105,0.06)]'
            },
            keywords: ['config', 'sidebar', 'site details', 'settings', 'configure']
        },
        {
            name: 'Branches',
            desc: 'Assign warehouses to admins',
            href: '/admin/branches',
            icon: Building2,
            theme: {
                border: 'hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
            },
            keywords: ['branch', 'branches', 'city', 'assign', 'warehouse admin', 'multi branch']
        },
        {
            name: 'Supplier Registry',
            desc: 'Vendors & manufacturers',
            href: '/admin/company/suppliers',
            icon: UserCheck,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['vendors', 'manufacturers', 'contacts', 'supplier']
        },
        {
            name: 'Customer Registry',
            desc: 'Clients & profiles',
            href: '/admin/company/customers',
            icon: Users,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(2,132,199,0.06)]'
            },
            keywords: ['clients', 'profiles', 'ledger', 'customer']
        },
        {
            name: 'Warehouses',
            desc: 'Storage & distribution',
            href: '/admin/inventory/warehouses',
            icon: Store,
            theme: {
                border: 'hover:border-orange-500',
                iconBg: 'bg-orange-50 border-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(234,88,12,0.2)]',
                leftBar: 'bg-orange-600',
                chevron: 'text-orange-400 group-hover:text-orange-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(234,88,12,0.06)]'
            },
            keywords: ['storage', 'depots', 'distribution', 'warehouse']
        },
        {
            name: 'Areas / Territories',
            desc: 'Regions & zones',
            href: '/admin/company/areas',
            icon: MapPin,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(2,132,199,0.06)]'
            },
            keywords: ['area', 'territory', 'region', 'zone', 'locality']
        },
        {
            name: 'Global Payments',
            desc: 'Record & track payments',
            href: '/admin/payments',
            icon: CreditCard,
            theme: {
                border: 'hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['payment methods', 'stripe', 'paypal', 'banks', 'global payments']
        },
        {
            name: 'System Alerts',
            desc: 'Errors & warnings',
            href: '/admin/alerts',
            icon: AlertTriangle,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['errors', 'warnings', 'alarms', 'alerts']
        },
        {
            name: 'Notifications',
            desc: 'Events & updates',
            href: '/admin/notifications',
            icon: Bell,
            theme: {
                border: 'hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['alerts', 'events', 'inbox', 'updates', 'notifications']
        },
    ];

    // ── COMPLETE PAGE CATALOG ──
    // Every navigable admin page, grouped by category. This is the single source of
    // truth for the "All Pages" directory at the bottom. Anything already shown as a
    // prominent card up top is filtered out below so nothing appears twice. Add new
    // admin pages here and they automatically show under their category.
    const pageCatalog: GroupSection[] = [
        {
            title: 'Sales & Orders',
            items: [
                { name: 'Point of Sale (POS)', href: '/admin/sale', icon: ScanLine, keywords: ['counter', 'cashier', 'barcode', 'checkout', 'pos'] },
                { name: 'Sales History', href: '/admin/sales', icon: TrendingUp, keywords: ['sales list', 'transactions', 'revenue ledger'] },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw, keywords: ['returns', 'refunds', 'customer returns'] },
                { name: 'Recent Orders', href: '/admin/orders', icon: ClipboardList, keywords: ['orders', 'shipping', 'list', 'recent', 'active'] },
                { name: 'Order Tracking', href: '/admin/tracking', icon: Truck, keywords: ['delivery', 'courier', 'dispatch'] },
                { name: 'Delivery Persons', href: '/admin/delivery', icon: Bike, keywords: ['rider', 'riders', 'courier', 'driver', 'delivery boy'] },
            ]
        },
        {
            title: 'Purchasing & Suppliers',
            items: [
                { name: 'New Purchase Order', href: '/admin/purchases/add', icon: ShoppingCart, keywords: ['draft', 'buy', 'stock order', 'procurement'] },
                { name: 'Purchase History', href: '/admin/purchases', icon: History, keywords: ['expenses', 'vendor orders', 'invoices'] },
                { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RefreshCcw, keywords: ['refunds', 'damaged', 'shipback'] },
                { name: 'Supplier Registry', href: '/admin/company/suppliers', icon: UserCheck, keywords: ['vendors', 'manufacturers', 'contacts'] },
            ]
        },
        {
            title: 'Products & Inventory',
            items: [
                { name: 'Live Products', href: '/admin/products', icon: Package, keywords: ['items', 'catalog', 'skus', 'edit'] },
                { name: 'Add Listing', href: '/admin/products/add', icon: PackagePlus, keywords: ['create', 'new item', 'upload'] },
                { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes, keywords: ['volumes', 'quantities', 'adjustments', 'stock'] },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store, keywords: ['storage', 'depots', 'distribution'] },
            ]
        },
        {
            title: 'Customers',
            items: [
                { name: 'Customer Registry', href: '/admin/company/customers', icon: Users, keywords: ['clients', 'profiles', 'ledger'] },
                { name: 'Areas / Territories', href: '/admin/company/areas', icon: MapPin, keywords: ['area', 'territory', 'region', 'zone', 'locality'] },
            ]
        },
        {
            title: 'Finance',
            items: [
                { name: 'Income', href: '/admin/income', icon: ArrowDownLeft, keywords: ['income', 'money in', 'revenue', 'earnings', 'inbound'] },
                { name: 'Expense', href: '/admin/expense', icon: ArrowUpRight, keywords: ['expense', 'money out', 'spending', 'costs', 'outbound'] },
                { name: 'Global Payments', href: '/admin/payments', icon: CreditCard, keywords: ['payment methods', 'stripe', 'paypal', 'banks'] },
            ]
        },
        {
            title: 'Reports',
            items: [
                { name: 'Reports Center', href: '/admin/reports', icon: BarChart3, keywords: ['hub', 'audits', 'graphs', 'reports'] },
            ]
        },
        {
            title: 'Administration',
            items: [
                { name: 'Branches', href: '/admin/branches', icon: Building2, keywords: ['branch', 'branches', 'city', 'assign', 'warehouse admin', 'multi branch'] },
                { name: 'Admins', href: '/admin/users', icon: User, keywords: ['staff', 'logins', 'accounts'] },
                { name: 'Staff Roles', href: '/admin/users/roles', icon: ShieldCheck, keywords: ['groups', 'privileges', 'ranks'] },
            ]
        },
        {
            title: 'System & CMS',
            items: [
                { name: 'Website CMS', href: '/admin/website-settings', icon: Globe, keywords: ['slider', 'banners', 'content', 'seo', 'footer', 'storefront'] },
                { name: 'System Settings', href: '/admin/settings', icon: Settings, keywords: ['config', 'sidebar visibility', 'site details'] },
                { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle, keywords: ['errors', 'warnings', 'alarms'] },
                { name: 'Notifications', href: '/admin/notifications', icon: Bell, keywords: ['alerts', 'events', 'inbox', 'updates'] },
            ]
        },
    ];

    // Low-stock products. Prefer the branch-scoped feed from the server (driven by
    // this branch's actual warehouse stock); fall back to the global product
    // catalog only if the server didn't provide it.
    const DEFAULT_LOW_STOCK_MIN = 10;
    const lowStock = useMemo(() => {
        if (Array.isArray(serverLowStock) && serverLowStock.length > 0) {
            return serverLowStock.map((p: any) => ({
                ...p,
                _qty: Number(p.qty ?? 0),
                _min: Number(p.min ?? DEFAULT_LOW_STOCK_MIN),
            }));
        }
        return (products || [])
            .map((p: any) => ({
                ...p,
                _qty: Number(p.total_quantity ?? p.available_quantity ?? 0),
                _min: Number(p.min_count ?? DEFAULT_LOW_STOCK_MIN),
            }))
            .filter((p: any) => p._qty <= p._min)
            .sort((a: any, b: any) => a._qty - b._qty)
            .slice(0, 60);
    }, [serverLowStock, products]);

    // ── Group the core button-cards into labeled sections (order = display order) ──
    const CORE_GROUPS: { title: string; hrefs: string[] }[] = [
        { title: 'Sales & Orders', hrefs: ['/admin/sale', '/admin/sales', '/admin/sale-returns', '/admin/orders', '/admin/tracking'] },
        { title: 'Purchasing & Inventory', hrefs: ['/admin/purchases/add', '/admin/purchases', '/admin/purchases/returns', '/admin/products', '/admin/products/add', '/admin/inventory/list'] },
        { title: 'Finance & Reports', hrefs: ['/admin/reports', '/admin/income', '/admin/expense', '/admin/payments'] },
        { title: 'Administration', hrefs: ['/admin/branches', '/admin/users', '/admin/website-settings', '/admin/settings', '/admin/company/suppliers', '/admin/company/customers'] },
    ];

    // The Super Admin sees only oversight pages, so the operational groups above would
    // each render as a lonely 1-card row. Give them their own balanced grouping that
    // fills rows cleanly. Every page here is shown as a prominent card (their dashboard
    // has no "All Pages" directory below).
    const SUPER_ADMIN_CORE_GROUPS: { title: string; hrefs: string[] }[] = [
        { title: 'Administration', hrefs: ['/admin/branches', '/admin/users', '/admin/company/suppliers', '/admin/company/customers', '/admin/company/areas'] },
        { title: 'Finance & Reports', hrefs: ['/admin/reports', '/admin/income', '/admin/expense', '/admin/payments'] },
        { title: 'System & CMS', hrefs: ['/admin/website-settings', '/admin/settings', '/admin/alerts', '/admin/notifications'] },
    ];
    const coreByHref = new Map(corePages.map((p) => [p.href, p]));

    // Whether a core card stays a big prominent button (vs dropping to the list):
    //  - Super admin → every page they can see is a prominent card (the "All Pages"
    //    directory is hidden for them, so the cards are their full menu).
    //  - Branch admin → only the day-to-day essential cards.
    const isPromoted = (_groupTitle: string, href: string) =>
        isSuperAdmin
            ? true
            : BRANCH_ADMIN_IMPORTANT_HREFS.has(href);

    const groupedCore = (isSuperAdmin ? SUPER_ADMIN_CORE_GROUPS : CORE_GROUPS)
        .map((g) => ({
            title: g.title,
            items: (g.hrefs.map((h) => coreByHref.get(h)).filter(Boolean) as PageButton[])
                // Super admin: every page in their groups is a prominent card. Branch
                // admin: only the day-to-day essentials stay prominent.
                .filter((p) => canSee(p.href) && (isSuperAdmin || isPromoted(g.title, p.href))),
        }))
        .filter((g) => g.items.length > 0);

    // Hrefs already shown as big prominent cards up top — excluded from the grouped
    // lists below so nothing appears twice.
    const promotedHrefs = new Set(groupedCore.flatMap((g) => g.items.map((i) => i.href)));

    // "All Pages": the full catalog grouped by category. Drop the prominent cards
    // already shown up top and any super-admin-only page a branch admin can't see,
    // then hide categories that end up empty.
    const groupedOther = pageCatalog
        .map((cat) => ({
            title: cat.title,
            items: cat.items.filter((item) => canSee(item.href) && !promotedHrefs.has(item.href)),
        }))
        .filter((cat) => cat.items.length > 0);
    const totalOtherCount = groupedOther.reduce((n, g) => n + g.items.length, 0);

    // Super-admin oversight panel (replaces the branch admin's Low Stock Alert).
    // Products & employees come from the dashboard hook; branches/customers/suppliers
    // from overviewCounts. `value` is null while that count is still loading.
    const businessOverview: { label: string; value: number | null; icon: any; color: string }[] = [
        { label: 'Total Branches', value: overviewCounts.branches, icon: Building2, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Total Admins', value: stats?.activeUsers ?? null, icon: User, color: 'bg-violet-50 text-violet-600' },
        { label: 'Total Products', value: stats?.totalProducts ?? null, icon: Package, color: 'bg-teal-50 text-teal-600' },
        { label: 'Total Customers', value: overviewCounts.customers, icon: Users, color: 'bg-sky-50 text-sky-600' },
        { label: 'Active Suppliers', value: overviewCounts.suppliers, icon: Truck, color: 'bg-amber-50 text-amber-600' },
    ];

    // A single directory card — reused by the desktop grouped grid and the Super
    // Admin's flattened mobile grid (so Areas/Notifications share one row).
    const renderNavCard = (btn: PageButton) => {
        const Icon = btn.icon;
        const isOrders = btn.href === '/admin/orders';
        const theme = btn.theme;
        return (
            <Link
                key={btn.href}
                href={btn.href}
                className={`group relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white px-3 sm:px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 ${theme?.border || 'hover:border-indigo-500'} ${theme?.hoverGlow || 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'}`}
            >
                <span className={`pointer-events-none absolute left-0 top-0 h-full w-[3px] origin-center scale-y-0 rounded-r-full transition-transform duration-300 ease-out group-hover:scale-y-100 ${theme?.leftBar || 'bg-indigo-600'}`} />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-slate-100/0 transition-colors duration-300 group-hover:to-slate-100/70" />
                <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center border ring-1 ring-inset ring-white/40 transition-all duration-300 ease-out shrink-0 group-hover:scale-105 group-hover:-rotate-3 ${theme?.iconBg || 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                    <Icon strokeWidth={1.75} className="w-4 h-4 sm:w-[17px] sm:h-[17px] transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="relative min-w-0 flex-1">
                    <h3 className="text-[12px] sm:text-[13px] font-semibold text-slate-900 tracking-tight leading-tight truncate">{btn.name}</h3>
                    {btn.desc && (
                        <p className="hidden sm:block text-[10.5px] font-medium text-slate-400 leading-tight truncate mt-0.5 transition-colors duration-300 group-hover:text-slate-500">{btn.desc}</p>
                    )}
                </div>
                <div className="relative flex items-center gap-1.5 shrink-0">
                    {isOrders && (((stats as any)?.totalActive ?? stats?.pendingOrders ?? 0) > 0) && (
                        <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm shadow-rose-600/30 select-none tabular-nums">
                            <span className="absolute inset-0 rounded-full bg-rose-500 opacity-40 motion-safe:animate-ping" style={{ animationDuration: '2.5s' }} />
                            <span className="relative">{(stats as any)?.totalActive ?? stats?.pendingOrders}</span>
                        </span>
                    )}
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-50 transition-all duration-300 group-hover:bg-white group-hover:shadow-sm">
                        <ChevronRight className={`w-3.5 h-3.5 sm:w-[15px] sm:h-[15px] text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 ${theme?.chevron || 'group-hover:text-indigo-600'}`} />
                    </span>
                </div>
            </Link>
        );
    };
    // Super Admin mobile: every visible card that isn't already in the bottom tab bar.
    const superMobileCards = groupedCore.flatMap((g) => g.items).filter((i) => !SUPER_MOBILE_HIDDEN_CARD_HREFS.has(i.href));

    // ── BRANCH-ADMIN DASHBOARD TILES — one clean, consistent button design ──
    type Tile = { name: string; href: string; icon: any; color: string };
    const DASH_TILES: Tile[] = [
        { name: 'POS', href: '/admin/sale', icon: ScanLine, color: '#4F46E5' },
        { name: 'Sales', href: '/admin/sales', icon: TrendingUp, color: '#2563EB' },
        { name: 'Purchase', href: '/admin/purchases/add', icon: ShoppingCart, color: '#059669' },
        { name: 'Stock', href: '/admin/inventory/list', icon: Boxes, color: '#E11D48' },
        { name: 'Recent Orders', href: '/admin/orders', icon: ClipboardList, color: '#0891B2' },
        { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RefreshCcw, color: '#EA580C' },
        { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw, color: '#0D9488' },
        { name: 'Payments', href: '/admin/payments', icon: CreditCard, color: '#7C3AED' },
        { name: 'Reports', href: '/admin/reports', icon: BarChart3, color: '#C026D3' },
        { name: 'Live Products', href: '/admin/products', icon: Package, color: '#D97706' },
        { name: 'Add Listing', href: '/admin/products/add', icon: PackagePlus, color: '#DC2626' },
        { name: 'Purchase History', href: '/admin/purchases', icon: History, color: '#0284C7' },
    ];
    const dashTiles = DASH_TILES.filter((t) => canSee(t.href));

    // Super-admin pill colours (bright, distinct) keyed by page — reuses each page's
    // own icon from `groupedCore`, so the super admin gets the same clean pill buttons.
    const SUPER_TILE_COLOR: Record<string, string> = {
        '/admin/branches': '#4F46E5',
        '/admin/users': '#7C3AED',
        '/admin/company/suppliers': '#D97706',
        '/admin/company/customers': '#0284C7',
        '/admin/company/areas': '#0D9488',
        '/admin/reports': '#C026D3',
        '/admin/income': '#059669',
        '/admin/expense': '#E11D48',
        '/admin/payments': '#6D28D9',
        '/admin/website-settings': '#2563EB',
        '/admin/settings': '#475569',
        '/admin/alerts': '#EA580C',
        '/admin/notifications': '#0891B2',
    };
    const superTileGroups = groupedCore.map((g) => ({
        title: g.title,
        tiles: g.items.map((p) => ({
            name: p.name,
            href: p.href,
            icon: p.icon,
            color: SUPER_TILE_COLOR[p.href] || '#6366f1',
        })),
    }));

    // Clean pill button (matches the reference): bright colour body, white circle +
    // icon poking out on the left, white uppercase label, soft drop shadow.
    const renderTile = (t: Tile) => {
        const Icon = t.icon;
        const g = gradientFor(t.href);
        const active = t.href === '/admin/orders' ? ((stats as any)?.totalActive ?? stats?.pendingOrders ?? 0) : 0;
        return (
            <Link
                key={t.href}
                href={t.href}
                className="group relative flex items-center h-[56px] rounded-full border-2 pl-[54px] pr-6 shadow-[0_3px_10px_-3px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-6px_rgba(15,23,42,0.26)] active:translate-y-0 max-md:!bg-none max-md:!border-[#4338CA]"
                style={{ backgroundColor: '#4F46E5', backgroundImage: gradientCss(g), borderColor: g.ink }}
            >
                <span className="absolute left-[6px] top-1/2 -translate-y-1/2 z-10 w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-[0_5px_14px_rgba(15,23,42,0.45)]">
                    <Icon size={21} strokeWidth={2.8} className="max-md:!text-[#4F46E5]" style={{ color: g.ink }} />
                    {active > 0 && (
                        <span className="absolute -top-1 -right-1 z-20 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-sm tabular-nums">{active}</span>
                    )}
                </span>
                <span className="flex-1 min-w-0 text-slate-900 font-extrabold uppercase tracking-wide text-[13px] leading-[1.12] line-clamp-2 [text-shadow:0_1px_1px_rgba(255,255,255,0.6)] max-md:!text-white max-md:[text-shadow:none]">{t.name}</span>
                <ChevronRight className="shrink-0 w-4 h-4 text-slate-800/70 max-md:!text-white/80 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 max-md:translate-x-0 max-md:opacity-100" />
            </Link>
        );
    };

    // ── MOBILE (branch admin): the 5 nav groups shown on the dashboard as pills;
    //    tapping a group expands its pages as pills too (same clean design). ──
    const NAV_GROUP_META: Record<string, { icon: any; color: string }> = {
        Sales: { icon: TrendingUp, color: '#2563EB' },
        Purchase: { icon: ShoppingCart, color: '#059669' },
        Stock: { icon: Boxes, color: '#E11D48' },
        Accounts: { icon: CreditCard, color: '#7C3AED' },
        Setup: { icon: Settings, color: '#475569' },
    };
    const mobileNavGroups = NAV_GROUPS
        .map((g) => ({ ...g, items: g.items.filter((i) => (i as any).action ? true : canSee(i.href)) }))
        .filter((g) => g.items.length > 0);
    // Payments + Reports get their own pills on the mobile dashboard (Order Tracking
    // stays in the header / drawer, not here).
    const mobileStandalone = STANDALONE_ITEMS.filter((s) => s.href !== '/admin/tracking' && canSee(s.href));

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-slate-800 animate-in fade-in duration-300">
            <div className="max-w-[1440px] mx-auto px-0 md:px-8 pt-1 md:pt-4">
                {/* Super-admin greeting hero (desktop only; mobile uses the shared hero) */}
                {isSuperAdmin && (
                    <div className="hidden md:flex px-3 md:px-0 mb-5 items-center gap-3">
                        <span className="w-11 h-11 rounded-2xl bg-[#232F3E] text-white flex items-center justify-center font-black text-[14px] shrink-0 shadow-sm tracking-tight">AQ</span>
                        <div className="min-w-0">
                            <h1 className="text-[19px] sm:text-[22px] font-bold text-slate-900 leading-tight truncate">
                                Welcome back{(authService.getUser() as any)?.name ? `, ${((authService.getUser() as any).name).split(' ')[0]}` : ''}
                            </h1>
                            <p className="text-[12px] text-slate-500">Your business across all branches</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">

                {/* ── MAIN: DIRECTORY ── */}
                <div className="flex-1 min-w-0 space-y-6 md:space-y-12 animate-in fade-in duration-300 text-left px-3 md:px-0">

                        {/* Shared mobile welcome hero (branch + super admin) */}
                        <MobileWelcomeHero subtitle={isSuperAdmin ? 'Your business across all branches.' : 'Everything you need, one tap away.'} />

                        {/* ── BRANCH ADMIN — MOBILE: 5 nav groups as pills ── */}
                        {!isSuperAdmin && (
                            <div className="md:hidden space-y-4">
                                <div className="space-y-2.5">
                                    {mobileNavGroups.map((g) => {
                                        const meta = NAV_GROUP_META[g.label] || { icon: Boxes, color: '#6366f1' };
                                        const GIcon = meta.icon;
                                        const grad = gradientFor(g.label);
                                        return (
                                            <Link
                                                key={g.label}
                                                href={`/admin/menu/${encodeURIComponent(g.label)}`}
                                                className="w-full relative flex items-center h-[56px] rounded-full border-2 pl-[54px] pr-5 shadow-[0_3px_10px_-3px_rgba(15,23,42,0.18)] transition-all duration-300 active:scale-[0.99]"
                                                style={{ backgroundColor: '#4F46E5', borderColor: '#4338CA' }}
                                            >
                                                <span className="absolute left-[6px] top-1/2 -translate-y-1/2 z-10 w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-[0_5px_14px_rgba(15,23,42,0.45)]">
                                                    <GIcon size={21} strokeWidth={2.8} style={{ color: '#4F46E5' }} />
                                                </span>
                                                <span className="flex-1 min-w-0 text-left text-white font-extrabold uppercase tracking-wide text-[13px]">{g.label}</span>
                                                <span className="shrink-0 text-white/85 text-[11px] font-bold tabular-nums mr-1.5">{g.items.length}</span>
                                                <ChevronRight className="shrink-0 w-4 h-4 text-white/80" />
                                            </Link>
                                        );
                                    })}
                                    {/* Payments + Reports — separate pills (not a group) */}
                                    {mobileStandalone.map((s) => renderTile({ name: s.name, href: s.href, icon: s.icon, color: s.color }))}
                                </div>
                            </div>
                        )}

                        {/* ── BRANCH ADMIN — DESKTOP: flat Quick Actions grid (all modules) ── */}
                        {!isSuperAdmin && (
                            <div className="hidden md:block space-y-3">
                                <div className="flex items-center gap-3 select-none">
                                    <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">Quick Actions</h2>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{dashTiles.length}</span>
                                    <div className="h-px flex-1 bg-slate-200/70" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {dashTiles.map(renderTile)}
                                </div>
                            </div>
                        )}

                        {/* ── SUPER ADMIN: same clean pill buttons, grouped by area ── */}
                        {isSuperAdmin && (
                        <div className="space-y-5 md:space-y-7">
                            {superTileGroups.map((grp) => (
                                <div key={grp.title} className="space-y-3">
                                    <div className="flex items-center gap-3 select-none">
                                        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">{grp.title}</h2>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{grp.tiles.length}</span>
                                        <div className="h-px flex-1 bg-slate-200/70" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {grp.tiles.map(renderTile)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}
                    </div>

                    {/* ── RIGHT: SUPER ADMIN → BUSINESS OVERVIEW · BRANCH ADMIN → LOW STOCK ── */}
                    <aside className={`w-full lg:w-[320px] xl:w-[340px] shrink-0 ${isSuperAdmin ? 'hidden lg:block lg:order-last' : ''}`}>
                        {isSuperAdmin ? (
                        /* Charts stacked vertically in the right column (desktop only). */
                        <SuperAdminCharts revenueData={revenueData30} />
                        ) : (
                        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
                            {/* Tab Switcher at the top */}
                            <div className="flex bg-slate-50 border-b border-slate-100 p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setRightTab('low_stock')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-all ${rightTab === 'low_stock' ? 'bg-white text-rose-600 border border-slate-200/50 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                                >
                                    <AlertTriangle size={13} className={rightTab === 'low_stock' ? 'text-rose-500' : 'text-slate-400'} />
                                    Low Stock ({lowStock.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRightTab('payments_due')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-all ${rightTab === 'payments_due' ? 'bg-white text-amber-600 border border-slate-200/50 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                                >
                                    <CalendarClock size={13} className={rightTab === 'payments_due' ? 'text-amber-500' : 'text-slate-400'} />
                                    Payments Due
                                </button>
                            </div>

                            {/* Tab Content */}
                            {rightTab === 'low_stock' ? (
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center px-5 py-2 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                                        <span className="flex-1">Product</span>
                                        <span className="w-12 text-right">Qty</span>
                                        <span className="w-12 text-right">Min</span>
                                    </div>

                                    <div className="flex-1 max-h-[380px] overflow-y-auto divide-y divide-slate-50">
                                        {loading ? (
                                            <div className="px-5 py-10 text-center text-[12px] text-slate-400">Loading…</div>
                                        ) : lowStock.length === 0 ? (
                                            <div className="px-5 py-10 text-center text-[12px] text-slate-400">
                                                <ShieldCheck size={20} className="mx-auto mb-2 text-emerald-500" />
                                                All products are well stocked.
                                            </div>
                                        ) : (
                                            lowStock.map((p: any) => {
                                                const params = new URLSearchParams();
                                                if (p.supplier) params.set('supplier', String(p.supplier));
                                                if (p.sku) params.set('sku', String(p.sku));
                                                const pName = p.product_name || p.name || '';
                                                if (pName) params.set('product_name', pName);
                                                const qs = params.toString();
                                                return (
                                                    <Link
                                                        key={p.id}
                                                        href={`/admin/purchases/add${qs ? `?${qs}` : ''}`}
                                                        className="group flex items-center px-5 py-2.5 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <span className="flex-1 min-w-0 truncate pr-2 text-[12px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                                                            {pName || 'Unnamed product'}
                                                        </span>
                                                        <span className={`w-12 text-right text-[12.5px] font-black tabular-nums ${p._qty <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                            {p._qty}
                                                        </span>
                                                        <span className="w-12 text-right text-[12px] font-semibold text-slate-400 tabular-nums">{p._min}</span>
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>

                                    <Link
                                        href="/admin/inventory/list"
                                        className="flex items-center justify-center gap-1.5 px-5 py-3 text-[11.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border-t border-slate-100 transition-colors"
                                    >
                                        View full inventory <ChevronRight size={13} />
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col flex-1">
                                    {/* Filters: search + due-window dropdown */}
                                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                                        <div className="relative flex-1 min-w-0">
                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={dueSearch}
                                                onChange={(e) => setDueSearch(e.target.value)}
                                                placeholder="Search…"
                                                className="w-full h-8 pl-7 pr-2 rounded-lg border border-slate-200 text-[11.5px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 bg-white"
                                            />
                                        </div>
                                        <div className="relative shrink-0">
                                            <select
                                                value={dueWindow}
                                                onChange={(e) => setDueWindow(e.target.value)}
                                                className="h-8 pl-2.5 pr-7 rounded-lg border border-slate-200 text-[11.5px] font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 bg-white appearance-none cursor-pointer"
                                            >
                                                {DUE_WINDOWS.map((w) => (
                                                    <option key={w.k} value={w.k}>{w.label}</option>
                                                ))}
                                            </select>
                                            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-slate-400" />
                                        </div>
                                    </div>

                                    <div className="flex-1 max-h-[340px] overflow-y-auto divide-y divide-slate-50">
                                        {loading ? (
                                            <div className="px-5 py-8 text-center text-[12px] text-slate-400">Loading…</div>
                                        ) : dueRows.length === 0 ? (
                                            <div className="px-5 py-8 text-center text-[12px] text-slate-400">
                                                <ShieldCheck size={20} className="mx-auto mb-2 text-emerald-500" />
                                                Nothing due in this window.
                                            </div>
                                        ) : (
                                            dueRows.map((d: any) => {
                                                const n = daysUntilDue(d);
                                                const overdue = n < 0;
                                                const urgent = n >= 0 && n <= 1;
                                                const dot = overdue ? 'bg-rose-500' : urgent ? 'bg-amber-500' : 'bg-slate-300';
                                                const dueColor = overdue ? 'text-rose-600' : urgent ? 'text-amber-600' : 'text-slate-500';
                                                const targetUrl = d.source_type === 'order'
                                                    ? `/admin/sales/${d.source_id}`
                                                    : `/admin/sales?search=${encodeURIComponent(d.ref || '')}`;
                                                return (
                                                    <Link
                                                        key={`${d.source_type}-${d.source_id}`}
                                                        href={targetUrl}
                                                        className="group flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[12px] font-bold text-slate-800 truncate group-hover:text-slate-900">{d.party || 'Walk-in Customer'}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{d.products || `#${d.ref}`}</p>
                                                            <p className="text-[9.5px] font-semibold text-slate-400">
                                                                Paid <span className="text-emerald-600">{money(d.paid)}</span> · #{d.ref}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[12.5px] font-black text-rose-600 tabular-nums leading-tight">{money(d.remaining)}</p>
                                                            <p className={`text-[9.5px] font-bold tabular-nums ${dueColor}`}>{dueLabel(d)}</p>
                                                            <p className="text-[8.5px] text-slate-400 tabular-nums">{new Date(d.due_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                                                        </div>
                                                    </Link>
                                                );
                                            })
                                        )}
                                    </div>

                                    <Link
                                        href="/admin/alerts"
                                        className="flex items-center justify-center gap-1.5 px-5 py-3 text-[11.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border-t border-slate-100 transition-colors"
                                    >
                                        View all dues <ChevronRight size={13} />
                                    </Link>
                                </div>
                            )}
                        </div>
                        )}
                    </aside>
                </div>

                {/* Branch admins now work from the single "Quick Actions" tile section above;
                    the old "All Pages" directory has been removed. */}
            </div>
        </div>
    );
}
