'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Pencil, X, Search, RefreshCw, Tag } from 'lucide-react';
import { companyService } from '@/services/company.service';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

type Company = { id: number; name: string; numbers: string; category: string; is_active: boolean };

const EMPTY = { name: '', category: '' };

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ ...EMPTY });
    const [editId, setEditId] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const rows = await companyService.getCompanies();
            setCompanies(Array.isArray(rows) ? rows : []);
        } catch { toast.error('Failed to load companies'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const resetForm = () => { setForm({ ...EMPTY }); setEditId(null); };

    const save = async () => {
        if (!form.name.trim()) return toast.error('Company name is required.');
        setSaving(true);
        try {
            const payload = { name: form.name.trim(), category: form.category.trim() };
            if (editId) {
                await companyService.updateCompany(editId, payload);
                toast.success('Company updated');
            } else {
                await companyService.createCompany(payload);
                toast.success('Company added');
            }
            resetForm();
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.name?.[0] || e?.response?.data?.detail || 'Failed to save company');
        } finally { setSaving(false); }
    };

    const startEdit = (c: Company) => {
        setEditId(c.id);
        setForm({ name: c.name, category: c.category || '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const remove = async (c: Company) => {
        if (!confirm(`Delete company “${c.name}”?`)) return;
        try {
            await companyService.deleteCompany(c.id);
            toast.success('Company deleted');
            if (editId === c.id) resetForm();
            load();
        } catch { toast.error('Failed to delete company'); }
    };

    const filtered = companies.filter(c => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (c.name || '').toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q);
    });

    return (
        <div className="pb-20 max-w-[1000px] mx-auto">
            <PageHeader
                title="Companies"
                subtitle="Add companies / brands and their category (e.g. Local, Imported, Pakistani)."
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Companies' }]}
            />

            {/* ── Add / edit form ── */}
            <Card className="overflow-hidden mb-5">
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-slate-50/80 to-transparent">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center ring-1 ring-inset ring-indigo-100 shrink-0">
                        <Building2 size={17} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">{editId ? 'Edit Company' : 'Add Company'}</h2>
                        <p className="text-[11.5px] text-slate-500">Company name and category.</p>
                    </div>
                </div>
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[12px] font-bold text-slate-700 mb-1">Company Name <span className="text-rose-600">*</span></label>
                        <input className={ui.inputBase} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Amour Company" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-slate-700 mb-1">Company Category</label>
                        <div className="relative">
                            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className={ui.inputBase + ' pl-9'} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Local / Imported / Pakistani" />
                        </div>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2 pt-1">
                        <Button variant="primary" onClick={save} disabled={saving}>
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : (editId ? <Pencil size={15} /> : <Plus size={15} />)}
                            {editId ? 'Update Company' : 'Add Company'}
                        </Button>
                        {editId && (
                            <Button variant="outline" onClick={resetForm}><X size={15} /> Cancel</Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── List ── */}
            <Card className="overflow-hidden">
                <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
                    <h3 className="text-[13px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Company List
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full tabular-nums">{filtered.length}</span>
                    </h3>
                    <div className="relative w-full max-w-[240px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className={ui.inputBase + ' pl-9 h-9'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..." />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-200 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                                <th className="px-5 py-2.5">Company Name</th>
                                <th className="px-5 py-2.5">Category</th>
                                <th className="px-5 py-2.5 text-right w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 italic">No companies yet. Add one above.</td></tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3 font-bold text-slate-900">{c.name}</td>
                                        <td className="px-5 py-3">
                                            {c.category
                                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">{c.category}</span>
                                                : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <button onClick={() => startEdit(c)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors" title="Edit"><Pencil size={15} /></button>
                                            <button onClick={() => remove(c)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors ml-1" title="Delete"><Trash2 size={15} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
