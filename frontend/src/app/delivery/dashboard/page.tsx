'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Package, CheckCircle, Truck, Clock, MapPin, Phone, Loader2, RefreshCw, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency } from '@/lib/utils';

const FILTERS = ['ALL', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const statusTone = (s: string) => {
    const u = (s || '').toUpperCase();
    if (u === 'DELIVERED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (u === 'SHIPPED') return 'bg-sky-50 text-sky-700 border-sky-200';
    if (u === 'CANCELLED' || u === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
};

export default function DeliveryDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ rider: {}, stats: {}, results: [] });
    const [filter, setFilter] = useState('ALL');
    const [updating, setUpdating] = useState<string | null>(null);

    const load = useCallback(async (f = filter, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const d = await riderService.myDeliveries(f === 'ALL' ? undefined : f);
            setData(d || { rider: {}, stats: {}, results: [] });
        } catch { toast.error('Failed to load deliveries'); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { load(filter); }, [filter, load]);

    const setStatus = async (orderId: string, status: string) => {
        setUpdating(orderId + status);
        try {
            await riderService.updateStatus(orderId, status);
            toast.success(`Marked ${status.toLowerCase()}`);
            load(filter, true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Update failed');
        } finally { setUpdating(null); }
    };

    const s = data.stats || {};
    const STATS = [
        { label: 'Total', value: s.total || 0, icon: Package, color: 'text-slate-900' },
        { label: 'In Progress', value: s.in_progress || 0, icon: Clock, color: 'text-amber-600' },
        { label: 'Delivered', value: s.delivered || 0, icon: CheckCircle, color: 'text-emerald-600' },
        { label: 'Cancelled', value: s.cancelled || 0, icon: XCircle, color: 'text-rose-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">My Deliveries</h2>
                    <p className="text-[12.5px] text-slate-500">
                        {data.rider?.vehicle_type ? `${data.rider.vehicle_type}${data.rider.vehicle_number ? ` · ${data.rider.vehicle_number}` : ''}` : 'Assigned orders to deliver'}
                    </p>
                </div>
                <button onClick={() => load(filter)} className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {STATS.map((st, i) => (
                    <div key={i} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center gap-2 mb-1.5">
                            <st.icon size={15} className="text-slate-400" />
                            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">{st.label}</p>
                        </div>
                        <p className={`text-[22px] font-bold tabular-nums ${st.color}`}>{st.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-4 h-9 rounded-lg text-[12px] font-bold border transition-all ${filter === f ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Orders */}
            {loading && (data.results || []).length === 0 ? (
                <div className="py-24 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : (data.results || []).length === 0 ? (
                <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center">
                    <Truck size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-[13px] text-slate-400 font-medium">No deliveries assigned in this view.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {(data.results || []).map((o: any) => {
                        const u = (o.status || '').toUpperCase();
                        const done = u === 'DELIVERED' || u === 'CANCELLED' || u === 'REJECTED';
                        return (
                            <div key={o.id} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-bold text-indigo-600">#{o.order_number || o.tracking_id}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusTone(o.status)}`}>{o.status_display || o.status}</span>
                                        </div>
                                        <p className="text-[13px] font-semibold text-slate-800 mt-1.5">{o.customer_display_name || o.customer_name || 'Customer'}</p>
                                        <p className="text-[12px] text-slate-500 flex items-center gap-1.5 mt-0.5"><MapPin size={12} className="text-slate-400 shrink-0" /> {o.shipping_address || '—'}</p>
                                        {o.phone_number && o.phone_number !== 'N/A' && (
                                            <a href={`tel:${o.phone_number}`} className="text-[12px] text-indigo-600 font-semibold flex items-center gap-1.5 mt-0.5"><Phone size={12} /> {o.phone_number}</a>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[16px] font-bold text-slate-900 tabular-nums">{formatCurrency(o.total_amount)}</p>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{o.payment_method}</p>
                                    </div>
                                </div>

                                {!done && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                        {u !== 'SHIPPED' && (
                                            <button onClick={() => setStatus(o.id, 'SHIPPED')} disabled={!!updating}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-[12px] font-bold hover:bg-sky-100 disabled:opacity-50">
                                                {updating === o.id + 'SHIPPED' ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />} Out for Delivery
                                            </button>
                                        )}
                                        <button onClick={() => setStatus(o.id, 'DELIVERED')} disabled={!!updating}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 disabled:opacity-50">
                                            {updating === o.id + 'DELIVERED' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Mark Delivered
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
