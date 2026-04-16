"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { orderService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    ShoppingBag, Search, X, RefreshCw, Printer, Plus,
    Activity, Eye, ChevronDown, ChevronRight, Filter, 
    Trash2, AlertTriangle, Calendar, TrendingUp, Package, 
    CheckCircle2, User, Hash, Phone, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PrintSlip } from '@/components/admin/PrintSlip';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - RECENT ORDERS
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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const STATUS_LIST = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

export default function RecentOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const statsParams: any = {};
            if (dateFilter) statsParams.date = dateFilter;
            const statsData = await orderService.getStats(statsParams);
            setStats(statsData);

            const params: any = { ordering: '-created_at', page: 1, pageSize: 100 };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (dateFilter) params.date = dateFilter;
            
            const response = await orderService.getPaginated(params);
            setOrders(response.results);
        } catch { toast.error("Failed to refresh"); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, [statusFilter, dateFilter]);

    const handlePrint = (order?: any) => {
        const target = order || selectedOrder;
        if (!target) return;
        setTimeout(() => { window.print(); }, 100);
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        setLoading(true);
        try {
            await orderService.update(orderId, { status: newStatus });
            toast.success("Status updated");
            loadData();
        } catch { toast.error("Failed to update"); } finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await orderService.delete(deleteTarget.id);
            toast.success("Order deleted");
            loadData();
            setDeleteTarget(null);
        } catch { toast.error("Failed to delete"); } finally { setIsDeleting(false); }
    };

    const filtered = (orders || []).filter(o => {
        const q = searchQuery.toLowerCase();
        return (o.order_number || '').toString().toLowerCase().includes(q) || 
               (o.customer_name || '').toLowerCase().includes(q) || 
               (o.phone_number || '').toLowerCase().includes(q) || 
               (o.tracking_id || '').toLowerCase().includes(q);
    });

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            
            {/* hidden printable area */}
            <div className="hidden print:block">
                <PrintSlip ref={printRef} order={selectedOrder} />
            </div>

            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Recent Orders</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Recent Orders</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Overview of latest transactions</p>
                        </div>
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={loadData} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Link href="/admin/sales">
                                <Btn><Plus size={14} /> New Order</Btn>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 text-left">
                
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard label="Today's Orders" value={stats?.today_count || '0'} subtext={`${stats?.pending_count || 0} Pending`} borderTop="#3498db" />
                    <MetricCard label="Today's Profit" value={`Rs. ${stats?.today_profit ? parseFloat(stats.today_profit).toLocaleString() : '0'}`} subtext="Daily gain" color="#067d62" borderTop="#067d62" />
                    <MetricCard label="Monthly Profit" value={`Rs. ${stats?.month_profit ? parseFloat(stats.month_profit).toLocaleString() : '0'}`} subtext="Monthly total" color="#e47911" borderTop="#e47911" />
                    <MetricCard label="Total Delivered" value={stats?.delivered_count || '0'} subtext="Completed sales" borderTop="#007185" />
                </div>

                {/* Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex flex-col xl:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            placeholder="Search by Phone, Tracking ID or Order #..."
                            className={inputCls + " pl-10 h-[35px]"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                         <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={inputCls + " pl-10 h-[35px] w-[180px]"} />
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls + " w-[160px] h-[35px] cursor-pointer"}>
                            {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Orders List */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">Order Info</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {loading && filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">No orders found.</td></tr>
                            ) : (
                                filtered.map((o) => (
                                    <tr key={o.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]" onClick={() => setSelectedOrder(o)}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#007185] group-hover:underline cursor-pointer">#{o.order_number}</div>
                                            <div className="text-[11px] text-[#aaa] mt-0.5">{formatDate(o.created_at)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#111]">{o.customer_name || 'Walk-in'}</div>
                                            <div className="flex items-center gap-2 text-[11px] text-[#565959] mt-0.5">
                                                <Phone size={10} className="text-[#aaa]" /> {o.phone_number || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#111]">{formatCurrency(o.total_amount)}</div>
                                            <div className="text-[11px] text-green-600 font-bold uppercase">{o.items?.length || 0} Items</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <StatusBadge status={o.status || 'PENDING'} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setSelectedOrder(o)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Eye size={14} /></button>
                                                <button onClick={() => handlePrint(o)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-blue-600"><Printer size={14} /></button>
                                                <button onClick={() => setDeleteTarget(o)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] max-w-2xl w-full shadow-2xl overflow-hidden text-left">
                        <div className="px-6 py-4 border-b border-[#ddd] flex items-center justify-between bg-[#f7f8fa]">
                            <h3 className="text-[15px] font-bold text-[#111]">Order #{selectedOrder.order_number}</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-[#aaa] hover:text-[#565959]"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3">Customer Details</p>
                                    <div className="space-y-1">
                                        <p className="text-[14px] font-bold text-[#111]">{selectedOrder.customer_name || 'Walk-in'}</p>
                                        <p className="text-[13px] text-[#565959]">{selectedOrder.phone_number}</p>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-2">Shipping Address</p>
                                        <p className="text-[13px] text-[#565959]">{selectedOrder.shipping_address || '—'}</p>
                                    </div>
                                </div>
                                <div className="bg-[#fcfdff] p-4 border border-[#eee] rounded-[4px]">
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3 text-center">Update Status</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STATUS_LIST.filter(s => s.value !== 'ALL').map((s) => (
                                            <button
                                                key={s.value}
                                                onClick={() => handleUpdateStatus(selectedOrder.id, s.value)}
                                                className={`px-3 py-1.5 text-[11px] font-bold border rounded-[3px] transition-all
                                                    ${selectedOrder.status === s.value ? 'bg-[#007185] border-[#007185] text-white' : 'bg-white border-[#ddd] text-[#565959] hover:bg-[#f7f8fa]'}
                                                `}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] font-bold text-[#aaa] uppercase mb-3">Items</p>
                            <div className="border border-[#eee] rounded-[4px] overflow-hidden">
                                <table className="w-full text-left text-[13px]">
                                    <thead className="bg-[#f9fafb]">
                                        <tr>
                                            <th className="px-4 py-2 border-b">Product</th>
                                            <th className="px-4 py-2 border-b text-center">Qty</th>
                                            <th className="px-4 py-2 border-b text-right">Price</th>
                                            <th className="px-4 py-2 border-b text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee]">
                                        {selectedOrder.items?.map((item: any) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3">{item.product_name}</td>
                                                <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">{parseFloat(item.price).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-bold">{(item.quantity * parseFloat(item.price)).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-[#0f1111] text-white">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right text-[11px] uppercase tracking-widest opacity-70">Total Amount</td>
                                            <td className="px-4 py-3 text-right text-[16px] font-bold text-[#ffd814]">Rs. {parseFloat(selectedOrder.total_amount).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {selectedOrder.notes && (
                                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-[4px]">
                                    <p className="text-[11px] font-bold text-amber-800 uppercase mb-1">Notes</p>
                                    <p className="text-[13px] text-amber-700 italic">"{selectedOrder.notes}"</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-[#f7f8fa] border-t border-[#ddd] flex gap-3">
                            <button onClick={() => setSelectedOrder(null)} className="flex-1 h-[35px] text-[13px] font-bold text-[#565959] bg-white border border-[#ddd] rounded-[3px] hover:bg-[#fcfdff]">Close</button>
                            <button onClick={() => handlePrint()} className="flex-1 h-[35px] text-[13px] font-bold text-[#111] bg-[#f0c14b] border border-[#a88734] rounded-[3px] hover:bg-[#f5d78e] flex items-center justify-center gap-2 shadow-sm">
                                <Printer size={16} /> Print Logistics Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <Trash2 size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Delete Order?</h3>
                        <p className="text-[13px] text-[#565959]">Delete order <span className="font-bold">#{deleteTarget.order_number}</span>? This cannot be undone.</p>
                        <div className="mt-6 space-y-2">
                            <button onClick={handleDelete} className="w-full h-[31px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-medium shadow-sm">
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button onClick={() => setDeleteTarget(null)} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
