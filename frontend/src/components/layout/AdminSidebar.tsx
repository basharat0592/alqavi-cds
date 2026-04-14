'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Package, TrendingUp, Tag, ShoppingCart,
    Boxes, ChevronsLeft, ChevronsRight, Settings, UserCheck, ShoppingBag
} from 'lucide-react';


/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface NavItem {
    name: string;
    href: string;
    icon: any;
    badge?: number;
    alert?: boolean;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

/* ═══════════════════════════════════════════════
   ADMIN SIDEBAR COMPONENT (CLEAN LIGHT THEME)
   ═══════════════════════════════════════════════ */
export default function AdminSidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
    const pathname = usePathname();
    const menuGroups: NavGroup[] = [
        {
            label: 'Command Center',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Recent Orders', href: '/admin/sales/recent', icon: ShoppingBag },
                { name: 'Sales Overview', href: '/admin/sales', icon: TrendingUp },
            ],
        },
        {
            label: 'Management',
            items: [
                { name: 'Shop (POS)', href: '/admin/sales/create', icon: ShoppingCart },
                { name: 'Add Category', href: '/admin/products/categories', icon: Tag },
                { name: 'Add Product', href: '/admin/products', icon: Package },
                { name: 'Add Stocks', href: '/admin/inventory/list', icon: Boxes },
                { name: 'Add Supplier', href: '/admin/company/suppliers', icon: UserCheck },
            ],
        },
    ];

    const isActive = (href: string) => {
        if (typeof window === 'undefined') return pathname === href;
        const fullPath = window.location.pathname + window.location.search;
        if (href === '/admin/dashboard') return pathname === href;
        if (href.includes('?')) return fullPath === href;
        return pathname === href;
    };

    return (
        <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#1a1a2e] h-screen flex flex-col flex-shrink-0 z-[60] transition-all duration-300 shadow-xl border-r border-[#1a1a2e]`}>

            {/* ── Al-Qavi Header Area ── */}
            <div className={`px-4 py-6 flex items-center ${isCollapsed ? 'flex-col gap-4' : 'justify-between'} border-b border-white/5`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex flex-col group">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Administrative</span>
                        <h1 className="text-white font-black text-sm tracking-tight flex items-center gap-1.5 uppercase leading-none">
                            AL-QAVI <span className="text-[#F59E0B]">CONSOLE</span>
                        </h1>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-[#F59E0B] rounded flex items-center justify-center font-black text-[#111] text-xs">
                        A
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                </button>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
                {menuGroups.map((group, gIdx) => (
                    <div key={group.label} className={gIdx !== 0 ? "mt-4" : ""}>
                        {!isCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                {group.label}
                            </h3>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.href} href={item.href}
                                        className={`group relative flex items-center gap-3 px-6 py-2 transition-all
                                            ${active
                                                ? 'bg-white/5 text-white font-bold border-l-4 border-[#F59E0B]'
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>

                                        <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#F59E0B]' : 'text-slate-400 group-hover:text-white'}`} />

                                        {!isCollapsed && (
                                            <span className="text-[13px] tracking-tight whitespace-nowrap overflow-hidden">
                                                {item.name}
                                            </span>
                                        )}
                                        {isCollapsed && (
                                            <div className="absolute left-full ml-4 px-3 py-1 bg-[#1a1a2e] text-white text-[12px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap shadow-xl border border-white/5">
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

            {/* ── Footer Controls ── */}
            <div className="mt-auto border-t border-white/5 bg-black/10 p-3">
                <Link href="/admin/settings"
                    className={`flex items-center gap-3 px-4 py-2 text-[12px] transition-all
                        ${isActive('/admin/settings') ? 'text-white font-bold' : 'text-slate-400 hover:text-white'}`}>
                    <Settings size={18} />
                    {!isCollapsed && <span>Settings</span>}
                </Link>
            </div>
        </div>
    );
}
