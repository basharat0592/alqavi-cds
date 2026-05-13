"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Package,
    RefreshCw, Filter, Image as ImageIcon,
    X, AlertTriangle, CheckCircle, Building2, Activity,
    ChevronLeft, ChevronRight, Truck, MapPin, TrendingUp
} from 'lucide-react';
import { productService, categoryService, supplierService, inventoryService } from '@/lib/api';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PRODUCT LIST
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [deleteProd, setDeleteProd] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [supplier, setSupplier] = useState('');
    const [ordering, setOrdering] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 10;

    const fetchFilters = async () => {
        try {
            const [cats, sups] = await Promise.all([
                categoryService.getAll(),
                supplierService.getAll()
            ]);
            setCategories(cats || []);
            setSuppliers(sups || []);
        } catch { console.error('Filter sync failure'); }
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
            };
            const [resp, stockResp, catProdData] = await Promise.all([
                productService.getAll(params),
                inventoryService.getInventory(),
                productService.getAllSupplier({ no_pagination: 'true' })
            ]);

            setAllStocks(stockResp || []);
            setCatalogProducts(Array.isArray(catProdData) ? catProdData : catProdData?.results || []);

            if (resp && typeof resp === 'object' && 'results' in resp) {
                setProducts(resp.results);
                setTotalCount(resp.count);
            } else {
                setProducts(Array.isArray(resp) ? resp : []);
                setTotalCount(Array.isArray(resp) ? resp.length : 0);
            }
        } catch { toast.error("Communication failure"); } finally {
            setSyncing(false);
            setLoading(false);
        }
    }, [currentPage, search, category, supplier, ordering]);

    useEffect(() => { fetchFilters(); }, []);
    useEffect(() => {
        const t = setTimeout(loadData, 300);
        return () => clearTimeout(t);
    }, [loadData]);

    // Live Telemetry: Auto-update every 2 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            if (!loading && !syncing && !deleting) {
                loadData();
            }
        }, 2000);
        return () => clearInterval(timer);
    }, [loading, syncing, deleting, loadData]);

    const handleDelete = async () => {
        if (!deleteProd) return;
        setDeleting(true);
        try {
            await productService.delete(deleteProd.id);
            toast.success('Product deleted');
            setDeleteProd(null);
            loadData();
        } catch { toast.error('Failed to delete product'); } finally { setDeleting(false); }
    };

    // Grouped Products: Merge by [Name + Selling Price]
    const groupedProducts = useMemo(() => {
        const groups = new Map();

        products.forEach(prod => {
            const key = `${(prod.product_name || '').toLowerCase().trim()}_${prod.selling_price}`;

            if (!groups.has(key)) {
                groups.set(key, { ...prod, total_quantity: Number(prod.total_quantity || 0) });
            } else {
                const g = groups.get(key);
                g.total_quantity = (g.total_quantity || 0) + Number(prod.total_quantity || 0);

                // Track if multiple warehouses are involved in this price point
                if (g.warehouse_name !== prod.warehouse_name) {
                    g.warehouse_name = 'Multiple';
                }
            }
        });

        return Array.from(groups.values());
    }, [products]);

    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5 text-left">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Products</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">Products List</h1>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={loadData} loading={syncing}>
                            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Refresh
                        </Btn>
                        <Btn onClick={() => router.push('/admin/products/add')}>
                            <Plus size={14} /> Add Product
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {/* Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Search by name, code or supplier..."
                            className="w-full h-[35px] pl-10 pr-4 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all"
                        />
                    </div>
                    <select value={category} onChange={e => { setCategory(e.target.value); setCurrentPage(1); }} className="h-[35px] px-3 bg-white border border-[#888c8e] rounded-[3px] text-[13px] outline-none cursor-pointer">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={supplier} onChange={e => { setSupplier(e.target.value); setCurrentPage(1); }} className="h-[35px] px-3 bg-white border border-[#888c8e] rounded-[3px] text-[13px] outline-none cursor-pointer">
                        <option value="">All Suppliers</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f7f8fa] border-b border-[#ddd] transition-colors">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111]">Product</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111]">Price</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] text-center">Status</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] text-right">Current Units</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {loading && products.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">Loading...</td></tr>
                                ) : products.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">No products found.</td></tr>
                                ) : (
                                    groupedProducts.map(prod => {
                                        return (
                                            <tr key={prod.id} className="hover:bg-[#fcfdff] transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white border border-[#eee] rounded-[3px] flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                                                            {(() => {
                                                                const finalImg = prod.image || prod.catalog_image;
                                                                return finalImg ? (
                                                                    <img src={getImageUrl(finalImg)} alt="" className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <Package className="h-6 w-6 text-slate-100" />
                                                                );
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="text-[14px] font-bold text-[#007185] cursor-pointer hover:underline" onClick={() => router.push(`/admin/products/edit/${prod.id}`)}>
                                                                        {prod.product_name.replace(/\s*\(.*?\)\s*$/, '')}
                                                                    </div>
                                                                    {(prod.weight || prod.size) && (
                                                                        <span className="text-[10px] text-[#e77600] font-black uppercase tracking-tight shrink-0">
                                                                            — {prod.weight}{prod.weight && prod.size ? ' • ' : ''}{prod.size}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {prod.badge && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#e47911] text-white rounded-[2px] uppercase">{prod.badge}</span>}
                                                            </div>
                                                            <div className="text-[11px] text-[#565959] mt-0.5 flex items-center gap-2">
                                                                <span className="flex items-center gap-1"><Truck size={12} className="opacity-40" /> {prod.supplier_name}</span>
                                                                <span className="opacity-20">|</span>
                                                                <span className="flex items-center gap-1"><MapPin size={11} className="opacity-40" /> {prod.warehouse_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-[15px] font-bold text-[#111]">{formatCurrency(prod.selling_price)}</div>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <TrendingUp className="h-3 w-3 text-green-600" />
                                                        <span className="text-[10px] font-bold text-green-700">{Number(prod.profit_margin).toFixed(1)}% profit</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${prod.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                        {prod.status === 'ACTIVE' ? 'Visible' : 'Hidden'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className={`text-[16px] font-black ${(prod.total_quantity || 0) < 10 ? 'text-red-600' : 'text-[#111]'}`}>
                                                        {(prod.total_quantity || 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] text-[#aaa] font-bold uppercase tracking-tighter">Unit Balance</div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-2 transition-opacity">
                                                        <Btn variant="secondary" onClick={() => router.push(`/admin/products/edit/${prod.id}`)} className="h-[26px]">Edit</Btn>
                                                        <button onClick={() => setDeleteProd(prod)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-[#f7f8fa] border-t border-[#ddd] flex items-center justify-between">
                            <p className="text-[11px] text-[#565959] italic">Showing {products.length} of {totalCount} products</p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 disabled:opacity-30 text-[#007185] hover:bg-white rounded"><ChevronLeft size={20} /></button>
                                <span className="text-[13px] font-bold px-4">Page {currentPage} of {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 disabled:opacity-30 text-[#007185] hover:bg-white rounded"><ChevronRight size={20} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Modal */}
            {deleteProd && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Delete Product?</h3>
                        <p className="text-[13px] text-[#565959]">
                            Delete <span className="font-bold text-[#111]">"{deleteProd.product_name}"</span>?
                        </p>
                        <div className="mt-6 space-y-2">
                            <button onClick={handleDelete} disabled={deleting} className="w-full h-[31px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-medium shadow-sm active:bg-red-800">
                                {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button onClick={() => setDeleteProd(null)} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
