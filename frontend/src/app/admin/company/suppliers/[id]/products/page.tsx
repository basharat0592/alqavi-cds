"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    Package, ChevronLeft, Plus, ShoppingCart, 
    Search, RefreshCw, Edit, Trash2, 
    Filter, LayoutGrid, List, AlertTriangle 
} from 'lucide-react';
import { productService, companyService } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SupplierProductsPage() {
    const router = useRouter();
    const params = useParams();
    const supplierId = params.id as string;

    const [supplier, setSupplier] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [suppData, prodData] = await Promise.all([
                companyService.getSupplierById(supplierId),
                productService.getAll({ supplier: supplierId } as any)
            ]);
            setSupplier(suppData);
            setProducts(Array.isArray(prodData) ? prodData : (prodData as any).results || []);
        } catch (err) {
            console.error('Failed to load supplier products:', err);
        } finally {
            setLoading(false);
        }
    }, [supplierId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filtered = products.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center font-sans pr-20">
                <div className="text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#1D4ED8] animate-spin mx-auto" />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Catalog Access in Progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="space-y-1">
                    <button 
                        onClick={() => router.push('/admin/company/suppliers')}
                        className="text-sm font-medium text-slate-500 hover:text-[#1D4ED8] transition-colors mb-2 flex items-center gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" /> Back to Suppliers
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="h-6 w-6 text-[#1D4ED8]" />
                        {supplier?.name || 'Partner'} Catalog
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Centralized repository of published listings from this node
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => router.push(`/admin/purchases/add?supplier_name=${encodeURIComponent(supplier?.name || '')}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        Initiate Purchase
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search SKU or listing name..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-1 border border-slate-200 dark:border-white/10 rounded-lg p-1 bg-white dark:bg-[#1B1C1E]">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#1D4ED8] text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#1D4ED8] text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── Content Area ── */}
            {filtered.length > 0 ? (
                viewMode === 'list' ? (
                    <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Product Identifier</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Classification</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Valuation (PKR)</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Inventory Flux</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filtered.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-lg p-1 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#1D4ED8]/30 transition-colors">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain" />
                                                        ) : (
                                                            <Package className="h-5 w-5 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-[#1D4ED8] transition-colors leading-tight">{p.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">SKU: {p.sku || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-[#1D4ED8] rounded border border-blue-100 dark:border-blue-900/40 text-[11px] font-semibold uppercase tracking-tight">
                                                    {p.category_name || 'Beauty General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                {parseFloat(p.price || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1.5">
                                                    <p className={`text-xs font-bold ${p.quantity_in_stock > 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {p.quantity_in_stock || 0} Units Available
                                                    </p>
                                                    <div className="w-24 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-700 ${p.quantity_in_stock > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                            style={{ width: `${Math.min((p.quantity_in_stock / 50) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="p-1.5 text-slate-400 hover:text-[#1D4ED8] rounded-md hover:bg-blue-50 transition-colors">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filtered.map(p => (
                            <div key={p.id} className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm hover:border-[#1D4ED8]/40 transition-all group">
                                <div className="aspect-square bg-slate-50/50 dark:bg-white/5 p-6 flex items-center justify-center border-b border-slate-100 dark:border-white/10 relative">
                                    {p.image_url ? (
                                        <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <Package className="h-12 w-12 text-slate-200" strokeWidth={1} />
                                    )}
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-widest leading-none">{p.category_name || 'Beauty General'}</p>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#1D4ED8] transition-colors uppercase tracking-tight">{p.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">SKU: {p.sku || 'N/A'}</p>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">PKR {parseFloat(p.price || 0).toLocaleString()}</p>
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.quantity_in_stock > 10 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {p.quantity_in_stock || 0} Stock
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="py-24 text-center">
                    <Package className="h-16 w-16 text-slate-200 dark:text-white/10 mx-auto mb-4" strokeWidth={1} />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Catalog Void</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        This partner node has not published any digital product manifest in the centralized registry.
                    </p>
                    <button 
                        onClick={() => router.push(`/admin/purchases/add?supplier_name=${encodeURIComponent(supplier?.name || '')}`)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1D4ED8] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <ShoppingCart className="h-4 w-4" /> Go to Purchase
                    </button>
                </div>
            )}

            {/* Warning Overlay */}
            {products.length > 0 && products.some(p => p.quantity_in_stock < 5) && (
                <div className="mt-8 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider mb-1">Critical Low Stock Manifest</h4>
                        <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-medium">
                            Operational intelligence indicates depletion in key SKUs from this node. Immediate re-acquisition protocol recommended.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
