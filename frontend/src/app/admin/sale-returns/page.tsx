'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Package, Search,
    RefreshCw, AlertTriangle, XCircle,
    User, Clock, Loader2, CheckCircle2, Trash2, Plus
} from 'lucide-react';
import { formatDateTime, exportToCSV, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { PaymentModal } from '@/components/admin/PaymentPanel';

const STATUS_FILTERS = ['All', 'Pending', 'Accepted', 'Rejected'];

const refundTotal = (r: any) =>
    Number(r.refund_total ?? r.refund_amount ?? 0) ||
    (r.items?.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) || 0);

// ── Status badge tone ──────────────────────────────────────────────────────────
const getStatusTone = (status: string): 'amber' | 'green' | 'red' | 'neutral' => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'amber';
    if (s === 'accepted' || s === 'authorized') return 'green';
    if (s === 'rejected') return 'red';
    return 'neutral';
};

// ── Return Detail Modal ───────────────────────────────────────────────────────
function ReturnDetailModal({ returnData, onClose, onUpdate }: { returnData: any; onClose: () => void; onUpdate: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleAction = async (status: string) => {
        setLoading(true);
        try {
            await api.patch(`v1/sales/returns/${returnData.id}/`, { status: status.toUpperCase() });
            toast.success(`Return request ${status.toLowerCase()} successfully`);
            onUpdate();
            onClose();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to update return");
        } finally {
            setLoading(false);
        }
    };
    return (
        <Modal
            open
            onClose={onClose}
            title={`Return Sequence #${returnData.return_number}`}
            size="lg"
            footer={
                <div className="flex w-full items-center justify-between">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Dismiss</Button>
                    {returnData.status.toUpperCase() === 'PENDING' && (
                        <div className="flex gap-2">
                            <Button variant="danger" onClick={() => handleAction('REJECTED')} disabled={loading}>
                                <XCircle size={14} /> Reject Request
                            </Button>
                            <Button variant="primary" onClick={() => handleAction('ACCEPTED')} disabled={loading}>
                                <CheckCircle2 size={14} /> Accept & Restock
                            </Button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* Meta grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-slate-100">
                    {[
                        { label: 'Source Order', value: <span className="text-[#B4780B] font-bold">{returnData.order_tracking_id}</span> },
                        { label: 'Client Name', value: returnData.customer_name },
                        { label: 'Lifecycle', value: <Badge tone={getStatusTone(returnData.status)}>{returnData.status}</Badge> },
                        { label: 'Submission', value: formatDateTime(returnData.created_at) },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                            <div className="text-[13px] font-bold text-slate-900">{value}</div>
                        </div>
                    ))}
                </div>

                <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl flex gap-4">
                    <AlertTriangle className="text-amber-600 shrink-0" size={18} />
                    <div>
                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-1">Return Reason Statement</p>
                        <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">"{returnData.reason}"</p>
                    </div>
                </div>

                {/* Items */}
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Requested Items for Return</p>
                    <div className="border border-slate-200/70 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-100">
                                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Details</th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Quantity</th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Refund Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnData.items.map((item: any) => (
                                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-[#B4780B]">{item.product_name}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-900 tabular-nums">{item.quantity} units</td>
                                        <td className="px-4 py-4 text-right font-bold text-rose-600 tabular-nums">Rs. {(item.price * item.quantity).toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="border-t border-slate-100 bg-slate-50/60 font-bold">
                                    <td colSpan={2} className="px-4 py-3 text-right text-slate-400 uppercase text-[10px] tracking-wider">Total Refund Amount</td>
                                    <td className="px-4 py-3 text-right text-[16px] text-rose-600 tabular-nums">
                                        Rs. {(returnData.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaleReturnsPage() {
    const router = useRouter();
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedReturn, setSelectedReturn] = useState<any>(null);
    const [returnToDelete, setReturnToDelete] = useState<any>(null);
    const [payReturn, setPayReturn] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const loadReturns = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await api.get('v1/sales/returns/');
            setReturns(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            toast.error("Failed to load return requests");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async () => {
        if (!returnToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`v1/sales/returns/${returnToDelete.id}/`);
            toast.success("Return record deleted successfully");
            setReturnToDelete(null);
            loadReturns();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to delete return record");
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        loadReturns();
    }, [loadReturns]);

    // AUTO-SYNC (5s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !selectedReturn && !returnToDelete) loadReturns(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [loading, selectedReturn, returnToDelete, loadReturns]);

    const filtered = (returns || []).filter(r => {
        const matchesSearch =
            (r.return_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.order_tracking_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || (r.status || '').toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => api.delete(`v1/sales/returns/${id}/`)));
        toast.success(`${ids.length} return record(s) deleted`);
        loadReturns();
    };

    const bulkStatus = async (ids: string[], status: string) => {
        await Promise.allSettled(ids.map(id => api.patch(`v1/sales/returns/${id}/`, { status })));
        toast.success(`${ids.length} return(s) ${status.toLowerCase()}`);
        loadReturns();
    };

    if (loading && returns.length === 0) return <PageLoader />;

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto text-left">
                <PageHeader
                    title="Customer Return Requests"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sale Returns' }]}
                    actions={
                        <>
                            <Button variant="secondary" onClick={() => loadReturns()} disabled={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button variant="primary" onClick={() => router.push('/admin/sale-returns/add')} className="whitespace-nowrap">
                                <Plus size={14} /> Add Return
                            </Button>
                        </>
                    }
                />

                {/* Filters */}
                <Card className="p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative w-full sm:flex-1 min-w-0 sm:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by return #, order # or customer..."
                            className={`${ui.inputBase} pl-10`}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
                        {STATUS_FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 h-9 rounded-lg text-[12px] font-bold transition-all border whitespace-nowrap ${statusFilter === f ? 'bg-[#F59E0B] border-[#F59E0B] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Returns Table */}
                <Card className="overflow-hidden animate-in fade-in duration-700">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <SelectAllTh sel={sel} />
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Return ID</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Source Order</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Customer</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Refund Value</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-center whitespace-nowrap">Lifecycle</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Controls</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-24 text-center">
                                        <div className="text-slate-200 mb-4"><Package size={60} className="mx-auto" /></div>
                                        <p className="text-[14px] text-slate-400 font-medium italic">No return requests found matching your criteria.</p>
                                    </td></tr>
                                ) : (
                                    paginated.map(r => (
                                        <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                            <RowCheckboxTd sel={sel} id={r.id} />
                                            <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                <div className="text-[14px] font-bold text-[#B4780B] group-hover:underline cursor-pointer" onClick={() => setSelectedReturn(r)}>
                                                    #{r.return_number}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                                                    <Clock size={12} className="text-slate-400" /> {formatDateTime(r.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                <div className="text-slate-900 font-bold">{r.order_tracking_id}</div>
                                                <div className="text-[10px] text-emerald-600 font-bold uppercase mt-1 tracking-tighter hidden sm:block">Verified Order</div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                <div className="text-slate-900 font-bold flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" /> {r.customer_name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-1 font-medium italic hidden sm:block">Authenticated Account</div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                <div className="text-[16px] font-bold text-rose-600 tabular-nums">
                                                    Rs. {(r.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                    {r.items?.length || 0} Item{r.items?.length !== 1 ? 's' : ''}
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-center whitespace-nowrap">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className={`inline-block sm:hidden w-2.5 h-2.5 rounded-full ${
                                                        r.status?.toLowerCase() === 'pending' ? 'bg-amber-500' :
                                                        ['accepted', 'authorized'].includes(r.status?.toLowerCase()) ? 'bg-emerald-600' :
                                                        'bg-rose-600'
                                                    }`} title={r.status} />
                                                    <span className="hidden sm:inline-block">
                                                        <Badge tone={getStatusTone(r.status)}>{r.status}</Badge>
                                                    </span>
                                                    {r.status?.toUpperCase() === 'ACCEPTED' && (
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${r.refund_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {r.refund_status === 'PAID' ? 'Refunded' : 'Refund pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2.5 transition-opacity">
                                                    {r.status?.toUpperCase() === 'ACCEPTED' && r.refund_status !== 'PAID' && (
                                                        <>
                                                            <button onClick={() => setPayReturn(r)} className="text-[12px] font-bold text-[#B4780B] hover:underline">Settle</button>
                                                            <span className="text-slate-300">|</span>
                                                        </>
                                                    )}
                                                    <button onClick={() => setSelectedReturn(r)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => { setSelectedReturn(r); setTimeout(() => window.print(), 350); }} className="text-[12px] font-bold text-slate-600 hover:underline">Print</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => setReturnToDelete(r)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Footer Controls */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border-t border-slate-100 text-[12px] text-slate-500 font-medium text-left">
                                <div className="flex items-center gap-1.5 order-2 sm:order-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                    <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                                    <span className="font-semibold text-slate-700">{filtered.length}</span> returns
                                </div>
                                <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-slate-600 disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                    >
                                        Previous
                                    </button>
                                    <div className="text-[11.5px] font-extrabold text-slate-800 tracking-wider tabular-nums px-2">
                                        {currentPage} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-slate-600 disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <BulkBar
                    sel={sel}
                    entity="returns"
                    onDelete={bulkDelete}
                    statusActions={[
                        { label: 'Accept & Restock', apply: (ids) => bulkStatus(ids, 'ACCEPTED') },
                        { label: 'Reject', apply: (ids) => bulkStatus(ids, 'REJECTED') },
                    ]}
                    onExport={() => exportToCSV(
                        sel.selectedItems.map((r: any) => ({
                            return_number: r.return_number,
                            order_tracking_id: r.order_tracking_id || '',
                            customer_name: r.customer_name || '',
                            status: r.status || '',
                            refund_value: r.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0,
                            items: r.items?.length || 0,
                            date: formatDateTime(r.created_at),
                        })),
                        'sale-returns.csv',
                    )}
                />

                {/* Summary Note */}
                <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">Stock Reconciliation Warning</p>
                        <p className="text-[12px] text-slate-600 leading-relaxed">Approving a return will automatically restock the items into the active inventory. Ensure physical items have been received and inspected for damage before 'Accepting' the request.</p>
                    </div>
                </div>
            </div>

            {selectedReturn && <ReturnDetailModal returnData={selectedReturn} onClose={() => setSelectedReturn(null)} onUpdate={loadReturns} />}

            {/* Refund settlement modal — records the refund paid back to the customer */}
            {payReturn && (
                <PaymentModal
                    open={!!payReturn}
                    onClose={() => setPayReturn(null)}
                    title={`Refund · Return #${payReturn.return_number}`}
                    sourceType="salereturn"
                    sourceId={payReturn.id}
                    total={refundTotal(payReturn)}
                    direction="outbound"
                    onChanged={() => loadReturns(true)}
                />
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                open={!!returnToDelete}
                onClose={() => setReturnToDelete(null)}
                title="Delete Return Record"
                size="sm"
                footer={
                    <div className="flex w-full gap-3">
                        <Button variant="secondary" onClick={() => setReturnToDelete(null)} className="flex-1" disabled={deleting}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Delete'}
                        </Button>
                    </div>
                }
            >
                {returnToDelete && (
                    <div className="space-y-4 text-left">
                        <div className="flex justify-center mb-2">
                            <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
                                <Trash2 size={24} className="text-rose-600" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-[15px] font-bold text-slate-900 leading-snug">Permanently delete this record?</h3>
                            <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
                                You are about to delete Return Sequence <strong>#{returnToDelete.return_number}</strong>. This action is irreversible.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}


