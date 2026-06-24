'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, TrendingUp, Tag,
    Boxes, Settings, UserCheck, ShoppingBag,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    Truck, Book, FileText, AlertTriangle, X, ArrowDownLeft, ArrowUpRight, MapPin
} from 'lucide-react';
import cmsService from '@/services/cms.service';
import { authService } from '@/lib/auth';

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

    useEffect(() => {
        const user = authService.getUser();
        if (!user) { setUserPagePerms(null); return; }
        const role = (user.role as string)?.toLowerCase() || '';
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
            label: 'Main Dashboard',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Recent Activity', href: '/admin/sales/recent', icon: Activity },
                { name: 'Order List', href: '/admin/orders', icon: ShoppingBag },
                { name: 'All Sales', href: '/admin/sales', icon: TrendingUp },
                { name: 'Order Tracking', href: '/admin/tracking', icon: Truck },
                { name: 'Website CMS', href: '/admin/website-settings', icon: Monitor },
            ],
        },
        {
            label: 'Inventory & Stock',
            items: [
                { name: 'Product Categories', href: '/admin/products/categories', icon: Tag },
                { name: 'Product List', href: '/admin/products', icon: LayoutDashboard },
                { name: 'Add Product', href: '/admin/products/add', icon: Package },
                { name: 'Product Sections', href: '/admin/products/sections', icon: ListFilter },
                { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store },
            ],
        },
        {
            label: 'Procurement',
            items: [
                { name: 'New Purchase', href: '/admin/purchases/add', icon: ShoppingCart },
                { name: 'Purchase History', href: '/admin/purchases', icon: History },
                { name: 'Supplier Catalog', href: '/admin/supplier-products', icon: Book },
                { name: 'Returns / Refunds', href: '/admin/purchases/returns', icon: RefreshCcw },
            ],
        },
        {
            label: 'Sales Console',
            items: [
                { name: 'Point of Sale', href: '/admin/sale', icon: Monitor },
                { name: 'Invoices', href: '/admin/invoices', icon: FileText },
                { name: 'Global Payments', href: '/admin/payments', icon: CreditCard },
                { name: 'Income', href: '/admin/income', icon: ArrowDownLeft },
                { name: 'Expense', href: '/admin/expense', icon: ArrowUpRight },
                { name: 'Company Categories', href: '/admin/company/categories', icon: Tag },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Security & Logs',
            items: [
                { name: 'Supplier Registry', href: '/admin/company/suppliers', icon: UserCheck },
                { name: 'Customer Registry', href: '/admin/company/customers', icon: Users },
                { name: 'Delivery Persons', href: '/admin/delivery', icon: Truck },
                { name: 'Areas', href: '/admin/company/areas', icon: MapPin },
                { name: 'Internal Users', href: '/admin/users', icon: User },
                { name: 'Staff Roles', href: '/admin/users/roles', icon: ShieldCheck },
                { name: 'Permissions', href: '/admin/users/permissions', icon: Lock },
                { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle },
            ],
        },
        {
            label: 'Detailed Reports',
            items: [
                { name: 'Reports Center', href: '/admin/reports', icon: BarChart3 },
                { name: 'Sales Reports', href: '/admin/reports/sales', icon: TrendingUp },
                { name: 'Purchase Reports', href: '/admin/reports/purchases', icon: ShoppingCart },
                { name: 'Inventory Reports', href: '/admin/reports/inventory', icon: Boxes },
                { name: 'Customer Reports', href: '/admin/reports/customers', icon: Users },
                { name: 'Accounting Reports', href: '/admin/reports/accounting', icon: CreditCard },
                { name: 'Returns Reports', href: '/admin/reports/sales-returns', icon: RotateCcw },
                { name: 'Data Hub', href: '/admin/reports/data-hub', icon: BarChart3 },
            ],
        },
    ];

    const [visibility, setVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const loadVisibility = () => {
            const stored = localStorage.getItem('sidebar_visibility');
            if (stored) {
                setVisibility(JSON.parse(stored));
            } else {
                const defaults: Record<string, boolean> = {};
                menuGroups.forEach(g => g.items.forEach(i => defaults[i.href] = true));
                defaults['/admin/settings'] = true;
                defaults['/admin/reports/sales'] = true;
                defaults['/admin/reports/purchases'] = true;
                defaults['/admin/reports/inventory'] = true;
                defaults['/admin/reports/customers'] = true;
                defaults['/admin/reports/accounting'] = true;
                defaults['/admin/reports/sales-returns'] = true;
                defaults['/admin/reports/data-hub'] = true;
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
        if (visibility[href] === false) return false;
        if (userPagePerms === null) return true; // no restriction
        return userPagePerms.includes(href);
    };

    const filteredGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => isPageAllowed(item.href))
    })).filter(group => group.items.length > 0);

    return (
        <>
            <style>{`
                .sidebar-scroll::-webkit-scrollbar { width: 4px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 99px; }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }
            `}</style>

            <div className={`h-full flex flex-col flex-shrink-0 z-[60] transition-all duration-300 overflow-hidden bg-slate-900 border-r border-slate-800/70 ${isCollapsed ? 'w-[64px]' : 'w-[235px]'}`}>

                <div className="px-4 py-4 flex-shrink-0 flex items-center justify-between border-b border-white/5">
                    <Link href="/admin/dashboard" onClick={() => onNavigate?.()} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center bg-indigo-500/15 border border-indigo-400/30">
                            <span className="font-black text-[13px] text-indigo-400">AQ</span>
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5 text-indigo-400">Central Console</span>
                                <span className="text-[13px] font-bold leading-none tracking-tight text-white">Al-Qavi Hub</span>
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
                <nav className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll pt-4 pb-3">


                    {filteredGroups.map((group, gIdx) => (
                        <div key={group.label} className={gIdx !== 0 ? 'mt-5' : ''}>
                            {!isCollapsed && (
                                <div className="px-4 mb-1.5">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                        {group.label}
                                    </span>
                                </div>
                            )}
                            {isCollapsed && gIdx !== 0 && (
                                <div className="mx-3 mb-1 h-px bg-white/5" />
                            )}

                            <div className="space-y-[1px] px-2">
                                {group.items.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => onNavigate?.()}
                                            className={`group relative flex items-center gap-2.5 rounded-lg transition-colors duration-150 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'} ${active ? 'bg-indigo-500/15 ring-1 ring-indigo-400/20' : 'hover:bg-white/5'}`}>

                                            {/* Active left indicator */}
                                            {active && !isCollapsed && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />
                                            )}

                                            <item.icon
                                                className={`shrink-0 transition-colors duration-150 ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                                                size={15}
                                            />

                                            {!isCollapsed && (
                                                <span className={`text-[13px] tracking-tight whitespace-nowrap truncate transition-colors duration-150 ${active ? 'text-white font-semibold' : 'text-slate-300 font-medium group-hover:text-white'}`}>
                                                    {item.name}
                                                </span>
                                            )}

                                            {/* Tooltip when collapsed */}
                                            {isCollapsed && (
                                                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap pointer-events-none
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
                    ))}
                </nav>

                {/* ── FOOTER / SETTINGS ── */}
                {isPageAllowed('/admin/settings') && (
                    <div className="flex-shrink-0 px-2 pb-3 pt-2 border-t border-white/5">
                        <Link href="/admin/settings"
                            onClick={() => onNavigate?.()}
                            className={`group relative flex items-center gap-2.5 rounded-lg transition-colors duration-150 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'} ${isActive('/admin/settings') ? 'bg-indigo-500/15 ring-1 ring-indigo-400/20' : 'hover:bg-white/5'}`}>

                            {isActive('/admin/settings') && !isCollapsed && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-400" />
                            )}

                            <Settings
                                size={15}
                                className={`shrink-0 transition-colors duration-150 ${isActive('/admin/settings') ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                            />

                            {!isCollapsed && (
                                <span className={`text-[13px] tracking-tight transition-colors duration-150 ${isActive('/admin/settings') ? 'text-white font-semibold' : 'text-slate-300 font-medium group-hover:text-white'}`}>
                                    System Settings
                                </span>
                            )}

                            {isCollapsed && (
                                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap pointer-events-none
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
