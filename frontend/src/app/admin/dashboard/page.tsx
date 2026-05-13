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
    CheckCircle2, Info, X, Printer, AlertTriangle, User
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { useAdminDashboard } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import { orderService, inventoryService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - MAIN DASHBOARD
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const formatK = (num: number) => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
};

const MetricCard = ({ label, value, subtext, icon: Icon, color = "#e47911", alert = false, prefix = "Rs. " }: any) => (
    <div className="bg-white p-5 rounded-[2px] border border-[#edf2f7] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 group relative">
        <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
                <p className="text-[11px] font-bold text-[#718096] uppercase tracking-[0.05em]">{label}</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-[#1a202c] tracking-tight flex items-baseline">
                        {prefix && <span className="text-[16px] mr-0.5 opacity-60 font-medium">{prefix}</span>}
                        {value}
                    </h3>
                    {alert && (
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                    )}
                </div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${color}15`, color: color }}>
                <Icon size={20} strokeWidth={2.2} />
            </div>
        </div>

        {subtext && (
            <div className="flex items-center gap-1.5 pt-3 border-t border-[#f7f9fc]">
                <p className="text-[12px] text-[#4a5568] font-medium">
                    {subtext}
                </p>
                <ArrowRight size={10} className="text-[#a0aec0] group-hover:translate-x-1 transition-transform" />
            </div>
        )}
    </div>
);

// Dead code removed

export default function AdminDashboard() {
    const router = useRouter();
    const [filterDate, setFilterDate] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('ALL');

    const dashboardFilters = useMemo(() => ({
        date: filterDate || undefined,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined
    }), [filterDate, paymentMethod]);

    const { stats, recentOrders, revenueData30, topProducts, products, loading, refetch } = useAdminDashboard(dashboardFilters);

    // Live Telemetry: Auto-update every 2 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            // Only refetch if not already loading to prevent overlap
            if (!loading) {
                refetch();
            }
        }, 2000);
        return () => clearInterval(timer);
    }, [refetch, loading]);

    const [searchQuery, setSearchQuery] = useState('');
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [deliveryModal, setDeliveryModal] = useState<{ orderId: string, status: string, order?: any } | null>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
    const [allStocks, setAllStocks] = useState<any[]>([]);

    useEffect(() => {
        inventoryService.getWarehouses().then(setWarehouses).catch(() => []);
        inventoryService.getInventory().then(setAllStocks).catch(() => []);
    }, []);

    const activeOrders = useMemo(() => {
        // Use recentOrders (unfiltered by date from backend)
        let items = recentOrders.filter((o: any) =>
            (o.status || '').toUpperCase() !== 'DELIVERED' &&
            (o.status || '').toUpperCase() !== 'CANCELLED'
        );
        if (!searchQuery) return items;
        const q = searchQuery.toLowerCase();
        return items.filter((o: any) =>
            (o.order_number || '').toLowerCase().includes(q) ||
            (o.tracking_id || '').toLowerCase().includes(q) ||
            (o.customer_name || '').toLowerCase().includes(q)
        );
    }, [recentOrders, searchQuery]);

    const cancelRequests = useMemo(() =>
        activeOrders.filter((o: any) => (o.status || '').toUpperCase() === 'CANCEL_REQUESTED'),
        [activeOrders]);

    const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
        const order = recentOrders.find((o: any) => o.id?.toString() === orderId.toString());
        if (newStatus.toLowerCase() === 'delivered') {
            setDeliveryModal({ orderId, status: newStatus, order });
            return;
        }

        setUpdatingRow(orderId);
        try {
            const data = await orderService.update(orderId, { status: newStatus.toUpperCase() });

            if (newStatus.toUpperCase() === 'CONFIRMED') {
                // Pre-calculate the message and number for direct redirection
                const encodedMsg = encodeURIComponent(data.whatsapp_message || '');
                let cleanNumber = (data.whatsapp_number || '').replace(/\D/g, '');
                if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
                    cleanNumber = '92' + cleanNumber.slice(1);
                } else if (cleanNumber.length === 10) {
                    cleanNumber = '92' + cleanNumber;
                }

                // Immediate Redirection to WhatsApp Desktop Application
                window.open(`whatsapp://send/?phone=${cleanNumber}&text=${encodedMsg}`, '_blank');
                toast.success('Order accepted! Opening WhatsApp Desktop...', { icon: '✅' });
            } else {
                toast.success('Status updated');
            }
            refetch();
        } catch (err: any) {
            console.error("Order Update Error:", err);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Update failed';
            toast.error(errorMsg);
        } finally {
            setUpdatingRow(null);
        }
    };

    const confirmDelivery = async () => {
        if (!deliveryModal || !selectedWarehouse) return;

        setIsSubmittingDelivery(true);
        setUpdatingRow(deliveryModal.orderId);
        try {
            await orderService.update(deliveryModal.orderId, {
                status: 'DELIVERED',
                warehouse_id: selectedWarehouse
            });
            toast.success('Order delivered & stock deducted');
            setDeliveryModal(null);
            setSelectedWarehouse('');
            refetch();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Delivery update failed';
            toast.error(msg);
        } finally {
            setIsSubmittingDelivery(false);
            setUpdatingRow(null);
        }
    };

    const getWarehouseStockInfo = () => {
        if (!deliveryModal?.order || !selectedWarehouse) return [];
        const items = deliveryModal.order.items || [];
        return items.map((item: any) => {
            // Find stock in selected warehouse matching name, weight, and size
            const stock = allStocks.find(s =>
                (s.product_name || '').toLowerCase().trim() === (item.product_name || '').toLowerCase().trim() &&
                s.warehouse?.toString() === selectedWarehouse.toString() &&
                (s.weight || '') === (item.weight || '') &&
                (s.size || '') === (item.size || '')
            );
            return {
                ...item,
                available: stock?.total_quantity || 0,
                insufficient: (stock?.total_quantity || 0) < item.quantity
            };
        });
    };

    const warehouseStockInfo = getWarehouseStockInfo();
    const hasEnoughStock = warehouseStockInfo.every(i => !i.insufficient);

    if (loading && !stats.totalOrders) return <PageLoader />;

    return (
        <div className="min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="overflow-hidden">
                {/* ── Dashboard Top Navigation ── */}
                <div className="py-5">
                    <div className="max-w-[1440px] mx-auto px-6 text-left">
                        <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                            <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                            <ChevronRight size={10} />
                            <span className="text-[#c45500] font-bold">Center Overview</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-[22px] font-normal text-[#111]">Main Dashboard</h1>
                                <p className="text-[13px] text-[#565959] mt-0.5">Live business summary and quick controls</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex rounded-[3px] p-0.5 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-1 border-r border-[#eee]">
                                        <Calendar size={13} className="text-[#565959]" />
                                        <input
                                            type="date"
                                            value={filterDate}
                                            onChange={(e) => setFilterDate(e.target.value)}
                                            className="bg-transparent text-[11px] outline-none border-none font-bold cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1">
                                        <Filter size={13} className="text-[#565959]" />
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="bg-transparent text-[11px] outline-none border-none font-bold cursor-pointer"
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

                <div className="max-w-[1440px] mx-auto px-6 mt-8 space-y-8 pb-10">
                    {/* ── Key Metrics ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <MetricCard
                            label="Total Money"
                            value={formatK(stats.totalRevenue || 0)}
                            subtext="All history sales"
                            icon={DollarSign}
                            color="#e47911"
                        />
                        <MetricCard
                            label="Net Profit"
                            value={formatK(stats.totalProfit || 0)}
                            subtext="Total earnings"
                            icon={TrendingUp}
                            color="#067d62"
                        />
                        <MetricCard
                            label="Active Orders"
                            value={stats.totalActive || stats.pendingOrders || 0}
                            subtext="Total open orders"
                            icon={Package}
                            color="#007185"
                            prefix=""
                        />
                        <MetricCard
                            label="Pending Submission"
                            value={stats.pendingOrders || 0}
                            subtext="Need your approval"
                            icon={Clock}
                            color="#f0c14b"
                            alert={(stats.pendingOrders || 0) > 0}
                            prefix=""
                        />
                    </div>

                    {/* ── Orders Table ── */}
                    <div className="w-full space-y-8 animate-in fade-in duration-700 delay-150">
                        <div className="bg-white border border-[#ddd] rounded-[2px] shadow-sm overflow-hidden text-left">
                            <div className="px-6 py-4 border-b border-[#ddd] flex items-center justify-between bg-[#f7f8fa]">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[17px] font-bold text-[#111]">Active Orders</h2>
                                    {cancelRequests.length > 0 && (
                                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase rounded-full animate-pulse">
                                            {cancelRequests.length} Cancel Request{cancelRequests.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <Link href="/admin/sales" className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-bold flex items-center gap-1">
                                    See all <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="p-4 border-b border-[#eee]">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa] group-focus-within:text-[#e77600] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search order number or customer name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-[35px] pl-10 pr-4 border border-[#adb1b8] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#f7f8fa] border-b border-[#ddd]">
                                        <tr className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                            <th className="px-6 py-3 text-left">Order Detail</th>
                                            <th className="px-6 py-3 text-right">Price</th>
                                            <th className="px-6 py-3 text-left">Current Status</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {activeOrders.length > 0 ? (
                                            activeOrders.map((order: any) => (
                                                <tr key={order.id} className={`transition-colors group ${(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' ? 'bg-rose-50 border-l-4 border-l-rose-400' : 'hover:bg-[#fcfdff]'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <Link href={`/admin/sales/${order.id}/invoice`} className="text-[14px] font-bold text-[#007185] hover:underline">
                                                                #{order.order_number}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-[11px] text-[#565959] mt-1 font-medium">
                                                                <span className="text-[#111]">{order.customer_name || 'Walk-in'}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-[14px] font-bold text-[#111]">{formatCurrency(order.total_amount)}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{order.payment_method || 'C.O.D'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="relative inline-block min-w-[120px]">
                                                            <select
                                                                value={(order.status || '').toLowerCase()}
                                                                onChange={(e) => handleQuickStatusUpdate(order.id?.toString(), e.target.value)}
                                                                disabled={updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'PENDING'}
                                                                className={`w-full h-[28px] pl-2 pr-8 bg-white border border-[#adb1b8] rounded-[3px] text-[11px] font-bold outline-none cursor-pointer appearance-none focus:border-[#e77600] disabled:bg-[#f9f9f9] disabled:cursor-not-allowed transition-all
                                                                    ${(order.status || '').toUpperCase() === 'DELIVERED' ? 'text-green-700 bg-green-50' : 'text-[#111]'}`}
                                                            >
                                                                {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#565959] pointer-events-none" />
                                                            {updatingRow === order.id?.toString() && (
                                                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                                    <Loader2 size={14} className="animate-spin text-[#c45500]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {(order.status || '').toUpperCase() === 'PENDING' && (
                                                                <Btn
                                                                    loading={updatingRow === order.id?.toString()}
                                                                    onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                    className="h-[26px] bg-gradient-to-b from-[#76c7c0] to-[#5ba8a0] border-[#4a8a83] text-white hover:from-[#88d9d2] hover:to-[#6bb9b1]"
                                                                >
                                                                    <CheckCircle2 size={12} /> Accept
                                                                </Btn>
                                                            )}
                                                            {(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' && (
                                                                <>
                                                                    <Btn
                                                                        loading={updatingRow === order.id?.toString()}
                                                                        onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CANCELLED')}
                                                                        className="h-[26px] bg-gradient-to-b from-rose-400 to-rose-500 border-rose-600 text-white hover:from-rose-500 hover:to-rose-600"
                                                                    >
                                                                        <X size={12} /> Approve Cancel
                                                                    </Btn>
                                                                    <Btn
                                                                        loading={updatingRow === order.id?.toString()}
                                                                        onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                        className="h-[26px] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] text-[#111]"
                                                                    >
                                                                        Reject
                                                                    </Btn>
                                                                </>
                                                            )}
                                                            <Btn variant="secondary" className="h-[26px] px-2" onClick={() => setSelectedOrder(order)}>
                                                                <Eye size={12} /> View
                                                            </Btn>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-[13px] text-[#565959] italic">
                                                    No new orders at the moment.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── Widgets ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700 delay-300">
                        {/* Quick Links */}
                        <div className="bg-white border border-[#ddd] rounded-[2px] p-5 shadow-sm">
                            <h3 className="text-[14px] font-bold text-[#111] mb-5 border-b border-[#f3f3f3] pb-2 uppercase tracking-wider">Quick Links</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { title: 'New Sale', icon: Store, href: '/admin/sale' },
                                    { title: 'Products', icon: Boxes, href: '/admin/products' },
                                    { title: 'Current Stock', icon: Package, href: '/admin/inventory/list' },
                                    { title: 'Suppliers', icon: UserPlus, href: '/admin/company/suppliers' },
                                    { title: 'Sales Hist', icon: History, href: '/admin/sales' },
                                    { title: 'Settings', icon: ShieldCheck, href: '/admin/settings' },
                                ].map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={item.href}
                                        className="flex flex-col items-center gap-2 py-4 bg-[#fcfcfc] hover:bg-white hover:shadow-md border border-[#eee] rounded-[2px] transition-all group"
                                    >
                                        <item.icon size={20} className="text-[#adb1b8] group-hover:text-[#c45500] transition-colors" />
                                        <span className="text-[10px] font-bold text-[#565959] group-hover:text-[#111] uppercase tracking-tighter transition-colors text-center">{item.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Daily Status */}
                        <div className={`rounded-[2px] p-5 border ${(stats.pendingOrders || 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} shadow-sm flex items-center`}>
                            <div className="flex gap-4">
                                <div className={`p-3 rounded-full ${(stats.pendingOrders || 0) > 0 ? 'bg-amber-100 text-[#c45500]' : 'bg-green-100 text-green-600'}`}>
                                    <Activity size={24} />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-[16px] font-bold text-[#111]">Daily Status</h4>
                                    <p className="text-[14px] mt-1 text-[#565959] leading-snug">
                                        {(stats.pendingOrders || 0) > 0
                                            ? `You have ${stats.pendingOrders} orders waiting.`
                                            : "All tasks are done for today."
                                        }
                                    </p>
                                    <button
                                        onClick={() => router.push('/admin/sales')}
                                        className="mt-3 text-[12px] font-bold text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1"
                                    >
                                        Manage Orders <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white border border-[#ddd] rounded-[2px] shadow-sm overflow-hidden text-left">
                            <div className="bg-[#f7f8fa] px-5 py-3 border-b border-[#ddd]">
                                <h3 className="text-[13px] font-bold text-[#111]">Recent Activity</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {recentOrders.slice(0, 4).map((o: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-4 text-[12px] group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0 group-hover:bg-amber-400 transition-colors"></div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#565959] group-hover:text-[#111] transition-colors line-clamp-1">New Order Received: #{o.order_number}</span>
                                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Visual Analytics Section ── */}
                    <div className="pt-4 space-y-8 animate-in fade-in duration-700 delay-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[18px] font-bold text-[#111] flex items-center gap-2">
                                <BarChart3 size={20} className="text-[#c45500]" />
                                Business Analytics
                            </h2>
                            <div className="flex items-center gap-4 text-[12px] font-medium text-[#565959]">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#007185]"></span> Sales</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f0c14b]"></span> Purchases</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sales & Growth Chart */}
                            <div className="bg-white p-6 rounded-[2px] border border-[#edf2f7] shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-[#111]">Sales Performance</h3>
                                        <p className="text-[12px] text-[#565959]">Revenue growth over the last 30 days</p>
                                    </div>
                                    <TrendingUp size={18} className="text-green-500" />
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData30 || []}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#007185" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#007185" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                tickFormatter={(str) => {
                                                    const date = new Date(str);
                                                    return date.getDate() % 5 === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                                }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                tickFormatter={(value) => `Rs.${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                                formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="#007185" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Purchase vs Sales Comparison */}
                            <div className="bg-white p-6 rounded-[2px] border border-[#edf2f7] shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-[#111]">Procurement vs Revenue</h3>
                                        <p className="text-[12px] text-[#565959]">Comparing stock investment vs sales</p>
                                    </div>
                                    <ShoppingBag size={18} className="text-amber-500" />
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={revenueData30?.slice(-10) || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            />
                                            <Bar dataKey="revenue" name="Sales" fill="#007185" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="profit" name="Profit" fill="#f0c14b" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Inventory Distribution */}
                            <div className="bg-white p-6 rounded-[2px] border border-[#edf2f7] shadow-sm lg:col-span-1">
                                <h3 className="text-[14px] font-bold text-[#111] mb-4">Stock Availability</h3>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'In Stock', value: products.filter(p => p.stock > 10).length },
                                                    { name: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 10).length },
                                                    { name: 'Out of Stock', value: products.filter(p => p.stock === 0).length }
                                                ]}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#067d62" />
                                                <Cell fill="#f0c14b" />
                                                <Cell fill="#b12704" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Selling Products */}
                            <div className="bg-white p-6 rounded-[2px] border border-[#edf2f7] shadow-sm md:col-span-2">
                                <h3 className="text-[14px] font-bold text-[#111] mb-6">Top Selling Inventory</h3>
                                <div className="space-y-4">
                                    {(topProducts || []).slice(0, 5).map((prod, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[11px] font-bold text-[#565959]">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-[13px] font-bold text-[#111] truncate max-w-[200px]">{(prod.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</span>
                                                    <span className="text-[12px] font-bold text-[#007185]">{prod.sales_count} sales</span>
                                                </div>
                                                <div className="w-full bg-[#f3f3f3] h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-[#007185] h-full transition-all duration-1000"
                                                        style={{ width: `${Math.min((prod.sales_count / (topProducts[0]?.sales_count || 1)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!topProducts || topProducts.length === 0) && (
                                        <div className="py-10 text-center text-[12px] text-gray-400 italic">No sales data available yet</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-left font-sans">
                    <div className="bg-white rounded-[4px] border border-[#ddd] max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#ddd] flex items-center justify-between bg-[#f7f8fa]">
                            <h3 className="text-[15px] font-bold text-[#111]">Order Details: #{selectedOrder.order_number}</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-[#aaa] hover:text-[#565959] transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3">Customer Information</p>
                                    <div className="space-y-1">
                                        <p className="text-[14px] font-bold text-[#111]">{selectedOrder.customer_name || 'Walk-in'}</p>
                                        <p className="text-[13px] text-[#565959]">{selectedOrder.phone_number || 'No phone provided'}</p>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-2">Shipping Address</p>
                                        <p className="text-[13px] text-[#565959] leading-relaxed">{selectedOrder.shipping_address || 'Shop Pickup / Over the counter'}</p>
                                    </div>
                                </div>
                                <div className="bg-[#fcfdff] p-4 border border-[#eee] rounded-[4px] flex flex-col justify-center">
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3 text-center">Status & Payment</p>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[13px]">
                                            <span className="text-[#565959]">Current Status:</span>
                                            <span className="font-bold text-[#007185] capitalize">{selectedOrder.status.toLowerCase()}</span>
                                        </div>
                                        <div className="flex justify-between text-[13px]">
                                            <span className="text-[#565959]">Payment Method:</span>
                                            <span className="font-bold text-[#111] uppercase">{selectedOrder.payment_method || 'C.O.D'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] font-bold text-[#aaa] uppercase mb-3">Items Purchased</p>
                            <div className="border border-[#eee] rounded-[4px] overflow-hidden">
                                <table className="w-full text-left text-[13px]">
                                    <thead className="bg-[#f9fafb]">
                                        <tr className="text-[11px] font-bold text-[#565959] uppercase">
                                            <th className="px-4 py-3 border-b">Product Name</th>
                                            <th className="px-4 py-3 border-b text-center">Qty</th>
                                            <th className="px-4 py-3 border-b text-right">Unit Price</th>
                                            <th className="px-4 py-3 border-b text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {selectedOrder.items?.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-[#111]">
                                                            {(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                                        </span>
                                                        {(item.weight || item.size) && (
                                                            <span className="text-[10px] text-[#e77600] font-black uppercase tracking-tight">
                                                                — {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-[#565959]">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-[#111]">{formatCurrency(item.quantity * parseFloat(item.price))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-[#0f1111] text-white">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 text-right text-[11px] uppercase tracking-widest opacity-70">Total Order Value</td>
                                            <td className="px-4 py-4 text-right text-[18px] font-bold text-[#ffd814]">{formatCurrency(selectedOrder.total_amount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {selectedOrder.notes && (
                                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-[4px]">
                                    <p className="text-[11px] font-bold text-amber-800 uppercase mb-1">Internal Notes</p>
                                    <p className="text-[13px] text-amber-700 italic leading-relaxed">"{selectedOrder.notes}"</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-[#f7f8fa] border-t border-[#ddd] flex gap-3">
                            <button onClick={() => setSelectedOrder(null)} className="flex-1 h-[35px] text-[13px] font-bold text-[#565959] bg-white border border-[#ddd] rounded-[3px] hover:bg-[#fcfdff] transition-all">Close Window</button>
                            <button
                                onClick={() => router.push(`/admin/sales/${selectedOrder.id}/invoice`)}
                                className="flex-1 h-[35px] text-[13px] font-bold text-[#111] bg-[#f0c14b] border border-[#a88734] rounded-[3px] hover:bg-[#f5d78e] flex items-center justify-center gap-2 shadow-sm transition-all shadow-[#00000010]"
                            >
                                <Printer size={16} /> Open Full Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warehouse Selection Modal for Delivery */}
            {deliveryModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-[#eee] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-black text-[#111] uppercase tracking-tight">Complete Delivery</h3>
                                    <p className="text-[12px] text-slate-500 font-medium">Select fulfillment warehouse</p>
                                </div>
                            </div>
                            <button onClick={() => setDeliveryModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex gap-3">
                                <Info size={18} className="text-blue-500 shrink-0" />
                                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                                    Select fulfillment warehouse to proceed. Stock will be deducted immediately.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ordered Products</h4>
                                    {selectedWarehouse && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasEnoughStock ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {hasEnoughStock ? 'Stock Confirmed' : 'Insufficient Stock'}
                                        </span>
                                    )}
                                </div>
                                <div className="border border-[#eee] rounded-lg overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-[12px] border-collapse">
                                        <thead className="bg-slate-50 border-b border-[#eee]">
                                            <tr className="text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="px-3 py-2 text-left font-black">Item Details</th>
                                                <th className="px-3 py-2 text-center font-black">Qty</th>
                                                <th className="px-3 py-2 text-right font-black">{selectedWarehouse ? 'Store' : 'Price'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#eee]">
                                            {(selectedWarehouse ? warehouseStockInfo : deliveryModal.order?.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className={item.insufficient ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}>
                                                    <td className="px-3 py-2">
                                                        <p className="font-bold text-[#111] leading-tight">{(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</p>
                                                        {(item.weight || item.size) && (
                                                            <p className="text-[9px] text-[#e77600] font-black uppercase tracking-tighter mt-0.5">
                                                                {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center font-bold text-slate-500">{item.quantity}</td>
                                                    <td className={`px-3 py-2 text-right font-black ${selectedWarehouse ? (item.insufficient ? 'text-rose-600' : 'text-emerald-600') : 'text-[#111]'}`}>
                                                        {selectedWarehouse ? item.available : formatCurrency(item.price)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedWarehouse && !hasEnoughStock && (
                                    <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-center gap-2">
                                        <AlertTriangle size={14} /> Critical: Missing items in this warehouse.
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    Fulfillment Warehouse
                                </label>
                                <select
                                    value={selectedWarehouse}
                                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                                    className="w-full h-[45px] px-4 border border-[#ddd] rounded-lg text-[14px] font-bold text-[#111] outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] bg-white transition-all appearance-none cursor-pointer shadow-sm"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23565959\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                >
                                    <option value="">Choose a warehouse...</option>
                                    {warehouses.map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-[#f9fafb] border-t border-[#eee] flex gap-3">
                            <button
                                onClick={() => setDeliveryModal(null)}
                                className="flex-1 h-[40px] text-[13px] font-bold text-slate-600 hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <Btn
                                loading={isSubmittingDelivery}
                                disabled={!selectedWarehouse || !hasEnoughStock}
                                onClick={confirmDelivery}
                                className={`flex-1 h-[40px] shadow-lg ${!selectedWarehouse || !hasEnoughStock ? 'grayscale' : 'shadow-amber-500/20'}`}
                            >
                                <CheckCircle size={16} /> Finish Delivery
                            </Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
