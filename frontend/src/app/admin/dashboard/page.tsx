"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Package, Boxes, UserCheck, Clock, TrendingUp, DollarSign, Tag,
    ShoppingBag, ChevronDown, Search, Eye, Loader2, Calendar, Filter,
    RefreshCw, ChevronRight, LayoutDashboard, Truck, Activity, ShieldCheck,
    CreditCard, ExternalLink, History, BarChart3, Store, Bell, UserPlus, FileText,
    ArrowUpRight, ArrowDownRight, MoreVertical, ArrowRight, Wallet, CheckCircle,
    CheckCircle2
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
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const MetricCard = ({ label, value, subtext, icon: Icon, borderTop = "#e47911", alert = false }: any) => (
    <div className={`bg-white border border-[#ddd] p-5 rounded-[4px] shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${alert ? 'bg-amber-50/20' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: borderTop }}></div>
        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-center justify-between">
            <span className="text-[24px] font-medium text-[#111] tracking-tight">{value}</span>
            <Icon size={20} className="text-[#adb1b8] group-hover:text-[#565959] transition-colors" />
        </div>
        {subtext && (
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-[#eee]">
                <span className={`text-[11px] font-medium ${alert ? 'text-[#b12704]' : 'text-[#007185]'}`}>{subtext}</span>
            </div>
        )}
    </div>
);

export default function AdminDashboardPremium() {
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
        let activeOrders = recentOrders.filter((o: any) => (o.status || '').toUpperCase() !== 'DELIVERED');
        if (!searchQuery) return activeOrders;
        const q = searchQuery.toLowerCase();
        return activeOrders.filter((o: any) =>
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

            {/* ── Amazon Retail Header ── */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1440px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Overview</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">System Overview</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Manage and track your overall business metrics</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-white border border-[#adb1b8] rounded-[3px] p-0.5 shadow-sm">
                                <div className="flex items-center gap-2 px-3 py-1 border-r border-[#ddd]">
                                    <Calendar size={13} className="text-[#565959]" />
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="bg-transparent text-[12px] outline-none border-none font-medium cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1">
                                    <Filter size={13} className="text-[#565959]" />
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="bg-transparent text-[12px] outline-none border-none font-medium cursor-pointer"
                                    >
                                        <option value="ALL">All Payments</option>
                                        <option value="COD">C.O.D</option>
                                        <option value="ONLINE">Bank Transfer</option>
                                        <option value="SHOP">Shop POS</option>
                                    </select>
                                </div>
                            </div>
                            <Btn variant="secondary" onClick={refetch} className="h-[31px]">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1440px] mx-auto px-6 mt-8">

                {/* ── METRICS GRID ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        label="Total Sales"
                        value={formatCurrency(stats.totalRevenue || 0)}
                        subtext="All time revenue"
                        icon={DollarSign}
                        borderTop="#e47911"
                    />
                    <MetricCard
                        label="Total Profit"
                        value={formatCurrency(stats.totalProfit || 0)}
                        subtext="Net earnings"
                        icon={TrendingUp}
                        borderTop="#067d62"
                    />
                    <MetricCard
                        label="Supplier Payments"
                        value={formatCurrency(stats.totalPayable || 0)}
                        subtext="Pending bills"
                        icon={CreditCard}
                        borderTop="#f0c14b"
                        alert={(stats.totalPayable || 0) > 0}
                    />
                    <MetricCard
                        label="Overall Orders"
                        value={stats.totalOrders || 0}
                        subtext="Lifetime count"
                        icon={ShoppingBag}
                        borderTop="#007185"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ── MAIN TABLE AREA ── */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                            <div className="px-6 py-4 border-b border-[#ddd] flex items-center justify-between bg-[#f7f8fa]">
                                <h2 className="text-[17px] font-bold text-[#111]">Latest Orders</h2>
                                <Link href="/admin/sales" className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-bold flex items-center gap-1">
                                    View all orders <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="p-4 border-b border-[#eee]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                    <input
                                        type="text"
                                        placeholder="Search order ID or customer name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-[35px] pl-10 pr-4 border border-[#adb1b8] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto text-left">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#f7f8fa] border-b border-[#ddd]">
                                        <tr className="text-[12px] font-bold text-[#111]">
                                            <th className="px-6 py-3">Order Details</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                            <th className="px-6 py-3">Status Update</th>
                                            <th className="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {filteredOrders.length > 0 ? (
                                            filteredOrders.map((order: any) => (
                                                <tr key={order.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <Link href={`/admin/sales/${order.id}/invoice`} className="font-bold text-[#007185] hover:underline">
                                                                #{order.order_number}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-[11px] text-[#565959] mt-0.5">
                                                                <span className="font-bold text-[#111]">{order.customer_name || 'Walk-in'}</span>
                                                                <span>•</span>
                                                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-bold text-[#111]">{formatCurrency(order.total_amount)}</div>
                                                        <div className="text-[10px] font-bold text-[#aaa] uppercase tracking-tighter mt-1">{order.payment_method || 'C.O.D'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="relative">
                                                            <select
                                                                value={(order.status || '').toLowerCase()}
                                                                onChange={(e) => handleQuickStatusUpdate(order.id?.toString(), e.target.value)}
                                                                disabled={updatingRow === order.id?.toString()}
                                                                className={`h-[28px] pl-2 pr-8 bg-white border border-[#adb1b8] rounded-[3px] text-[11px] font-medium outline-none cursor-pointer appearance-none focus:border-[#e77600] disabled:opacity-50
                                                                    ${(order.status || '').toUpperCase() === 'DELIVERED' ? 'text-green-700 bg-green-50' : 'text-[#111]'}`}
                                                            >
                                                                {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#565959] pointer-events-none" />
                                                            {updatingRow === order.id?.toString() && (
                                                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                                    <Loader2 size={14} className="animate-spin text-[#c45500]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Btn variant="secondary" className="h-[24px] px-2" onClick={() => router.push(`/admin/sales/${order.id}/invoice`)}>
                                                            <Eye size={12} />
                                                        </Btn>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-[13px] text-[#565959]">
                                                    No active orders found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── SIDEBAR WIDGETS ── */}
                    <div className="space-y-6 text-left">
                        {/* Quick Navigation */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <h3 className="text-[15px] font-bold text-[#111] mb-5 border-b border-[#eee] pb-2">Quick Menu</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { title: 'New Sale', icon: Store, href: '/admin/sale' },
                                    { title: 'Products', icon: Boxes, href: '/admin/products' },
                                    { title: 'Stock', icon: Package, href: '/admin/inventory/list' },
                                    { title: 'Suppliers', icon: UserPlus, href: '/admin/company/suppliers' },
                                    { title: 'Transactions', icon: History, href: '/admin/sales' },
                                    { title: 'Settings', icon: ShieldCheck, href: '/admin/settings' },
                                ].map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={item.href}
                                        className="flex flex-col items-center gap-2 p-3 bg-[#f7f8fa] hover:bg-[#e7e9ec] border border-[#ddd] rounded-[3px] transition-all group"
                                    >
                                        <item.icon size={20} className="text-[#565959] group-hover:text-[#e47911]" />
                                        <span className="text-[11px] font-black text-[#111] uppercase tracking-tighter">{item.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* System Status Alert */}
                        <div className={`rounded-[4px] p-5 border ${(stats.pendingOrders || 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} `}>
                            <div className="flex gap-4">
                                <Activity size={24} className={(stats.pendingOrders || 0) > 0 ? 'text-[#c45500]' : 'text-green-600'} />
                                <div>
                                    <h4 className="text-[15px] font-bold text-[#111]">System Status</h4>
                                    <p className="text-[13px] mt-1 text-[#565959] leading-normal">
                                        {(stats.pendingOrders || 0) > 0
                                            ? `You have ${stats.pendingOrders} pending orders today.`
                                            : "All operations are currently up to date."
                                        }
                                    </p>
                                    <button
                                        onClick={() => router.push('/admin/sales')}
                                        className="mt-3 text-[11px] font-bold text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1"
                                    >
                                        Handle Tasks <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Log */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left">
                            <div className="bg-[#f7f8fa] px-4 py-2 border-b border-[#ddd]">
                                <h3 className="text-[13px] font-bold text-[#111]">Recent Activity</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {recentOrders.slice(0, 5).map((o: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 text-[12px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#adb1b8] mt-1.5 shrink-0"></div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#111]">New Order #{o.order_number} received</span>
                                            <span className="text-[11px] text-[#565959] mt-0.5">
                                                {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


