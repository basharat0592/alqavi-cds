"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Tag,
    RefreshCw, Activity, ChevronLeft
} from 'lucide-react';
import { companyCategoryService, CompanyCategory } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - COMPANY CATEGORIES
   ───────────────────────────────────────────────────────────────────────────── */
const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full text-left">
        <label className="block text-[13px] font-bold text-slate-900 mb-1">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;
const selectCls = ui.inputBase + " cursor-pointer";

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
        <div className="text-left">
            <button
                onClick={onCancel}
                className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline mb-4 flex items-center gap-1"
            >
                <ChevronLeft className="h-4 w-4" /> Back to List
            </button>
            <PageHeader
                title={editCat ? 'Edit Category' : 'Add Category'}
                subtitle="Manage company categories and logistical nodes"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Company Categories', href: '/admin/company/categories' },
                    { label: editCat ? 'Edit Category' : 'Add Category' },
                ]}
            />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                <Card className="overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                        <Tag className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-[14px] font-bold text-slate-900">Category Identification</h2>
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
                                        className={inputCls + ' !h-auto py-2 resize-none'}
                                        placeholder="Describe the category scope..."
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                className="h-4 w-4 border-slate-300 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={form.is_active}
                                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                            />
                            <label htmlFor="is_active" className="text-[13px] font-bold text-slate-900 cursor-pointer select-none">
                                Operational Active
                            </label>
                        </div>
                    </div>
                </Card>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <Button type="button" onClick={onCancel} variant="outline" className="w-full sm:w-auto">Discard</Button>
                    <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                        {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        {editCat ? 'Update Category' : 'Create Category'}
                    </Button>
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
        <div className="text-left text-slate-800">
            <PageHeader
                title="Company Categories"
                subtitle="Manage node categories and business types"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Company Categories' },
                ]}
                actions={
                    <>
                        <Button variant="outline" onClick={load} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button onClick={() => { setEditCat(null); setView('form'); }}>
                            <Plus size={14} /> New Category
                        </Button>
                    </>
                }
            />

            <div>
                {/* Filters */}
                <Card className="p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search categories..."
                            className={inputCls + " pl-10"}
                        />
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 px-3 h-10 bg-slate-50/60 border border-slate-200 rounded-lg w-full sm:w-auto self-start sm:self-auto">
                        <Activity className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-tight">
                            {categories.length} Nodes
                        </span>
                    </div>
                </Card>

                {/* Table */}
                <Card className="overflow-hidden text-left mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Category Name</th>
                                    <th className="hidden sm:table-cell px-6 py-3 whitespace-nowrap">Protocol Code</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Provenance</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Status</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                                        <td colSpan={5} className="px-2.5 sm:px-6 py-20 text-center text-slate-600">
                                            <Tag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-[13px]">No categories identified.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                            <td className="px-2.5 sm:px-6 py-3.5">
                                                <div onClick={() => handleEdit(cat)} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer whitespace-nowrap">{cat.name}</div>
                                                <div className="block sm:hidden text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Code: {cat.code || '--'}</div>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-3.5 whitespace-nowrap">
                                                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{cat.code || '--'}</span>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${cat.type === 'imported' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                                                    <span className="text-[12px] text-slate-900 capitalize font-medium">
                                                        {cat.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 whitespace-nowrap">
                                                <Badge tone={cat.is_active ? 'green' : 'red'} className="hidden sm:inline-flex">
                                                    {cat.is_active ? 'Active' : 'Disabled'}
                                                </Badge>
                                                <span className={`inline-block sm:hidden w-2 h-2 rounded-full ${cat.is_active ? 'bg-emerald-600' : 'bg-rose-600'}`} title={cat.is_active ? 'Active' : 'Disabled'} />
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(cat)}
                                                        className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 transition-colors"
                                                    >
                                                        <Edit className="h-[14px] w-[14px]" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteCat(cat)}
                                                        className="p-1.5 border border-rose-200 rounded-lg bg-rose-50/50 hover:bg-rose-50 text-rose-600 transition-colors"
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
                </Card>
            </div>

            {/* Delete Modal */}
            <Modal
                open={!!deleteCat}
                onClose={() => setDeleteCat(null)}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteCat(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                        <Trash2 size={24} className="text-rose-600" />
                    </div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2">Delete Category?</h3>
                    <p className="text-[13px] text-slate-600">Confirm permanent removal of <span className="font-bold">"{deleteCat?.name}"</span>? This cannot be undone.</p>
                </div>
            </Modal>
        </div>
    );
}
