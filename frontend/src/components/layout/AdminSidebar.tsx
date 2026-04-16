'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, TrendingUp, Tag,
    Boxes, ChevronsLeft, ChevronsRight, Settings, UserCheck, ShoppingBag,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    ChevronDown, Menu
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
            label: 'Main',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Recent Orders', href: '/admin/sales/recent', icon: ShoppingBag },
                { name: 'Sales List', href: '/admin/sales', icon: TrendingUp },
                { name: 'Tracking', href: '/admin/tracking', icon: Activity },
            ],
        },
        {
            label: 'Inventory',
            items: [
                { name: 'Categories', href: '/admin/products/categories', icon: Tag },
                { name: 'Add Product', href: '/admin/products', icon: Package },
                { name: 'Main Category', href: '/admin/products/main-categories', icon: ListFilter },
                { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store },
            ],
        },
        {
            label: 'Suppliers',
            items: [
                { name: 'Supplier List', href: '/admin/company/suppliers', icon: UserCheck },
                { name: 'Add Purchase', href: '/admin/purchases/add', icon: ShoppingCart },
                { name: 'Purchase History', href: '/admin/purchases', icon: History },
                { name: 'Returns', href: '/admin/purchases/returns', icon: RefreshCcw },
            ],
        },
        {
            label: 'Sales',
            items: [
                { name: 'Sale Point (POS)', href: '/admin/sale', icon: Monitor },
                { name: 'Payments', href: '/admin/payments', icon: CreditCard },
                { name: 'Customers list', href: '/admin/company/customers', icon: UserCheck },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Admin',
            items: [
                { name: 'Users', href: '/admin/users', icon: User },
                { name: 'Roles', href: '/admin/users/roles', icon: ShieldCheck },
                { name: 'Permissions', href: '/admin/users/permissions', icon: Lock },
                { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
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
        <div className={`h-screen flex flex-col flex-shrink-0 z-[60] transition-all duration-300 shadow-xl 
            ${isCollapsed ? 'w-16 bg-[#1a1a2e]' : 'w-64 bg-[#1a1a2e]'}`}>

            {/* ── BRANDING AREA ── */}
            <div className={`p-4 border-b border-white/5 bg-[#1a1a2e] text-white flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex flex-col group">
                        <span className="text-[10px] text-[#f08804] font-bold uppercase tracking-widest leading-none mb-1">Admin Panel</span>
                        <h1 className="text-white font-[500] text-[18px] tracking-tight uppercase leading-none">
                            AL-QAVI <span className="font-normal italic">HUB</span>
                        </h1>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-[#f08804] rounded-[2px] flex items-center justify-center font-bold text-[#1a1a2e] text-[14px]">
                        Q
                    </div>
                )}
                {!isCollapsed && (
                    <button onClick={onToggle} className="text-white opacity-40 hover:opacity-100 transition-opacity p-1">
                        <Menu size={20} />
                    </button>
                )}
            </div>

            {/* ── EXPAND FOR COLLAPSED ── */}
            {isCollapsed && (
                <button onClick={onToggle} className="w-full h-10 flex items-center justify-center border-b border-white/5 hover:bg-white/5">
                    <ChevronsRight size={18} className="text-slate-400" />
                </button>
            )}

            {/* ── NAVIGATION ── */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-4">
                {filteredGroups.map((group, gIdx) => (
                    <div key={group.label} className={gIdx !== 0 ? "mt-5" : ""}>
                        {!isCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest leading-none">
                                {group.label}
                            </h3>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href}
                                        className={`group relative flex items-center gap-3 px-6 py-2.5 transition-all
                                            ${active
                                                ? 'bg-white/5 text-white font-bold border-l-[4px] border-[#e47911]'
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>

                                        <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-[#e47911]' : 'text-slate-500 group-hover:text-white'}`} />

                                        {!isCollapsed && (
                                            <span className="text-[13px] tracking-tight whitespace-nowrap overflow-hidden">
                                                {item.name}
                                            </span>
                                        )}
                                        
                                        {isCollapsed && (
                                            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1a1a2e] border border-white/5 text-white text-[12px] font-bold rounded-[4px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap shadow-2xl">
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
                <div className="mt-auto border-t border-white/5 bg-black/10 p-2">
                    <Link href="/admin/settings"
                        className={`flex items-center gap-3 px-4 py-3 rounded-[4px] transition-all
                            ${isActive('/admin/settings') 
                                ? 'bg-white/5 text-white font-bold shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Settings size={18} className={isActive('/admin/settings') ? 'text-[#e47911]' : ''} />
                        {!isCollapsed && <span className="text-[13px]">Settings</span>}
                    </Link>
                </div>
            )}
        </div>
    );
}
