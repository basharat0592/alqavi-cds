'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, PackagePlus, TrendingUp, Globe, ScanLine,
    Boxes, Settings, UserCheck, ShoppingBag,
    ShoppingCart, History, RefreshCcw,
    ShieldCheck, BarChart3, Store, RotateCcw, User, Users, UserCog, CreditCard,
    Truck, FileText, AlertTriangle, X, ArrowDownLeft, ArrowUpRight, MapPin, Building2, ChevronDown
} from 'lucide-react';
import cmsService from '@/services/cms.service';
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

    return (
        <>
            <style>{`
                .sb-root {
                    font-family: var(--font-inter), 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
                    font-feature-settings: 'cv05' 1, 'ss01' 1;
                    -webkit-font-smoothing: antialiased;
                }

                .sidebar-scroll::-webkit-scrollbar { width: 4px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 99px; }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }

                /* Opening a group fades its rows in. Done with a keyframe rather
                   than an animated height: a height transition needs overflow
                   hidden on the wrapper, which would clip the tooltips that the
                   collapsed rail renders outside the sidebar. */
                .sb-reveal > * { animation: sbReveal .18s ease-out both; }
                @keyframes sbReveal { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
                @media (prefers-reduced-motion: reduce) { .sb-reveal > * { animation: none; } }
            `}</style>

            <div className={`sb-root relative h-full flex flex-col flex-shrink-0 z-[60] transition-all duration-300 overflow-hidden bg-[#111827] ${isCollapsed ? 'w-[76px]' : 'w-[268px]'}`}>

                <div className="px-4 py-4 flex-shrink-0 flex items-center gap-3 border-b border-white/[0.07] mb-3">
                    <Link href="/admin/dashboard" onClick={() => onNavigate?.()} className="flex items-center gap-3 min-w-0 flex-1 group/brand">
                        <div className="relative w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#F59E0B] transition-transform duration-200 group-hover/brand:scale-[1.05]">
                            <span className="font-bold text-[15px] text-white tracking-tight">{orgInitials}</span>
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] leading-[1.25] mb-1 text-slate-300">
                                    {orgName ? 'Organization Console' : 'Platform Console'}
                                </span>
                                <span className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-white truncate" title={orgName || PLATFORM_NAME}>
                                    {orgName || PLATFORM_NAME}
                                </span>
                            </div>
                        )}
                    </Link>
                    {/* Close button — mobile only */}
                    <button
                        onClick={onToggle}
                        className="md:hidden p-1.5 rounded-lg transition hover:bg-white/10 text-slate-400 hover:text-white"
                        aria-label="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── NAVIGATION ── */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll pt-5 pb-4">


                    {filteredGroups.map((group, gIdx) => {
                        // The section holding the current page is marked in the secondary
                        // amber, so you can see where you are without hunting for the row.
                        const groupActive = group.items.some(it => isActive(it.href));
                        // Collapsed to an icon rail there is no room for headings, so
                        // the accordion does not apply and every icon stays reachable.
                        const groupOpen = isCollapsed || (openGroups[group.label] ?? groupActive);
                        return (
                        <div key={group.label} className={`${gIdx !== 0 ? 'mt-2.5' : ''} ${isCollapsed
                            ? ''
                            : 'mx-3 rounded-xl border border-white/[0.09] bg-white/[0.025] overflow-hidden'}`}>
                            {!isCollapsed && (
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.label, groupOpen)}
                                    aria-expanded={groupOpen}
                                    className="group/hdr w-full px-3.5 py-3 flex items-center gap-2.5 hover:bg-white/[0.045] transition-colors" 
                                >
                                    <span className={`text-[12.5px] font-semibold uppercase tracking-[0.07em] transition-colors ${groupActive ? 'text-white' : 'text-slate-300 group-hover/hdr:text-white'}`}>
                                        {group.label}
                                    </span>
                                    {/* A closed group that holds the current page still says so. */}
                                    {groupActive && !groupOpen && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                                    )}
                                    <ChevronDown
                                        size={16}
                                        className={`ml-auto shrink-0 transition-all duration-200 ${groupOpen ? 'rotate-180' : ''} text-slate-400 group-hover/hdr:text-slate-200`}
                                    />
                                </button>
                            )}
                            {isCollapsed && gIdx !== 0 && (
                                <div className="mx-3 mb-1 h-px bg-white/5" />
                            )}

                            <div className={`space-y-1 ${isCollapsed ? 'px-3' : 'px-2 pt-2 pb-2 border-t border-white/[0.07]'} ${groupOpen ? 'sb-reveal' : 'hidden'}`}>
                                {group.items.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => onNavigate?.()}
                                            className={`group relative flex items-center gap-3 rounded-lg overflow-visible transition-colors duration-150 ${isCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-[11px]'} ${active
                                                ? 'bg-[#243349]'
                                                : 'hover:bg-white/[0.06]'}`}>

                                            {/* Active left rail, on the row's own edge. */}
                                            {active && (
                                                <span className="absolute left-0 inset-y-[5px] w-[3px] rounded-full bg-[#F59E0B]" />
                                            )}

                                            <item.icon
                                                className={`shrink-0 transition-colors duration-150 ${active ? 'text-[#FBBF24]' : 'text-slate-300 group-hover:text-white'}`}
                                                size={19}
                                            />

                                            {!isCollapsed && (
                                                <span className={`text-[15px] tracking-[-0.006em] whitespace-nowrap truncate transition-colors duration-150 ${active ? 'text-[#FBBF24] font-semibold' : 'text-slate-200 font-medium group-hover:text-white'}`}>
                                                    {item.name}
                                                </span>
                                            )}

                                            {/* Live active-orders badge (blinks) on the Order List link */}
                                            {item.href === '/admin/orders' && activeOrders > 0 && (
                                                <span className={`inline-flex items-center justify-center shrink-0 ${isCollapsed ? 'absolute top-1 right-1.5' : 'relative ml-auto'}`}>
                                                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-60 motion-safe:animate-ping" />
                                                    <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#F59E0B] text-slate-900 text-[10px] font-black tabular-nums shadow-sm shadow-[#F59E0B]/40">
                                                        {activeOrders}
                                                    </span>
                                                </span>
                                            )}

                                            {/* Tooltip when collapsed */}
                                            {isCollapsed && (
                                                <div className="absolute left-full ml-3 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap pointer-events-none
                                                    opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-[100]
                                                    bg-slate-800 text-slate-100 border border-white/10 shadow-lg">
                                                    {item.name}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })}
                </nav>

                {/* ── FOOTER / SETTINGS ── */}
                {isPageAllowed('/admin/settings') && (
                    <div className="flex-shrink-0 px-3 pb-4 pt-3 mt-1 border-t border-white/[0.07]">
                        <Link href="/admin/settings"
                            onClick={() => onNavigate?.()}
                            className={`group relative flex items-center gap-3 rounded-lg transition-colors duration-150 ${isCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-[11px]'} ${isActive('/admin/settings')
                                ? 'bg-[#243349]'
                                : 'hover:bg-white/[0.06]'}`}>

                            {isActive('/admin/settings') && (
                                <span className="absolute left-0 inset-y-[5px] w-[3px] rounded-full bg-[#F59E0B]" />
                            )}

                            <Settings
                                size={19}
                                className={`shrink-0 transition-colors duration-150 ${isActive('/admin/settings') ? 'text-[#FBBF24]' : 'text-slate-300 group-hover:text-white'}`}
                            />

                            {!isCollapsed && (
                                <span className={`text-[15px] tracking-[-0.006em] transition-colors duration-150 ${isActive('/admin/settings') ? 'text-[#FBBF24] font-semibold' : 'text-slate-200 font-medium group-hover:text-white'}`}>
                                    Settings
                                </span>
                            )}

                            {isCollapsed && (
                                <div className="absolute left-full ml-3 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap pointer-events-none
                                    opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-[100]
                                    bg-slate-800 text-slate-100 border border-white/10 shadow-lg">
                                    System Settings
                                </div>
                            )}
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}
