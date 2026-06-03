'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    RotateCcw, Plus, Search, RefreshCw, Trash2, Eye,
    AlertTriangle,
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   PURCHASE RETURNS LIST
   ───────────────────────────────────────────────────────────────────────────── */
type BadgeTone = 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue';

const statusTone: Record<string, BadgeTone> = {
    pending: 'amber',
    waiting_for_supplier: 'amber',
    accepted: 'green',
    completed: 'green',
    rejected: 'red',
    cancelled: 'red',
};

const StatusPill = ({ status }: { status: string }) => {
    const formatted = (status || '').replace('_', ' ');
    const s = (status || '').toLowerCase();
    const tone = statusTone[s] || 'neutral';
    return (
        <>
            <span className={`inline-block sm:hidden w-2.5 h-2.5 rounded-full ${
                ['accepted', 'completed'].includes(s) ? 'bg-emerald-600' :
                ['pending', 'waiting_for_supplier'].includes(s) ? 'bg-amber-500' :
                tone === 'red' ? 'bg-rose-600' : 'bg-slate-400'
            }`} title={formatted} />
            <span className="hidden sm:inline-flex">
                <Badge tone={tone} className="capitalize normal-case tracking-normal">{formatted}</Badge>
            </span>
        </>
    );
};

export default function PurchaseReturnsPage() {
    const router = useRouter();
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const r = await purchaseService.getReturns();
            setReturns(Array.isArray(r) ? r : r?.results || []);
        } catch {
            toast.error('Failed to load returns');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        router.push('/admin/purchases/returns/add');
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.deleteReturn(deleteRow.id);
            toast.success('Return record deleted');
            setDeleteRow(null);
            load(true);
        } catch {
            toast.error('Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    const filtered = returns.filter(r =>
        (r.return_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (r.supplier_name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    return (
        <div className="pb-20">
            <div className="max-w-[1250px] mx-auto px-3 sm:px-6 pt-4 sm:pt-5">

                {/* Header */}
                <PageHeader
                    title="Purchase Returns"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Purchases', href: '/admin/purchases' },
                        { label: 'Purchase Returns' },
                    ]}
                    actions={
                        <>
                            <Button variant="outline" size="md" onClick={() => load()}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button variant="primary" size="md" onClick={openAdd}>
                                <Plus size={14} /> New Return
                            </Button>
                        </>
                    }
                />

                {/* Filters & Search */}
                <Card className="p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            className={ui.inputBase + " pl-9"}
                            placeholder="Search by Return # or Supplier..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="h-5 w-px bg-slate-200 hidden sm:block" />
                    <span className="text-[13px] text-slate-600 text-center sm:text-left">
                        Showing {filtered.length} records
                    </span>
                </Card>

                {/* Main Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200">
                                    <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[11px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Return #</th>
                                    <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[11px] font-bold uppercase text-slate-400 tracking-wider">Details</th>
                                    <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[11px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Date</th>
                                    <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[11px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Refund Amount</th>
                                    <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[11px] font-bold uppercase text-slate-400 tracking-wider whitespace-nowrap">Status</th>
                                    <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[11px] font-bold uppercase text-slate-400 tracking-wider text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && filtered.length === 0 ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse border-b border-slate-100">
                                            <td colSpan={6} className="px-2.5 sm:px-4 py-4 h-14 bg-slate-50/50" />
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-2.5 sm:px-4 py-20 text-center">
                                            <div className="flex flex-col items-center text-slate-400">
                                                <RotateCcw size={40} className="mb-2 text-slate-300" />
                                                <p className="text-[14px]">No return records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(row => (
                                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all group">
                                            <td className="px-2.5 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                                <span className="text-[13px] font-bold text-indigo-600 group-hover:text-indigo-700 hover:underline cursor-pointer">
                                                    #{row.return_number}
                                                </span>
                                            </td>
                                            <td className="px-2.5 sm:px-4 py-3 sm:py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-900">{row.supplier_name || 'Generic Supplier'}</span>
                                                    <span className="text-[11px] text-slate-400 italic hidden sm:inline">Ref: {row.purchase_number || 'Standalone'}</span>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                                <span className="text-[13px] text-slate-600">{row.return_date}</span>
                                            </td>
                                            <td className="px-2.5 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                                <span className="text-[14px] font-bold text-slate-900 tabular-nums">{formatCurrency(row.total_refund_amount || 0)}</span>
                                            </td>
                                            <td className="px-2.5 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                                                <StatusPill status={row.status} />
                                            </td>
                                            <td className="px-2.5 sm:px-4 py-3 sm:py-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1.5 text-[13px]">
                                                    <button
                                                        onClick={() => setViewRow(row)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-all shrink-0 sm:border-0 sm:p-0 sm:hover:bg-transparent sm:hover:underline font-semibold"
                                                        title="View"
                                                    >
                                                        <span className="hidden sm:inline">View</span>
                                                        <Eye size={14} className="sm:hidden" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteRow(row)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all shrink-0 sm:border-0 sm:p-0 sm:hover:bg-transparent sm:hover:underline font-semibold"
                                                        title="Delete"
                                                    >
                                                        <span className="hidden sm:inline">Delete</span>
                                                        <Trash2 size={14} className="sm:hidden" />
                                                    </button>
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

            {/* View Modal */}
            <Modal
                open={!!viewRow}
                onClose={() => setViewRow(null)}
                title="Return Record Details"
                size="lg"
                footer={<Button variant="outline" size="md" onClick={() => setViewRow(null)}>Close</Button>}
            >
                {viewRow && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-[13px]">
                            <div><p className="text-slate-400 mb-1">Return #</p><p className="font-bold text-slate-900">#{viewRow.return_number}</p></div>
                            <div><p className="text-slate-400 mb-1">Date</p><p className="font-bold text-slate-900">{viewRow.return_date}</p></div>
                            <div><p className="text-slate-400 mb-1">Supplier</p><p className="font-bold text-slate-900">{viewRow.supplier_name}</p></div>
                            <div><p className="text-slate-400 mb-1">Status</p><StatusPill status={viewRow.status} /></div>
                        </div>

                        {/* Products Table */}
                        <div className="border border-slate-200/70 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-[12px]">
                                <thead className="bg-slate-50/60 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Product</th>
                                        <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">Qty</th>
                                        <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Price</th>
                                        <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewRow.items || []).map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-slate-100 last:border-0">
                                            <td className="px-3 py-2 font-medium text-slate-700">{item.product_name}</td>
                                            <td className="px-3 py-2 text-center text-slate-600 tabular-nums">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right text-slate-600 tabular-nums">{formatCurrency(item.refund_price)}</td>
                                            <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(item.total_refund)}</td>
                                        </tr>
                                    ))}
                                    {(!viewRow.items || viewRow.items.length === 0) && (
                                        <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400 italic">No products found for this return</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {viewRow.reason && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-[11px] font-bold uppercase tracking-wider mb-1 text-slate-400">Reason</p>
                                <p className="text-[13px] italic text-slate-600">"{viewRow.reason}"</p>
                            </div>
                        )}
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[13px] font-bold text-slate-900">Total Refund Amount:</span>
                            <span className="text-[22px] font-bold text-slate-900 tabular-nums">{formatCurrency(viewRow.total_refund_amount || 0)}</span>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Modal */}
            <Modal
                open={!!deleteRow}
                onClose={() => setDeleteRow(null)}
                size="sm"
            >
                {deleteRow && (
                    <div className="text-center">
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} className="text-rose-600" />
                        </div>
                        <h3 className="text-[16px] font-bold text-slate-900 mb-2">Delete Return?</h3>
                        <p className="text-[13px] text-slate-600 mb-6">
                            Are you sure you want to delete <span className="font-bold text-slate-900">#{deleteRow.return_number}</span>? This action cannot be undone.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" size="md" onClick={() => setDeleteRow(null)}>Cancel</Button>
                            <Button variant="danger" size="md" onClick={handleDelete} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete Forever'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
