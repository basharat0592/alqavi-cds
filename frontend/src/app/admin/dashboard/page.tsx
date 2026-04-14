'use client';

import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Package, Boxes, UserCheck, Clock, TrendingUp, DollarSign, Tag,
    ShoppingBag, ChevronDown, Search, Eye, Loader2, Calendar, Filter
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { orderService } from '@/lib/api';

/* ═══════════════════════════════════════════════════════
   ADMIN DASHBOARD PAGE — Clean Command Center
   Inspired by Baltistan Chinese Food admin layout
═══════════════════════════════════════════════════════ */

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-teal-100 text-teal-700 border-teal-200',
};

const TABS = ['Orders', 'History', 'Categories', 'Products', 'Stocks', 'Suppliers'] as const;

const TAB_LINKS: Record<string, string> = {
    Orders: '/admin/sales/recent',
    History: '/admin/sales',
    Categories: '/admin/products/categories',
    Products: '/admin/products',
    Stocks: '/admin/inventory/list',
    Suppliers: '/admin/company/suppliers',
};

export default function AdminDashboard() {
    const router = useRouter();
    const [filterDate, setFilterDate] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
    
    // Memoize filters to pass to the hook
    const dashboardFilters = useMemo(() => ({
        date: filterDate || undefined,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined
    }), [filterDate, paymentMethod]);

    const {
        stats,
        recentOrders,
        loading,
        refetch
    } = useAdminDashboard(dashboardFilters);

    const [activeTab, setActiveTab] = useState<string>('Orders');
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);

    if (loading) return <PageLoader />;

    // Filter orders based on search
    const filteredOrders = recentOrders.filter((o: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (o.order_number || '').toLowerCase().includes(q) ||
            (o.customer_name || '').toLowerCase().includes(q) ||
            (o.status || '').toLowerCase().includes(q)
        );
    });

    const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
        setUpdatingRow(orderId);
        try {
            await orderService.update(orderId, { status: newStatus.toUpperCase() });
            refetch();
        } catch (error) {
            console.error('Update failed', error);
        } finally {
            setUpdatingRow(null);
        }
    };

    const formatDate = (d: string) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="max-w-[1400px] mx-auto py-6 px-4 font-sans animate-in fade-in duration-500">

            {/* ── Status Bar & Global Filters ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        App Status:
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                        🟢 Online (Taking Orders)
                    </span>
                </div>

                {/* Dashboard Global Filters */}
                <div className="flex items-center gap-3 bg-white dark:bg-[#2d3a4b] p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <div className="flex items-center gap-2 px-2 py-1 border-r border-slate-100 dark:border-white/10">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <input 
                            type="date" 
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <select 
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer pr-4"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="COD">C.O.D</option>
                            <option value="ONLINE">Online</option>
                            <option value="SHOP">Shop (Walk-in)</option>
                        </select>
                    </div>
                    { (filterDate || paymentMethod !== 'ALL') && (
                        <button 
                            onClick={() => { setFilterDate(''); setPaymentMethod('ALL'); }}
                            className="px-2 py-1 text-[10px] font-black text-[#F59E0B] hover:bg-[#F59E0B]/5 rounded-lg transition-colors"
                        >
                            CLEAR
                        </button>
                    )}
                </div>

                <span className="hidden lg:block text-[11px] text-slate-400 font-medium">
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            </div>

            {/* ── Key Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

                {/* Total Sales */}
                <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Sales</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Delivered orders only</p>
                </div>

                {/* Total Profit */}
                <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Total Profit</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {formatCurrency(stats.totalProfit || 0)}
                    </p>
                    <p className="text-[10px] text-emerald-500/70 mt-1 font-medium italic">Net Earnings</p>
                </div>

                {/* Total Orders */}
                <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Orders</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {stats.totalOrders}
                    </p>
                </div>

                {/* Pending */}
                <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pending</p>
                    <p className="text-2xl font-black text-amber-500 tracking-tight">
                        {stats.pendingOrders || 0}
                    </p>
                </div>

                {/* Delivered */}
                <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Delivered</p>
                    <p className="text-2xl font-black text-emerald-500 tracking-tight">
                        {stats.deliveredOrders || 0}
                    </p>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">

                {/* Tab Bar */}
                <div className="flex items-center gap-0 border-b border-slate-100 dark:border-white/10 overflow-x-auto no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                if (tab === 'Orders') {
                                    setActiveTab(tab);
                                } else {
                                    // Smooth navigation using router
                                    router.push(TAB_LINKS[tab]);
                                }
                            }}
                            className={`relative px-5 py-3.5 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap transition-all
                                ${activeTab === tab
                                    ? 'text-[#F59E0B] bg-[#F59E0B]/5'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F59E0B] rounded-t-full" />
                            )}
                            {tab === 'Orders' && recentOrders.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-[#F59E0B] text-white text-[9px] font-black rounded-full min-w-[18px] inline-flex items-center justify-center">
                                    {recentOrders.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Orders Content */}
                {activeTab === 'Orders' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Search Bar */}
                        <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] transition-colors text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Orders Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/10">
                                    <tr>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order #</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredOrders.length > 0 ? (
                                        filteredOrders.map((order: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 text-[12px] font-bold text-[#F59E0B] tracking-tight">
                                                    {order.order_number}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{order.customer_name || 'Walk-in'}</p>
                                                    <p className="text-[10px] text-slate-400">{order.phone_number || ''}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-widest border border-slate-200 dark:border-white/10
                                                        ${order.payment_method === 'SHOP' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
                                                        {order.payment_method || 'C.O.D'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-[12px] font-black text-slate-900 dark:text-white">
                                                    {formatCurrency(order.total_amount)}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="relative">
                                                        <select
                                                            value={(order.status || '').toLowerCase()}
                                                            onChange={(e) => handleQuickStatusUpdate(order.id?.toString(), e.target.value)}
                                                            disabled={updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'DELIVERED'}
                                                            className={`px-2.5 py-1 text-[10px] font-bold capitalize rounded-lg border outline-none transition-colors
                                                                ${(updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'DELIVERED') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                                ${STATUS_COLORS[(order.status || '').toLowerCase()] || 'bg-slate-100 text-slate-600 border-slate-200'}
                                                                `}
                                                        >
                                                            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                        {updatingRow === order.id?.toString() && (
                                                            <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#F59E0B]" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <Link
                                                        href={`/admin/sales/${order.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-[#F59E0B] bg-slate-50 dark:bg-white/5 hover:bg-[#F59E0B]/5 border border-slate-200 dark:border-white/10 hover:border-[#F59E0B]/30 rounded-lg transition-all uppercase tracking-wider"
                                                    >
                                                        <Eye className="h-3 w-3" /> View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-16 text-center">
                                                <ShoppingBag className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                                <p className="text-sm text-slate-400 font-bold">No orders found</p>
                                                <p className="text-[11px] text-slate-300 mt-1">Try adjusting your filters or search query</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer */}
                        {filteredOrders.length > 0 && (
                            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Showing <span className="font-bold text-slate-600 dark:text-slate-300">{filteredOrders.length}</span> items
                                </p>
                                <Link
                                    href="/admin/sales/recent"
                                    className="text-[11px] font-bold text-[#F59E0B] hover:underline uppercase tracking-wider"
                                >
                                    View All History →
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Quick Access Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
                {[
                    { title: 'Shop (POS)', icon: ShoppingBag, href: '/admin/sales/create', color: 'text-indigo-500' },
                    { title: 'Recent Orders', icon: Clock, href: '/admin/sales/recent', color: 'text-amber-500' },
                    { title: 'Sales Overview', icon: TrendingUp, href: '/admin/sales', color: 'text-emerald-500' },
                    { title: 'Add Product', icon: Package, href: '/admin/products/add', color: 'text-blue-500' },
                    { title: 'Categories', icon: Tag, href: '/admin/products/categories', color: 'text-purple-500' },
                    { title: 'Add Stocks', icon: Boxes, href: '/admin/inventory/list', color: 'text-indigo-500' },
                ].map((item, idx) => (
                    <Link
                        key={idx}
                        href={item.href}
                        className="flex flex-col items-center gap-2.5 p-4 bg-white dark:bg-[#2d3a4b] border border-slate-200 dark:border-white/10 rounded-xl hover:shadow-md hover:border-[#F59E0B]/30 transition-all group active:scale-95"
                    >
                        <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 ${item.color} group-hover:scale-110 transition-transform`}>
                            <item.icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#F59E0B] transition-colors text-center uppercase tracking-wider">
                            {item.title}
                        </span>
                    </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-16 py-8 border-t border-slate-200 dark:border-white/10 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">© 2026 Al-Qavi Admin • Enterprise Edition</p>
            </div>
        </div>
    );
}
