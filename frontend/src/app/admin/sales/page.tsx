'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Eye,
    Plus, Printer, Loader2, Edit, User, Calendar, CreditCard
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';

// ── Status pill ───────────────────────────────────────────────────────────────
const orderStatusStyle: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    ordered: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    refunded: 'bg-purple-50 text-purple-700 border-purple-200',
};
const StatusPill = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase();
    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${orderStatusStyle[s] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {(status || '').replace('_', ' ')}
        </span>
    );
};

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const items = order.items || [];
    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name
        ? `${c.first_name} ${c.last_name || ''}`.trim()
        : c?.username || c?.email || 'Guest');
    const currency = order.currency || 'PKR';
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(String(item.price)) * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Order #{order.order_number || String(order.id).slice(-6).toUpperCase()}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Order details</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-5">
                    {/* Customer / Date / Status */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <User className="h-3.5 w-3.5 text-[#F7CA00]" />
                                <p className="text-xs text-slate-500 font-medium">Customer</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{customerName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{c?.email || 'Guest'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                <p className="text-xs text-slate-500 font-medium">Date</p>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatDate(order.created_at, { dateStyle: 'medium' })}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                                <p className="text-xs text-slate-500 font-medium">Status</p>
                            </div>
                            <StatusPill status={order.status} />
                            <p className={`text-xs mt-1.5 font-medium ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                Payment: {order.payment_status || 'Pending'}
                            </p>
                        </div>
                    </div>

                    {/* Items table */}
                    <div className="border border-slate-100 dark:border-white/10 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-left">Item</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-center">Qty</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-right">Price</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {items.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                        <td className="px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200">{item.product_name || item.name || `Item ${i + 1}`}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-600 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-600 text-right">{formatCurrency(parseFloat(item.price || 0), currency)}</td>
                                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-white text-right">{formatCurrency(parseFloat(item.price || 0) * item.quantity, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-56 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Subtotal</span>
                                <span className="text-slate-700 dark:text-slate-300">{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Shipping</span>
                                <span className="text-slate-700 dark:text-slate-300">{formatCurrency(parseFloat(String(order.shipping_cost || 0)), currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-white/10">
                                <span className="text-slate-800 dark:text-white">Total</span>
                                <span className="text-[#F7CA00] text-base">{formatCurrency(order.total_amount || 0, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                        Close
                    </button>
                    <Link href={`/admin/sales/${order.id}/invoice`} className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-[#F7CA00] hover:bg-blue-700 rounded-lg transition-all shadow-sm">
                        <Printer className="h-4 w-4" /> View Invoice
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Status Update Modal ───────────────────────────────────────────────────────
function UpdateStatusModal({ order, onClose, onSuccess }: { order: Order; onClose: () => void; onSuccess: () => void }) {
    const [status, setStatus] = useState(order.status || 'pending');
    const [paymentStatus, setPaymentStatus] = useState(order.payment_status || 'pending');
    const [paymentMethod, setPaymentMethod] = useState(order.payment_method || 'Cash on Delivery');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await orderService.update(order.id, { status, payment_status: paymentStatus, payment_method: paymentMethod });
            onSuccess();
        } catch (error: any) { 
            console.error('Update failed:', error.response?.data || error.message);
            alert(`Update failed: ${JSON.stringify(error.response?.data || error.message)}`);
        }
        finally { setLoading(false); }
    };

    const selectCls = `w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-800 dark:text-slate-200 cursor-pointer`;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Update Order Status</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Order Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                            {STATUS_FILTERS.filter(f => f !== 'All').map(f => (
                                <option key={f} value={f.toLowerCase()}>{f}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Payment Status</label>
                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className={selectCls}>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={selectCls}>
                            <option value="Cash on Delivery">Cash on Delivery</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Credit Card">Credit Card</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-[#F7CA00] hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAll();
            setOrders(Array.isArray(data) ? data : (data as any).results || []);
        } catch { console.error('Failed to load orders'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadOrders(); }, []);

    // if (loading) return <PageLoader />;

    const filtered = orders.filter(o => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            (o.order_number || '').toLowerCase().includes(q) ||
            o.id.toString().includes(q) ||
            ((o.customer as any)?.first_name || '').toLowerCase().includes(q) ||
            ((o.customer as any)?.last_name || '').toLowerCase().includes(q) ||
            ((o as any).customer_name || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Recent Orders</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">View and manage all sales transactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadOrders} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] hover:border-[#F7CA00]/40 transition-all" title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => router.push('/admin/sales/create')} className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        <Plus className="h-4 w-4" /> New Sale
                    </button>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by order # or customer..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    {STATUS_FILTERS.map(f => <option key={f} value={f}>{f === 'All' ? 'All Statuses' : f}</option>)}
                </select>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order #</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <ShoppingBag className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">No orders found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(o => {
                                    const c = o.customer as any;
                                    const customerName = (o as any).customer_name || (c?.first_name
                                        ? `${c.first_name} ${c.last_name || ''}`.trim()
                                        : c?.username || 'Guest');
                                    return (
                                        <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <span className="text-[#F7CA00] font-medium text-sm">{o.order_number || `#${String(o.id).slice(-6).toUpperCase()}`}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{customerName}</p>
                                                <p className="text-xs text-slate-400 font-medium">{c?.email || ''}</p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">{formatDate(o.created_at)}</td>
                                            <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{formatCurrency(o.total_amount)}</span>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase">{o.payment_method || ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end items-center gap-1">
                                                    <button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-md text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-[#F7CA00]/10 transition-colors" title="View">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setUpdatingOrder(o)} className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title="Update Status">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <Link href={`/admin/sales/${o.id}/invoice`} className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Invoice">
                                                        <Printer className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
            {updatingOrder && <UpdateStatusModal order={updatingOrder} onClose={() => setUpdatingOrder(null)} onSuccess={() => { setUpdatingOrder(null); loadOrders(); }} />}
        </div>
    );
}
