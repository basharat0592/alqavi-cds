"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Search, Plus, Printer, Eye,
    RefreshCw, ShoppingCart, RotateCcw,
    ShoppingBag, User, Calendar,
    CheckCircle2, Clock, ArrowUpRight,
    Package, TrendingUp, AlertCircle
} from 'lucide-react';
import { orderService, purchaseService, salesService } from '@/lib/api';
import { formatCurrency, formatDateTime, exportToCSV } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, type TableSelection } from '@/components/admin/ui';

type BadgeTone = 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue';

/* ── STATUS BADGE ── */
const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; tone: BadgeTone }> = {
        delivered: { label: 'Paid', tone: 'green' },
        processing: { label: 'Processing', tone: 'blue' },
        pending: { label: 'Pending', tone: 'amber' },
        cancelled: { label: 'Cancelled', tone: 'red' },
        paid: { label: 'Paid', tone: 'green' },
        unpaid: { label: 'Unpaid', tone: 'red' },
        partial: { label: 'Partial', tone: 'amber' },
        returned: { label: 'Returned', tone: 'indigo' },
    };
    const s = map[status?.toLowerCase()] || { label: status || '—', tone: 'neutral' as BadgeTone };
    return <Badge tone={s.tone}>{s.label}</Badge>;
};

/* ── STAT CARD ── */
const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <Card className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon size={16} />
        </div>
        <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-[17px] font-bold text-slate-900 leading-tight">{value}</p>
        </div>
    </Card>
);

