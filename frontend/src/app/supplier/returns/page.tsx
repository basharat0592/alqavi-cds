'use client';

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Loader2, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import api from '@/lib/axios';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const STATUS_COLOR: Record<string, string> = {
    pending:    'text-amber-600',
    approved:   'text-blue-600',
    resolved:   'text-emerald-600',
    rejected:   'text-red-600',
};

export default function SupplierReturns() {
    const [filter, setFilter] = useState('all');
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReturns = useCallback(async () => {
        try {
            const { data } = await api.get('/v1/sales/purchase-returns/', {
                params: { status: filter === 'all' ? undefined : filter }
            });
            setReturns(Array.isArray(data) ? data : data.results || []);
        } catch {
            setReturns([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchReturns(); }, [fetchReturns]);

    const TABS = ['all', 'pending', 'approved', 'resolved', 'rejected'];

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-medium text-slate-900 mb-5">Returns &amp; RMA</h1>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
                    {TABS.map(t => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 whitespace-nowrap ${filter === t ? 'border-[#F7CA00] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                            {t === 'all' ? 'Return Logs' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Count */}
            {!loading && (
                <p className="text-sm text-slate-600 mb-5 font-medium">
                    <span className="font-bold">{returns.length} returns</span> in this view
                </p>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">Loading returns...</span>
                </div>
            ) : returns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-gray-200 bg-white rounded-lg">
                    <RotateCcw className="h-12 w-12 text-gray-200" />
                    <p className="text-sm font-bold text-slate-500">No return records found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {returns.map((ret: any) => (
                        <div key={ret.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                            {/* Card Header - Amazon Style */}
                            <div className="bg-[#f0f2f2] border-b border-gray-300 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                                <div className="flex gap-8">
                                    <div className="flex flex-col gap-0.5">
                                        <span>Initiated</span>
                                        <span className="text-sm font-bold text-slate-800 normal-case">{fmtDate(ret.created_at)}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span>Refund Amount</span>
                                        <span className="text-sm font-bold text-slate-800">{fmt(parseFloat(ret.total_refund_amount || 0))}</span>
                                    </div>
                                    <div className="hidden sm:flex flex-col gap-0.5">
                                        <span>Reason</span>
                                        <span className="text-sm font-bold text-slate-700 normal-case capitalize">{ret.reason || '—'}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span>RMA # {ret.return_number || ret.id}</span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded flex items-center justify-center shrink-0">
                                    <RotateCcw className="h-6 w-6 text-gray-300" />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${STATUS_COLOR[ret.status] || 'text-slate-600'}`}>
                                        {ret.status || 'Pending'}
                                    </p>
                                    <p className="text-sm font-bold text-[#007185]">
                                        {ret.supplier_name || ret.purchase_order_number || `Return #${ret.id}`}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {ret.items?.length || 0} item{(ret.items?.length || 0) !== 1 ? 's' : ''} returned
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">End of Return Logs</p>
            </div>
        </div>
    );
}
