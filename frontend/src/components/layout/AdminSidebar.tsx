'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Settings, Warehouse, Clock,
    Building2, TrendingUp, RotateCcw, ArrowLeftRight, Tag,
    BarChart3, Boxes, FolderTree, Bell, FileText, Database, Truck,
    Layers, CreditCard, Banknote, Shield, RefreshCw, ChevronsLeft, ChevronsRight, Lock, UserCheck,
    ChevronDown, ShoppingBag
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { productService, orderService } from '@/lib/api';

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
    const [sidebarVisibility, setSidebarVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const checkVisibility = () => {
            const saved = localStorage.getItem('admin_sidebar_visibility');
            if (saved) setSidebarVisibility(JSON.parse(saved));
        };
        checkVisibility();
        window.addEventListener('sidebarVisibilityChanged', checkVisibility);
        return () => window.removeEventListener('sidebarVisibilityChanged', checkVisibility);
    }, []);

    const menuGroups: NavGroup[] = [
        {
            label: 'Main Dashboard',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'POS / Sales', href: '/admin/sale', icon: ShoppingCart },
                { name: 'Recent History', href: '/admin/sales/recent', icon: Clock },
                { name: 'Notifications', href: '/admin/alerts', icon: Bell },
            ],
        },
        {
            label: 'Products',
            items: [
                { name: 'All Products', href: '/admin/products', icon: Package },
                { name: 'Navbar Pages', href: '/admin/products/main-categories', icon: FolderTree },
                { name: 'Products Category', href: '/admin/products/categories', icon: Tag },
            ],
        },
        {
            label: 'Inventory',
            items: [
                { name: 'Current Stock', href: '/admin/inventory/list', icon: Boxes },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Warehouse },
                { name: 'Stock History', href: '/admin/inventory/movements', icon: ArrowLeftRight },
                { name: 'Adjustments', href: '/admin/inventory/adjustments', icon: RefreshCw },
            ],
        },
        {
            label: 'Purchasing',
            items: [
                { name: 'Suppliers', href: '/admin/company/suppliers', icon: UserCheck },
                { name: 'All Purchases', href: '/admin/purchases', icon: ShoppingBag },
                { name: 'Returns', href: '/admin/purchases/returns', icon: RotateCcw },
                { name: 'Companies', href: '/admin/company', icon: Building2 },
            ],
        },
        {
            label: 'Accounts',
            items: [
                { name: 'Sales List', href: '/admin/sales', icon: TrendingUp },
                { name: 'Payments', href: '/admin/payments', icon: Banknote },
                { name: 'Customer Credit', href: '/admin/payments/customer', icon: CreditCard },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Administration',
            items: [
                { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
                { name: 'Audit Logs', href: '/admin/reports?type=accounting', icon: Database },
                { name: 'Users List', href: '/admin/users', icon: Users },
                { name: 'User Roles', href: '/admin/users/roles', icon: Shield },
                { name: 'Permissions', href: '/admin/users/permissions', icon: Lock },
            ],
        },
    ].map(group => ({
        ...group,
        items: group.items.filter(item => sidebarVisibility[item.href] !== false)
    })).filter(g => g.items.length > 0);

    const isActive = (href: string) => {
        if (typeof window === 'undefined') return pathname === href;
        const fullPath = window.location.pathname + window.location.search;
        if (href === '/admin/dashboard') return pathname === href;
        if (href.includes('?')) return fullPath === href;
        return pathname === href;
    };

    return (
        <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#232F3E] h-screen flex flex-col flex-shrink-0 z-[60] transition-all duration-300 shadow-xl border-r border-[#1a2b3c]`}>

            {/* ── Amazon Header Area ── */}
            <div className={`px-4 py-6 flex items-center ${isCollapsed ? 'flex-col gap-4' : 'justify-between'} border-b border-[#37475a]`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex flex-col group">
                        <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest leading-none mb-1">Administrative</span>
                        <h1 className="text-white font-black text-sm tracking-tight flex items-center gap-1.5 uppercase leading-none">
                            AL-QAVI <span className="text-[#FF9900]">CONSOLE</span>
                        </h1>
                    </Link>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-[#FF9900] rounded flex items-center justify-center font-black text-[#111] text-xs">
                        A
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="text-[#A1A1AA] hover:text-white transition-colors p-1"
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                </button>
            </div>

            {/* ── Amazon Vertical Navigation ── */}
            <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
                {menuGroups.map((group, gIdx) => (
                    <div key={group.label} className={gIdx !== 0 ? "mt-4" : ""}>
                        {!isCollapsed && (
                            <h3 className="px-6 text-[11px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-2 opacity-60">
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
                                                ? 'bg-[#37475a] text-white font-bold border-l-4 border-[#FF9900]'
                                                : 'text-[#E8E8E8] hover:bg-[#37475a] hover:text-white'}`}>

                                        <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#FF9900]' : 'text-[#A1A1AA] group-hover:text-white'}`} />

                                        {!isCollapsed && (
                                            <span className="text-[13px] tracking-tight whitespace-nowrap overflow-hidden">
                                                {item.name}
                                            </span>
                                        )}

                                        {isCollapsed && (
                                            <div className="absolute left-full ml-4 px-3 py-1 bg-[#232F3E] text-white text-[12px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[100] whitespace-nowrap shadow-xl border border-[#37475a]">
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

            {/* ── Amazon Footer Controls ── */}
            <div className="mt-auto border-t border-[#37475a] bg-[#1a2b3c] p-3">
                <Link href="/admin/settings"
                    className={`flex items-center gap-3 px-4 py-2 text-[12px] transition-all
                        ${isActive('/admin/settings') ? 'text-white font-bold' : 'text-[#A1A1AA] hover:text-white'}`}>
                    <Settings size={18} />
                    {!isCollapsed && <span>Settings</span>}
                </Link>
            </div>
        </div>
    );
}
