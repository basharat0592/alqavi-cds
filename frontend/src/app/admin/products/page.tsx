"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Package,
    RefreshCw, Filter, Image as ImageIcon,
    X, AlertTriangle, CheckCircle, Building2, Activity, ShieldCheck, Loader2, ChevronLeft, ChevronRight, Truck, MapPin
} from 'lucide-react';
import { productService } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteProd, setDeleteProd] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await productService.getAll();
            setProducts(data || []);
        } catch (error) {
            console.error('Failed to sync registry:', error);
            toast.error("Registry sync failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

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
            setDeleteProd(null);
        }
    };

    const filtered = products.filter(p =>
        (p.product_name?.toLowerCase().includes(search.toLowerCase())) ||
        (p.supplier_name?.toLowerCase().includes(search.toLowerCase())) ||
        (p.warehouse_name?.toLowerCase().includes(search.toLowerCase()))
    );

    const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

    if (loading && products.length === 0) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans text-left text-left">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="text-left">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Product Registry</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">Manage derived catalog items for storefront distribution</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all"
                        title="Sync Registry"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/admin/products/add')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        New Registry
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by product, supplier, or location..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-[#F59E0B] transition-all font-medium"
                    />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto text-left">
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product & Identity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pricing & Margin</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Batch Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Inventory</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <Package className="h-12 w-12 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Void Registry</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map(prod => (
                                    <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#F59E0B]/30 transition-all">
                                                    {prod.image ? (
                                                        <img src={prod.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="h-5 w-5 text-slate-200" />
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{prod.product_name}</span>
                                                        {prod.badge && (
                                                            <span className="px-1.5 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] text-[8px] font-black rounded uppercase tracking-widest">
                                                                {prod.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 opacity-70">
                                                        <div className="flex items-center gap-1">
                                                            <Truck className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{prod.supplier_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{prod.warehouse_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-4 w-fit">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Retail:</span>
                                                    <span className="text-sm font-black text-slate-900 dark:text-white">Rs. {Number(prod.selling_price).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 w-fit opacity-60">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Profit:</span>
                                                    <span className={`text-[10px] font-black ${prod.profit_margin > 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {Number(prod.profit_margin).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${prod.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
                                                {prod.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{Number(prod.total_quantity).toLocaleString()}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Units Avail</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => router.push(`/admin/products/${prod.id}`)}
                                                    className="p-2 rounded-xl text-slate-500 hover:text-[#F59E0B] hover:bg-slate-100 dark:hover:bg-[#F59E0B]/10 transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteProd(prod)}
                                                    className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
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

                {/* ── Pagination Hub ── */}
                {filtered.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest uppercase">
                            Registry Page <span className="text-slate-900 dark:text-white">{currentPage}</span> of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition-all"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-white dark:hover:bg-white/5 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Delete Modal ── */}
            {deleteProd && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center text-left text-left">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-5">
                                <AlertTriangle className="h-7 w-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Erase Asset?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                                Permanent registry removal for <br/><strong className="text-slate-900 dark:text-white">"{deleteProd.product_name}"</strong>.
                            </p>
                            <div className="flex justify-end gap-3 text-left">
                                <button
                                    onClick={() => setDeleteProd(null)}
                                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="px-8 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {deleting ? 'Purging...' : 'Purge Asset'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
