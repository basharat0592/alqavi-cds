'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, TrendingUp, Tag,
    Boxes, ChevronsLeft, ChevronsRight, Settings, UserCheck, ShoppingBag,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    ChevronDown, Menu, Truck, Book, FileText, AlertTriangle
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   SIMPLE PROFESSIONAL SIDEBAR
   ───────────────────────────────────────────────────────────────────────────── */
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
    
    const menuGroups: NavGroup[] = [
        {
            label: 'Main Dashboard',
            items: [
                { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Recent Activity', href: '/admin/sales/recent', icon: Activity },
                { name: 'Order List', href: '/admin/orders', icon: ShoppingBag },
                { name: 'All Sales', href: '/admin/sales', icon: TrendingUp },
                { name: 'Order Tracking', href: '/admin/tracking', icon: Truck },
            ],
        },
        {
            label: 'Inventory & Stock',
            items: [
                { name: 'Categories', href: '/admin/products/categories', icon: Tag },
                { name: 'Add Product', href: '/admin/products', icon: Package },
                { name: 'Sections', href: '/admin/products/sections', icon: ListFilter },
                { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store },
            ],
        },
        {
            label: 'Procurement',
            items: [
                { name: 'Supplier List', href: '/admin/company/suppliers', icon: UserCheck },
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
                { name: 'Account Holders', href: '/admin/company/customers', icon: Users },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Security & Logs',
            items: [
                { name: 'User Registry', href: '/admin/users', icon: User },
                { name: 'Staff Roles', href: '/admin/users/roles', icon: ShieldCheck },
                { name: 'Permissions', href: '/admin/users/permissions', icon: Lock },
                { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle },
                { name: 'Business Reports', href: '/admin/reports', icon: BarChart3 },
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
        <div className={`h-screen flex flex-col flex-shrink-0 z-[60] transition-all duration-300 shadow-2xl overflow-hidden font-sans
            ${isCollapsed ? 'w-16 bg-[#1a1a2e]' : 'w-[250px] bg-[#1a1a2e]'}`}>

            {/* ── BRANDING AREA ── */}
            <div className={`h-16 flex items-center px-6 border-b border-white/10 bg-[#1a1a2e] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex flex-col group">
                        <span className="text-[10px] text-[#c45500] font-black uppercase tracking-[0.2em] leading-none mb-1">Central Console</span>
                        <h1 className="text-white font-bold text-[16px] tracking-tight flex items-center gap-1.5">
                            AL-QAVI <span className="text-[#c45500]">HUB</span>
                        </h1>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 border-2 border-[#c45500] rounded-[2px] flex items-center justify-center font-black text-[#c45500] text-[15px]">
                        A
                    </div>
                )}
                {!isCollapsed && (
                    <button onClick={onToggle} className="text-slate-500 hover:text-white transition-colors">
                        <Menu size={18} />
                    </button>
                )}
            </div>

            {/* ── NAVIGATION ── */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-4">
                {filteredGroups.map((group, gIdx) => (
                    <div key={group.label} className={gIdx !== 0 ? "mt-6" : ""}>
                        {!isCollapsed && (
                            <h3 className="px-6 text-[10px] font-black text-[#F3A847] mb-2.5 uppercase tracking-widest border-b border-white/5 pb-1 mx-2">
                                {group.label}
                            </h3>
                        )}
                        <div className="space-y-[1px]">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href}
                                        className={`group relative flex items-center gap-3.5 px-6 py-2 transition-all
                                            ${active
                                                ? 'bg-[#c45500]/10 text-white font-bold border-l-[3px] border-[#c45500]'
                                                : 'text-white hover:bg-white/5 hover:text-white'}`}>

                                        <item.icon className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? 'text-[#c45500]' : 'text-slate-500 group-hover:text-slate-300'}`} />

                                        {!isCollapsed && (
                                            <span className="text-[13px] tracking-tight whitespace-nowrap overflow-hidden py-0.5">
                                                {item.name}
                                            </span>
                                        )}
                                        
                                        {isCollapsed && (
                                            <div className="absolute left-full ml-2 px-3 py-1.5 bg-[#111] border border-white/10 text-white text-[11px] font-bold rounded-[2px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap shadow-xl uppercase tracking-wider">
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
                <div className="mt-auto border-t border-white/10 bg-black/20 p-2">
                    <Link href="/admin/settings"
                        className={`flex items-center gap-3.5 px-4 py-2.5 rounded-[2px] transition-all
                            ${isActive('/admin/settings') 
                                ? 'bg-[#c45500]/20 text-white font-bold border border-[#c45500]/30' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Settings size={16} className={isActive('/admin/settings') ? 'text-[#c45500]' : 'text-slate-500'} />
                        {!isCollapsed && <span className="text-[13px] font-medium">System Settings</span>}
                    </Link>
                </div>
            )}
        </div>
    );
}
