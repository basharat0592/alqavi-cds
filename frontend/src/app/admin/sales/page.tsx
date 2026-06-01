"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Eye,
    Plus, Printer, Loader2, Edit, User, Calendar, CreditCard, Trash2, AlertTriangle, ChevronRight, ChevronLeft, LayoutDashboard,
    CheckCircle2, Clock, Truck, Package, XCircle, Warehouse
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SALES LIST
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

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

const STATUS_FILTERS = ['All', 'Delivered', 'Cancelled'];

export default function SalesPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
        setUpdatingRow(orderId);
        try {
            await orderService.update(orderId, { status: newStatus.toUpperCase() });
            setOrders(prev => prev.map(o => o.id.toString() === orderId ? { ...o, status: newStatus.toUpperCase() } : o));
            toast.success('Status updated');
        } catch (error) { toast.error('Update failed'); } finally { setUpdatingRow(null); }
    };

    const handleDelete = async () => {
        if (!orderToDelete) return;
        setUpdatingRow(orderToDelete.id.toString());
        try {
            await orderService.delete(orderToDelete.id.toString());
            setOrders(prev => prev.filter(o => o.id.toString() !== orderToDelete.id.toString()));
            toast.success('Sale record deleted successfully.');
            setOrderToDelete(null);
        } catch (error) { toast.error('Delete failed'); setUpdatingRow(null); }
    };

    const loadOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await orderService.getAll();
            const rawOrders = Array.isArray(data) ? data : (data as any).results || [];
            // Strictly enforce that Sales Registry only contains history (Delivered/Cancelled)
            setOrders(rawOrders.filter((o: any) =>
                ['DELIVERED', 'CANCELLED'].includes((o.status || '').toUpperCase())
            ));
        } catch { toast.error('Connection failure'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // AUTO-SYNC (2s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !updatingRow) loadOrders(true);
        }, 2000);
        return () => clearInterval(interval);
    }, [loading, updatingRow, loadOrders]);

    const filtered = (orders || []).filter(o => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (o.order_number || '').toLowerCase().includes(q) || o.id.toString().includes(q) || ((o as any).customer_name || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
        if (s === 'confirmed' || s === 'processing') return 'bg-blue-50 text-blue-700 border-blue-200';
        if (s === 'shipped') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        if (s === 'delivered') return 'bg-green-50 text-green-700 border-green-200';
        if (s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-slate-50 text-slate-500 border-slate-200';
    };

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Sales Registry</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Sales History</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={loadOrders} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Btn>
                        <Btn onClick={() => router.push('/admin/sale')}>
                            <Plus size={14} /> New Sale
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex flex-wrap items-center gap-5 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by order # or customer..."
                            className={`${inputCls} pl-10`}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 h-[31px] rounded-[3px] text-[12px] font-bold transition-all border whitespace-nowrap ${statusFilter === f ? 'bg-[#e77600] border-[#c45500] text-white shadow-inner' : 'bg-white border-[#adb1b8] text-[#565959] hover:border-[#888c8e]'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sales Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-3">Order Details</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3">Modified</th>
                                <th className="px-6 py-3 text-right">Grand Total</th>
                                <th className="px-6 py-3 text-center">Current State</th>
                                <th className="px-6 py-3 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-24 text-center">
                                    <div className="opacity-10 mb-4"><ShoppingBag size={60} className="mx-auto" /></div>
                                    <p className="text-[14px] text-[#565959] font-medium italic">No sales found matching your criteria.</p>
                                </td></tr>
                            ) : (
                                filtered.map(o => (
                                    <tr key={o.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer" onClick={() => router.push(`/admin/sales/${o.id}`)}>
                                                #{o.order_number || o.id}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-[11px] text-[#565959] flex items-center gap-1.5 font-medium">
                                                    <Clock size={12} className="text-[#adb1b8]" /> {formatDateTime(o.created_at)}
                                                </div>
                                                {(o as any).warehouse_name && (
                                                    <div className="text-[10px] text-[#e77600] flex items-center gap-1.5 font-black uppercase tracking-tighter">
                                                        <Warehouse size={10} className="opacity-50" /> {(o as any).warehouse_name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[#111] font-bold flex items-center gap-2">
                                                <User size={14} className="text-[#adb1b8]" /> {(o as any).customer_name || 'Counter Guest'}
                                            </div>
                                            <div className="text-[11px] text-[#565959] mt-1 font-medium italic">Walk-in Account</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-[#111] font-bold">
                                                <CreditCard size={14} className="text-[#adb1b8]" /> {o.payment_method || 'Cash'}
                                            </div>
                                            <div className="text-[10px] text-[#007600] font-black uppercase mt-1 tracking-tighter">Verified Paid</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[12px] text-[#111] font-bold">
                                                {new Date(o.updated_at || o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="text-[10px] text-[#565959] font-black uppercase mt-0.5 tracking-tighter">
                                                {new Date(o.updated_at || o.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-[16px] font-black text-[#B12704]">{formatCurrency(o.total_amount)}</div>
                                            <div className="text-[10px] text-[#565959] font-bold uppercase mt-1">Net Amount</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`px-3 py-1 rounded-[2px] text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(o.status)}`}>
                                                    {o.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 transition-opacity">
                                                <button onClick={() => router.push(`/admin/sales/${o.id}`)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm" title="View Sale"><Eye size={14} /></button>
                                                <button onClick={() => router.push(`/admin/sales/${o.id}/invoice`)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959] shadow-sm" title="Print Invoice"><Printer size={14} /></button>
                                                <button onClick={() => setOrderToDelete(o as Order)} className="p-1.5 border border-rose-200 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-sm" title="Delete Sale">
                                                    {updatingRow === o.id.toString() ? <Loader2 size={14} className="animate-spin text-rose-600" /> : <Trash2 size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Note */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertTriangle className="text-[#e47911] shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-[#111]">Order Integrity</p>
                        <p className="text-[12px] text-[#565959] leading-relaxed">Status changes here are permanent and will trigger stock adjustments where applicable. Ensure you verify physical delivery before marking as 'Delivered'.</p>
                    </div>
                </div>
                {/* Delete Confirmation Modal */}
                {orderToDelete && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-sm border border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                            <div className="bg-[#f0f2f2] border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-rose-600" />
                                    <span className="text-[13px] font-bold text-[#111]">Delete Sale Record</span>
                                </div>
                                <button onClick={() => setOrderToDelete(null)} className="text-[#565959] hover:text-[#111] transition-colors p-1 rounded">
                                    <XCircle size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-center mb-2">
                                    <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
                                        <Trash2 size={24} className="text-rose-600" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-[15px] font-bold text-[#111] leading-snug">Permanently delete this order?</h3>
                                    <p className="text-[12px] text-[#565959] mt-2 leading-relaxed">
                                        You are about to delete Sale <strong>#{(orderToDelete as any).order_number || orderToDelete.id}</strong>. This action is irreversible and will remove the record entirely.
                                    </p>
                                </div>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <Btn variant="secondary" onClick={() => setOrderToDelete(null)} className="flex-1 !h-9 shadow-sm" disabled={updatingRow === orderToDelete.id.toString()}>Cancel</Btn>
                                <button onClick={handleDelete} disabled={updatingRow === orderToDelete.id.toString()} className="flex-1 h-9 bg-[#B12704] hover:bg-[#8f2003] hover:shadow transition-all border border-[#8f2003] text-white text-[13px] font-medium rounded-[3px] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                    {updatingRow === orderToDelete.id.toString() ? <Loader2 size={14} className="animate-spin border-t-white" /> : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
