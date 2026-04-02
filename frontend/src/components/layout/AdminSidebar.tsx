'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Settings, LogOut, Warehouse, Clock,
    Building2, TrendingUp, RotateCcw, ArrowLeftRight, Tag,
    BarChart3, Boxes, FolderTree, Bell, FileText, Database, Truck,
    Layers, CreditCard, Banknote, Shield, RefreshCw, ChevronsLeft, ChevronsRight, Lock
} from 'lucide-react';
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
}

interface MiniOrder {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    created_at?: string;
    guest_name?: string;
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

// ─── Component ──────────────────────────────────────────────────────────────
export default function AdminSidebar({ isCollapsed = false, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminUser, setAdminUser] = useState<any>(null);
    const [counts, setCounts] = useState({
        products: 0, lowStock: 0, orders: 0, pendingOrders: 0
    });

    useEffect(() => {
        const refreshUser = () => {
            const user = authService.getUser?.();
            if (user) setAdminUser(user);
        };

        refreshUser();

        window.addEventListener('profileUpdated', refreshUser);

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
                pendingOrders: orders.filter((o: any) => o.status === 'Pending' || o.status === 'Processing' || o.status === 'ordered').length,
            });
        });

        return () => window.removeEventListener('profileUpdated', refreshUser);
    }, []);

    const menuGroups: NavGroup[] = [
        {
            label: 'Operations',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Recent Orders', href: '/admin/sales/recent', icon: Clock, badge: counts.pendingOrders, alert: counts.pendingOrders > 0 },
                { name: 'Alerts', href: '/admin/alerts', icon: Bell, badge: counts.lowStock, alert: counts.lowStock > 0 },
            ],
        },
        {
            label: 'Company Hub',
            items: [
                { name: 'Company', href: '/admin/company', icon: Building2 },
                { name: 'Company Category', href: '/admin/company/categories', icon: Tag },
                { name: 'Suppliers', href: '/admin/company/suppliers', icon: Users },
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
            label: 'Inventory Control',
            items: [
                { name: 'Stock Management', href: '/admin/inventory/list', icon: Boxes, badge: counts.lowStock, alert: counts.lowStock > 0 },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Warehouse },
                { name: 'Stock Movements', href: '/admin/inventory/movements', icon: ArrowLeftRight },
                { name: 'Inventory Adjustments', href: '/admin/inventory/adjustments', icon: RefreshCw },
                { name: 'Batch Operations', href: '/admin/inventory/batches', icon: Layers },
            ],
        },
        {
            label: 'Sales & Returns',
            items: [
                { name: 'POS Control', href: '/admin/sale', icon: ShoppingCart },
                { name: 'Sale Registry', href: '/admin/sales', icon: TrendingUp },
                { name: 'Return Management', href: '/admin/sale-returns', icon: RotateCcw },
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
            label: 'Financials',
            items: [
                { name: 'Transaction Logs', href: '/admin/payments', icon: Banknote },
                { name: 'Client Balances', href: '/admin/payments/customer', icon: Users },
            ],
        },
        {
            label: 'Analytics & Reports',
            items: [
                { name: 'Intelligence Center', href: '/admin/reports', icon: BarChart3 },
                { name: 'Stock & Logistics', href: '/admin/reports/inventory', icon: Package },
                { name: 'Client Matrix', href: '/admin/reports/customers', icon: Users },
                { name: 'Procurement Audit', href: '/admin/reports/purchases', icon: Truck },
                { name: 'Data Engine Hub', href: '/admin/reports/data-hub', icon: Database },
            ],
        },
        {
            label: 'Security & Admin',
            items: [
                { name: 'System Users', href: '/admin/users', icon: Users },
                { name: 'Role Security', href: '/admin/users/roles', icon: Shield },
                { name: 'Access Control', href: '/admin/users/permissions', icon: Lock },
            ],
        },
    ];

    const userRole = (adminUser?.role_name || adminUser?.role || '').toString().toLowerCase();
    const isSupplier = userRole === 'supplier';

    const filteredGroups = menuGroups.map(group => {
        if (isSupplier) {
            if (group.label === 'Operations') return { ...group, items: group.items.filter(i => i.name === 'Dashboard') };
            if (group.label === 'Catalog') return { ...group, items: group.items.filter(i => i.name === 'All Products').map(i => ({ ...i, name: 'My Products' })) };
            if (group.label === 'Sales & Returns') return { ...group, items: group.items.filter(i => i.name === 'Sale Registry') };
            if (group.label === 'Inventory') return { ...group, items: group.items.filter(i => i.name === 'Stock Management') };
            return null;
        }
        return group;
    }).filter(g => g !== null) as NavGroup[];

    const getAllItems = () => {
        const items: string[] = [];
        filteredGroups.forEach(g => g.items.forEach(i => items.push(i.href)));
        return items;
    };

    const activeHref = (() => {
        const items = getAllItems();
        // Sort by length descending to find the most specific match first
        const sortedItems = [...items].sort((a, b) => b.length - a.length);
        for (const href of sortedItems) {
            if (pathname === href || pathname.startsWith(href + '/')) return href;
        }
        return null;
    })();

    const isActive = (href: string) => activeHref === href;
    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-60'} bg-[#F9FAFB]/95 dark:bg-[#1B1C1E]/95 backdrop-blur-2xl h-screen flex flex-col flex-shrink-0 z-30 font-sans border-r border-slate-200/50 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.4)] relative transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}>

            {/* ── Branded Header ── */}
            <div className={`px-4 pt-8 pb-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-500 relative`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex items-center gap-3 group shrink-0 animate-in fade-in slide-in-from-left-6 duration-700">
                        <div className="w-9 h-9 bg-[#F7CA00] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30 group-hover:rotate-12 transition-all duration-500 border border-white/20">
                            <span className="text-sm font-black text-white">A</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-black text-slate-900 dark:text-white text-[12px] tracking-tighter leading-none uppercase">AL-QAVI <span className="text-[#F7CA00]">TRADES</span></h1>
                            <p className="text-[8px] font-black text-slate-400 dark:text-white/30 tracking-[0.4em] uppercase mt-1">Executive Hub</p>
                        </div>
                    </Link>
                )}

                <button
                    onClick={onToggle}
                    className={`p-1.5 rounded-lg bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-[#F7CA00]/10 text-slate-400 dark:text-slate-500 hover:text-[#F7CA00] transition-all duration-500 border border-slate-200/50 dark:border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${isCollapsed ? 'mx-auto' : ''}`}
                >
                    {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                </button>

                {/* Subtle top accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F7CA00]/20 to-transparent" />
            </div>

            {/* ── Premium Navigation ── */}
            <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-12 custom-scrollbar space-y-6 scroll-smooth">
                {filteredGroups.map((group) => (
                    <div key={group.label} className="space-y-1.5">
                        {!isCollapsed && (
                            <div className="px-3 mb-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-white/20 underline decoration-[#F7CA00]/20 decoration-2 underline-offset-4">
                                    {group.label}
                                </p>
                            </div>
                        )}
                        <div className="space-y-[2px]">
                            {group.items.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-xl transition-all duration-500
                                            ${active
                                                ? 'bg-[#F7CA00]/10 text-[#F7CA00] border-l-4 border-[#F7CA00] scale-[1.01] z-10'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-[#F7CA00] border border-transparent hover:border-slate-100 dark:hover:border-white/5'}`}>

                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-4.5 w-4.5 shrink-0 transition-all duration-500 ${active ? 'text-[#F7CA00] drop-shadow-[0_0_8px_rgba(29,78,216,0.3)]' : 'text-slate-400 dark:text-slate-500 group-hover:text-[#F7CA00] group-hover:scale-110'}`} strokeWidth={active ? 3 : 2} />
                                            {!isCollapsed && <span className={`text-[10px] font-black uppercase tracking-wide transition-all duration-500 ${active ? 'translate-x-1' : ''}`}>{item.name}</span>}
                                        </div>

                                        {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                                            <span className={`text-[10px] px-2.5 py-0.5 font-black rounded-lg text-center min-w-[24px] transition-all duration-500
                                                ${active
                                                    ? 'bg-[#F7CA00] text-white shadow-md'
                                                    : item.alert ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                                                {item.badge}
                                            </span>
                                        )}

                                        {isCollapsed && (
                                            <div className="absolute left-full ml-6 px-4 py-2.5 bg-white dark:bg-[#0f1012] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-[11px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-500 translate-x-[-15px] group-hover:translate-x-0 z-50 whitespace-nowrap shadow-[20px_0_40px_rgba(0,0,0,0.1)] dark:shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
                                                {item.name}
                                                {item.badge !== undefined && item.badge > 0 && (
                                                    <span className="ml-2 text-[#F7CA00] opacity-100">{item.badge}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Active Indicator Bar */}
                                        {active && !isCollapsed && (
                                            <div className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full my-auto" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Tactical Footer Control ── */}
            <div className="mt-auto border-t border-slate-200/50 dark:border-white/5 p-3.5 bg-slate-50/50 dark:bg-black/10">
                <Link href="/admin/settings"
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-500 text-[11px] font-black uppercase tracking-wider border border-transparent group
                        ${isActive('/admin/settings')
                            ? 'bg-[#F7CA00] text-white shadow-xl shadow-blue-500/20'
                            : 'text-slate-500 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 hover:text-[#F7CA00] hover:shadow-lg dark:hover:shadow-none hover:border-slate-100 dark:hover:border-white/5'}`}>
                    <Settings className={`h-4.5 w-4.5 transition-all duration-500 group-hover:rotate-90 ${isActive('/admin/settings') ? 'text-white' : ''}`} />
                    {!isCollapsed && <span>Control Center</span>}
                </Link>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.08); }
            `}</style>
        </div>
    );
}
