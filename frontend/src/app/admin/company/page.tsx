"use client";

import React, { useState, useEffect } from 'react';
import {
    Building2, Plus, Edit, Trash2, Save,
    Search, RefreshCw, ChevronLeft, Mail,
    MapPin, AlertTriangle
} from 'lucide-react';
import { companyService, companyCategoryService, CompanyInfo, CompanyCategory } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

const inputCls = (err?: boolean) => `${ui.inputBase} ${err ? '!border-rose-500 focus:!border-rose-500 focus:!ring-rose-500/10' : ''}`;
const selectCls = `${ui.inputBase} cursor-pointer`;
const labelCls = 'block text-[13px] font-bold text-slate-700 mb-1.5';

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
            <button
                onClick={onCancel}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-4 flex items-center gap-1"
            >
                <ChevronLeft className="h-4 w-4" /> Back to Registry
            </button>
            <PageHeader
                title={editCompany ? 'Edit Profile' : 'New Company Registry'}
                subtitle="Add or update company information in the system"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Company', href: '/admin/company' }, { label: editCompany ? 'Edit' : 'New' }]}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900">Professional Profile</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Company Name <span className="text-rose-500">*</span></label>
                                <input name="name" value={form.name} onChange={h} className={inputCls(!!errors.name)} placeholder="e.g. Al-Qavi Cosmetics" />
                                {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Category</label>
                                <select name="category" value={form.category || ''} onChange={h} className={selectCls}>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Email Liaison <span className="text-rose-500">*</span></label>
                                <input name="email" type="email" value={form.email} onChange={h} className={inputCls(!!errors.email)} placeholder="info@company.com" />
                                {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Phone Contact <span className="text-rose-500">*</span></label>
                                <input name="phone" value={form.phone} onChange={h} className={inputCls(!!errors.phone)} placeholder="+92 ..." />
                                {errors.phone && <p className="text-xs text-rose-500">{errors.phone}</p>}
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
                                <textarea name="address" value={form.address} onChange={h} rows={3} className={inputCls() + ' !h-auto py-2.5 resize-none'} placeholder="Physical office location..." />
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={form.is_active}
                                        onChange={(e) => setForm((p: any) => ({ ...p, is_active: e.target.checked }))}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    <span className="ml-3 text-sm font-medium text-slate-700">Active Entity</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        Discard
                    </Button>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commit Changes
                    </Button>
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
            <PageHeader
                title="Company"
                subtitle="Manage all registered companies and entities"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Company' }]}
                actions={
                    <>
                        <Button variant="outline" size="md" onClick={load} title="Refresh" className="!px-3">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="primary" size="md" onClick={() => { setEditCompany(null); setView('form'); }}>
                            <Plus className="h-4 w-4" />
                            Register Entity
                        </Button>
                    </>
                }
            />

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search system registry..."
                        className={`${ui.inputBase} pl-9`}
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`${ui.inputBase} w-auto cursor-pointer`}
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* ── Table ── */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-200 text-left">
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Company Name</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider">Contact Info</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(loading && filteredEntities.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sourcing Registry...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEntities.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">No system records found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEntities.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Verified</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge tone="neutral">
                                                {item.category_name || 'Uncategorized'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
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
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-all"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteCompany(item)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-all"
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
            </Card>

            <Modal
                open={!!deleteCompany}
                onClose={() => { if (!deleting) setDeleteCompany(null); }}
                title="Confirm Purge"
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteCompany(null)} disabled={deleting}>Abort</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                            {deleting && <RefreshCw className="h-4 w-4 animate-spin" />} Confirm Purge
                        </Button>
                    </>
                }
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium pt-1.5">
                        Confirm permanent removal of <span className="text-slate-900 font-bold">"{deleteCompany?.name}"</span> from system registry?
                    </p>
                </div>
            </Modal>
        </div>
    );
}

