"use client";

import { useState, useEffect } from 'react';
import { Package, Clock, MapPin, Search, ChevronRight, LayoutDashboard, Globe, MoreHorizontal, User, Phone, CheckCircle2, XCircle, AlertCircle, RefreshCw, Filter, ArrowRight, Eye, Printer, Hash, CreditCard, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { salesService } from '@/lib/api';
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
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => { loadOrders(); }, []);

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

    const filtered = (orders || []).filter(o => {
        const matchesSearch =
            (o.tracking_id || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.phone_number || '').includes(search);
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Package className="text-[#111] h-5 w-5" />
                        <h1 className="text-[22px] font-normal text-[#111]">Orders</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={loadOrders} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Pipeline
                        </Btn>
                    </div>
                </div>

                <div className="border-b border-[#ddd] mb-6" />

                {/* Premium Filter Bar */}
                <div className="bg-white border border-[#e1e4e8] rounded-[2px] p-4 mb-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px] relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c959f] group-focus-within:text-[#e77600] transition-colors" />
                            <input
                                placeholder="Search Tracking ID, Customer Name, or Phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={inputCls + " pl-10 h-[33px]"}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-black text-[#57606a] uppercase tracking-wider">Status Filter</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={inputCls + " w-[160px] h-[33px] cursor-pointer bg-[#f6f8fa]"}
                            >
                                <option value="ALL">All Orders</option>
                                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="h-6 w-[1px] bg-[#ddd]" />
                        <div className="text-[11px] font-bold text-[#57606a] uppercase tracking-tight">
                            Showing <span className="text-[#111]">{filtered.length}</span> Results
                        </div>
                    </div>
                </div>

                {/* Industrial Order Table */}
                <div className="bg-white border border-[#e1e4e8] rounded-[2px] shadow-sm overflow-hidden">
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
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-[#f6f8fa] border border-[#e1e4e8] rounded-[2px] flex items-center justify-center text-[#8c959f] group-hover:border-[#d0d7de] group-hover:text-[#111] transition-all">
                                                        <Package size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-[#c45500] uppercase tracking-tighter bg-[#fff8e6] px-1.5 py-0.5 rounded-[1px]">#{order.tracking_id}</span>
                                                        </div>
                                                        <p className="font-bold text-[#1a1d23] mt-1 text-[12px]">{order.customer_name}</p>
                                                        <p className="text-[10px] text-[#57606a] font-bold uppercase tracking-tight flex items-center gap-1 mt-1 opacity-70"><Phone size={10} /> {order.phone_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-start gap-2 max-w-[300px]">
                                                    <MapPin size={11} className="text-[#8c959f] shrink-0 mt-0.5" />
                                                    <p className="line-clamp-2 text-[#57606a] font-medium leading-relaxed">{order.shipping_address}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 text-[9.5px] text-[#8c959f] font-bold uppercase tracking-wide">
                                                    <Clock size={10} /> Ordered on {formatDate(order.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-black text-[#1a1d23] text-[13px]">{formatCurrency(order.total_amount)}</div>
                                                <div className="text-[9.5px] text-[#1a7f37] font-black uppercase tracking-tighter mt-1 italic">{order.items?.length || 0} ITEMS IN PACK</div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                    disabled={order.status === 'DELIVERED'}
                                                    className={`px-3 py-1 h-[26px] rounded-[1px] text-[9.5px] font-black uppercase outline-none transition-all border-none shadow-sm
                                                        ${order.status === 'DELIVERED' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                                                        ${st?.color || 'bg-[#f6f8fa] text-[#57606a]'}`}
                                                >
                                                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 transition-all">
                                                    <button
                                                        onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                                                        className="w-7 h-7 flex items-center justify-center border border-[#e1e4e8] rounded-[2px] bg-white hover:bg-[#f6f8fa] text-[#57606a] hover:text-[#0969da] transition-all shadow-sm"
                                                        title="Quick View"
                                                    >
                                                        <Eye size={13} />
                                                    </button>
                                                    <Link
                                                        href={`/admin/sales/${order.id}/invoice`}
                                                        className="w-7 h-7 flex items-center justify-center border border-[#e1e4e8] rounded-[2px] bg-white hover:bg-[#f6f8fa] text-[#57606a] hover:text-[#c45500] transition-all shadow-sm"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer size={13} />
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
                    <div className="bg-[#f6f8fa] border-t border-[#e1e4e8] px-5 py-3 flex items-center justify-between">
                        <div className="text-[11px] font-bold text-[#57606a] uppercase tracking-tight">
                            Showing <span className="text-[#111]">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="text-[#111]">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="text-[#111]">{filtered.length}</span> Records
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="h-[29px] px-3 bg-white border border-[#adb1b8] rounded-[2px] text-[11px] font-bold text-[#0f1111] hover:bg-[#f7f8fa] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1"
                            >
                                Previous
                            </button>
                            <div className="text-[11px] font-black text-[#57606a] uppercase tracking-widest bg-white border border-[#ddd] px-3 py-1 rounded-[2px]">
                                Page {currentPage}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages || 1))}
                                disabled={currentPage >= (totalPages || 1)}
                                className="h-[29px] px-3 bg-white border border-[#adb1b8] rounded-[2px] text-[11px] font-bold text-[#0f1111] hover:bg-[#f7f8fa] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all flex items-center gap-1"
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
                        <div className="grid grid-cols-2 gap-4">
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
                            <div className="border border-[#e1e4e8] rounded-[2px] overflow-hidden">
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

                        {/* Action Bar */}
                        <div className="flex gap-2 pt-4">
                            <Link
                                href={`/admin/sales/${selectedOrder.id}/invoice`}
                                className="flex-1 h-[31px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] rounded-[2px] font-bold text-[11px] flex items-center justify-center gap-2 uppercase tracking-wide shadow-sm"
                            >
                                <Printer size={14} /> Generate Invoice
                            </Link>
                            <Btn variant="secondary" className="flex-1" onClick={() => setIsViewModalOpen(false)}>
                                Close Dashboard
                            </Btn>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
