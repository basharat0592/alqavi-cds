"use client";

import React, { useEffect, useState } from 'react';
import {
    Plus, Search, RefreshCw, Trash2, Edit2, Eye,
    Warehouse, X, AlertTriangle, Building2, MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inventoryService } from '@/services/inventory.service';
import toast from 'react-hot-toast';

export default function WarehousesPage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadWarehouses = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getWarehouses();
            setWarehouses(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load warehouses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadWarehouses(); }, []);

    const handleDelete = async () => {
        if (!deleteRow) return;
        setIsSubmitting(true);
        try {
            await inventoryService.deleteWarehouse(deleteRow.id);
            toast.success("Warehouse removed");
            setDeleteRow(null);
            loadWarehouses();
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove warehouse");
        } finally {
            setIsSubmitting(false);
            setDeleteRow(null);
        }
    };

    const filtered = warehouses.filter(wh =>
        (wh.name?.toLowerCase().includes(search.toLowerCase())) ||
        (wh.location?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans text-left">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Warehouses</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage storage locations and logistics hubs</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadWarehouses}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href="/admin/inventory/warehouses/add"
                        className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white text-sm font-bold rounded-lg hover:bg-yellow-600 transition-all shadow-sm uppercase tracking-widest"
                    >
                        <Plus className="h-4 w-4" />
                        Add Warehouse
                    </Link>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or location..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* ── Results count ── */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {loading ? 'Scanning nodes...' : `${filtered.length} nodes found`}
            </p>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Warehouse Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Location</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={3} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-16 text-center">
                                        <Building2 className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">No logistic nodes found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((wh) => (
                                    <tr key={wh.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-slate-900 dark:text-white font-bold text-sm">
                                                {wh.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span>{wh.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    onClick={() => setDeleteRow(wh)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Delete Modal ── */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center text-left">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Remove Node?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                This will permanently remove <strong className="text-slate-900 dark:text-white">"{deleteRow.name}"</strong> from the network.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteRow(null)}
                                    disabled={isSubmitting}
                                    className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Working...' : 'Delete Node'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
