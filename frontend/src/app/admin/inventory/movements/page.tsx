"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, RefreshCw, ShoppingCart, Truck, 
    ArrowRightLeft, History, Download, ChevronLeft,
    Package, Calendar, MapPin
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const StatusPill = ({ type }: { type: string }) => {
    let bg = 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-white/10';
    const text = type || 'Unknown';

    if (text === 'Purchase') bg = 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
    else if (text === 'Sale') bg = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
    else if (text.includes('Transfer')) bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    else if (text === 'Adjustment') bg = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
    else if (text === 'Return') bg = 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20';

    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${bg}`}>
            {text}
        </span>
    );
};

export default function StockMovementsPage() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [movData, whData] = await Promise.all([
                inventoryService.getMovements(),
                inventoryService.getWarehouses()
            ]);
            setMovements(movData || []);
            setWarehouses(whData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = movements.filter(m => {
        const matchesSearch =
            (m.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = !filterType || m.movement_type === filterType;
        const matchesWarehouse = !selectedWarehouse || String(m.warehouse) === String(selectedWarehouse);
        return matchesSearch && matchesType && matchesWarehouse;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Movement Ledger</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Global transaction log of all inventory shifts</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                        <Download className="h-4 w-4" />
                        Export Ledger
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search product or reference..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="">All Transactions</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Sale">Sale</option>
                    <option value="Transfer In">Transfer In</option>
                    <option value="Transfer Out">Transfer Out</option>
                    <option value="Adjustment">Adjustment</option>
                    <option value="Return">Return</option>
                </select>
                <select
                    value={selectedWarehouse}
                    onChange={e => setSelectedWarehouse(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="">All Node Locations</option>
                    {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                </select>
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Date & Time</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Reference</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Product</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Qty</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Warehouse</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <History className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No movement history discovered.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[#F59E0B] font-semibold">#{m.reference_id || 'ADJ-XXX'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill type={m.movement_type} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                    {m.product_image ? (
                                                        <img src={m.product_image} alt="" className="w-full h-full object-cover" />
                                                    ) : <Package className="h-4 w-4 text-slate-400" />}
                                                </div>
                                                <div className="truncate max-w-[150px]">
                                                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{m.product_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`font-bold flex items-center gap-1 ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                <MapPin className="h-3.5 w-3.5 text-slate-300" />
                                                <span>{m.warehouse_name || 'Generic Node'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}

