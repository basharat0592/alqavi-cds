"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Trash2, Layers,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle,
    Activity, Loader2, ChevronRight, LayoutDashboard, Store
} from 'lucide-react';
import { sectionService, productService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { exportToCSV } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   PROFESSIONAL AMAZON RETAIL DESIGN SYSTEM (SYNCED)
   ───────────────────────────────────────────────────────────────────────────── */
const AmazonInput = ({ label, className = "", required = false, rows, ...props }: { label?: string, required?: boolean, rows?: number } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (
    <div className="w-full">
        {label && <label className="block text-[13px] font-bold text-slate-900 mb-1.5">{label} {required && <span className="text-rose-600">*</span>}</label>}
        {props.type === 'select' ? (
            <select
                className={`${ui.inputBase} cursor-pointer ${className}`}
                {...(props as any)}
            >
                {props.children}
            </select>
        ) : props.type === 'textarea' ? (
            <textarea
                rows={rows}
                className={`w-full px-3.5 py-2.5 bg-white rounded-lg text-[13.5px] text-slate-800 outline-none border border-slate-200 placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${className}`}
                {...(props as any)}
            />
        ) : (
            <input
                className={`${ui.inputBase} ${className}`}
                {...props}
            />
        )}
    </div>
);

export default function SectionsPage() {
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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Form State
    const [form, setForm] = useState({
        name: '',
        description: '',
        status: 'active' as 'active' | 'inactive',
        position: 0,
        is_visible: true,
        product_ids: [] as string[]
    });

    const loadData = async () => {
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
            router.push('/login');
            return;
        }

        setLoading(true);
        try {
            const [cats, prods] = await Promise.all([
                sectionService.getAll(),
                productService.getAll({ no_pagination: true })
            ]);
            setCategories(cats || []);
            setAllProducts(Array.isArray(prods) ? prods : (prods as any).results || []);
        } catch (e: any) {
            if (e.response?.status === 401) {
                router.push('/login');
            }
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
            position: cat.position || 0,
            is_visible: cat.is_visible !== false,
            product_ids: (cat.product_details || []).map((p: any) => p.id) || []
        });
        setIsDropdownOpen(false);
        setView('form');
    };

    const handleNew = () => {
        setEditMode(null);
        setForm({ name: '', description: '', status: 'active', position: 0, is_visible: true, product_ids: [] });
        setIsDropdownOpen(false);
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
        if (!form.name.trim()) return toast.error("Section name is required");

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description,
                status: form.status, // Model default is lowercase 'active'
                position: Number(form.position),
                is_visible: Boolean(form.is_visible),
                product_ids: form.product_ids
            };

            if (editMode) {
                await sectionService.update(editMode.id, payload);
                toast.success('Section updated successfully');
            } else {
                await sectionService.create(payload);
                toast.success('Section created successfully');
            }

            await loadData();
            setView('list');
        } catch (e: any) {
            console.error("Section Save Error Details:", e.response?.data);
            const backendError = e.response?.data;
            let errorMsg = 'Failed to save section';

            if (backendError) {
                if (typeof backendError === 'string') errorMsg = backendError;
                else if (backendError.detail) errorMsg = backendError.detail;
                else if (backendError.name) errorMsg = `Name error: ${backendError.name[0]}`;
                else if (backendError.non_field_errors) errorMsg = backendError.non_field_errors[0];
            }

            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;
        setDeleting(true);
        try {
            await sectionService.delete(deleteItem.id);
            setCategories(prev => prev.filter(c => c.id !== deleteItem.id));
            toast.success('Section deleted');
        } catch (e) {
            toast.error('Failed to delete section');
        } finally {
            setDeleting(false);
            setDeleteItem(null);
        }
    };

    const filtered = (categories || []).filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const filteredProds = allProducts.filter(p => {
        const name = (p.product_name || p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const q = prodSearch.toLowerCase();
        return name.includes(q) || sku.includes(q);
    });

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => sectionService.delete(id)));
        setCategories(prev => prev.filter(c => !ids.includes(String(c.id))));
        toast.success(`${ids.length} section(s) deleted`);
    };

    const bulkStatus = async (ids: string[], status: 'active' | 'inactive') => {
        await Promise.allSettled(ids.map(id => sectionService.update(id, { status })));
        toast.success(`Marked ${ids.length} section(s) ${status}`);
        await loadData();
    };

    if (view === 'form') {
        return (
            <div className="animate-in fade-in duration-500 text-left">

                <PageHeader
                    title={editMode ? 'Edit Section' : 'Add New Section'}
                    subtitle="Configure your public store navigation and group products together."
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Product Sections' },
                        { label: editMode ? 'Edit Section' : 'New Section' },
                    ]}
                    actions={
                        <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                            <ChevronLeft size={16} /> Cancel
                        </Button>
                    }
                />

                <div>
                    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                            {/* 1. Page Config */}
                            <Card className="p-8">
                                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
                                    <div className="p-2.5 bg-indigo-50 rounded-lg"><Layers className="h-5 w-5 text-indigo-600" /></div>
                                    <div>
                                        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">1. Config</h2>
                                        <p className="text-[11px] text-slate-500">Display and visibility.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <AmazonInput label="Section Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Skin Care" required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <AmazonInput label="Sort Order" type="number" value={form.position} onChange={e => setForm({ ...form, position: parseInt(e.target.value) || 0 })} />
                                        <AmazonInput label="Status" type="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </AmazonInput>
                                    </div>
                                    <div className="flex items-center gap-2 py-1">
                                        <input type="checkbox" id="is_visible" checked={form.is_visible} onChange={e => setForm({ ...form, is_visible: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
                                        <label htmlFor="is_visible" className="text-[12px] font-bold text-slate-900">Show on front page</label>
                                    </div>
                                    <AmazonInput label="Description" type="textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Subtitle for this section..." />
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-8 flex flex-col gap-6 animate-in slide-in-from-bottom-6 duration-500">
                            {/* 2. SELECT PRODUCTS */}
                            <Card className="p-8">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-50 rounded-lg"><Package className="h-5 w-5 text-indigo-600" /></div>
                                        <div>
                                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">2. Pick Products</h2>
                                            <p className="text-[11px] text-slate-500">Items displayed in this section.</p>
                                        </div>
                                    </div>
                                    <Badge tone="indigo">
                                        {form.product_ids.length} CHOICES
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[12px] font-bold text-slate-900">Select Products to Include</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wide"
                                        >
                                            {isDropdownOpen ? 'Close Dropdown' : 'Open Product List'}
                                        </button>
                                    </div>

                                    <div className={`relative transition-all duration-300 ${isDropdownOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                                        <div className="relative group">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                                <input
                                                    value={prodSearch}
                                                    onChange={e => setProdSearch(e.target.value)}
                                                    placeholder="Search by name or SKU..."
                                                    className="w-full h-10 pl-10 pr-4 border border-slate-200 rounded-lg text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                />
                                            </div>

                                            {/* ── Product Dropdown Results ── */}
                                            <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {filteredProds.length === 0 ? (
                                                        <div className="px-6 py-10 text-center">
                                                            <Search size={24} className="text-slate-200 mx-auto mb-2" />
                                                            <p className="text-[11px] text-slate-400 italic">No products found matching "{prodSearch}"</p>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-100">
                                                            {filteredProds.map(p => {
                                                                const isSelected = form.product_ids.includes(p.id);
                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => toggleProductSelection(p.id)}
                                                                        className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/40' : ''}`}
                                                                    >
                                                                        <div className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                                                                            {isSelected && <CheckCircle className="h-3 w-3 text-white" strokeWidth={4} />}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className={`text-[13px] truncate ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                                                                {p.product_name || p.name}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase whitespace-nowrap">SKU: {p.sku || 'N/A'}</span>
                                                                                {isSelected && <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide italic">Included</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isDropdownOpen && (
                                        <div
                                            onClick={() => setIsDropdownOpen(true)}
                                            className="w-full h-[45px] px-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                        >
                                            <span className="text-[13px] font-medium text-slate-600">
                                                {form.product_ids.length > 0 ? `${form.product_ids.length} products selected` : 'Click to select products...'}
                                            </span>
                                            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <Button variant="outline" onClick={() => setView('list')} className="w-[120px]">Discard</Button>
                                    <Button type="submit" disabled={saving} className="w-[180px]">
                                        {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                        Save Section
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 text-left">

            <PageHeader
                title="Product Sections"
                subtitle="Manage the product groups shown on your main website."
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Product Sections' },
                ]}
                actions={
                    <>
                        <Button variant="outline" onClick={loadData}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Button onClick={handleNew}>
                            <Plus size={14} /> Add new section
                        </Button>
                    </>
                }
            />

            <div>

                {/* ── SEARCH BOX ── */}
                <Card className="p-4 mb-6 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Find a section..."
                            className="w-full h-10 pl-9 pr-4 border border-slate-200 rounded-lg text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] font-bold text-slate-600">
                        <Activity size={14} className="text-indigo-600" /> {categories.length} GROUPS
                    </div>
                </Card>

                {/* ── TABLE ── */}
                <Card className="overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200/70">
                                    <SelectAllTh sel={sel} />
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Products</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Front End</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading && filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-400 italic">Reading layout...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-400 font-medium">No sections defined yet.</td></tr>
                                ) : (
                                    filtered.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-slate-50 transition-all group">
                                            <RowCheckboxTd sel={sel} id={cat.id} />
                                            <td className="px-6 py-4 text-[13px] font-bold text-slate-400 tabular-nums">
                                                {String(cat.position || 0).padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[14px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer hover:underline" onClick={() => handleEdit(cat)}>{cat.name}</p>
                                                {cat.description && <p className="text-[10px] text-slate-500 mt-0.5 max-w-[250px] truncate">{cat.description}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                                                    <Package size={11} className="text-slate-400" />
                                                    <span className="text-[11px] font-bold text-slate-900 tabular-nums">{cat.products?.length || cat.product_details?.length || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge tone={cat.is_visible !== false ? 'green' : 'neutral'}>
                                                    {cat.is_visible !== false ? 'Visible' : 'Hidden'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge tone={cat.status === 'active' ? 'neutral' : 'red'}>
                                                    {cat.status || 'Active'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2.5 opacity-50 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => handleEdit(cat)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => setDeleteItem(cat)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
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

            <BulkBar
                sel={sel}
                entity="sections"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Mark Active', apply: (ids) => bulkStatus(ids, 'active') },
                    { label: 'Mark Inactive', apply: (ids) => bulkStatus(ids, 'inactive') },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((c: any) => ({
                        name: c.name,
                        description: c.description || '',
                        position: c.position ?? 0,
                        visible: c.is_visible !== false ? 'Yes' : 'No',
                        status: c.status || 'active',
                        products: c.products?.length || c.product_details?.length || 0,
                    })),
                    'sections.csv',
                )}
            />

            {/* --- Delete Confirmation --- */}
            <Modal
                open={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteItem(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Delete Section'}
                        </Button>
                    </>
                }
            >
                <div className="text-center py-2">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600 border border-rose-100"><AlertTriangle size={32} /></div>
                    <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">Delete Section?</h3>
                    <p className="text-[13px] text-slate-600 mt-3 leading-relaxed">Remove <span className="font-bold text-slate-900">"{deleteItem?.name}"</span>? This will hide the group from your store front.</p>
                </div>
            </Modal>
        </div>
    );
}
