'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, Package, PackagePlus, TrendingUp, Globe, ScanLine,
    Boxes, Settings, UserCheck, ShoppingBag,
    ShoppingCart, History, RefreshCcw,
    ShieldCheck, BarChart3, Store, RotateCcw, User, Users, UserCog, CreditCard,
    Truck, FileText, AlertTriangle, X, ArrowDownLeft, ArrowUpRight, MapPin, Building2, ChevronDown, LogOut, PanelLeftOpen, ChevronsUpDown
} from 'lucide-react';
import cmsService from '@/services/cms.service';
import { getImageUrl } from '@/lib/utils';
import { orderService } from '@/lib/api';
import { authService, sidebarVisibilityKey } from '@/lib/auth';
import { SUPER_ADMIN_HIDDEN_HREFS, SUPER_ONLY_HREFS } from '@/lib/adminPages';

/** The platform itself, which is NOT one of the organizations it hosts —
 *  Al-Qavi is a tenant like any other. Shown only to the Super Admin; a tenant
 *  admin sees their own organization's name in this slot. */
const PLATFORM_NAME = 'Zulfi';

interface NavItem {
    name: string;
    href: string;
    icon: any;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const FULL_ACCESS_ROLES = ['admin', 'superadmin', 'super admin'];


export default function AdminSidebar({ isCollapsed = false, onToggle, onNavigate }: { isCollapsed?: boolean; onToggle?: () => void; onNavigate?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    // The signed-in account, shown in the footer. The top bar only renders on the
    // dashboard now, so this is the one place logout is reachable from every page.
    const [account, setAccount] = useState<{ name: string; role: string; avatar: string | null }>(
        { name: '', role: '', avatar: null });

    useEffect(() => {
        cmsService.getFullState().catch(() => {});
    }, []);

    // Resolve current user's page_permissions from session
    const [userPagePerms, setUserPagePerms] = useState<string[] | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    // The tenant's own organization name, so each admin's console is branded as
    // theirs rather than as the platform. Empty for the Super Admin, who spans
    // every organization and keeps the platform branding.
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        const user = authService.getUser();
        setIsSuperAdmin(authService.isSuperAdmin());
        setAccount({
            name: user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Administrator',
            role: (typeof user?.role === 'string' ? user.role : (user as any)?.role_name) || 'Admin',
            avatar: user?.avatar || null,
        });
        if (user && !authService.isSuperAdmin()) {
            const whs = (user as any).warehouses;
            // More than one organization is possible; joining them keeps the
            // header honest instead of silently showing only the first.
            setOrgName(Array.isArray(whs) && whs.length
                ? whs.map((w: any) => w?.name).filter(Boolean).join(', ')
                : '');
        } else {
            setOrgName('');
        }
        if (!user) { setUserPagePerms(null); return; }
        // role may arrive as the string name (login) or a numeric FK id (a profile
        // refetch); prefer the string, else fall back to role_name.
        const role = (typeof user.role === 'string' ? user.role : (user as any).role_name || '').toLowerCase();
        // Full access by ROLE (Admin/Super Admin) or superuser only — NOT is_staff,
        // since every internal staff role is is_staff but stays page-restricted.
        if (FULL_ACCESS_ROLES.includes(role) || user.is_superuser) {
            setUserPagePerms(null); // null = no restriction
        } else {
            const perms = (user as any).page_permissions;
            setUserPagePerms(Array.isArray(perms) && perms.length > 0 ? perms : null);
        }
    }, [pathname]);

