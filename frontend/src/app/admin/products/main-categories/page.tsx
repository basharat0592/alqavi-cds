'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Layers,
    RefreshCw, CheckCircle, Package,
    Save, Loader2, X, ArrowLeft, AlertTriangle,
    ChevronRight, ChevronLeft, Filter
} from 'lucide-react';
import { mainCategoryService, productService, MainCategorySerializer } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

// ─── Shared Utilities ────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const LABEL = 'block text-xs font-bold text-gray-900 dark:text-gray-200 mb-1';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {action}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MainCategoriesPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [categories, setCategories] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [prodSearch, setProdSearch] = useState('');
    const [toast, setToast] = useState<string | null>(null);
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

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleEdit = (cat: any) => {
        setEditMode(cat);
        setForm({
            name: cat.name,
            description: cat.description || '',
            status: cat.status || 'active',
            product_ids: (cat.product_details || []).map((p: any) => p.id)
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
                showToast('Main Category updated.');
            } else {
                await mainCategoryService.create(payload);
                showToast('Main Category created.');
            }
            loadData();
            setView('list');
        } catch (e: any) {
            console.error(e);
            alert('Failed to save category.');
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
            showToast('Category deleted successfully.');
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(false);
            setDeleteItem(null);
        }
    };

    const filteredCats = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(prodSearch.toLowerCase())
    );

    if (view === 'form') {
        return (
            <div className="max-w-6xl mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {editMode ? 'Edit Main Category' : 'Create Main Category'}
                        </h1>
                        <p className="text-sm text-gray-500">Group your products for better organization and display</p>
                    </div>
                    <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-[#C45500] hover:underline flex items-center gap-1 font-bold">
                        <ArrowLeft className="w-4 h-4" /> BACK TO LIST
                    </button>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <SectionCard>
                            <SectionHeader title="General Information" icon={Layers} />
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={LABEL}>Category Name <span className="text-red-700">*</span></label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className={INPUT()}
                                        placeholder="e.g. Premium Skincare Collection"
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Description</label>
                                    <textarea
                                        rows={4}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className={INPUT() + ' resize-none'}
                                        placeholder="Briefly describe the purpose of this main category..."
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value as any })}
                                        className={INPUT()}
                                    >
                                        <option value="active">Active (Visible)</option>
                                        <option value="inactive">Inactive (Hidden)</option>
                                    </select>
                                </div>
                            </div>
                        </SectionCard>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="px-6 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-800 rounded text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-8 py-2 bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {editMode ? 'Save Changes' : 'Create Category'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <SectionCard>
                            <SectionHeader title="Product Selection" icon={Package} />
                            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 font-bold" />
                                    <input
                                        value={prodSearch}
                                        onChange={e => setProdSearch(e.target.value)}
                                        placeholder="Filter products..."
                                        className={INPUT()}
                                    />
                                </div>
                                <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {form.product_ids.length} selected
                                </div>
                            </div>
                            <div className="h-[500px] overflow-y-auto p-2 space-y-1">
                                {filteredProducts.map(p => {
                                    const isSelected = form.product_ids.includes(p.id);
                                    return (
                                        <div 
                                            key={p.id}
                                            onClick={() => toggleProductSelection(p.id)}
                                            className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${
                                                isSelected 
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' 
                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="w-10 h-10 rounded border bg-white dark:bg-slate-800 overflow-hidden flex-shrink-0">
                                                <img src={getImageUrl(p.image_url || p.image || '')} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white truncate uppercase">{p.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono">{p.sku}</p>
                                            </div>
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                isSelected ? 'bg-[#E68A00] border-[#E68A00]' : 'border-gray-300 dark:border-slate-700'
                                            }`}>
                                                {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </SectionCard>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 uppercase">
                        <Layers className="h-6 w-6 text-[#E68A00]" /> Main Category Management
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">High-level collections and groupings for your store</p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> New Main Category
                </button>
            </div>

            <SectionCard className="mb-6">
                <div className="p-4 flex gap-4 bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search categories..."
                            className={INPUT()}
                        />
                    </div>
                </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded h-40 animate-pulse" />
                    ))
                ) : filteredCats.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded">
                        <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No main categories created yet</p>
                    </div>
                ) : (
                    filteredCats.map(cat => (
                        <div key={cat.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm hover:shadow-md transition-shadow group overflow-hidden flex flex-col">
                            <div className="p-5 flex-1">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight leading-tight mb-1">{cat.name}</h3>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                            {cat.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(cat)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-600 dark:text-gray-400">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setDeleteItem(cat)} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-600 rounded">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 italic mb-4">
                                    {cat.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="px-5 py-3 border-t border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/30 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {(cat.product_details || []).slice(0, 3).map((p: any) => (
                                            <div key={p.id} className="w-6 h-6 rounded-full border border-white bg-white dark:bg-slate-800 overflow-hidden ring-2 ring-gray-50 dark:ring-slate-900">
                                                <img src={getImageUrl(p.image_url || p.image || '')} className="w-full h-full object-contain" alt="" title={p.name} />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase ml-2">
                                        {cat.product_details?.length || 0} Products
                                    </span>
                                </div>
                                <button onClick={() => handleEdit(cat)} className="text-[10px] font-bold text-[#C45500] hover:underline uppercase tracking-wider flex items-center gap-1">
                                    Manage <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation */}
            {deleteItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 uppercase tracking-tight">
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Delete Main Category</h3>
                            </div>
                            <button onClick={() => setDeleteItem(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium capitalize">
                                Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{deleteItem.name}"</span>? 
                                <br/><span className="text-[10px] text-red-500 uppercase mt-2 block font-black">This will not delete the associated products.</span>
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button 
                                onClick={() => setDeleteItem(null)} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded shadow-sm text-xs font-bold uppercase tracking-widest text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded shadow-sm text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                            >
                                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                                DELETE CATEGORY
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#E68A00] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-xs font-bold uppercase tracking-widest">{toast}</span>
                </div>
            )}
        </div>
    );
}
