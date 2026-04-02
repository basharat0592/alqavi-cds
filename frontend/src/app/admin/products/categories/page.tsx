"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Tag,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle, Layers, Activity, Loader2
} from 'lucide-react';
import { categoryService, ProductCategory, mainCategoryService } from '@/lib/api';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#0D1921] border rounded-xl text-sm outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function ProductCategoriesPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [editCat, setEditCat] = useState<ProductCategory | null>(null);
    const [deleteCat, setDeleteCat] = useState<ProductCategory | null>(null);
    const [mainCategories, setMainCategories] = useState<any[]>([]);
    const [deleting, setDeleting] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        status: 'active' as 'active' | 'inactive',
        main_category: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const load = async () => {
        setLoading(true);
        try {
            const [data, mCats] = await Promise.all([
                categoryService.getAll(),
                mainCategoryService.getAll()
            ]);
            setCategories(data || []);
            setMainCategories(mCats || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleEdit = (cat: ProductCategory) => {
        setEditCat(cat);
        setForm({
            name: cat.name,
            description: cat.description || '',
            status: (cat.status?.toLowerCase() as any) || 'active',
            main_category: (cat as any).main_category_id || (cat as any).main_category || '',
        });
        setView('form');
    };

    const handleNew = () => {
        setEditCat(null);
        setForm({ name: '', description: '', status: 'active', main_category: '' });
        setView('form');
    };

    const confirmDelete = async () => {
        if (!deleteCat) return;
        setDeleting(true);
        try {
            await categoryService.delete(deleteCat.id);
            setCategories(prev => prev.filter(c => c.id !== deleteCat.id));
            toast.success('Category removed from records.');
        } catch (e) {
            console.error(e);
            toast.error('Failed to remove category.');
        } finally {
            setDeleting(false);
            setDeleteCat(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editCat) {
                await categoryService.update(editCat.id, form);
                toast.success('Category updated!');
            } else {
                await categoryService.create(form);
                toast.success('Category created!');
            }
            load();
            setView('list');
        } catch (e) {
            console.error(e);
            toast.error('Failed to save category registry.');
        } finally {
            setSaving(false);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    if (view === 'form') {
        return (
            <div className="max-w-4xl mx-auto py-8 px-6 font-sans">
                <div className="mb-8">
                    <button 
                        onClick={() => setView('list')} 
                        className="text-sm font-medium text-slate-500 hover:text-[#EEAF1C] transition-colors mb-4 flex items-center gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" /> Back to List
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        {editCat ? 'Edit Sub Category' : 'New Product Category'}
                    </h1>
                    <p className="text-sm text-slate-500">Organize your inventory with precise classifications</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                            <Layers className="h-4 w-4 text-[#EEAF1C]" />
                            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Category Parameters</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className={labelCls}>Category Name <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className={inputCls()}
                                        placeholder="e.g. Skin Care"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Parent Classification <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        name="main_category"
                                        value={form.main_category}
                                        onChange={handleChange}
                                        className={selectCls}
                                    >
                                        <option value="">Select Main Category</option>
                                        {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Visibility Status</label>
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className={selectCls}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className={labelCls}>Explanatory Note</label>
                                    <textarea
                                        name="description"
                                        rows={4}
                                        value={form.description}
                                        onChange={handleChange}
                                        className={inputCls() + ' resize-none'}
                                        placeholder="Describe the scope of this sub-category..."
                                    />
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
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-2.5 bg-[#EEAF1C] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {editCat ? 'Update Classification' : 'Initialize Category'}
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
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sub Categories</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage detailed product classifications</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all font-bold"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 px-4 py-2 bg-[#EEAF1C] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Add Category
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
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] focus:ring-2 focus:ring-[#EEAF1C]/10 transition-all placeholder:text-slate-400"
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
            <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Main Category</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Linked Items</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-20 text-center">
                                        <Tag className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No categories found in registry.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-[#EEAF1C] transition-colors leading-tight">{cat.name}</p>
                                            {cat.description && <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px] mt-0.5">{cat.description}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-tight">
                                                {(cat as any).main_category_name || 'Global'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 text-[#EEAF1C] flex items-center justify-center text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                                                    {(cat as any).product_count || 0}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Items Linked</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold uppercase ${cat.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
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
                                                    onClick={() => setDeleteCat(cat)} 
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

            {deleteCat && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0D1921] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Delete Category</h3>
                            </div>
                            <button onClick={() => setDeleteCat(null)} className="p-1 text-slate-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Confirm permanent removal of <span className="text-[#EEAF1C] font-bold">"{deleteCat.name}"</span>?
                                <br/><span className="text-[10px] text-red-500 font-bold uppercase mt-2 block">All associated records may be destabilized.</span>
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteCat(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50 transition-colors">Abort</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting} 
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />} Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

