"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { orderService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Search, RefreshCw, Printer, Plus,
    Eye, Trash2, Calendar, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PrintSlip } from '@/components/admin/PrintSlip';
import { PageHeader, Card, Button, Modal, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM — RECENT ORDERS
   ───────────────────────────────────────────────────────────────────────────── */
const MetricCard = ({ label, value, subtext, accent = "bg-indigo-500", valueClass = "text-slate-900" }: any) => (
    <Card className="p-5 hover:shadow-md transition-all relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-[3px] ${accent}`}></div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className={`text-[26px] font-bold leading-none tracking-tight tabular-nums ${valueClass}`}>{value}</span>
        </div>
        {subtext && (
            <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[11px] font-medium text-slate-500">{subtext}</span>
            </div>
        )}
    </Card>
);

const inputCls = ui.inputBase;

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
        <div className="pb-20 text-left">

            {/* hidden printable area */}
            <div className="hidden print:block">
                <PrintSlip ref={printRef} order={selectedOrder} />
            </div>

            <PageHeader
                title="Recent Activity"
                subtitle="Overview of latest transactions"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Recent Activity' }]}
                actions={
                    <>
                        <Button variant="secondary" onClick={loadData} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Link href="/admin/sales">
                            <Button variant="primary"><Plus size={14} /> New Order</Button>
                        </Link>
                    </>
                }
            />

            <div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard label="Today's Orders" value={stats?.today_count || '0'} subtext={`${stats?.pending_count || 0} Pending`} accent="bg-sky-500" />
                    <MetricCard label="Today's Profit" value={`Rs. ${stats?.today_profit ? parseFloat(stats.today_profit).toLocaleString() : '0'}`} subtext="Daily gain" valueClass="text-emerald-600" accent="bg-emerald-500" />
                    <MetricCard label="Monthly Profit" value={`Rs. ${stats?.month_profit ? parseFloat(stats.month_profit).toLocaleString() : '0'}`} subtext="Monthly total" valueClass="text-indigo-600" accent="bg-indigo-500" />
                    <MetricCard label="Total Delivered" value={stats?.delivered_count || '0'} subtext="Completed sales" accent="bg-indigo-500" />
                </div>

                {/* Filters */}
                <Card className="p-4 sm:p-5 mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                        <input
                            placeholder="Search by Phone, Tracking ID or Order #..."
                            className={inputCls + " pl-10"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                        <div className="relative w-full">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={inputCls + " pl-10 w-full md:w-[180px]"} />
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls + " w-full md:w-[160px] cursor-pointer"}>
                            {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                </Card>

                {/* Orders List */}
                <Card className="overflow-hidden text-left mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap">Order Info</th>
                                    <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap">Customer</th>
                                    <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 whitespace-nowrap">Total</th>
                                    <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-center whitespace-nowrap">Status</th>
                                    <th className="px-2.5 sm:px-6 py-2.5 sm:py-3 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[13px] text-slate-500">Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[13px] text-slate-500">No orders found.</td></tr>
                                ) : (
                                    filtered.map((o) => (
                                        <tr key={o.id} className="hover:bg-slate-50 transition-colors group text-[13px]" onClick={() => setSelectedOrder(o)}>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 whitespace-nowrap">
                                                <div className="font-bold text-indigo-600 group-hover:underline cursor-pointer tabular-nums">#{o.order_number}</div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(o.created_at)}</div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4">
                                                <div className="font-bold text-slate-900">{o.customer_name || 'Walk-in'}</div>
                                                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                    <Phone size={10} className="text-slate-400" /> {o.phone_number || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 whitespace-nowrap">
                                                <div className="font-bold text-slate-900 tabular-nums">{formatCurrency(o.total_amount)}</div>
                                                <div className="hidden sm:block text-[11px] text-emerald-600 font-bold uppercase">{o.items?.length || 0} Items</div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 text-center whitespace-nowrap">
                                                <StatusBadge status={o.status || 'PENDING'} />
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => setSelectedOrder(o)} className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500"><Eye size={14} /></button>
                                                    <button onClick={() => handlePrint(o)} className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-indigo-50 text-indigo-600"><Printer size={14} /></button>
                                                    <button onClick={() => setDeleteTarget(o)} className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-rose-50 text-rose-600"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Order Detail Modal */}
            <Modal
                open={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title={selectedOrder ? `Order #${selectedOrder.order_number}` : undefined}
                size="lg"
                footer={
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                        <Button variant="outline" onClick={() => setSelectedOrder(null)} className="flex-1">Close</Button>
                        <Button variant="primary" onClick={() => handlePrint()} className="flex-1">
                            <Printer size={16} /> Print Logistics Slip
                        </Button>
                    </div>
                }
            >
                {selectedOrder && (
                    <div className="max-h-[70vh] overflow-y-auto text-left">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Customer Details</p>
                                <div className="space-y-1">
                                    <p className="text-[14px] font-bold text-slate-900">{selectedOrder.customer_name || 'Walk-in'}</p>
                                    <p className="text-[13px] text-slate-600">{selectedOrder.phone_number}</p>
                                </div>
                                <div className="mt-4">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Shipping Address</p>
                                    <p className="text-[13px] text-slate-600">{selectedOrder.shipping_address || '—'}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Update Status</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {STATUS_LIST.filter(s => s.value !== 'ALL').map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => handleUpdateStatus(selectedOrder.id, s.value)}
                                            className={`px-3 py-1.5 text-[11px] font-bold border rounded-lg transition-all
                                                ${selectedOrder.status === s.value ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                                            `}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Items</p>
                        <div className="border border-slate-200/70 rounded-xl overflow-x-auto">
                            <table className="w-full text-left text-[13px]">
                                <thead className="bg-slate-50/60">
                                    <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="px-4 py-2 border-b border-slate-100 whitespace-nowrap">Product</th>
                                        <th className="px-4 py-2 border-b border-slate-100 text-center whitespace-nowrap">Qty</th>
                                        <th className="px-4 py-2 border-b border-slate-100 text-right whitespace-nowrap">Price</th>
                                        <th className="px-4 py-2 border-b border-slate-100 text-right whitespace-nowrap">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedOrder.items?.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">{item.product_name}</td>
                                            <td className="px-4 py-3 text-center font-bold whitespace-nowrap tabular-nums text-slate-900">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-slate-700">{parseFloat(item.price).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-bold whitespace-nowrap tabular-nums text-slate-900">{(item.quantity * parseFloat(item.price)).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right text-[11px] uppercase tracking-widest opacity-70 whitespace-nowrap">Total Amount</td>
                                        <td className="px-4 py-3 text-right text-[16px] font-bold text-indigo-300 whitespace-nowrap tabular-nums">Rs. {parseFloat(selectedOrder.total_amount).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {selectedOrder.notes && (
                            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <p className="text-[11px] font-bold text-amber-800 uppercase mb-1">Notes</p>
                                <p className="text-[13px] text-amber-700 italic">"{selectedOrder.notes}"</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Delete Modal */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
                {deleteTarget && (
                    <div className="text-center">
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                            <Trash2 size={24} className="text-rose-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-slate-900 tracking-tight mb-2">Delete Order?</h3>
                        <p className="text-[13px] text-slate-600">Delete order <span className="font-bold text-slate-900">#{deleteTarget.order_number}</span>? This cannot be undone.</p>
                        <div className="mt-6 space-y-2">
                            <Button variant="danger" onClick={handleDelete} disabled={isDeleting} className="w-full">
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </Button>
                            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="w-full text-indigo-600 hover:text-indigo-700">Cancel</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
