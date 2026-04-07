"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Package,
    RefreshCw, Filter, Barcode, Hash,
    X, AlertTriangle, CheckCircle, Building2, Activity, ShieldCheck, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { productService, companyService, Product, CompanyInfo } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [deleteProd, setDeleteProd] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        setCurrentPage(1);
    }, [search, category, selectedCompany]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodData, catData, compData] = await Promise.all([
                productService.getAll({ all_items: 'true' } as any),
                productService.getCategories(),
                companyService.getAll()
            ]);

            const items = Array.isArray(prodData) ? prodData : (prodData as any).results || [];
            setProducts(items);
            setCategories((catData || []).filter((c: any) => c.status === 'active'));
            setCompanies((compData || []).filter((c: any) => c.is_active !== false));
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) return <PageLoader />;

    const handleDelete = async () => {
        if (!deleteProd) return;
        setDeleting(true);
        try {
            await productService.delete(deleteProd.id);
            setProducts(prev => prev.filter(p => p.id !== deleteProd.id));
            toast.success('Product de-registered successfully.');
        } catch (error) {
            console.error(error);
            toast.error('Failed to remove product from registry.');
        } finally {
            setDeleting(false);
            setDeleteProd(null);
        }
    };

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.sku || '').toLowerCase().includes(search.toLowerCase());
        const matchesCat = category ? p.category?.toString() === category : true;
        const matchesComp = selectedCompany ? (typeof p.company === 'object' ? p.company.id?.toString() === selectedCompany : p.company?.toString() === selectedCompany) : true;
        return matchesSearch && matchesCat && matchesComp;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">All Products</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage and track your entire inventory</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all font-bold"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/admin/products/add')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#EEAF1C] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Add Product
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
                        placeholder="Search products by name or SKU..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] focus:ring-2 focus:ring-[#EEAF1C]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:flex items-center gap-2">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300"
                    >
                        <option value="">All Manufacturers</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <Activity className="h-3.5 w-3.5 text-[#EEAF1C]" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                            {filtered.length} Products Found
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Product Details</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap uppercase tracking-wider">Pricing</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap uppercase tracking-wider">Identifiers</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Package className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No assets identified in the global registry.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map(prod => (
                                    <tr key={prod.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#EEAF1C]/30 transition-colors">
                                                    {(prod.image_url || prod.image) ? (
                                                        <img src={getImageUrl((prod.image_url || prod.image || '') as string) || undefined} alt="" className="max-w-full max-h-full object-contain p-1" />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-[#EEAF1C] transition-colors leading-tight">{prod.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-[#EEAF1C] font-bold uppercase">{prod.company_name || 'Generic'}</span>
                                                        <span className="text-slate-300 dark:text-slate-600 font-bold text-[8px]">•</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{prod.category_name || 'Standard'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 font-bold">
                                                        <div className="flex items-center gap-1">
                                                            <div className={`h-1.5 w-1.5 rounded-full ${ (prod.quantity_in_stock || 0) > 10 ? 'bg-emerald-500' : (prod.quantity_in_stock || 0) > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                            <span className={`text-[10px] ${ (prod.quantity_in_stock || 0) > 0 ? 'text-slate-500' : 'text-red-500'}`}>
                                                                {prod.quantity_in_stock || 0} in stock
                                                            </span>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase border ${prod.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                            {prod.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Rs. {Number(prod.price).toLocaleString()}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase opacity-70">Price Card</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col gap-1 items-center">
                                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{prod.sku || 'N/A'}</span>
                                                {prod.barcode && (
                                                    <span className="text-[9px] text-slate-400 font-bold opacity-60 flex items-center gap-1">
                                                        <Barcode size={10} /> {prod.barcode}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                             <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => router.push(`/admin/products/${prod.id}`)} 
                                                    className="p-1.5 text-slate-400 hover:text-[#EEAF1C] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteProd(prod)} 
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
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
                {!loading && filtered.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] gap-4 font-bold">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Page {(currentPage - 1) * itemsPerPage + 1} — {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} products
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-[11px] text-slate-900 dark:text-white uppercase tracking-widest px-3 py-1 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg">
                                Page {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Protocol Overlay (Modals) */}
            {deleteProd && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 font-bold">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm text-slate-800 dark:text-white uppercase tracking-wider">Delete Product</h3>
                            </div>
                            <button onClick={() => setDeleteProd(null)} className="p-1 text-slate-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to delete <span className="text-[#EEAF1C]">"{deleteProd.name}"</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteProd(null)} disabled={deleting} className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Cancel</button>
                            <button 
                                onClick={handleDelete} 
                                disabled={deleting} 
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

