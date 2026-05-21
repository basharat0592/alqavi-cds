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

const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-transparent shadow-sm shadow-amber-500/10 font-semibold rounded-lg',
        secondary: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-zinc-700 dark:text-zinc-200 font-semibold rounded-lg',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[34px] px-4 text-[13px] border transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.97] ${styles[variant as keyof typeof styles]} ${className}`}>
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

const MetricCard = ({ label, value, subtext, icon: Icon, color = "#e47911", alert = false, prefix = "Rs. " }: any) => {
    const glowColor = color === "#e47911" || color === "#13b0d1" ? "rgba(19, 176, 209, 0.12)" :
                      color === "#067d62" || color === "#10b981" ? "rgba(16, 185, 129, 0.12)" :
                      color === "#007185" || color === "#6366f1" ? "rgba(99, 102, 241, 0.12)" :
                      color === "#f0c14b" || color === "#f59e0b" ? "rgba(245, 158, 11, 0.12)" : `${color}20`;
    
    const displayColor = color === "#e47911" ? "#13b0d1" :
                         color === "#067d62" ? "#10b981" :
                         color === "#007185" ? "#6366f1" :
                         color === "#f0c14b" ? "#f59e0b" : color;

    return (
        <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-350 group relative overflow-hidden text-left">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl animate-pulse"
                 style={{ backgroundColor: displayColor, opacity: 0.08 }}></div>
            
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase tracking-[0.1em]">{label}</p>
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-baseline">
                            {prefix && <span className="text-[16px] mr-0.5 opacity-60 font-semibold">{prefix}</span>}
                            {value}
                        </h3>
                        {alert && (
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm border border-transparent dark:border-white/5"
                    style={{ backgroundColor: glowColor, color: displayColor }}>
                    <Icon size={22} strokeWidth={2} />
                </div>
            </div>

            {subtext && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[12px] text-slate-500 dark:text-zinc-400 font-medium">
                        {subtext}
                    </p>
                    <ArrowRight size={12} className="text-slate-300 dark:text-zinc-600 group-hover:translate-x-1.5 group-hover:text-slate-500 dark:group-hover:text-zinc-400 transition-all duration-300" />
                </div>
            )}
        </div>
    );
};

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
    const hasEnoughStock = warehouseStockInfo.every((i: any) => !i.insufficient);

    if (loading && !stats.totalOrders) return <PageLoader />;

    return (
        <div className="min-h-screen pb-20 font-sans text-slate-800 dark:text-zinc-100">
            <div className="overflow-hidden">
                {/* ── Dashboard Top Navigation ── */}
                <div className="py-6">
                    <div className="max-w-[1440px] mx-auto px-6 text-left">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-400 dark:text-zinc-500 mb-3.5 font-semibold">
                            <Link href="/admin/dashboard" className="hover:text-amber-505 hover:underline transition-all">Dashboard</Link>
                            <ChevronRight size={10} className="opacity-70" />
                            <span className="text-amber-500 dark:text-amber-400 font-bold">Center Overview</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-[26px] font-black text-slate-850 dark:text-white tracking-tight uppercase">Main Dashboard</h1>
                                <p className="text-[13px] text-slate-400 dark:text-zinc-505 font-medium mt-0.5">Live business summary and quick controls</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-zinc-700/60 rounded-xl p-1 shadow-sm hover:shadow transition-all duration-300">
                                    <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-100 dark:border-zinc-700/60">
                                        <Calendar size={14} className="text-slate-400 dark:text-zinc-500" />
                                        <input
                                            type="date"
                                            value={filterDate}
                                            onChange={(e) => setFilterDate(e.target.value)}
                                            className="bg-transparent text-[12px] text-slate-700 dark:text-slate-200 outline-none border-none font-semibold cursor-pointer focus:ring-0 p-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5">
                                        <Filter size={14} className="text-slate-400 dark:text-zinc-500" />
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="bg-transparent text-[12px] text-slate-700 dark:text-slate-200 outline-none border-none font-semibold cursor-pointer focus:ring-0 p-0 pr-8"
                                        >
                                            <option value="ALL">All Payments</option>
                                            <option value="COD">C.O.D</option>
                                            <option value="ONLINE">Bank Transfer</option>
                                            <option value="SHOP">Shop POS</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={refetch} className="h-10 w-10 flex items-center justify-center bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-zinc-700/60 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 shadow-sm hover:shadow transition-all duration-350 active:scale-[0.97]">
                                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1440px] mx-auto px-6 mt-6 space-y-8 pb-10">
                    {/* ── Key Metrics ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <MetricCard
                            label="Total Money"
                            value={formatK(stats.totalRevenue || 0)}
                            subtext="All history sales"
                            icon={DollarSign}
                            color="#13b0d1"
                        />
                        <MetricCard
                            label="Net Profit"
                            value={formatK(stats.totalProfit || 0)}
                            subtext="Total earnings"
                            icon={TrendingUp}
                            color="#10b981"
                        />
                        <MetricCard
                            label="Active Orders"
                            value={stats.totalActive || stats.pendingOrders || 0}
                            subtext="Total open orders"
                            icon={Package}
                            color="#6366f1"
                            prefix=""
                        />
                        <MetricCard
                            label="Pending Submission"
                            value={stats.pendingOrders || 0}
                            subtext="Need your approval"
                            icon={Clock}
                            color="#f59e0b"
                            alert={(stats.pendingOrders || 0) > 0}
                            prefix=""
                        />
                    </div>

                    {/* ── Orders Table ── */}
                    <div className="w-full space-y-8 animate-in fade-in duration-700 delay-150">
                        <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden text-left">
                            <div className="px-6 py-4.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[17px] font-black text-slate-850 dark:text-white uppercase tracking-tight">Active Orders</h2>
                                    {cancelRequests.length > 0 && (
                                        <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40 text-[10px] font-bold uppercase rounded-full animate-pulse tracking-wide">
                                            {cancelRequests.length} Cancel Request{cancelRequests.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <Link href="/admin/sales" className="text-[12px] text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 font-bold flex items-center gap-1 transition-colors">
                                    See all <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-slate-900/10">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 dark:group-focus-within:text-amber-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search order number or customer name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-10 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-[13px] text-slate-850 dark:text-slate-100 outline-none focus:border-amber-500 dark:focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-white/5">
                                        <tr className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                            <th className="px-6 py-3.5 text-left">Order Detail</th>
                                            <th className="px-6 py-3.5 text-right">Price</th>
                                            <th className="px-6 py-3.5 text-left">Current Status</th>
                                            <th className="px-6 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {activeOrders.length > 0 ? (
                                            activeOrders.map((order: any) => (
                                                <tr key={order.id} className={`transition-colors duration-200 group ${(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' ? 'bg-rose-50/30 dark:bg-rose-950/10 border-l-4 border-l-rose-400' : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <Link href={`/admin/sales/${order.id}/invoice`} className="text-[14px] font-bold text-amber-500 hover:text-amber-605 dark:text-amber-400 dark:hover:text-amber-300 transition-colors">
                                                                #{order.order_number}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-505 mt-1 font-medium">
                                                                <span className="text-slate-700 dark:text-zinc-300 font-semibold">{order.customer_name || 'Walk-in'}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-[14px] font-bold text-slate-800 dark:text-zinc-200">{formatCurrency(order.total_amount)}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 dark:text-zinc-505 uppercase mt-0.5 tracking-wider">{order.payment_method || 'C.O.D'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {(() => {
                                                            const status = (order.status || '').toUpperCase();
                                                            let badgeStyle = "bg-slate-105 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                                                            if (status === 'PENDING') {
                                                                badgeStyle = "bg-amber-50 dark:bg-amber-955/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50";
                                                            } else if (status === 'CONFIRMED') {
                                                                badgeStyle = "bg-teal-50 dark:bg-teal-955/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900/50";
                                                            } else if (status === 'PROCESSING') {
                                                                badgeStyle = "bg-blue-50 dark:bg-blue-955/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50";
                                                            } else if (status === 'SHIPPED') {
                                                                badgeStyle = "bg-purple-50 dark:bg-purple-955/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50";
                                                            } else if (status === 'DELIVERED') {
                                                                badgeStyle = "bg-green-50 dark:bg-green-955/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50";
                                                            } else if (status === 'CANCELLED') {
                                                                badgeStyle = "bg-rose-50 dark:bg-rose-955/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50";
                                                            } else if (status === 'CANCEL_REQUESTED') {
                                                                badgeStyle = "bg-orange-50 dark:bg-orange-955/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50";
                                                            }

                                                            return (
                                                                <div className={`relative inline-flex items-center min-w-[130px] rounded-full border px-3.5 py-1 font-bold text-[11px] uppercase transition-all duration-300 ${badgeStyle}`}>
                                                                    <select
                                                                        value={(order.status || '').toLowerCase()}
                                                                        onChange={(e) => handleQuickStatusUpdate(order.id?.toString(), e.target.value)}
                                                                        disabled={updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'PENDING'}
                                                                        className="w-full bg-transparent border-none p-0 pr-5 text-[11px] font-bold uppercase cursor-pointer outline-none focus:ring-0 appearance-none disabled:cursor-not-allowed select-none"
                                                                    >
                                                                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                            <option key={s} value={s} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 lowercase first-letter:uppercase">{s}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                                                                    {updatingRow === order.id?.toString() && (
                                                                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-full flex items-center justify-center">
                                                                            <Loader2 size={12} className="animate-spin" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {(order.status || '').toUpperCase() === 'PENDING' && (
                                                                <button
                                                                    disabled={updatingRow === order.id?.toString()}
                                                                    onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                    className="h-[30px] px-3.5 text-[12px] font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 border border-transparent shadow-sm hover:shadow rounded-lg transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                                                                >
                                                                    <CheckCircle2 size={12} /> Accept
                                                                </button>
                                                            )}
                                                            {(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' && (
                                                                <>
                                                                    <button
                                                                        disabled={updatingRow === order.id?.toString()}
                                                                        onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CANCELLED')}
                                                                        className="h-[30px] px-3.5 text-[12px] font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 border border-transparent shadow-sm hover:shadow rounded-lg transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                                                                    >
                                                                        <X size={12} /> Approve Cancel
                                                                    </button>
                                                                    <button
                                                                        disabled={updatingRow === order.id?.toString()}
                                                                        onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                        className="h-[30px] px-3.5 text-[12px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-zinc-700 rounded-lg transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97]"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => setSelectedOrder(order)}
                                                                className="h-[30px] px-3.5 text-[12px] font-semibold text-slate-650 dark:text-zinc-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-zinc-750 rounded-lg transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97]"
                                                            >
                                                                <Eye size={12} /> View
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-[13px] text-slate-400 dark:text-zinc-505 italic">
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
                        <div className="bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left">
                            <h3 className="text-[13px] font-bold text-slate-400 dark:text-zinc-505 mb-5 pb-2 border-b border-slate-100 dark:border-white/5 uppercase tracking-[0.1em]">Quick Links</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { title: 'New Sale', icon: Store, href: '/admin/sale', bg: 'hover:bg-indigo-50/50 hover:border-indigo-100 dark:hover:bg-indigo-950/20 dark:hover:border-indigo-900/30 text-indigo-550' },
                                    { title: 'Products', icon: Boxes, href: '/admin/products', bg: 'hover:bg-sky-50/50 hover:border-sky-100 dark:hover:bg-sky-950/20 dark:hover:border-sky-900/30 text-sky-550' },
                                    { title: 'Current Stock', icon: Package, href: '/admin/inventory/list', bg: 'hover:bg-emerald-50/50 hover:border-emerald-100 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-900/30 text-emerald-555' },
                                    { title: 'Suppliers', icon: UserPlus, href: '/admin/company/suppliers', bg: 'hover:bg-amber-50/50 hover:border-amber-100 dark:hover:bg-amber-950/20 dark:hover:border-amber-900/30 text-amber-550' },
                                    { title: 'Sales Hist', icon: History, href: '/admin/sales', bg: 'hover:bg-rose-50/50 hover:border-rose-100 dark:hover:bg-rose-950/20 dark:hover:border-rose-900/30 text-rose-550' },
                                    { title: 'Settings', icon: ShieldCheck, href: '/admin/settings', bg: 'hover:bg-slate-100 hover:border-slate-200 dark:hover:bg-slate-800/50 dark:hover:border-zinc-700/30 text-slate-500 dark:text-zinc-400' },
                                ].map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={item.href}
                                        className={`flex flex-col items-center gap-2.5 py-4.5 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-white/5 rounded-xl transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 group ${item.bg}`}
                                    >
                                        <item.icon size={20} className="transition-transform group-hover:scale-110" />
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 group-hover:text-slate-800 dark:group-hover:text-white uppercase tracking-wider transition-colors text-center">{item.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Daily Status */}
                        {(() => {
                            const isPending = (stats.pendingOrders || 0) > 0;
                            return (
                                <div className={`rounded-2xl p-6 border shadow-sm flex items-center transition-all duration-300 text-left
                                    ${isPending 
                                        ? 'bg-amber-50/40 border-amber-200/60 dark:bg-amber-955/10 dark:border-amber-900/30' 
                                        : 'bg-emerald-50/40 border-emerald-200/60 dark:bg-emerald-955/10 dark:border-emerald-900/30'}`}>
                                    <div className="flex gap-4.5">
                                        <div className={`p-3.5 rounded-xl flex items-center justify-center relative shrink-0
                                            ${isPending 
                                                ? 'bg-amber-100/70 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' 
                                                : 'bg-emerald-100/70 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                            <Activity size={24} className={isPending ? 'animate-pulse' : ''} />
                                        </div>
                                        <div className="text-left flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-[15px] font-bold text-slate-800 dark:text-white">Daily Status</h4>
                                                <p className="text-[13px] mt-1.5 text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                                                    {isPending
                                                        ? `You have ${stats.pendingOrders} orders waiting.`
                                                        : "All tasks are done for today."
                                                    }
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => router.push('/admin/sales')}
                                                className="mt-3.5 text-[12px] font-bold text-amber-500 hover:text-amber-605 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center gap-1"
                                            >
                                                Manage Orders <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Recent Activity */}
                        <div className="bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden text-left flex flex-col justify-between">
                            <div className="bg-slate-50/50 dark:bg-slate-800/20 px-6 py-4.5 border-b border-slate-100 dark:border-white/5">
                                <h3 className="text-[13px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-[0.1em]">Recent Activity</h3>
                            </div>
                            <div className="p-6 space-y-5 flex-1 relative">
                                {/* Vertical connecting line */}
                                <div className="absolute left-[29px] top-6 bottom-6 w-0.5 bg-slate-100 dark:bg-zinc-800/60 z-0"></div>

                                {recentOrders.slice(0, 4).map((o: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-4.5 text-[12.5px] group relative z-10">
                                        <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0 group-hover:border-amber-500 dark:group-hover:border-amber-400 transition-all duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600 group-hover:bg-amber-500 dark:group-hover:bg-amber-400 transition-all duration-300"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-600 dark:text-zinc-300 group-hover:text-slate-850 dark:group-hover:text-white transition-colors line-clamp-1">New Order Received: #{o.order_number}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-zinc-505 font-medium mt-0.5">
                                                {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Visual Analytics Section ── */}
                    <div className="pt-4 space-y-8 animate-in fade-in duration-700 delay-500 text-left">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[18px] font-black text-slate-850 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 size={20} className="text-amber-500 dark:text-amber-400" />
                                Business Analytics
                            </h2>
                            <div className="flex items-center gap-4 text-[12px] font-semibold text-slate-400 dark:text-zinc-505">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#13b0d1]"></span> Sales</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Profit</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Sales & Growth Chart */}
                            <div className="bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 text-left">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-slate-850 dark:text-white">Sales Performance</h3>
                                        <p className="text-[12.5px] text-slate-400 dark:text-zinc-505 font-medium">Revenue growth over the last 30 days</p>
                                    </div>
                                    <TrendingUp size={18} className="text-emerald-500" />
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData30 || []}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#13b0d1" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#13b0d1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="opacity-30 dark:opacity-10" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                tickFormatter={(str) => {
                                                    const date = new Date(str);
                                                    return date.getDate() % 5 === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                                }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                tickFormatter={(value) => `Rs.${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)', background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', fontSize: '12px', fontWeight: '600' }}
                                                formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="#13b0d1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Purchase vs Sales Comparison */}
                            <div className="bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 text-left">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-slate-850 dark:text-white">Procurement vs Revenue</h3>
                                        <p className="text-[12.5px] text-slate-400 dark:text-zinc-550 font-medium">Comparing stock investment vs sales</p>
                                    </div>
                                    <ShoppingBag size={18} className="text-amber-500" />
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={revenueData30?.slice(-10) || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="opacity-30 dark:opacity-10" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(248, 250, 252, 0.4)' }}
                                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)', background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', fontSize: '12px', fontWeight: '600' }}
                                            />
                                            <Bar dataKey="revenue" name="Sales" fill="#13b0d1" radius={[4, 4, 0, 0]} barSize={16} />
                                            <Bar dataKey="profit" name="Profit" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Inventory Distribution */}
                            <div className="bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 text-left lg:col-span-1">
                                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-4">Stock Availability</h3>
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
                                                <Cell fill="#10b981" />
                                                <Cell fill="#f59e0b" />
                                                <Cell fill="#ef4444" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Selling Products */}
                            <div className="bg-white dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 text-left md:col-span-2">
                                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-6">Top Selling Inventory</h3>
                                <div className="space-y-4">
                                    {(topProducts || []).slice(0, 5).map((prod, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-8.5 h-8.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center text-[12px] font-bold text-slate-400 dark:text-zinc-500">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-[13px] font-bold text-slate-850 dark:text-zinc-200 truncate max-w-[200px]">{(prod.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</span>
                                                    <span className="text-[12px] font-bold text-[#13b0d1]">{prod.sales_count} sales</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-[#13b0d1] to-[#0ea5e9] h-full transition-all duration-1000 rounded-full"
                                                        style={{ width: `${Math.min((prod.sales_count / (topProducts[0]?.sales_count || 1)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!topProducts || topProducts.length === 0) && (
                                        <div className="py-10 text-center text-[12px] text-slate-400 dark:text-zinc-505 italic">No sales data available yet</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 dark:bg-slate-955/65 backdrop-blur-md p-4 text-left font-sans animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                            <h3 className="text-[15px] font-bold text-slate-850 dark:text-white uppercase tracking-tight">Order Details: #{selectedOrder.order_number}</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-655 dark:hover:text-zinc-400 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase tracking-widest mb-3.5">Customer Information</p>
                                    <div className="space-y-1 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                                        <p className="text-[14px] font-bold text-slate-850 dark:text-white">{selectedOrder.customer_name || 'Walk-in'}</p>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 font-medium">{selectedOrder.phone_number || 'No phone provided'}</p>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-2.5">Shipping Address</p>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">{selectedOrder.shipping_address || 'Shop Pickup / Over the counter'}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50/40 dark:bg-slate-800/20 p-5 border border-slate-100 dark:border-zinc-800 rounded-xl flex flex-col justify-center gap-4">
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase tracking-widest text-center">Status & Payment</p>
                                    <div className="space-y-3.5">
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Current Status:</span>
                                            <span className="font-bold text-amber-500 dark:text-amber-400 capitalize">{selectedOrder.status.toLowerCase()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[13px]">
                                            <span className="text-slate-500 dark:text-zinc-400 font-medium">Payment Method:</span>
                                            <span className="font-bold text-slate-700 dark:text-zinc-300 uppercase">{selectedOrder.payment_method || 'C.O.D'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase tracking-widest mb-3.5">Items Purchased</p>
                                <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-[13px] border-collapse">
                                        <thead className="bg-slate-50 dark:bg-slate-850">
                                            <tr className="text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase">
                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">Product Name</th>
                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 text-center">Qty</th>
                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 text-right">Unit Price</th>
                                                <th className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {selectedOrder.items?.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                                                {(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                                            </span>
                                                            {(item.weight || item.size) && (
                                                                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wide">
                                                                    — {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-slate-500 dark:text-zinc-400">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-650 dark:text-zinc-400">{formatCurrency(item.price)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-zinc-100">{formatCurrency(item.quantity * parseFloat(item.price))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-900 dark:bg-slate-950 text-white">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-4.5 text-right text-[11px] uppercase tracking-wider opacity-70">Total Order Value</td>
                                                <td className="px-4 py-4.5 text-right text-[18px] font-bold text-amber-400 dark:text-amber-300">{formatCurrency(selectedOrder.total_amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5">Internal Notes</p>
                                    <p className="text-[13px] text-amber-700 dark:text-amber-305 italic leading-relaxed font-medium">"{selectedOrder.notes}"</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-zinc-800 flex gap-3">
                            <button onClick={() => setSelectedOrder(null)} className="flex-1 h-[38px] text-[13px] font-semibold text-slate-500 dark:text-zinc-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-zinc-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300">Close Window</button>
                            <button
                                onClick={() => router.push(`/admin/sales/${selectedOrder.id}/invoice`)}
                                className="flex-1 h-[38px] text-[13px] font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 border border-transparent rounded-xl hover:from-amber-600 hover:to-amber-700 flex items-center justify-center gap-2 shadow-sm transition-all duration-300 active:scale-[0.97]"
                            >
                                <Printer size={16} /> Open Full Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warehouse Selection Modal for Delivery */}
            {deliveryModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/50 dark:bg-slate-955/70 backdrop-blur-md p-4 text-left">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-105 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-955/40 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-855 dark:text-white uppercase tracking-tight">Complete Delivery</h3>
                                    <p className="text-[12px] text-slate-400 dark:text-zinc-500 font-medium">Select fulfillment warehouse</p>
                                </div>
                            </div>
                            <button onClick={() => setDeliveryModal(null)} className="text-slate-400 hover:text-slate-650 dark:hover:text-zinc-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-blue-50/40 dark:bg-blue-955/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex gap-3">
                                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
                                    Select fulfillment warehouse to proceed. Stock will be deducted immediately from the chosen location.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase tracking-wider">Ordered Products</h4>
                                    {selectedWarehouse && (
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${hasEnoughStock ? 'bg-emerald-50 dark:bg-emerald-955/40 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-955/40 text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30'}`}>
                                            {hasEnoughStock ? 'Stock Confirmed' : 'Insufficient Stock'}
                                        </span>
                                    )}
                                </div>
                                <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                    <table className="w-full text-[12px] border-collapse">
                                        <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-zinc-800">
                                            <tr className="text-[10px] font-bold text-slate-400 dark:text-zinc-505 uppercase">
                                                <th className="px-3.5 py-2.5 text-left">Item Details</th>
                                                <th className="px-3.5 py-2.5 text-center">Qty</th>
                                                <th className="px-3.5 py-2.5 text-right">{selectedWarehouse ? 'Store' : 'Price'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {(selectedWarehouse ? warehouseStockInfo : deliveryModal.order?.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className={item.insufficient ? 'bg-rose-50/20 dark:bg-rose-955/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/10'}>
                                                    <td className="px-3.5 py-2.5">
                                                        <p className="font-semibold text-slate-800 dark:text-zinc-200 leading-tight">{(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</p>
                                                        {(item.weight || item.size) && (
                                                            <p className="text-[9px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider mt-1">
                                                                {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-500 dark:text-zinc-400">{item.quantity}</td>
                                                    <td className={`px-3.5 py-2.5 text-right font-bold ${selectedWarehouse ? (item.insufficient ? 'text-rose-600 dark:text-rose-455' : 'text-emerald-600 dark:text-emerald-455') : 'text-slate-800 dark:text-zinc-200'}`}>
                                                        {selectedWarehouse ? item.available : formatCurrency(item.price)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedWarehouse && !hasEnoughStock && (
                                    <p className="text-[11px] text-rose-600 dark:text-rose-455 font-semibold bg-rose-50/50 dark:bg-rose-955/20 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-2">
                                        <AlertTriangle size={14} className="shrink-0" /> Critical Error: Missing items in this warehouse.
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-zinc-505 uppercase tracking-widest mb-2 px-1">
                                    Fulfillment Warehouse
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedWarehouse}
                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                        className="w-full h-11 px-4 border border-slate-200 dark:border-zinc-700/60 rounded-xl text-[13.5px] font-semibold text-slate-850 dark:text-zinc-200 outline-none focus:border-amber-500 dark:focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 bg-white dark:bg-slate-800 transition-all appearance-none cursor-pointer shadow-sm"
                                    >
                                        <option value="" className="text-slate-400">Choose a warehouse...</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w.id} value={w.id} className="text-slate-850 dark:text-zinc-200">{w.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-zinc-800 flex gap-3">
                            <button
                                onClick={() => setDeliveryModal(null)}
                                className="flex-1 h-10 text-[13px] font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!selectedWarehouse || !hasEnoughStock || isSubmittingDelivery}
                                onClick={confirmDelivery}
                                className={`flex-1 h-10 text-[13px] font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-[0.97] ${(!selectedWarehouse || !hasEnoughStock || isSubmittingDelivery) ? 'grayscale opacity-60 pointer-events-none' : ''}`}
                            >
                                {isSubmittingDelivery ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle size={16} /> Finish Delivery
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
