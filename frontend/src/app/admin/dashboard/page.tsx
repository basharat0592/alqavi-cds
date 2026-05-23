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
    CheckCircle2, Info, X, Printer, AlertTriangle, User, Users, ShoppingCart
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
        <div className="bg-white p-5 rounded-[4px] border border-[#ddd] shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden text-left">
            <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-[#565959] uppercase tracking-[0.1em]">{label}</p>
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-[#0f1111] tracking-tight flex items-baseline">
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
                <div className="w-10 h-10 rounded border border-[#e3e6e6] flex items-center justify-center" style={{ backgroundColor: glowColor, color: displayColor }}>
                    <Icon size={20} strokeWidth={2} />
                </div>
            </div>
            {subtext && (
                <div className="flex items-center pt-3 border-t border-[#ddd]">
                    <p className="text-[12px] text-[#565959] font-medium">{subtext}</p>
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
    const hasEnoughStock = warehouseStockInfo.every((i: { insufficient: boolean }) => !i.insufficient);

    if (loading && !stats.totalOrders) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1200px] mx-auto px-0 md:px-6 pt-0 md:pt-5">
                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Overview</span>
                </div>
                {/* Page Title + Controls */}
                <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <h1 className="text-[22px] font-normal">Main Dashboard</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="rounded-[3px] border border-[#888c8e] bg-white h-[29px] px-2 flex items-center gap-2">
                            <Calendar size={14} className="text-[#666]" />
                            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-[13px] font-medium text-[#0f1111] outline-none border-none" />
                        </div>
                        <div className="rounded-[3px] border border-[#888c8e] bg-white h-[29px] px-2 flex items-center gap-2">
                            <Filter size={14} className="text-[#666]" />
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="bg-transparent text-[13px] font-medium text-[#0f1111] outline-none border-none cursor-pointer">
                                <option value="ALL">All Payments</option>
                                <option value="COD">C.O.D</option>
                                <option value="ONLINE">Bank Transfer</option>
                                <option value="SHOP">Shop POS</option>
                            </select>
                        </div>
                        <button onClick={refetch} className="h-[29px] px-4 rounded-[3px] border border-[#adb1b8] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] text-[13px] font-medium text-[#0f1111] flex items-center gap-2 hover:from-[#eef1f3] hover:to-[#dce0e4] active:scale-[0.98] shadow-sm">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <span className="text-[13px] text-[#666]">Filter: <b className="text-[#0f1111]">{paymentMethod === 'ALL' ? 'All Payments' : paymentMethod}</b></span>
                    </div>
                </div>
                <div className="hidden md:block border-b border-[#ddd] mb-6" />

                <div className="space-y-6 mb-6">
                    {/* Quick Links (Mobile View only, placed at the top) */}
                    <div className="block md:hidden bg-white border-y border-[#ddd] shadow-sm">
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {[
                                { title: 'New Sale', icon: Store, href: '/admin/sale' },
                                { title: 'Invoice', icon: FileText, href: '/admin/invoices' },
                                { title: 'Current Stock', icon: Package, href: '/admin/inventory/list' },
                                { title: 'Suppliers', icon: UserCheck, href: '/admin/company/suppliers' },
                                { title: 'Purchase', icon: ShoppingCart, href: '/admin/purchases' },
                                { title: 'Customer', icon: Users, href: '/admin/company/customers' },
                            ].map((item, idx) => (
                                <Link key={idx} href={item.href} className="flex flex-col items-center gap-2 py-4 bg-[#f7f8fa] border border-[#e3e6e6] rounded transition-all hover:bg-[#f3f7f7] hover:border-[#007185] group">
                                    <item.icon size={18} className="text-[#565959] group-hover:text-[#007185] transition-colors" />
                                    <span className="text-[10px] font-bold text-[#565959] group-hover:text-[#0f1111] uppercase tracking-wider transition-colors text-center">{item.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
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

                    <div className="w-full space-y-6">
                        <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[14px] font-bold">Active Orders</h2>
                                    {cancelRequests.length > 0 && (
                                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase rounded-full animate-pulse tracking-wide">
                                            {cancelRequests.length} Cancel Request{cancelRequests.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <Link href="/admin/sales" className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-semibold flex items-center gap-1">
                                    See all <ChevronRight size={14} />
                                </Link>
                            </div>

                            <div className="p-4 border-b border-[#ddd]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666] group-focus-within:text-[#e77600] transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search order number or customer name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-[29px] pl-9 pr-4 bg-white border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all font-medium"
                                    />
                                </div>
                            </div>
                            {/* Desktop View Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead className="bg-[#f7f8fa] border-b border-[#ddd]">
                                        <tr className="text-[10px] font-bold text-[#565959] uppercase tracking-wider">
                                            <th className="px-6 py-3 text-left">Order Detail</th>
                                            <th className="px-6 py-3 text-right">Price</th>
                                            <th className="px-6 py-3 text-left">Current Status</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ddd]">
                                        {activeOrders.length > 0 ? (
                                            activeOrders.map((order: any) => (
                                                <tr key={order.id} className={`transition-colors duration-200 ${(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' ? 'bg-rose-50/30 border-l-4 border-l-rose-400' : 'hover:bg-[#f3f7f7]'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <Link href={`/admin/sales/${order.id}/invoice`} className="text-[14px] font-bold text-[#e77600] hover:text-[#c65911] transition-colors">
                                                                #{order.order_number}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-[11px] text-[#565959] mt-1 font-medium">
                                                                <span className="text-[#0f1111] font-semibold">{order.customer_name || 'Walk-in'}</span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="text-[14px] font-bold text-[#0f1111]">{formatCurrency(order.total_amount)}</div>
                                                        <div className="text-[9px] font-bold text-[#565959] uppercase mt-0.5 tracking-wider">{order.payment_method || 'C.O.D'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {(() => {
                                                            const status = (order.status || '').toUpperCase();
                                                            let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                                                            if (status === 'PENDING') {
                                                                badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                                                            } else if (status === 'CONFIRMED') {
                                                                badgeStyle = "bg-teal-50 text-teal-700 border-teal-200";
                                                            } else if (status === 'PROCESSING') {
                                                                badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                                                            } else if (status === 'SHIPPED') {
                                                                badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                                                            } else if (status === 'DELIVERED') {
                                                                badgeStyle = "bg-green-50 text-green-700 border-green-200";
                                                            } else if (status === 'CANCELLED') {
                                                                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                                                            } else if (status === 'CANCEL_REQUESTED') {
                                                                badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
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
                                                                            <option key={s} value={s} className="bg-white text-slate-800 lowercase first-letter:uppercase">{s}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                                                                    {updatingRow === order.id?.toString() && (
                                                                        <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
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
                                                                    className="h-[30px] px-3.5 text-[12px] font-semibold text-white bg-gradient-to-b from-[#13b0d1] to-[#0ea5e9] hover:from-[#0ea5e9] hover:to-[#06b6d4] border border-transparent shadow-sm rounded-[3px] transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                                                                >
                                                                    <CheckCircle2 size={12} /> Accept
                                                                </button>
                                                            )}
                                                            {(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' && (
                                                                <>
                                                                    <button
                                                                        disabled={updatingRow === order.id?.toString()}
                                                                        onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CANCELLED')}
                                                                        className="h-[30px] px-3.5 text-[12px] font-semibold text-white bg-gradient-to-b from-[#dc2626] to-[#991b1b] hover:from-[#991b1b] hover:to-[#7f1d1d] border border-transparent shadow-sm rounded-[3px] transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                                                                    >
                                                                        <X size={12} /> Approve Cancel
                                                                    </button>
                                                                    <button
                                                                        disabled={updatingRow === order.id?.toString()}
                                                                        onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                        className="h-[30px] px-3.5 text-[12px] font-semibold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] hover:from-[#eef1f3] hover:to-[#dce0e4] transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97]"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => setSelectedOrder(order)}
                                                                className="h-[30px] px-3.5 text-[12px] font-semibold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] hover:from-[#eef1f3] hover:to-[#dce0e4] transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97]"
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

                            {/* Mobile View Card List */}
                            <div className="block md:hidden divide-y divide-[#ddd]">
                                {activeOrders.length > 0 ? (
                                    activeOrders.map((order: any) => {
                                        const status = (order.status || '').toUpperCase();
                                        const isCancelRequested = status === 'CANCEL_REQUESTED';
                                        return (
                                            <div 
                                                key={order.id} 
                                                className={`py-2.5 px-4 transition-colors duration-200 ${isCancelRequested ? 'bg-rose-50/30 border-l-4 border-l-rose-400' : 'hover:bg-[#f3f7f7]'}`}
                                            >
                                                {/* Row 1: Order Number & Price */}
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <Link href={`/admin/sales/${order.id}/invoice`} className="text-[14px] font-bold text-[#e77600] hover:text-[#c65911] transition-colors">
                                                            #{order.order_number}
                                                        </Link>
                                                        <div className="flex items-center gap-1 text-[11px] text-[#565959] mt-0.5 font-medium">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={10} /> 
                                                                {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[14px] font-bold text-[#0f1111]">{formatCurrency(order.total_amount)}</div>
                                                        <div className="text-[9px] font-bold text-[#565959] uppercase mt-0.5 tracking-wider">{order.payment_method || 'C.O.D'}</div>
                                                    </div>
                                                </div>

                                                {/* Row 3: Status and Actions */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap mt-2.5 pt-2.5 border-t border-[#eee]">
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {(() => {
                                                            let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                                                            if (status === 'PENDING') {
                                                                badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                                                            } else if (status === 'CONFIRMED') {
                                                                badgeStyle = "bg-teal-50 text-teal-700 border-teal-200";
                                                            } else if (status === 'PROCESSING') {
                                                                badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                                                            } else if (status === 'SHIPPED') {
                                                                badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                                                            } else if (status === 'DELIVERED') {
                                                                badgeStyle = "bg-green-50 text-green-700 border-green-200";
                                                            } else if (status === 'CANCELLED') {
                                                                badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                                                            } else if (status === 'CANCEL_REQUESTED') {
                                                                badgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
                                                            }

                                                            return (
                                                                <div className={`relative inline-flex items-center min-w-[120px] rounded-full border px-3 py-1 font-bold text-[11px] uppercase transition-all duration-300 ${badgeStyle}`}>
                                                                    <select
                                                                        value={(order.status || '').toLowerCase()}
                                                                        onChange={(e) => handleQuickStatusUpdate(order.id?.toString(), e.target.value)}
                                                                        disabled={updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'PENDING'}
                                                                        className="w-full bg-transparent border-none p-0 pr-4 text-[10.5px] font-bold uppercase cursor-pointer outline-none focus:ring-0 appearance-none disabled:cursor-not-allowed select-none"
                                                                    >
                                                                        {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                            <option key={s} value={s} className="bg-white text-slate-800 lowercase first-letter:uppercase">{s}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                                                                    {updatingRow === order.id?.toString() && (
                                                                        <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                                                                            <Loader2 size={11} className="animate-spin" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
 
                                                    <div className="flex gap-1.5 justify-end shrink-0">
                                                        {(order.status || '').toUpperCase() === 'PENDING' && (
                                                            <button
                                                                disabled={updatingRow === order.id?.toString()}
                                                                onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                className="h-[29px] px-2.5 text-[11px] font-semibold text-white bg-gradient-to-b from-[#13b0d1] to-[#0ea5e9] hover:from-[#0ea5e9] hover:to-[#06b6d4] border border-transparent shadow-sm rounded-[3px] transition-all duration-300 flex items-center gap-1 active:scale-[0.97] disabled:opacity-60"
                                                            >
                                                                <CheckCircle2 size={11} /> Accept
                                                            </button>
                                                        )}
                                                        {isCancelRequested && (
                                                            <>
                                                                <button
                                                                    disabled={updatingRow === order.id?.toString()}
                                                                    onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CANCELLED')}
                                                                    className="h-[29px] px-2.5 text-[11px] font-semibold text-white bg-gradient-to-b from-[#dc2626] to-[#991b1b] hover:from-[#991b1b] hover:to-[#7f1d1d] border border-transparent shadow-sm rounded-[3px] transition-all duration-300 flex items-center gap-1 active:scale-[0.97] disabled:opacity-60"
                                                                >
                                                                    <X size={11} /> Approve
                                                                </button>
                                                                <button
                                                                    disabled={updatingRow === order.id?.toString()}
                                                                    onClick={() => handleQuickStatusUpdate(order.id?.toString(), 'CONFIRMED')}
                                                                    className="h-[29px] px-2.5 text-[11px] font-semibold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] hover:from-[#eef1f3] hover:to-[#dce0e4] transition-all duration-300 flex items-center gap-1 active:scale-[0.97]"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="h-[29px] px-2.5 text-[11px] font-semibold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] hover:from-[#eef1f3] hover:to-[#dce0e4] transition-all duration-300 flex items-center gap-1 active:scale-[0.97]"
                                                        >
                                                            <Eye size={11} /> View
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 text-center text-[13px] text-slate-450 italic">
                                        No new orders at the moment.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:grid gap-6 lg:grid-cols-2">
                        <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                <div>
                                    <h2 className="text-[14px] font-bold">Top Products</h2>
                                    <p className="text-[12px] text-[#565959] mt-0.5">Best-selling items from the last 30 days.</p>
                                </div>
                                <Link href="/admin/products" className="text-[13px] font-semibold text-[#007185] hover:text-[#c45500] hover:underline">View all</Link>
                            </div>
                            <div className="p-5 space-y-3">
                                {topProducts && topProducts.length > 0 ? topProducts.slice(0, 5).map((product: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded border border-[#e3e6e6] bg-[#f7f8fa]">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-[#0f1111] truncate">{product.product_name || product.name || 'Unnamed product'}</p>
                                            <p className="text-[11px] text-[#565959] mt-0.5">Sold: {product.sold_quantity || product.quantity_sold || product.total_sold || 'N/A'}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[13px] font-bold text-[#0f1111]">{formatCurrency(product.total_amount || product.revenue || product.total_price || 0)}</p>
                                            <p className="text-[11px] text-[#565959]">Revenue</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="border border-dashed border-[#ddd] p-6 text-center text-[13px] text-[#565959]">No top product data available yet.</div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                <h2 className="text-[14px] font-bold">Quick Status</h2>
                            </div>
                            <div className="p-5 grid gap-3">
                                <div className="rounded border border-[#e3e6e6] bg-[#f7f8fa] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#565959]">Pending Orders</p>
                                    <p className="mt-2 text-3xl font-black text-[#0f1111]">{stats.pendingOrders || 0}</p>
                                </div>
                                <div className="rounded border border-[#e3e6e6] bg-[#f7f8fa] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#565959]">Active Orders</p>
                                    <p className="mt-2 text-3xl font-black text-[#0f1111]">{stats.totalActive || 0}</p>
                                </div>
                                <div className="rounded border border-[#e3e6e6] bg-[#f7f8fa] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#565959]">Current Stock</p>
                                    <p className="mt-2 text-3xl font-black text-[#0f1111]">{allStocks.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Quick Links */}
                        <div className="hidden md:block bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                <h3 className="text-[14px] font-bold">Quick Links</h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                {[
                                    { title: 'New Sale', icon: Store, href: '/admin/sale' },
                                    { title: 'Invoice', icon: FileText, href: '/admin/invoices' },
                                    { title: 'Current Stock', icon: Package, href: '/admin/inventory/list' },
                                    { title: 'Suppliers', icon: UserCheck, href: '/admin/company/suppliers' },
                                    { title: 'Purchase', icon: ShoppingCart, href: '/admin/purchases' },
                                    { title: 'Customer', icon: Users, href: '/admin/company/customers' },
                                ].map((item, idx) => (
                                    <Link key={idx} href={item.href} className="flex flex-col items-center gap-2 py-4 bg-[#f7f8fa] border border-[#e3e6e6] rounded transition-all hover:bg-[#f3f7f7] hover:border-[#007185] group">
                                        <item.icon size={18} className="text-[#565959] group-hover:text-[#007185] transition-colors" />
                                        <span className="text-[10px] font-bold text-[#565959] group-hover:text-[#0f1111] uppercase tracking-wider transition-colors text-center">{item.title}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="hidden md:block">
                        {(() => {
                            const isPending = (stats.pendingOrders || 0) > 0;
                            return (
                                <div className={`rounded-none md:rounded-[4px] border-y md:border shadow-sm flex items-stretch ${isPending ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                                    <div className="p-6 flex gap-4 items-start w-full">
                                        <div className={`p-3 rounded flex items-center justify-center shrink-0 ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                            <Activity size={22} className={isPending ? 'animate-pulse' : ''} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-[14px] font-bold text-[#0f1111]">Daily Status</h4>
                                            <p className="text-[13px] mt-1.5 text-[#565959] leading-relaxed font-medium">
                                                {isPending ? `You have ${stats.pendingOrders} orders waiting.` : "All tasks are done for today."}
                                            </p>
                                            <button onClick={() => router.push('/admin/sales')} className="mt-3 text-[12px] font-bold text-[#e77600] hover:text-[#c65911] transition-colors flex items-center gap-1 w-fit">
                                                Manage Orders <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                        </div>

                        {/* Recent Activity */}
                        <div className="hidden md:flex flex-col bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                            <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                <h3 className="text-[14px] font-bold">Recent Activity</h3>
                            </div>
                            <div className="p-6 space-y-5 flex-1 relative">
                                <div className="absolute left-[29px] top-6 bottom-6 w-0.5 bg-[#e3e6e6] z-0"></div>
                                {recentOrders.slice(0, 4).map((o: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-4 text-[12.5px] group relative z-10">
                                        <div className="w-4 h-4 rounded-full bg-[#f7f8fa] border-2 border-[#ddd] flex items-center justify-center shrink-0 group-hover:border-[#e77600] transition-all duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#aaa] group-hover:bg-[#e77600] transition-all duration-300"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-[#0f1111] line-clamp-1">New Order Received: #{o.order_number}</span>
                                            <span className="text-[10px] text-[#565959] font-medium mt-0.5">
                                                {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {recentOrders.length === 0 && <p className="text-[12px] text-[#565959] italic text-center py-8">No recent activity.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#ddd] pb-3">
                            <h2 className="text-[14px] font-bold flex items-center gap-2">
                                <BarChart3 size={16} className="text-[#e77600]" />
                                Business Analytics
                            </h2>
                            <div className="flex items-center gap-4 text-[12px] font-semibold text-[#565959]">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#13b0d1]"></span> Sales</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Profit</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[14px] font-bold">Sales Performance</h3>
                                        <p className="text-[12px] text-[#565959]">Revenue growth over the last 30 days</p>
                                    </div>
                                    <TrendingUp size={16} className="text-green-500" />
                                </div>
                                <div className="p-5">
                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueData30 || []}>
                                                <defs>
                                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#13b0d1" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#13b0d1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e6e6" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(str) => { const date = new Date(str); return date.getDate() % 5 === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `Rs.${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`} />
                                                <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', fontWeight: '600' }} formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                                                <Area type="monotone" dataKey="revenue" stroke="#13b0d1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[14px] font-bold">Procurement vs Revenue</h3>
                                        <p className="text-[12px] text-[#565959]">Comparing stock investment vs sales</p>
                                    </div>
                                    <ShoppingBag size={16} className="text-[#e77600]" />
                                </div>
                                <div className="p-5">
                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={revenueData30?.slice(-10) || []}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e6e6" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <Tooltip cursor={{ fill: 'rgba(247,248,250,0.8)' }} contentStyle={{ borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', fontWeight: '600' }} />
                                                <Bar dataKey="revenue" name="Sales" fill="#13b0d1" radius={[3, 3, 0, 0]} barSize={14} />
                                                <Bar dataKey="profit" name="Profit" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={14} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold">Stock Availability</h3>
                                </div>
                                <div className="p-4">
                                    <div className="h-[240px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={[{ name: 'In Stock', value: products.filter(p => p.stock > 10).length }, { name: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 10).length }, { name: 'Out of Stock', value: products.filter(p => p.stock === 0).length }]} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
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
                            </div>
                            <div className="bg-white border-y md:border border-[#ddd] rounded-none md:rounded-[4px] shadow-sm md:col-span-2">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold">Top Selling Inventory</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    {(topProducts || []).slice(0, 5).map((prod, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded border border-[#e3e6e6] bg-[#f7f8fa] flex items-center justify-center text-[12px] font-bold text-[#565959]">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-[13px] font-bold text-[#0f1111] truncate max-w-[200px]">{(prod.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</span>
                                                    <span className="text-[12px] font-bold text-[#13b0d1]">{prod.sales_count} sales</span>
                                                </div>
                                                <div className="w-full bg-[#e3e6e6] h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-[#13b0d1] h-full transition-all duration-1000 rounded-full" style={{ width: `${Math.min((prod.sales_count / (topProducts[0]?.sales_count || 1)) * 100, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!topProducts || topProducts.length === 0) && <div className="py-10 text-center text-[12px] text-[#565959] italic">No sales data available yet</div>}
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
                                            <span className="font-bold text-[#e77600] capitalize">{selectedOrder.status.toLowerCase()}</span>
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
                                                <td className="px-4 py-4.5 text-right text-[18px] font-bold text-[#f0c14b]">{formatCurrency(selectedOrder.total_amount)}</td>
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
                            <button onClick={() => setSelectedOrder(null)} className="flex-1 h-[38px] text-[13px] font-semibold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] hover:from-[#eef1f3] hover:to-[#dce0e4] transition-all duration-300">Close Window</button>
                            <button
                                onClick={() => router.push(`/admin/sales/${selectedOrder.id}/invoice`)}
                                className="flex-1 h-[38px] text-[13px] font-semibold text-white bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] rounded-[3px] hover:from-[#f5d78e] hover:to-[#eeb933] flex items-center justify-center gap-2 shadow-sm transition-all duration-300 active:scale-[0.97]"
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
                                        className="w-full h-11 px-4 border border-[#888c8e] rounded-[3px] text-[13.5px] font-semibold text-[#0f1111] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] bg-white transition-all appearance-none cursor-pointer shadow-sm"
                                    >
                                        <option value="" className="text-[#666]">Choose a warehouse...</option>
                                        {warehouses.map((w: any) => (
                                            <option key={w.id} value={w.id} className="text-[#0f1111]">{w.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#888c8e]" />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-zinc-800 flex gap-3">
                            <button
                                onClick={() => setDeliveryModal(null)}
                                className="flex-1 h-10 text-[13px] font-semibold text-[#0f1111] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] hover:from-[#eef1f3] hover:to-[#dce0e4] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!selectedWarehouse || !hasEnoughStock || isSubmittingDelivery}
                                onClick={confirmDelivery}
                                className={`flex-1 h-10 text-[13px] font-semibold text-white bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] rounded-[3px] flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-[0.98] ${(!selectedWarehouse || !hasEnoughStock || isSubmittingDelivery) ? 'grayscale opacity-60 pointer-events-none' : ''}`}
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