    const menuGroups: NavGroup[] = [
        {
            label: 'Main',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
                { name: 'Sales', href: '/admin/sales', icon: TrendingUp },
                { name: 'Website', href: '/admin/website-settings', icon: Globe },
            ],
        },
        {
            label: 'Inventory',
            items: [
                { name: 'Products', href: '/admin/products', icon: Package },
                { name: 'Add Product', href: '/admin/products/add', icon: PackagePlus },
                { name: 'Stock', href: '/admin/inventory/list', icon: Boxes },
            ],
        },
        {
            label: 'Purchases',
            items: [
                { name: 'New Purchase', href: '/admin/purchases/add', icon: ShoppingCart },
                { name: 'Purchases', href: '/admin/purchases', icon: History },
                { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RefreshCcw },
            ],
        },
        {
            label: 'Sales',
            items: [
                { name: 'POS', href: '/admin/sale', icon: ScanLine },
                { name: 'Payments', href: '/admin/payments', icon: CreditCard },
                { name: 'Income', href: '/admin/income', icon: ArrowDownLeft },
                { name: 'Expense', href: '/admin/expense', icon: ArrowUpRight },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Manage',
            items: [
                { name: 'Organizations', href: '/admin/branches', icon: Building2 },
                { name: 'Suppliers', href: '/admin/company/suppliers', icon: UserCheck },
                { name: 'Customers', href: '/admin/company/customers', icon: Users },
                { name: 'Delivery', href: '/admin/delivery', icon: Truck },
                // Super-admin-only page (SUPER_ONLY_HREFS), so this label is only
                // ever shown on the platform side.
                { name: 'Region', href: '/admin/company/areas', icon: MapPin },
                { name: 'Admins', href: '/admin/users', icon: User },
                { name: 'Roles', href: '/admin/users/roles', icon: ShieldCheck },
                { name: 'Users', href: '/admin/system-users', icon: UserCog },
                { name: 'Alerts', href: '/admin/alerts', icon: AlertTriangle },
            ],
        },
        {
            label: 'Analytics',
            items: [
                { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
            ],
        },
    ];

    // Live count of active (not delivered / cancelled) orders for the branch — shown
    // as a blinking badge on the Order List link. Polled so it stays fresh.
    // Menu groups are accordions and start CLOSED. Only the group holding the
    // current page opens, so the sidebar still shows where you are without
    // listing every page at once.
    //
    // The map holds explicit user toggles only; a group with no entry falls back
    // to "open if it contains the current page". Navigating clears the map, so
    // every page load and every jump starts from that default rather than
    // inheriting whatever was left open.
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    useEffect(() => { setOpenGroups({}); }, [pathname]);
    const toggleGroup = (label: string, isOpen: boolean) =>
        setOpenGroups(prev => ({ ...prev, [label]: !isOpen }));

    const [activeOrders, setActiveOrders] = useState(0);
    useEffect(() => {
        let cancelled = false;
        const loadCount = async () => {
            try {
                const s: any = await orderService.getStats?.();
                if (cancelled || !s) return;
                const n = Number(s.total_active ?? s.pending_orders ?? 0);
                setActiveOrders(isNaN(n) ? 0 : n);
            } catch { /* ignore */ }
        };
        loadCount();
        const id = setInterval(loadCount, 25000);
        const onChange = () => loadCount();
        window.addEventListener('orders_changed', onChange);
        return () => { cancelled = true; clearInterval(id); window.removeEventListener('orders_changed', onChange); };
    }, []);

    const [visibility, setVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const loadVisibility = () => {
            const stored = localStorage.getItem(sidebarVisibilityKey());
            if (stored) {
                setVisibility(JSON.parse(stored));
            } else {
                const defaults: Record<string, boolean> = {};
                menuGroups.forEach(g => g.items.forEach(i => defaults[i.href] = true));
                defaults['/admin/settings'] = true;
                setVisibility(defaults);
            }
        };
        loadVisibility();
        window.addEventListener('sidebar_visibility_change', loadVisibility);
        return () => window.removeEventListener('sidebar_visibility_change', loadVisibility);
    }, [pathname]);

    const isActive = (href: string) => {
        if (typeof window === 'undefined') return pathname === href;
        const fullPath = window.location.pathname + window.location.search;
        return pathname === href || (href !== '/admin/dashboard' && fullPath === href);
    };

    const isPageAllowed = (href: string) => {
        // Operational floor pages are hidden from the Super Admin entirely.
        if (isSuperAdmin && SUPER_ADMIN_HIDDEN_HREFS.includes(href)) return false;
        // Super-Admin-only pages are hidden from branch admins.
        if (!isSuperAdmin && SUPER_ONLY_HREFS.includes(href)) return false;
        if (visibility[href] === false) return false;
        if (userPagePerms === null) return true; // no restriction
        return userPagePerms.includes(href);
    };

