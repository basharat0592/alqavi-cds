'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Settings, LogOut, Warehouse,
    Building2, TrendingUp, RotateCcw, ArrowLeftRight, Tag,
    BarChart3, Boxes, FolderTree, Bell, Sparkles,
    Layers, CreditCard, Banknote, Shield, RefreshCw, ChevronsLeft, ChevronsRight, Lock
} from 'lucide-react'; // Re-trigger HMR
import { authService } from '@/lib/auth';
import { productService, orderService } from '@/lib/api';

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
interface Counts {
    products: number;
    lowStock: number;
    orders: number;
    pendingOrders: number;
    customers: number;
}

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
   SIDEBAR COMPONENT
═══════════════════════════════════════════════ */
interface AdminSidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export default function AdminSidebar({ isCollapsed = false, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminUser, setAdminUser] = useState<any>(null);
    const [counts, setCounts] = useState<Counts>({
        products: 0, lowStock: 0, orders: 0, pendingOrders: 0, customers: 0
    });

    useEffect(() => {
        const user = authService.getUser?.();
        if (user) setAdminUser(user);

        const userStr = localStorage.getItem('registered_users');
        const localUsers: any[] = (userStr && userStr !== 'undefined') ? JSON.parse(userStr) : [];

        Promise.allSettled([
            productService.getAll(),
            orderService?.getAll?.() ?? Promise.resolve([]),
        ]).then(([pRes, oRes]) => {
            const products = pRes.status === 'fulfilled'
                ? (Array.isArray(pRes.value) ? pRes.value : (pRes.value as any)?.results || []) : [];
            const orders = oRes.status === 'fulfilled'
                ? (Array.isArray(oRes.value) ? oRes.value : (oRes.value as any)?.results || []) : [];

            setCounts({
                products: products.length,
                lowStock: products.filter((p: any) => {
                    const s = parseInt(p.stock ?? p.stock_quantity ?? 0);
                    return s > 0 && s < 10;
                }).length,
                orders: orders.length,
                pendingOrders: orders.filter((o: any) => o.status === 'Pending' || o.status === 'Processing').length,
                customers: localUsers.length + 1,
            });
        });
    }, []);

    const menuGroups: NavGroup[] = [
        {
            label: 'Operations',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Alerts & Tasks', href: '/admin/alerts', icon: Bell, badge: (counts.lowStock || 0) + (counts.pendingOrders || 0), alert: (counts.lowStock + counts.pendingOrders) > 0 },
            ],
        },
        {
            label: 'Company Hub',
            items: [
                { name: 'Company', href: '/admin/company', icon: Building2 },
                { name: 'Company Category', href: '/admin/company/categories', icon: Tag },
            ],
        },
        {
            label: 'Catalog',
            items: [
                { name: 'All Products', href: '/admin/products', icon: Package, badge: counts.products },
                { name: 'Main Category', href: '/admin/products/main-categories', icon: Layers },
                { name: 'Sub Category', href: '/admin/products/categories', icon: FolderTree },
            ],
        },
        {
            label: 'Inventory',
            items: [
                { name: 'Stock Management', href: '/admin/inventory/list', icon: Boxes, badge: counts.lowStock, alert: counts.lowStock > 0 },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Warehouse },
                { name: 'Movements', href: '/admin/inventory/movements', icon: ArrowLeftRight },
                { name: 'Batch Center', href: '/admin/inventory/batches', icon: Layers },
            ],
        },
        {
            label: 'Sales & Returns',
            items: [
                { name: 'POS  (Point of Sale)', href: '/admin/sale', icon: ShoppingCart },
                { name: 'Sale Order List', href: '/admin/sales', icon: TrendingUp },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw },
                { name: 'Client Registry', href: '/admin/customers', icon: Users, badge: counts.customers },
            ],
        },
        {
            label: 'Financials',
            items: [
                { name: 'Transaction Logs', href: '/admin/payments', icon: Banknote },
                { name: 'Client Balances', href: '/admin/payments/customer', icon: Users },
            ],
        },
        {
            label: 'Purchasing',
            items: [
                { name: 'Purchase Orders', href: '/admin/purchases', icon: ShoppingCart },
                { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Admin Panel',
            items: [
                { name: 'Users', href: '/admin/users', icon: Users },
                { name: 'Roles', href: '/admin/users/roles', icon: Shield },
                { name: 'Permissions', href: '/admin/users/permissions', icon: Lock },
            ],
        },
    ];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#F8FAFC] dark:bg-[#0F172A] h-screen flex flex-col flex-shrink-0 z-20 font-sans border-r border-[#e2e8f0] dark:border-[#1e293b] shadow-[10px_0_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)] relative transition-all duration-300 ease-in-out`}>

            {/* ── Branded Header ── */}
            <div className={`px-4 pt-8 pb-5 border-b border-slate-200 dark:border-[#1e293b] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} min-h-[73px] transition-all duration-300`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex items-center gap-3 group shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="w-9 h-9 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:bg-[#FF9900] group-hover:text-white border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm group-hover:shadow-orange-200 dark:group-hover:shadow-none">
                            <Sparkles className="h-5 w-5 text-[#FF9900] group-hover:text-white transition-colors" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-none uppercase flex items-center gap-1 group-hover:text-[#ff9900] transition-colors">
                                Al-Qavi
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff9900] animate-pulse"></span>
                            </h1>
                            <p className="text-[10px] font-black text-[#FF9900] dark:text-[#FFA41C] tracking-[0.2em] uppercase mt-1">Cosmetic Hub</p>
                        </div>
                    </Link>
                )}

                <button
                    onClick={onToggle}
                    className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 hover:bg-[#FF9900] dark:hover:bg-[#FF9900] text-slate-500 dark:text-slate-400 hover:text-white transition-all duration-300 transform active:scale-90 shadow-sm border border-slate-200 dark:border-slate-700/50 hover:border-orange-400 flex items-center justify-center`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronsRight className="w-5 h-5 animate-in zoom-in duration-500" />
                    ) : (
                        <ChevronsLeft className="w-5 h-5 animate-in fade-in slide-in-from-right-4 duration-500" />
                    )}
                </button>
            </div>

            {/* ── Main Navigation ── */}
            <nav className="flex-1 overflow-y-auto pt-4 pb-12 custom-scrollbar space-y-6">
                {menuGroups.map((group, gIdx) => (
                    <div key={group.label} className="px-3">
                        {!isCollapsed && (
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-3 mb-2 opacity-80 animate-in fade-in">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-[2px]">
                            {group.items.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all duration-200
                                            ${active
                                                ? 'bg-white dark:bg-[#1e293b] text-[#ff9900] dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1e293b]/50 hover:text-slate-900 dark:hover:text-white hover:shadow-sm'}`}>

                                        {/* Amazon Active Indicator */}
                                        {active && (
                                            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#ff9900] rounded-r shadow-[0_0_8px_rgba(255,153,0,0.6)]"></div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-5 w-5 shrink-0 transition-colors ${active ? 'text-[#ff9900]' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#ff9900]'}`}
                                                strokeWidth={active ? 2.5 : 2} />
                                            {!isCollapsed && <span className="text-[13px] tracking-tight font-black animate-in fade-in slide-in-from-left-2">{item.name}</span>}
                                        </div>

                                        {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 font-black rounded min-w-[20px] text-center
                                                ${active
                                                    ? 'bg-[#ff9900] text-[#131921] shadow-lg shadow-orange-500/20'
                                                    : item.alert ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                                {item.badge}
                                            </span>
                                        )}

                                        {isCollapsed && (
                                            <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                                {item.name}
                                                {item.badge !== undefined && item.badge > 0 && ` (${item.badge})`}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── System Footer ── */}
            <div className={`mt-auto bg-white/30 dark:bg-[#000000]/10 border-t border-[#e2e8f0] dark:border-[#1e293b] p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <Link href="/admin/settings"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-tight
                        ${isActive('/admin/settings')
                            ? 'bg-white dark:bg-[#1e293b] text-[#ff9900]'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1e293b] hover:text-slate-900 dark:hover:text-white'}`}>
                    <Settings className={`h-5 w-5 ${isActive('/admin/settings') ? 'text-[#ff9900]' : 'text-slate-400'}`} />
                    {!isCollapsed && <span>Control Panel</span>}
                </Link>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
            `}</style>
        </div>
    );
}
