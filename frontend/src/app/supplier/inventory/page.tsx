'use client';

import { useState, useEffect, useCallback } from 'react';
import { Boxes, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Trash2, Search } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function SupplierInventory() {
    const [filter, setFilter] = useState('all');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/v1/inventory/', { params: { all_items: 'true' } });
            setInventory(Array.isArray(data) ? data : data.results || []);
        } catch {
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to remove this inventory record?")) return;
        try {
            await api.delete(`/v1/inventory/${id}/`);
            toast.success("Inventory record purged.");
            fetchInventory();
        } catch {
            toast.error("Deletion failed.");
        }
    };

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const filtered = inventory.filter(item => {
        const qty = parseFloat(item.quantity_available || 0);
        const reorder = parseFloat(item.reorder_level || 0);
        const name = (item.product_name || '').toLowerCase();
        const matchesSearch = name.includes(search.toLowerCase()) || (item.batch_number || '').toLowerCase().includes(search.toLowerCase());
        
        if (!matchesSearch) return false;
        if (filter === 'all') return true;
        if (filter === 'in stock') return qty > reorder;
        if (filter === 'low stock') return qty > 0 && qty <= reorder;
        if (filter === 'stock out') return qty <= 0;
        return true;
    });

    const TABS = ['all', 'in stock', 'low stock', 'stock out'];

    const getStatusStyles = (item: any) => {
        const qty = parseFloat(item.quantity_available || 0);
        const reorder = parseFloat(item.reorder_level || 0);
        if (qty <= 0) return 'bg-red-50 text-red-600 border-red-100';
        if (qty <= reorder) return 'bg-amber-50 text-amber-600 border-amber-100';
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    };

    return (
        <div className="max-w-[1000px] mx-auto py-8 px-4 animate-in fade-in duration-500 space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouse Registry</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time telemetry for your manufacturing stock levels</p>
                </div>
                <button onClick={() => fetchInventory()} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all">
                    <RefreshCw className={`h-5 w-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search Batch or Product..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-lg outline-none focus:bg-white focus:border-[#F59E0B] transition-all text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {TABS.map(t => (
                        <button 
                            key={t} 
                            onClick={() => setFilter(t)}
                            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${filter === t ? 'bg-[#F59E0B] text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                            <tr>
                                <th className="px-6 py-4">Item Identity</th>
                                <th className="px-6 py-4">Batch Number</th>
                                <th className="px-6 py-4">Stored At</th>
                                <th className="px-6 py-4 text-center">Availability</th>
                                <th className="px-6 py-4 text-center">Protocol</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5"><div className="h-4 bg-slate-50 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">No records found</td></tr>
                            ) : (
                                filtered.map((item) => {
                                    const qty = parseFloat(item.quantity_available || 0);
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">{item.product_name || item.product}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{item.batch_number || 'L-992-X'}</td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">{item.warehouse_name || 'Main Hub'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-black text-sm ${qty <= 0 ? 'text-red-600' : 'text-slate-900'}`}>{qty.toLocaleString()} Units</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getStatusStyles(item)} uppercase tracking-wide`}>
                                                    {qty <= 0 ? 'Out of Stock' : qty <= parseFloat(item.reorder_level || 0) ? 'Low Stock' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-center pt-4">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Inventory Telemetry System v1.0</p>
            </div>
        </div>
    );
}
