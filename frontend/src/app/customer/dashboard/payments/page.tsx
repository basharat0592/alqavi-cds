'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { salesService } from '@/lib/api';
import { installmentService } from '@/services/payment.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { CreditCard, Clock, Calendar, AlertTriangle, ShieldCheck, X, Upload, Loader2, Search } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';

export default function CustomerPaymentsPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('bills'); // 'bills' or 'ledger'
    const [orders, setOrders] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // Search and Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');

    // Modal state for submitting payment
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('bank_transfer');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [slip, setSlip] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination to page 1 when any filter or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, dateFilter, methodFilter, activeTab]);

    async function loadData() {
        try {
            // 1. Fetch all orders
            const data = await salesService.getOrders();
            // Filter out cancelled orders for listing
            const activeOrders = data.filter((o: any) => o.status.toUpperCase() !== 'CANCELLED');
            setOrders(activeOrders);

            // 2. Fetch all warehouses/branches
            try {
                const whs = await inventoryService.getPublicBranches();
                setWarehouses(whs || []);
            } catch (whErr) {
                console.error("Failed to load warehouses", whErr);
            }

            // 3. Compile all payments (Checkout + Installments)
            const flatPayments: any[] = [];

            data.forEach((order: any) => {
                const paid = Number(order.amount_paid || 0);
                if (paid > 0) {
                    flatPayments.push({
                        id: `checkout-${order.id}`,
                        created_at: order.created_at,
                        paid_at: order.created_at,
                        reference: 'Checkout Settle',
                        method: order.payment_method || 'Cash',
                        amount: paid,
                        created_by_name: 'Checkout System',
                        order_number: order.order_number,
                        tracking_id: order.tracking_id,
                        order_id: order.id,
                        status: 'confirmed'
                    });
                }
            });

            // Fetch installments for all orders
            const paymentsPromises = data.map(async (order: any) => {
                try {
                    const items = await installmentService.list('order', order.id);
                    return items.map((it: any) => ({
                        ...it,
                        order_number: order.order_number,
                        tracking_id: order.tracking_id,
                        order_id: order.id
                    }));
                } catch {
                    return [];
                }
            });

            const nestedPayments = await Promise.all(paymentsPromises);
            flatPayments.push(...nestedPayments.flat());

            // Sort by date descending
            flatPayments.sort((a: any, b: any) => {
                const tA = new Date(a.paid_at || a.created_at).getTime();
                const tB = new Date(b.paid_at || b.created_at).getTime();
                return tB - tA;
            });

            setPayments(flatPayments);
        } catch (err) {
            console.error("Failed to load customer billing data", err);
        }
    }

    useEffect(() => {
        loadData().finally(() => setLoading(false));
    }, []);

    // Filter billing invoices
    const filteredOrders = orders.filter((o: any) => {
        const matchesSearch = searchQuery ? (
            o.tracking_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
        ) : true;

        const total = Number(o.total_amount || 0);
        const paid = Number(o.amount_paid || 0);
        const remaining = Number(o.remaining_amount ?? (total - paid));
        const isPaid = remaining <= 0;

        let matchesStatus = true;
        if (statusFilter === 'paid') matchesStatus = isPaid;
        if (statusFilter === 'unpaid') matchesStatus = !isPaid;

        let matchesDate = true;
        if (dateFilter !== 'all') {
            const orderDate = new Date(o.created_at);
            const now = new Date();
            if (dateFilter === 'this_month') {
                matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            } else if (dateFilter === 'last_30') {
                const diffTime = Math.abs(now.getTime() - orderDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                matchesDate = diffDays <= 30;
            } else if (dateFilter === 'this_year') {
                matchesDate = orderDate.getFullYear() === now.getFullYear();
            }
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    // Filter payment ledger
    const filteredPayments = payments.filter((p: any) => {
        const matchesSearch = searchQuery ? (
            p.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tracking_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.reference?.toLowerCase().includes(searchQuery.toLowerCase())
        ) : true;

        let matchesMethod = true;
        if (methodFilter !== 'all') {
            matchesMethod = p.method?.toLowerCase() === methodFilter;
        }

        let matchesDate = true;
        if (dateFilter !== 'all') {
            const payDate = new Date(p.paid_at || p.created_at);
            const now = new Date();
            if (dateFilter === 'this_month') {
                matchesDate = payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
            } else if (dateFilter === 'last_30') {
                const diffTime = Math.abs(now.getTime() - payDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                matchesDate = diffDays <= 30;
            } else if (dateFilter === 'this_year') {
                matchesDate = payDate.getFullYear() === now.getFullYear();
            }
        }

        return matchesSearch && matchesMethod && matchesDate;
    });

    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPagesOrders = Math.ceil(filteredOrders.length / itemsPerPage) || 1;

    const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPagesPayments = Math.ceil(filteredPayments.length / itemsPerPage) || 1;

    const openPayModal = (order: any) => {
        const total = Number(order.total_amount || 0);
        const paid = Number(order.amount_paid || 0);
        const remaining = Number(order.remaining_amount ?? (total - paid));

        setSelectedOrder(order);
        setAmount(String(remaining));
        setMethod('bank_transfer');
        setSelectedWarehouseId(order.warehouse || order.warehouse_id || '');
        setReference('');
        setNote('');
        setSlip(null);
        setError(null);
        setShowPayModal(true);
    };

    const handlePaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(amount);
        const total = Number(selectedOrder.total_amount || 0);
        const paid = Number(selectedOrder.amount_paid || 0);
        const remaining = Number(selectedOrder.remaining_amount ?? (total - paid));

        if (!amt || amt <= 0) {
            setError('Please enter a valid amount.');
            return;
        }
        if (amt > remaining) {
            setError(`Amount cannot exceed the remaining balance of Rs. ${remaining.toLocaleString()}.`);
            return;
        }
        if (!selectedWarehouseId) {
            setError('Please select a branch.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const fd = new FormData();
            fd.append('source_type', 'order');
            fd.append('source_id', selectedOrder.id);
            fd.append('amount', String(amt));
            fd.append('method', method);
            fd.append('warehouse', selectedWarehouseId);
            fd.append('reference', reference);
            fd.append('note', note);
            fd.append('direction', 'inbound');
            fd.append('status', 'pending'); // pending admin verification
            if (slip) {
                fd.append('slip', slip);
            }

            await installmentService.create(fd);
            setShowPayModal(false);
            setLoading(true);
            await loadData();
        } catch (err: any) {
            setError(err?.response?.data ? JSON.stringify(err.response.data) : 'Failed to submit payment. Please verify your fields.');
        } finally {
            setSubmitting(false);
            setLoading(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-normal text-[#111]">Your Payments</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-10 border-b border-[#D5D9D9] text-sm overflow-x-auto whitespace-nowrap">
                {[
                    { id: 'bills', label: 'Billing Invoices' },
                    { id: 'ledger', label: 'Payment Ledger' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            // Clear filters when tab changes
                            setSearchQuery('');
                            setStatusFilter('all');
                            setDateFilter('all');
                            setMethodFilter('all');
                        }}
                        className={`pb-3 px-1 transition-all relative font-medium ${
                            activeTab === tab.id 
                            ? 'text-[#C45500] border-b-2 border-[#C45500] font-bold' 
                            : 'text-gray-600 hover:text-[#111]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D5D9D9] p-4 rounded-lg text-[13.5px] shadow-sm">
                {/* Search query */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'bills' ? "Search by Order or Tracking ID..." : "Search by ID, Ref, etc..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9.5 pl-9 pr-3 bg-white border border-[#D5D9D9] rounded-md outline-none focus:border-[#F59E0B] shadow-inner text-[13px]"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Status Filter (only for Bills tab) */}
                    {activeTab === 'bills' && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 font-medium">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9.5 px-2.5 bg-white border border-[#D5D9D9] rounded-md outline-none focus:border-[#F59E0B] text-[13px]"
                            >
                                <option value="all">All Statuses</option>
                                <option value="paid">Fully Paid</option>
                                <option value="unpaid">Unpaid / Balance Due</option>
                            </select>
                        </div>
                    )}

                    {/* Method Filter (only for Ledger tab) */}
                    {activeTab === 'ledger' && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-gray-500 font-medium">Method:</span>
                            <select
                                value={methodFilter}
                                onChange={(e) => setMethodFilter(e.target.value)}
                                className="h-9.5 px-2.5 bg-white border border-[#D5D9D9] rounded-md outline-none focus:border-[#F59E0B] capitalize text-[13px]"
                            >
                                <option value="all">All Methods</option>
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="wallet">Mobile Wallet</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                    )}

                    {/* Date Range Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 font-medium">Date:</span>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="h-9.5 px-2.5 bg-white border border-[#D5D9D9] rounded-md outline-none focus:border-[#F59E0B] text-[13px]"
                        >
                            <option value="all">All Dates</option>
                            <option value="this_month">This Month</option>
                            <option value="last_30">Last 30 Days</option>
                            <option value="this_year">This Year</option>
                        </select>
                    </div>

                    {/* Clear Filters (if any are active) */}
                    {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || methodFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setDateFilter('all');
                                setMethodFilter('all');
                            }}
                            className="h-9.5 px-4 bg-white hover:bg-gray-50 text-gray-600 font-bold border border-[#D5D9D9] rounded-md transition-all text-[13px]"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'bills' ? (
                /* Billing Invoices List */
                <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Order #</th>
                                <th className="px-4 py-3">Total Amount</th>
                                <th className="px-4 py-3">Amount Paid</th>
                                <th className="px-4 py-3">Balance</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500 text-xs">
                                        No billing records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((order: any) => {
                                    const total = Number(order.total_amount || 0);
                                    const paid = Number(order.amount_paid || 0);
                                    const remaining = Number(order.remaining_amount ?? (total - paid));
                                    const isPaid = remaining <= 0;
                                    const isPartial = paid > 0 && remaining > 0;

                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors text-[13px]">
                                            <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-[#111]">
                                                {order.tracking_id}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-[#111]">
                                                Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-emerald-600 font-semibold">
                                                Rs. {paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-rose-600 font-bold">
                                                Rs. {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider
                                                    ${isPaid 
                                                        ? 'bg-[#007600] text-white' 
                                                        : isPartial 
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                        : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                    {isPaid ? 'Fully Paid' : isPartial ? 'Partially Paid' : 'Unpaid'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2.5 whitespace-nowrap">
                                                {!isPaid && (
                                                    <button 
                                                        onClick={() => openPayModal(order)}
                                                        className="px-2.5 py-0.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[11px] font-bold text-[#111] rounded shadow-sm transition-all"
                                                    >
                                                        Pay Now
                                                    </button>
                                                )}
                                                <Link 
                                                    href={`/customer/dashboard/orders`}
                                                    className="text-[11px] font-bold text-[#007185] hover:text-[#C45500] hover:underline align-middle"
                                                >
                                                    View Order
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Footer Controls for Orders */}
                    {totalPagesOrders > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border-t border-slate-200 text-[12px] text-slate-500 font-medium text-left">
                            <div className="flex items-center gap-1.5 order-2 sm:order-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of{' '}
                                <span className="font-semibold text-slate-700">{filteredOrders.length}</span> bills
                            </div>
                            <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-355 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-[#111] disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Previous
                                </button>
                                <div className="text-[11.5px] font-extrabold text-slate-800 tracking-wider tabular-nums px-2">
                                    {currentPage} / {totalPagesOrders}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesOrders))}
                                    disabled={currentPage === totalPagesOrders}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-355 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-[#111] disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Payment History Ledger */
                <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Order #</th>
                                <th className="px-4 py-3">Reference</th>
                                <th className="px-4 py-3">Method</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                                        No payments found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors text-[13px]">
                                        <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                                            {formatDateTime(p.paid_at || p.created_at)}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-[#111]">
                                            {p.order_number || p.tracking_id}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                                            {p.reference || 'Checkout Settle'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-200/50 text-[9.5px] font-bold uppercase text-gray-600 rounded">
                                                {p.method || 'Cash'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 text-[9.5px] font-bold uppercase rounded ${
                                                p.status === 'confirmed'
                                                    ? 'bg-emerald-50 text-[#007600] border border-emerald-200'
                                                    : p.status === 'rejected'
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {p.status === 'confirmed' ? 'Confirmed' : p.status === 'rejected' ? 'Rejected' : 'Waiting for Admin Response'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-[#B12704] tabular-nums">
                                            Rs. {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Footer Controls for Payments */}
                    {totalPagesPayments > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border-t border-slate-200 text-[12px] text-slate-500 font-medium text-left">
                            <div className="flex items-center gap-1.5 order-2 sm:order-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredPayments.length)}</span> of{' '}
                                <span className="font-semibold text-slate-700">{filteredPayments.length}</span> payments
                            </div>
                            <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-355 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-[#111] disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Previous
                                </button>
                                <div className="text-[11.5px] font-extrabold text-slate-800 tracking-wider tabular-nums px-2">
                                    {currentPage} / {totalPagesPayments}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesPayments))}
                                    disabled={currentPage === totalPagesPayments}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-355 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-[#111] disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Custom Payment Record Modal */}
            {showPayModal && selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl max-w-lg w-full border border-gray-200 shadow-2xl scale-in-center overflow-hidden">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
                            <button 
                                onClick={() => setShowPayModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg border border-gray-100 text-xs sm:text-sm">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Order Ref</span>
                                    <p className="font-bold text-gray-900">Order #{selectedOrder.tracking_id}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Balance Due</span>
                                    <p className="font-black text-rose-600 text-sm sm:text-base">
                                        Rs. {Number(selectedOrder.remaining_amount ?? (Number(selectedOrder.total_amount) - Number(selectedOrder.amount_paid))).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Amount (PKR)</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-[13px] outline-none focus:border-[#F59E0B] shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Method</label>
                                    <select
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value)}
                                        className="w-full h-10 px-2.5 border border-[#D5D9D9] rounded-md text-[13px] bg-white outline-none focus:border-[#F59E0B]"
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="wallet">Mobile Wallet</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="cash">Cash / CoD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Txn ID / Ref</label>
                                    <input
                                        type="text"
                                        required
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Reference #"
                                        className="w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-[13px] outline-none focus:border-[#F59E0B]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Receipt Slip</label>
                                    <label className="flex items-center justify-center gap-1.5 border border-[#D5D9D9] rounded-md h-10 cursor-pointer hover:bg-gray-50 text-[12px] font-bold text-gray-700 px-3 transition-colors">
                                        <Upload size={14} className="text-gray-500 shrink-0" />
                                        <span className="truncate max-w-[100px]">{slip ? slip.name : 'Upload file'}</span>
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={(e) => setSlip(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Branch Selection Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Select Branch</label>
                                <select
                                    value={selectedWarehouseId}
                                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    required
                                    className="w-full h-10 px-2.5 border border-[#D5D9D9] rounded-md text-[13px] bg-white outline-none focus:border-[#F59E0B]"
                                >
                                    <option value="" disabled>Choose a branch...</option>
                                    {warehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name} {wh.city ? `(${wh.city})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full h-10 px-3 border border-[#D5D9D9] rounded-md text-[13px] outline-none focus:border-[#F59E0B]"
                                    placeholder="e.g. Bank name, branch..."
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-md text-xs text-red-600 font-semibold flex items-start gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPayModal(false)}
                                    className="flex-1 h-10 border border-[#D5D9D9] text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-all text-xs sm:text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 h-10 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-gray-900 font-bold rounded-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
                                >
                                    {submitting ? <Loader2 size={15} className="animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
