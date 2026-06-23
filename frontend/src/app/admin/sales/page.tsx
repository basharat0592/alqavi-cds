"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, exportToCSV } from '@/lib/utils';
import {
    ShoppingBag, Search, RefreshCw,
    Plus, Loader2, User, CreditCard, Trash2, AlertTriangle, Clock, Warehouse
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

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

    const getStatusTone = (status: string): 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue' => {
        const s = status.toLowerCase();
        if (s === 'pending') return 'amber';
        if (s === 'confirmed' || s === 'processing') return 'blue';
        if (s === 'shipped') return 'indigo';
        if (s === 'delivered') return 'green';
        if (s === 'cancelled') return 'red';
        return 'neutral';
    };

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => orderService.delete(id)));
        setOrders(prev => prev.filter(o => !ids.includes(o.id.toString())));
        toast.success(`${ids.length} sale record(s) deleted`);
    };

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="pb-20 text-left">
            <div className="max-w-[1440px] mx-auto">
                <PageHeader
                    title="Sales History"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sales History' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={() => loadOrders()} disabled={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button variant="primary" onClick={() => router.push('/admin/sale')} className="whitespace-nowrap">
                                <Plus size={14} /> New Sale
                            </Button>
                        </>
                    }
                />

                {/* Filters */}
                <Card className="p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by order # or customer..."
                            className={`${ui.inputBase} pl-10`}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 h-[34px] rounded-lg text-[12px] font-bold transition-all border whitespace-nowrap ${statusFilter === f ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* ── Mobile Card List (hidden on md+) ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {filtered.length === 0 ? (
                        <Card className="py-16 text-center">
                            <div className="text-slate-200 mb-3"><ShoppingBag size={48} className="mx-auto" /></div>
                            <p className="text-[13px] text-slate-500 font-medium">No sales found.</p>
                        </Card>
                    ) : filtered.map(o => (
                        <Card key={o.id} className="p-4 space-y-3">
                            {/* Row 1: Order # + Amount */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <button onClick={() => router.push(`/admin/sales/${o.id}`)} className="text-[15px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                                        #{o.order_number || o.id}
                                    </button>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                                        <Clock size={10} />
                                        {formatDateTime(o.created_at)}
                                    </div>
                                    {(o as any).warehouse_name && (
                                        <div className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                            <Warehouse size={10} className="opacity-60" />{(o as any).warehouse_name}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-[16px] font-black text-slate-900 tabular-nums">{formatCurrency(o.total_amount)}</div>
                                    <Badge tone={getStatusTone(o.status)} className="mt-1">
                                        {o.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Row 2: Customer + Payment */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                                <div className="flex items-center gap-2">
                                    <User size={13} className="text-slate-400" />
                                    <div>
                                        <div className="text-[12px] font-bold text-slate-900">{(o as any).customer_name || 'Counter Guest'}</div>
                                        <div className="text-[10px] text-slate-400 italic">Walk-in Account</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-900 justify-end">
                                        <CreditCard size={11} className="text-slate-400" />
                                        {o.payment_method || 'Cash'}
                                    </div>
                                    <div className="text-[9px] text-emerald-600 font-black uppercase tracking-tighter mt-0.5">Verified Paid</div>
                                </div>
                            </div>

                            {/* Row 3: Actions */}
                            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-2.5">
                                <button onClick={() => router.push(`/admin/sales/${o.id}`)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => router.push(`/admin/sales/${o.id}/invoice`)} className="text-[12px] font-bold text-slate-600 hover:underline">Print</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => setOrderToDelete(o as Order)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* ── Desktop Table (hidden on mobile) ── */}
                <Card className="hidden md:block overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <SelectAllTh sel={sel} />
                                <th className="px-6 py-3">Order Details</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Payment</th>
                                <th className="px-6 py-3">Modified</th>
                                <th className="px-6 py-3 text-right">Grand Total</th>
                                <th className="px-6 py-3 text-center">Current State</th>
                                <th className="px-6 py-3 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8} className="py-24 text-center">
                                    <div className="text-slate-200 mb-4"><ShoppingBag size={60} className="mx-auto" /></div>
                                    <p className="text-[14px] text-slate-500 font-medium">No sales found matching your criteria.</p>
                                </td></tr>
                            ) : (
                                filtered.map(o => (
                                    <tr key={o.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                        <RowCheckboxTd sel={sel} id={o.id} />
                                        <td className="px-6 py-4">
                                            <div className="text-[14px] font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:underline cursor-pointer" onClick={() => router.push(`/admin/sales/${o.id}`)}>
                                                #{o.order_number || o.id}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <Clock size={12} className="text-slate-400" /> {formatDateTime(o.created_at)}
                                                </div>
                                                {(o as any).warehouse_name && (
                                                    <div className="text-[10px] text-indigo-600 flex items-center gap-1.5 font-black uppercase tracking-tighter">
                                                        <Warehouse size={10} className="opacity-60" /> {(o as any).warehouse_name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 font-bold flex items-center gap-2">
                                                <User size={14} className="text-slate-400" /> {(o as any).customer_name || 'Counter Guest'}
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-1 font-medium italic">Walk-in Account</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                                                <CreditCard size={14} className="text-slate-400" /> {o.payment_method || 'Cash'}
                                            </div>
                                            <div className="text-[10px] text-emerald-600 font-black uppercase mt-1 tracking-tighter">Verified Paid</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[12px] text-slate-900 font-bold tabular-nums">
                                                {new Date(o.updated_at || o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase mt-0.5 tracking-tighter tabular-nums">
                                                {new Date(o.updated_at || o.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-[16px] font-black text-slate-900 tabular-nums">{formatCurrency(o.total_amount)}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Net Amount</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Badge tone={getStatusTone(o.status)}>
                                                    {o.status}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2.5 transition-opacity">
                                                <button onClick={() => router.push(`/admin/sales/${o.id}`)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => router.push(`/admin/sales/${o.id}/invoice`)} className="text-[12px] font-bold text-slate-600 hover:underline">Print</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => setOrderToDelete(o as Order)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Card>

                <BulkBar
                    sel={sel}
                    entity="sales"
                    onDelete={bulkDelete}
                    onExport={() => exportToCSV(
                        sel.selectedItems.map((o: any) => ({
                            order_number: o.order_number || o.id,
                            customer_name: o.customer_name || 'Counter Guest',
                            payment_method: o.payment_method || 'Cash',
                            status: o.status || '',
                            total_amount: o.total_amount ?? 0,
                            warehouse: o.warehouse_name || '',
                            date: formatDateTime(o.created_at),
                        })),
                        'sales.csv',
                    )}
                />

                {/* Summary Note */}
                <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertTriangle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">Order Integrity</p>
                        <p className="text-[12px] text-slate-600 leading-relaxed">Status changes here are permanent and will trigger stock adjustments where applicable. Ensure you verify physical delivery before marking as 'Delivered'.</p>
                    </div>
                </div>
                {/* Delete Confirmation Modal */}
                <Modal
                    open={!!orderToDelete}
                    onClose={() => setOrderToDelete(null)}
                    title="Delete Sale Record"
                    size="sm"
                    footer={orderToDelete && (
                        <>
                            <Button variant="secondary" onClick={() => setOrderToDelete(null)} disabled={updatingRow === orderToDelete.id.toString()}>Cancel</Button>
                            <Button variant="danger" onClick={handleDelete} disabled={updatingRow === orderToDelete.id.toString()}>
                                {updatingRow === orderToDelete.id.toString() ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Delete'}
                            </Button>
                        </>
                    )}
                >
                    {orderToDelete && (
                        <div className="space-y-4 text-left">
                            <div className="flex justify-center mb-2">
                                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
                                    <Trash2 size={24} className="text-rose-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-[15px] font-bold text-slate-900 leading-snug">Permanently delete this order?</h3>
                                <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
                                    You are about to delete Sale <strong>#{(orderToDelete as any).order_number || orderToDelete.id}</strong>. This action is irreversible and will remove the record entirely.
                                </p>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