    const filteredGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => isPageAllowed(item.href))
    })).filter(group => group.items.length > 0);

    // Two letters for the badge: initials of the organization, or the platform's
    // own "AQ" when there is no organization to speak for.
    const orgInitials = (orgName || PLATFORM_NAME)
        .split(/[\s,]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'Z';

    // Signing out from a nav rail is easy to hit by accident, so confirm first.
    const handleLogout = () => {
        if (!window.confirm('Sign out of the console?')) return;
        authService.logout();
        onNavigate?.();
        router.push('/login');
    };

    const accountInitials = (account.name || 'A')
        .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    /* Rows: the selected one is a solid white pill on the navy, which is the
       single strongest signal available on this ground. */
    const rowCls = (active: boolean) =>
        `group relative flex items-center gap-3 rounded-xl overflow-visible transition-colors duration-150 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'pl-3 pr-2.5 py-[10px]'} ${active
            ? 'bg-white'
            : 'hover:bg-white/[0.07]'}`;
    const rowIconCls = (active: boolean) =>
        `shrink-0 transition-colors duration-150 ${active ? 'text-[#0B1526]' : 'text-[#8FA3BA] group-hover:text-white'}`;
    const rowTextCls = (active: boolean) =>
        `text-[14px] tracking-[-0.01em] whitespace-nowrap truncate transition-colors duration-150 ${active ? 'text-[#0B1526] font-semibold' : 'text-[#C3D0DF] font-medium group-hover:text-white'}`;
    const tooltipCls = `absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap pointer-events-none
        opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-[100]
        bg-white text-[#0B1526] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.45)]`;

    return (
        <>
            <style>{`
                .sb-root {
                    font-family: var(--font-jakarta), 'Plus Jakarta Sans', var(--font-inter), system-ui, -apple-system, 'Segoe UI', sans-serif;
                    -webkit-font-smoothing: antialiased;
                }
                .sidebar-scroll::-webkit-scrollbar { width: 3px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 99px; }
                .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); }
                .sb-reveal > * { animation: sbReveal .18s ease-out both; }
                @keyframes sbReveal { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
                @media (prefers-reduced-motion: reduce) { .sb-reveal > * { animation: none; } }
            `}</style>

            <div className={`sb-root relative h-full flex flex-col flex-shrink-0 z-[60] transition-all duration-300 overflow-hidden bg-[#0B1526] ${isCollapsed ? 'w-[76px]' : 'w-[256px]'}`}>

                {/* ── BRAND CARD ── */}
                <div className={`flex-shrink-0 ${isCollapsed ? 'px-3 pt-3 pb-2' : 'px-3 pt-3 pb-2'}`}>
                    <div className={`flex items-center gap-2.5 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/[0.08] ${isCollapsed ? 'justify-center p-2' : 'p-2.5'}`}>
                        <Link href="/admin/dashboard" onClick={() => onNavigate?.()} className="flex items-center gap-2.5 min-w-0 flex-1 group/brand">
                            <span className="relative w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#1877C2] transition-transform duration-200 group-hover/brand:scale-[1.04]">
                                <Building2 size={19} strokeWidth={2} className="text-white" />
                            </span>
                            {!isCollapsed && (
                                <span className="flex flex-col min-w-0 leading-none">
                                    <span className="text-[14.5px] font-bold tracking-[-0.01em] text-white truncate" title={orgName || PLATFORM_NAME}>
                                        {orgName || PLATFORM_NAME}
                                    </span>
                                    <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[#8FA3BA] truncate">
                                        <span className="w-1 h-1 rounded-full bg-[#1877C2] shrink-0" />
                                        {orgName ? 'Skärdu Main S01' : 'Platform console'}
                                    </span>
                                </span>
                            )}
                        </Link>
                        {!isCollapsed && (
                            <button
                                onClick={onToggle}
                                title="Collapse sidebar"
                                aria-label="Collapse sidebar"
                                className="hidden md:flex w-7 h-7 shrink-0 rounded-lg items-center justify-center text-[#8FA3BA] hover:text-white hover:bg-white/[0.10] transition-colors"
                            >
                                <ChevronsUpDown size={15} strokeWidth={2} />
                            </button>
                        )}
                        <button
                            onClick={onToggle}
                            className="md:hidden p-1.5 rounded-lg transition hover:bg-white/[0.10] text-[#8FA3BA] hover:text-white"
                            aria-label="Close sidebar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {isCollapsed && (
                    <button
                        onClick={onToggle}
                        title="Expand sidebar"
                        aria-label="Expand sidebar"
                        className="hidden md:flex mx-auto mb-1 w-9 h-9 rounded-xl items-center justify-center text-[#8FA3BA] hover:text-white hover:bg-white/[0.10] transition-colors"
                    >
                        <PanelLeftOpen size={17} strokeWidth={1.8} />
                    </button>
                )}

                {/* ── NAVIGATION ── */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll px-3 pt-2 pb-4">
                    {filteredGroups.map((group, gIdx) => {
                        const groupActive = group.items.some(it => isActive(it.href));
                        const groupOpen = isCollapsed || (openGroups[group.label] ?? true);
                        return (
                        <div key={group.label} className={gIdx !== 0 ? 'mt-5' : 'mt-1'}>
                            {!isCollapsed && (
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.label, groupOpen)}
                                    aria-expanded={groupOpen}
                                    className="group/hdr w-full px-2 pb-2 flex items-center gap-1.5 text-left"
                                >
                                    <span className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${groupActive ? 'text-[#8FA3BA]' : 'text-[#5B7089] group-hover/hdr:text-[#8FA3BA]'}`}>
                                        {group.label}
                                    </span>
                                    <ChevronDown
                                        size={13}
                                        className={`ml-auto shrink-0 transition-all duration-200 text-[#5B7089] opacity-0 group-hover/hdr:opacity-100 ${groupOpen ? '' : '-rotate-90'}`}
                                    />
                                </button>
                            )}
                            {isCollapsed && gIdx !== 0 && <div className="mx-2 my-2 h-px bg-white/[0.08]" />}

                            <div className={`space-y-1 ${groupOpen ? 'sb-reveal' : 'hidden'}`}>
                                {group.items.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => onNavigate?.()}
                                            className={rowCls(active)}>

                                            <item.icon className={rowIconCls(active)} size={18} strokeWidth={1.9} />

                                            {!isCollapsed && <span className={rowTextCls(active)}>{item.name}</span>}

                                            {item.href === '/admin/orders' && activeOrders > 0 && (
                                                <span className={`inline-flex items-center justify-center shrink-0 ${isCollapsed ? 'absolute top-0.5 right-1' : 'relative ml-auto'}`}>
                                                    <span className="relative inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#1877C2] text-white text-[11.5px] font-bold tabular-nums">
                                                        {activeOrders}
                                                    </span>
                                                </span>
                                            )}

                                            {isCollapsed && <div className={tooltipCls}>{item.name}</div>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })}
                </nav>

                {/* ── FOOTER ── */}
                <div className="flex-shrink-0 px-3 pt-2 pb-3 border-t border-white/[0.08]">
                    {isPageAllowed('/admin/settings') && (
                        <Link href="/admin/settings"
                            onClick={() => onNavigate?.()}
                            className={rowCls(isActive('/admin/settings'))}>
                            <Settings size={18} strokeWidth={1.9} className={rowIconCls(isActive('/admin/settings'))} />
                            {!isCollapsed && <span className={rowTextCls(isActive('/admin/settings'))}>Settings</span>}
                            {isCollapsed && <div className={tooltipCls}>System Settings</div>}
                        </Link>
                    )}

                    <div className={`mt-2 ${isCollapsed ? 'flex flex-col items-center gap-1.5' : 'group/acct flex items-center gap-2.5 pl-1 pr-1 py-1.5 rounded-xl transition-colors hover:bg-white/[0.06]'}`}>
                        <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden bg-[#1877C2] flex items-center justify-center">
                            {account.avatar
                                ? <img src={getImageUrl(account.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                : <User size={17} strokeWidth={2} className="text-white" />}
                        </div>

                        {!isCollapsed && (
                            <>
                                <div className="min-w-0 flex-1 leading-none">
                                    <p className="text-[13px] font-bold tracking-[-0.01em] text-white truncate" title={account.name}>
                                        {account.name}
                                    </p>
                                    <span className="block mt-1.5 text-[11px] font-medium text-[#8FA3BA] truncate">
                                        {accountInitials ? 'Admin Terminal' : ''}
                                    </span>
                                </div>
                                <span className="shrink-0 inline-flex items-center h-[22px] px-2.5 rounded-full bg-white/[0.10] text-[10.5px] font-bold capitalize text-[#C3D0DF]">
                                    {account.role}
                                </span>
                            </>
                        )}

                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            aria-label="Sign out"
                            className="group relative shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#8FA3BA] hover:text-white hover:bg-[#DC2626] transition-colors"
                        >
                            <LogOut size={15} strokeWidth={2} />
                            {isCollapsed && <div className={tooltipCls}>Sign out</div>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
