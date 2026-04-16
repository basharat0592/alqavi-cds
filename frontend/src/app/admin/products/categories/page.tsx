"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Tag,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle, Layers, Activity, Loader2, ChevronRight, FileSpreadsheet, Trash
} from 'lucide-react';
import { categoryService, ProductCategory } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - CATEGORY HUB
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";
const selectCls = `${inputCls} cursor-pointer`;

export default function ProductCategoriesPage() {
    const router = useRouter();
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
            toast.error("Hub communication failure");
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
            status: (cat as any).status || 'ACTIVE',
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
            toast.success('Category purged successfully');
        } catch (e) {
            toast.error('Failed to delete category');
        } finally {
            setDeleting(false);
            setDeleteCat(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return toast.error("Category name is required");
        setSaving(true);
        try {
            if (editCat) {
                await categoryService.update(editCat.id, form);
                toast.success('Category updated');
            } else {
                await categoryService.create(form);
                toast.success('Category created');
            }
            load();
            setView('list');
        } catch (e) {
            toast.error('Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">Product Categories</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal">
                        {view === 'list' ? 'Product Categories' : (editCat ? 'Edit Category' : 'Create Category')}
                    </h1>
                    {view === 'list' ? (
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={load} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                            </Btn>
                            <Btn onClick={handleNew}><Plus size={14} /> Add Category</Btn>
                        </div>
                    ) : (
                        <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                            <ChevronLeft size={14} /> Back to registry
                        </button>
                    )}
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Search Area */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Filter categories..."
                                    className={`${inputCls} pl-10 h-[35px]`}
                                />
                            </div>
                        </div>

                        {/* Registry Table */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                        <th className="px-6 py-3">Category Name</th>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {loading && filtered.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center text-[13px] text-[#565959]">Synchronizing registry...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center text-[13px] text-[#565959]">No categories found.</td></tr>
                                    ) : (
                                        filtered.map(cat => (
                                            <tr key={cat.id} className="hover:bg-[#fcfdff] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-[14px] font-bold text-[#007185] group-hover:underline cursor-pointer" onClick={() => handleEdit(cat)}>
                                                        {cat.name}
                                                    </div>
                                                    <div className="text-[11px] text-[#565959] mt-0.5">Slug: {cat.slug}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[13px] text-[#565959] line-clamp-1 italic max-w-sm">{cat.description || 'No description provided'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${cat.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                        {cat.status || 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(cat)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Edit size={14} /></button>
                                                        <button onClick={() => setDeleteCat(cat)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Entry Form */
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Category Information</h2>
                                    <p className="text-[12px] text-[#565959]">Define the classification parameters.</p>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Category Name" required>
                                            <input name="name" className={inputCls} value={form.name} onChange={handleChange} placeholder="e.g. Cosmetics" />
                                        </Field>
                                        <Field label="Protocol Status">
                                            <select name="status" className={selectCls} value={form.status} onChange={handleChange}>
                                                <option value="ACTIVE">Active (Public)</option>
                                                <option value="INACTIVE">Inactive (Hidden)</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <Field label="Description Mesh">
                                        <textarea
                                            name="description"
                                            rows={4}
                                            className={`${inputCls} h-auto py-2`}
                                            value={form.description}
                                            onChange={handleChange}
                                            placeholder="Enter descriptive metadata..."
                                        />
                                    </Field>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h3 className="text-[14px] font-bold">Actions</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <Btn className="w-full h-[35px] text-[14px] justify-center" onClick={handleSubmit} loading={saving}>
                                        <Save size={14} /> {editCat ? 'Update Category' : 'Create Category'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-[#565959] hover:text-[#c45500] hover:underline text-center">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-4 text-[12px] text-amber-700 leading-relaxed italic">
                                Categories define how products are organized and filtered in the sales interface.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deleteCat && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Purge Category?</h3>
                        <p className="text-[13px] text-[#565959]">
                            Are you sure you want to delete <span className="font-bold text-[#111]">"{deleteCat.name}"</span>?
                        </p>
                        <div className="mt-6 space-y-3">
                            <button onClick={confirmDelete} className="w-full h-[31px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-medium shadow-sm active:bg-red-800">
                                {deleting ? 'Deleting...' : 'Confirm Purge'}
                            </button>
                            <button onClick={() => setDeleteCat(null)} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