/* ── INVOICE TABLE ── */
const InvoiceTable = ({ rows, onView, onPrint, onDelete, type, sel }: { rows: any[]; onView: (id: any) => void; onPrint: (id: any) => void; onDelete: (inv: any) => void; type: string; sel: TableSelection }) => {
    if (rows.length === 0) return (
        <div className="py-16 text-center text-[13px] text-slate-400">No {type} invoices found.</div>
    );
    return (
        <table className="w-full text-left text-[13px]">
            <thead>
                <tr className="bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <SelectAllTh sel={sel} />
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">{type === 'purchase' ? 'Supplier' : 'Customer'}</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors group">
                        <RowCheckboxTd sel={sel} id={inv.id} />
                        <td className="px-5 py-3.5">
                            <span
                                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                                onClick={() => onView(inv.id)}
                            >
                                #{inv.order_number || inv.invoice_number || inv.id?.toString().slice(0, 8)}
                            </span>
                        </td>
                        <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-800">
                                {inv.customer_name || inv.supplier_name || inv.guest_name || 'Walk-in'}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{inv.payment_method || '—'}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                            <div className="flex items-center gap-1.5 text-[12px]">
                                <Calendar size={11} className="opacity-40" />
                                {formatDateTime(inv.created_at || inv.date)}
                            </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(inv.total_amount || inv.total || 0)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                            <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                                <button
                                    onClick={() => onPrint(inv.id)}
                                    className="text-[12px] font-bold text-slate-600 hover:underline"
                                >
                                    Print
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    onClick={() => onDelete(inv)}
                                    className="text-[12px] font-bold text-[#c40000] hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

/* ── MAIN PAGE ── */
export default function InvoicesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'sale' | 'purchase' | 'sale-return' | 'purchase-return'>('sale');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [saleInvoices, setSaleInvoices] = useState<any[]>([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
    const [saleReturns, setSaleReturns] = useState<any[]>([]);
    const [purchaseReturns, setPurchaseReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const PAGE_SIZE = 10;

    const loadAll = async () => {
        setLoading(true);
        try {
            const [sales, purchases, saleRets, purchaseRets] = await Promise.all([
                orderService.getAll({ no_pagination: 'true' }).catch(() => []),
                purchaseService.getAll({ no_pagination: 'true' }).catch(() => []),
                salesService.getReturns({ no_pagination: 'true' }).catch(() => []),
                purchaseService.getReturns({ no_pagination: 'true' }).catch(() => []),
            ]);
            setSaleInvoices(Array.isArray(sales) ? sales : (sales as any)?.results || []);
            setPurchaseInvoices(Array.isArray(purchases) ? purchases : (purchases as any)?.results || []);
            setSaleReturns(Array.isArray(saleRets) ? saleRets : (saleRets as any)?.results || []);
            setPurchaseReturns(Array.isArray(purchaseRets) ? purchaseRets : (purchaseRets as any)?.results || []);
        } catch { toast.error('Failed to load invoices'); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget.id;
        setDeleting(true);
        try {
            if (activeTab === 'sale') { await orderService.delete(id); setSaleInvoices(p => p.filter(x => x.id !== id)); }
            else if (activeTab === 'purchase') { await purchaseService.delete(id); setPurchaseInvoices(p => p.filter(x => x.id !== id)); }
            else if (activeTab === 'sale-return') { await salesService.deleteReturn(id); setSaleReturns(p => p.filter(x => x.id !== id)); }
            else { await purchaseService.deleteReturn(id); setPurchaseReturns(p => p.filter(x => x.id !== id)); }
            toast.success('Invoice deleted');
            setDeleteTarget(null);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.response?.data?.detail || 'Delete failed');
        } finally { setDeleting(false); }
    };

    useEffect(() => { loadAll(); }, []);

    const tabs = [
        { id: 'sale', label: 'Sales Invoices', icon: ShoppingBag, href: null, count: saleInvoices.length, color: 'text-blue-600 bg-blue-50 border-blue-200' },
        { id: 'purchase', label: 'Purchase Invoices', icon: ShoppingCart, href: null, count: purchaseInvoices.length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        { id: 'sale-return', label: 'Sale Returns', icon: RotateCcw, href: null, count: saleReturns.length, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
        { id: 'purchase-return', label: 'Purchase Returns', icon: RefreshCw, href: null, count: purchaseReturns.length, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    ] as const;

    const activeData = {
        sale: saleInvoices,
        purchase: purchaseInvoices,
        'sale-return': saleReturns,
        'purchase-return': purchaseReturns,
    }[activeTab];

    const filtered = (activeData || []).filter(inv => {
        const q = search.toLowerCase();
        const matchSearch =
            (inv.order_number || inv.invoice_number || inv.id || '').toString().toLowerCase().includes(q) ||
            (inv.customer_name || inv.supplier_name || inv.guest_name || '').toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || inv.status?.toLowerCase() === filterStatus;
        return matchSearch && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const sel = useTableSelection(paginated);

    const bulkDelete = async (ids: string[]) => {
        const deleteOne = (id: any) => {
            if (activeTab === 'sale') return orderService.delete(id);
            if (activeTab === 'purchase') return purchaseService.delete(id);
            if (activeTab === 'sale-return') return salesService.deleteReturn(id);
            return purchaseService.deleteReturn(id);
        };
        await Promise.allSettled(ids.map((id) => deleteOne(id)));
        toast.success(`${ids.length} invoice(s) deleted`);
        loadAll();
    };

    const totalValue = saleInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
        + purchaseInvoices.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0);

    const tabButtons = [
        { id: 'sale' as const, label: 'Sale Invoice', icon: ShoppingBag, count: saleInvoices.length, active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50', badge: 'bg-slate-400' },
        { id: 'purchase' as const, label: 'Purchase Invoice', icon: ShoppingCart, count: purchaseInvoices.length, active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50', badge: 'bg-slate-400' },
        { id: 'sale-return' as const, label: 'Sale Return Invoice', icon: RotateCcw, count: saleReturns.length, active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50', badge: 'bg-slate-400' },
        { id: 'purchase-return' as const, label: 'Purchase Return Invoice', icon: RefreshCw, count: purchaseReturns.length, active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50', badge: 'bg-slate-400' },
    ];

    return (
        <div className="pb-20">
            <div className="max-w-[1300px] mx-auto">

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    title="Invoices"
                    subtitle="Manage sales, purchase, and return invoices in one place."
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Invoices' }]}
                    actions={
                        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                    }
                />

                {/* ── TAB SWITCHER BUTTONS ── */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {tabButtons.map(tb => {
                        const Icon = tb.icon;
                        const isActive = activeTab === tb.id;
                        return (
                            <button
                                key={tb.id}
                                onClick={() => { setActiveTab(tb.id); setSearch(''); setFilterStatus('all'); setPage(1); }}
                                className={`flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] font-semibold border transition-all ${isActive ? tb.active : tb.inactive
                                    }`}
                            >
                                <Icon size={14} />
                                {tb.label}
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : `${tb.badge} text-white`
                                    }`}>{tb.count}</span>
                            </button>
                        );
                    })}
                </div>


                {/* ── TABS ── */}
                <Card className="overflow-hidden">


                    {/* Search + Status Filter */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by invoice # or name..."
                                className={`${ui.inputBase} h-9 pl-9`}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            {['all', 'delivered', 'processing', 'pending', 'cancelled'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setFilterStatus(s); setPage(1); }}
                                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${filterStatus === s
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {s === 'delivered' ? 'Paid' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Body */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="py-20 flex items-center justify-center gap-2 text-slate-400 text-[13px]">
                                <RefreshCw size={16} className="animate-spin" /> Loading invoices...
                            </div>
                        ) : (
                            <InvoiceTable
                                sel={sel}
                                rows={paginated}
                                type={activeTab.includes('purchase') ? 'purchase' : 'sale'}
                                onView={(id) => {
                                    if (activeTab === 'sale') router.push(`/admin/sales/${id}/invoice`);
                                    else if (activeTab === 'purchase') router.push(`/admin/purchases/${id}`);
                                    else if (activeTab === 'sale-return') router.push(`/admin/sale-returns`);
                                    else router.push(`/admin/purchases/returns`);
                                }}
                                onPrint={(id) => {
                                    if (activeTab === 'sale') router.push(`/admin/sales/${id}/invoice`);
                                    else if (activeTab === 'purchase') router.push(`/admin/purchases/${id}/invoice`);
                                    else if (activeTab === 'sale-return') router.push(`/admin/sale-returns`);
                                    else router.push(`/admin/purchases/returns`);
                                }}
                                onDelete={(inv) => setDeleteTarget(inv)}
                            />
                        )}
                    </div>

                    {/* Pagination Footer */}
                    {!loading && filtered.length > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                            <span className="text-[12px] text-slate-400">
                                Showing <span className="font-semibold text-slate-700 tabular-nums">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-slate-700 tabular-nums">{filtered.length}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    ← Previous
                                </button>
                                <span className="text-[12px] text-slate-500 font-medium px-1">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </Card>

                <BulkBar
                    sel={sel}
                    entity="invoices"
                    onDelete={bulkDelete}
                    onExport={() => exportToCSV(
                        sel.selectedItems.map((inv: any) => ({
                            invoice: inv.order_number || inv.invoice_number || inv.id,
                            party: inv.customer_name || inv.supplier_name || inv.guest_name || 'Walk-in',
                            payment_method: inv.payment_method || '',
                            date: formatDateTime(inv.created_at || inv.date),
                            amount: inv.total_amount || inv.total || 0,
                            status: inv.status || '',
                        })),
                        `${activeTab}_invoices.csv`,
                    )}
                />

                <Modal
                    open={!!deleteTarget}
                    onClose={() => !deleting && setDeleteTarget(null)}
                    title="Delete Invoice"
                    size="sm"
                    footer={
                        <>
                            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
                        </>
                    }
                >
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                        Are you sure you want to delete invoice <span className="font-bold text-slate-900">#{deleteTarget?.order_number || deleteTarget?.invoice_number || deleteTarget?.id}</span>? This action cannot be undone.
                    </p>
                </Modal>

                {/* ── QUICK LINKS GRID (bottom shortcuts) ── */}
                <div className="mt-8">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">More Invoice Actions</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { label: 'Sales History', desc: 'View all completed sales', href: '/admin/sales', icon: TrendingUp },
                            { label: 'Purchase History', desc: 'View all purchase records', href: '/admin/purchases', icon: Package },
                            { label: 'Sale Returns', desc: 'Manage customer returns', href: '/admin/sale-returns', icon: RotateCcw },
                            { label: 'Purchase Returns', desc: 'Manage supplier returns', href: '/admin/purchases/returns', icon: RefreshCw },
                            { label: 'Order Tracking', desc: 'Track delivery status', href: '/admin/tracking', icon: ShoppingBag },
                        ].map(l => {
                            const Icon = l.icon;
                            return (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className="flex items-center gap-3.5 px-4 py-3.5 bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-indigo-200 hover:shadow-sm transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                        <Icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{l.label}</div>
                                        <div className="text-[11px] text-slate-400">{l.desc}</div>
                                    </div>
                                    <ArrowUpRight size={13} className="text-slate-300 group-hover:text-indigo-500 ml-auto shrink-0 transition-colors" />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
