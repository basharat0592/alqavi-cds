"use client";

import { useState, useEffect, useMemo } from 'react';
import { Package, Clock, MapPin, ChevronRight, LayoutDashboard, Globe, MoreHorizontal, User, Phone, CheckCircle2, XCircle, AlertCircle, AlertTriangle, RefreshCw, Filter, ArrowRight, Eye, Printer, Hash, CreditCard, ShoppingCart, ChevronDown, Loader2, Truck, X, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { salesService, orderService, inventoryService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - ADMIN ORDERS (INDUSTRIAL EDITION)
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[2px] text-[12px] font-bold border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[2px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

const STATUS_OPTIONS = [
    { label: 'Pending', value: 'PENDING', color: 'bg-[#fff8e6] text-[#855c00]' },
    { label: 'Delivered', value: 'DELIVERED', color: 'bg-[#dafbe1] text-[#1a7f37]' },
    { label: 'Cancelled', value: 'CANCELLED', color: 'bg-[#f6f8fa] text-[#57606a]' },
];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);
    const pageSize = 10;

    // Delivery States
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [deliveryModal, setDeliveryModal] = useState<{ orderId: string, status: string, order?: any } | null>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

    useEffect(() => {
        loadOrders();
        inventoryService.getWarehouses().then(setWarehouses).catch(() => []);
        inventoryService.getInventory().then(setAllStocks).catch(() => []);
    }, []);

    const activeOrders = useMemo(() => {
        // Active orders are PENDING, CONFIRMED, PROCESSING, SHIPPED, CANCEL_REQUESTED (not DELIVERED/CANCELLED)
        return (orders || []).filter((o: any) =>
            (o.status || '').toUpperCase() !== 'DELIVERED' &&
            (o.status || '').toUpperCase() !== 'CANCELLED'
        );
    }, [orders]);

    const handleStatusUpdateWithLoading = async (id: string, newStatus: string) => {
        const order = orders.find((o: any) => o.id?.toString() === id.toString());
        if (newStatus.toLowerCase() === 'delivered') {
            setDeliveryModal({ orderId: id, status: newStatus, order });
            return;
        }

        setUpdatingRow(id);
        try {
            await handleStatusUpdate(id, newStatus.toUpperCase());
        } finally {
            setUpdatingRow(null);
        }
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await salesService.getAdminOrders({ no_pagination: 'true' });
            setOrders(data || []);
        } catch (err) { toast.error("Failed to load orders"); } finally { setLoading(false); }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const data = await salesService.updateOrderStatus(id, newStatus);

            if (newStatus === 'CONFIRMED') {
                const encodedMsg = encodeURIComponent(data.whatsapp_message || '');
                let cleanNumber = (data.whatsapp_number || '').replace(/\D/g, '');
                if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
                    cleanNumber = '92' + cleanNumber.slice(1);
                } else if (cleanNumber.length === 10) {
                    cleanNumber = '92' + cleanNumber;
                }

                window.open(`whatsapp://send/?phone=${cleanNumber}&text=${encodedMsg}`, '_blank');
                toast.success('Order accepted! Opening WhatsApp Desktop...', { icon: '✅' });
            } else {
                toast.success(`Status updated to ${newStatus}`);
            }

            loadOrders();
        } catch (err) {
            toast.error("Update failed");
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
            loadOrders();
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

    const filtered = (orders || []).filter(o => {
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        return matchesStatus;
    });

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [statusFilter]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold uppercase tracking-tight">Orders Pipeline</span>
                </div>

                {/* Industrial Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Package className="text-[#111] h-5 w-5" />
                        <h1 className="text-[22px] font-normal text-[#111]">Orders</h1>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Btn variant="secondary" onClick={loadOrders} loading={loading} className="w-full sm:w-auto justify-center">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Pipeline
                        </Btn>
                    </div>
                </div>

                <div className="border-b border-[#ddd] mb-6" />

                {/* ── ACTIVE ORDERS HUB (DASHBOARD COMPONENT AT THE TOP) ── */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[14px] font-bold text-slate-850">Active Orders Pipeline</h2>
                            {activeOrders.filter(o => o.status === 'PENDING').length > 0 && (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                    {activeOrders.filter(o => o.status === 'PENDING').length} Pending Acceptance
                                </span>
                            )}
                        </div>
                        <span className="text-[12px] text-slate-500 font-semibold">
                            Showing {activeOrders.length} active orders
                        </span>
                    </div>



                    {/* Active Orders List - Table */}
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
                                                    <Link href={`/admin/sales/${order.id}/invoice`} className="text-[13px] font-bold text-[#e77600] hover:text-[#c65911] transition-colors">
                                                        #{order.tracking_id || order.id}
                                                    </Link>
                                                    <div className="flex items-center gap-2 text-[11px] text-[#565959] mt-1 font-medium">
                                                        <span className="text-[#0f1111] font-semibold">{order.customer_name || 'Walk-in'}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-[13px] font-bold text-[#0f1111]">{formatCurrency(order.total_amount)}</div>
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
                                                                onChange={(e) => handleStatusUpdateWithLoading(order.id?.toString(), e.target.value)}
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
                                                            onClick={() => handleStatusUpdateWithLoading(order.id?.toString(), 'CONFIRMED')}
                                                            className="h-[30px] px-3.5 text-[12px] font-semibold text-white bg-[#0ea5e9] hover:bg-[#0284c7] border border-transparent shadow-sm rounded-[3px] transition-all duration-300 flex items-center gap-1.5 active:scale-[0.97] disabled:opacity-60"
                                                        >
                                                            <CheckCircle2 size={12} /> Accept
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
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
                                        <td colSpan={4} className="py-12 text-center text-[12px] text-slate-400 italic">
                                            No active orders in the pipeline right now.
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
                                return (
                                    <div key={order.id} className="py-3 px-4 hover:bg-[#f3f7f7] transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <Link href={`/admin/sales/${order.id}/invoice`} className="text-[13px] font-bold text-[#e77600] hover:text-[#c65911] transition-colors">
                                                    #{order.tracking_id || order.id}
                                                </Link>
                                                <div className="text-[11px] text-[#565959] mt-0.5">
                                                    <Clock size={10} className="inline mr-1" /> {new Date(order.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[13px] font-bold text-[#0f1111]">{formatCurrency(order.total_amount)}</div>
                                                <span className="text-[9px] text-[#565959] font-bold uppercase tracking-wider block">{order.payment_method || 'C.O.D'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#eee]">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                status === 'CONFIRMED' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {status}
                                            </span>
                                            <div className="flex gap-1.5">
                                                {status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleStatusUpdateWithLoading(order.id?.toString(), 'CONFIRMED')}
                                                        className="h-[28px] px-2.5 text-[11px] font-bold text-white bg-[#0ea5e9] rounded-[2px]"
                                                    >
                                                        Accept
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                                                    className="h-[28px] px-2.5 text-[11px] font-bold border border-[#adb1b8] bg-[#f7f8fa] text-slate-800 rounded-[2px]"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-[12px] text-slate-400 italic">No active orders.</div>
                        )}
                    </div>
                </div>

                {/* Industrial Order Table (with integrated Filter Bar header) */}
                <div className="bg-white border border-[#e1e4e8] rounded-[2px] shadow-sm overflow-hidden">
                    {/* Integrated Filter Bar Header */}
                    <div className="px-5 py-4 border-b border-[#e1e4e8] bg-[#fafafa]">
                        <div className="flex flex-wrap items-center gap-4">

                            <div className="flex items-center gap-2">
                                <label className="text-[11px] font-black text-[#57606a] uppercase tracking-wider">Status Filter</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className={inputCls + " w-[160px] h-[33px] cursor-pointer bg-white"}
                                >
                                    <option value="ALL">All Orders</option>
                                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div className="h-6 w-[1px] bg-[#e1e4e8]" />
                            <div className="text-[11px] font-bold text-[#57606a] uppercase tracking-tight">
                                Showing <span className="text-[#111]">{filtered.length}</span> Results
                            </div>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f6f8fa] border-b border-[#e1e4e8] text-[10px] font-bold text-[#57606a] uppercase tracking-wider">
                                <th className="px-5 py-3 w-[280px]">Customer & Tracking</th>
                                <th className="px-5 py-3">Shipping Logistics</th>
                                <th className="px-5 py-3 w-36">Value</th>
                                <th className="px-5 py-3 w-40 text-center">Lifecycle Status</th>
                                <th className="px-5 py-3 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f2f5]">
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center text-[12px] text-[#57606a] font-medium italic">No active orders found in this pipeline.</td></tr>
                            ) : (
                                paginatedData.map((order) => {
                                    const st = STATUS_OPTIONS.find(s => s.value === order.status);
                                    return (
                                        <tr key={order.id} className="hover:bg-[#f8f9fa] transition-colors group text-[11px]">
                                            <td className="px-2.5 sm:px-5 py-3 sm:py-4">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#f6f8fa] border border-[#e1e4e8] rounded-[2px] flex items-center justify-center text-[#8c959f] group-hover:border-[#d0d7de] group-hover:text-[#111] transition-all flex-shrink-0">
                                                        <Package size={14} className="sm:w-4 sm:h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[9px] sm:text-[10px] font-black text-[#c45500] uppercase tracking-tighter bg-[#fff8e6] px-1 sm:px-1.5 py-0.5 rounded-[1px]">#{order.tracking_id}</span>
                                                        </div>
                                                        <p className="font-bold text-[#1a1d23] mt-1 text-[11px] sm:text-[12px]">{order.customer_name}</p>
                                                        <p className="text-[9px] sm:text-[10px] text-[#57606a] font-bold uppercase tracking-tight flex items-center gap-1 mt-1 opacity-70"><Phone size={9} /> {order.phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-5 py-3 sm:py-4">
                                                <div className="flex items-start gap-1.5 max-w-[140px] sm:max-w-[300px]">
                                                    <MapPin size={10} className="text-[#8c959f] shrink-0 mt-0.5" />
                                                    <p className="line-clamp-2 text-[#57606a] font-medium leading-relaxed text-[10px] sm:text-[11px]">{order.shipping_address}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-2 text-[8.5px] sm:text-[9.5px] text-[#8c959f] font-bold uppercase tracking-wide">
                                                    <Clock size={9} /> Ordered on {formatDate(order.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-5 py-3 sm:py-4">
                                                <div className="font-black text-[#1a1d23] text-[12px] sm:text-[13px]">{formatCurrency(order.total_amount)}</div>
                                                <div className="text-[8.5px] sm:text-[9.5px] text-[#1a7f37] font-black uppercase tracking-tighter mt-1 italic">{order.items?.length || 0} ITEMS</div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <div className={`relative inline-flex items-center min-w-[120px] rounded-full border px-3 py-0.5 font-bold text-[9px] uppercase transition-all duration-300 ${order.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        order.status === 'CONFIRMED' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                                            order.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                order.status === 'SHIPPED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                    order.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                        'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                        <select
                                                            value={(order.status || '').toLowerCase()}
                                                            onChange={(e) => handleStatusUpdateWithLoading(order.id?.toString(), e.target.value)}
                                                            disabled={updatingRow === order.id?.toString() || (order.status || '').toUpperCase() === 'PENDING'}
                                                            className="w-full bg-transparent border-none p-0 pr-4 text-[9px] font-bold uppercase cursor-pointer outline-none focus:ring-0 appearance-none disabled:cursor-not-allowed select-none"
                                                        >
                                                            {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                <option key={s} value={s} className="bg-white text-slate-800 lowercase first-letter:uppercase">{s}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                                                        {updatingRow === order.id && (
                                                            <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                                                                <Loader2 size={11} className="animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-5 py-3 sm:py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 transition-all">
                                                    <button
                                                        onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                                                        className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center border border-[#e1e4e8] rounded-[2px] bg-white hover:bg-[#f6f8fa] text-[#57606a] hover:text-[#0969da] transition-all shadow-sm"
                                                        title="Quick View"
                                                    >
                                                        <Eye size={12} className="sm:w-3.5 sm:h-3.5" />
                                                    </button>
                                                    <Link
                                                        href={`/admin/sales/${order.id}/invoice`}
                                                        className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center border border-[#e1e4e8] rounded-[2px] bg-white hover:bg-[#f6f8fa] text-[#57606a] hover:text-[#c45500] transition-all shadow-sm"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer size={12} className="sm:w-3.5 sm:h-3.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Industrial Pagination */}
                    <div className="bg-[#f6f8fa] border-t border-[#e1e4e8] px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-[11px] font-bold text-[#57606a] uppercase tracking-tight text-center sm:text-left">
                            Showing <span className="text-[#111]">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="text-[#111]">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="text-[#111]">{filtered.length}</span> Records
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="h-[29px] px-3 bg-white border border-[#adb1b8] rounded-[2px] text-[11px] font-bold text-[#0f1111] hover:bg-[#f7f8fa] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                            >
                                Previous
                            </button>
                            <div className="text-[11px] font-black text-[#57606a] uppercase tracking-widest bg-white border border-[#ddd] px-3 py-1 rounded-[2px] whitespace-nowrap">
                                Page {currentPage}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages || 1))}
                                disabled={currentPage >= (totalPages || 1)}
                                className="h-[29px] px-3 bg-white border border-[#adb1b8] rounded-[2px] text-[11px] font-bold text-[#0f1111] hover:bg-[#f7f8fa] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Details Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={`Order Analysis: #${selectedOrder?.tracking_id || ''}`}
            >
                {selectedOrder && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        {/* Status Header */}
                        <div className="flex items-center justify-between p-3 bg-[#f6f8fa] border border-[#e1e4e8] rounded-[2px]">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-[#57606a]" />
                                <span className="text-[11px] font-black uppercase text-[#57606a]">Order Placed: {formatDate(selectedOrder.created_at)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-[1px] text-[10px] font-black uppercase ${STATUS_OPTIONS.find(s => s.value === selectedOrder.status)?.color || ''}`}>
                                {selectedOrder.status}
                            </span>
                        </div>

                        {/* Customer Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-[#57606a] uppercase tracking-widest flex items-center gap-1.5 border-b pb-1">
                                    <User size={12} /> Customer Intel
                                </h4>
                                <div className="space-y-1">
                                    <p className="text-[13px] font-bold text-[#1a1d23]">{selectedOrder.customer_name}</p>
                                    <p className="text-[11px] text-[#57606a] flex items-center gap-1.5"><Phone size={10} /> {selectedOrder.phone_number}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-[#57606a] uppercase tracking-widest flex items-center gap-1.5 border-b pb-1">
                                    <MapPin size={12} /> Logistics Point
                                </h4>
                                <p className="text-[11px] text-[#57606a] leading-relaxed italic">{selectedOrder.shipping_address}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-[#57606a] uppercase tracking-widest flex items-center gap-1.5 border-b pb-1">
                                <ShoppingCart size={12} /> SKU Breakdown
                            </h4>
                            <div className="border border-[#e1e4e8] rounded-[2px] overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#f6f8fa] border-b border-[#e1e4e8] text-[9px] font-bold text-[#57606a] uppercase">
                                            <th className="px-3 py-2">Item Detail</th>
                                            <th className="px-3 py-2 text-center w-16">Qty</th>
                                            <th className="px-3 py-2 text-right w-24">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f0f2f5] text-[10px]">
                                        {selectedOrder.items?.map((item: any, i: number) => (
                                            <tr key={i} className="hover:bg-[#f8f9fa]">
                                                <td className="px-3 py-2">
                                                    <p className="font-bold text-[#1a1d23]">{item.product_name}</p>
                                                    <p className="text-[8px] text-[#8c959f] font-bold">SKU: {item.id || 'N/A'}</p>
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right font-bold">{formatCurrency(item.price || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="space-y-2 pt-4 border-t border-dashed border-[#ddd]">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-[#57606a] uppercase tracking-widest">Subtotal</span>
                                <span className="text-[11px] font-bold text-[#1a1d23]">{formatCurrency(selectedOrder.total_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#c45500]">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Total Value</span>
                                <span className="text-[16px] font-black">{formatCurrency(selectedOrder.total_amount)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Link
                                href={`/admin/sales/${selectedOrder.id}/invoice`}
                                className="flex-1 h-[31px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] rounded-[2px] font-bold text-[11px] flex items-center justify-center gap-2 uppercase tracking-wide shadow-sm whitespace-nowrap"
                            >
                                <Printer size={14} /> Generate Invoice
                            </Link>
                            <Btn variant="secondary" className="flex-1 w-full justify-center" onClick={() => setIsViewModalOpen(false)}>
                                Close Dashboard
                            </Btn>
                        </div>
                    </div>
                )}
            </Modal>

            {deliveryModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-955/50 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-800 uppercase tracking-tight">Complete Delivery</h3>
                                    <p className="text-[12px] text-slate-400 font-medium">Select fulfillment warehouse</p>
                                </div>
                            </div>
                            <button onClick={() => setDeliveryModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl flex gap-3">
                                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 leading-relaxed font-semibold">
                                    Select fulfillment warehouse to proceed. Stock will be deducted immediately from the chosen location.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ordered Products</h4>
                                    {selectedWarehouse && (
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${hasEnoughStock ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                            {hasEnoughStock ? 'Stock Confirmed' : 'Insufficient Stock'}
                                        </span>
                                    )}
                                </div>
                                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-[12px] border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr className="text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="px-3.5 py-2.5 text-left">Item Details</th>
                                                <th className="px-3.5 py-2.5 text-center">Qty</th>
                                                <th className="px-3.5 py-2.5 text-right">{selectedWarehouse ? 'Store' : 'Price'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(selectedWarehouse ? warehouseStockInfo : deliveryModal.order?.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className={item.insufficient ? 'bg-rose-50/20' : 'hover:bg-slate-50/50'}>
                                                    <td className="px-3.5 py-2.5">
                                                        <p className="font-semibold text-slate-800 leading-tight">{(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</p>
                                                        {(item.weight || item.size) && (
                                                            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mt-1">
                                                                {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-500">{item.quantity}</td>
                                                    <td className={`px-3.5 py-2.5 text-right font-bold ${selectedWarehouse ? (item.insufficient ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-800'}`}>
                                                        {selectedWarehouse ? item.available : formatCurrency(item.price)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedWarehouse && !hasEnoughStock && (
                                    <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 flex items-center gap-2">
                                        <AlertTriangle size={14} className="shrink-0" /> Critical Error: Missing items in this warehouse.
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
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

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
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
