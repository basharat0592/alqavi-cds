'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Settings, LogOut, Warehouse, Clock,
    Building2, TrendingUp, RotateCcw, ArrowLeftRight, Tag,
    BarChart3, Boxes, FolderTree, Bell,
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

export default function AdminSidebar({ isCollapsed = false, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminUser, setAdminUser] = useState<any>(null);
    const [counts, setCounts] = useState({
        products: 0, lowStock: 0, orders: 0, pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState<MiniOrder[]>([]);

    useEffect(() => {
        const user = authService.getUser?.();
        if (user) setAdminUser(user);


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

            // Set Recent orders (last 5)
            setRecentOrders(orders.slice(0, 5));
        });
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

    const userRole = (adminUser?.role_name || adminUser?.role || '').toString().toLowerCase();
    const isSupplier = userRole === 'supplier';

    const filteredGroups = menuGroups.map(group => {
        if (isSupplier) {
            if (group.label === 'Operations') {
                return { ...group, items: group.items.filter(i => i.name === 'Dashboard') };
            }
            if (group.label === 'Catalog') {
                return {
                    ...group,
                    items: group.items
                        .filter(i => i.name === 'All Products')
                        .map(i => ({ ...i, name: 'My Products' }))
                };
            }
            if (group.label === 'Sales & Returns') {
                return { ...group, items: group.items.filter(i => i.name === 'Sale Order List') };
            }
            if (group.label === 'Inventory') {
                return { ...group, items: group.items.filter(i => i.name === 'Stock Management') };
            }
            return null;
        }
        return group;
    }).filter(g => g !== null) as NavGroup[];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-[#1B1C1E] h-screen flex flex-col flex-shrink-0 z-20 font-sans border-r border-slate-100 dark:border-white/5 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.6)] relative transition-all duration-300 ease-in-out`}>

            {/* ── Branded Header ── */}
            <div className={`px-4 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} min-h-[66px] transition-all duration-300`}>
                {!isCollapsed && (
                    <Link href="/admin/dashboard" className="flex items-center gap-3 group shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="w-8 h-8 bg-[#FF9900] rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-sm font-black text-[#131921]">A</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-black text-slate-900 dark:text-white text-[12px] tracking-tighter leading-none uppercase">Al-Qavi</h1>
                            <p className="text-[9px] font-black text-[#FF9900] tracking-[0.2em] uppercase mt-0.5">Cosmetic Hub</p>
                        </div>
                    </Link>
                )}

                <button
                    onClick={onToggle}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-[#FF9900]/10 dark:hover:bg-[#FF9900]/10 text-slate-400 dark:text-slate-500 hover:text-[#FF9900] transition-all duration-200 border border-slate-100 dark:border-white/5 flex items-center justify-center"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? (
                        <ChevronsRight className="w-4 h-4 animate-in zoom-in duration-500" />
                    ) : (
                        <ChevronsLeft className="w-4 h-4 animate-in fade-in slide-in-from-right-4 duration-500" />
                    )}
                </button>
            </div>

            {/* ── Main Navigation ── */}
            <nav className="flex-1 overflow-y-auto pt-4 pb-12 custom-scrollbar space-y-5">
                {filteredGroups.map((group, gIdx) => (
                    <div key={group.label} className="px-3">
                        {!isCollapsed && (
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/20 px-3 mb-2">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-[1px]">
                            {group.items.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-xl transition-all duration-200
                                            ${active
                                                ? 'bg-[#FF9900]/10 dark:bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20 dark:border-[#FF9900]/15'
                                                : 'text-slate-500 dark:text-white/40 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-100 dark:hover:border-white/5'}`}>

                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-[#FF9900]' : 'text-slate-400 dark:text-white/30 group-hover:text-[#FF9900]'}`}
                                                strokeWidth={active ? 2.5 : 2} />
                                            {!isCollapsed && <span className={`text-[11px] tracking-tight font-black uppercase animate-in fade-in slide-in-from-left-2 ${active ? 'text-[#FF9900]' : ''}`}>{item.name}</span>}
                                        </div>

                                        {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 font-black rounded-full min-w-[18px] text-center
                                                ${active
                                                    ? 'bg-[#FF9900] text-[#131921]'
                                                    : item.alert ? 'bg-red-500 text-white animate-blink-fast' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50'}`}>
                                                {item.badge}
                                            </span>
                                        )}

                                        {isCollapsed && (
                                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0f1012] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
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
            {(true) && (
                <div className={`mt-auto border-t border-slate-100 dark:border-white/5 p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
                    <Link href="/admin/settings"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[11px] font-black uppercase tracking-tight border
                            ${isActive('/admin/settings')
                                ? 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20'
                                : 'text-slate-400 dark:text-white/30 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-100 dark:hover:border-white/5'}`}>
                        <Settings className={`h-4 w-4 ${isActive('/admin/settings') ? 'text-[#FF9900]' : 'text-slate-400 dark:text-white/30'}`} />
                        {!isCollapsed && <span>Control Panel</span>}
                    </Link>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }

                @keyframes blink-fast {
                    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    50% { opacity: 0.8; transform: scale(1.15); box-shadow: 0 0 12px 6px rgba(239, 68, 68, 0.15); }
                }
                .animate-blink-fast {
                    animation: blink-fast 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
}
