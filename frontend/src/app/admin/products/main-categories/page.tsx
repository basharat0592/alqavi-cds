"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Layers,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle,
    Activity, Loader2, ChevronRight, LayoutDashboard, Store, Trash
} from 'lucide-react';
import { mainCategoryService, productService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PROFESSIONAL AMAZON RETAIL DESIGN SYSTEM (SYNCED)
   ───────────────────────────────────────────────────────────────────────────── */
const AmazonButton = ({ children, onClick, loading, variant = "primary", className = "", type = "button", disabled = false }: any) => {
    const primary = "bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] #9c7e31 #846a29 hover:from-[#f5d78e] hover:to-[#eeb933] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_1px_3px_rgba(0,0,0,0.1)]";
    const secondary = "bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] #a2a6ac #8d9096 hover:from-[#eef1f3] hover:to-[#dce0e4] shadow-sm";
    
    return (
        <button 
            type={type} onClick={onClick} disabled={loading || disabled} 
            className={`h-[31px] px-5 rounded-[3px] text-[13px] font-[500] text-[#0f1111] border transition-all active:shadow-inner flex items-center justify-center gap-2 ${variant === 'primary' ? primary : secondary} ${className}`}
        >
            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    );
};

const AmazonInput = ({ label, className = "", required = false, ...props }: { label?: string, required?: boolean } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (
    <div className="w-full">
        {label && <label className="block text-[13px] font-bold text-[#0f1111] mb-1.5">{label} {required && <span className="text-red-600">*</span>}</label>}
        {props.type === 'select' ? (
            <select
                className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] cursor-pointer ${className}`}
                {...(props as any)}
            >
                {props.children}
            </select>
        ) : props.type === 'textarea' ? (
            <textarea
                className={`w-full p-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] placeholder:text-[#888] ${className}`}
                {...(props as any)}
            />
        ) : (
            <input
                className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] placeholder:text-[#888] ${className}`}
                {...(props as any)}
            />
        )}
    </div>
);

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
        position: 0,
        is_visible: true,
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
            position: cat.position || 0,
            is_visible: cat.is_visible !== false,
            product_ids: (cat.product_details || []).map((p: any) => p.id) || []
        });
        setView('form');
    };

    const handleNew = () => {
        setEditMode(null);
        setForm({ name: '', description: '', status: 'active', position: 0, is_visible: true, product_ids: [] });
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
                position: form.position,
                is_visible: form.is_visible,
                product_ids: form.product_ids
            };

            if (editMode) {
                await mainCategoryService.update(editMode.id, payload);
                toast.success('Page updated');
            } else {
                await mainCategoryService.create(payload);
                toast.success('Page created');
            }
            loadData();
            setView('list');
        } catch (e: any) {
            toast.error('Failed to save website page');
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
            toast.success('Page deleted');
        } catch (e) {
            toast.error('Failed to delete page');
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
            <div className="bg-[#eaeded] min-h-screen pb-20 font-sans animate-in fade-in duration-500 text-left">
                
                {/* ── PROFESSIONAL HEADER ── */}
                <div className="bg-white border-b border-[#ddd] py-6 shadow-sm">
                    <div className="max-w-[1240px] mx-auto px-4 md:px-8">
                        <div className="flex items-center gap-1 text-[11px] text-[#565959] mb-4">
                            <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                            <ChevronRight size={10} />
                            <button onClick={() => setView('list')} className="hover:text-[#c45500] hover:underline">Website Pages</button>
                            <ChevronRight size={10} />
                            <span className="text-[#c45500]">{editMode ? 'Edit Page' : 'New Page'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-[28px] font-normal text-[#111]">{editMode ? 'Edit Website Page' : 'New Website Page'}</h1>
                                <p className="text-[13px] text-[#565959] mt-1">Configure your public store navigation and group products</p>
                            </div>
                            <button onClick={() => setView('list')} className="text-[14px] text-[#007185] hover:text-[#c45500] font-bold flex items-center gap-1 transition-colors">
                                <ChevronLeft size={18} /> Cancel and go back
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1240px] mx-auto mt-10 px-4 md:px-8">
                    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                            {/* 1. PAGE DETAILS */}
                            <div className="bg-white border border-[#ddd] rounded-lg p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#111]"></div>
                                
                                <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#eee]">
                                    <div className="p-3 bg-slate-50 rounded-xl"><Layers className="h-8 w-8 text-[#111]" /></div>
                                    <div>
                                        <h2 className="text-[24px] font-bold text-[#111]">1. Page Tips</h2>
                                        <p className="text-[14px] text-[#565959]">Basic info and display status.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <AmazonInput label="Page Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Collection" required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <AmazonInput label="Order Sort" type="number" value={form.position} onChange={e => setForm({ ...form, position: parseInt(e.target.value) || 0 })} />
                                        <AmazonInput label="Status" type="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </AmazonInput>
                                    </div>
                                    <div className="flex items-center gap-2 py-2">
                                        <input type="checkbox" id="is_visible" checked={form.is_visible} onChange={e => setForm({ ...form, is_visible: e.target.checked })} className="w-4 h-4 accent-[#e47911]" />
                                        <label htmlFor="is_visible" className="text-[13px] font-bold text-[#111]">Show in public website</label>
                                    </div>
                                    <AmazonInput label="Description" type="textarea" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Write a short sub-header..." />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8 flex flex-col gap-8 animate-in slide-in-from-bottom-6 duration-500">
                             {/* 2. SELECT PRODUCTS */}
                             <div className="bg-white border border-[#ddd] rounded-lg p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#e47911]"></div>
                                
                                <div className="flex items-center justify-between mb-10 pb-6 border-b border-[#eee]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-50 rounded-xl"><Package className="h-8 w-8 text-[#e47911]" /></div>
                                        <div>
                                            <h2 className="text-[24px] font-bold text-[#111]">2. Select Products</h2>
                                            <p className="text-[14px] text-[#565959]">Link catalog items to this navigation page.</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[12px] font-bold border border-amber-100 rounded-sm">
                                        {form.product_ids.length} Linked
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            value={prodSearch}
                                            onChange={e => setProdSearch(e.target.value)}
                                            placeholder="Find products to link..."
                                            className="w-full h-[36px] pl-10 pr-4 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1 bg-[#f9f9f9] rounded-lg border border-[#eee]">
                                        {filteredProds.map(p => {
                                            const isSelected = form.product_ids.includes(p.id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => toggleProductSelection(p.id)}
                                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${isSelected ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#f3f3f3] hover:border-[#ddd]'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-[2px] border flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#e47911] border-[#e47911]' : 'border-[#adb1b8] bg-white'}`}>
                                                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-[13px] font-bold truncate ${isSelected ? 'text-[#111]' : 'text-[#565959]'}`}>{p.name}</p>
                                                        <p className="text-[10px] text-[#888] font-bold uppercase tracking-tight">SKU: {p.sku}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-12 flex justify-end gap-3 pt-8 border-t border-[#eee]">
                                    <AmazonButton variant="secondary" onClick={() => setView('list')} className="w-[140px]">Cancel</AmazonButton>
                                    <AmazonButton type="submit" loading={saving} className="w-[200px] h-[40px] text-[15px]">Save Website Page</AmazonButton>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#eaeded] min-h-screen pb-20 font-sans animate-in fade-in duration-500 text-left">
            
            {/* ── PROFESSIONAL HEADER ── */}
            <div className="bg-white border-b border-[#ddd] py-6 shadow-sm">
                <div className="max-w-[1240px] mx-auto px-4 md:px-8">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] mb-4">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Website Pages</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[28px] font-normal text-[#111]">Website Pages</h1>
                            <p className="text-[13px] text-[#565959] mt-1">Manage public navigation groups and store layouts</p>
                        </div>
                        <div className="flex gap-3">
                            <AmazonButton variant="secondary" onClick={loadData}>
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                            </AmazonButton>
                            <AmazonButton onClick={handleNew}>
                                <Plus size={16} /> Add website page
                            </AmazonButton>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1240px] mx-auto mt-10 px-4 md:px-8">
                
                {/* ── SEARCH BOX ── */}
                <div className="bg-white border border-[#ddd] rounded-lg p-5 mb-8 shadow-sm flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F59E0B]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search pages..."
                            className="w-full h-[36px] pl-10 pr-4 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-[#fcfcfc] border border-[#f3f3f3] rounded-md text-[12px] font-bold text-[#565959]">
                        <Activity size={14} className="text-[#e47911]" /> {categories.length} GROUPS ACTIVE
                    </div>
                </div>

                {/* ── TABLE ── */}
                <div className="bg-white border border-[#ddd] rounded-lg shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f6f6f6] border-b border-[#ddd]">
                                    <th className="px-6 py-5 text-[13px] font-bold text-[#111] uppercase tracking-tight">Order</th>
                                    <th className="px-6 py-5 text-[13px] font-bold text-[#111] uppercase tracking-tight">Page Group</th>
                                    <th className="px-6 py-5 text-[13px] font-bold text-[#111] uppercase tracking-tight">Linked</th>
                                    <th className="px-6 py-5 text-[13px] font-bold text-[#111] uppercase tracking-tight">Visibility</th>
                                    <th className="px-6 py-5 text-[13px] font-bold text-[#111] uppercase tracking-tight">Status</th>
                                    <th className="px-6 py-5 text-right text-[13px] font-bold text-[#111] uppercase tracking-tight">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading && filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="py-24 text-center text-slate-400 italic">Reading website schema...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="py-24 text-center text-slate-400 font-medium">No layout groups found.</td></tr>
                                ) : (
                                    filtered.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-[#fcfdff] transition-all group">
                                            <td className="px-6 py-5 text-[14px] font-bold text-slate-400">
                                                {String(cat.position || 0).padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[15px] font-bold text-[#007185] hover:text-[#c45500] cursor-pointer hover:underline" onClick={() => handleEdit(cat)}>{cat.name}</p>
                                                {cat.description && <p className="text-[11px] text-[#565959] mt-0.5 max-w-[300px] truncate">{cat.description}</p>}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f9f9f9] border border-[#eee] rounded-md">
                                                    <Package size={12} className="text-slate-400" />
                                                    <span className="text-[12px] font-bold text-[#111]">{cat.products?.length || cat.product_details?.length || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${cat.is_visible !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {cat.is_visible !== false ? 'Visible' : 'Hidden'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase border ${cat.status === 'active' ? 'bg-[#f0f2f2] text-[#111] border-[#d5d9d9]' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {cat.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-10 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => handleEdit(cat)} className="p-2 border border-[#ddd] rounded-md text-slate-400 hover:text-[#007185] hover:bg-slate-50 shadow-sm"><Edit size={15} /></button>
                                                    <button onClick={() => setDeleteItem(cat)} className="p-2 border border-[#ddd] rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 shadow-sm"><Trash size={15} /></button>
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

            {/* --- Delete Confirmation --- */}
            {deleteItem && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border-4 border-white shadow-lg"><AlertTriangle size={40} /></div>
                        <h3 className="text-[24px] font-bold text-[#111]">Delete Navigation?</h3>
                        <p className="text-[14px] text-[#565959] mt-3">Confirm removal of <span className="font-bold text-[#111]">"{deleteItem.name}"</span>? This will remove the link from the store header.</p>
                        <div className="mt-10 flex gap-4">
                            <button onClick={() => setDeleteItem(null)} className="flex-1 py-3 text-[13px] font-bold text-[#565959] hover:underline">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="flex-1 bg-red-600 text-white rounded-[3px] py-3 text-[13px] font-bold shadow hover:bg-red-700 disabled:opacity-50">
                                {deleting ? 'Deleting...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
