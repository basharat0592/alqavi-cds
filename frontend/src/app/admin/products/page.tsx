"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Package,
    RefreshCw, Filter, Image as ImageIcon,
    X, AlertTriangle, CheckCircle, Building2, Activity, ShieldCheck, Loader2, 
    ChevronLeft, ChevronRight, Truck, MapPin, Calendar, TrendingUp, Tag, DollarSign
} from 'lucide-react';
import { productService, categoryService, supplierService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

export default function ProductsPage() {
    const router = useRouter();
    
    // Core Data
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [deleteProd, setDeleteProd] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Filters & Sorting
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [supplier, setSupplier] = useState('');
    const [ordering, setOrdering] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 8;

    const fetchFilters = async () => {
        try {
            const [cats, sups] = await Promise.all([
                categoryService.getAll(),
                supplierService.getAll()
            ]);
            setCategories(cats || []);
            setSuppliers(sups || []);
        } catch (error) {
            console.error('Failed to load filters:', error);
        }
    };

    const loadData = useCallback(async () => {
        setSyncing(true);
        try {
            const params = {
                page: currentPage,
                search: search || undefined,
                category: category || undefined,
                supplier: supplier || undefined,
                ordering: ordering || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            };
            
            const response = await productService.getAll(params);
            
            // Handle paginated vs non-paginated response
            if (response && typeof response === 'object' && 'results' in response) {
                setProducts(response.results);
                setTotalCount(response.count);
            } else {
                setProducts(Array.isArray(response) ? response : []);
                setTotalCount(Array.isArray(response) ? response.length : 0);
            }
        } catch (error) {
            console.error('Failed to sync registry:', error);
            toast.error("Registry sync failed");
        } finally {
            setSyncing(false);
            setLoading(false);
        }
    }, [currentPage, search, category, supplier, ordering, startDate, endDate]);

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300); // Debounce search/filters
        return () => clearTimeout(timer);
    }, [loadData]);

    const handleDelete = async () => {
        if (!deleteProd) return;
        setDeleting(true);
        try {
            await productService.delete(deleteProd.id);
            toast.success('Product purged from registry');
            setDeleteProd(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Purge failed');
        } finally {
            setDeleting(false);
        }
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    if (loading && products.length === 0) return <PageLoader />;

    return (
        <div className="max-w-[1440px] mx-auto pb-20 px-6 mt-6 font-sans antialiased text-left">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 border-b border-slate-200 dark:border-white/10 pb-6">
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-[#F59E0B]/10 rounded-lg">
                            <Package className="h-5 w-5 text-[#F59E0B]" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Product Registry</h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Enterprise Catalog & Inventory Management System</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => { setOrdering(''); setCurrentPage(1); }}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!ordering ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => { setOrdering('profit'); setCurrentPage(1); }}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${ordering === 'profit' ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Top Profit
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2 hidden lg:block" />
                    
                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all"
                        title="Sync Data"
                    >
                        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <button
                        onClick={() => router.push('/admin/products/add')}
                        className="flex items-center gap-2 px-6 py-3 bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-xl hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Create Entry
                    </button>
                </div>
            </div>

            {/* ── Advanced Filters Bar ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* Search */}
                <div className="relative group lg:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        placeholder="Search by product, supplier, or category catalog..."
                        className="w-full pl-11 pr-4 py-3.5 text-xs bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/5 transition-all font-bold tracking-tight text-slate-900 dark:text-white"
                    />
                </div>

                {/* Category Filter */}
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                        value={category}
                        onChange={e => { setCategory(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-11 pr-4 py-3.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-[#F59E0B] transition-all cursor-pointer appearance-none text-slate-700 dark:text-slate-300"
                    >
                        <option value="">Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Supplier Filter */}
                <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                        value={supplier}
                        onChange={e => { setSupplier(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-11 pr-4 py-3.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-[#F59E0B] transition-all cursor-pointer appearance-none text-slate-700 dark:text-slate-300"
                    >
                        <option value="">Suppliers</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {/* Date Filter */}
                <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-[#F59E0B] transition-colors" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-11 pr-4 py-3.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-[#F59E0B] transition-all text-slate-700 dark:text-slate-300"
                    />
                </div>
            </div>

            {/* ── Table Container ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-left">Product & Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-left">Pricing & Margin</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Batch Status</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Inventory</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <Package className="h-16 w-16 text-slate-400" />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Resource Pool Empty</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                products.map(prod => (
                                    <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#F59E0B]/50 group-hover:shadow-xl transition-all duration-300">
                                                    {prod.image ? (
                                                        <img src={prod.image} alt="" className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <ImageIcon className="h-6 w-6 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                                        <span className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate leading-none">
                                                            {prod.product_name}
                                                        </span>
                                                        {prod.badge && (
                                                            <span className={`px-2 py-0.5 text-[8px] font-black rounded-lg uppercase tracking-widest shadow-sm
                                                                ${prod.badge === 'SALE' ? 'bg-red-500 text-white' : 
                                                                  prod.badge === 'BEST SELLER' ? 'bg-[#F59E0B] text-white' : 
                                                                  'bg-indigo-500 text-white'}`}>
                                                                {prod.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Truck className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                                                                {prod.supplier_name || 'Generic'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 min-w-0 border-l border-slate-200 dark:border-white/10 pl-4">
                                                            <MapPin className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                                                                {prod.warehouse_name || 'Central'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retail:</span>
                                                    <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                                                        {formatCurrency(prod.selling_price)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profit:</span>
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className={`h-3 w-3 ${prod.profit_margin > 15 ? 'text-emerald-500' : 'text-amber-500'}`} />
                                                        <span className={`text-xs font-black ${prod.profit_margin > 15 ? 'text-emerald-500' : 'text-amber-500'} tracking-tighter`}>
                                                            {Number(prod.profit_margin).toFixed(1)}%
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600">
                                                            ({formatCurrency(Number(prod.selling_price || 0) - Number(prod.cost_price || 0))})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm">
                                                <div className={`h-1.5 w-1.5 rounded-full ${prod.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${prod.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                                    {prod.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-lg font-black tracking-tight leading-none ${prod.total_quantity < 10 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                                    {Number(prod.total_quantity).toLocaleString()}
                                                </span>
                                                <div className="flex items-center gap-1 mt-1 opacity-60">
                                                    <Tag className="h-2.5 w-2.5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Units Avail</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-end items-center gap-2 group-hover:opacity-100 opacity-20 transition-all duration-300">
                                                <button
                                                    onClick={() => router.push(`/admin/products/${prod.id}`)}
                                                    className="p-3 rounded-2xl bg-white dark:bg-white/10 text-slate-500 hover:text-[#F59E0B] hover:shadow-lg transition-all border border-slate-100 dark:border-white/5"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteProd(prod)}
                                                    className="p-3 rounded-2xl bg-white dark:bg-white/10 text-slate-500 hover:text-red-600 hover:shadow-lg transition-all border border-slate-100 dark:border-white/5"
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

                {/* ── Pagination UI ── */}
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Registry Depth: <span className="text-slate-900 dark:text-white font-black">{totalCount} Assets</span>
                    </p>
                    
                    {totalPages > 1 && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="group flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-20 translate-y-px"
                            >
                                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                Previous
                            </button>
                            
                            <div className="flex items-center gap-1.5 text-left">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all border ${currentPage === pageNum ? 'bg-[#F59E0B] border-[#F59E0B] text-white shadow-lg shadow-[#F59E0B]/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-[#F59E0B]'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="group flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-20 translate-y-px"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Erase Asset Modal ── */}
            {deleteProd && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setDeleteProd(null)} />
                    <div className="bg-white dark:bg-[#1a252f] rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-md shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight text-center">Purge Asset?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 leading-relaxed text-center">
                                You are about to permanently remove <br/>
                                <strong className="text-slate-900 dark:text-white font-black uppercase tracking-tighter">"{deleteProd.product_name}"</strong><br/> 
                                from the global registry. This cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDeleteProd(null)}
                                    className="flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-2xl shadow-red-500/30 active:scale-95 disabled:opacity-50"
                                >
                                    {deleting ? 'Purging...' : 'Confirm Purge'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
