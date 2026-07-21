"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { paymentService, paymentCategoryService, inventoryService, installmentService, orderService } from '@/lib/api';
import { paymentsDueService } from '@/services/payment.service';
import { authService } from '@/lib/auth';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    Search, RefreshCw, Plus, Wallet, TrendingUp, TrendingDown, Tag, Calendar, Building2, Hash, User, Printer,
    X, Loader2, CheckCircle2, AlertTriangle, Eye, FileText, Download, ExternalLink
} from 'lucide-react';
import { PageHeader, Card, Button, Badge, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, Modal } from '@/components/admin/ui';
import PaymentPanel, { PaymentModal } from '@/components/admin/PaymentPanel';

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
    const router = useRouter();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    
    // Header Filters
    const [sourceFilter, setSourceFilter] = useState('all'); // sale / purchase / return / manual
    // Money In/Out breakdown period — both blank = all time; year alone = whole year.
    const [flowMonthNum, setFlowMonthNum] = useState('');     // '01'..'12' or ''
    const [flowYear, setFlowYear] = useState('');             // 'YYYY' or ''
    const [partyFilter, setPartyFilter] = useState('');       // party / customer name (free-text search, '' = all)
    const [statusFilter, setStatusFilter] = useState('all');  // paid / partial / unpaid / pending
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    // Outstanding sale/purchase orders (unpaid / partially paid) shown alongside payments.
    const [duesRows, setDuesRows] = useState<any[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [formOpen, setFormOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [myWarehouses, setMyWarehouses] = useState<any[]>([]);

    // Super-admin per-branch payments overview (each branch separately + own).
    const [branchOverview, setBranchOverview] = useState<any | null>(null);
    const [branchLoading, setBranchLoading] = useState(false);
    const [toastState, setToastState] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [parentOrder, setParentOrder] = useState<any>(null);
    const [loadingParentOrder, setLoadingParentOrder] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    // "Pay Now" popup target for outstanding (unpaid / partial) sale, purchase & return dues.
    const [payTarget, setPayTarget] = useState<any>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToastState({ msg, type });
        setTimeout(() => setToastState(null), 3000);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, cData, pendingData, duesData] = await Promise.all([
                paymentService.getAll({ no_pagination: 'true' }),
                paymentCategoryService.getAll(),
                installmentService.listAll({ status: 'pending' }),
                paymentsDueService.get('all').catch(() => null),
            ]);
            setPayments(Array.isArray(pData) ? pData : []);
            setCategories(cData);
            setPendingPayments(Array.isArray(pendingData) ? pendingData : []);
            setDuesRows(Array.isArray(duesData?.results) ? duesData.results : []);
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

    // Load the per-branch overview once we know the user is the super admin.
    useEffect(() => {
        if (!isSuperAdmin) return;
        setBranchLoading(true);
        paymentService.getByBranch()
            .then(setBranchOverview)
            .catch(() => setBranchOverview(null))
            .finally(() => setBranchLoading(false));
    }, [isSuperAdmin]);

    // Reset pagination to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, typeFilter, sourceFilter, partyFilter, statusFilter, dateFrom, dateTo]);

    // Settlement status of a row: paid (a confirmed payment), pending (a receipt awaiting
    // review), or unpaid / partial (an outstanding order that hasn't been fully paid).
    const rowStatus = (p: any): 'paid' | 'partial' | 'unpaid' | 'pending' => {
        if (p.isPending) return 'pending';
        if (p.isDue) return (Number(p.paid || 0) > 0 ? 'partial' : 'unpaid');
        return 'paid';
    };

    // Map a payment's source to a readable type. Returns are split into sale vs purchase.
    const sourceLabel = (p: any): string => {
        const s = String(p.source_type || p.source || '').toLowerCase();
        if (s.includes('deliver')) return 'Delivery';
        if (s.includes('return')) return s.includes('purchase') ? 'Purchase Return' : 'Sale Return';
        if (s.includes('purchase')) return 'Purchase';
        if (s === 'order' || s.includes('sale')) return 'Sale';
        return 'Manual';
    };

    // Money direction for the collection popup: purchases & sale-return refunds are
    // money out; sales & purchase-return refunds are money in.
    const dirFor = (st: string): 'inbound' | 'outbound' =>
        (st === 'purchaseorder' || st === 'salereturn') ? 'outbound' : 'inbound';

    // Open the "Pay Now" collection popup for an outstanding due row.
    const openPay = (d: any) => setPayTarget({
        sourceType: d.source_type,
        sourceId: d.source_id,
        total: Number(d.total || d.amount || 0),
        direction: dirFor(d.source_type),
        dueDate: d.date || null,
        title: `Collect Payment${d.payer_payee ? ` · ${d.payer_payee}` : ''}`,
    });

    // "View" → for a sale-order row open the full Sale detail page (same as Sales
    // history view); otherwise fall back to the in-page detail modal.
    const handleView = (payment: any) => {
        if (payment.orderId) { router.push(`/admin/payments/${payment.orderId}`); return; }
        handleOpenReviewModal(payment);
    };

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
    const mergedPayments: any[] = [
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
            // Real link back to the originating sale order (resolved server-side,
            // incl. installment "tp:" rows) for the View → sale page drill-down.
            orderId: (p as any).order_ref_id ? String((p as any).order_ref_id) : null,
            source_type: p.source,
            source_id: p.id,
            warehouse: p.warehouse,
            warehouse_name: p.warehouse_name
        })),
        // Outstanding orders (unpaid / partially paid) — the receivable/payable itself.
        ...duesRows.map((d: any) => ({
            id: `due-${d.source_type}-${d.source_id}`,
            amount: d.remaining,
            payment_type: String(d.type || '').includes('purchase') ? 'outbound' as const : 'inbound' as const,
            method: '—',
            category: undefined,
            category_name: String(d.type || '').includes('return') ? 'Return' : (String(d.type || '').includes('purchase') ? 'Purchase' : 'Sale'),
            reference_number: d.ref,
            payer_payee: d.party,
            description: d.products || '',
            date: d.due_date || '',
            user_name: '',
            created_at: d.due_date || '',
            status: 'due',
            slip_url: null,
            source_type: d.source_type,
            source_id: d.source_id,
            orderId: d.source_type === 'order' ? String(d.source_id) : null,
            isDue: true,
            total: d.total, paid: d.paid, remaining: d.remaining, is_overdue: d.is_overdue,
        })),
    ];

    // Sort by date / time descending (latest first)
    mergedPayments.sort((a, b) => {
        const timeA = new Date(a.date || a.created_at || 0).getTime();
        const timeB = new Date(b.date || b.created_at || 0).getTime();
        if (timeA !== timeB) {
            return timeB - timeA;
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

    // ── Money-flow breakdown ──────────────────────────────────────────────
    // Computed straight from the real booked ledger (`payments`), NOT the dues
    // rows, so every part sums EXACTLY to its headline — no calculation drift.
    //   Money IN  = Sales + Purchase Returns (supplier refunds) + Other Income
    //   Money OUT = Purchases + Sale Returns (customer refunds) + Delivery + Expenses
    // Years present in the ledger (plus the current year) for the year dropdown.
    const flowYearOptions = Array.from(new Set([
        ...payments.map((p: any) => String(p.date || '').slice(0, 4)).filter(Boolean),
        String(new Date().getFullYear()),
    ])).sort().reverse();

    // Scope the breakdown to the picked period (on the payment date):
    // both blank = all time, year only = whole year, year+month = that month.
    const flowPayments = payments.filter((p: any) => {
        const d = String(p.date || '');
        if (flowYear && d.slice(0, 4) !== flowYear) return false;
        if (flowMonthNum && d.slice(5, 7) !== flowMonthNum) return false;
        return true;
    });
    const flow = { sales: 0, purchaseReturns: 0, otherIncome: 0, purchases: 0, saleReturns: 0, delivery: 0, expenses: 0 };
    flowPayments.forEach((p: any) => {
        const src = String(p.source || '').toLowerCase();
        const amt = Number(p.amount || 0);
        if (p.payment_type === 'inbound') {
            if (src === 'purchase_return') flow.purchaseReturns += amt;
            else if (src === 'sale') flow.sales += amt;
            else flow.otherIncome += amt;            // manual income
        } else {
            if (src === 'delivery') flow.delivery += amt;
            else if (src === 'sale_return') flow.saleReturns += amt;
            else if (src === 'purchase') flow.purchases += amt;
            else flow.expenses += amt;               // manual expense
        }
    });
    const totalIncome = flow.sales + flow.purchaseReturns + flow.otherIncome;
    const totalExpense = flow.purchases + flow.saleReturns + flow.delivery + flow.expenses;

    // Party / customer dropdown — every distinct payer/payee across the ledger.
    const partyOptions = Array.from(new Set(
        mergedPayments.map(p => (p.payer_payee || '').trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

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

        // Source (Sale / Purchase / Return / Manual)
        const matchesSource = sourceFilter === 'all' || sourceLabel(p) === sourceFilter;

        // Party / customer name — free-text "contains" search (typing or picking a suggestion).
        const matchesParty = !partyFilter.trim() || (p.payer_payee || '').toLowerCase().includes(partyFilter.trim().toLowerCase());

        // Settlement status (paid / partial / unpaid / pending)
        const matchesStatus = statusFilter === 'all' || rowStatus(p) === statusFilter;

        // Date range (on the payment date)
        const t = new Date(p.date || p.created_at || 0).getTime();
        const fromOk = !dateFrom || t >= new Date(dateFrom + 'T00:00:00').getTime();
        const toOk = !dateTo || t <= new Date(dateTo + 'T23:59:59').getTime();

        return matchesSearch && matchesType
            && matchesSource && matchesParty && matchesStatus && fromOk && toOk;
    });

    // Pagination slice
    const paginatedPayments = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const sel = useTableSelection(filtered.filter(p => !p.isPending && !p.isDue)); // only real ledger rows are bulk-selectable

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map((id) => paymentService.delete(id)));
        showToast(`${ids.length} payment(s) deleted`);
        loadData();
    };

    // Hand the selected rows to the real branded invoice (statement) page and open it.
    const downloadPaymentsPdf = () => {
        const items = (sel.selectedItems as any[]) || [];
        if (!items.length) { showToast('Select rows to download', 'error'); return; }
        const payload = items.map((p: any) => ({
            id: p.id, date: p.date, method: p.method, payer_payee: p.payer_payee,
            category_name: p.category_name, payment_type: p.payment_type, amount: p.amount,
            source: p.source, source_type: p.source_type,
        }));
        try { sessionStorage.setItem('payments_statement', JSON.stringify(payload)); } catch { }
        window.open('/admin/payments/statement?print=true', '_blank');
    };

    // Print a single payment on the real branded invoice (statement page).
    const printPaymentInvoice = (p: any) => {
        const payload = [{
            id: p.id, date: p.date, method: p.method, payer_payee: p.payer_payee,
            category_name: p.category_name, payment_type: p.payment_type,
            amount: p.isDue ? (p.remaining ?? p.amount) : p.amount,
            source: p.source, source_type: p.source_type,
        }];
        try { sessionStorage.setItem('payments_statement', JSON.stringify(payload)); } catch { }
        window.open('/admin/payments/statement?print=true', '_blank');
    };

    // Single-row delete now goes through a confirmation dialog (was one-click).
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await paymentService.delete(String(deleteTarget.id));
            showToast('Payment entry deleted');
            setDeleteTarget(null);
            loadData();
        } catch {
            showToast('Failed to delete entry', 'error');
        } finally {
            setDeleting(false);
        }
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
                    {/* Money-flow breakdown — exactly what makes up income and expense */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h2 className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                            Money Flow
                            <span className="text-[11px] font-medium text-slate-400 normal-case">
                                {flowYear
                                    ? (flowMonthNum
                                        ? `${['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(flowMonthNum)]} ${flowYear}`
                                        : flowYear)
                                    : 'All time'}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <select
                                value={flowMonthNum}
                                onChange={(e) => setFlowMonthNum(e.target.value)}
                                className="h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner"
                            >
                                <option value="">All months</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                    <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={flowYear}
                                onChange={(e) => setFlowYear(e.target.value)}
                                className="h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner"
                            >
                                <option value="">All years</option>
                                {flowYearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                            </select>
                            {(flowYear || flowMonthNum) && (
                                <button
                                    onClick={() => { setFlowYear(''); setFlowMonthNum(''); }}
                                    className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-200 bg-white text-[10.5px] font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600"
                                >
                                    <X size={11} /> All time
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                        <FlowPanel
                            title="Money In" tone="emerald" total={totalIncome} loading={loading}
                            rows={[
                                { label: 'Sales', val: flow.sales },
                                { label: 'Purchase Returns', val: flow.purchaseReturns },
                                { label: 'Other Income', val: flow.otherIncome },
                            ]}
                        />
                        <FlowPanel
                            title="Money Out" tone="rose" total={totalExpense} loading={loading}
                            rows={[
                                { label: 'Purchases', val: flow.purchases },
                                { label: 'Sale Returns', val: flow.saleReturns },
                                { label: 'Delivery Charges', val: flow.delivery },
                                { label: 'Other Expenses', val: flow.expenses },
                            ]}
                        />
                    </div>

                    {/* Super-admin: per-branch payments overview (each branch separately + own) */}
                    {isSuperAdmin && (
                        <Card className="overflow-hidden text-left mb-8 shadow-sm border border-slate-100">
                            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[13.5px] font-bold text-slate-900">Per-Branch Payments</h3>
                                    <p className="text-[11.5px] text-slate-500">Income, expense and net for every branch, plus your own ledger.</p>
                                </div>
                                {branchLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[12.5px]">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                            <th className="text-left font-bold px-5 py-2.5">Branch</th>
                                            <th className="text-right font-bold px-5 py-2.5">Income</th>
                                            <th className="text-right font-bold px-5 py-2.5">Expense</th>
                                            <th className="text-right font-bold px-5 py-2.5">Net</th>
                                            <th className="text-right font-bold px-5 py-2.5">Entries</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(branchOverview?.branches || []).map((b: any) => (
                                            <tr key={b.warehouse_id} className="hover:bg-slate-50/60">
                                                <td className="px-5 py-2.5 font-semibold text-slate-800">{b.warehouse_name}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700">{formatCurrency(b.income)}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-rose-600">{formatCurrency(b.expense)}</td>
                                                <td className={`px-5 py-2.5 text-right tabular-nums font-bold ${b.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatCurrency(b.net)}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{b.count}</td>
                                            </tr>
                                        ))}
                                        {branchOverview?.own && (
                                            <tr className="bg-indigo-50/30 hover:bg-indigo-50/50">
                                                <td className="px-5 py-2.5 font-bold text-indigo-700">My Own Ledger</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700">{formatCurrency(branchOverview.own.income)}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-rose-600">{formatCurrency(branchOverview.own.expense)}</td>
                                                <td className={`px-5 py-2.5 text-right tabular-nums font-bold ${branchOverview.own.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatCurrency(branchOverview.own.net)}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{branchOverview.own.count}</td>
                                            </tr>
                                        )}
                                        {branchOverview?.unassigned && branchOverview.unassigned.count > 0 && (
                                            <tr className="hover:bg-slate-50/60">
                                                <td className="px-5 py-2.5 font-semibold text-slate-500 italic">Unassigned (no branch)</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-emerald-700">{formatCurrency(branchOverview.unassigned.income)}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-rose-600">{formatCurrency(branchOverview.unassigned.expense)}</td>
                                                <td className={`px-5 py-2.5 text-right tabular-nums font-bold ${branchOverview.unassigned.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{formatCurrency(branchOverview.unassigned.net)}</td>
                                                <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{branchOverview.unassigned.count}</td>
                                            </tr>
                                        )}
                                        {!branchLoading && !(branchOverview?.branches || []).length && !branchOverview?.own?.count && (
                                            <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-[12px]">No payments recorded yet.</td></tr>
                                        )}
                                    </tbody>
                                    {branchOverview?.totals && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                                                <td className="px-4 py-2 text-slate-900">All Branches Total</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{formatCurrency(branchOverview.totals.income)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-rose-600">{formatCurrency(branchOverview.totals.expense)}</td>
                                                <td className={`px-4 py-2 text-right tabular-nums ${branchOverview.totals.net >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>{formatCurrency(branchOverview.totals.net)}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-slate-500">{branchOverview.totals.count}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </Card>
                    )}

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

                            {/* Dropdown Filters */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-0.5">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner">
                                        <option value="all">All Statuses</option>
                                        <option value="paid">Paid</option>
                                        <option value="partial">Partial</option>
                                        <option value="unpaid">Unpaid</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source</label>
                                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner">
                                        <option value="all">All Sources</option>
                                        <option value="Sale">Sale</option>
                                        <option value="Purchase">Purchase</option>
                                        <option value="Sale Return">Sale Return</option>
                                        <option value="Purchase Return">Purchase Return</option>
                                        <option value="Delivery">Delivery Charge</option>
                                        <option value="Manual">Manual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer / Party</label>
                                    <input
                                        type="text"
                                        list="party-options"
                                        value={partyFilter}
                                        onChange={(e) => setPartyFilter(e.target.value)}
                                        placeholder="Type a name…"
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 transition-colors shadow-inner" />
                                    <datalist id="party-options">
                                        {partyOptions.map(name => (<option key={name} value={name} />))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">From</label>
                                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner" />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">To</label>
                                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full h-8 px-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] outline-none focus:border-indigo-500 cursor-pointer transition-colors shadow-inner" />
                                </div>
                            </div>
                            {(statusFilter !== 'all' || sourceFilter !== 'all' || partyFilter.trim() || dateFrom || dateTo || search || typeFilter !== 'all') && (
                                <button onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setSourceFilter('all'); setPartyFilter(''); setDateFrom(''); setDateTo(''); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[10.5px] font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600">
                                    <X size={11} /> Remove filters
                                </button>
                            )}
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[9.5px] font-bold uppercase tracking-widest text-slate-400">
                                        <SelectAllTh sel={sel} />
                                        <th className="px-4 py-2.5 whitespace-nowrap">Voucher #</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Source</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Mode</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Person / Company</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount</th>
                                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px]">
                                    {loading ? (
                                        <tr><td colSpan={9} className="py-20 text-center"><Loader2 className="h-6 w-6 text-slate-300 animate-spin mx-auto" /></td></tr>
                                    ) : paginatedPayments.length === 0 ? (
                                        <tr><td colSpan={9} className="py-20 text-center text-slate-400 font-medium">No payments found.</td></tr>
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
                                                {(payment.isPending || payment.isDue) ? (
                                                    <td className="px-4 py-2 text-center select-none w-10">
                                                        <input type="checkbox" disabled className="rounded border-slate-200 text-slate-200 cursor-not-allowed h-3 w-3" />
                                                    </td>
                                                ) : (
                                                    <RowCheckboxTd sel={sel} id={payment.id} />
                                                )}
                                                <td className="px-4 py-2 whitespace-nowrap font-medium">
                                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                        {payment.isPending ? (
                                                            <span className="text-amber-850 font-bold bg-amber-100/60 px-1 py-0.5 rounded text-[10px] border border-amber-200/30">
                                                                Pending
                                                            </span>
                                                        ) : payment.isDue ? (
                                                            <span className="text-slate-700">{payment.reference_number || '—'}</span>
                                                        ) : (
                                                            <span>#{payment.id}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[9.5px] text-slate-400 mt-0.5">{payment.isDue ? (payment.date ? `Due ${formatDate(payment.date)}` : 'No due date') : formatDate(payment.date)}</div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {(() => { const s = sourceLabel(payment); const tone = s === 'Sale' ? 'bg-emerald-50 text-emerald-700' : s === 'Purchase' ? 'bg-indigo-50 text-indigo-700' : s.includes('Return') ? 'bg-rose-50 text-rose-700' : s === 'Delivery' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'; return (
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${tone}`}>{s}</span>
                                                    ); })()}
                                                </td>
                                                <td className="px-4 py-2 text-slate-650 capitalize whitespace-nowrap font-bold text-[10.5px]">
                                                    {payment.method.replace('_', ' ')}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 text-[12px]">{payment.payer_payee || "Internal"}</div>
                                                    <div className="text-[10px] text-slate-450 mt-0.5 italic hidden sm:block">By: {payment.user_name}</div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {payment.isPending ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80">
                                                            Verification Slip
                                                        </span>
                                                    ) : (
                                                        <Badge tone="blue" className="text-[8.5px] px-1.5 py-0.5 font-bold uppercase tracking-wider">{payment.category_name}</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {(() => {
                                                        const st = rowStatus(payment);
                                                        const map: any = { paid: 'bg-emerald-50 text-emerald-700', partial: 'bg-amber-50 text-amber-700', unpaid: 'bg-rose-50 text-rose-700', pending: 'bg-slate-100 text-slate-500' };
                                                        return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${map[st]}`}>{st}</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold tabular-nums whitespace-nowrap text-[12.5px]">
                                                    {payment.isDue ? (
                                                        <span className="text-amber-700" title={`Total ${formatCurrency(payment.total || 0)} · Paid ${formatCurrency(payment.paid || 0)}`}>
                                                            {formatCurrency(payment.remaining || payment.amount)}<span className="block text-[8.5px] font-medium text-slate-400 normal-case">outstanding</span>
                                                        </span>
                                                    ) : payment.isPending ? (
                                                        <span className="text-amber-600 font-extrabold">
                                                            Rs. {parseFloat(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className={payment.payment_type === 'inbound' ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {payment.payment_type === 'inbound' ? '+' : '-'}{formatCurrency(payment.amount)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-right whitespace-nowrap">
                                                    {/* Always visible action buttons */}
                                                    <div className="flex items-center justify-end gap-2 text-slate-700">
                                                        {payment.isPending ? (
                                                            <button
                                                                onClick={() => handleOpenReviewModal(payment)}
                                                                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded shadow-sm transition-all flex items-center gap-1 shrink-0"
                                                            >
                                                                <Eye size={10} /> Review
                                                            </button>
                                                        ) : payment.isDue ? (
                                                            <>
                                                                {Number(payment.remaining || 0) > 0 && (
                                                                    <button
                                                                        onClick={() => openPay(payment)}
                                                                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded shadow-sm transition-all flex items-center gap-1 shrink-0"
                                                                    >
                                                                        <Wallet size={10} /> Pay Now
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleView(payment)}
                                                                    className="text-[11px] font-bold text-slate-500 hover:underline hover:text-slate-900"
                                                                >
                                                                    View
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleView(payment)}
                                                                    className="text-[11px] font-bold text-slate-500 hover:underline hover:text-slate-900"
                                                                >
                                                                    View
                                                                </button>
                                                                <span className="text-slate-200">|</span>
                                                                <button
                                                                    onClick={() => setDeleteTarget(payment)}
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

                        {/* Pagination Footer Controls (10 per page) */}
                        {!loading && filtered.length > 0 && (
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-550 border-collapse">
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
                        onPdf={downloadPaymentsPdf}
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

            {/* Delete confirmation */}
            <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} size="sm">
                <div className="py-2 text-center">
                    <h2 className="text-[17px] font-bold text-slate-900 mb-1">Delete this payment entry?</h2>
                    <p className="text-[13px] text-slate-500 mb-5">
                        {deleteTarget ? `${deleteTarget.payment_type === 'inbound' ? 'Income' : 'Expense'} · ${formatCurrency(Number(deleteTarget.amount || 0))} · ${deleteTarget.category_name || ''}` : ''}
                        <br />This permanently removes the ledger entry and cannot be undone.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                        <Button onClick={confirmDelete} disabled={deleting} className="!bg-rose-600 hover:!bg-rose-700">
                            {deleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Review / Detail Modal */}
            {reviewModalOpen && selectedPayment && (() => {
                const p = selectedPayment;
                const isIncome = p.payment_type === 'inbound';
                const src = sourceLabel(p);
                const st = rowStatus(p);
                const stTone: any = {
                    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    partial: 'bg-amber-50 text-amber-700 border-amber-200',
                    unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
                    pending: 'bg-slate-100 text-slate-600 border-slate-200',
                };
                const shownAmount = Number(p.isDue ? (p.remaining ?? p.amount) : p.amount || 0);
                return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`bg-white rounded-2xl ${p.slip_url ? 'max-w-4xl' : p.isDue ? 'max-w-3xl' : 'max-w-2xl'} w-full border border-slate-100 shadow-2xl scale-in-center overflow-hidden flex flex-col max-h-[90vh]`}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${isIncome ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 leading-none">
                                        {p.isPending ? 'Verify Payment Receipt' : 'Payment Details'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                        {p.isPending ? `Request #${p.id}` : p.isDue ? (p.reference_number || 'Outstanding') : `Voucher #${p.id}`} · {formatDate(p.date)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto flex-1">
                            <div className={`grid grid-cols-1 ${p.slip_url ? 'lg:grid-cols-2' : ''} gap-6`}>
                                <div className="space-y-5">
                                    {/* Amount hero */}
                                    <div className={`rounded-xl p-4 border flex items-center justify-between ${isIncome ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.isDue ? 'Outstanding' : isIncome ? 'Money In' : 'Money Out'}</span>
                                            <p className={`text-[26px] font-black tabular-nums leading-tight ${p.isDue ? 'text-amber-700' : isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {p.isDue ? '' : isIncome ? '+' : '-'}{formatCurrency(shownAmount)}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-1 text-[9.5px] font-extrabold uppercase rounded-lg border ${stTone[st]}`}>{st}</span>
                                    </div>

                                    {/* All details */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                                        <DetailCell label="Source">{src}</DetailCell>
                                        <DetailCell label="Category">{p.category_name || '—'}</DetailCell>
                                        <DetailCell label="Payment Mode"><span className="capitalize">{(p.method || '—').replace('_', ' ')}</span></DetailCell>
                                        <DetailCell label="Type">{isIncome ? 'Income' : 'Expense'}</DetailCell>
                                        <DetailCell label="Person / Company">{p.payer_payee || 'Internal'}</DetailCell>
                                        <DetailCell label="Reference / Txn" mono>{p.reference_number || '—'}</DetailCell>
                                        <DetailCell label="Branch">{p.warehouse_name || '—'}</DetailCell>
                                        <DetailCell label="Recorded By">{p.user_name || '—'}</DetailCell>
                                    </div>

                                    {p.description && (
                                        <div className="border-t border-slate-100 pt-3">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Note</span>
                                            <p className="text-slate-600 text-[12px] leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">"{p.description}"</p>
                                        </div>
                                    )}

                                    {/* Linked Order info */}
                                    {p.source_type === 'order' && (
                                        <div className="border-t border-slate-100 pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Linked Sale Order</h4>
                                                {loadingParentOrder && <Loader2 size={10} className="animate-spin text-slate-400" />}
                                            </div>
                                            {loadingParentOrder ? (
                                                <div className="py-2 text-slate-400 text-xs flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" />Loading order info…</div>
                                            ) : parentOrder ? (
                                                <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                                    <DetailCell label="Order ID">#{parentOrder.tracking_id || parentOrder.id}</DetailCell>
                                                    <DetailCell label="Order Status">
                                                        <span className={`inline-block text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded ${parentOrder.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{parentOrder.status}</span>
                                                    </DetailCell>
                                                    <DetailCell label="Total Invoice">Rs. {Number(parentOrder.total_amount || 0).toLocaleString()}</DetailCell>
                                                    <DetailCell label="Remaining"><span className="text-rose-600">Rs. {Number(parentOrder.remaining_amount ?? (Number(parentOrder.total_amount) - Number(parentOrder.amount_paid))).toLocaleString()}</span></DetailCell>
                                                </div>
                                            ) : (
                                                <div className="py-1 text-slate-400 text-xs italic">No parent order details found.</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Full payment history + collection (for outstanding dues) */}
                                    {p.isDue && p.source_type && (
                                        <div className="border-t border-slate-100 pt-4">
                                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment History &amp; Collection</h4>
                                            <PaymentPanel
                                                sourceType={p.source_type}
                                                sourceId={p.source_id}
                                                total={Number(p.total || p.amount || 0)}
                                                direction={dirFor(p.source_type)}
                                                dueDate={p.date || null}
                                                onChanged={loadData}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Proof Slip */}
                                {p.slip_url && (
                                    <div className="flex flex-col min-h-[300px] bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-hidden justify-between">
                                        <div className="mb-2 shrink-0 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Receipt Slip</span>
                                            <a href={p.slip_url} download target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
                                                <Download size={10} /> Download
                                            </a>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center border border-slate-200 bg-white rounded-lg p-2 overflow-hidden relative group min-h-[220px]">
                                            {p.slip_url.toLowerCase().endsWith('.pdf') ? (
                                                <div className="text-center p-3">
                                                    <FileText size={40} className="mx-auto mb-2 text-indigo-500" />
                                                    <p className="text-[11px] text-slate-600 mb-3 font-bold">PDF Slip Receipt Submitted</p>
                                                    <a href={p.slip_url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-sm inline-flex items-center gap-1">
                                                        <ExternalLink size={10} /> Open PDF Proof
                                                    </a>
                                                </div>
                                            ) : (
                                                <>
                                                    <img src={p.slip_url} alt="Payment Slip Proof" className="max-h-[250px] max-w-full object-contain rounded transition-transform duration-300 group-hover:scale-[1.01]" />
                                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                        <a href={p.slip_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 text-[10px] font-black rounded-lg shadow-lg flex items-center gap-1.5">
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
                            <Button type="button" variant="ghost" size="sm" onClick={() => setReviewModalOpen(false)}>Close</Button>
                            <div className="flex gap-2">
                                {!p.isPending && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => printPaymentInvoice(p)}>
                                        <Printer size={14} /> Print Invoice
                                    </Button>
                                )}
                                {p.isPending && (
                                    <>
                                        <button type="button" disabled={actionLoading} onClick={() => handleRejectPayment(p.id)}
                                            className="h-9 px-3.5 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1 disabled:opacity-50 shadow-sm">
                                            {actionLoading && <Loader2 size={10} className="animate-spin" />} Reject
                                        </button>
                                        <button type="button" disabled={actionLoading} onClick={() => handleConfirmPayment(p.id)}
                                            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-50">
                                            {actionLoading && <Loader2 size={10} className="animate-spin" />} Confirm & Approve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* "Pay Now" collection popup (same component the sales list uses) */}
            {payTarget && (
                <PaymentModal
                    open={!!payTarget}
                    onClose={() => setPayTarget(null)}
                    title={payTarget.title}
                    sourceType={payTarget.sourceType}
                    sourceId={payTarget.sourceId}
                    total={payTarget.total}
                    direction={payTarget.direction}
                    dueDate={payTarget.dueDate}
                    onChanged={loadData}
                />
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

// A single labelled detail in the payment-view modal.
function DetailCell({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
            <span className={`text-slate-800 text-[12.5px] font-bold mt-0.5 block break-words ${mono ? 'font-mono' : ''}`}>{children}</span>
        </div>
    );
}

// A breakdown card that lists what makes up income (or expense) and shows the
// subtotal. The listed rows always sum to `total`, so the maths is transparent.
function FlowPanel({ title, tone, total, rows, loading }: {
    title: string; tone: 'emerald' | 'rose'; total: number;
    rows: { label: string; val: number }[]; loading?: boolean;
}) {
    const toneMap = {
        emerald: { text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'border-emerald-100', head: 'text-emerald-600' },
        rose: { text: 'text-rose-600', dot: 'bg-rose-500', ring: 'border-rose-100', head: 'text-rose-600' },
    }[tone];
    return (
        <Card className={`p-4 border ${toneMap.ring}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${toneMap.dot}`} />
                    <h3 className={`text-[11px] font-bold uppercase tracking-widest ${toneMap.head}`}>{title}</h3>
                </div>
                <span className={`text-[15px] font-black tabular-nums ${toneMap.text}`}>
                    {tone === 'emerald' ? '+' : '-'}{formatCurrency(total)}
                </span>
            </div>
            <div className="divide-y divide-slate-100">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-1.5">
                        <span className="text-[12px] text-slate-500">{r.label}</span>
                        <span className={`text-[12.5px] font-bold tabular-nums ${r.val ? 'text-slate-800' : 'text-slate-300'}`}>
                            {loading ? '—' : formatCurrency(r.val)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const METHOD_OPTIONS = [
    { v: 'cash', label: 'Cash' },
    { v: 'bank_transfer', label: 'Bank Transfer' },
    { v: 'check', label: 'Check' },
    { v: 'mobile_wallet', label: 'Digital Wallet' },
    { v: 'other', label: 'Other' },
];

function CreateView({ onClose, onSuccess, categories, warehouses = [], isSuperAdmin = false }: any) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ amount?: string; category?: string; warehouse_id?: string }>({});
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

    const set = (f: string, v: any) => {
        setFormData(prev => ({ ...prev, [f]: v }));
        setErrors(prev => (prev as any)[f] ? { ...prev, [f]: undefined } : prev);
    };

    const isIncome = formData.payment_type === 'inbound';
    const amountNum = Number(formData.amount || 0);
    const modeLabel = METHOD_OPTIONS.find(m => m.v === formData.method)?.label || 'Cash';

    const validate = () => {
        const e: typeof errors = {};
        if (!formData.amount || amountNum <= 0) e.amount = 'Enter an amount greater than 0';
        if (!formData.category) e.category = 'Choose a category';
        if (!isSuperAdmin && !formData.warehouse_id) e.warehouse_id = 'Select a branch';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            await paymentService.create(formData);
            onSuccess();
        } catch (error) { toast.error("Failed to save payment"); } finally { setLoading(false); }
    };

    const errCls = (f: keyof typeof errors) => (errors[f] ? ' !border-rose-400 !ring-1 !ring-rose-200' : '');
    const Lbl = ({ icon: Icon, children, required }: any) => (
        <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700 mb-1.5">
            <Icon size={12} className="text-slate-400" /> {children}
            {required && <span className="text-rose-500">*</span>}
        </label>
    );

    return (
        <Card className="overflow-hidden text-left mb-6 shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><Wallet size={18} /></div>
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight leading-none">New Payment</h2>
                        <p className="text-[11.5px] text-slate-500 mt-1">Record money coming in or going out of the business.</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                    {/* ── Hero: type + amount + live preview ── */}
                    <div className={`rounded-2xl p-5 border transition-colors ${isIncome ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'}`}>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-slate-200 mb-5">
                            <button type="button" onClick={() => set('payment_type', 'inbound')}
                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${isIncome ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <TrendingUp size={14} /> Income
                            </button>
                            <button type="button" onClick={() => set('payment_type', 'outbound')}
                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all ${!isIncome ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <TrendingDown size={14} /> Expense
                            </button>
                        </div>

                        <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Amount (PKR)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rs.</span>
                            <input
                                type="number" step="0.01" min="0" inputMode="decimal"
                                value={formData.amount}
                                onChange={e => set('amount', e.target.value)}
                                placeholder="0.00"
                                className={`w-full h-12 pl-11 pr-3 bg-white border rounded-xl text-[20px] font-black tabular-nums outline-none focus:ring-2 transition-all ${isIncome ? 'border-emerald-200 text-emerald-700 focus:ring-emerald-200' : 'border-rose-200 text-rose-600 focus:ring-rose-200'}${errCls('amount')}`}
                            />
                        </div>
                        {errors.amount && <p className="text-[10.5px] text-rose-600 mt-1 font-semibold">{errors.amount}</p>}

                        <div className="mt-5 pt-4 border-t border-slate-200/70 text-center">
                            <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest">You are recording</p>
                            <p className={`text-[24px] font-black tabular-nums mt-0.5 ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isIncome ? '+' : '-'}{formatCurrency(amountNum)}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                <span className={`font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>{isIncome ? 'Income' : 'Expense'}</span>
                                {' · '}{modeLabel}{' · '}{formatDate(formData.date)}
                            </p>
                        </div>
                    </div>

                    {/* ── Details ── */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Lbl icon={Tag} required>Category</Lbl>
                                <select value={formData.category} onChange={e => set('category', e.target.value)} className={inputCls + " cursor-pointer" + errCls('category')}>
                                    <option value="">Select…</option>
                                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {errors.category && <p className="text-[10.5px] text-rose-600 mt-1 font-semibold">{errors.category}</p>}
                            </div>
                            <div>
                                <Lbl icon={Wallet}>Payment Mode</Lbl>
                                <select value={formData.method} onChange={e => set('method', e.target.value)} className={inputCls + " cursor-pointer"}>
                                    {METHOD_OPTIONS.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <Lbl icon={User}>Name (Person / Company)</Lbl>
                            <input type="text" value={formData.payer_payee} onChange={e => set('payer_payee', e.target.value)} placeholder="Who paid / was paid" className={inputCls} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Lbl icon={Calendar}>Date</Lbl>
                                <input type="date" value={formData.date} onChange={e => set('date', e.target.value)} className={inputCls + " cursor-pointer"} />
                            </div>
                            <div>
                                <Lbl icon={Building2} required={!isSuperAdmin}>Branch</Lbl>
                                {lockBranch ? (
                                    <div className={inputCls + " flex items-center bg-slate-50 text-slate-700 font-semibold"}>
                                        {warehouses[0]?.name || 'Your branch'}
                                    </div>
                                ) : (
                                    <>
                                        <select value={formData.warehouse_id} onChange={e => set('warehouse_id', e.target.value)} className={inputCls + " cursor-pointer" + errCls('warehouse_id')}>
                                            <option value="">{isSuperAdmin ? 'All / Unassigned' : 'Select branch…'}</option>
                                            {warehouses.map((w: any) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                                        </select>
                                        {errors.warehouse_id && <p className="text-[10.5px] text-rose-600 mt-1 font-semibold">{errors.warehouse_id}</p>}
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <Lbl icon={Hash}>Reference #</Lbl>
                            <input type="text" value={formData.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Voucher or Invoice # (optional)" className={inputCls} />
                        </div>

                        <div>
                            <Lbl icon={FileText}>Note (Internal)</Lbl>
                            <textarea rows={2} value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Additional details… (optional)" className={inputCls + " h-[56px] resize-none py-2"} />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-400 hidden sm:block">Fields marked <span className="text-rose-500 font-bold">*</span> are required.</p>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button type="button" variant="ghost" onClick={onClose}>Discard</Button>
                        <Button type="submit" variant="primary" disabled={loading} className="min-w-[150px]">
                            {loading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Plus size={14} /> Save Payment</>}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}
