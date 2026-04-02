"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, RefreshCw, Layers, Calendar, AlertTriangle,
    CheckCircle2, Clock, Package, Warehouse, Boxes,
    ChevronRight, ChevronDown, Download, History
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';

const StatusPill = ({ expiryDate }: { expiryDate: string }) => {
    if (!expiryDate) return (
        <span className="inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize bg-slate-50 text-slate-500 border-slate-200">
            Legacy
        </span>
    );
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let text = 'Active';
    let Icon = CheckCircle2;

    if (diffDays < 0) {
        bg = 'bg-red-50 text-red-600 border-red-200';
        text = 'Expired';
        Icon = AlertTriangle;
    } else if (diffDays <= 30) {
        bg = 'bg-amber-50 text-amber-700 border-amber-200';
        text = 'Expiring Soon';
        Icon = Clock;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${bg}`}>
            <Icon className="h-3 w-3" />
            {text}
        </span>
    );
};

export default function BatchTrackingPage() {
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getBatches();
            setBatches(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = batches.filter(b => {
        const matchesSearch =
            (b.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()));

        if (statusFilter === 'all') return matchesSearch;
        
        const expiry = b.expiry_date ? new Date(b.expiry_date) : null;
        const now = new Date();
        const diffDays = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;

        if (statusFilter === 'active') return matchesSearch && diffDays > 30;
        if (statusFilter === 'expiring') return matchesSearch && diffDays <= 30 && diffDays >= 0;
        if (statusFilter === 'expired') return matchesSearch && diffDays < 0;

        return matchesSearch;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Batch Registry</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Global monitoring of product validity and manufacturing lots</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] hover:border-[#F7CA00]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href="/admin/inventory/batches/add"
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Boxes className="h-4 w-4" />
                        Initialize Batch
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
                        placeholder="Search batch ID or product..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                    <option value="all">Every Validity Status</option>
                    <option value="active">Active Batches</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="expired">Expired Lots</option>
                </select>
            </div>

            {/* ── Results count ── */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {loading ? 'Loading...' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Batch Identifier</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Product Asset</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Expiration Node</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Validity</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Qty in Lot</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Production Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Layers className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No active markers found in registry.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((batch) => (
                                    <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="text-[#F7CA00] font-bold uppercase tracking-tight">#{batch.batch_number}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                                    <Package className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{batch.product_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                                <span>{batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'Non-expiring'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill expiryDate={batch.expiry_date} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {Number(batch.quantity).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-slate-500 dark:text-slate-400 text-xs">
                                                {batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString() : 'N/A'}
                                            </span>
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
