'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { productService } from '@/lib/api';
import {
    Search, Plus, RefreshCw, Box,
    Edit, Trash2, Package, Tag,
    ChevronRight, CheckCircle,
    Loader2, Pencil, AlertTriangle, X
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ─── Shared Utilities ─────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState<string[]>(['All']);
    const [toast, setToast] = useState<string | null>(null);
    const [deleteProduct, setDeleteProduct] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(10);

    const loadData = async (page = currentPage) => {
        setLoading(true);
        try {
            const params: any = {
                page,
                ordering: '-created_at',
                search: searchQuery || undefined,
            };
            if (selectedCategory !== 'All') {
                params.category_name = selectedCategory;
            }

            const [pData, cData] = await Promise.all([
                productService.getPaginated(params),
                productService.getCategories()
            ]);

            setProducts(pData.results);
            setTotalCount(pData.count);

            if (Array.isArray(cData)) {
                setCategories(['All', ...cData.map((c: any) => c.name)]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            loadData(1);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, selectedCategory]);

    useEffect(() => {
        loadData(currentPage);
    }, [currentPage]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const handleDelete = (product: any) => {
        setDeleteProduct(product);
    };

    const confirmDelete = async () => {
        if (!deleteProduct) return;
        setDeleting(true);
        try {
            await productService.delete(String(deleteProduct.id));
            showToast('Product deleted.');
            loadData();
        } catch (e) {
            console.error(e);
            alert('Failed to delete product.');
        } finally {
            setDeleting(false);
            setDeleteProduct(null);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Simple Amazon Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Box className="h-6 w-6 text-[#FF9900]" /> Product Inventory
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage distributor product listings and supply chain stock</p>
                </div>
                <Link href="/admin/products/add"
                    className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Product
                </Link>
            </div>

            {/* Quick Filter */}
            <SectionCard className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by product name or SKU..."
                            className={INPUT()}
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto items-center">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className={INPUT()}
                        >
                            <option value="All">All Categories</option>
                            {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={() => loadData()} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="hidden lg:block border-l border-[#ddd] pl-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Indexed</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{totalCount}</p>
                    </div>
                </div>
            </SectionCard>

            {/* List Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Product Detail</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3 text-right">Price</th>
                                <th className="px-6 py-3 text-center">Physical Inventory</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-6 animate-pulse"><div className="h-4 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No products found. Add a listing to get started.
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white border border-[#eee] rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    {product.image_url || product.image ? (
                                                        <img src={product.image_url || product.image} alt="" className="max-w-full max-h-full object-contain" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-gray-200" />
                                                    )}
                                                </div>
                                                <div>
                                                    <Link href={`/admin/products/${product.id}`} className="font-bold text-gray-900 dark:text-white hover:text-[#FF9900] underline-offset-4 hover:underline">
                                                        {product.name}
                                                    </Link>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">SKU: {product.sku || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                {product.category_name || product.category?.name || 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(product.price)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-bold ${(product.quantity_in_stock ?? product.stock) > 10 ? 'text-green-600' : (product.quantity_in_stock ?? product.stock) > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                {product.quantity_in_stock ?? product.stock ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/products/${product.id}`} className="p-1.5 text-gray-600 hover:text-[#FF9900] transition-colors">
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => handleDelete(product)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
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

                {/* Pagination */}
                <div className="bg-[#f6f6f6] dark:bg-slate-800 px-6 py-4 flex items-center justify-between border-t border-[#ddd] dark:border-slate-800">
                    <p className="text-xs text-gray-500">Showing {products.length} of {totalCount} records</p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="px-3 py-1 bg-white dark:bg-slate-700 border border-[#a6a6a6] rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold px-4">Page {currentPage} / {totalPages || 1}</span>
                        <button
                            disabled={currentPage === totalPages || totalCount === 0 || loading}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1 bg-white dark:bg-slate-700 border border-[#a6a6a6] rounded text-xs hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* Premium Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}

            {/* Amazon-Style Delete Modal */}
            {deleteProduct && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                            </div>
                            <button onClick={() => setDeleteProduct(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete the product <span className="font-bold text-gray-900 dark:text-white">"{deleteProduct.name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button 
                                onClick={() => setDeleteProduct(null)} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-xs font-medium text-[#111] transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                                Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
