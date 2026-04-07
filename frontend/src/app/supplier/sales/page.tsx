'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Loader2, DollarSign } from 'lucide-react';
import api from '@/lib/axios';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

const STATUS_COLOR: Record<string, string> = {
    pending:    'text-amber-600',
    completed:  'text-emerald-600',
    cancelled:  'text-red-600',
    delivered:  'text-emerald-600',
    processing: 'text-blue-600',
};

export default function SupplierSales() {
    const [filter, setFilter] = useState('all');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        try {
            const { data } = await api.get('/v1/sales/orders/', {
                params: { status: filter === 'all' ? undefined : filter }
            });
            const list = Array.isArray(data) ? data : data.results || [];
            setOrders(list);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const TABS = ['all', 'pending', 'processing', 'completed', 'cancelled'];

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-medium text-slate-900 mb-5">Sale Registry</h1>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200 overflow-x-auto">
                    {TABS.map(t => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 whitespace-nowrap ${filter === t ? 'border-[#F7CA00] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                            {t === 'all' ? 'All Orders' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            {!loading && orders.length > 0 && (
                <div className="flex items-center justify-between mb-5 p-4 bg-[#f0f2f2] rounded-lg border border-gray-200">
                    <p className="text-sm text-slate-600 font-medium">
                        <span className="font-bold">{orders.length} orders</span> in this view
                    </p>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <DollarSign className="h-4 w-4 text-[#F7CA00]" />
                        Total: {fmt(totalRevenue)}
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">Loading orders...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-gray-200 bg-white rounded-lg">
                    <TrendingUp className="h-12 w-12 text-gray-200" />
                    <p className="text-sm font-bold text-slate-500">No sales orders found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order: any) => (
                        <div key={order.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                            {/* Card Header - Amazon Style */}
                            <div className="bg-[#f0f2f2] border-b border-gray-300 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                                <div className="flex gap-8">
                                    <div className="flex flex-col gap-0.5">
                                        <span>Order Date</span>
                                        <span className="text-sm font-bold text-slate-800 normal-case">
                                            {fmtDate(order.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span>Total</span>
                                        <span className="text-sm font-bold text-slate-800">{fmt(parseFloat(order.total_amount || 0))}</span>
                                    </div>
                                    <div className="hidden sm:flex flex-col gap-0.5">
                                        <span>Payment</span>
                                        <span className="text-sm font-bold text-slate-800 capitalize">{order.payment_status || '—'}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col gap-0.5">
                                    <span>Order # {order.order_number}</span>
                                    <span className="text-[#007185] font-bold">{order.customer_name || order.guest_name || 'Customer'}</span>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded flex items-center justify-center shrink-0">
                                    <TrendingUp className="h-6 w-6 text-gray-300" />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${STATUS_COLOR[order.status] || 'text-slate-600'}`}>
                                        {order.status}
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} ordered
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">Method: {order.payment_method || '—'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">End of Ledger</p>
            </div>
        </div>
    );
}
