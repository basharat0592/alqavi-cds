'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Tag,
    RefreshCw, CheckCircle, Database, Activity,
    Save, Loader2, FolderTree, ArrowLeft, X, AlertTriangle
} from 'lucide-react';
import { categoryService } from '@/lib/api';
import { ProductCategory } from '@/types';

// ─── Shared Utilities ─────────────────────────────────────────────────────────
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
export default function CategoriesPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const [editCat, setEditCat] = useState<ProductCategory | null>(null);
    const [deleteCat, setDeleteCat] = useState<ProductCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form State
    const [form, setForm] = useState<Partial<ProductCategory>>({
        name: '', description: '', slug: '', status: 'active'
    });

    const load = async () => {
        setLoading(true);
        try {
            const data = await categoryService.getAll();
            setCategories(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleEdit = (cat: ProductCategory) => {
        setEditCat(cat);
        setForm(cat);
        setView('form');
    };

    const handleNew = () => {
        setEditCat(null);
        setForm({ name: '', description: '', slug: '', status: 'active' });
        setView('form');
    };

    const handleDelete = (cat: ProductCategory) => {
        setDeleteCat(cat);
    };

    const confirmDelete = async () => {
        if (!deleteCat) return;
        setDeleting(true);
        try {
            await categoryService.delete(deleteCat.id);
            setCategories(prev => prev.filter(c => c.id !== deleteCat.id));
            showToast('Category deleted.');
        } catch (e) {
            console.error(e);
            alert('Failed to delete category.');
        } finally {
            setDeleting(false);
            setDeleteCat(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editCat) {
                await categoryService.update(editCat.id, form);
                showToast('Category updated.');
            } else {
                await categoryService.create(form as any);
                showToast('Category created.');
            }
            await load();
            setView('list');
        } catch (e) {
            console.error(e);
            alert('Failed to save category.');
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
            <div className="max-w-4xl mx-auto py-8 px-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-normal text-gray-900 dark:text-white">
                        {editCat ? 'Edit Category' : 'Add New Category'}
                    </h1>
                    <button onClick={() => setView('list')} className="text-xs font-bold text-gray-400 hover:text-[#C45500] hover:underline flex items-center gap-1 uppercase tracking-wider">
                        <ArrowLeft className="w-4 h-4" /> Back to list
                    </button>
                </div>

                <form onSubmit={handleSave}>
                    <SectionCard>
                        <SectionHeader title="Category Information" icon={Tag} />
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={LABEL}>Category Name <span className="text-red-700">*</span></label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={e => {
                                            const name = e.target.value;
                                            setForm({
                                                ...form,
                                                name,
                                                slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
                                            });
                                        }}
                                        className={INPUT()}
                                        placeholder="e.g. Cleansing Products"
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>URL Slug</label>
                                    <input
                                        value={form.slug}
                                        onChange={e => setForm({ ...form, slug: e.target.value })}
                                        className={INPUT()}
                                        placeholder="e.g. cleansing-products"
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>System Status</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value as any })}
                                        className={INPUT()}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={LABEL}>Description</label>
                                    <textarea
                                        rows={4}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className={INPUT() + ' resize-none'}
                                        placeholder="Enter a brief description for this category..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-800 rounded text-sm hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-1.5 bg-[#f0c14b] border border-[#a88734] rounded text-sm hover:bg-[#ebae1e] shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-gray-800" />}
                                {editCat ? 'Save Changes' : 'Add Category'}
                            </button>
                        </div>
                    </SectionCard>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            {/* Simple Amazon Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <FolderTree className="h-6 w-6 text-[#FF9900]" /> Product Categories
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage global product taxonomy and classification</p>
                </div>
                <button
                    onClick={handleNew}
                    className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Category
                </button>
            </div>

            {/* Filter Hub */}
            <SectionCard className="mb-6">
                <div className="p-4 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search categories..."
                            className={INPUT()}
                        />
                    </div>
                    <button onClick={load} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </SectionCard>

            {/* Categories Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Category Name</th>
                                <th className="px-6 py-3">URL Slug</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={4} className="px-6 py-6 animate-pulse"><div className="h-4 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No categories found. Click "Add Category" to start.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{cat.name}</div>
                                            <div className="text-[10px] text-gray-400 line-clamp-1 max-w-xs">{cat.description || 'Global classification standard.'}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-indigo-600 dark:text-indigo-400">/{cat.slug}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {cat.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(cat)} className="p-1.5 text-gray-600 hover:text-gray-400 hover:text-[#FF9900] transition-colors">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(cat)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
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
            {deleteCat && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                            </div>
                            <button onClick={() => setDeleteCat(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete the category <span className="font-bold text-gray-900 dark:text-white">"{deleteCat.name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteCat(null)}
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
                                Delete Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Amazon-Style Toast Feedback */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}
