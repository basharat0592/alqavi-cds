"use client";

import { useState, useEffect } from 'react';
import { paymentService, paymentCategoryService, inventoryService, installmentService, orderService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    DollarSign, Search, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft,
    X, Loader2, CheckCircle2, LayoutGrid, AlertTriangle, Eye, FileText, Download, ExternalLink
} from 'lucide-react';
import { PageHeader, Card, Button, Badge, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

interface Payment {
    id: number;
    amount: string | number;
    payment_type: 'inbound' | 'outbound';
    method: string;
    category_name: string;
    reference_number: string;
    payer_payee: string;
    description: string;
    date: string;
    user_name: string;
    created_at: string;
    warehouse?: number | string;
    category?: number | string;
    warehouse_name?: string;
    source?: string;
}

const inputCls = ui.inputBase;

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [stats, setStats] = useState({ total_inbound: 0, total_outbound: 0, total_expenses: 0, net_balance: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    
    // Header Filters
    const [methodFilter, setMethodFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [formOpen, setFormOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [myWarehouses, setMyWarehouses] = useState<any[]>([]);
    const [toastState, setToastState] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [parentOrder, setParentOrder] = useState<any>(null);
    const [loadingParentOrder, setLoadingParentOrder] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToastState({ msg, type });
        setTimeout(() => setToastState(null), 3000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, sData, cData, pendingData] = await Promise.all([
                paymentService.getAll(),
                paymentService.getStats(),
                paymentCategoryService.getAll(),
                installmentService.listAll({ status: 'pending' })
            ]);
            setPayments(Array.isArray(pData) ? pData : []);
            setStats(sData);
            setCategories(cData);
            setPendingPayments(Array.isArray(pendingData) ? pendingData : []);
        } catch (error) {
            console.error("Failed to load payment data:", error);
            showToast("Failed to reload data", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        inventoryService.getWarehouses().then(setWarehouses).catch(() => setWarehouses([]));
        setIsSuperAdmin(authService.isSuperAdmin());
        setMyWarehouses((authService.getUser() as any)?.warehouses || []);
    }, []);

    // Reset pagination to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, typeFilter, methodFilter, categoryFilter]);

    // Open detail / review modal
    const handleOpenReviewModal = async (payment: any) => {
        setSelectedPayment(payment);
        setReviewModalOpen(true);
        setParentOrder(null);
        if (payment.source_type === 'order' && payment.source_id && payment.source_id !== 'null' && payment.source_id !== 'undefined') {
            setLoadingParentOrder(true);
            try {
                const order = await orderService.getById(payment.source_id);
                setParentOrder(order);
            } catch (err: any) {
                if (err.response?.status === 404) {
                    console.log(`Parent order details not found or deleted (Order ID: ${payment.source_id}).`);
                } else {
                    console.warn("Failed to load parent order details:", err.message || err);
                }
            } finally {
                setLoadingParentOrder(false);
            }
        }
    };

    // Confirm & approve a pending payment request
    const handleConfirmPayment = async (id: number) => {
        setActionLoading(true);
        try {
            await installmentService.update(id, { status: 'confirmed' });
            showToast('Receipt verified and ledger updated!');
            setReviewModalOpen(false);
            loadData();
        } catch (error: any) {
            toast.error(error?.response?.data ? JSON.stringify(error.response.data) : 'Failed to confirm payment.');
        } finally {
            setActionLoading(false);
        }
    };

    // Reject a pending payment request
    const handleRejectPayment = async (id: number) => {
        setActionLoading(true);
        try {
            await installmentService.update(id, { status: 'rejected' });
            showToast('Receipt verification rejected.', 'error');
            setReviewModalOpen(false);
            loadData();
        } catch (error: any) {
            toast.error(error?.response?.data ? JSON.stringify(error.response.data) : 'Failed to reject payment.');
        } finally {
            setActionLoading(false);
        }
    };

    // Map and merge pending payments with regular payments
    const mergedPayments = [
        ...pendingPayments.map(p => ({
            id: p.id,
            amount: p.amount,
            payment_type: p.direction === 'inbound' ? 'inbound' as const : 'outbound' as const,
            method: p.method,
            category: undefined,
            category_name: 'Sales (Pending)',
            reference_number: p.reference,
            payer_payee: p.payer_name || 'Customer',
            description: p.note || `Verification request for Order #${p.source_number}`,
            date: p.paid_at || p.created_at,
            user_name: p.created_by_name || 'Customer',
            created_at: p.created_at,
            status: p.status,
            slip_url: p.slip_url,
            source_type: p.source_type,
            source_id: p.source_id,
            warehouse: p.warehouse,
            warehouse_name: p.warehouse_name,
            isPending: true
        })),
        ...payments.map(p => ({
            ...p,
            isPending: false,
            status: 'confirmed',
            slip_url: null,
            source_type: p.source,
            source_id: p.id,
            warehouse: p.warehouse,
            warehouse_name: p.warehouse_name
        }))
    ];

    // Sort by date / time descending (latest first)
    mergedPayments.sort((a, b) => {
        const timeA = new Date(a.date || a.created_at || 0).getTime();
        const timeB = new Date(b.date || b.created_at || 0).getTime();
        if (timeA !== timeB) {
            return timeB - timeA;
        }
        return b.id - a.id;
    });

    const filtered = mergedPayments.filter(p => {
        // Search Filter
        const matchesSearch =
            (p.payer_payee || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.reference_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
            String(p.id).includes(search);
        
        // Type filter (all, pending, inbound, outbound)
        let matchesType = false;
        if (typeFilter === 'all') {
            matchesType = true;
        } else if (typeFilter === 'pending') {
            matchesType = p.isPending;
        } else {
            matchesType = !p.isPending && p.payment_type === typeFilter;
        }

        // Payment Method filter
        let matchesMethod = true;
        if (methodFilter !== 'all') {
            matchesMethod = p.method === methodFilter;
        }

        // Category filter
        let matchesCategory = true;
        if (categoryFilter !== 'all') {
            if (p.isPending) {
                const catObj = categories.find(c => String(c.id) === String(categoryFilter));
                matchesCategory = catObj && catObj.name.toLowerCase() === 'sales';
            } else {
                matchesCategory = String(p.category || '') === String(categoryFilter);
            }
        }
        
        return matchesSearch && matchesType && matchesMethod && matchesCategory;
    });

    // Pagination slice
    const paginatedPayments = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const sel = useTableSelection(filtered.filter(p => !p.isPending)); // prevent selecting pending items for bulk ledger deletion

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map((id) => paymentService.delete(id)));
        showToast(`${ids.length} payment(s) deleted`);
        loadData();
    };

    return (
        <div className="pb-20 text-left">
            <PageHeader
                title="Payments"
                subtitle="Track money in and out of the business"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Payments' }]}
                actions={!formOpen ? (
                    <>
                        <Button variant="outline" onClick={loadData} disabled={loading}>
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button variant="primary" onClick={() => setFormOpen(true)}>
                            <Plus size={12} /> Add Payment
                        </Button>
                    </>
                ) : undefined}
            />
            {formOpen ? (
                <CreateView
                    onClose={() => setFormOpen(false)}
                    onSuccess={() => { setFormOpen(false); loadData(); showToast('Payment saved'); }}
                    categories={categories}
                    warehouses={isSuperAdmin ? warehouses : myWarehouses}
                    isSuperAdmin={isSuperAdmin}
                />
            ) : (
                <>
                    {/* Stats Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Income" val={stats.total_inbound} icon={ArrowDownLeft} color="text-emerald-600" bg="#ecfdf5" bar="#10b981" />
                        <StatCard label="Expense" val={stats.total_outbound} icon={ArrowUpRight} color="text-rose-600" bg="#fef2f2" bar="#f43f5e" />
                        <StatCard label="Internal" val={stats.total_expenses} icon={LayoutGrid} color="text-indigo-600" bg="#eef2ff" bar="#6366f1" />
                        <StatCard label="Net Balance" val={stats.net_balance} icon={DollarSign} color="text-slate-900" bg="#f1f5f9" bar="#64748b" />
                    </div>

                    {/* Pending Review Alert Banner */}
                    {pendingPayments.length > 0 && typeFilter !== 'pending' && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200/50 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100/80 text-amber-800 rounded-lg shrink-0">
                                    <AlertTriangle size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-amber-950">Action Required: Pending Receipts</h4>
                                    <p className="text-[11px] text-amber-850 mt-0.5">
                                        There are {pendingPayments.length} customer payment receipts awaiting verification.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setTypeFilter('pending')}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm shrink-0"
                            >
                                Review Receipts
                            </button>
                        </div>
                    )}

                    {/* Unified Payments Table & Filters Container */}
                    <Card className="overflow-hidden text-left mb-6 shadow-sm border border-slate-100">
                        
                        {/* Integrated Filters Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3.5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        placeholder="Search by name, ID or info..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className={inputCls + " pl-9 h-9 text-xs"}
                                    />
                                </div>
                                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 w-full md:w-auto justify-center flex-wrap sm:flex-nowrap">
                                    {[
                                        { key: 'all', label: 'All' },
                                        { 
                                            key: 'pending', 
                                            label: `Pending (${pendingPayments.length})`, 
                                            badge: pendingPayments.length > 0 
                                        },
                                        { key: 'inbound', label: 'Income' },
                                        { key: 'outbound', label: 'Expense' }
                                    ].map((t) => (
                                        <button
                                            key={t.key}
                                            onClick={() => setTypeFilter(t.key)}
                                            className={`flex-1 sm:flex-initial px-3.5 py-1 text-[10.5px] font-bold uppercase rounded-md transition-all whitespace-nowrap relative
                                                ${typeFilter === t.key ? 'bg-white text-indigo-600 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-700'}
                                                ${t.badge && typeFilter !== 'pending' ? 'bg-amber-100/50 text-amber-850' : ''}`}
                                        >
                                            {t.label}
                                            {t.badge && (
                                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-extrabold text-white shadow-sm ring-1 ring-white">
                                                    {pendingPayments.length}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dropdown Filters (Branch removed) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Mode</label>
                                    <select 
                                        value={methodFilter} 
                                        onChange={(e) => setMethodFilter(e.target.value)}
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner"
                                    >
                                        <option value="all">All Modes</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="mobile_wallet">Digital Wallet</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                                    <select 
                                        value={categoryFilter} 
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner"
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        <SelectAllTh sel={sel} />
                                        <th className="px-5 py-3 whitespace-nowrap">Voucher #</th>
                                        <th className="px-5 py-3 whitespace-nowrap">Payment Mode</th>
                                        <th className="px-5 py-3 whitespace-nowrap">Person / Company</th>
                                        <th className="px-5 py-3 whitespace-nowrap">Category</th>
                                        <th className="px-5 py-3 text-right whitespace-nowrap">Amount</th>
                                        <th className="px-5 py-3 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {loading ? (
                                        <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-6 w-6 text-slate-300 animate-spin mx-auto" /></td></tr>
                                    ) : paginatedPayments.length === 0 ? (
                                        <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-medium">No payments found.</td></tr>
                                    ) : (
                                        paginatedPayments.map((payment) => (
                                            <tr 
                                                key={`${payment.isPending ? 'pending' : 'ledger'}-${payment.id}`} 
                                                className={`hover:bg-slate-50 transition-colors group ${
                                                    payment.isPending 
                                                        ? 'bg-amber-50/10 border-l-2 border-l-amber-500/70 hover:bg-amber-50/20' 
                                                        : ''
                                                }`}
                                            >
                                                {payment.isPending ? (
                                                    <td className="px-5 py-3 text-center select-none w-10">
                                                        <input type="checkbox" disabled className="rounded border-slate-200 text-slate-200 cursor-not-allowed h-3 w-3" />
                                                    </td>
                                                ) : (
                                                    <RowCheckboxTd sel={sel} id={payment.id} />
                                                )}
                                                <td className="px-5 py-3 whitespace-nowrap font-medium">
                                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                        {payment.isPending ? (
                                                            <span className="text-amber-850 font-bold bg-amber-100/60 px-1 py-0.5 rounded text-[10px] border border-amber-200/30">
                                                                Pending
                                                            </span>
                                                        ) : (
                                                            <span>#{payment.id}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(payment.date)}</div>
                                                </td>
                                                <td className="px-5 py-3 text-slate-650 capitalize whitespace-nowrap font-bold text-[11px]">
                                                    {payment.method.replace('_', ' ')}
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 text-[12px]">{payment.payer_payee || "Internal"}</div>
                                                    <div className="text-[10px] text-slate-450 mt-0.5 italic hidden sm:block">By: {payment.user_name}</div>
                                                </td>
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    {payment.isPending ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                                                            Verification Slip
                                                        </span>
                                                    ) : (
                                                        <Badge tone="blue" className="text-[8.5px] px-1.5 py-0.5 font-bold uppercase tracking-wider">{payment.category_name}</Badge>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right font-bold tabular-nums whitespace-nowrap text-[12.5px]">
                                                    {payment.isPending ? (
                                                        <span className="text-amber-600 font-extrabold">
                                                            Rs. {parseFloat(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className={payment.payment_type === 'inbound' ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {payment.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right whitespace-nowrap">
                                                    {/* Always visible action buttons */}
                                                    <div className="flex items-center justify-end gap-2 text-slate-700">
                                                        {payment.isPending ? (
                                                            <button 
                                                                onClick={() => handleOpenReviewModal(payment)}
                                                                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded shadow-sm transition-all flex items-center gap-1 shrink-0"
                                                            >
                                                                <Eye size={10} /> Review
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleOpenReviewModal(payment)}
                                                                    className="text-[11px] font-bold text-slate-500 hover:underline hover:text-slate-900"
                                                                >
                                                                    View
                                                                </button>
                                                                <span className="text-slate-200">|</span>
                                                                <button 
                                                                    onClick={() => bulkDelete([String(payment.id)])}
                                                                    className="text-[11px] font-bold text-[#c40000] hover:underline"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer Controls */}
                        {totalPages > 1 && (
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-550 border-collapse">
                                <div>
                                    Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                    <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                                    <span className="font-semibold text-slate-700">{filtered.length}</span> entries
                                </div>
                                <div className="flex gap-1 flex-wrap justify-center">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[11px] text-slate-650 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
                                                currentPage === page 
                                                    ? 'bg-indigo-600 border-indigo-600 text-white font-extrabold' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[11px] text-slate-650 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <BulkBar
                        sel={sel}
                        entity="payments"
                        onDelete={bulkDelete}
                        onExport={() => exportToCSV(
                            sel.selectedItems.map((p: any) => ({
                                voucher: p.id,
                                date: formatDate(p.date),
                                type: p.payment_type === 'inbound' ? 'Income' : 'Expense',
                                method: (p.method || '').replace('_', ' '),
                                party: p.payer_payee || 'Internal',
                                category: p.category_name || '',
                                reference: p.reference_number || '',
                                amount: p.amount ?? 0,
                                recorded_by: p.user_name || '',
                            })),
                            'payments.csv',
                        )}
                    />
                </>
            )}

            {/* Review / Detail Modal */}
            {reviewModalOpen && selectedPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`bg-white rounded-2xl ${selectedPayment.slip_url ? 'max-w-4xl' : 'max-w-xl'} w-full border border-slate-100 shadow-2xl scale-in-center overflow-hidden flex flex-col max-h-[90vh]`}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    {selectedPayment.isPending ? 'Verify Customer Payment Receipt' : 'Payment Details'}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                    {selectedPayment.isPending ? `Verification Request ID: #${selectedPayment.id}` : `Voucher ID: #${selectedPayment.id}`}
                                </p>
                            </div>
                            <button 
                                onClick={() => setReviewModalOpen(false)}
                                className="text-slate-400 hover:text-slate-655 transition-colors p-1.5 hover:bg-slate-100 rounded-lg animate-in duration-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
                            <div className={`grid grid-cols-1 ${selectedPayment.slip_url ? 'lg:grid-cols-2' : ''} gap-6`}>
                                {/* Left Panel: Info */}
                                <div className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount Claimed</span>
                                                <p className="text-xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
                                                    Rs. {parseFloat(selectedPayment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                                                selectedPayment.isPending 
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200/50' 
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-205/50'
                                            }`}>
                                                {selectedPayment.isPending ? 'Pending Approval' : 'Confirmed'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Customer / Payer</span>
                                                <span className="font-bold text-slate-800 text-xs mt-0.5 block">{selectedPayment.payer_payee}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Payment Mode</span>
                                                <span className="font-bold text-slate-800 text-xs mt-0.5 block capitalize">{selectedPayment.method.replace('_', ' ')}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Reference / Txn ID</span>
                                                <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 rounded w-fit">{selectedPayment.reference_number || 'None'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Warehouse Branch</span>
                                                <span className="font-bold text-slate-800 text-xs mt-0.5 block">{selectedPayment.warehouse_name || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Date Submitted</span>
                                                <span className="font-bold text-slate-800 text-xs mt-0.5 block">{formatDate(selectedPayment.date)}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recorded By</span>
                                                <span className="font-bold text-slate-800 text-xs mt-0.5 block">{selectedPayment.user_name}</span>
                                            </div>
                                        </div>

                                        {selectedPayment.description && (
                                            <div className="border-t border-slate-100 pt-3">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Customer Notes</span>
                                                <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100/50 italic">
                                                    "{selectedPayment.description}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Linked Order info */}
                                    {selectedPayment.source_type === 'order' && (
                                        <div className="border-t border-slate-100 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Linked Sale Order Info
                                                </h4>
                                                {loadingParentOrder && <Loader2 size={10} className="animate-spin text-slate-400" />}
                                            </div>

                                            {loadingParentOrder ? (
                                                <div className="py-2 text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-slate-350" />Loading order info...</div>
                                            ) : parentOrder ? (
                                                <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                    <div>
                                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                                                        <span className="font-bold text-indigo-650 block mt-0.5">#{parentOrder.tracking_id || parentOrder.id}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Order Status</span>
                                                        <span className={`inline-block mt-0.5 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                            parentOrder.status === 'DELIVERED' 
                                                                ? 'bg-emerald-50 text-emerald-700' 
                                                                : 'bg-indigo-50 text-indigo-700'
                                                        }`}>{parentOrder.status}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Total Invoice</span>
                                                        <span className="font-bold text-slate-900 block mt-0.5">Rs. {Number(parentOrder.total_amount || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Balance</span>
                                                        <span className="font-bold text-rose-600 block mt-0.5">Rs. {Number(parentOrder.remaining_amount ?? (Number(parentOrder.total_amount) - Number(parentOrder.amount_paid))).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-1 text-slate-405 italic">No parent order details found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Panel: Proof Slip */}
                                {selectedPayment.slip_url && (
                                    <div className="flex flex-col min-h-[300px] bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-hidden justify-between">
                                        <div className="mb-2 shrink-0 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Receipt Slip Document</span>
                                            <a 
                                                href={selectedPayment.slip_url} 
                                                download 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                                            >
                                                <Download size={10} /> Download
                                            </a>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center border border-slate-200 bg-white rounded-lg p-2 overflow-hidden relative group min-h-[220px]">
                                            {selectedPayment.slip_url.toLowerCase().endsWith('.pdf') ? (
                                                <div className="text-center p-3">
                                                    <FileText size={40} className="mx-auto mb-2 text-indigo-500" />
                                                    <p className="text-[11px] text-slate-655 mb-3 font-bold">PDF Slip Receipt Submitted</p>
                                                    <a 
                                                        href={selectedPayment.slip_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm inline-flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={10} /> Open PDF Proof
                                                    </a>
                                                </div>
                                            ) : (
                                                <>
                                                    <img 
                                                        src={selectedPayment.slip_url} 
                                                        alt="Payment Slip Proof" 
                                                        className="max-h-[250px] max-w-full object-contain rounded transition-transform duration-300 group-hover:scale-[1.01]"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-955/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                        <a 
                                                            href={selectedPayment.slip_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="px-3 py-1.5 bg-white text-slate-805 hover:bg-slate-50 text-[10px] font-black rounded-lg shadow-lg flex items-center gap-1.5"
                                                        >
                                                            <ExternalLink size={10} /> View Full
                                                        </a>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setReviewModalOpen(false)}
                            >
                                Close Details
                            </Button>
                            
                            {selectedPayment.isPending && (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={() => handleRejectPayment(selectedPayment.id)}
                                        className="h-8.5 px-3.5 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1 disabled:opacity-50 shadow-sm"
                                    >
                                        {actionLoading && <Loader2 size={10} className="animate-spin" />}
                                        Reject Receipt
                                    </button>
                                    <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={() => handleConfirmPayment(selectedPayment.id)}
                                        className="h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                                    >
                                        {actionLoading && <Loader2 size={10} className="animate-spin" />}
                                        Confirm & Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Hub */}
            {toastState && (
                <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right">
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl border-l-4 ${toastState.type === 'success' ? 'bg-slate-900 border-indigo-500 text-white' : 'bg-rose-900 border-rose-500 text-white'}`}>
                        {toastState.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-indigo-400" /> : <AlertTriangle className="h-5 w-5 text-rose-400" />}
                        <p className="text-sm font-bold">{toastState.msg}</p>
                        <button onClick={() => setToastState(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, val, icon: Icon, color, bg, bar }: any) {
    return (
        <Card className="p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: bar }}></div>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-[20px] font-bold tabular-nums ${color}`}>Rs. {Math.abs(val).toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100" style={{ backgroundColor: bg }}>
                    <Icon size={18} className={color} />
                </div>
            </div>
        </Card>
    );
}

function CreateView({ onClose, onSuccess, categories, warehouses = [], isSuperAdmin = false }: any) {
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().slice(0, 10);
    const lockBranch = !isSuperAdmin && warehouses.length === 1;
    const [formData, setFormData] = useState({
        amount: '',
        payment_type: 'inbound',
        method: 'cash',
        category: '',
        payer_payee: '',
        reference_number: '',
        description: '',
        date: today,
        warehouse_id: warehouses.length === 1 ? String(warehouses[0].id) : '',
    });

    const set = (f: string, v: any) => setFormData(prev => ({ ...prev, [f]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await paymentService.create(formData);
            onSuccess();
        } catch (error) { toast.error("Failed to save payment"); } finally { setLoading(false); }
    };

    return (
        <Card className="overflow-hidden text-left mb-6">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">New Payment</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Type & Amount */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Payment Type</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                                    {['inbound', 'outbound'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => set('payment_type', t)}
                                            className={`py-1.5 rounded-md text-[11px] font-bold uppercase transition-all
                                                ${formData.payment_type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {t === 'inbound' ? 'Income' : 'Expense'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Amount (PKR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                                    <input
                                        required type="number" step="0.01"
                                        value={formData.amount}
                                        onChange={e => set('amount', e.target.value)}
                                        placeholder="0.00"
                                        className={inputCls + " pl-10 text-lg font-bold"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-6 lg:px-8 lg:border-x border-slate-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Mode</label>
                                    <select value={formData.method} onChange={e => set('method', e.target.value)} className={inputCls + " cursor-pointer"}>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="mobile_wallet">Digital Wallet</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Category</label>
                                    <select required value={formData.category} onChange={e => set('category', e.target.value)} className={inputCls + " cursor-pointer"}>
                                        <option value="">Select...</option>
                                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Name (Person / Company)</label>
                                <input
                                    type="text" value={formData.payer_payee}
                                    onChange={e => set('payer_payee', e.target.value)}
                                    placeholder="Enter entity name"
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Reference & Note */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Date</label>
                                    <input
                                        type="date" value={formData.date}
                                        onChange={e => set('date', e.target.value)}
                                        className={inputCls + " cursor-pointer"}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-slate-900 mb-2">Branch</label>
                                    {lockBranch ? (
                                        <div className={inputCls + " flex items-center bg-slate-50 text-slate-700"}>
                                            {warehouses[0]?.name || 'Your branch'}
                                        </div>
                                    ) : (
                                        <select
                                            required={!isSuperAdmin}
                                            value={formData.warehouse_id}
                                            onChange={e => set('warehouse_id', e.target.value)}
                                            className={inputCls + " cursor-pointer"}
                                        >
                                            <option value="">{isSuperAdmin ? 'All / Unassigned' : 'Select branch...'}</option>
                                            {warehouses.map((w: any) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Reference #</label>
                                <input
                                    type="text" value={formData.reference_number}
                                    onChange={e => set('reference_number', e.target.value)}
                                    placeholder="Voucher or Invoice #"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-bold text-slate-900 mb-2">Note (Internal)</label>
                                <textarea
                                    rows={2} value={formData.description}
                                    onChange={e => set('description', e.target.value)}
                                    placeholder="Additional details..."
                                    className={inputCls + " h-[60px] resize-none py-2"}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-8 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={onClose} className="mr-4">Discard</Button>
                    <Button type="submit" variant="primary" disabled={loading} className="w-[160px]">
                        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Save Payment
                    </Button>
                </div>
            </form>
        </Card>
    );
}
