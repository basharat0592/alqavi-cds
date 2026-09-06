"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime, exportToCSV } from '@/lib/utils';
import {
    ShoppingBag, Search, RefreshCw,
    Plus, Loader2, User, CreditCard, Trash2, AlertTriangle, Clock, Warehouse,
    Printer, Wallet, Package, Phone, MapPin, Calendar, Store, Globe, ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, useSort, SortableTh, TableShell, Pagination, RowActions, ui } from '@/components/admin/ui';
import { PaymentModal } from '@/components/admin/PaymentPanel';
import SaleEntry from '@/components/admin/SaleEntry';

const STATUS_FILTERS = ['All', 'Delivered', 'Cancelled'];

/** Small payment-status chip used in the sales registry. */
function PayStatusCell({ o }: { o: any }) {
    // Cancelled / rejected sales are void — no money was collected.
    if (['CANCELLED', 'REJECTED'].includes((o.status || '').toUpperCase())) {
        return <div className="text-[10.5px] text-[#9C9C98] font-semibold uppercase mt-1 tracking-tighter">No payment</div>;
    }
    const status = (o.payment_status || 'PAID').toUpperCase();
    const remaining = Number(o.remaining_amount ?? 0);
    if (status === 'PAID' || remaining <= 0) {
        return <div className="text-[10.5px] text-emerald-600 font-semibold uppercase mt-1 tracking-tighter">Paid in full</div>;
    }
    const overdue = o.is_overdue;
    return (
        <div className="mt-1 space-y-0.5">
            <div className={`text-[10.5px] font-semibold uppercase tracking-tighter ${status === 'PARTIAL' ? 'text-amber-600' : 'text-rose-600'}`}>
                {status === 'PARTIAL' ? 'Partially paid' : 'Unpaid'} · {formatCurrency(remaining)} due
            </div>
            {o.due_date && (
                <div className={`text-[10.5px] font-semibold ${overdue ? 'text-rose-600' : 'text-[#9C9C98]'}`}>
                    {overdue ? `${o.days_overdue}d overdue` : `Due ${o.due_date}`}
                </div>
            )}
        </div>
    );
}

