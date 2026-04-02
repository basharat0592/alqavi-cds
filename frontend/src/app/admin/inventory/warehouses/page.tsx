"use client";

import React, { useEffect, useState } from 'react';
import {
    Plus, Search, RefreshCw, Trash2, Edit2, Eye,
    Warehouse, X, AlertTriangle, Building2, MapPin, Phone
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { inventoryService } from '@/lib/api';

const StatusPill = ({ status }: { status: string }) => {
    let bg = 'bg-slate-100 text-slate-600 border-slate-200';
    let text = status || 'Unknown';

    if (text.toLowerCase() === 'active') {
        bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (text.toLowerCase() === 'inactive') {
        bg = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${bg}`}>
            {text}
        </span>
    );
};

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
            setDeleteRow(null);
            loadWarehouses();
        } catch (error) {
            console.error(error);
            alert("Security Violation: Cannot retire protected hub.");
        } finally {
            setIsSubmitting(false);
            setDeleteRow(null);
        }
    };

    const filtered = warehouses.filter(wh =>
        (wh.name?.toLowerCase().includes(search.toLowerCase())) ||
        (wh.code?.toLowerCase().includes(search.toLowerCase())) ||
        (wh.city?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Warehouses</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage network nodes and logistics hubs</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadWarehouses}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] hover:border-[#F7CA00]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href="/admin/inventory/warehouses/add"
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Warehouse
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
                        placeholder="Search by name, code or city..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
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
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Node ID</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Warehouse Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Location</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Contact</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <Building2 className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No logistic nodes found.</p>
                                        <Link
                                            href="/admin/inventory/warehouses/add"
                                            className="text-sm text-[#F7CA00] hover:underline font-medium"
                                        >
                                            Create your first warehouse
                                        </Link>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((wh) => (
                                    <tr key={wh.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="text-[#F7CA00] font-medium text-sm">
                                                {wh.code || 'SYS-NODE'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <span className="text-slate-800 dark:text-slate-200 font-medium text-sm truncate block" title={wh.name}>
                                                {wh.name}
                                            </span>
                                            <span className="text-xs text-slate-400 block mt-0.5">{wh.type} Hub</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[200px]" title={`${wh.address || 'Address Restricted'}, ${wh.city}`}>
                                                    {wh.city}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span>{wh.contact_phone || 'Non-disclosed'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={wh.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end items-center gap-1">
                                                <button
                                                    onClick={() => setViewRow(wh)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-[#F7CA00]/10 transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <Link
                                                    href={`/admin/inventory/warehouses/edit/${wh.id}`}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteRow(wh)}
                                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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

            {/* ── View Modal ── */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Warehouse Node</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Location details</p>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Name</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Code</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{viewRow.code || 'SYS-NODE'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Address</p>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{viewRow.address || 'Address Restricted'}, {viewRow.city}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Hub Type</p>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{viewRow.type} Hub</span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Network Status</p>
                                    <StatusPill status={viewRow.status} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Contact Phone</p>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{viewRow.contact_phone || 'Non-disclosed'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Linked Records</p>
                                    <Link href={`/admin/inventory/list?warehouse=${viewRow.id}`} className="text-sm font-semibold text-[#F7CA00] hover:underline">
                                        View Stock Ledger
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-end">
                            <button onClick={() => setViewRow(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1B1C1E] rounded-xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 text-center">
                            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Item</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                Are you sure? This will permanently remove <br/><strong className="text-slate-700 dark:text-slate-300">"{deleteRow.name}"</strong>.
                            </p>
                            <p className="text-xs font-semibold text-red-500 bg-red-50 p-2 rounded-lg mb-5 border border-red-100">
                                This will orphan all stock records at this location.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setDeleteRow(null)}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
