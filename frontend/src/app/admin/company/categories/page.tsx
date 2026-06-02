"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Plus, Search, Edit, Trash2, Tag,
    RefreshCw, Activity, ChevronLeft, ChevronRight, X, 
    AlertTriangle, Loader2
} from 'lucide-react';
import { companyCategoryService, CompanyCategory } from '@/lib/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - COMPANY CATEGORIES
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] whitespace-nowrap ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full text-left">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";
const selectCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] bg-white transition-all font-medium cursor-pointer";

// ─── Category Form View ──────────────────────────────────────────────────────
function CategoryForm({
    editCat, onCancel, onSaved
}: {
    editCat?: CompanyCategory | null;
    onCancel: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<Partial<CompanyCategory>>({
        name: '', code: '', type: 'local', country: 'Pakistan', description: '', color: 'emerald', is_active: true
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editCat) setForm(editCat);
    }, [editCat]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editCat) {
                await companyCategoryService.update(editCat.id, form);
                toast.success('Category updated!');
            } else {
                await companyCategoryService.create(form);
                toast.success('Category created!');
            }
            onSaved();
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to save category.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto py-6 px-3 sm:px-6 font-sans text-left">
            <div className="mb-6">
                <button 
                    onClick={onCancel} 
                    className="text-[12px] font-medium text-[#007185] hover:text-[#c45500] hover:underline mb-4 flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to List
                </button>
                <h1 className="text-[22px] font-normal text-[#111] mb-1">
                    {editCat ? 'Edit Category' : 'Add Category'}
                </h1>
                <p className="text-[13px] text-[#565959]">Manage company categories and logistical nodes</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#ddd] flex items-center gap-2 bg-[#f7f8fa]">
                        <Tag className="h-4 w-4 text-[#e47911]" />
                        <h2 className="text-[14px] font-bold text-[#111]">Category Identification</h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Category Name" required>
                                <input
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className={inputCls}
                                    placeholder="e.g. Local Distributors"
                                />
                            </Field>
                            <Field label="Internal Code">
                                <input
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value })}
                                    className={inputCls}
                                    placeholder="e.g. LOC-01"
                                />
                            </Field>
                            <Field label="Origin Protocol">
                                <select
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                                    className={selectCls}
                                >
                                    <option value="local">Local</option>
                                    <option value="imported">Imported</option>
                                </select>
                            </Field>
                            <Field label="Primary Country">
                                <input
                                    value={form.country}
                                    onChange={e => setForm({ ...form, country: e.target.value })}
                                    className={inputCls}
                                    placeholder="e.g. Pakistan"
                                />
                            </Field>
                            <div className="md:col-span-2">
                                <Field label="Detailed Description">
                                    <textarea
                                        rows={4}
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className={inputCls + ' h-auto py-2 resize-none'}
                                        placeholder="Describe the category scope..."
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="is_active"
                                className="h-4 w-4 border-[#888c8e] rounded-[3px] text-[#e77600] focus:ring-[#e77600] cursor-pointer" 
                                checked={form.is_active}
                                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                            />
                            <label htmlFor="is_active" className="text-[13px] font-bold text-[#0f1111] cursor-pointer select-none">
                                Operational Active
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <Btn onClick={onCancel} variant="secondary" className="w-full sm:w-auto h-[35px] text-[13px]">Discard</Btn>
                    <Btn type="submit" loading={saving} className="w-full sm:w-auto h-[35px] text-[13px]">
                        {editCat ? 'Update Category' : 'Create Category'}
                    </Btn>
                </div>
            </form>
        </div>
    );
}

