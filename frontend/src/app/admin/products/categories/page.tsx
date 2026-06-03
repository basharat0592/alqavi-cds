"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit,
    RefreshCw, Save, ChevronLeft, AlertTriangle, Trash
} from 'lucide-react';
import { categoryService, ProductCategory } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - CATEGORY HUB
   ───────────────────────────────────────────────────────────────────────────── */
// Thin wrapper over the kit <Button> that preserves the existing `loading` prop API.
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => (
    <Button type={type} onClick={onClick} disabled={loading || disabled} variant={variant} className={className}>
        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        {children}
    </Button>
);

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-slate-700 mb-1.5">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;
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
            toast.error("Connection Error");
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
            status: (cat as any).status?.toUpperCase() || 'ACTIVE',
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
        } catch (e: any) {
            console.error("Save Error:", e);
            const errorMsg = e.response?.data?.name?.[0] || e.response?.data?.detail || e.message || 'Failed to save category';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1100px] mx-auto pb-20">

            <PageHeader
                title={view === 'list' ? 'Product Categories' : (editCat ? 'Edit Category' : 'Create Category')}
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Product Categories', href: view === 'list' ? undefined : '#' },
                    ...(view !== 'list' ? [{ label: editCat ? 'Edit' : 'Create' }] : []),
                ]}
                actions={
                    view === 'list' ? (
                        <>
                            <Btn variant="secondary" onClick={load} loading={loading} className="justify-center whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Btn onClick={handleNew} className="justify-center whitespace-nowrap"><Plus size={14} /> Add Category</Btn>
                        </>
                    ) : (
                        <Button variant="ghost" onClick={() => setView('list')}>
                            <ChevronLeft size={14} /> Back to List
                        </Button>
                    )
                }
            />

            <div>
                {view === 'list' ? (
                    <div className="space-y-6">
                        {/* Search Area */}
                        <Card className="p-5">
                            <div className="relative w-full sm:max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Filter categories..."
                                    className={`${inputCls} pl-10`}
                                />
                            </div>
                        </Card>

                        {/* Registry Table */}
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <th className="px-2 md:px-6 py-2.5 md:py-3 w-1/4 sm:w-auto">Category Name</th>
                                            <th className="px-2 md:px-6 py-2.5 md:py-3">Description</th>
                                            <th className="px-2 md:px-6 py-2.5 md:py-3 text-center w-16 md:w-28">Status</th>
                                            <th className="px-2 md:px-6 py-2.5 md:py-3 text-right w-20 md:w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                    {loading && filtered.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center text-[13px] text-slate-500">Synchronizing registry...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center text-[13px] text-slate-500">No categories found.</td></tr>
                                    ) : (
                                        filtered.map(cat => (
                                            <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-2 md:px-6 py-2 md:py-4">
                                                    <div className="text-[13px] md:text-[14px] font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:underline cursor-pointer truncate max-w-[90px] sm:max-w-none" onClick={() => handleEdit(cat)} title={cat.name}>
                                                        {cat.name}
                                                    </div>
                                                    <div className="text-[10px] md:text-[11px] text-slate-400 mt-0.5 truncate max-w-[90px] sm:max-w-none">Slug: {cat.slug}</div>
                                                </td>
                                                <td className="px-2 md:px-6 py-2 md:py-4">
                                                    <div className="text-[12px] md:text-[13px] text-slate-600 line-clamp-1 italic max-w-[80px] sm:max-w-xs">{cat.description || 'No description'}</div>
                                                </td>
                                                <td className="px-2 md:px-6 py-2 md:py-4 text-center">
                                                    <Badge tone={cat.status?.toUpperCase() === 'ACTIVE' ? 'green' : 'neutral'}>
                                                        {cat.status || 'ACTIVE'}
                                                    </Badge>
                                                </td>
                                                <td className="px-2 md:px-6 py-2 md:py-4 text-right">
                                                    <div className="flex justify-end gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(cat)} className="p-1 md:p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-700 transition-all"><Edit size={13} /></button>
                                                        <button onClick={() => setDeleteCat(cat)} className="p-1 md:p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-600 transition-all"><Trash size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </Card>
                    </div>
                ) : (
                    /* Entry Form */
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <div className="flex-1 space-y-6">
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Category Information</h2>
                                    <p className="text-[12px] text-slate-500">Define the classification parameters.</p>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Field label="Category Name" required>
                                            <input name="name" className={inputCls} value={form.name} onChange={handleChange} placeholder="e.g. Cosmetics" />
                                        </Field>
                                        <Field label="Category Status">
                                            <select name="status" className={selectCls} value={form.status} onChange={handleChange}>
                                                <option value="ACTIVE">Active (Visible)</option>
                                                <option value="INACTIVE">Inactive (Hidden)</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <Field label="About Category">
                                        <textarea
                                            name="description"
                                            rows={4}
                                            className={`${inputCls} h-auto py-2`}
                                            value={form.description}
                                            onChange={handleChange}
                                            placeholder="Write something about this category..."
                                        />
                                    </Field>
                                </div>
                            </Card>
                        </div>

                        <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                            <Card className="overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Actions</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <Btn className="w-full justify-center" onClick={handleSubmit} loading={saving}>
                                        <Save size={14} /> {editCat ? 'Update Category' : 'Create Category'}
                                    </Btn>
                                    <button onClick={() => setView('list')} className="w-full text-[12px] text-slate-500 hover:text-indigo-600 hover:underline text-center">
                                        Cancel
                                    </button>
                                </div>
                            </Card>
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-[12px] text-indigo-700 leading-relaxed">
                                Categories define how products are organized and filtered in the sales interface.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            <Modal
                open={!!deleteCat}
                onClose={() => setDeleteCat(null)}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteCat(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Confirm Purge'}
                        </Button>
                    </>
                }
            >
                <div className="text-center py-2">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={24} className="text-rose-600" />
                    </div>
                    <h3 className="text-[17px] font-bold text-slate-900 tracking-tight mb-2">Purge Category?</h3>
                    <p className="text-[13px] text-slate-600">
                        Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteCat?.name}"</span>?
                    </p>
                </div>
            </Modal>
        </div>
    );
}
