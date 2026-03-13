'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, productService, userService, Order } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Eye,
    CheckCircle, Clock, DollarSign, Printer, Plus, Trash2, Edit,
    AlertTriangle, Loader2, Package, Users, MapPin, Check, Save
} from 'lucide-react';

// ── Components ────────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
        <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
    </div>
);

const INPUT = `w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#a6a6a6] dark:border-slate-700 rounded text-sm outline-none transition-all focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400`;

const STATUS_FILTERS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

// ── Modals ───────────────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const items = order.items || [];
    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name
        ? `${c.first_name} ${c.last_name || ''}`.trim()
        : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

    const currency = order.currency || 'PKR';
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(String(item.price)) * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-[#f6f6f6] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-[#FF9900]" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                            Order #{order.order_number || order.id}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Customer Identity</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{customerName}</p>
                            <p className="text-xs text-gray-500 mt-1">{c?.email || 'Guest Client'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Record Date</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(order.created_at, { dateStyle: 'long' })}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at, { timeStyle: 'short' })}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Fulfillment</p>
                            <StatusBadge status={order.status} />
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Paid: {order.payment_status || 'Pending'}</p>
                        </div>
                    </div>

                    <div className="border border-[#ddd] dark:border-slate-800 rounded overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f6f6f6] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-800">
                                <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-2">Item Manifest</th>
                                    <th className="px-4 py-2 text-center">Qty</th>
                                    <th className="px-4 py-2 text-right">Price</th>
                                    <th className="px-4 py-2 text-right">Ext. Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {items.map((item: any, i: number) => (
                                    <tr key={i} className="text-xs text-gray-700 dark:text-gray-300">
                                        <td className="px-4 py-3 font-bold">{item.product_name || item.name || `Registry Item ${i + 1}`}</td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(parseFloat(item.price || 0), currency)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{formatCurrency((parseFloat(item.price || 0) * item.quantity), currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Logistic Cost:</span>
                                <span>{formatCurrency(parseFloat(String(order.shipping_cost || 0)), currency)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-[#FF9900] border-t border-[#ddd] pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(order.total_amount || 0, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#f6f6f6] dark:bg-slate-800/50 border-t border-[#ddd] dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition-colors">
                        Close
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded text-xs font-bold text-[#111] shadow-sm flex items-center gap-2">
                        <Printer className="h-3 w-3" /> Print Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}

function UpdateStatusModal({ order, onClose, onSuccess }: { order: Order, onClose: () => void, onSuccess: () => void }) {
    const [status, setStatus] = useState(order.status || 'pending');
    const [paymentStatus, setPaymentStatus] = useState(order.payment_status || 'pending');
    const [paymentMethod, setPaymentMethod] = useState(order.payment_method || 'Cash on Delivery');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await orderService.update(order.id as string, {
                status,
                payment_status: paymentStatus,
                payment_method: paymentMethod
            });
            onSuccess();
        } catch (error) {
            onSuccess();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-700">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Record Update</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status Classification</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT}>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className={INPUT}>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="w-full py-2 bg-[#f0c14b] border border-[#a88734] rounded text-xs font-bold text-[#111] hover:bg-[#ebae1e] shadow-sm transition-colors flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Changes
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
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(10);

    const load = async (page = currentPage) => {
        setLoading(true);
        try {
            const params: any = {
                page,
                ordering: '-created_at',
                search: search || undefined
            };
            if (statusFilter !== 'All') {
                params.status = statusFilter.toLowerCase();
            }

            const data = await orderService.getPaginated(params);
            setOrders(data.results);
            setTotalCount(data.count);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            load(1);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [search, statusFilter]);

    useEffect(() => {
        load(currentPage);
    }, [currentPage]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        setDeleting(true);
        try {
            await orderService.delete(orderToDelete.id as string);
            showToast('Order record removed.');
            load(currentPage);
        } catch { }
        finally {
            setDeleting(false);
            setOrderToDelete(null);
        }
    };

    const totalRevenue = orders.reduce((s, o) => (o.payment_status || '').toLowerCase() === 'completed' ? s + parseFloat(String(o.total_amount || '0')) : s, 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Amazon Style Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900] z-[300] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-bold uppercase tracking-tight">{toast}</span>
                </div>
            )}

            {/* Simple Amazon Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6 text-[#FF9900]" /> Transaction Ledger
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Global sales record and order fulfillment tracking</p>
                </div>
                <Link href="/admin/sales/create"
                    className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Add Order
                </Link>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Orders', val: loading ? '...' : totalCount, icon: Package, color: 'text-blue-600' },
                    { label: 'Completed Sales', val: orders.filter(o => o.status === 'delivered').length, icon: CheckCircle, color: 'text-green-600' },
                    { label: 'Total Revenue', val: loading ? '...' : formatCurrency(totalRevenue), icon: DollarSign, color: 'text-[#FF9900]' },
                    { label: 'Pending Queue', val: orders.filter(o => o.status === 'pending').length, icon: Clock, color: 'text-yellow-600' }
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 p-4 rounded shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                            <p className={`text-xl font-bold tracking-tight ${s.color}`}>{s.val}</p>
                        </div>
                        <s.icon className={`h-6 w-6 ${s.color} opacity-20`} />
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <SectionCard className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find by order # or customer..."
                            className={INPUT}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded border border-gray-200 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full">
                        {STATUS_FILTERS.map(f => (
                            <button key={f} onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors whitespace-nowrap ${statusFilter === f
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => load()} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shrink-0">
                        <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </SectionCard>

            {/* Order Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Reference #</th>
                                <th className="px-6 py-3">Customer Profile</th>
                                <th className="px-6 py-3">Valuation</th>
                                <th className="px-6 py-3">Status Axis</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-6 animate-pulse"><div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-full" /></td></tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No transactions recorded in this axis.</td>
                                </tr>
                            ) : (
                                orders.map((o) => {
                                    const c = o.customer as any;
                                    const cName = (o as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || 'Guest');
                                    return (
                                        <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 font-bold text-gray-900 dark:text-white text-sm">
                                                    #{o.order_number || String(o.id).slice(-6).toUpperCase()}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{formatDate(o.created_at)}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-gray-900 dark:text-gray-200">{cName}</div>
                                                <div className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{c?.email || 'Individual Sale'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-black text-[#FF9900]">{formatCurrency(o.total_amount || 0)}</div>
                                                <div className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{o.payment_status || 'Unpaid'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={o.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => setSelectedOrder(o)} className="p-1.5 text-gray-400 hover:text-[#FF9900]">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setOrderToUpdate(o)} className="p-1.5 text-gray-400 hover:text-blue-500">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setOrderToDelete(o)} className="p-1.5 text-gray-400 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Amazon Style) */}
                <div className="bg-[#f6f6f6] dark:bg-slate-800 px-6 py-4 flex items-center justify-between border-t border-[#ddd] dark:border-slate-800">
                    <p className="text-xs text-gray-500">Showing {orders.length} of {totalCount} records</p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1 bg-white dark:bg-slate-700 border border-[#a6a6a6] rounded text-xs hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold px-4 text-gray-700 dark:text-gray-300">Page {currentPage} / {totalPages || 1}</span>
                        <button
                            disabled={currentPage >= totalPages || totalCount === 0 || loading}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1 bg-white dark:bg-slate-700 border border-[#a6a6a6] rounded text-xs hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* Amazon Style Delete Confirmation */}
            {orderToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">System Purge</h3>
                            </div>
                        </div>
                        <div className="p-6 text-sm text-gray-700 dark:text-gray-300">
                            Permanently delete record <span className="font-bold text-gray-900 dark:text-white">#{orderToDelete.order_number || orderToDelete.id}</span>?
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setOrderToDelete(null)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] border-gray-300 rounded text-xs font-bold shadow-sm">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="px-4 py-1.5 bg-[#f0c14b] border border-[#a88734] rounded text-xs font-bold text-[#111] hover:bg-[#ebae1e] shadow-sm flex items-center gap-2">
                                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                Commit Erasure
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals Integration */}
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
            {orderToUpdate && <UpdateStatusModal order={orderToUpdate} onClose={() => setOrderToUpdate(null)} onSuccess={() => { setOrderToUpdate(null); load(currentPage); }} />}
        </div>
    );
}
