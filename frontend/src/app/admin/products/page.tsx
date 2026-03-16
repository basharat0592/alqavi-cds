'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit, Trash2, Package,
    RefreshCw, Filter, Barcode, Hash,
    X, AlertTriangle, CheckCircle
} from 'lucide-react';
import { productService, companyService, Product, CompanyInfo } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';
import { Building2 } from 'lucide-react';

// ─── Shared Utilities (Consistency with Company pages) ────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [deleteProd, setDeleteProd] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodData, catData, compData] = await Promise.all([
                productService.getAll(),
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

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = async () => {
        if (!deleteProd) return;
        setDeleting(true);
        try {
            await productService.delete(deleteProd.id);
            setProducts(prev => prev.filter(p => p.id !== deleteProd.id));
            showToast('Product removed from inventory.');
        } catch (error) {
            console.error(error);
            alert('Failed to delete product.');
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

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            {/* Simple Amazon Style Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Package className="h-6 w-6 text-[#E68A00]" /> Consolidated Inventory
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage your primary product listings and digital distribution catalog</p>
                </div>
                <button
                    onClick={() => router.push('/admin/products/add')}
                    className="bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add New Product
                </button>
            </div>

            {/* Quick Filter Hub */}
            <SectionCard className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, SKU..."
                            className={INPUT()}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4 h-8">
                            <Filter className="h-3 w-3 text-gray-400" />
                            <select 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)}
                                className="text-[10px] font-black bg-transparent outline-none text-gray-600 dark:text-gray-300 uppercase tracking-widest cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 border-l border-gray-200 pl-4 h-8">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            <select 
                                value={selectedCompany} 
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="text-[10px] font-black bg-transparent outline-none text-gray-600 dark:text-gray-300 uppercase tracking-widest cursor-pointer"
                            >
                                <option value="">All Companies</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button onClick={loadData} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ml-auto">
                            <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* List Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Product Context</th>
                                <th className="px-6 py-3">Pricing</th>
                                <th className="px-6 py-3">SKU / Barcode</th>
                                <th className="px-6 py-3">Stock Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-6 animate-pulse"><div className="h-4 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Your inventory is currently empty.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(prod => (
                                    <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-white border border-[#eee] rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                    {(prod.image_url || prod.image) ? (
                                                        <img src={getImageUrl((prod.image_url || prod.image || '') as string) || undefined} alt="" className="max-w-full max-h-full object-contain" />
                                                    ) : (
                                                        <Package className="w-6 h-6 text-gray-200" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">{prod.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{prod.category_name || 'Standard Catalog'}</div>
                                                        {prod.company_name && (
                                                            <>
                                                                <span className="text-gray-300">•</span>
                                                                <div className="text-[10px] text-[#E68A00] font-black uppercase tracking-wider">{prod.company_name}</div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Rs. {Number(prod.price).toLocaleString()}</div>
                                            <div className="text-[9px] text-gray-400 font-black uppercase mt-0.5">Cost: {Number(prod.cost).toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded w-fit">
                                                    <Hash className="h-3 w-3 text-gray-400" />
                                                    <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">{prod.sku || 'NO-SKU'}</span>
                                                </div>
                                                {prod.barcode && (
                                                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase">
                                                        <Barcode className="h-3 w-3" />
                                                        <span>{prod.barcode}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${(prod.quantity_in_stock || 0) > 10 ? 'bg-green-500' : (prod.quantity_in_stock || 0) > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
                                                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-200">{prod.quantity_in_stock || 0} Units</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${prod.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {prod.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => router.push(`/admin/products/${prod.id}`)} className="p-1.5 text-gray-600 hover:text-[#E68A00] transition-colors">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setDeleteProd(prod)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
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
            </SectionCard>

            {/* Amazon-Style Delete Modal */}
            {deleteProd && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                            </div>
                            <button onClick={() => setDeleteProd(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{deleteProd.name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button 
                                onClick={() => setDeleteProd(null)} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-xs font-medium text-[#111] transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <Plus className="h-3 w-3 animate-spin" />}
                                Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#E68A00] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}
