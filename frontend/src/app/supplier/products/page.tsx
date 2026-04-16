'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, RefreshCw, Plus, Search, Edit, Barcode, Activity, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { productService, categoryService } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export default function SupplierProducts() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [categories, setCategories] = useState<any[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [items, cats] = await Promise.all([
                productService.getAllSupplier(),
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
        loadData();
    }, [loadData]);

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
        <div className="max-w-[1400px] mx-auto pb-20 px-4 animate-in fade-in duration-500 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Your Product Catalog</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and update your listings for the distributor network</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-all font-bold"
                        title="Refresh Catalog"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/supplier/products/add')}
                        className="flex items-center gap-2 px-5 py-2 bg-[#F59E0B] hover:bg-[#e6be00] text-slate-900 text-xs font-black uppercase tracking-wider rounded shadow-sm transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Add New Product
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search your items..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded text-sm outline-none focus:border-[#F59E0B] text-slate-600 dark:text-slate-300 font-bold"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded border border-slate-200 dark:border-white/10">
                        <Activity className="h-3.5 w-3.5 text-[#F59E0B]" />
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                            {filtered.length} Items Listed
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-300 dark:border-white/10 rounded shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-left">
                                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest">Listing Details</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 text-center whitespace-nowrap uppercase tracking-widest">Market Price</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 text-center whitespace-nowrap uppercase tracking-widest">SKU Identity</th>
                                <th className="px-5 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-5 py-6">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-24 text-center">
                                        <Package className="h-16 w-16 text-slate-100 dark:text-white/5 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-widest">Your catalog is currently empty.</p>
                                        <button
                                            onClick={() => router.push('/supplier/products/add')}
                                            className="px-6 py-2 bg-[#F59E0B] text-slate-900 font-bold rounded shadow-sm text-xs uppercase"
                                        >
                                            Publish Your First Product
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map(prod => (
                                    <tr key={prod.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group border-b border-slate-200">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/10 rounded flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#F59E0B]/40 transition-colors shadow-inner">
                                                    {prod.image ? (
                                                        <img src={getImageUrl(prod.image) || undefined} alt="" className="max-w-full max-h-full object-cover" />
                                                    ) : (
                                                        <Package className="h-6 w-6 text-slate-200" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-[15px] group-hover:text-[#F59E0B] transition-colors leading-tight">{prod.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{prod.category_name || 'Standard Item'}</span>
                                                        <span className="text-slate-200 dark:text-slate-600 font-bold text-[8px]">•</span>
                                                        <div className="flex items-center gap-1">
                                                            <div className={`h-1.5 w-1.5 rounded-full ${(prod.quantity || 0) > 10 ? 'bg-emerald-500' : (prod.quantity || 0) > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                            <span className={`text-[10px] font-bold ${(prod.quantity || 0) > 0 ? 'text-slate-500' : 'text-red-500'}`}>
                                                                {prod.quantity || 0} Available
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(prod.retail_price || 0)}</span>
                                                <span className="text-[9px] text-slate-400 font-black uppercase opacity-70 tracking-widest mt-0.5">Supplier Price</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{prod.sku || 'PENDING'}</span>
                                                {prod.barcode && (
                                                    <span className="text-[9px] text-slate-400 font-bold opacity-60 flex items-center gap-1">
                                                        <Barcode size={10} /> {prod.barcode}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.push(`/supplier/products/${prod.id}/edit`)}
                                                    className="px-4 py-1.5 bg-white border border-slate-300 rounded text-xs font-black uppercase tracking-wider text-slate-700 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all shadow-sm"
                                                >
                                                    <Edit className="h-3.5 w-3.5 inline mr-1.5" /> Edit
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Are you sure you want to permanently delete "${prod.name}"?`)) {
                                                            try {
                                                                setLoading(true);
                                                                await productService.deleteSupplier(prod.id);
                                                                toast.success('Product deleted successfully.');
                                                                loadData();
                                                            } catch (error) {
                                                                toast.error('Failed to delete product.');
                                                                setLoading(false);
                                                            }
                                                        }
                                                    }}
                                                    className="p-1.5 bg-white border border-slate-300 rounded text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                                                    title="Delete Product"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination Hub ── */}
                {!loading && filtered.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 border-t border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] gap-4">
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                            Page {(currentPage - 1) * itemsPerPage + 1} — {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} listings
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-30 transition-all font-bold"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-[11px] text-slate-900 font-black uppercase tracking-widest px-4 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm">
                                Page {currentPage} / {totalPages || 1}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-30 transition-all font-bold"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Catalog Protocol</p>
                <p className="text-xs text-blue-600 font-medium leading-relaxed max-w-lg mx-auto">
                    Note: Your products are subject to administrative review. Newly added items may take a few moments
                    to sync across the global cosmetic distribution network.
                </p>
            </div>
        </div>
    );
}
