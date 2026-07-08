'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Boxes, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Trash2, Search, Eye, X, AlertCircle,
    Archive, ChevronDown, Download, Activity, ExternalLink, ChevronLeft
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { productService } from '@/services/product.service';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - INVENTORY REGISTRY
   ───────────────────────────────────────────────────────────────────────────── */
export default function SupplierInventory() {
    const searchParams = useSearchParams();
    const [filter, setFilter] = useState('all');
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals & UI State
    const [viewItem, setViewItem] = useState<any>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);
    const [showManifest, setShowManifest] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsBulkDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchInventory = useCallback(async () => {
        try {
            // The supplier's stock IS their supplier-product catalog (scoped server-side
            // to this supplier). The old '/v1/inventory/' call hit the router root and
            // always returned empty; this uses the correct supplier-scoped endpoint.
            const raw = await productService.getAllSupplier({ no_pagination: 'true' });
            const list = Array.isArray(raw) ? raw : (raw?.results || []);
            const items = list.map((p: any) => ({
                ...p,
                product_name: p.name,
                quantity_available: p.quantity ?? 0,
                reorder_level: p.reorder_level ?? p.min_count ?? 0,
                batch_number: p.batch_number || '',
                status: p.status || 'ACTIVE',
            }));
            setInventory(items);
        } catch {
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await productService.deleteSupplier(id);
            toast.success("Inventory record purged.");
            setDeleteConfirmId(null);
            fetchInventory();
        } catch {
            toast.error("Deletion failed.");
        }
    };

    useEffect(() => {
        fetchInventory().then(() => {
            const idsParam = searchParams.get('manifest_ids');
            if (idsParam) {
                const ids = idsParam.split(',').map(Number);
                setSelectedIds(new Set(ids));
                setShowManifest(true);
            }
        });
    }, [fetchInventory, searchParams]);

    // Live Telemetry: 2s Auto-sync
    useEffect(() => {
        const interval = setInterval(fetchInventory, 2000);
        return () => clearInterval(interval);
    }, [fetchInventory]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
        if (filter === 'archived') return item.status === 'ARCHIVED';
        return true;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedInventory = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const TABS = ['all', 'in stock', 'low stock', 'stock out', 'archived'];

    const getStatusStyles = (item: any) => {
        if (item.status === 'ARCHIVED') return 'bg-slate-100 text-slate-500 border-slate-200';
        const qty = parseFloat(item.quantity_available || 0);
        const reorder = parseFloat(item.reorder_level || 0);
        if (qty <= 0) return 'bg-red-50 text-red-600 border-red-100';
        if (qty <= reorder) return 'bg-amber-50 text-amber-600 border-amber-100';
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    };

    const handleArchiveSelection = async () => {
        try {
            setLoading(true);
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    productService.updateSupplier(id, { status: 'ARCHIVED' })
                )
            );
            toast.success(`${selectedIds.size} records archived successfully.`);
            setSelectedIds(new Set());
            fetchInventory();
        } catch {
            toast.error('Partial failure during archiving.');
            fetchInventory();
        }
    };

    const handleUnarchiveSelection = async () => {
        try {
            setLoading(true);
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    productService.updateSupplier(id, { status: 'ACTIVE' })
                )
            );
            toast.success(`${selectedIds.size} records restored.`);
            setSelectedIds(new Set());
            fetchInventory();
        } catch {
            toast.error('Restoration failed.');
            fetchInventory();
        }
    };

    const handleExportCSV = () => {
        const selectedInventory = inventory.filter(i => selectedIds.has(i.id));
        const headers = ['Product', 'SKU', 'Batch #', 'Warehouse', 'Quantity', 'Status'];
        const rows = selectedInventory.map(i => [
            `"${i.product_name || i.product}"`,
            `"${i.sku || 'N/A'}"`,
            `"${i.batch_number || 'N/A'}"`,
            `"${i.warehouse_name || 'Global Hub'}"`,
            i.quantity_available,
            i.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    const handleShareSelection = () => {
        setShowManifest(true);
    };

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === paginatedInventory.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(paginatedInventory.map(i => i.id)));
    };

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans">

            {/* Search & Filters / Bulk Actions Toggle */}
            {selectedIds.size === 0 ? (
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 border border-gray-200 rounded-xl shadow-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm font-sans">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Search Batch or Product..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-lg outline-none focus:bg-white focus:border-[#F59E0B] transition-all text-sm font-sans"
                        />
                    </div>
                    <div className="flex gap-2">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => { setFilter(t); setCurrentPage(1); }}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all font-sans ${filter === t ? 'bg-[#F59E0B] text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between p-4 bg-[#f0f2f2] border border-gray-300 rounded-xl animate-in slide-in-from-top-2 font-sans">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg shadow-sm">
                            <span className="text-xs font-black text-[#F59E0B] font-sans">{selectedIds.size}</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-sans">Selected</span>
                        </div>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-[10px] font-black text-[#007185] hover:underline uppercase font-sans"
                        >
                            Deselect All
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95 font-sans"
                        >
                            <Trash2 size={14} /> Purge
                        </button>

                        {Array.from(selectedIds).every(id => inventory.find(i => i.id === id)?.status === 'ARCHIVED') ? (
                            <button
                                onClick={handleUnarchiveSelection}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95 font-sans"
                            >
                                <RefreshCw size={14} /> Unarchive
                            </button>
                        ) : (
                            <button
                                onClick={handleArchiveSelection}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-slate-700 hover:bg-gray-50 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all font-sans"
                            >
                                <Archive size={14} /> Archive
                            </button>
                        )}

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-slate-700 hover:bg-gray-50 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all font-sans"
                            >
                                Actions <ChevronDown size={14} />
                            </button>

                            {isBulkDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in slide-in-from-top-2 font-sans">
                                    <button
                                        onClick={handleExportCSV}
                                        className="w-full px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase hover:bg-slate-50 hover:text-[#007185] transition-colors flex items-center gap-3 font-sans"
                                    >
                                        <Download size={14} /> Export Selection
                                    </button>
                                    <button
                                        onClick={handleShareSelection}
                                        className="w-full px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase hover:bg-slate-50 hover:text-[#007185] transition-colors flex items-center gap-3 font-sans"
                                    >
                                        <ExternalLink size={14} /> Share / Print Manifest
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Table ── */}
            <div className="bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden mt-6 font-sans">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-200">
                                <th className="p-4 w-10">
                                    <input type="checkbox" checked={selectedIds.size === paginatedInventory.length && paginatedInventory.length > 0} onChange={toggleAll} className="rounded border-gray-300 text-[#F59E0B] focus:ring-[#F59E0B]" />
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Product / Batch</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Warehouse</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center font-sans">Available</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right font-sans">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right font-sans">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedInventory.map((item) => (
                                <tr key={item.id} className={cn("hover:bg-slate-50 transition-colors group font-sans", selectedIds.has(item.id) && "bg-amber-50/30")}>
                                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-gray-300 text-[#F59E0B] focus:ring-[#F59E0B]" /></td>
                                    <td className="px-6 py-4 font-sans">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-slate-800">{(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 rounded font-sans">{item.batch_number}</span>
                                                <span className="text-[9px] font-black text-[#F59E0B] italic font-sans">{item.sku}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-[12px] font-bold text-slate-600 font-sans">{item.warehouse_name || 'Main Hub'}</span></td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn("text-[15px] font-black font-mono font-sans", parseFloat(item.quantity_available) <= parseFloat(item.reorder_level) ? "text-red-600" : "text-slate-900")}>
                                            {item.quantity_available}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block font-sans", getStatusStyles(item))}>
                                            {item.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 font-sans">
                                            <button onClick={() => setViewItem(item)} className="p-2 text-slate-400 hover:text-[#007185]"><Eye size={16} /></button>
                                            <button onClick={() => setDeleteConfirmId(item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── View Modal ── */}
            {viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-8 text-left">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Item Details</h3>
                            <button onClick={() => setViewItem(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product</p><p className="text-sm font-medium text-slate-800">{(viewItem.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</p></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Number</p><p className="text-sm font-bold text-[#F59E0B]">#{viewItem.batch_number}</p></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</p><p className="text-sm font-medium text-slate-900">{viewItem.quantity_available} Units</p></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage</p><p className="text-sm font-medium text-slate-600">{viewItem.warehouse_name || 'Main Warehouse'}</p></div>
                        </div>
                        <button onClick={() => setViewItem(null)} className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all">Close</button>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ── */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Record?</h3>
                        <p className="text-sm text-slate-500 mb-6">Are you sure you want to remove this item from your stock?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Archive Confirm ── */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center font-sans">
                        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-sans"><Archive size={32} /></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 font-sans">Archive {selectedIds.size} Items?</h3>
                        <div className="flex gap-3">
                            <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 font-sans">Cancel</button>
                            <button onClick={() => { handleArchiveSelection(); setShowBulkModal(false); }} className="flex-1 py-3 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl font-sans">Archive</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MANIFEST OVERLAY (Same Tab) ── */}
            {showManifest && (
                <div className="fixed inset-0 z-[1000] bg-white overflow-y-auto font-sans text-left animate-in fade-in duration-300">

                    {/* Official Action Bar (Integrated Style) */}
                    <div className="max-w-[850px] mx-auto pt-8 px-4 print:hidden">
                        <div className="flex items-center justify-between py-4 border-b border-[#eee]">
                            <div className="flex items-center gap-1 text-[11px] text-[#565959] uppercase tracking-wider font-bold">
                                <span className="text-[#c45500]">Inventory Manifest Preview</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowManifest(false)}
                                    className="h-[31px] px-4 rounded-[3px] text-[13px] font-medium border bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm flex items-center gap-2"
                                >
                                    <ChevronLeft size={14} /> Back
                                </button>
                                <div className="h-6 w-[1px] bg-[#eee] mx-1"></div>
                                <button
                                    onClick={async () => {
                                        const ids = Array.from(selectedIds).join(',');
                                        const baseUrl = window.location.origin + window.location.pathname;
                                        const shareUrl = `${baseUrl}?manifest_ids=${ids}`;

                                        if (navigator.share) {
                                            try { await navigator.share({ title: 'Inventory Manifest', url: shareUrl }); } catch { }
                                        } else {
                                            navigator.clipboard.writeText(shareUrl);
                                            toast.success('Manifest link copied!');
                                        }
                                    }}
                                    className="h-[31px] px-4 rounded-[3px] text-[13px] font-medium border bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm flex items-center gap-2"
                                >
                                    <ExternalLink size={14} /> Share
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="h-[31px] px-4 rounded-[3px] text-[13px] font-medium border bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm flex items-center gap-2"
                                >
                                    <Download size={14} /> Print
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-[850px] mx-auto p-12 bg-white print:p-0">
                        <div className="flex justify-between items-start mb-12">
                            <div className="w-1/3 text-[24px] font-black tracking-tighter">AL-QAVI <span className="text-[#F59E0B]">TRADERS</span></div>
                            <div className="w-1/3 text-center">
                                <h1 className="text-[34px] font-bold leading-[1.8] mb-1 text-[#111] urdu-text">القوی ٹریڈرز</h1>
                                <p className="text-[12px] font-bold text-[#565959] uppercase tracking-widest urdu-text">کاسمیٹکس ڈیلر گلگت بلتستان</p>
                            </div>
                            <div className="w-1/3 text-right">
                                <h2 className="text-[20px] font-black uppercase tracking-tighter text-[#111]">Inventory Manifest</h2>
                                <div className="text-[11px] text-gray-500 mt-2 font-bold space-y-0.5"><p>Syed Sakhawat & Associates</p><p>0313-8692190 | 0335-1240190</p></div>
                                <p className="text-[14px] text-[#111] font-bold mt-4 tracking-tight font-sans">Date: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse mb-12 font-sans">
                            <thead>
                                <tr className="border-b-2 border-black text-[11px] font-black uppercase tracking-wider text-black bg-gray-50">
                                    <th className="py-4 px-2 w-12 text-center opacity-40 font-sans">#</th>
                                    <th className="py-4 px-3 font-sans">Stock Item Details</th>
                                    <th className="py-4 px-3 font-sans">Batch / Warehouse</th>
                                    <th className="py-4 px-3 text-center w-24 font-sans">Qty</th>
                                    <th className="py-4 px-3 text-right font-sans">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px] font-sans">
                                {inventory.filter(i => selectedIds.has(i.id)).map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 font-sans">
                                        <td className="py-4 px-2 text-center text-gray-400 font-sans">{idx + 1}</td>
                                        <td className="py-4 px-3 font-sans"><div className="font-bold text-[#111] font-sans">{(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</div><div className="text-[10px] text-slate-400 font-mono font-sans">SKU: {item.sku}</div></td>
                                        <td className="py-4 px-3 font-sans"><div className="text-[11px] font-black uppercase tracking-tighter font-sans">{item.batch_number}</div><div className="text-[10px] text-slate-400 font-sans">{item.warehouse_name || 'Main Hub'}</div></td>
                                        <td className="py-4 px-3 text-center font-black font-sans">{item.quantity_available}</td>
                                        <td className="py-4 px-3 text-right font-sans"><span className="text-[9px] font-black uppercase tracking-widest font-sans">{item.status}</span></td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-black font-black text-[#111] bg-gray-50 font-sans">
                                    <td colSpan={3} className="py-4 px-3 text-right text-[12px] uppercase tracking-wider font-sans">Total Physical Stock Selection</td>
                                    <td className="py-4 px-3 text-center text-[15px] font-sans">{inventory.filter(i => selectedIds.has(i.id)).reduce((a, b) => a + (parseFloat(b.quantity_available) || 0), 0)}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mb-10 px-1 border-t border-gray-100 pt-8">
                            <p className="text-[11px] leading-[2.1] text-justify text-[#444] urdu-text" dir="rtl">
                                <span className="font-black border-b-2 ml-3 text-[14px]">نوٹ:-</span>
                                تمام دکاندار حضرات اس بات کو نوٹ کر لیں جتنی بھی چیزیں القوی ٹریڈرز گلگت سے خریدی ہیں انکو ایکسپائری سے تین مہینے پہلے تبدیل کرنا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیلی کا ذمہ وار نہیں ہوگا۔ نیز امپورٹڈ چیزیں سمیت پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں سامان اور بل میں کمی بیشی ہونے کی صورت میں فورا رابطہ کریں بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کا ذمہ دار نہیں ہوگا۔ آپ کے تعاون کا شکریہ--
                            </p>
                        </div>

                        <div className="mt-16 pt-12 border-t-2 border-dashed border-black">
                            <div className="flex justify-between items-start gap-32">
                                <div className="flex-1 space-y-3"><p className="text-[12px] font-bold text-gray-400 font-sans">Warehouse In-Charge Signature</p><div className="w-full border-b border-black pt-8"></div><p className="text-[13px] font-black uppercase tracking-widest text-black pt-2 font-sans">Verified By</p></div>
                                <div className="flex-1 space-y-3 text-right"><p className="text-[12px] font-bold text-gray-400 font-sans">Distribution Hub Receipt Stamp</p><div className="w-full border-b border-black pt-8"></div><p className="text-[13px] font-black uppercase tracking-widest text-black pt-2 font-sans">Authorized Officer</p></div>
                            </div>
                            <div className="mt-16 text-center pt-6"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.4em] font-sans">System Generated Inventory Copy • Al-Qavi Traders Gilgit</p></div>
                        </div>
                    </div>

                    <style jsx global>{`
                        @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
                        .urdu-text { font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700; line-height: 2.4; }
                        @media print {
                            .print\\:hidden { display: none !important; }
                            body { padding: 0 !important; margin: 0 !important; background: white !important; }
                            .max-w-[850px] { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
                            @page { margin: 1.5cm !important; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
