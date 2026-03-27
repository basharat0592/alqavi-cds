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
    const [apiError, setApiError] = useState('');
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
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    id="is_active"
                                    checked={form.is_active}
                                    onChange={(e) => setForm((p: any) => ({ ...p, is_active: e.target.checked }))}
                                    className="w-4 h-4 text-[#FF9900] border-gray-300 rounded focus:ring-[#FF9900]"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Company</label>
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
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categories, setCategories] = useState<CompanyCategory[]>([]);
    const [activeTab, setActiveTab] = useState<'manufacturing' | 'suppliers'>('manufacturing');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [editCompany, setEditCompany] = useState<CompanyInfo | null>(null);
    const [deleteCompany, setDeleteCompany] = useState<CompanyInfo | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [compData, catData, supData] = await Promise.all([
                companyService.getAll(),
                companyCategoryService.getAll(),
                companyService.getSuppliers?.() || Promise.resolve([])
            ]);
            setCompanies(compData || []);
            setCategories((catData || []).filter(c => c.is_active !== false));
            setSuppliers(supData || []);
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

    const filteredCompanies = (companies || []).filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.email?.toLowerCase().includes(search.toLowerCase()) ||
            c.city?.toLowerCase().includes(search.toLowerCase());
        const matchesCat = selectedCategory ? (typeof c.category === 'object' ? c.category.id?.toString() === selectedCategory : c.category?.toString() === selectedCategory) : true;
        return matchesSearch && matchesCat;
    });

    const filteredSuppliers = (suppliers || []).filter(s => {
        return s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase()) ||
            s.city?.toLowerCase().includes(search.toLowerCase());
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
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            {/* Header Title & Switch */}
            <div className={`mb-8 ${view === 'form' ? 'hidden' : 'block'}`}>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <span className="w-1.5 h-10 bg-[#E68A00] rounded-full"></span>
                            Company Hub
                        </h1>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-widest">
                            Manage manufacturing entities and registered distribution partners
                        </p>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <button
                            onClick={() => setActiveTab('manufacturing')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${activeTab === 'manufacturing' ? 'bg-white dark:bg-slate-700 text-[#E68A00] shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                        >
                            Manufacturing
                        </button>
                        <button
                            onClick={() => setActiveTab('suppliers')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${activeTab === 'suppliers' ? 'bg-white dark:bg-slate-700 text-[#E68A00] shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
                        >
                            Distribution Suppliers
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Filter & Action Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-[#ddd] dark:border-slate-800 rounded shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={`Search registered ${activeTab}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={INPUT() + " pl-10 h-10 border-gray-200 focus:border-[#E68A00]"}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'manufacturing' && (
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className={INPUT() + " w-48 h-10 border-gray-200 focus:border-[#E68A00]"}
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )}
                        <button
                            onClick={load}
                            className="h-10 w-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-gray-600 dark:text-gray-400 hover:text-[#E68A00] hover:border-[#E68A00] transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => { setEditCompany(null); setView('form'); }}
                            className="h-10 px-6 bg-[#E68A00] hover:bg-[#C45500] text-white text-[11px] font-black uppercase tracking-widest rounded transition-all shadow-sm hover:shadow-orange-200 dark:hover:shadow-none flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add {activeTab === 'manufacturing' ? 'Company' : 'Supplier'}
                        </button>
                    </div>
                </div>

                {/* Content Logic */}
                {activeTab === 'manufacturing' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-white dark:bg-slate-800 animate-pulse rounded border border-gray-100 dark:border-slate-800"></div>)
                        ) : filteredCompanies.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-500 uppercase font-bold text-xs tracking-widest bg-gray-50 dark:bg-slate-800 rounded border border-dashed border-gray-300 dark:border-slate-700">No records found.</div>
                        ) : (
                            filteredCompanies.map(company => (
                                <div key={company.id} className="group bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm hover:shadow-md transition-all">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-gray-100 dark:border-slate-800">
                                                <Building2 className="w-5 h-5 text-[#E68A00]" />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditCompany(company); setView('form'); }} className="p-1.5 text-gray-400 hover:text-[#E68A00] transition-colors"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => setDeleteCompany(company)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1 group-hover:text-[#E68A00] transition-colors uppercase tracking-tight">{company.name}</h3>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-4">{company.category_name || 'Standard'}</p>

                                        <div className="space-y-2 pt-4 border-t border-gray-50 dark:border-slate-800">
                                            {company.email && <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium"><Mail className="w-3 h-3 opacity-40" /> {company.email}</div>}
                                            {company.city && <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium"><MapPin className="w-3 h-3 opacity-40" /> {company.city}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                             Array(6).fill(0).map((_, i) => <div key={i} className="h-48 bg-white dark:bg-slate-800 animate-pulse rounded border border-gray-100 dark:border-slate-800"></div>)
                        ) : filteredSuppliers.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-500 uppercase font-bold text-xs tracking-widest bg-gray-50 dark:bg-slate-800 rounded border border-dashed border-gray-300 dark:border-slate-700">No registered suppliers found.</div>
                        ) : (
                            filteredSuppliers.map(sup => (
                                <div key={sup.id} className="group bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm hover:shadow-md transition-all">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center border border-amber-100 dark:border-slate-800 text-amber-600">
                                                <Tag className="w-5 h-5" />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 text-gray-400 hover:text-[#E68A00] transition-colors"><Edit className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1 group-hover:text-[#E68A00] transition-colors uppercase tracking-tight">{sup.name}</h3>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-black uppercase tracking-widest">Registered</span>
                                            <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-black uppercase tracking-widest">{sup.product_count || 0} Products</span>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium"><Globe className="w-3.5 h-3.5 opacity-40" /> {sup.city || 'Pakistan'}</div>
                                            <div className="mt-2">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Managed Products</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {(sup.product_list || []).map((p: string, idx: number) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-gray-50 dark:bg-slate-800 text-[9px] text-gray-600 dark:text-gray-300 rounded border border-gray-100 dark:border-slate-800 font-bold">{p}</span>
                                                    ))}
                                                    {(sup.product_list?.length === 0) && <span className="text-[10px] text-gray-400 italic font-medium">No products listed</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

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
                                Are you sure you want to delete <span className="font-black text-gray-900 dark:text-white">"{deleteCompany.name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setDeleteCompany(null)} disabled={deleting} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded text-xs font-bold uppercase tracking-tight transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold uppercase tracking-tight transition-all flex items-center gap-2 disabled:opacity-50">
                                {deleting && <Loader2 className="h-3 w-3 animate-spin" />} Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#E68A00] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm uppercase tracking-tight font-black">{toast}</span>
                </div>
            )}
        </div>
    );
}
