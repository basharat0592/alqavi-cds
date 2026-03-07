'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, Users,
    Settings, LogOut, Warehouse, Shield,
    ExternalLink, Building2, TrendingUp, PackageSearch, RotateCcw, ArrowLeftRight, Tag
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
export default function AdminSidebar() {
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

    const handleLogout = () => {
        authService.logout();
        router.push('/login');
    };

    const menuGroups: NavGroup[] = [
        {
            label: 'Organization',
            items: [
                { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
                { name: 'Companies (Vendors)', href: '/admin/company', icon: Building2 },
                { name: 'Company Categories', href: '/admin/company-categories', icon: Tag },
            ],
        },
        {
            label: 'Store Management',
            items: [
                { name: 'Products', href: '/admin/products', icon: Package, badge: counts.products },
                { name: 'Inventory', href: '/admin/inventory', icon: Warehouse, badge: counts.lowStock, alert: counts.lowStock > 0 },
                { name: 'Sales Orders', href: '/admin/sales', icon: TrendingUp, badge: counts.orders, alert: counts.pendingOrders > 0 },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: ArrowLeftRight },
                { name: 'Purchases', href: '/admin/purchases', icon: PackageSearch },
                { name: 'Return Purchase', href: '/admin/returns', icon: RotateCcw },
            ],
        },
        {
            label: 'Users & Control',
            items: [
                { name: 'Customers', href: '/admin/customers', icon: Users, badge: counts.customers },
                { name: 'Staff & Users', href: '/admin/users', icon: Users },
                { name: 'Roles & Access', href: '/admin/roles', icon: Shield },
            ],
        },
    ];

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <div className="w-64 bg-[#131921] border-r border-[#232F3E] min-h-screen hidden md:flex flex-col flex-shrink-0 z-20">

            {/* ── Logo Header ── */}
            <div className="px-6 py-7 border-b border-[#232F3E]">
                <Link href="/admin/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-[#FF9900] rounded-xl flex items-center justify-center group-hover:bg-[#e68a00] transition-colors">
                        <span className="font-black text-lg italic tracking-tighter text-[#131921]">AQ</span>
                    </div>
                    <div>
                        <h1 className="font-black text-white text-sm tracking-tight leading-none uppercase">Al-Qavi</h1>
                        <p className="text-[9px] font-bold text-[#FF9900] tracking-[0.3em] uppercase mt-1">Cosmetics Admin</p>
                    </div>
                </Link>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto px-3 custom-scrollbar py-4">
                {menuGroups.map((group, gIdx) => (
                    <div key={group.label} className={gIdx === 0 ? '' : 'mt-1'}>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 px-3 mb-1 mt-4 first:mt-0">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-bold
                                            ${active
                                                ? 'bg-[#FF9900] text-[#131921]'
                                                : 'text-gray-300 hover:text-white hover:bg-[#232F3E]'}`}>
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-4 w-4 transition-none ${active ? 'text-[#131921]' : 'text-gray-500 group-hover:text-gray-300'}`}
                                                strokeWidth={2.2} />
                                            <span>{item.name}</span>
                                        </div>
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <span className={`text-[10px] px-2 py-0.5 font-black rounded-md
                                                ${active
                                                    ? 'bg-[#131921]/20 text-[#131921]'
                                                    : item.alert ? 'bg-red-900/40 text-red-400' : 'bg-[#232F3E] text-gray-400'}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Footer ── */}
            <div className="border-t border-[#232F3E]">
                {/* Settings */}
                <Link href="/admin/settings"
                    className={`flex items-center gap-3 px-5 py-3 transition-all text-sm font-bold border-b border-[#232F3E] rounded-none
                        ${isActive('/admin/settings')
                            ? 'bg-[#FF9900] text-[#131921]'
                            : 'text-gray-300 hover:text-white hover:bg-[#232F3E]'}`}>
                    <Settings className="h-4 w-4" strokeWidth={2.2} />
                    <span>Settings</span>
                </Link>

                {/* User Card */}
                <div className="bg-[#0F1923] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-[#FF9900] rounded-lg flex items-center justify-center text-[#131921] font-black text-sm flex-shrink-0">
                            {(adminUser?.name?.[0] || 'A').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-gray-100 truncate tracking-tight">{adminUser?.name || 'Admin'}</p>
                            <p className="text-[10px] font-bold text-[#FF9900] truncate uppercase tracking-widest">Administrator</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Link href="/"
                            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-black text-gray-300 bg-[#232F3E] rounded-lg hover:bg-[#3d4f5c] transition-colors">
                            <ExternalLink className="h-3 w-3" /> Portal
                        </Link>
                        <button onClick={handleLogout}
                            className="flex items-center justify-center gap-1.5 py-2 text-[10px] font-black text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                            <LogOut className="h-3 w-3" /> Exit
                        </button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
            `}</style>
        </div>
    );
}
