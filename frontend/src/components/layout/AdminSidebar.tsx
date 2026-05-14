'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, TrendingUp, Tag,
    Boxes, ChevronLeft, ChevronRight, Settings, UserCheck, ShoppingBag,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    ChevronDown, Truck, Book, FileText, AlertTriangle
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

export default function AdminSidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
    const pathname = usePathname();
    const [settings, setSettings] = useState<SiteSettings | null>(null);

    useEffect(() => {
        cmsService.getFullState().then(data => setSettings(data.settings));
    }, []);

    const menuGroups: NavGroup[] = [
        {
            label: 'Main Dashboard',
            items: [
                { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
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
                // Ensure all new reports are visible by default
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
        <div className={`h-full flex flex-col flex-shrink-0 z-[60] transition-all duration-300 shadow-2xl overflow-hidden font-sans antialiased
            ${isCollapsed ? 'w-16 bg-[#232F3E]' : 'w-[250px] bg-[#232F3E]'}`}>

            {/* ── BRANDING AREA ── */}
            <div className={`h-16 flex items-center px-4 border-b border-white/10 bg-[#1a252f] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-sm overflow-hidden flex-shrink-0 bg-white/5 p-1 border border-white/10">
                            {settings?.logo ? (
                                <img src={getImageUrl(settings.logo)} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#F3A847] font-bold text-xs border border-[#F3A847]/30">
                                    AQ
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-[#F3A847] font-bold uppercase tracking-[0.2em] leading-none mb-0.5">Central Console</span>
                            <h1 className="text-white font-bold text-[14px] tracking-tight uppercase leading-none">
                                {settings?.site_name || 'AL-QAVI HUB'}
                            </h1>
                        </div>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 border border-white/10 rounded-sm flex items-center justify-center bg-white/5 p-1">
                        {settings?.logo ? (
                            <img src={getImageUrl(settings.logo)} alt="L" className="w-full h-full object-contain" />
                        ) : (
                            <span className="font-bold text-[#F3A847] text-[12px]">AQ</span>
                        )}
                    </div>
                )}
                {!isCollapsed && (
                    <button onClick={onToggle} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-[2px] transition-all">
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            {/* ── NAVIGATION ── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-4">
                {isCollapsed && (
                    <div className="px-4 mb-6">
                        <button onClick={onToggle} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-[2px] transition-all mx-auto">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
                {filteredGroups.map((group, gIdx) => (
                    <div key={group.label} className={gIdx !== 0 ? "mt-6" : ""}>
                        {!isCollapsed && (
                            <h3 className="px-4 text-[10px] font-black text-[#F3A847] mb-2 uppercase tracking-[0.15em] border-b border-white/5 pb-1 mx-2">
                                {group.label}
                            </h3>
                        )}
                        <div className="space-y-[1px]">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href}
                                        className={`group relative flex items-center gap-3 px-4 py-2 transition-all
                                            ${active
                                                ? 'bg-[#1a252f] text-white font-bold border-l-[3px] border-[#F3A847]'
                                                : 'text-zinc-100 hover:bg-white/5 hover:text-white font-medium'}`}>

                                        <item.icon className={`h-[16px] w-[16px] shrink-0 transition-colors ${active ? 'text-[#F3A847]' : 'text-zinc-400 group-hover:text-zinc-200'}`} />

                                        {!isCollapsed && (
                                            <span className="text-[14px] tracking-tight whitespace-nowrap overflow-hidden">
                                                {item.name}
                                            </span>
                                        )}

                                        {isCollapsed && (
                                            <div className="absolute left-full ml-2 px-3 py-1.5 bg-[#1a252f] border border-white/10 text-white text-[11px] font-bold rounded-[2px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap shadow-xl uppercase tracking-wider">
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

            {/* ── FOOTER ── */}
            {visibility['/admin/settings'] !== false && (
                <div className="mt-auto border-t border-white/10 bg-[#1a252f] p-2">
                    <Link href="/admin/settings"
                        className={`flex items-center gap-3.5 px-4 py-2.5 rounded-[2px] transition-all
                            ${isActive('/admin/settings')
                                ? 'bg-white/5 text-white font-bold border border-[#F3A847]/30'
                                : 'text-zinc-100 hover:text-white hover:bg-white/5 font-medium'}`}>
                        <Settings size={16} className={isActive('/admin/settings') ? 'text-[#F3A847]' : 'text-zinc-400 group-hover:text-zinc-200'} />
                        {!isCollapsed && <span className="text-[14px] font-medium tracking-tight">System Settings</span>}
                    </Link>
                </div>
            )}
        </div>
    );
}
