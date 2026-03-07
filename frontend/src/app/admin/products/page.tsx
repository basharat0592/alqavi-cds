'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/lib/api';
import {
    Plus, Search, Filter, Edit, Trash2, Box,
    DollarSign, Tag, ChevronDown, X, Package, AlertTriangle
} from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    image?: string;
    status: 'Active' | 'Low Stock' | 'Critical' | 'Out of Stock' | 'Inactive';
    [key: string]: any;
}

const CATEGORIES = ['All', 'Skincare', 'Makeup', 'Toner', 'Haircare', 'Fragrance'];
const STOCK_STATUSES = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

/* ─── Delete Confirmation Modal ─── */
function DeleteModal({
    product,
    onConfirm,
    onCancel,
    deleting,
}: {
    product: Product;
    onConfirm: () => void;
    onCancel: () => void;
    deleting: boolean;
}) {
    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(12px)', background: 'rgba(15,23,42,0.45)' }}
            onClick={onCancel}
        >
            {/* Modal card */}
            <div
                className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Top decorative bar */}
                <div className="h-1 w-full bg-gradient-to-r from-red-400 via-rose-500 to-red-600" />

                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-300/10 rounded-full blur-3xl pointer-events-none" />

                <div className="px-8 pt-8 pb-7 relative z-10">
                    {/* Icon */}
                    <div className="flex items-center justify-center mb-5">
                        <div className="relative">
                            <div className="w-16 h-16 bg-red-50 border-2 border-red-100 flex items-center justify-center shadow-sm">
                                <Trash2 className="h-7 w-7 text-red-500" strokeWidth={2} />
                            </div>
                            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 flex items-center justify-center shadow-lg">
                                <AlertTriangle className="h-3 w-3 text-white" strokeWidth={2.5} />
                            </span>
                        </div>
                    </div>

                    {/* Text */}
                    <h2 className="text-center text-xl font-black text-gray-900 mb-2 tracking-tight">
                        Delete Product?
                    </h2>
                    <p className="text-center text-sm font-medium text-gray-500 mb-1">
                        You are about to permanently delete
                    </p>

                    {/* Product name chip */}
                    <div className="flex items-center justify-center gap-3 my-4 p-3 bg-red-50/80 border border-red-100">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-9 h-9 object-cover border border-red-100 shadow-sm"
                            />
                        ) : (
                            <div className="w-9 h-9 bg-red-100 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-red-400" />
                            </div>
                        )}
                        <div className="text-left">
                            <p className="text-sm font-black text-red-800 line-clamp-1">{product.name}</p>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{product.category}</p>
                        </div>
                    </div>

                    <p className="text-center text-xs font-semibold text-gray-400 mb-7">
                        This action <span className="text-red-500 font-black">cannot be undone</span>. All data associated with this product will be permanently removed.
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={deleting}
                            className="flex-1 py-3 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-sm transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={deleting}
                            className="flex-1 py-3 px-5 bg-red-500 hover:bg-red-600 text-white font-black text-sm shadow-sm hover:scale-[1.02] transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {deleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                    Delete Product
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Toast Notification ─── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
    return (
        <div
            className={`fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300 ${type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800'
                : 'bg-red-50/95 border-red-200 text-red-800'
                }`}
        >
            <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {type === 'success' ? (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <X className="w-4 h-4 text-red-600" />
                )}
            </div>
            <p className="font-bold text-sm">{message}</p>
        </div>
    );
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [stockStatus, setStockStatus] = useState('All');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const mapProduct = (p: any): Product => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price) || 0,
        stock: p.stock !== undefined ? p.stock : (p.stock_quantity || 0),
        category: p.category_name || p.category || 'Uncategorized',
        image: p.image,
        status: (p.stock || p.stock_quantity || 0) === 0 ? 'Out of Stock' : (p.stock || p.stock_quantity || 0) < 10 ? 'Low Stock' : 'Active',
        ...p
    });

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await productService.getAll({ ordering: '-created_at' });
            const apiProducts = Array.isArray(data) ? data : (data as any).results || [];
            setProducts(apiProducts.map(mapProduct));
        } catch (error) {
            console.error('Failed to load products', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProducts(); }, []);

    // Auto-filter whenever any filter changes
    useEffect(() => {
        let result = [...products];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        }
        if (selectedCategory !== 'All') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (priceMin) result = result.filter(p => p.price >= Number(priceMin));
        if (priceMax) result = result.filter(p => p.price <= Number(priceMax));
        if (stockStatus !== 'All') {
            if (stockStatus === 'In Stock') result = result.filter(p => p.stock > 10);
            if (stockStatus === 'Low Stock') result = result.filter(p => p.stock <= 10 && p.stock > 0);
            if (stockStatus === 'Out of Stock') result = result.filter(p => p.stock === 0);
        }

        setFilteredProducts(result);
    }, [searchQuery, selectedCategory, stockStatus, priceMin, priceMax, products]);

    const handleReset = () => {
        setSearchQuery('');
        setSelectedCategory('All');
        setStockStatus('All');
        setPriceMin('');
        setPriceMax('');
    };

    const handleDeleteClick = (product: Product) => {
        setDeleteTarget(product);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await productService.delete(deleteTarget.id);
            setDeleteTarget(null);
            showToast(`"${deleteTarget.name}" deleted successfully.`, 'success');
            loadProducts();
        } catch {
            showToast('Failed to delete product. Please try again.', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const hasActiveFilters = selectedCategory !== 'All' || stockStatus !== 'All' || priceMin || priceMax;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <DeleteModal
                    product={deleteTarget}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => !deleting && setDeleteTarget(null)}
                    deleting={deleting}
                />
            )}

            {/* ── Toast ── */}
            {toast && <Toast message={toast.message} type={toast.type} />}

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-100/30 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-orange-50/40 blur-[100px]" />
            </div>

            {/* ── Combined Header + Filters Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/8 rounded-full blur-[80px] -z-10 pointer-events-none" />

                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0">
                            <Box className="h-5 w-5 text-[#131921]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Products</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Manage your product catalog and inventory
                            </p>
                        </div>
                    </div>
                    <Link href="/admin/products/add">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all duration-200">
                            <Plus className="h-4 w-4" strokeWidth={2.5} /> Add Product
                        </button>
                    </Link>
                </div>

                {/* Filters Row */}
                <div className="px-7 sm:px-10 py-5 flex flex-col gap-4">
                    {/* Search + Toggle */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search Bar */}
                        <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-2.5 flex-1 min-w-[200px] focus-within:ring-2 focus-within:ring-[#FF9900]/30 focus-within:border-[#FF9900] shadow-sm transition-all">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                            <input
                                type="text"
                                placeholder="Search products by name, category..."
                                className="text-sm text-gray-900 outline-none w-full bg-transparent font-medium placeholder:text-gray-400"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl border transition-all duration-300 ${showFilters || hasActiveFilters
                                ? 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <Filter className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Filters
                            {hasActiveFilters && (
                                <span className="w-4 h-4 text-[9px] bg-[#FF9900] text-[#131921] rounded-full flex items-center justify-center font-black">
                                    {[selectedCategory !== 'All', stockStatus !== 'All', !!priceMin, !!priceMax].filter(Boolean).length}
                                </span>
                            )}
                            <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                        </button>

                        {hasActiveFilters && (
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-all"
                            >
                                <X className="h-3 w-3" /> Reset
                            </button>
                        )}

                        <p className="text-xs font-bold text-gray-400 ml-auto">
                            {loading ? '...' : `${filteredProducts.length} of ${products.length} products`}
                        </p>
                    </div>

                    {/* Expandable Advanced Filters */}
                    {showFilters && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100/60 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Category */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Category</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#FF9900]" strokeWidth={2.5} />
                                    <select
                                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-xs font-bold text-gray-900 shadow-sm transition-all appearance-none cursor-pointer"
                                        value={selectedCategory}
                                        onChange={e => setSelectedCategory(e.target.value)}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Stock Status */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Stock Status</label>
                                <div className="relative">
                                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400" strokeWidth={2.5} />
                                    <select
                                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-xs font-bold text-gray-900 shadow-sm transition-all appearance-none cursor-pointer"
                                        value={stockStatus}
                                        onChange={e => setStockStatus(e.target.value)}
                                    >
                                        {STOCK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Price Range (Rs.)</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-xs font-bold text-gray-900 shadow-sm transition-all placeholder:text-gray-300"
                                            value={priceMin}
                                            onChange={e => setPriceMin(e.target.value)}
                                        />
                                    </div>
                                    <span className="text-gray-300 font-bold">—</span>
                                    <div className="relative flex-1">
                                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-xs font-bold text-gray-900 shadow-sm transition-all placeholder:text-gray-300"
                                            value={priceMax}
                                            onChange={e => setPriceMax(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Products Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#FF9900]/4 blur-[100px] pointer-events-none -z-10" />

                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading products...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-16 h-16 bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Package className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="font-black text-gray-900 mb-1">
                            {searchQuery || hasActiveFilters ? 'No products match your filters' : 'No products yet'}
                        </p>
                        <p className="text-sm font-medium text-gray-400 mt-1">
                            {searchQuery || hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first product to get started.'}
                        </p>
                        {(searchQuery || hasActiveFilters) && (
                            <button className="mt-4 text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-8 py-4">Product</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Origin</th>
                                    <th className="px-6 py-4">Price</th>
                                    <th className="px-6 py-4">Stock</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-200 border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">IMG</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-[#FF9900] transition-colors text-sm">{product.name}</p>
                                                    <div className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">{product.id ? `ID: ${String(product.id).split('-')[0]}` : 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.company_category_name ? (
                                                <span className="bg-sky-50 text-sky-600 border border-sky-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                    {product.company_category_name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-bold text-[10px]">LOCAL</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-black text-gray-900">
                                            <span className="text-[10px] font-bold text-emerald-500 mr-1">Rs.</span>
                                            {Number(product.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-gray-700">{product.stock}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">units</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.stock > 20 ? (
                                                <Badge variant="success" className="rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm border border-emerald-100 bg-emerald-50 text-emerald-600">In Stock</Badge>
                                            ) : product.stock > 0 ? (
                                                <Badge variant="warning" className="rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm border border-orange-100 bg-orange-50 text-orange-600">Low Stock</Badge>
                                            ) : (
                                                <Badge variant="error" className="rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm border border-red-100 bg-red-50 text-red-600">Out of Stock</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <Link href={`/admin/products/${product.id}`}>
                                                    <button className="p-2 bg-white border border-transparent hover:border-orange-200 hover:bg-orange-50 text-orange-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all" title="Edit">
                                                        <Edit className="h-4 w-4" strokeWidth={2.5} />
                                                    </button>
                                                </Link>
                                                <button onClick={() => handleDeleteClick(product)} className="p-2 bg-white border border-transparent hover:border-red-200 hover:bg-red-50 text-red-500 rounded-xl hover:scale-110 hover:shadow-sm transition-all" title="Delete">
                                                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
