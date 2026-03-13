'use client';

import { useState, useEffect } from 'react';
import {
    Building2, Plus, Edit, Trash2, Save, X,
    AlertCircle, Loader2, Search, RefreshCw,
    CheckCircle, ArrowLeft, Mail, Phone,
    MapPin, Globe, Tag, AlertTriangle
} from 'lucide-react';
import { companyService, companyCategoryService, CompanyInfo, CompanyCategory } from '@/lib/api';

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

const EMPTY: Partial<CompanyInfo> = {
    name: '', email: '', phone: '', address: '', city: '', tax_number: '', website: '', category: ''
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
    const [apiError, setApiError] = useState('');
    const [categories, setCategories] = useState<CompanyCategory[]>([]);

    useEffect(() => {
        companyCategoryService.getAll().then(setCategories);
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
            });
        }
    }, [editCompany]);

    const h = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }));
        setErrors(p => ({ ...p, [e.target.name]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = 'name';
        if (!form.email?.trim()) e.email = 'email';
        if (!form.phone?.trim()) e.phone = 'phone';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        if (!validate()) return;
        setSaving(true);
        try {
            let result: CompanyInfo;
            if (editCompany?.id) {
                result = await companyService.update(editCompany.id, form);
            } else {
                result = await companyService.create(form);
            }
            onSaved(result);
        } catch (err: any) {
            setApiError(err?.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-normal text-gray-900 dark:text-white">
                    {editCompany ? 'Edit Business Profile' : 'Add New Company'}
                </h1>
                <button onClick={onCancel} className="text-sm text-gray-400 hover:text-[#FF9900]:text-[#C45500] hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back to list
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <SectionCard>
                    <SectionHeader title="Company Details" icon={Building2} />
                    <div className="p-6">
                        {apiError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {apiError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>Company Name <span className="text-red-700">*</span></label>
                                <input name="name" value={form.name} onChange={h} className={INPUT(!!errors.name)} placeholder="e.g. Al-Qavi Cosmetics" />
                            </div>
                            <div>
                                <label className={LABEL}>Category</label>
                                <select name="category" value={form.category || ''} onChange={h} className={INPUT()}>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL}>Email Address <span className="text-red-700">*</span></label>
                                <input name="email" type="email" value={form.email} onChange={h} className={INPUT(!!errors.email)} placeholder="info@company.com" />
                            </div>
                            <div>
                                <label className={LABEL}>Phone Number <span className="text-red-700">*</span></label>
                                <input name="phone" value={form.phone} onChange={h} className={INPUT(!!errors.phone)} placeholder="+92 ..." />
                            </div>
                            <div>
                                <label className={LABEL}>Tax / NTN ID</label>
                                <input name="tax_number" value={form.tax_number} onChange={h} className={INPUT()} placeholder="0000000-0" />
                            </div>
                            <div>
                                <label className={LABEL}>City</label>
                                <input name="city" value={form.city} onChange={h} className={INPUT()} placeholder="Lahore" />
                            </div>
                            <div className="md:col-span-2">
                                <label className={LABEL}>Business Address</label>
                                <textarea name="address" value={form.address} onChange={h} rows={3} className={INPUT() + ' resize-none'} placeholder="Street, Area, Building..." />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onCancel}
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
                            {editCompany ? 'Save Changes' : 'Add Company'}
                        </button>
                    </div>
                </SectionCard>
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
    const [editCompany, setEditCompany] = useState<CompanyInfo | null>(null);
    const [deleteCompany, setDeleteCompany] = useState<CompanyInfo | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await companyService.getAll();
            setCompanies(data || []);
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

    const handleSaved = (saved: CompanyInfo) => {
        load();
        showToast(editCompany ? 'Company updated.' : 'Company created.');
        setView('list');
        setEditCompany(null);
    };

    const confirmDelete = async () => {
        if (!deleteCompany) return;
        setDeleting(true);
        try {
            await companyService.delete(deleteCompany.id!);
            setCompanies(prev => prev.filter(c => c.id !== deleteCompany.id));
            showToast('Company removed successfully.');
        } catch (e) {
            console.error(e);
            alert('Failed to remove company.');
        } finally {
            setDeleting(false);
            setDeleteCompany(null);
        }
    };

    const filtered = (companies || []).filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
    );

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
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-[#FF9900]" /> Companies
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage global business profiles and supply chain nodes</p>
                </div>
                <button
                    onClick={() => { setEditCompany(null); setView('form'); }}
                    className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Company
                </button>
            </div>

            {/* Quick Filter */}
            <SectionCard className="mb-6">
                <div className="p-4 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search companies..."
                            className={INPUT()}
                        />
                    </div>
                    <button onClick={load} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </SectionCard>

            {/* List Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Organization</th>
                                <th className="px-6 py-3">Contact info</th>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={4} className="px-6 py-4 animate-pulse"><div className="h-4 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No companies found. Add a company to get started.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">NTN: {c.tax_number || 'NA'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5"><Mail className="w-3 h-3" /> {c.email}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3" /> {c.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {c.city}</div>
                                            <div className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5">{c.address}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setEditCompany(c); setView('form'); }} className="p-1.5 text-gray-600 hover:text-[#FF9900] transition-colors font-medium">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setDeleteCompany(c)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
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
            {deleteCompany && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                            </div>
                            <button onClick={() => setDeleteCompany(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete the company <span className="font-bold text-gray-900 dark:text-white">"{deleteCompany.name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteCompany(null)}
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
                                Delete Company
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}