export default function SalesPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    // Seed the search from ?search= so deep links (e.g. a dashboard "Payments Due"
    // row) land on the list pre-filtered to that order.
    const [searchTerm, setSearchTerm] = useState(() => {
        if (typeof window === 'undefined') return '';
        return new URLSearchParams(window.location.search).get('search') || '';
    });
    const [statusFilter, setStatusFilter] = useState('All');
    const [channelFilter, setChannelFilter] = useState('All');   // All | POS | Online
    const [payFilter, setPayFilter] = useState('All');           // All | Paid | Partial | Unpaid
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [payOrder, setPayOrder] = useState<any | null>(null);
    const [viewOrder, setViewOrder] = useState<any | null>(null);
    // New Sale opens the POS workspace in a popup rather than routing to /admin/sale.
    const [newSaleOpen, setNewSaleOpen] = useState(false);
    const [newSaleDirty, setNewSaleDirty] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const changePageSize = (n: number) => { setItemsPerPage(n); setCurrentPage(1); };

    // Channel (POS counter vs online store) + effective settlement status.
    const channelOf = (o: any) => (o.payment_method === 'SHOP' ? 'POS' : 'Online');
    const effectivePay = (o: any): 'PAID' | 'PARTIAL' | 'UNPAID' | 'VOID' => {
        // Cancelled / rejected sales are void — no payment is counted (paid 0).
        if (['CANCELLED', 'REJECTED'].includes((o.status || '').toUpperCase())) return 'VOID';
        const ps = (o.payment_status || 'PAID').toUpperCase();
        if (ps === 'PAID' || Number(o.remaining_amount ?? 0) <= 0) return 'PAID';
        return ps === 'PARTIAL' ? 'PARTIAL' : 'UNPAID';
    };

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
            setOrders(rawOrders);
        } catch { toast.error('Connection failure'); } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Auto-open order details modal if view parameter is present in URL
    useEffect(() => {
        if (typeof window === 'undefined' || orders.length === 0) return;
        const params = new URLSearchParams(window.location.search);
        const viewRef = params.get('view');
        if (viewRef) {
            const match = orders.find((o: any) => 
                String(o.order_number) === String(viewRef) || 
                String(o.id) === String(viewRef) || 
                String(o.tracking_id) === String(viewRef)
            );
            if (match) {
                router.replace(`/admin/sales/${match.id}`);
            }
        }
    }, [orders]);

    // AUTO-SYNC (30s) — was 2s.
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !updatingRow) loadOrders(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [loading, updatingRow, loadOrders]);

    // Reset pagination to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, channelFilter, payFilter]);

    const filtered = (orders || []).filter(o => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (o.order_number || '').toLowerCase().includes(q)
            || o.id.toString().includes(q)
            || ((o as any).customer_name || '').toLowerCase().includes(q)
            || ((o as any).customer_display_name || '').toLowerCase().includes(q)
            || ((o as any).phone_number || '').toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesChannel = channelFilter === 'All' || channelOf(o) === channelFilter;
        const matchesPay = payFilter === 'All' || effectivePay(o) === payFilter.toUpperCase();
        return matchesSearch && matchesStatus && matchesChannel && matchesPay;
    });

    // Sortable columns (customer, payment status, date, grand total).
    const sort = useSort(filtered, null, 'desc', (o: any, key: string) => {
        if (key === 'date') return o.updated_at || o.created_at;
        if (key === 'total') return Number(o.total_amount || 0);
        return o[key];
    });
    const paginated = sort.sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

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

    // A half-built cart is easy to lose to a stray backdrop click, so confirm first.
    const closeNewSale = () => {
        if (newSaleDirty && !window.confirm('Discard this sale? The lines on it will be lost.')) return;
        setNewSaleDirty(false);
        setNewSaleOpen(false);
    };

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="pb-20 text-left">
            <div className="max-w-[1440px] mx-auto">
                <PageHeader
                    title="Sales History"
                    backUrl="/admin/dashboard"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sales History' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={() => loadOrders()} disabled={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline">Refresh</span>
                            </Button>
                            <Button variant="primary" onClick={() => setNewSaleOpen(true)} className="whitespace-nowrap">
                                <Plus size={14} /> New Sale
                            </Button>
                        </>
                    }
                />

                <TableShell
                    className="mb-6 animate-in fade-in duration-500"
                    filters={
                    <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9C98]" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by order #, customer or phone…"
                                className="w-full h-11 pl-11 pr-9 rounded-xl border border-[#EDEDEA] bg-[#FAFAF8] text-[13px] font-medium text-[#1A1A1A] placeholder:text-[#9C9C98] outline-none focus:bg-white focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C9C98] hover:text-[#3A3A38] transition-colors">
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Status segmented control */}
                        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F2F2F0] shrink-0 self-start xl:self-auto">
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f)}
                                    className={`h-9 px-3.5 sm:px-4 rounded-lg text-[11.5px] font-semibold transition-all ${statusFilter === f ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A86] hover:text-[#3A3A38]'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Channel + Payment dropdowns */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative flex-1 xl:flex-none">
                                <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9C9C98]" />
                                <select
                                    value={channelFilter}
                                    onChange={e => setChannelFilter(e.target.value)}
                                    className={`w-full xl:w-auto h-11 pl-9 pr-8 rounded-xl border text-[13px] font-semibold outline-none focus:ring-4 focus:ring-[#F59E0B]/10 appearance-none cursor-pointer transition-all ${channelFilter !== 'All' ? 'border-transparent bg-[#F59E0B] text-white' : 'border-[#EDEDEA] bg-white text-[#3A3A38] hover:border-slate-300'}`}
                                >
                                    <option value="All">All Channels</option>
                                    <option value="POS">POS / Counter</option>
                                    <option value="Online">Online Store</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9C9C98]" />
                            </div>

                            <div className="relative flex-1 xl:flex-none">
                                <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9C9C98]" />
                                <select
                                    value={payFilter}
                                    onChange={e => setPayFilter(e.target.value)}
                                    className={`w-full xl:w-auto h-11 pl-9 pr-8 rounded-xl border text-[13px] font-semibold outline-none focus:ring-4 focus:ring-[#F59E0B]/10 appearance-none cursor-pointer transition-all ${payFilter !== 'All' ? 'border-transparent bg-[#F59E0B] text-white' : 'border-[#EDEDEA] bg-white text-[#3A3A38] hover:border-slate-300'}`}
                                >
                                    <option value="All">All Payments</option>
                                    <option value="Paid">Paid in full</option>
                                    <option value="Partial">Partially paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#9C9C98]" />
                            </div>
                        </div>
                    </div>

                    }
                    meta={
                        <span className="flex items-center gap-2">
                            <SlidersHorizontal size={12} className="text-[#B4B4B0]" />
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                            {orders.length ? <span className="text-[#B4B4B0]">of {orders.length}</span> : null}
                            {(searchTerm || statusFilter !== 'All' || channelFilter !== 'All' || payFilter !== 'All') && (
                                <button
                                    onClick={() => { setSearchTerm(''); setStatusFilter('All'); setChannelFilter('All'); setPayFilter('All'); }}
                                    className="ml-1 text-[13px] font-medium text-[#119AB8] hover:underline inline-flex items-center gap-1 transition-colors"
                                >
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </span>
                    }
                    footer={
                        <Pagination
                            page={currentPage}
                            totalPages={totalPages}
                            onPage={setCurrentPage}
                            total={filtered.length}
                            pageSize={itemsPerPage}
                            onPageSize={changePageSize}
                        />
                    }
                >

                {/* ── Mobile Card List (hidden on md+) ── */}
                <div className="md:hidden p-3 space-y-3">
                    {filtered.length === 0 ? (
                        <Card className="py-16 text-center">
                            <div className="text-[#DCDCD8] mb-3"><ShoppingBag size={48} className="mx-auto" /></div>
                            <p className="text-[13px] text-[#8A8A86] font-medium">No sales found.</p>
                        </Card>
                    ) : (
                        <>
                            {paginated.map(o => (
                                <Card key={o.id} className="p-4 space-y-3">
                                    {/* Row 1: Order # + Amount */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <button onClick={() => router.push(`/admin/sales/${o.id}`)} className="text-[13px] font-semibold text-[#119AB8] hover:text-[#0E7F98] hover:underline">
                                                #{o.order_number || o.id}
                                            </button>
                                            <div className="flex items-center gap-1 text-[10.5px] text-[#8A8A86] font-medium mt-0.5">
                                                <Clock size={10} />
                                                {formatDateTime(o.created_at)}
                                            </div>
                                            {(o as any).warehouse_name && (
                                                <div className="text-[10.5px] text-[#1A1A1A] font-semibold uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                                                    <Warehouse size={10} className="opacity-60" />{(o as any).warehouse_name}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[13px] font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(o.total_amount)}</div>
                                            <Badge tone={getStatusTone(o.status)} className="mt-1">
                                                {o.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Row 2: Customer + Payment */}
                                    <div className="flex items-center justify-between border-t border-[#F2F2F0] pt-2.5">
                                        <div className="flex items-center gap-2">
                                            <User size={13} className="text-[#9C9C98]" />
                                            <div>
                                                <div className="text-[11.5px] font-semibold text-[#1A1A1A]">{(o as any).customer_display_name || (o as any).customer_name || 'Counter Guest'}</div>
                                                {(o as any).customer_type === 'walkin'
                                                    ? <div className="text-[10.5px] text-[#9C9C98] italic">Walk-in · POS</div>
                                                    : <div className="text-[10.5px] text-emerald-600/80 font-semibold">Registered account</div>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-[11.5px] font-semibold text-[#1A1A1A] justify-end">
                                                <CreditCard size={11} className="text-[#9C9C98]" />
                                                {o.payment_method || 'Cash'}
                                                <span className={`px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold uppercase ${channelOf(o) === 'POS' ? 'bg-[#FAFAF8] text-[#5B5B58]' : 'bg-[#FAFAF8] text-[#5B5B58]'}`}>{channelOf(o)}</span>
                                            </div>
                                            {(() => {
                                                const ps = effectivePay(o);
                                                const cls = ps === 'PAID' ? 'text-emerald-600' : ps === 'PARTIAL' ? 'text-amber-600' : ps === 'UNPAID' ? 'text-rose-600' : 'text-[#9C9C98]';
                                                const label = ps === 'PAID' ? 'Paid in full' : ps === 'PARTIAL' ? 'Partially paid' : ps === 'UNPAID' ? 'Unpaid' : 'No payment';
                                                return <div className={`text-[10.5px] font-semibold uppercase tracking-tighter mt-0.5 ${cls}`}>{label}</div>;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Row 3: Actions */}
                                    <RowActions items={[
                                        { label: 'View', onClick: () => router.push(`/admin/sales/${o.id}`) },
                                        { label: 'Print', onClick: () => router.push(`/admin/sales/${o.id}/invoice`) },
                                        { label: 'Delete', onClick: () => setOrderToDelete(o as Order), danger: true },
                                    ]} />
                                </Card>
                            ))}
                        </>
                    )}
                </div>

                {/* ── Desktop Table (hidden on mobile) ── */}
                    <table className={ui.table}>
                        <thead>
                            <tr>
                                <SelectAllTh sel={sel} />
                                <th className={ui.th}>Order Details</th>
                                <SortableTh label="Customer" sortKey="customer_name" sort={sort} className="px-6 py-3" />
                                <SortableTh label="Payment" sortKey="payment_status" sort={sort} className="px-6 py-3" />
                                <SortableTh label="Modified" sortKey="date" sort={sort} className="px-6 py-3" />
                                <SortableTh label="Grand Total" sortKey="total" sort={sort} className="px-6 py-3 text-right" align="right" />
                                <th className={ui.th + ' text-right'}>Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="py-24 text-center">
                                    <div className="text-[#DCDCD8] mb-4"><ShoppingBag size={60} className="mx-auto" /></div>
                                    <p className="text-[13px] text-[#8A8A86] font-medium">No sales found matching your criteria.</p>
                                </td></tr>
                            ) : (
                                paginated.map(o => (
                                    <tr key={o.id} className="hover:bg-[#FAFAF8] transition-colors group text-[11.5px]">
                                        <RowCheckboxTd sel={sel} id={o.id} />
                                        <td className={ui.td}>
                                            <div className="text-[11.5px] font-semibold text-[#119AB8] group-hover:text-[#0E7F98] group-hover:underline cursor-pointer" onClick={() => router.push(`/admin/sales/${o.id}`)}>
                                                #{o.order_number || o.id}
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-[10.5px] text-[#8A8A86] flex items-center gap-1.5 font-medium">
                                                    <Clock size={11} className="text-[#9C9C98]" /> {formatDateTime(o.created_at)}
                                                </div>
                                                {(o as any).warehouse_name && (
                                                    <div className="text-[10.5px] text-[#1A1A1A] flex items-center gap-1.5 font-semibold uppercase tracking-tighter">
                                                        <Warehouse size={9} className="opacity-60" /> {(o as any).warehouse_name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={ui.td}>
                                            <div className="text-[#1A1A1A] font-semibold flex items-center gap-2">
                                                <User size={13} className="text-[#9C9C98]" /> {(o as any).customer_display_name || (o as any).customer_name || 'Counter Guest'}
                                            </div>
                                            {(o as any).customer_type === 'walkin'
                                                ? <div className="text-[10.5px] text-[#9C9C98] mt-1 font-medium italic">Walk-in · POS</div>
                                                : <div className="text-[10.5px] text-emerald-600/80 mt-1 font-semibold">Registered account</div>}
                                        </td>
                                        <td className={ui.td}>
                                            <div className="flex items-center gap-2 text-[#1A1A1A] font-semibold">
                                                <CreditCard size={13} className="text-[#9C9C98]" /> {o.payment_method || 'Cash'}
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-tight ${channelOf(o) === 'POS' ? 'bg-[#FAFAF8] text-[#5B5B58] border border-[#F2F2F0]' : 'bg-[#FAFAF8] text-[#5B5B58] border border-[#F2F2F0]'}`}>
                                                    {channelOf(o) === 'POS' ? <Store size={8} /> : <Globe size={8} />}{channelOf(o)}
                                                </span>
                                            </div>
                                            <PayStatusCell o={o} />
                                        </td>
                                        <td className={ui.td}>
                                            <div className="text-[11.5px] text-[#1A1A1A] font-semibold tabular-nums">
                                                {new Date(o.updated_at || o.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="text-[10.5px] text-[#9C9C98] font-semibold uppercase mt-0.5 tracking-tighter tabular-nums">
                                                {new Date(o.updated_at || o.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className={ui.td + ' text-right'}>
                                            <div className="text-[13px] font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(o.total_amount)}</div>

                                            <div className="text-[10.5px] text-[#9C9C98] font-semibold uppercase mt-1">Net Amount</div>
                                        </td>
                                        <td className={ui.td + ' text-right'}>
                                            <RowActions items={[
                                                Number((o as any).remaining_amount ?? 0) > 0
                                                    && !['DELIVERED', 'CANCELLED'].includes((o.status || '').toUpperCase())
                                                    && { label: 'Collect', onClick: () => setPayOrder(o) },
                                                { label: 'View', onClick: () => router.push(`/admin/sales/${o.id}`) },
                                                { label: 'Print', onClick: () => router.push(`/admin/sales/${o.id}/invoice`) },
                                                { label: 'Delete', onClick: () => setOrderToDelete(o as Order), danger: true },
                                            ]} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                </TableShell>

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
                <div className="mt-8 bg-[#F59E0B]/10 border border-[#F59E0B]/15 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertTriangle className="text-[#1A1A1A] shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A]">Order Integrity</p>
                        <p className="text-[11.5px] text-[#3A3A38] leading-relaxed">Status changes here are permanent and will trigger stock adjustments where applicable. Ensure you verify physical delivery before marking as 'Delivered'.</p>
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
                                <h3 className="text-[15px] font-semibold text-[#1A1A1A] leading-snug">Permanently delete this order?</h3>
                                <p className="text-[11.5px] text-[#3A3A38] mt-2 leading-relaxed">
                                    You are about to delete Sale <strong>#{(orderToDelete as any).order_number || orderToDelete.id}</strong>. This action is irreversible and will remove the record entirely.
                                </p>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Collect-balance modal for credit / partial sales */}
                {payOrder && (
                    <PaymentModal
                        open={!!payOrder}
                        onClose={() => setPayOrder(null)}
                        title={`Payments · Sale #${payOrder.order_number || payOrder.id}`}
                        sourceType="order"
                        sourceId={payOrder.id}
                        total={Number(payOrder.total_amount || 0)}
                        direction="inbound"
                        dueDate={payOrder.due_date || ''}
                        onDueDateChange={async (d) => { try { await orderService.setDueDate(String(payOrder.id), d); } catch { } }}
                        onChanged={() => loadOrders(true)}
                    />
                )}

                {/* New Sale — the full POS workspace, hosted in a popup so the
                    operator never leaves the sales registry. */}
                <Modal
                    open={newSaleOpen}
                    onClose={closeNewSale}
                    title="New Sale"
                    size="full"
                    panelClassName="h-[94vh] max-h-[94vh]"
                    bodyClassName="p-3 sm:p-4"
                >
                    <SaleEntry
                        embedded
                        onClose={closeNewSale}
                        onDirtyChange={setNewSaleDirty}
                        onSaved={() => loadOrders(true)}
                    />
                </Modal>

            </div>
        </div>
    );
}
