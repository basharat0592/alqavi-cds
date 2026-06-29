'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Loader2, Search, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { isDone, isDelivered, isCancelled, isReturned, upper } from '@/lib/deliveryStats';

const TABS = [
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'returned', label: 'Returned' },
    { id: 'all', label: 'All Records' },
];

const statusPill = (s: string) => {
    const u = upper(s);
    if (u === 'DELIVERED') return 'bg-[#007600] text-white';
    if (u === 'CANCELLED' || u === 'REJECTED') return 'bg-red-50 text-red-700';
    if (u === 'RETURNED') return 'bg-gray-100 text-gray-600';
    return 'bg-[#FFD814]/20 text-[#111]';
};

export default function DeliveryHistoryPage() {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('completed');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await riderService.myDeliveries();
            setResults((d?.results || []).filter((o: any) => isDone(o.status)));
        } catch { toast.error('Failed to load history'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = results.filter((o) => {
        const q = search.toLowerCase();
        const matches = !q ||
            `${o.order_number || ''} ${o.tracking_id || ''}`.toLowerCase().includes(q) ||
            (o.customer_display_name || o.customer_name || '').toLowerCase().includes(q) ||
            (o.shipping_address || '').toLowerCase().includes(q);
        if (!matches) return false;
        if (activeTab === 'completed') return isDelivered(o.status);
        if (activeTab === 'cancelled') return isCancelled(o.status);
        if (activeTab === 'returned') return isReturned(o.status);
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-normal text-[#111]">Delivery History</h1>
                    <p className="text-sm text-gray-500 mt-1">Your completed and cancelled deliveries.</p>
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
                        <ClipboardList className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-[#111]">No history yet.</h3>
                    <p className="text-sm text-gray-600 mt-2">Completed deliveries will appear here.</p>
                </div>
            ) : (
                <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Order #</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {filtered.map((o) => (
                                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                                        {o.created_at ? formatDateTime(o.created_at) : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#111]">{o.order_number || o.tracking_id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{o.customer_display_name || o.customer_name || 'Customer'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[260px]">
                                        <span className="flex items-start gap-1.5"><MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" /> <span className="truncate">{o.shipping_address || '—'}</span></span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusPill(o.status)}`}>
                                            {o.status_display || o.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#B12704] text-right whitespace-nowrap">{formatCurrency(o.total_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
