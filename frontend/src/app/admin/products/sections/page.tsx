"use client";

import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit, Trash2, Layers,
    RefreshCw, CheckCircle, Package,
    Save, ChevronLeft, X, AlertTriangle,
    Activity, Loader2, ChevronRight, LayoutDashboard, Store, Trash
} from 'lucide-react';
import { sectionService, productService } from '@/lib/api';
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

const AmazonInput = ({ label, className = "", required = false, rows, ...props }: { label?: string, required?: boolean, rows?: number } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (
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
                rows={rows}
                className={`w-full p-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)] placeholder:text-[#888] ${className}`}
                {...(props as any)}
            />
        ) : (
            <input
                className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)] placeholder:text-[#888] ${className}`}
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
        const token = localStorage.getItem('accessToken');
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

            console.log("Saving section with payload:", payload);

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

    if (view === 'form') {
        return (
            <div className="bg-[#fcfcfc] min-h-screen pb-20 font-sans animate-in fade-in duration-500 text-left">
                
                {/* ── PROFESSIONAL HEADER ── */}
                <div className="bg-white border-b border-[#ddd] py-5 shadow-sm">
                    <div className="max-w-[1240px] mx-auto px-4 md:px-8">
                        <div className="flex items-center gap-1 text-[11px] text-[#565959] mb-3">
                            <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                            <ChevronRight size={10} />
                            <button onClick={() => setView('list')} className="hover:text-[#c45500] hover:underline">Sections</button>
                            <ChevronRight size={10} />
                            <span className="text-[#c45500] tracking-tighter font-black">{editMode ? 'EDIT SECTION' : 'NEW SECTION'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-[24px] font-normal text-[#111]">{editMode ? 'Edit Section' : 'Add New Section'}</h1>
                                <p className="text-[12px] text-[#565959] mt-0.5">Configure your public store navigation and group products together.</p>
                            </div>
                            <button onClick={() => setView('list')} className="text-[13px] text-[#007185] hover:text-[#c45500] font-bold flex items-center gap-1 transition-colors">
                                <ChevronLeft size={16} /> Cancel
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1240px] mx-auto mt-8 px-4 md:px-8">
                    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                            {/* 1. Page Config */}
                            <div className="bg-white border border-[#ddd] rounded-lg p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#f3f3f3]">
                                    <div className="p-2.5 bg-slate-50 rounded-lg"><Layers className="h-5 w-5 text-[#111]" /></div>
                                    <div>
                                        <h2 className="text-[16px] font-bold text-[#111]">1. Config</h2>
                                        <p className="text-[11px] text-[#565959]">Display and visibility.</p>
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
                                        <input type="checkbox" id="is_visible" checked={form.is_visible} onChange={e => setForm({ ...form, is_visible: e.target.checked })} className="w-4 h-4 accent-[#e47911]" />
                                        <label htmlFor="is_visible" className="text-[12px] font-bold text-[#111]">Show on front page</label>
                                    </div>
                                    <AmazonInput label="Description" type="textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Subtitle for this section..." />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8 flex flex-col gap-6 animate-in slide-in-from-bottom-6 duration-500">
                             {/* 2. SELECT PRODUCTS */}
                             <div className="bg-white border border-[#ddd] rounded-lg p-8 shadow-sm">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#f3f3f3]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 rounded-lg"><Package className="h-5 w-5 text-[#e47911]" /></div>
                                        <div>
                                            <h2 className="text-[16px] font-bold text-[#111]">2. Pick Products</h2>
                                            <p className="text-[11px] text-[#565959]">Items displayed in this section.</p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 rounded-sm">
                                        {form.product_ids.length} CHOICES
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[12px] font-bold text-[#111]">Select Products to Include</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="text-[11px] font-black text-[#007185] hover:text-[#c45500] uppercase tracking-tighter"
                                        >
                                            {isDropdownOpen ? 'Close Dropdown' : 'Open Product List'}
                                        </button>
                                    </div>

                                    <div className={`relative transition-all duration-300 ${isDropdownOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                                        <div className="relative group">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#e47911] transition-colors" />
                                                <input
                                                    value={prodSearch}
                                                    onChange={e => setProdSearch(e.target.value)}
                                                    placeholder="Search by name or SKU..."
                                                    className="w-full h-[40px] pl-10 pr-4 border border-[#adb1b8] rounded-[4px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] font-medium transition-all"
                                                />
                                            </div>

                                            {/* ── Amazon-Style Dropdown Results ── */}
                                            <div className="mt-2 bg-white border border-[#ddd] rounded-md shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                    {filteredProds.length === 0 ? (
                                                        <div className="px-6 py-10 text-center">
                                                            <Search size={24} className="text-slate-200 mx-auto mb-2" />
                                                            <p className="text-[11px] text-slate-400 italic">No products found matching "{prodSearch}"</p>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-[#f3f3f3]">
                                                            {filteredProds.map(p => {
                                                                const isSelected = form.product_ids.includes(p.id);
                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => toggleProductSelection(p.id)}
                                                                        className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-amber-50/30' : ''}`}
                                                                    >
                                                                        <div className={`w-[18px] h-[18px] rounded-[3px] border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#e47911] border-[#e47911]' : 'border-[#adb1b8] bg-white group-hover:border-[#c45500]'}`}>
                                                                            {isSelected && <CheckCircle className="h-3 w-3 text-white" strokeWidth={4} />}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className={`text-[13px] truncate ${isSelected ? 'font-bold text-[#111]' : 'font-medium text-[#565959]'}`}>
                                                                                {p.product_name || p.name}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase whitespace-nowrap">SKU: {p.sku || 'N/A'}</span>
                                                                                {isSelected && <span className="text-[9px] font-black text-[#c45500] uppercase tracking-tighter italic">Included</span>}
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
                                            className="w-full h-[45px] px-4 border border-[#adb1b8] rounded-[4px] bg-[#f7f8fa] flex items-center justify-between cursor-pointer hover:bg-[#eff1f3] transition-colors"
                                        >
                                            <span className="text-[13px] font-medium text-[#565959]">
                                                {form.product_ids.length > 0 ? `${form.product_ids.length} products selected` : 'Click to select products...'}
                                            </span>
                                            <ChevronRight className={`h-4 w-4 text-[#565959] transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-10 flex justify-end gap-3 pt-6 border-t border-[#eee]">
                                    <AmazonButton variant="secondary" onClick={() => setView('list')} className="w-[120px]">Discard</AmazonButton>
                                    <AmazonButton type="submit" loading={saving} className="w-[180px]">Save Section</AmazonButton>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#fcfcfc] min-h-screen pb-20 font-sans animate-in fade-in duration-500 text-left">
            
            {/* ── PROFESSIONAL HEADER ── */}
            <div className="bg-white border-b border-[#ddd] py-5 shadow-sm">
                <div className="max-w-[1240px] mx-auto px-4 md:px-8">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500] font-black uppercase tracking-tight">Sections</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[24px] font-normal text-[#111]">Front Page Sections</h1>
                            <p className="text-[12px] text-[#565959] mt-0.5">Manage the product groups shown on your main website.</p>
                        </div>
                        <div className="flex gap-3">
                            <AmazonButton variant="secondary" onClick={loadData}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </AmazonButton>
                            <AmazonButton onClick={handleNew}>
                                <Plus size={14} /> Add new section
                            </AmazonButton>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1240px] mx-auto mt-8 px-4 md:px-8">
                
                {/* ── SEARCH BOX ── */}
                <div className="bg-white border border-[#ddd] rounded p-4 mb-6 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Find a section..."
                            className="w-full h-[32px] pl-9 pr-4 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-[#fcfcfc] border border-[#f3f3f3] rounded text-[11px] font-bold text-[#565959]">
                        <Activity size={14} className="text-[#e47911]" /> {categories.length} GROUPS
                    </div>
                </div>

                {/* ── TABLE ── */}
                <div className="bg-white border border-[#ddd] rounded shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f6f6f6] border-b border-[#ddd]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-tighter">Order</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-tighter">Group Name</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-tighter">Products</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-tighter">Front End</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#111] uppercase tracking-tighter">Status</th>
                                    <th className="px-6 py-4 text-right text-[12px] font-bold text-[#111] uppercase tracking-tighter">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee] bg-white">
                                {loading && filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="py-20 text-center text-[13px] text-slate-400 italic">Reading layout...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="py-20 text-center text-[13px] text-slate-400 font-medium">No sections defined yet.</td></tr>
                                ) : (
                                    filtered.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-[#fcfdff] transition-all group">
                                            <td className="px-6 py-4 text-[13px] font-bold text-slate-400">
                                                {String(cat.position || 0).padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[14px] font-bold text-[#007185] hover:text-[#c45500] cursor-pointer hover:underline" onClick={() => handleEdit(cat)}>{cat.name}</p>
                                                {cat.description && <p className="text-[10px] text-[#565959] mt-0.5 max-w-[250px] truncate">{cat.description}</p>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-[#f9f9f9] border border-[#eee] rounded">
                                                    <Package size={11} className="text-slate-400" />
                                                    <span className="text-[11px] font-bold text-[#111]">{cat.products?.length || cat.product_details?.length || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-[1px] text-[9px] font-black uppercase border ${cat.is_visible !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                    {cat.is_visible !== false ? 'Visible' : 'Hidden'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-[1px] text-[9px] font-black uppercase border ${cat.status === 'active' ? 'bg-[#f0f2f2] text-[#111] border-[#d5d9d9]' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {cat.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => handleEdit(cat)} className="p-1.5 border border-[#ddd] rounded text-[#565959] hover:text-[#007185] hover:bg-slate-50"><Edit size={14} /></button>
                                                    <button onClick={() => setDeleteItem(cat)} className="p-1.5 border border-[#ddd] rounded text-[#565959] hover:text-red-700 hover:bg-red-50"><Trash size={14} /></button>
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
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-md p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-100"><AlertTriangle size={32} /></div>
                        <h3 className="text-[20px] font-bold text-[#111]">Delete Section?</h3>
                        <p className="text-[13px] text-[#565959] mt-3 leading-relaxed">Remove <span className="font-bold text-[#111]">"{deleteItem.name}"</span>? This will hide the group from your store front.</p>
                        <div className="mt-8 flex gap-4">
                            <button onClick={() => setDeleteItem(null)} className="flex-1 py-2 text-[13px] font-bold text-[#565959] hover:underline">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="flex-1 bg-red-600 text-white rounded-[2px] py-2 text-[13px] font-bold shadow-sm hover:bg-red-700 disabled:opacity-50">
                                {deleting ? 'Deleting...' : 'Delete Section'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
