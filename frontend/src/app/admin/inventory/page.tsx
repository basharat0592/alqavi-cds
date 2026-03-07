'use client';

import { useState, useEffect } from 'react';
import { productService } from '@/lib/api';
import {
    Package, Search, AlertTriangle, CheckCircle,
    XCircle, RefreshCw, ChevronUp, ChevronDown,
} from 'lucide-react';

function StockBadge({ stock }: { stock: number }) {
    const n = parseInt(String(stock));
    if (n === 0) return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-red-50 text-red-600 border-red-100 shadow-sm"><XCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> Out of Stock</span>;
    if (n < 10) return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-orange-50 text-orange-600 border-orange-100 shadow-sm"><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} /> Low ({n})</span>;
    return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm"><CheckCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> In Stock ({n})</span>;
}

type SortDir = 'asc' | 'desc';

export default function InventoryPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [productSearch, setProductSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
    const [productSort, setProductSort] = useState<{ key: string; dir: SortDir }>({ key: 'name', dir: 'asc' });

    const load = async () => {
        setLoading(true);
        try {
            let apiProducts: any[] = [];
            try {
                const p = await productService.getAll();
                apiProducts = Array.isArray(p) ? p : (p as any)?.results || [];
            } catch (err) {
                console.error('API Error', err);
            }
            const merged = apiProducts.map((p: any) => ({
                ...p,
                stock: p.stock !== undefined ? p.stock : (p.stock_quantity ?? 0),
                category_name: p.category_name || p.category || 'Uncategorized',
            }));
            setProducts(merged);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filteredProducts = products
        .filter(p => {
            const matchSearch =
                p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                p.category_name?.toLowerCase().includes(productSearch.toLowerCase());
            const stock = parseInt(p.stock ?? 0);
            const matchStock =
                stockFilter === 'all' ? true :
                    stockFilter === 'out' ? stock === 0 :
                        stock < 10 && stock > 0;
            return matchSearch && matchStock;
        })
        .sort((a, b) => {
            const va = a[productSort.key] ?? '';
            const vb = b[productSort.key] ?? '';
            if (typeof va === 'number') return productSort.dir === 'asc' ? va - vb : vb - va;
            return productSort.dir === 'asc'
                ? String(va).localeCompare(String(vb))
                : String(vb).localeCompare(String(va));
        });

    const toggleSort = (key: string) => {
        setProductSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    };

    const outOfStock = products.filter(p => parseInt(p.stock ?? 0) === 0).length;
    const lowStock = products.filter(p => parseInt(p.stock ?? 0) > 0 && parseInt(p.stock ?? 0) < 10).length;

    const SortIcon = ({ k }: { k: string }) =>
        productSort.key === k
            ? productSort.dir === 'asc' ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />
            : null;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/15/30 blur-[120px]" />
                <div className="absolute top-[20%] right-[0%] w-[30%] h-[50%] rounded-full bg-[#FF9900]/10/40 blur-[100px]" />
            </div>

            {/* ── Merged Header + Stats Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/6 rounded-full blur-[80px] -z-10 pointer-events-none" />

                {/* Title + Refresh Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-[#FF9900] to-[#e68a00] rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,113,133,0.25)] flex-shrink-0">
                            <Package className="h-5 w-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Inventory</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Manage product stock levels and alerts
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 hover:shadow-sm hover:text-gray-900 transition-all duration-300 disabled:opacity-50 self-start sm:self-auto"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                        Refresh Data
                    </button>
                </div>

                {/* 3 Stat Pills Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100/60 px-0">
                    {/* Total Products */}
                    <div className="flex items-center justify-between px-7 sm:px-10 py-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Products</p>
                            <p className="text-3xl font-black text-gray-900 tracking-tight">{loading ? '—' : products.length}</p>
                        </div>
                        <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <Package className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Low Stock */}
                    <div className="flex items-center justify-between px-7 sm:px-10 py-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Low Stock Alerts</p>
                            <p className="text-3xl font-black text-orange-600 tracking-tight">{loading ? '—' : lowStock}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <AlertTriangle className="w-5 h-5 text-orange-400" />
                        </div>
                    </div>

                    {/* Out of Stock */}
                    <div className="flex items-center justify-between px-7 sm:px-10 py-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Out of Stock</p>
                            <p className="text-3xl font-black text-red-600 tracking-tight">{loading ? '—' : outOfStock}</p>
                        </div>
                        <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Inventory Table Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#FF9900]/4 blur-[100px] pointer-events-none -z-10" />

                {/* Search + Filter Bar */}
                <div className="px-6 sm:px-8 py-5 border-b border-gray-100/50 bg-gradient-to-b from-white to-transparent flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[180px] focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400" strokeWidth={2.5} />
                        <input
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            placeholder="Search inventory..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { key: 'all', label: 'All Items' },
                            { key: 'low', label: '⚠ Low Stock' },
                            { key: 'out', label: '✕ Out of Stock' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setStockFilter(f.key as any)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-sm border ${stockFilter === f.key
                                        ? 'bg-gradient-to-r from-[#FF9900] to-[#e68a00] text-white border-transparent shadow-[0_4px_15px_rgba(0,113,133,0.25)] -translate-y-0.5'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:-translate-y-0.5'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col justify-center items-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Inventory...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-20 text-center relative z-10 px-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Package className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-900 font-bold mb-1">No products found in inventory.</p>
                        <p className="text-gray-400 text-sm font-medium">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto relative z-10 pb-2">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-8 py-4 cursor-pointer hover:text-gray-800 transition-colors" onClick={() => toggleSort('name')}>
                                        <div className="flex items-center gap-1.5">Product <SortIcon k="name" /></div>
                                    </th>
                                    <th className="text-left px-5 py-4 cursor-pointer hover:text-gray-800 transition-colors" onClick={() => toggleSort('category_name')}>
                                        <div className="flex items-center gap-1.5">Category <SortIcon k="category_name" /></div>
                                    </th>
                                    <th className="text-left px-5 py-4 cursor-pointer hover:text-gray-800 transition-colors" onClick={() => toggleSort('price')}>
                                        <div className="flex items-center gap-1.5">Price <SortIcon k="price" /></div>
                                    </th>
                                    <th className="text-left px-5 py-4 cursor-pointer hover:text-gray-800 transition-colors" onClick={() => toggleSort('stock')}>
                                        <div className="flex items-center gap-1.5">Stock <SortIcon k="stock" /></div>
                                    </th>
                                    <th className="text-left px-5 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredProducts.map((p, i) => (
                                    <tr key={p.id || i} className="hover:bg-white/60 transition-all duration-300 group border-b border-gray-50/50 last:border-0">
                                        <td className="px-8 py-4 font-black text-gray-900">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-200 border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                                    {p.image ? (
                                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <span className="truncate max-w-[200px] group-hover:text-[#FF9900] transition-colors text-sm">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                            <span className="bg-gray-100 px-3 py-1.5 rounded-xl">{p.category_name || p.category || '—'}</span>
                                        </td>
                                        <td className="px-5 py-4 font-black text-gray-900 text-sm">
                                            <span className="text-[10px] font-bold text-emerald-500 mr-1">Rs.</span>
                                            {(parseFloat(p.price || 0) * 280).toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 font-black text-gray-900 text-sm">
                                            {p.stock ?? '—'} <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">units</span>
                                        </td>
                                        <td className="px-5 py-4 group-hover:scale-105 transition-transform origin-left">
                                            <StockBadge stock={parseInt(p.stock ?? 0)} />
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
