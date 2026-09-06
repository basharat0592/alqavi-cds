'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    RotateCcw, Plus, Search, RefreshCw,
    AlertTriangle,
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, TableShell, Pagination } from '@/components/admin/ui';
import { PaymentModal } from '@/components/admin/PaymentPanel';

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
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const changePageSize = (n: number) => { setPageSize(n); setCurrentPage(1); };

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [payRow, setPayRow] = useState<any | null>(null);
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

    const filtered = returns.filter(r => {
        const matchesSearch = (r.return_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (r.supplier_name?.toLowerCase() || '').includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (statusFilter === 'ALL') return true;
        const s = (r.status || '').toUpperCase();
        if (statusFilter === 'PENDING') return s === 'PENDING' || s === 'WAITING_FOR_SUPPLIER';
        return s === statusFilter;
    });

    useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const sel = useTableSelection(paginated);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => purchaseService.deleteReturn(id)));
        toast.success(`${ids.length} return(s) deleted`);
        load(true);
    };

    const bulkAccept = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => purchaseService.acceptReturn(id)));
        toast.success(`Accepted ${ids.length} return(s)`);
        load(true);
    };

    const bulkReject = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => purchaseService.rejectReturn(id)));
        toast.success(`Rejected ${ids.length} return(s)`);
        load(true);
    };

    return (
        <div className="pb-20">
            <div className="max-w-[1250px] mx-auto px-0 sm:px-6 pt-1 sm:pt-5">

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

                <TableShell
                    className="mb-6"
                    filters={
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C98]" size={14} />
                        <input
                            className={ui.inputBase + " pl-9"}
                            placeholder="Search by Return # or Supplier..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className={ui.inputBase + ' w-full sm:w-[190px] cursor-pointer'}
                    >
                        <option value="ALL">All statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <div className="h-5 w-px bg-slate-200 hidden sm:block" />
                    <span className="text-[13px] text-[#3A3A38] text-center sm:text-left">
                        Showing {filtered.length} record{filtered.length === 1 ? '' : 's'}
                    </span>
                    </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className={ui.table}>
                            <thead>
                                <tr>
                                    <SelectAllTh sel={sel} />
                                    <th className={ui.th + ' whitespace-nowrap'}>Return #</th>
                                    <th className={ui.th}>Details</th>
                                    <th className={ui.th + ' whitespace-nowrap'}>Date</th>
                                    <th className={ui.th + ' whitespace-nowrap'}>Refund Amount</th>
                                    <th className={ui.th + ' whitespace-nowrap'}>Status</th>
                                    <th className={ui.th + ' text-right whitespace-nowrap'}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && filtered.length === 0 ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse border-b border-[#F2F2F0]">
                                            <td colSpan={7} className="px-2.5 sm:px-4 py-4 h-14 bg-[#FAFAF8]/50" />
                                        </tr>
                                    ))
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-2.5 sm:px-4 py-20 text-center">
                                            <div className="flex flex-col items-center text-[#9C9C98]">
                                                <RotateCcw size={40} className="mb-2 text-[#C4C4C0]" />
                                                <p className="text-[13px]">No return records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map(row => (
                                        <tr key={row.id} className="border-b border-[#F2F2F0] hover:bg-[#FAFAF8] transition-all group">
                                            <RowCheckboxTd sel={sel} id={row.id} />
                                            <td className={ui.td + ' whitespace-nowrap'}>
                                                <span className="text-[13px] font-semibold text-[#119AB8] group-hover:text-[#0E7F98] hover:underline cursor-pointer">
                                                    #{row.return_number}
                                                </span>
                                            </td>
                                            <td className={ui.td}>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{row.supplier_name || 'Generic Supplier'}</span>
                                                    <span className="text-[11.5px] text-[#9C9C98] italic hidden sm:inline">Ref: {row.purchase_number || 'Standalone'}</span>
                                                </div>
                                            </td>
                                            <td className={ui.td + ' whitespace-nowrap'}>
                                                <span className="text-[13px] text-[#3A3A38]">{row.return_date}</span>
                                            </td>
                                            <td className={ui.td + ' whitespace-nowrap'}>
                                                <span className="text-[13px] font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(row.total_refund_amount || 0)}</span>
                                            </td>
                                            <td className={ui.td + ' whitespace-nowrap'}>
                                                <StatusPill status={row.status} />
                                                {row.status?.toUpperCase() === 'ACCEPTED' && (
                                                    <div className={`text-[10.5px] font-semibold uppercase tracking-tighter mt-1 ${row.refund_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {row.refund_status === 'PAID' ? 'Refund received' : 'Awaiting refund'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className={ui.td + ' text-right whitespace-nowrap'}>
                                                <div className="flex items-center justify-end gap-2.5">
                                                    {row.status?.toUpperCase() === 'ACCEPTED' && row.refund_status !== 'PAID' && Number(row.total_refund_amount || 0) > 0 && (
                                                        <>
                                                            <button
                                                                onClick={() => setPayRow(row)}
                                                                className="text-[11.5px] font-semibold text-[#119AB8] hover:underline"
                                                            >
                                                                Settle
                                                            </button>
                                                            <span className="text-[#C4C4C0]">|</span>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => setViewRow(row)}
                                                        className="text-[11.5px] font-semibold text-[#3A3A38] hover:underline"
                                                    >
                                                        View
                                                    </button>
                                                    <span className="text-[#C4C4C0]">|</span>
                                                    <button
                                                        onClick={() => setDeleteRow(row)}
                                                        className="text-[11.5px] font-semibold text-[#c40000] hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Paging + rows-per-page, from the shared control. */}
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        onPage={setCurrentPage}
                        total={filtered.length}
                        pageSize={pageSize}
                        onPageSize={changePageSize}
                    />
                </TableShell>
            </div>

            <BulkBar
                sel={sel}
                entity="purchase returns"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Accept', apply: bulkAccept },
                    { label: 'Reject', apply: bulkReject },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((r: any) => ({
                        return_number: r.return_number,
                        supplier: r.supplier_name || '',
                        purchase_number: r.purchase_number || '',
                        return_date: r.return_date || '',
                        status: r.status || '',
                        total_refund_amount: r.total_refund_amount ?? 0,
                    })),
                    'purchase-returns.csv',
                )}
            />

            {/* Refund settlement modal — records the refund received from the supplier */}
            {payRow && (
                <PaymentModal
                    open={!!payRow}
                    onClose={() => setPayRow(null)}
                    title={`Refund · Return #${payRow.return_number}`}
                    sourceType="purchasereturn"
                    sourceId={payRow.id}
                    total={Number(payRow.total_refund_amount || 0)}
                    direction="inbound"
                    onChanged={() => load(true)}
                />
            )}

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
                            <div><p className="text-[#9C9C98] mb-1">Return #</p><p className="font-semibold text-[#1A1A1A]">#{viewRow.return_number}</p></div>
                            <div><p className="text-[#9C9C98] mb-1">Date</p><p className="font-semibold text-[#1A1A1A]">{viewRow.return_date}</p></div>
                            <div><p className="text-[#9C9C98] mb-1">Supplier</p><p className="font-semibold text-[#1A1A1A]">{viewRow.supplier_name}</p></div>
                            <div><p className="text-[#9C9C98] mb-1">Status</p><StatusPill status={viewRow.status} /></div>
                        </div>

                        {/* Products Table */}
                        <div className="border border-[#EDEDEA] rounded-xl overflow-hidden">
                            <table className={ui.table}>
                                <thead className="bg-[#FAFAF8] border-b border-[#EDEDEA]">
                                    <tr>
                                        <th className={ui.th}>Product</th>
                                        <th className={ui.th + ' text-center'}>Qty</th>
                                        <th className={ui.th + ' text-right'}>Price</th>
                                        <th className={ui.th + ' text-right'}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewRow.items || []).map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-[#F2F2F0] last:border-0">
                                            <td className={ui.td}>{item.product_name}</td>
                                            <td className={ui.td + ' text-center tabular-nums'}>{item.quantity}</td>
                                            <td className={ui.td + ' text-right tabular-nums'}>{formatCurrency(item.refund_price)}</td>
                                            <td className={ui.td + ' text-right tabular-nums'}>{formatCurrency(item.total_refund)}</td>
                                        </tr>
                                    ))}
                                    {(!viewRow.items || viewRow.items.length === 0) && (
                                        <tr><td colSpan={4} className="px-3 py-8 text-center text-[#9C9C98] italic">No products found for this return</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {viewRow.reason && (
                            <div className="p-3 bg-[#FAFAF8] border border-[#EDEDEA] rounded-lg">
                                <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1 text-[#9C9C98]">Reason</p>
                                <p className="text-[13px] italic text-[#3A3A38]">"{viewRow.reason}"</p>
                            </div>
                        )}
                        <div className="pt-4 border-t border-[#F2F2F0] flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#1A1A1A]">Total Refund Amount:</span>
                            <span className="text-[22px] font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(viewRow.total_refund_amount || 0)}</span>
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
                        <h3 className="text-[16px] font-semibold text-[#1A1A1A] mb-2">Delete Return?</h3>
                        <p className="text-[13px] text-[#3A3A38] mb-6">
                            Are you sure you want to delete <span className="font-semibold text-[#1A1A1A]">#{deleteRow.return_number}</span>? This action cannot be undone.
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
