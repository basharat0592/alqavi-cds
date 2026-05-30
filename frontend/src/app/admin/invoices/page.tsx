"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Search, Plus, Printer, Eye,
    Download, RefreshCw, ShoppingCart, RotateCcw,
    ShoppingBag, User, Calendar, DollarSign,
    CheckCircle2, Clock, ChevronRight, ArrowUpRight,
    Package, TrendingUp, AlertCircle, Receipt
} from 'lucide-react';
import { orderService, purchaseService, salesService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ── STATUS BADGE ── */
const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; cls: string }> = {
        delivered: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200' },
        paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        unpaid: { label: 'Unpaid', cls: 'bg-red-50 text-red-700 border-red-200' },
        partial: { label: 'Partial', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
        returned: { label: 'Returned', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const s = map[status?.toLowerCase()] || { label: status || '—', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
    return (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${s.cls}`}>
            {s.label}
        </span>
    );
};

/* ── STAT CARD ── */
const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
            <Icon size={16} />
        </div>
        <div>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-[17px] font-bold text-gray-900 leading-tight">{value}</p>
        </div>
    </div>
);

/* ── INVOICE TABLE ── */
const InvoiceTable = ({ rows, onView, type }: { rows: any[]; onView: (id: any) => void; type: string }) => {
    if (rows.length === 0) return (
        <div className="py-16 text-center text-[13px] text-gray-400">No {type} invoices found.</div>
    );
    return (
        <table className="w-full text-left text-[13px]">
            <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-5 py-3">Invoice #</th>
                    <th className="px-5 py-3">{type === 'purchase' ? 'Supplier' : 'Customer'}</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {rows.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-3.5">
                            <span
                                className="font-semibold text-[#007185] hover:underline cursor-pointer"
                                onClick={() => onView(inv.id)}
                            >
                                #{inv.order_number || inv.invoice_number || inv.id?.toString().slice(0, 8)}
                            </span>
                        </td>
                        <td className="px-5 py-3.5">
                            <div className="font-medium text-gray-800">
                                {inv.customer_name || inv.supplier_name || inv.guest_name || 'Walk-in'}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{inv.payment_method || '—'}</div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">
                            <div className="flex items-center gap-1.5 text-[12px]">
                                <Calendar size={11} className="opacity-40" />
                                {formatDate(inv.created_at || inv.date)}
                            </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                            {formatCurrency(inv.total_amount || inv.total || 0)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                            <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end items-center gap-3">
                                <button
                                    onClick={() => onView(inv.id)}
                                    className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-all"
                                >
                                    View
                                </button>
                                <span className="text-gray-200">|</span>
                                <button
                                    className="text-gray-400 hover:text-gray-700 transition-colors"
                                    title="Download"
                                >
                                    <Download size={14} />
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
    const PAGE_SIZE = 10;

    const loadAll = async () => {
        setLoading(true);
        try {
            const [sales, purchases, saleRets, purchaseRets] = await Promise.all([
                orderService.getAll().catch(() => []),
                purchaseService.getAll().catch(() => []),
                salesService.getReturns().catch(() => []),
                purchaseService.getReturns().catch(() => []),
            ]);
            setSaleInvoices(Array.isArray(sales) ? sales : (sales as any)?.results || []);
            setPurchaseInvoices(Array.isArray(purchases) ? purchases : (purchases as any)?.results || []);
            setSaleReturns(Array.isArray(saleRets) ? saleRets : (saleRets as any)?.results || []);
            setPurchaseReturns(Array.isArray(purchaseRets) ? purchaseRets : (purchaseRets as any)?.results || []);
        } catch { toast.error('Failed to load invoices'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadAll(); }, []);

    const tabs = [
        { id: 'sale', label: 'Sales Invoices', icon: ShoppingBag, href: null, count: saleInvoices.length, color: 'text-blue-600 bg-blue-50 border-blue-200' },
        { id: 'purchase', label: 'Purchase Invoices', icon: ShoppingCart, href: null, count: purchaseInvoices.length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        { id: 'sale-return', label: 'Sale Returns', icon: RotateCcw, href: null, count: saleReturns.length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
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

    const totalValue = saleInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
        + purchaseInvoices.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0);

    const tabButtons = [
        { id: 'sale' as const, label: 'Sale Invoice', icon: ShoppingBag, count: saleInvoices.length, active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100', badge: 'bg-blue-500' },
        { id: 'purchase' as const, label: 'Purchase Invoice', icon: ShoppingCart, count: purchaseInvoices.length, active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100', badge: 'bg-emerald-500' },
        { id: 'sale-return' as const, label: 'Sale Return Invoice', icon: RotateCcw, count: saleReturns.length, active: 'bg-amber-500 text-white border-amber-500', inactive: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100', badge: 'bg-amber-400' },
        { id: 'purchase-return' as const, label: 'Purchase Return Invoice', icon: RefreshCw, count: purchaseReturns.length, active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100', badge: 'bg-purple-500' },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
            <div className="max-w-[1300px] mx-auto px-5 md:px-8 pt-7">

                {/* ── BREADCRUMB ── */}
                <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-5">
                    <Link href="/admin/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#e47911] font-semibold">Invoices</span>
                </div>

                {/* ── PAGE HEADER ── */}
                <div className="flex items-start justify-between mb-7">
                    <div>
                        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                            <Receipt size={22} className="text-gray-400" />
                            Invoice Center
                        </h1>
                        <p className="text-[13px] text-gray-400 mt-1">
                            Manage sales, purchase, and return invoices in one place.
                        </p>
                    </div>
                    <button
                        onClick={loadAll}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 h-9 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-all"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

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
                <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">


                    {/* Search + Status Filter */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by invoice # or name..."
                                className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 outline-none focus:border-[#e47911] focus:ring-2 focus:ring-[#e47911]/10 placeholder:text-gray-400 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            {['all', 'delivered', 'processing', 'pending', 'cancelled'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setFilterStatus(s); setPage(1); }}
                                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${filterStatus === s
                                        ? 'bg-[#e47911] text-white'
                                        : 'text-gray-500 hover:bg-gray-100'
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
                            <div className="py-20 flex items-center justify-center gap-2 text-gray-400 text-[13px]">
                                <RefreshCw size={16} className="animate-spin" /> Loading invoices...
                            </div>
                        ) : (
                            <InvoiceTable
                                rows={paginated}
                                type={activeTab.includes('purchase') ? 'purchase' : 'sale'}
                                onView={(id) => {
                                    if (activeTab === 'sale') router.push(`/admin/sales/${id}/invoice`);
                                    else if (activeTab === 'purchase') router.push(`/admin/purchases/${id}`);
                                    else if (activeTab === 'sale-return') router.push(`/admin/sale-returns`);
                                    else router.push(`/admin/purchases/returns`);
                                }}
                            />
                        )}
                    </div>

                    {/* Pagination Footer */}
                    {!loading && filtered.length > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                            <span className="text-[12px] text-gray-400">
                                Showing <span className="font-semibold text-gray-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-gray-700">{filtered.length}</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    ← Previous
                                </button>
                                <span className="text-[12px] text-gray-500 font-medium px-1">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── QUICK LINKS GRID (bottom shortcuts) ── */}
                <div className="mt-8">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">More Invoice Actions</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { label: 'Sales History', desc: 'View all completed sales', href: '/admin/sales', icon: TrendingUp },
                            { label: 'Purchase History', desc: 'View all purchase records', href: '/admin/purchases', icon: Package },
                            { label: 'Sale Returns', desc: 'Manage customer returns', href: '/admin/sale-returns', icon: RotateCcw },
                            { label: 'Purchase Returns', desc: 'Manage supplier returns', href: '/admin/purchases/returns', icon: RefreshCw },
                            { label: 'Order Tracking', desc: 'Track delivery status', href: '/admin/tracking', icon: ShoppingBag },
                            { label: 'Accounting', desc: 'Finance & payment overview', href: '/admin/reports/accounting', icon: DollarSign },
                        ].map(l => {
                            const Icon = l.icon;
                            return (
                                <Link
                                    key={l.href}
                                    href={l.href}
                                    className="flex items-center gap-3.5 px-4 py-3.5 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center shrink-0 group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900 transition-all">
                                        <Icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{l.label}</div>
                                        <div className="text-[11px] text-gray-400">{l.desc}</div>
                                    </div>
                                    <ArrowUpRight size={13} className="text-gray-300 group-hover:text-gray-500 ml-auto shrink-0 transition-colors" />
                                </Link>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
