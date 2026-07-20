'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Loader2, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { riderService } from '@/services/delivery.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { isDone, isDelivered, isCancelled, isReturned, upper } from '@/lib/deliveryStats';

const TABS = [
    { id: 'completed', label: 'Completed' },
    // Cancelled deliveries (customer cancelled at the door) are shown as Returns.
    { id: 'returned', label: 'Returned' },
    { id: 'all', label: 'All Records' },
];

const statusPill = (s: string) => {
    const u = upper(s);
    if (u === 'DELIVERED') return 'bg-[#007600] text-white';
    // Cancelled deliveries are surfaced as Returns here → gray "returned" styling.
    if (u === 'CANCELLED' || u === 'REJECTED' || u === 'RETURNED') return 'bg-gray-100 text-gray-600';
    return 'bg-[#FFD814]/20 text-[#111]';
};

export default function DeliveryHistoryPage() {
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('completed');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const d = await riderService.myDeliveries();
            setResults((d?.results || []).filter((o: any) => isDone(o.status)));
        } catch { toast.error('Failed to load history'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Reset to the first page whenever the filters change.
    useEffect(() => { setCurrentPage(1); }, [search, activeTab]);

    const filtered = results.filter((o) => {
        const q = search.toLowerCase();
        const matches = !q ||
            `${o.order_number || ''} ${o.tracking_id || ''}`.toLowerCase().includes(q) ||
            (o.customer_display_name || o.customer_name || '').toLowerCase().includes(q) ||
            (o.shipping_address || '').toLowerCase().includes(q);
        if (!matches) return false;
        if (activeTab === 'completed') return isDelivered(o.status);
        // A cancelled delivery = goods came back → shown under Returned.
        if (activeTab === 'returned') return isReturned(o.status) || isCancelled(o.status);
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const page = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-3 sm:pb-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#111]">Delivery History</h1>
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
                <div className="space-y-2.5">
                    {paginated.map((o) => (
                        <div key={o.id} className="bg-white border border-[#D5D9D9] rounded-xl shadow-sm px-4 py-3.5 flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[14px] font-bold text-[#111]">#{o.order_number || o.tracking_id}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${statusPill(o.status)}`}>
                                        {isCancelled(o.status) ? 'Returned' : (o.status_display || o.status)}
                                    </span>
                                </div>
                                <p className="text-[12.5px] text-gray-700 font-semibold mt-1 truncate">{o.customer_display_name || o.customer_name || 'Customer'}</p>
                                <p className="text-[11.5px] text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={11} className="shrink-0" /> <span className="truncate">{o.shipping_address || '—'}</span></p>
                                <p className="text-[10.5px] text-gray-400 mt-1">{o.created_at ? formatDateTime(o.created_at) : '—'}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[14px] font-bold text-[#B12704] tabular-nums">{formatCurrency(o.total_amount)}</p>
                            </div>
                        </div>
                    ))}

                    {/* Pagination — 10 per page (mobile + desktop) */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-2 pt-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="inline-flex items-center gap-1 h-9 px-3.5 rounded-lg border border-[#D5D9D9] bg-white text-[12.5px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={15} /> Prev
                            </button>
                            <span className="text-[12px] font-semibold text-gray-500 tabular-nums">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="inline-flex items-center gap-1 h-9 px-3.5 rounded-lg border border-[#D5D9D9] bg-white text-[12.5px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Next <ChevronRight size={15} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
