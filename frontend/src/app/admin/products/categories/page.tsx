"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Tag,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle, Layers, Activity, Loader2
} from 'lucide-react';
import { categoryService, ProductCategory } from '@/lib/api';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-xl text-sm outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-black text-slate-700 dark:text-slate-400 mb-1.5 uppercase tracking-widest';

export default function ProductCategoriesPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [editCat, setEditCat] = useState<ProductCategory | null>(null);
    const [deleteCat, setDeleteCat] = useState<ProductCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const load = async () => {
        setLoading(true);
        try {
            const data = await categoryService.getAll();
            setCategories(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to sync categories");
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
            status: cat.status as 'ACTIVE' | 'INACTIVE' || 'ACTIVE',
        });
        setView('form');
    };

    const handleNew = () => {
        setEditCat(null);
        setForm({ name: '', description: '', status: 'ACTIVE' });
        setView('form');
    };

    const confirmDelete = async () => {
        if (!deleteCat) return;
        setDeleting(true);
        try {
            await categoryService.delete(deleteCat.id);
            setCategories(prev => prev.filter(c => c.id !== deleteCat.id));
            toast.success('Category purged from records');
        } catch (e) {
            console.error(e);
            toast.error('Purge failed');
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
                toast.success('Category updated');
            } else {
                await categoryService.create(form);
                toast.success('Category initialized');
            }
            load();
            setView('list');
        } catch (e) {
            console.error(e);
            toast.error('Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        (c as any).slug?.toLowerCase().includes(search.toLowerCase())
    );

    if (view === 'form') {
        return (
            <div className="max-w-4xl mx-auto py-8 px-6 font-sans text-left">
                <div className="mb-8">
                    <button 
                        onClick={() => setView('list')} 
                        className="text-[10px] font-black text-slate-400 hover:text-[#F59E0B] uppercase tracking-[0.2em] transition-all mb-4 flex items-center gap-1.5"
                    >
                        <ChevronLeft className="h-4 w-4" /> Exit to Registry
                    </button>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {editCat ? 'Modify Category' : 'New Category Registry'}
                    </h1>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-70">Define a single node classification for inventory distribution</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-2">
                            <Layers className="h-4 w-4 text-[#F59E0B]" />
                            <h2 className="text-[10px] font-black text-slate-600 dark:text-white uppercase tracking-widest">Category Parameters</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className={labelCls}>Direct Nomenclature <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        className={inputCls()}
                                        placeholder="e.g. Skin Care"
                                    />
                                    {form.name && (
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                                            Auto-System Slug: <span className="text-[#F59E0B]">/{form.name.toLowerCase().replace(/\s+/g, '-')}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className={labelCls}>Node Visibility</label>
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className={selectCls}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className={labelCls}>Protocol Briefing</label>
                                    <textarea
                                        name="description"
                                        rows={4}
                                        value={form.description}
                                        onChange={handleChange}
                                        className={inputCls() + ' resize-none'}
                                        placeholder="Explanatory briefing for this classification node..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className="px-6 py-2.5 text-[10px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-all"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-3 px-10 py-3 bg-[#F59E0B] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-50 active:scale-95"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {editCat ? 'Sync Classification' : 'Deploy Node'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans text-left">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Category Registry</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">Manage node classifications for inventory clusters</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all"
                        title="Sync Registry"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Inbound Node
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search nomenclature or slugs..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-[#F59E0B] transition-all font-medium"
                    />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nomenclature & Slug</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Briefing</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Protocol Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-6">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded-xl w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-24 text-center">
                                        <Tag className="h-12 w-12 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Void Category Registry</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.name}</p>
                                            <p className="text-[9px] font-black text-[#F59E0B] uppercase tracking-widest mt-1 opacity-70">/{cat.slug}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {cat.description ? (
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 max-w-xs truncate uppercase tracking-widest">{cat.description}</p>
                                            ) : (
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">No Briefing</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${cat.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-500 dark:bg-white/5'}`}>
                                                {cat.status || 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(cat)} 
                                                    className="p-2 rounded-xl text-slate-500 hover:text-[#F59E0B] hover:bg-slate-100 dark:hover:bg-[#F59E0B]/10 transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteCat(cat)} 
                                                    className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
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

            {/* ── Delete Modal ── */}
            {deleteCat && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-5">
                                <AlertTriangle className="h-7 w-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Erase Node?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                                Permanent registry removal for <br/><strong className="text-slate-900 dark:text-white">"{deleteCat.name}"</strong>?
                            </p>
                            <div className="flex justify-end gap-3 text-left">
                                <button
                                    onClick={() => setDeleteCat(null)}
                                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-8 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                                >
                                    {deleting ? 'Purging...' : 'Purge Node'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

