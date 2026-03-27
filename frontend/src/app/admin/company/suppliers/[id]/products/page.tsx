'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    Package, ArrowLeft, Plus, ShoppingCart, 
    Search, RefreshCw, Edit, Trash2, 
    Filter, LayoutGrid, List, AlertTriangle 
} from 'lucide-react';
import { productService, companyService } from '@/lib/api';

// ─── Shared Utilities (Matches Admin Aesthetic) ──────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-3 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {action}
    </div>
);

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
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-[#FF9900] animate-spin mx-auto" />
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Loading Catalog...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* ─── Breadcrumbs & Header ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <button 
                        onClick={() => router.push('/admin/company/suppliers')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:text-[#FF9900] transition-colors tracking-widest mb-1"
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Suppliers
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3">
                        <Package className="w-8 h-8 text-[#FF9900]" />
                        {supplier?.name || 'Supplier'} Catalog
                    </h1>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                        <span>{products.length} Products Found</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        <span>{supplier?.city || 'Global Origin'}</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => router.push(`/admin/purchases/add?supplier_name=${encodeURIComponent(supplier?.name || '')}`)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#111] font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                    >
                        <ShoppingCart className="w-4 h-4" /> Create Purchase
                    </button>
                </div>
            </div>

            {/* ─── Filter Bar ─── */}
            <SectionCard className="p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search product name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-[#FF9900] rounded-xl outline-none text-sm font-medium transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-800 pl-4">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#FF9900] text-black shadow-md' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#FF9900] text-black shadow-md' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
            </SectionCard>

            {/* ─── Content ─── */}
            {filtered.length > 0 ? (
                viewMode === 'list' ? (
                    <SectionCard>
                        <SectionHeader title="Inventory Ledger" icon={List} />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-800">
                                        <th className="px-6 py-4">Product Details</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Price (PKR)</th>
                                        <th className="px-6 py-4">Stock Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                    {filtered.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain" />
                                                        ) : (
                                                            <Package className="w-5 h-5 text-gray-200" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#FF9900] transition-colors">{p.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">SKU: {p.sku || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded text-[10px] font-black uppercase tracking-widest">
                                                    {p.category_name || 'General Beauty'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{parseFloat(p.price || 0).toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className={`text-sm font-black ${p.quantity_in_stock > 10 ? 'text-emerald-600' : 'text-orange-500'}`}>
                                                        {p.quantity_in_stock || 0} In Stock
                                                    </p>
                                                    <div className="w-24 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${p.quantity_in_stock > 10 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                                            style={{ width: `${Math.min((p.quantity_in_stock / 50) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="p-2 text-gray-400 hover:text-[#FF9900] hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-gray-200">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-gray-200">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filtered.map(p => (
                            <SectionCard key={p.id} className="group hover:border-[#FF9900] transition-colors">
                                <div className="aspect-square bg-white dark:bg-[#1B1C1E] p-6 flex items-center justify-center border-b border-gray-100 dark:border-slate-800 relative overflow-hidden">
                                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        <button className="p-2 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg shadow-xl hover:text-[#FF9900]"><Edit className="w-4 h-4" /></button>
                                        <button className="p-2 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg shadow-xl hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    {p.image_url ? (
                                        <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Package className="w-12 h-12 text-gray-100" strokeWidth={1} />
                                    )}
                                </div>
                                <div className="p-5 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">{p.category_name || 'General Beauty'}</p>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#FF9900] transition-colors">{p.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-1">SKU: {p.sku || 'N/A'}</p>
                                    </div>
                                    <div className="pt-3 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                                        <p className="text-sm font-black text-gray-900 dark:text-white">PKR {parseFloat(p.price || 0).toLocaleString()}</p>
                                        <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${p.quantity_in_stock > 10 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                                            {p.quantity_in_stock || 0} In Stock
                                        </p>
                                    </div>
                                </div>
                            </SectionCard>
                        ))}
                    </div>
                )
            ) : (
                <div className="py-24 text-center space-y-6">
                    <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-gray-100 dark:border-slate-800 shadow-xl">
                        <Package className="w-12 h-12 text-gray-200" strokeWidth={1} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-widest uppercase">Catalog is Depleted</h3>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium uppercase tracking-[0.2em] italic max-w-sm mx-auto leading-loose">
                            This vendor has not published any digital listings to the centralized repository. 
                        </p>
                    </div>
                    <button 
                         onClick={() => router.push(`/admin/purchases/add?supplier_name=${encodeURIComponent(supplier?.name || '')}`)}
                        className="px-8 py-3 bg-[#FF9900] text-black font-black text-xs uppercase rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-3 mx-auto"
                    >
                        <ShoppingCart className="w-4 h-4" /> Go to Purchase
                    </button>
                </div>
            )}

            {/* Warning Section */}
            {products.length > 0 && products.some(p => p.quantity_in_stock < 5) && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-[11px] font-black text-red-900 dark:text-red-200 uppercase tracking-[0.15em] mb-1 italic">Critical Stock Depletion Alert</h4>
                        <p className="text-[10px] text-red-700 dark:text-red-400 leading-relaxed font-bold">
                            Some products from this supplier are severely low on stock. It is recommended to create a Purchase Order immediately to avoid distribution gaps.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
