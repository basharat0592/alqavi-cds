'use client';

import { useState, useEffect, useCallback } from 'react';
import { Boxes, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

export default function SupplierInventory() {
    const [filter, setFilter] = useState('all');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInventory = useCallback(async () => {
        try {
            const { data } = await api.get('/v1/inventory/', { params: { all_items: 'true' } });
            setInventory(Array.isArray(data) ? data : data.results || []);
        } catch {
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const filtered = inventory.filter(item => {
        const qty = parseFloat(item.quantity_available || 0);
        const reorder = parseFloat(item.reorder_level || 0);
        if (filter === 'all') return true;
        if (filter === 'in stock') return qty > reorder;
        if (filter === 'low stock') return qty > 0 && qty <= reorder;
        if (filter === 'stock out') return qty <= 0;
        return true;
    });

    const TABS = ['all', 'in stock', 'low stock', 'stock out'];

    const getStatus = (item: any) => {
        const qty = parseFloat(item.quantity_available || 0);
        const reorder = parseFloat(item.reorder_level || 0);
        if (qty <= 0) return { label: 'STOCK OUT', color: 'text-red-600' };
        if (qty <= reorder) return { label: 'LOW STOCK', color: 'text-amber-600' };
        return { label: 'IN STOCK', color: 'text-emerald-600' };
    };

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-medium text-slate-900 mb-5">Warehouse Status</h1>

                {/* Filter Tabs */}
                <div className="flex gap-8 border-b border-gray-200">
                    {TABS.map(t => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${filter === t ? 'border-[#F7CA00] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
                            {t === 'all' ? 'Inventory Registry' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Count */}
            {!loading && (
                <p className="text-sm text-slate-600 mb-5 font-medium">
                    <span className="font-bold">{filtered.length} items</span> in your warehouse
                </p>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm font-medium">Loading inventory...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-gray-200 bg-white rounded-lg">
                    <Boxes className="h-12 w-12 text-gray-200" />
                    <p className="text-sm font-bold text-slate-500">No inventory records found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((item: any) => {
                        const s = getStatus(item);
                        const qty = parseFloat(item.quantity_available || 0);
                        return (
                            <div key={item.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                                {/* Card Header */}
                                <div className="bg-[#f0f2f2] border-b border-gray-300 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                                    <div className="flex gap-8">
                                        <div className="flex flex-col gap-0.5">
                                            <span>Batch</span>
                                            <span className="text-sm font-bold text-slate-800">{item.batch_number || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span>Quantity</span>
                                            <span className={`text-sm font-bold ${qty > 10 ? 'text-slate-800' : 'text-red-600'}`}>
                                                {qty.toLocaleString()} units
                                            </span>
                                        </div>
                                        <div className="hidden sm:flex flex-col gap-0.5">
                                            <span>Warehouse</span>
                                            <span className="text-sm font-bold text-[#007185]">{item.warehouse_name || item.warehouse || '—'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span>Entry # {item.id}</span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-5 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded flex items-center justify-center shrink-0">
                                        <Boxes className="h-6 w-6 text-gray-300" />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${s.color}`}>{s.label}</p>
                                        <p className="text-sm font-bold text-[#007185]">{item.product_name || item.product}</p>
                                        {item.expiry_date && (
                                            <p className="text-xs text-slate-400 mt-0.5">Expires: {new Date(item.expiry_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        )}
                                    </div>
                                    {qty <= (parseFloat(item.reorder_level || 0)) && qty > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs font-bold">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Low Stock Alert
                                        </div>
                                    )}
                                    {qty <= 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-bold">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Out of Stock
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">End of Registry</p>
            </div>
        </div>
    );
}