// ─── Main Hub Component ──────────────────────────────────────────────────────
export default function CompanyCategoriesPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [categories, setCategories] = useState<CompanyCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editCat, setEditCat] = useState<CompanyCategory | null>(null);
    const [deleteCat, setDeleteCat] = useState<CompanyCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await companyCategoryService.getAll();
            setCategories(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setView('list');
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleEdit = (cat: CompanyCategory) => {
        setEditCat(cat);
        setView('form');
    };

    const handleSaved = () => {
        load();
        setView('list');
        setEditCat(null);
    };

    const confirmDelete = async () => {
        if (!deleteCat) return;
        setDeleting(true);
        try {
            await companyCategoryService.delete(deleteCat.id);
            setCategories(prev => prev.filter(c => c.id !== deleteCat.id));
            toast.success('Category removed from records.');
        } catch (e) {
            console.error(e);
            toast.error('Failed to remove classification.');
        } finally {
            setDeleting(false);
            setDeleteCat(null);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.code || '').toLowerCase().includes(search.toLowerCase())
    );

    if (view === 'form') {
        return <CategoryForm editCat={editCat} onCancel={() => { setView('list'); setEditCat(null); }} onSaved={handleSaved} />;
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111] text-left">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Category Hub</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Category Hub</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Manage node categories and business types</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Btn variant="secondary" onClick={load} loading={loading} className="flex-1 sm:flex-initial">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={() => { setEditCat(null); setView('form'); }} className="flex-1 sm:flex-initial">
                                <Plus size={14} /> New Category
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 mt-6">
                {/* Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search categories..."
                            className={inputCls + " pl-10 h-[35px]"}
                        />
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 bg-[#f7f8fa] border border-[#ddd] rounded-[3px] w-full sm:w-auto self-start sm:self-auto h-[35px]">
                        <Activity className="h-3.5 w-3.5 text-[#e47911]" />
                        <span className="text-[12px] font-bold text-[#565959] uppercase tracking-tight">
                            {categories.length} Nodes
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Category Name</th>
                                    <th className="hidden sm:table-cell px-6 py-3 whitespace-nowrap">Protocol Code</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Provenance</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Status</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {loading && filtered.length === 0 ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-2.5 sm:px-6 py-4">
                                                <div className="h-4 bg-slate-100 rounded w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-2.5 sm:px-6 py-20 text-center text-[#565959]">
                                            <Tag className="h-10 w-10 text-[#eee] mx-auto mb-3" />
                                            <p className="text-[13px]">No categories identified.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                            <td className="px-2.5 sm:px-6 py-3.5">
                                                <div onClick={() => handleEdit(cat)} className="font-bold text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer whitespace-nowrap">{cat.name}</div>
                                                <div className="block sm:hidden text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Code: {cat.code || '--'}</div>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-3.5 whitespace-nowrap">
                                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{cat.code || '--'}</span>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${cat.type === 'imported' ? 'bg-[#e47911]' : 'bg-[#007185]'}`} />
                                                    <span className="text-[12px] text-[#111] capitalize font-medium">
                                                        {cat.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 whitespace-nowrap">
                                                <span className={`hidden sm:inline-block px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${cat.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {cat.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                                <span className={`inline-block sm:hidden w-2 h-2 rounded-full ${cat.is_active ? 'bg-green-600' : 'bg-red-600'}`} title={cat.is_active ? 'Active' : 'Disabled'} />
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleEdit(cat)} 
                                                        className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"
                                                    >
                                                        <Edit className="h-[14px] w-[14px]" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteCat(cat)} 
                                                        className="p-1.5 border border-red-200 rounded bg-red-50/50 hover:bg-red-50 text-red-600"
                                                    >
                                                        <Trash2 className="h-[14px] w-[14px]" />
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
            </div>

            {/* Delete Modal */}
            {deleteCat && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <Trash2 size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Delete Category?</h3>
                        <p className="text-[13px] text-[#565959]">Confirm permanent removal of <span className="font-bold">"{deleteCat.name}"</span>? This cannot be undone.</p>
                        <div className="mt-6 space-y-2">
                            <button onClick={confirmDelete} disabled={deleting} className="w-full h-[31px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-medium shadow-sm flex items-center justify-center gap-2">
                                {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button onClick={() => setDeleteCat(null)} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
