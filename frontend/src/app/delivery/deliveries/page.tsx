'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { CheckCircle, Truck, MapPin, Phone, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { isDone, upper } from '@/lib/deliveryStats';

const TABS = [
    { id: 'active', label: 'Active Deliveries' },
    { id: 'all', label: 'Assigned Orders' },
];

const statusPill = (s: string) => {
    const u = upper(s);
    if (u === 'DELIVERED') return 'bg-[#007600] text-white';
    if (u === 'CANCELLED' || u === 'REJECTED') return 'bg-red-50 text-red-700';
    if (u === 'SHIPPED') return 'bg-sky-50 text-sky-700';
    return 'bg-[#FFD814]/20 text-[#111]';
};

export default function MyDeliveriesPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({ rider: {}, stats: {}, results: [] });
    const [activeTab, setActiveTab] = useState('active');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const d = await riderService.myDeliveries();
            setData(d || { rider: {}, stats: {}, results: [] });
        } catch { toast.error('Failed to load deliveries'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (orderId: string, status: string) => {
        setUpdating(orderId + status);
        try {
            await riderService.updateStatus(orderId, status);
            toast.success(`Marked ${status.toLowerCase()}`);
            load(true);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Update failed');
        } finally { setUpdating(null); }
    };

    const results: any[] = data.results || [];
    const filtered = results.filter((o) => {
        const q = search.toLowerCase();
        const matches = !q ||
            `${o.order_number || ''} ${o.tracking_id || ''}`.toLowerCase().includes(q) ||
            (o.customer_display_name || o.customer_name || '').toLowerCase().includes(q) ||
            (o.shipping_address || '').toLowerCase().includes(q);
        if (!matches) return false;
        if (activeTab === 'active') return !isDone(o.status);
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-normal text-[#111]">My Deliveries</h1>
                    <p className="text-sm text-gray-500 mt-1">Orders assigned to you — update each as you deliver.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, name, address..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-8 pl-9 pr-3 bg-white border border-[#D5D9D9] rounded-md text-sm text-[#111] outline-none focus:border-[#F59E0B] shadow-inner"
                    />
                </div>
            </div>

            <div className="flex items-center gap-10 border-b border-[#D5D9D9] text-sm overflow-x-auto whitespace-nowrap">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-1 transition-all relative font-medium ${activeTab === tab.id
                            ? 'text-[#C45500] border-b-2 border-[#C45500] font-bold'
                            : 'text-gray-600 hover:text-[#111]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading && results.length === 0 ? (
                <div className="py-24 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-[#D5D9D9]">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-[#111]">No deliveries here.</h3>
                    <p className="text-sm text-gray-600 mt-2">Assigned deliveries will appear in this view.</p>
                </div>
            ) : (
                <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {filtered.map((o) => {
                                const done = isDone(o.status);
                                const u = upper(o.status);
                                return (
                                    <Fragment key={o.id}>
                                        <tr className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{o.created_at ? formatDateTime(o.created_at) : '—'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-[#111]">{o.order_number || o.tracking_id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{o.customer_display_name || o.customer_name || 'Customer'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusPill(o.status)}`}>{o.status_display || o.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-[#B12704]">{formatCurrency(o.total_amount)}</td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button onClick={() => setExpandedId(expandedId === o.id ? null : o.id)} className="text-xs font-bold text-[#007185] hover:text-[#C45500] hover:underline">
                                                    {expandedId === o.id ? 'Hide' : 'Details'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === o.id && (
                                            <tr className="bg-gray-50 border-t border-[#D5D9D9]">
                                                <td colSpan={6} className="px-12 py-6">
                                                    <div className="grid md:grid-cols-2 gap-8 text-sm animate-in slide-in-from-top-2 duration-300">
                                                        <div className="space-y-3.5">
                                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Customer & Delivery Details</p>
                                                            <p className="text-slate-900 font-bold text-[14px]">
                                                                {o.customer_display_name || o.customer_name || 'Walk-in Customer'}
                                                            </p>
                                                            <p className="text-slate-750 flex items-start gap-2 text-[13px] font-medium leading-relaxed">
                                                                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                                                {o.shipping_address || 'Walk-in Store Selection'}
                                                            </p>
                                                            {((o.phone_number && o.phone_number !== 'N/A') || o.customer_phone) && (
                                                                <a
                                                                    href={`tel:${o.phone_number && o.phone_number !== 'N/A' ? o.phone_number : o.customer_phone}`}
                                                                    className="text-indigo-600 font-bold flex items-center gap-1.5 hover:text-indigo-800 hover:underline w-max text-[13px]"
                                                                >
                                                                    <Phone size={13} />
                                                                    {o.phone_number && o.phone_number !== 'N/A' ? o.phone_number : o.customer_phone}
                                                                </a>
                                                            )}
                                                            <div className="h-px bg-slate-200/60 my-1" />
                                                            <p className="text-slate-550 text-[11px] font-bold uppercase tracking-wider">
                                                                Payment Method: <span className="text-slate-800">{o.payment_method || '—'}</span>
                                                            </p>
                                                            <p className="text-[#007600] text-[13.5px] font-extrabold flex items-center gap-1.5">
                                                                <span>Delivery Cost (Your Earnings):</span>
                                                                <span className="tabular-nums font-black">{formatCurrency(Number(o.shipping_cost ?? 0) > 0 ? Number(o.shipping_cost) : 150)}</span>
                                                            </p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <p className="text-xs text-gray-500 font-bold uppercase">Proof of Delivery</p>
                                                            {done ? (
                                                                <p className="text-sm text-gray-500 italic">This delivery is {(o.status_display || o.status || '').toLowerCase()}.</p>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {u !== 'SHIPPED' && (
                                                                        <button onClick={() => setStatus(o.id, 'SHIPPED')} disabled={!!updating}
                                                                            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md border border-sky-200 bg-sky-50 text-sky-700 text-[12px] font-bold hover:bg-sky-100 disabled:opacity-50">
                                                                            {updating === o.id + 'SHIPPED' ? <Loader2 size={13} className="animate-spin" /> : <Truck size={13} />} Out for Delivery
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => setStatus(o.id, 'DELIVERED')} disabled={!!updating}
                                                                        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-[#007600] text-white text-[12px] font-bold hover:bg-[#005c00] disabled:opacity-50">
                                                                        {updating === o.id + 'DELIVERED' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Mark Delivered
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
