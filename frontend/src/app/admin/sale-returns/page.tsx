'use client';

import { useState } from 'react';
import {
    Package, RefreshCcw, Search, X, Eye, Printer,
    Filter, RefreshCw, AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

// ── Status pill ───────────────────────────────────────────────────────────────
const statusStyle: Record<string, string> = {
    pending:    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    authorized: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    resolved:   'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    rejected:   'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
};
const StatusPill = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase();
    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${statusStyle[s] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {status}
        </span>
    );
};

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_RETURNS = [
    {
        id: 'RET-9021', order_id: 'ORD-8821', customer: 'Sarah Ahmed',
        date: '2024-03-20T10:30:00',
        items: [
            { id: 1, name: 'Hydrating Serum', quantity: 2, price: 2400, reason: 'Damaged packaging' },
            { id: 2, name: 'Night Cream', quantity: 1, price: 3500, reason: 'Wrong variant' },
        ],
        status: 'pending', total_value: 8300, auth_agent: 'System',
    },
    {
        id: 'RET-8955', order_id: 'ORD-7712', customer: 'Zubair Khan',
        date: '2024-03-18T14:45:00',
        items: [
            { id: 3, name: 'Matte Lipstick', quantity: 5, price: 1200, reason: 'Defective applicator' },
        ],
        status: 'authorized', total_value: 6000, auth_agent: 'Admin',
    },
];

// ── Return Detail Modal ───────────────────────────────────────────────────────
function ReturnDetailModal({ returnData, onClose }: { returnData: any; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-2xl w-full max-h-[90vh] shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Return #{returnData.id}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Return request details</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Order ID', value: returnData.order_id },
                            { label: 'Customer', value: returnData.customer },
                            { label: 'Status', value: <StatusPill status={returnData.status} /> },
                            { label: 'Total Value', value: <span className="text-base font-bold text-[#F59E0B]">{formatCurrency(returnData.total_value)}</span> },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/10">
                                <p className="text-xs text-slate-500 mb-1">{label}</p>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Items */}
                    <div className="border border-slate-100 dark:border-white/10 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-left">Product</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-center">Qty</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-left">Reason</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-right">Refund</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {returnData.items.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600">{item.quantity}</td>
                                        <td className="px-4 py-2.5 text-slate-500 text-xs">{item.reason}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                        Close
                    </button>
                    {returnData.status === 'pending' && (
                        <button className="px-4 py-2 text-sm font-medium text-white bg-[#F59E0B] hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
                            Authorize Return
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaleReturnsPage() {
    const [returns] = useState(MOCK_RETURNS);
    const [loading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedReturn, setSelectedReturn] = useState<any>(null);

    const filtered = returns.filter(r => {
        const matchesSearch =
            r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.order_id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || r.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Return Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage customer return requests and refunds</p>
                </div>
                <button className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-all w-fit" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by return ID, customer, or order..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="All">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="authorized">Authorized</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Return ID</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Order ID</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Customer</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Date</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">Value</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <Package className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">No return requests found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-[#F59E0B] font-medium">{r.id}</span>
                                            <p className="text-xs text-slate-400">{formatDate(r.date, { dateStyle: 'medium' })}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-600 dark:text-slate-400 text-sm">{r.order_id}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{r.customer}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-500 text-sm">{formatDate(r.date, { dateStyle: 'medium' })}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={r.status} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(r.total_value)}</span>
                                            <p className="text-xs text-slate-400">{r.items.length} item{r.items.length !== 1 ? 's' : ''}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end items-center gap-1">
                                                <button
                                                    onClick={() => setSelectedReturn(r)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-[#F59E0B] hover:bg-blue-50 dark:hover:bg-[#F59E0B]/10 transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Print">
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedReturn && <ReturnDetailModal returnData={selectedReturn} onClose={() => setSelectedReturn(null)} />}
        </div>
    );
}

