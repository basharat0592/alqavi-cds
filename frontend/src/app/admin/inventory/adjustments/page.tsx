"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, Plus, RefreshCw, History, 
    TrendingUp, AlertCircle, Settings, User, 
    Calendar, Package, MapPin
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';

const StatusPill = ({ type }: { type: string }) => {
    let bg = 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-white/10';
    const isAddition = type === 'Addition' || type === 'Gain';

    if (isAddition) {
        bg = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
    } else {
        bg = 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20';
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${bg}`}>
            {isAddition ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {type}
        </span>
    );
};

export default function StockAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAdjustments();
            setAdjustments(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = adjustments.filter(adj =>
        (adj.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (adj.reason?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (adj.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">System Adjustments</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manual inventory overrides and audit records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href="/admin/inventory/adjustments/add"
                        className="flex items-center gap-2 px-4 py-2 bg-[#EEAF1C] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Log Adjustment
                    </Link>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search product, SKU or reason..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] focus:ring-2 focus:ring-[#EEAF1C]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
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
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Product & Warehouse</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Reason</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Delta</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Executor / Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-16 text-center">
                                        <Settings className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No adjustment overrides found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((adj) => (
                                    <tr key={adj.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                                    <Package className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">{adj.product_name}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                        <span className="font-bold text-[#EEAF1C] uppercase">{adj.product_sku || 'SYS-ID'}</span>
                                                        <span>•</span>
                                                        <span>{adj.warehouse_name || 'Global Node'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill type={adj.adjustment_type} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-slate-700 dark:text-slate-300 font-medium text-xs mb-0.5">{adj.reason}</p>
                                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{adj.notes || 'No supporting commentary'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-bold text-sm ${adj.adjustment_type === 'Addition' || adj.adjustment_type === 'Gain' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {adj.adjustment_type === 'Addition' || adj.adjustment_type === 'Gain' ? '+' : '-'}{Math.abs(Number(adj.quantity)).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                    <User className="h-3 w-3 text-[#EEAF1C]" />
                                                    <span>{adj.user_name || 'Admin'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{new Date(adj.created_at).toLocaleDateString()} • {new Date(adj.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
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

