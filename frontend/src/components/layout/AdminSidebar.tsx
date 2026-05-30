'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, TrendingUp, Tag,
    Boxes, ChevronLeft, ChevronRight, Settings, UserCheck, ShoppingBag,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    ChevronDown, Truck, Book, FileText, AlertTriangle, X
} from 'lucide-react';
import cmsService, { SiteSettings } from '@/services/cms.service';
import { getImageUrl } from '@/lib/utils';

interface NavItem {
    name: string;
    href: string;
    icon: any;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

export default function AdminSidebar({ isCollapsed = true, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
    const pathname = usePathname();
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings));
    }, []);

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
                { name: 'Company Categories', href: '/admin/company/categories', icon: Tag },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Security & Logs',
            items: [
                { name: 'Supplier Registry', href: '/admin/company/suppliers', icon: UserCheck },
                { name: 'Customer Registry', href: '/admin/company/customers', icon: Users },
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

    const filteredGroups = menuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => visibility[item.href] !== false)
    })).filter(group => group.items.length > 0);

    return (
        <>
            <style>{`
                .sidebar-scroll::-webkit-scrollbar { width: 3px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
                .nav-item-glow { box-shadow: inset 3px 0 0 #f59e0b, inset 0 0 20px rgba(245,158,11,0.06); }
            `}</style>

            <div className={`h-full flex flex-col flex-shrink-0 z-[60] transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-[68px]' : 'w-[235px]'}`}
                style={{ background: '#2E3A48' }}>

                {/* ── BRANDING ── */}
                <div className="px-4 py-4 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {!isCollapsed ? (
                        <>
                            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center border"
                                    style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }}>
                                    <span className="font-black text-[13px]" style={{ color: '#f59e0b' }}>AQ</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5" style={{ color: '#f59e0b' }}>Central Console</span>
                                    <span className="text-[13px] font-bold leading-none tracking-tight text-white">Al-Qavi Hub</span>
                                </div>
                            </Link>
                            <button
                                onClick={onToggle}
                                className="p-1.5 rounded-lg transition hover:bg-white/10 text-white/60 hover:text-white"
                                aria-label="Collapse sidebar"
                            >
                                <ChevronLeft size={18} className="hidden md:block" />
                                <X size={18} className="md:hidden" />
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center">
                            <button
                                onClick={onToggle}
                                className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center border transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }}
                                title="Expand Sidebar"
                            >
                                <span className="font-black text-[13px]" style={{ color: '#f59e0b' }}>AQ</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── NAVIGATION ── */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll pt-4 pb-3">


                    {filteredGroups.map((group, gIdx) => (
                        <div key={group.label} className={gIdx !== 0 ? 'mt-5' : ''}>
                            {!isCollapsed && (
                                <div className="px-4 mb-1 flex items-center justify-between">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.18em]"
                                        style={{ color: 'rgba(245,158,11,0.55)' }}>
                                        {group.label}
                                    </span>
                                    {/* collapse/expand control removed */}
                                </div>
                            )}
                            {isCollapsed && gIdx !== 0 && (
                                <div className="mx-3 mb-1" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                            )}

                            <div className="space-y-[1px] px-2">
                                {group.items.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link key={item.href} href={item.href}
                                            className={`group relative flex items-center gap-2.5 rounded-lg transition-all duration-150 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}`}
                                            style={active ? {
                                                background: 'rgba(245,158,11,0.1)',
                                                boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.15)',
                                            } : {}}
                                            onMouseEnter={e => {
                                                if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                                            }}>

                                            {/* Active left indicator */}
                                            {active && !isCollapsed && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                                    style={{ background: '#f59e0b' }} />
                                            )}

                                            <item.icon
                                                className="shrink-0 transition-colors duration-150"
                                                size={15}
                                                style={{ color: active ? '#f59e0b' : 'rgba(255,255,255,0.38)' }}
                                            />

                                            {!isCollapsed && (
                                                <span className="text-[13px] font-medium tracking-tight whitespace-nowrap truncate transition-colors duration-150"
                                                    style={{ color: '#ffffff' }}>
                                                    {item.name}
                                                </span>
                                            )}

                                            {/* Tooltip when collapsed */}
                                            {isCollapsed && (
                                                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap pointer-events-none
                                                    opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-[100]"
                                                    style={{
                                                        background: '#1e293b',
                                                        color: '#f1f5f9',
                                                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                                        border: '1px solid rgba(255,255,255,0.08)'
                                                    }}>
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
                {visibility['/admin/settings'] !== false && (
                    <div className="flex-shrink-0 px-2 pb-3 pt-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <Link href="/admin/settings"
                            className={`group relative flex items-center gap-2.5 rounded-lg transition-all duration-150 ${isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}`}
                            style={isActive('/admin/settings') ? {
                                background: 'rgba(245,158,11,0.1)',
                                boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.15)',
                            } : {}}
                            onMouseEnter={e => {
                                if (!isActive('/admin/settings'))
                                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={e => {
                                if (!isActive('/admin/settings'))
                                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                            }}>

                            {isActive('/admin/settings') && !isCollapsed && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                    style={{ background: '#f59e0b' }} />
                            )}

                            <Settings
                                size={15}
                                className="shrink-0 transition-colors duration-150"
                                style={{ color: isActive('/admin/settings') ? '#f59e0b' : 'rgba(255,255,255,0.38)' }}
                            />

                            {!isCollapsed && (
                                <span className="text-[13px] font-medium tracking-tight"
                                    style={{ color: '#ffffff' }}>
                                    System Settings
                                </span>
                            )}

                            {isCollapsed && (
                                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap pointer-events-none
                                    opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-150 z-[100]"
                                    style={{
                                        background: '#1e293b',
                                        color: '#f1f5f9',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                    }}>
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
