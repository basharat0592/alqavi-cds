"use client";

import React, { useState, useEffect } from 'react';
import {
    Building2, Plus, Edit, Trash2, Save, X,
    AlertCircle, Search, RefreshCw,
    CheckCircle, ChevronLeft, Mail, Phone,
    MapPin, Globe, Tag, AlertTriangle, MoreHorizontal,
    ShieldCheck, Activity, Loader2
} from 'lucide-react';
import { companyService, companyCategoryService, CompanyInfo, CompanyCategory } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-xl text-sm outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

const EMPTY: Partial<CompanyInfo> = {
    name: '', email: '', phone: '', address: '', city: '', tax_number: '', website: '', category: '', is_active: true
};

// ─── Company Form ─────────────────────────────────────────────────────────────
function CompanyForm({
    editCompany, onCancel, onSaved,
}: {
    editCompany?: CompanyInfo | null;
    onCancel: () => void;
    onSaved: (c: CompanyInfo) => void;
}) {
    const [form, setForm] = useState({ ...EMPTY } as any);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<CompanyCategory[]>([]);

    useEffect(() => {
        companyCategoryService.getAll().then(cats => setCategories((cats || []).filter(c => c.is_active !== false)));
        if (editCompany) {
            setForm({
                name: editCompany.name || '',
                email: editCompany.email || '',
                phone: editCompany.phone || '',
                address: editCompany.address || '',
                city: editCompany.city || '',
                tax_number: editCompany.tax_number || '',
                website: editCompany.website || '',
                category: editCompany.category || '',
                is_active: editCompany.is_active !== false,
            });
        }
    }, [editCompany]);

    const h = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }));
        setErrors(p => ({ ...p, [e.target.name]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = 'Company name is required';
        if (!form.email?.trim()) e.email = 'Email address is required';
        if (!form.phone?.trim()) e.phone = 'Phone number is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            let result: CompanyInfo;
            if (editCompany?.id) {
                result = await companyService.update(editCompany.id, form);
                toast.success('Company profile updated!');
            } else {
                result = await companyService.create(form);
                toast.success('New company registered!');
            }
            onSaved(result);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to save company registry.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-6 font-sans">
            <div className="mb-8">
                <button 
                    onClick={onCancel} 
                    className="text-sm font-medium text-slate-500 hover:text-[#EEAF1C] transition-colors mb-4 flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Registry
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    {editCompany ? 'Edit Profile' : 'New Company Registry'}
                </h1>
                <p className="text-sm text-slate-500">Add or update company information in the system</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <Building2 className="h-4 w-4 text-[#EEAF1C]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Professional Profile</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Company Name <span className="text-red-500">*</span></label>
                                <input name="name" value={form.name} onChange={h} className={inputCls(!!errors.name)} placeholder="e.g. Al-Qavi Cosmetics" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Category</label>
                                <select name="category" value={form.category || ''} onChange={h} className={selectCls}>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Email Liaison <span className="text-red-500">*</span></label>
                                <input name="email" type="email" value={form.email} onChange={h} className={inputCls(!!errors.email)} placeholder="info@company.com" />
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Phone Contact <span className="text-red-500">*</span></label>
                                <input name="phone" value={form.phone} onChange={h} className={inputCls(!!errors.phone)} placeholder="+92 ..." />
                                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Tax / NTN Identification</label>
                                <input name="tax_number" value={form.tax_number} onChange={h} className={inputCls()} placeholder="0000000-0" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Primary City</label>
                                <input name="city" value={form.city} onChange={h} className={inputCls()} placeholder="Lahore" />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className={labelCls}>Business Address</label>
                                <textarea name="address" value={form.address} onChange={h} rows={3} className={inputCls() + ' resize-none'} placeholder="Physical office location..." />
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={form.is_active}
                                        onChange={(e) => setForm((p: any) => ({ ...p, is_active: e.target.checked }))}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EEAF1C]"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Active Entity</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
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
                        Commit Changes
                    </button>
                </div>
            </form>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyPage() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [companies, setCompanies] = useState<CompanyInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState<CompanyCategory[]>([]);
    const [editCompany, setEditCompany] = useState<CompanyInfo | null>(null);
    const [deleteCompany, setDeleteCompany] = useState<CompanyInfo | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [compData, catData] = await Promise.all([
                companyService.getAll(),
                companyCategoryService.getAll()
            ]);
            setCompanies(compData || []);
            setCategories((catData || []).filter(c => c.is_active !== false));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSaved = () => {
        load();
        setView('list');
        setEditCompany(null);
    };

    const confirmDelete = async () => {
        if (!deleteCompany) return;
        setDeleting(true);
        try {
            await companyService.delete(deleteCompany.id!);
            setCompanies(prev => prev.filter(c => c.id !== deleteCompany.id));
            toast.success('Entity removed from registry.');
        } catch (e) {
            console.error(e);
            toast.error('Failed to remove company node.');
        } finally {
            setDeleting(false);
            setDeleteCompany(null);
        }
    };

    const filteredEntities = companies.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase()) ||
            c.city?.toLowerCase().includes(search.toLowerCase());
        
        const matchesCat = selectedCategory ? (
            (typeof c.category === 'object' ? c.category.id?.toString() === selectedCategory : c.category?.toString() === selectedCategory)
        ) : true;
        
        return matchesSearch && matchesCat;
    });

    if (view === 'form') {
        return (
            <CompanyForm
                editCompany={editCompany}
                onCancel={() => { setView('list'); setEditCompany(null); }}
                onSaved={handleSaved}
            />
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans relative">
            {loading && <PageLoader />}
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Company Hub</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage all registered companies and entities</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#EEAF1C] hover:border-[#EEAF1C]/40 transition-all font-bold"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 font-bold ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => { setEditCompany(null); setView('form'); }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#EEAF1C] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Register Entity
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search system registry..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] focus:ring-2 focus:ring-[#EEAF1C]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#EEAF1C] text-slate-700 dark:text-slate-300 cursor-pointer h-[38px]"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Company Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Contact Info</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {(loading && filteredEntities.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-8 w-8 border-2 border-[#EEAF1C] border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sourcing Registry...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEntities.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Building2 className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No system records found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEntities.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#EEAF1C] group-hover:text-white transition-all">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</p>
                                                    <p className="text-[10px] text-[#EEAF1C] font-bold uppercase tracking-wider">Verified</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase">
                                                {item.category_name || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                    <Mail className="h-3 w-3 text-slate-300" /> {item.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold tracking-tight">
                                                    <MapPin className="h-3 w-3 text-slate-300" /> {item.city}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => { setEditCompany(item); setView('form'); }} 
                                                    className="p-1.5 text-slate-400 hover:text-[#EEAF1C] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteCompany(item)} 
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
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

            {deleteCompany && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Confirm Purge</h3>
                            </div>
                            <button onClick={() => setDeleteCompany(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Confirm permanent removal of <span className="text-[#EEAF1C] font-bold">"{deleteCompany.name}"</span> from system registry?
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteCompany(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors">Abort</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting} 
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />} Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

