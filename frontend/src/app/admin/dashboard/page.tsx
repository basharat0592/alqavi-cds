"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package, Boxes, UserCheck, Clock, TrendingUp, DollarSign, Tag,
    ShoppingBag, ChevronDown, Search, Eye, Loader2, Calendar, Filter,
    RefreshCw, ChevronRight, LayoutDashboard, Truck, Activity, ShieldCheck,
    CreditCard, ExternalLink, History, BarChart3, Store, Bell, UserPlus, FileText
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import { orderService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - DASHBOARD
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const MetricCard = ({ label, value, subtext, color = "#111", borderTop = "#e47911", alert = false }: any) => (
    <div className={`bg-white border border-[#ddd] p-5 rounded-[4px] shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${alert ? 'bg-amber-50/20' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: borderTop }}></div>
        <p className="text-[12px] font-bold text-[#565959] uppercase tracking-tight mb-2">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-medium leading-none" style={{ color: color }}>{value}</span>
        </div>
        {subtext && (
            <div className="flex items-center gap-1.5 mt-3">
                <span className={`text-[11px] font-medium ${alert ? 'text-amber-700' : 'text-[#565959]'}`}>{subtext}</span>
            </div>
        )}
    </div>
);

export default function AdminDashboard() {
    const router = useRouter();
    const [filterDate, setFilterDate] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
    
    const dashboardFilters = useMemo(() => ({
        date: filterDate || undefined,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined
    }), [filterDate, paymentMethod]);

    const { stats, recentOrders, loading, refetch } = useAdminDashboard(dashboardFilters);

    const [searchQuery, setSearchQuery] = useState('');
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);

    const filteredOrders = useMemo(() => {
        if (!searchQuery) return recentOrders;
        const q = searchQuery.toLowerCase();
        return recentOrders.filter((o: any) => 
            (o.order_number || '').toLowerCase().includes(q) ||
            (o.customer_name || '').toLowerCase().includes(q)
        );
    }, [recentOrders, searchQuery]);

    const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
        setUpdatingRow(orderId);
        try {
            await orderService.update(orderId, { status: newStatus.toUpperCase() });
            toast.success('Status updated');
            refetch();
        } catch { toast.error('Update failed'); } finally { setUpdatingRow(null); }
    };

    if (loading && !stats.totalOrders) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            
            {/* Breadcrumb & Header */}
            <div className="max-w-[1440px] mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div>
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] mb-1">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Overview</span>
                    </div>
                    <h1 className="text-[24px] font-normal leading-tight">Dashboard</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-[#adb1b8] rounded-[4px] p-0.5 shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-1 border-r border-[#ddd]">
                            <Calendar size={13} className="text-[#565959]" />
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-[12px] outline-none border-none font-medium cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1">
                            <Filter size={13} className="text-[#565959]" />
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="bg-transparent text-[12px] outline-none border-none font-medium cursor-pointer">
                                <option value="ALL">All Payments</option>
                                <option value="COD">C.O.D</option>
                                <option value="ONLINE">Bank Transfer</option>
                                <option value="SHOP">Shop POS</option>
                            </select>
                        </div>
                    </div>
                    <Btn variant="secondary" onClick={() => { setFilterDate(''); setPaymentMethod('ALL'); refetch(); }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Btn>
                </div>
            </div>

            <div className="max-w-[1440px] mx-auto px-6">
                
                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <MetricCard label="Total Sales" value={formatCurrency(stats.totalRevenue)} subtext="Cumulative revenue" borderTop="#e47911" />
                    <MetricCard label="Net Profit" value={formatCurrency(stats.totalProfit || 0)} subtext="Total earnings" color="#067d62" borderTop="#067d62" />
                    <MetricCard label="Orders" value={stats.totalOrders} subtext="Total orders placed" borderTop="#3498db" />
                    <MetricCard label="Pending Orders" value={stats.pendingOrders || 0} subtext="Requires attention" color="#c45500" borderTop="#f0c14b" alert={true} />
                    <MetricCard label="Delivered" value={`${Math.round((stats.deliveredOrders / (stats.totalOrders || 1)) * 100)}%`} subtext={`${stats.deliveredOrders} orders complete`} color="#007185" borderTop="#007185" />
                </div>

                <div className="flex flex-col lg:flex-row gap-6 text-left">
                    {/* Orders Table */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden mb-6">
                            <div className="flex items-center px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] justify-between">
                                <h2 className="text-[17px] font-bold">Recent Orders</h2>
                                <Link href="/admin/sales" className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-bold flex items-center gap-1">
                                    View all <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="p-4 border-b border-[#eee]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                    <input
                                        type="text"
                                        placeholder="Search order ID or customer..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-[31px] pl-10 pr-4 border border-[#adb1b8] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f0f2f2] border-b border-[#ddd]">
                                        <tr>
                                            <th className="px-6 py-3 text-[12px] font-bold text-[#111]">Order #</th>
                                            <th className="px-6 py-3 text-[12px] font-bold text-[#111]">Customer</th>
                                            <th className="px-6 py-3 text-[12px] font-bold text-[#111]">Method</th>
                                            <th className="px-6 py-3 text-[12px] font-bold text-[#111]">Total</th>
                                            <th className="px-6 py-3 text-[12px] font-bold text-[#111]">Status</th>
                                            <th className="px-6 py-3 text-[12px] font-bold text-[#111] text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {filteredOrders.length > 0 ? (
                                            filteredOrders.map((order: any, i: number) => (
                                                <tr key={i} className="hover:bg-[#fcfdff] transition-colors text-[13px]">
                                                    <td className="px-6 py-4">
                                                        <Link href={`/admin/sales/${order.id}`} className="font-bold text-[#007185] hover:underline">
                                                            #{order.order_number}
                                                        </Link>
                                                        <div className="text-[11px] text-[#aaa] mt-0.5">{new Date(order.created_at).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-[#111]">{order.customer_name || 'Walk-in'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 uppercase font-bold text-[11px] text-[#565959]">{order.payment_method || 'C.O.D'}</td>
                                                    <td className="px-6 py-4 font-bold text-[#111]">{formatCurrency(order.total_amount)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="relative inline-block">
                                                            <select
                                                                value={(order.status || '').toLowerCase()}
                                                                onChange={(e) => handleQuickStatusUpdate(order.id?.toString(), e.target.value)}
                                                                disabled={updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'DELIVERED'}
                                                                className={`h-[26px] pl-2 pr-6 border border-[#adb1b8] rounded-[3px] text-[11px] font-medium outline-none cursor-pointer bg-[#f7f8fa] hover:bg-white
                                                                    ${(order.status || '').toUpperCase() === 'DELIVERED' ? 'text-green-700 bg-green-50' : 'text-[#111]'}`}
                                                            >
                                                                {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Btn variant="secondary" onClick={() => router.push(`/admin/sales/${order.id}`)} className="h-[24px]">View</Btn>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6} className="py-20 text-center text-[13px] text-[#565959]">No orders found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Quick Menu */}
                    <div className="w-full lg:w-[320px] space-y-6">
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <h3 className="text-[15px] font-bold mb-4">Quick Menu</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { title: 'New Sale', icon: Store, href: '/admin/sale' },
                                    { title: 'Products', icon: Boxes, href: '/admin/products' },
                                    { title: 'Inventory', icon: Package, href: '/admin/inventory/list' },
                                    { title: 'Suppliers', icon: UserPlus, href: '/admin/company/suppliers' },
                                    { title: 'Warehouses', icon: Truck, href: '/admin/inventory/warehouses' },
                                    { title: 'Settings', icon: ShieldCheck, href: '/admin/settings' },
                                ].map((item, idx) => (
                                    <Link key={idx} href={item.href} className="flex flex-col items-center gap-2 p-3 bg-[#f7f8fa] hover:bg-[#e7e9ec] border border-[#ddd] rounded-[4px] transition-colors group">
                                        <item.icon size={20} className="text-[#565959] group-hover:text-[#e47911]" />
                                        <span className="text-[11px] font-bold text-[#111]">{item.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-4 text-[12px]">
                            <div className="flex gap-3">
                                <Activity size={18} className="text-amber-600 shrink-0" />
                                <div>
                                    <p className="font-bold text-amber-800">Status</p>
                                    <p className="text-amber-700 mt-1">{stats.pendingOrders > 0 ? `You have ${stats.pendingOrders} pending orders.` : "All orders are up to date."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
