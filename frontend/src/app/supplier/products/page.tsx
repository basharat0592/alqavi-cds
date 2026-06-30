'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Package, RefreshCw, Plus, Search, Edit, Barcode, Activity, ChevronLeft, ChevronRight,
    Loader2, Trash2, LayoutGrid, List, Eye, X, AlertCircle, AlertTriangle, Archive, ChevronDown, Download, ExternalLink
} from 'lucide-react';
import { productService, categoryService } from '@/lib/api';
import { getImageUrl, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

// ── Pure Amazon Formatting ───────────────────────────────────────────────────
const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export default function SupplierProducts() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [categories, setCategories] = useState<any[]>([]);

    // Modals
    const [viewProd, setViewProd] = useState<any>(null);
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [items, cats] = await Promise.all([
                productService.getAllSupplier({ no_pagination: 'true' }),
                categoryService.getAll()
            ]);
            const rawItems = items as any;
            setProducts(Array.isArray(rawItems) ? rawItems : rawItems?.results || []);
            setCategories(Array.isArray(cats) ? cats : (cats as any)?.results || []);
        } catch (error) {
            console.error('Failed to load products:', error);
            toast.error('Failed to synchronize catalog.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData().then(() => {
            const idsParam = searchParams.get('manifest_ids');
            if (idsParam) {
                const ids = idsParam.split(',').map(Number);
                setSelectedIds(new Set(ids));
                setShowManifest(true);
            }
        });
    }, [loadData, searchParams]);

    const handleShareSelection = () => {
        setShowManifest(true);
    };

    const handleArchiveSelection = async () => {
        try {
            setLoading(true);
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    productService.updateSupplier(id, { status: 'ARCHIVED' })
                )
            );
            toast.success(`${selectedIds.size} items moved to Partner Archive.`);
            setSelectedIds(new Set());
            loadData();
        } catch {
            toast.error('Partial failure during archiving.');
            loadData();
        }
    };

    const handleExportCSV = () => {
        const selectedProducts = products.filter(p => selectedIds.has(p.id));
        const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Retail Price', 'Status'];
        const rows = selectedProducts.map(p => [
            `"${p.name}"`,
            `"${p.sku || 'N/A'}"`,
            `"${p.category_name || 'Standard'}"`,
            p.quantity,
            p.retail_price,
            p.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `product_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    const handleUnarchiveSelection = async () => {
        try {
            setLoading(true);
            await Promise.all(
                Array.from(selectedIds).map(id =>
                    productService.updateSupplier(id, { status: 'ACTIVE' })
                )
            );
            toast.success(`${selectedIds.size} items restored to catalog.`);
            setSelectedIds(new Set());
            loadData();
        } catch {
            toast.error('Partial failure during restoration.');
            loadData();
        }
    };

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.sku || '').toLowerCase().includes(search.toLowerCase());
        const matchesCat = category === 'all' ? true : p.category?.toString() === category;
        return matchesSearch && matchesCat;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading && products.length === 0) return <PageLoader />;

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans">

            {/* ── Page Header ── */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-medium text-slate-900 leading-tight">Product Catalog</h1>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Centralized management of your inventory, SKUs, and retail pricing.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F59E0B] border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => router.push('/supplier/products/add')}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-slate-100 transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4" />
                            Add Product
                        </button>
                    </div>
                </div>

                {/* Search & Filters Bar */}
                {selectedIds.size === 0 ? (
                    <div className="flex flex-col md:flex-row gap-4 mb-6 animate-in fade-in duration-300">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                                placeholder="Search by name or SKU..."
                                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all"
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
                                className="px-4 py-2.5 bg-white border border-gray-300 rounded text-sm font-bold text-slate-700 outline-none focus:border-[#F59E0B] transition-all cursor-pointer min-w-[180px]"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {filtered.length} Items
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 mb-6 bg-[#f0f2f2] border border-gray-300 rounded-xl animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg shadow-sm">
                                <span className="text-xs font-black text-[#F59E0B]">{selectedIds.size}</span>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected</span>
                            </div>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-[10px] font-black text-[#007185] hover:underline uppercase"
                            >
                                Deselect All
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95"
                            >
                                <Trash2 size={14} /> Delete
                            </button>

                            {Array.from(selectedIds).every(id => products.find(p => p.id === id)?.status === 'ARCHIVED') ? (
                                <button
                                    onClick={handleUnarchiveSelection}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all active:scale-95"
                                >
                                    <RefreshCw size={14} /> Unarchive
                                </button>
                            ) : (
                                <button
                                    onClick={handleArchiveSelection}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-slate-700 hover:bg-gray-50 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                    <Archive size={14} /> Archive
                                </button>
                            )}

                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-slate-700 hover:bg-gray-50 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all"
                                >
                                    More <ChevronDown size={14} />
                                </button>

                                {isBulkDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-in slide-in-from-top-2">
                                        <button
                                            onClick={handleExportCSV}
                                            className="w-full px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase hover:bg-slate-50 hover:text-[#007185] transition-colors flex items-center gap-3"
                                        >
                                            <Download size={14} /> Export Selection
                                        </button>
                                        <button className="w-full px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase hover:bg-slate-50 hover:text-[#007185] transition-colors flex items-center gap-3">
                                            <Activity size={14} /> Mark as In Stock
                                        </button>
                                        <button
                                            onClick={handleShareSelection}
                                            className="w-full px-4 py-2 text-left text-[10px] font-black text-slate-500 uppercase hover:bg-slate-50 hover:text-[#007185] transition-colors flex items-center gap-3"
                                        >
                                            <ExternalLink size={14} /> Share / Print Manifest
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Table Catalog ── */}
            {loading && filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white border border-gray-300 rounded-xl">
                    <Loader2 className="h-8 w-8 text-[#F59E0B] animate-spin" />
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Synchronizing catalog...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-gray-300 bg-white rounded-3xl text-center">
                    <Package className="h-12 w-12 text-slate-200 mx-auto" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No products found</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-300 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f0f2f2] border-b border-gray-300 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <th className="px-5 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 accent-[#F59E0B] cursor-pointer rounded"
                                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id))}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedIds);
                                                if (e.target.checked) {
                                                    paginatedProducts.forEach(p => newSet.add(p.id));
                                                } else {
                                                    paginatedProducts.forEach(p => newSet.delete(p.id));
                                                }
                                                setSelectedIds(newSet);
                                            }}
                                        />
                                    </th>
                                    <th className="px-5 py-4 w-16 text-center">Image</th>
                                    <th className="px-5 py-4">Product Name</th>
                                    <th className="px-5 py-4">Category</th>
                                    <th className="px-5 py-4 text-center">Stock</th>
                                    <th className="px-5 py-4">Price</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedProducts.map(prod => (
                                    <tr key={prod.id} className={cn("hover:bg-slate-50/50 transition-colors group", selectedIds.has(prod.id) && "bg-amber-50/40")}>
                                        <td className="px-5 py-4">
                                            <input
                                                type="checkbox"
                                                className="h-3.5 w-3.5 accent-[#F59E0B] cursor-pointer rounded"
                                                checked={selectedIds.has(prod.id)}
                                                onChange={() => {
                                                    const newSet = new Set(selectedIds);
                                                    if (newSet.has(prod.id)) newSet.delete(prod.id);
                                                    else newSet.add(prod.id);
                                                    setSelectedIds(newSet);
                                                }}
                                            />
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow-inner group-hover:border-[#F59E0B] transition-colors mx-auto">
                                                {prod.image ? (
                                                    <img src={getImageUrl(prod.image) || undefined} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="h-5 w-5 text-gray-200" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col max-w-[200px]">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-[#F59E0B] transition-colors truncate">
                                                    {prod.name.replace(/\s*\(.*?\)\s*$/, '')}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">SKU: {prod.sku || 'N/A'}</span>
                                                    {(prod.weight || prod.size) && (
                                                        <>
                                                            <span className="text-slate-200">|</span>
                                                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                                                                {prod.weight} {prod.weight && prod.size ? '•' : ''} {prod.size}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-50 rounded border border-gray-100">
                                                {prod.category_name || 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-sm font-black ${prod.quantity <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>{prod.quantity}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Units</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm font-black text-slate-900">{formatCurrency(prod.retail_price)}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter",
                                                prod.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                    prod.quantity > 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        prod.quantity > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-rose-50 text-rose-700 border-rose-200'
                                            )}>
                                                {prod.status === 'ARCHIVED' ? 'Archived' :
                                                    prod.quantity > 20 ? 'Optimal' :
                                                        prod.quantity > 0 ? 'Low Stock' : 'Stock Out'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setViewProd(prod)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-[#F59E0B] hover:bg-amber-50 transition-all"
                                                    title="View Specifications"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/supplier/products/${prod.id}/edit`)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all"
                                                    title="Edit Record"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(prod.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                    title="Purge Record"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination - Integrated */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Page {currentPage} of {totalPages || 1}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setCurrentPage(p => Math.max(1, p - 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage === 1}
                                className="h-9 px-4 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase text-slate-600 disabled:opacity-30 transition-all flex items-center gap-2 hover:bg-gray-50 active:scale-95"
                            >
                                <ChevronLeft className="h-4 w-4" /> Previous
                            </button>
                            <button
                                onClick={() => {
                                    setCurrentPage(p => Math.min(totalPages, p + 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage >= totalPages || totalPages === 0}
                                className="h-9 px-5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-black active:scale-95 flex items-center gap-2"
                            >
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Protocol Box */}
            <div className="mt-12 bg-[#F59E0B]/5 rounded-3xl p-8 border border-[#F59E0B]/10 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 opacity-5 text-[#F59E0B] rotate-12">
                    <Activity size={160} />
                </div>
                <h4 className="text-[11px] font-black text-[#F59E0B] uppercase tracking-[0.3em] mb-4">Catalog Protocol</h4>
                <p className="text-[14px] font-bold text-slate-600 leading-relaxed tracking-tight relative z-10 max-w-2xl">
                    Ensure accurate SKU identification for all regional shipments. Catalog updates are finalized by administrative audit nodes before global synchronization.
                </p>
            </div>
            {/* ── View Detail Modal ── */}
            {viewProd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden border border-slate-200">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="text-slate-400" size={18} />
                                <h3 className="text-sm font-bold text-slate-900">Product Details</h3>
                            </div>
                            <button onClick={() => setViewProd(null)} className="p-1 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-6">
                                <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                    {viewProd.image ? (
                                        <img src={getImageUrl(viewProd.image) || undefined} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="h-8 w-8 text-slate-200" />
                                    )}
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="text-xl font-bold text-slate-900 mb-1">{viewProd.name}</h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                        <p><span className="font-semibold">SKU:</span> {viewProd.sku || 'N/A'}</p>
                                        <p><span className="font-semibold">ID:</span> #{viewProd.id}</p>
                                        {viewProd.weight && <p><span className="font-semibold">Weight:</span> {viewProd.weight}</p>}
                                        {viewProd.size && <p><span className="font-semibold">Size:</span> {viewProd.size}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Retail Price</span>
                                    <span className="text-lg font-bold text-slate-900">{formatCurrency(viewProd.retail_price)}</span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stock Level</span>
                                    <span className={cn("text-lg font-bold", viewProd.quantity <= 0 ? "text-rose-600" : "text-emerald-600")}>
                                        {viewProd.quantity} Units
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                                <p className="text-sm text-slate-600 leading-relaxed bg-white p-3 border border-slate-100 rounded-lg italic">
                                    {viewProd.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setViewProd(null)}
                                className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-rose-100">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="text-rose-600" size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-slate-900 mb-2">Confirm Removal</h3>
                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed px-4">
                                This will permanently purge the selected SKU from your partner catalog. Distributed inventory nodes may still hold historical data.
                            </p>
                        </div>
                        <div className="px-8 pb-8 flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        await productService.deleteSupplier(deleteConfirmId);
                                        toast.success('Product deleted.');
                                        setDeleteConfirmId(null);
                                        loadData();
                                    } catch {
                                        toast.error('Deletion failed.');
                                        setLoading(false);
                                    }
                                }}
                                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 transition-all active:scale-95"
                            >
                                DELETE SKU
                            </button>
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[13px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Bulk Delete Confirmation Modal ── */}
            {showBulkModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-rose-100">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="text-rose-600" size={32} />
                            </div>
                            <h3 className="text-xl font-medium text-slate-900 mb-2">Mass Purge Alert</h3>
                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed px-4">
                                You are about to permanently delete <span className="font-black text-rose-600">{selectedIds.size} items</span> from your partner catalog. This action is irreversible.
                            </p>
                        </div>
                        <div className="px-8 pb-8 flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        // Batch delete
                                        await Promise.all(Array.from(selectedIds).map(id => productService.deleteSupplier(id)));
                                        toast.success(`${selectedIds.size} items purged successfully.`);
                                        setSelectedIds(new Set());
                                        setShowBulkModal(false);
                                        loadData();
                                    } catch {
                                        toast.error('Batch deletion partially failed.');
                                        loadData();
                                    }
                                }}
                                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 transition-all active:scale-95"
                            >
                                CONFIRM MASS PURGE
                            </button>
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[13px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Full-Page Manifest Overlay (Same Tab) ── */}
            {showManifest && (
                <div className="fixed inset-0 z-[1000] bg-white overflow-y-auto font-sans text-left">

                    {/* Official Action Bar (Integrated Style) */}
                    <div className="max-w-[850px] mx-auto pt-8 px-4 print:hidden">
                        <div className="flex items-center justify-between py-4 border-b border-[#eee]">
                            <div className="flex items-center gap-1 text-[11px] text-[#565959] uppercase tracking-wider font-bold">
                                <span className="text-[#c45500]">Supplier Manifest Preview</span>
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
                                            try { await navigator.share({ title: 'Stock Manifest', url: shareUrl }); } catch { }
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
                        {/* Al-Qavi Official Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div className="w-1/3 text-[24px] font-black tracking-tighter">
                                AL-QAVI <span className="text-[#F59E0B]">TRADERS</span>
                            </div>

                            <div className="w-1/3 text-center">
                                <h1 className="text-[34px] font-bold leading-[1.8] mb-1 text-[#111] urdu-text">القوی ٹریڈرز</h1>
                                <p className="text-[12px] font-bold text-[#565959] uppercase tracking-widest urdu-text">کاسمیٹکس ڈیلر گلگت بلتستان</p>
                            </div>

                            <div className="w-1/3 text-right">
                                <h2 className="text-[20px] font-black uppercase tracking-tighter text-[#111]">Stock Manifest</h2>
                                <div className="text-[11px] text-gray-500 mt-2 font-bold space-y-0.5">
                                    <p>Syed Sakhawat & Associates</p>
                                    <p>0313-8692190 | 0335-1240190</p>
                                </div>
                                <p className="text-[14px] text-[#111] font-bold mt-4 tracking-tight">Date: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full text-left border-collapse mb-12 font-sans">
                            <thead>
                                <tr className="border-b-2 border-black text-[11px] font-black uppercase tracking-wider text-black bg-gray-50">
                                    <th className="py-4 px-2 w-12 text-center opacity-40 font-sans">#</th>
                                    <th className="py-4 px-3 font-sans">Description of Goods</th>
                                    <th className="py-4 px-3 text-center font-sans">SKU ID</th>
                                    <th className="py-4 px-3 text-center w-24 font-sans">Qty</th>
                                    <th className="py-4 px-3 text-right w-32 font-sans">Unit Price</th>
                                    <th className="py-4 px-3 text-right w-32 font-sans">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px] font-sans">
                                {products.filter(p => selectedIds.has(p.id)).map((item: any, i: number) => {
                                    const price = parseFloat(item.retail_price || 0);
                                    const qty = item.quantity || 1;
                                    return (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 font-sans">
                                            <td className="py-4 px-2 text-center text-gray-400 font-sans">{i + 1}</td>
                                            <td className="py-4 px-3 font-bold text-[#111] font-sans">{item.name}</td>
                                            <td className="py-4 px-3 text-center font-mono text-[11px] text-slate-400 font-sans">{item.sku || 'N/A'}</td>
                                            <td className="py-4 px-3 text-center font-sans">{qty}</td>
                                            <td className="py-4 px-3 text-right text-gray-500 font-sans">{formatCurrency(price)}</td>
                                            <td className="py-4 px-3 text-right font-black text-[#111] font-sans">{formatCurrency(price * qty)}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="border-t-2 border-black font-black text-[#111] bg-gray-50 font-sans">
                                    <td colSpan={5} className="py-4 px-2 text-right text-[12px] uppercase tracking-wider font-sans">Grand Total Selection</td>
                                    <td className="py-4 px-3 text-right text-[15px] font-sans">
                                        {formatCurrency(products.filter(p => selectedIds.has(p.id)).reduce((a, b) => a + (b.quantity * (parseFloat(b.retail_price) || 0)), 0))}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Official Note */}
                        <div className="mb-10 px-1 border-t border-gray-100 pt-8">
                            <p className="text-[11px] leading-[2.1] text-justify text-[#444] urdu-text" dir="rtl">
                                <span className="font-black border-b-2 ml-3 text-[14px]">نوٹ:-</span>
                                تمام دکاندار حضرات اس بات کو نوٹ کر لیں جتنی بھی چیزیں القوی ٹریڈرز گلگت سے خریدی ہیں انکو ایکسپائری سے تین مہینے پہلے تبدیل کرنا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیلی کا ذمہ وار نہیں ہوگا۔ نیز امپورٹڈ چیزیں سمیت پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں سامان اور بل میں کمی بیشی ہونے کی صورت میں فورا رابطہ کریں بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کا ذمہ دار نہیں ہوگا۔ آپ کے تعاون کا شکریہ--
                            </p>
                        </div>

                        {/* Signatures */}
                        <div className="mt-16 pt-12 border-t-2 border-dashed border-black">
                            <div className="flex justify-between items-start gap-32">
                                <div className="flex-1 space-y-3 font-sans">
                                    <p className="text-[12px] font-bold text-gray-400 font-sans">Supplier / Authorized Distribution Signature</p>
                                    <div className="w-full border-b border-black pt-8"></div>
                                    <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2 font-sans">Manifested By</p>
                                </div>
                                <div className="flex-1 space-y-3 text-right font-sans">
                                    <p className="text-[12px] font-bold text-gray-400 font-sans">Al-Qavi Authorized Receiver Stamp</p>
                                    <div className="w-full border-b border-black pt-8 font-sans"></div>
                                    <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2 font-sans">Authorized Dealer</p>
                                </div>
                            </div>
                            <div className="mt-16 text-center pt-6 font-sans">
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.4em] font-sans">System Generated Registry Copy • Al-Qavi Traders Gilgit</p>
                            </div>
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
