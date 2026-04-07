"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Layers,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle,
    Activity, Loader2
} from 'lucide-react';
import { mainCategoryService, productService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-xl text-sm outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function MainCategoriesPage() {
    const router = useRouter();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [categories, setCategories] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [prodSearch, setProdSearch] = useState('');
    const [editMode, setEditMode] = useState<any | null>(null);
    const [deleteItem, setDeleteItem] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form State
    const [form, setForm] = useState({
        name: '',
        description: '',
        status: 'active' as 'active' | 'inactive',
        product_ids: [] as string[]
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, prods] = await Promise.all([
                mainCategoryService.getAll(),
                productService.getAll()
            ]);
            setCategories(cats || []);
            setAllProducts(Array.isArray(prods) ? prods : (prods as any).results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (cat: any) => {
        setEditMode(cat);
        setForm({
            name: cat.name,
            description: cat.description || '',
            status: cat.status || 'active',
            product_ids: (cat.product_details || []).map((p: any) => p.id) || []
        });
        setView('form');
    };

    const handleNew = () => {
        setEditMode(null);
        setForm({ name: '', description: '', status: 'active', product_ids: [] });
        setView('form');
    };

    const toggleProductSelection = (productId: string) => {
        setForm(prev => {
            const isSelected = prev.product_ids.includes(productId);
            if (isSelected) {
                return { ...prev, product_ids: prev.product_ids.filter(id => id !== productId) };
            } else {
                return { ...prev, product_ids: [...prev.product_ids, productId] };
            }
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                status: form.status,
                product_ids: form.product_ids
            };

            if (editMode) {
                await mainCategoryService.update(editMode.id, payload);
                toast.success('Main category updated!');
            } else {
                await mainCategoryService.create(payload);
                toast.success('Main category created!');
            }
            loadData();
            setView('list');
        } catch (e: any) {
            console.error(e);
            toast.error('Failed to save category registry.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        setDeleting(true);
        try {
            await mainCategoryService.delete(deleteItem.id);
            setCategories(prev => prev.filter(c => c.id !== deleteItem.id));
            toast.success('Category removed.');
        } catch (e) {
            console.error(e);
            toast.error('Failed to remove category.');
        } finally {
            setDeleting(false);
            setDeleteItem(null);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const filteredProds = allProducts.filter(p =>
        p.name?.toLowerCase().includes(prodSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(prodSearch.toLowerCase())
    );

    if (view === 'form') {
        return (
            <div className="max-w-6xl mx-auto py-8 px-6 font-sans">
                <div className="mb-8">
                    <button 
                        onClick={() => setView('list')} 
                        className="text-sm font-medium text-slate-500 hover:text-[#EEAF1C] transition-colors mb-4 flex items-center gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" /> Back to List
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {editMode ? 'Edit Main Category' : 'New Main Category'}
                    </h1>
                    <p className="text-sm text-slate-500">Define major inventory groups and link related products</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                                    <Layers className="h-4 w-4 text-[#EEAF1C]" />
                                    <h2 className="text-sm font-bold text-slate-800 dark:text-white">Category Details</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="space-y-1">
                                        <label className={labelCls}>Category Name <span className="text-red-500">*</span></label>
                                        <input
                                            required
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className={inputCls()}
                                            placeholder="e.g. Skin Care Pro"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelCls}>Visibility status</label>
                                        <select
                                            value={form.status}
                                            onChange={e => setForm({ ...form, status: e.target.value as any })}
                                            className={selectCls}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelCls}>Description</label>
                                        <textarea
                                            rows={4}
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                            className={inputCls() + ' resize-none'}
                                            placeholder="Define category scope..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                             <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm h-full flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Package className="h-4 w-4 text-[#EEAF1C]" />
                                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Link Products</h2>
                                    </div>
                                    <span className="text-xs font-bold text-[#EEAF1C] bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/40">
                                        {form.product_ids.length} selected
                                    </span>
                                </div>
                                <div className="p-4 border-b border-slate-100 dark:border-white/10">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            value={prodSearch}
                                            onChange={e => setProdSearch(e.target.value)}
                                            placeholder="Filter products to link..."
                                            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto max-h-[400px] grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {filteredProds.map(p => {
                                        const isSelected = form.product_ids.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => toggleProductSelection(p.id)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left border transition-all ${isSelected ? 'bg-blue-50 dark:bg-blue-900/10 border-[#EEAF1C]/30' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-[#EEAF1C]/20'}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#EEAF1C] border-[#EEAF1C]' : 'bg-white dark:bg-white/10 border-slate-300 dark:border-white/20'}`}>
                                                    {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#EEAF1C]' : 'text-slate-700 dark:text-slate-300'}`}>{p.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">SKU: {p.sku}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-2.5 bg-[#EEAF1C] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Category
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Main Categories</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Organize your products into major groups</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 px-4 py-2 bg-[#EEAF1C] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Add Main Category
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] focus:ring-2 focus:ring-[#EEAF1C]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                    <Activity className="h-3.5 w-3.5 text-[#EEAF1C]" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                        {categories.length} Total Categories
                    </span>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Linked Products</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Status</th>
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
                                    <td colSpan={4} className="px-4 py-20 text-center">
                                        <Layers className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No main categories found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-[#EEAF1C] transition-colors leading-tight">{cat.name}</p>
                                            {cat.description && <p className="text-[10px] text-slate-400 font-medium truncate max-w-[250px] mt-0.5">{cat.description}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 text-[#EEAF1C] flex items-center justify-center text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                                                    {cat.products?.length || cat.product_details?.length || 0}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Products</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold uppercase ${cat.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                {cat.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => handleEdit(cat)} 
                                                    className="p-1.5 text-slate-400 hover:text-[#EEAF1C] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteItem(cat)} 
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
            </div>

            {deleteItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                         <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Delete Category</h3>
                            </div>
                            <button onClick={() => setDeleteItem(null)} className="p-1 text-slate-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Confirm permanent removal of <span className="text-[#EEAF1C] font-bold">"{deleteItem.name}"</span>?
                                <br/><span className="text-[10px] text-red-500 font-bold uppercase mt-2 block">System hierarchy may be impacted.</span>
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteItem(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50 transition-colors">Abort</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting} 
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
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

