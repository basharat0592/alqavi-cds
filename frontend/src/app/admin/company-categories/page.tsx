'use client';

import { useState, useEffect } from 'react';
import {
    Tag, Plus, Search, X, RefreshCw, Edit2, Trash2,
    Save, AlertTriangle, CheckCircle, XCircle, Loader2,
    Globe, MapPin, ToggleLeft, ToggleRight
} from 'lucide-react';
import { companyCategoryService, CompanyCategory } from '@/lib/api';

/* ══════════════════════════════════════════════
   PRESET COLOR PALETTE
══════════════════════════════════════════════ */
const COLOR_PALETTE = [
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', val: 'emerald' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', val: 'blue' },
    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500', val: 'violet' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', val: 'amber' },
    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', val: 'red' },
    { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500', val: 'sky' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', val: 'orange' },
    { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', dot: 'bg-pink-500', val: 'pink' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500', val: 'indigo' },
    { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500', val: 'teal' },
];

const getColor = (val: string) => COLOR_PALETTE.find(c => c.val === val) || COLOR_PALETTE[0];

/* ══════════════════════════════════════════════
   CATEGORY BADGE
══════════════════════════════════════════════ */
function CategoryBadge({ cat }: { cat: CompanyCategory }) {
    const c = getColor(cat.color || 'emerald');
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${c.bg} ${c.border} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {cat.name}
        </span>
    );
}

/* ══════════════════════════════════════════════
   FORM MODAL (Create / Edit)
══════════════════════════════════════════════ */
const BLANK: Partial<CompanyCategory> = {
    name: '', code: '', type: 'local', country: '', description: '', color: 'emerald', is_active: true,
};

function CategoryFormModal({ editing, onClose, onSaved }: {
    editing: CompanyCategory | null;
    onClose: () => void;
    onSaved: (cat: CompanyCategory) => void;
}) {
    const [form, setForm] = useState<Partial<CompanyCategory>>(
        editing ? { ...editing } : { ...BLANK }
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const set = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = 'Category name is required';
        if (!form.code?.trim()) e.code = 'Code is required';
        else if (form.code.length > 6) e.code = 'Max 6 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const saved = editing
                ? await companyCategoryService.update(editing.id, form)
                : await companyCategoryService.create(form);
            onSaved(saved);
        } catch { setErrors({ submit: 'Failed to save. Try again.' }); }
        setSaving(false);
    };

    const inputCls = (k: string) =>
        `w-full border rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 transition-all bg-white ${errors[k] ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'}`;

    const selectedColor = getColor(form.color || 'emerald');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded-xl flex items-center justify-center">
                            <Tag className="h-5 w-5 text-[#FF9900]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900">{editing ? 'Edit Category' : 'New Company Category'}</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{editing ? `Editing: ${editing.name}` : 'Add a product origin category'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="h-4 w-4 text-gray-400" /></button>
                </div>

                <div className="p-7 space-y-4">
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />{errors.submit}
                        </div>
                    )}

                    {/* Name + Code */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Category Name <span className="text-red-500">*</span></label>
                            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Pakistani Brand" className={inputCls('name')} />
                            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Code <span className="text-red-500">*</span></label>
                            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="PKB" maxLength={6}
                                className={`${inputCls('code')} text-center tracking-widest`} />
                            {errors.code && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.code}</p>}
                        </div>
                    </div>

                    {/* Type + Country */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Type</label>
                            <div className="flex gap-2">
                                {(['local', 'imported'] as const).map(t => (
                                    <button key={t} onClick={() => set('type', t)}
                                        className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${form.type === t ? 'bg-[#FF9900] text-[#131921] border-[#FF9900] shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                        {t === 'local' ? '🏠 Local' : '🌍 Imported'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Country / Region</label>
                            <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. Pakistan, India, China..."
                                className={inputCls('country')} />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">Description</label>
                        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                            placeholder="Brief description of this category..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] resize-none" />
                    </div>

                    {/* Color */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Badge Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_PALETTE.map(c => (
                                <button key={c.val} onClick={() => set('color', c.val)}
                                    className={`w-7 h-7 rounded-lg border-2 ${c.dot} transition-all ${form.color === c.val ? 'border-gray-800 scale-125 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-110'}`} />
                            ))}
                        </div>
                        {/* Preview */}
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preview:</span>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${selectedColor.bg} ${selectedColor.border} ${selectedColor.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${selectedColor.dot}`} />
                                {form.name || 'Category Name'}
                            </span>
                        </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                        <div>
                            <p className="text-xs font-black text-gray-900">Active Status</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Inactive categories won&apos;t appear in product filters</p>
                        </div>
                        <button onClick={() => set('is_active', !form.is_active)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                            {form.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            {form.is_active ? 'Active' : 'Inactive'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white transition-all">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all shadow-sm disabled:opacity-60">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Saving...' : editing ? 'Update Category' : 'Create Category'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   DELETE CONFIRMATION MODAL
══════════════════════════════════════════════ */
function DeleteConfirmationModal({ category, onClose, onConfirm, deleting }: {
    category: CompanyCategory;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-red-50/50">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-200">
                        <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Delete Category</h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">This action cannot be undone</p>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-sm font-medium text-gray-600 mb-3 leading-relaxed">
                        Are you sure you want to permanently delete <span className="font-black text-gray-900">&quot;{category.name}&quot;</span>?
                    </p>
                    <p className="text-[10px] text-red-600/90 font-black tracking-widest uppercase bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        Warning: This might affect products associated with this category.
                    </p>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 flex justify-end gap-3 border-t border-gray-100">
                    <button onClick={onClose} disabled={deleting}
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={deleting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/20 disabled:opacity-60">
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function CompanyCategoriesPage() {
    const [categories, setCategories] = useState<CompanyCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'local' | 'imported'>('all');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CompanyCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<CompanyCategory | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
    };

    const load = async () => {
        setLoading(true);
        try {
            const data = await companyCategoryService.getAll();
            setCategories(data);
        } catch { showToast('Failed to load categories.', 'error'); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = categories.filter(c => {
        const q = search.toLowerCase();
        const matchSearch = !search || c.name.toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q) || (c.country || '').toLowerCase().includes(q);
        const matchType = typeFilter === 'all' || c.type === typeFilter;
        return matchSearch && matchType;
    });

    const localCount = categories.filter(c => c.type === 'local').length;
    const importedCount = categories.filter(c => c.type === 'imported').length;
    const activeCount = categories.filter(c => c.is_active).length;

    const handleSaved = (cat: CompanyCategory) => {
        load();
        setFormOpen(false);
        setEditing(null);
        showToast(`"${cat.name}" ${editing ? 'updated' : 'created'} successfully!`);
    };

    const handleEdit = (cat: CompanyCategory) => { setEditing(cat); setFormOpen(true); };

    const handleToggle = async (cat: CompanyCategory) => {
        try {
            const updated = await companyCategoryService.update(cat.id, { is_active: !cat.is_active });
            setCategories(prev => prev.map(c => String(c.id) === String(cat.id) ? updated : c));
            showToast(`"${cat.name}" ${updated.is_active ? 'activated' : 'deactivated'}`);
        } catch { showToast('Failed to update.', 'error'); }
    };

    const handleDelete = (cat: CompanyCategory) => {
        setCategoryToDelete(cat);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        setDeleting(true);
        try {
            await companyCategoryService.delete(categoryToDelete.id);
            setCategories(prev => prev.filter(c => String(c.id) !== String(categoryToDelete.id)));
            showToast(`"${categoryToDelete.name}" deleted.`);
            setCategoryToDelete(null);
        } catch { showToast('Failed to delete.', 'error'); }
        setDeleting(false);
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[40%] rounded-full bg-[#FF9900]/8 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[40%] rounded-full bg-emerald-50/60 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[280px]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-[#FF9900]' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <p className="text-gray-900 text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* ── Header & Stats ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-7 sm:px-10 pt-7 pb-5 border-b border-gray-100/60">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FF9900]/20">
                            <Tag className="h-6 w-6 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Company Categories</h1>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                Product origin & brand classification
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                        <button onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all rounded-xl disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} /> Refresh
                        </button>
                        <button onClick={() => { setEditing(null); setFormOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest hover:bg-[#e68a00] transition-all shadow-sm rounded-xl">
                            <Plus className="h-4 w-4" strokeWidth={2.5} /> New Category
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100/60">
                    {[
                        { label: 'Total Categories', val: loading ? '—' : String(categories.length), color: 'text-gray-900', sub: 'text-gray-400', bg: 'bg-gray-50 border-gray-100 text-gray-400', Icon: Tag },
                        { label: 'Active', val: loading ? '—' : String(activeCount), color: 'text-emerald-600', sub: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100 text-emerald-400', Icon: CheckCircle },
                        { label: 'Local', val: loading ? '—' : String(localCount), color: 'text-[#FF9900]', sub: 'text-[#FF9900]', bg: 'bg-[#FF9900]/10 border-[#FF9900]/20 text-[#FF9900]', Icon: MapPin },
                        { label: 'Imported', val: loading ? '—' : String(importedCount), color: 'text-blue-600', sub: 'text-blue-500', bg: 'bg-blue-50 border-blue-100 text-blue-400', Icon: Globe },
                    ].map(s => (
                        <div key={s.label} className="flex items-center justify-between px-6 sm:px-8 py-4">
                            <div>
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${s.sub}`}>{s.label}</p>
                                <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.val}</p>
                            </div>
                            <div className={`w-9 h-9 border rounded-xl flex items-center justify-center shadow-sm ${s.bg}`}>
                                <s.Icon className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Categories Grid ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">

                {/* Search + Type filter */}
                <div className="px-5 sm:px-8 py-5 border-b border-gray-100/50 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-white border border-gray-200 px-4 py-2.5 rounded-xl flex-1 min-w-[180px] focus-within:ring-2 focus-within:ring-[#FF9900]/20 focus-within:border-[#FF9900] shadow-sm transition-all">
                        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, code, or country..."
                            className="text-sm text-gray-900 outline-none w-full bg-transparent font-bold placeholder:font-medium placeholder:text-gray-400" />
                        {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 transition-colors"><X className="h-3.5 w-3.5" /></button>}
                    </div>

                    <div className="flex gap-2">
                        {([
                            { k: 'all', label: 'All Types' },
                            { k: 'local', label: '🏠 Local' },
                            { k: 'imported', label: '🌍 Imported' },
                        ] as const).map(f => (
                            <button key={f.k} onClick={() => setTypeFilter(f.k)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${typeFilter === f.k ? 'bg-[#FF9900] text-[#131921] border-transparent shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] whitespace-nowrap bg-[#FF9900]/10 px-3 py-2 rounded-xl border border-[#FF9900]/20">
                        {filtered.length} categor{filtered.length !== 1 ? 'ies' : 'y'}
                    </span>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading categories...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-20 h-20 bg-[#FF9900]/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[#FF9900]/20">
                            <Tag className="h-9 w-9 text-[#FF9900]/40" />
                        </div>
                        <h3 className="font-black text-gray-900 text-lg mb-1">
                            {search || typeFilter !== 'all' ? 'No categories match your filters' : 'No categories yet'}
                        </h3>
                        <p className="text-sm font-medium text-gray-400 mb-6 max-w-xs mx-auto">
                            {search || typeFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Create your first company category to classify products by origin.'}
                        </p>
                        {search || typeFilter !== 'all' ? (
                            <button onClick={() => { setSearch(''); setTypeFilter('all'); }} className="text-xs font-black text-[#FF9900] uppercase tracking-widest hover:underline">Clear filters</button>
                        ) : (
                            <button onClick={() => { setEditing(null); setFormOpen(true); }}
                                className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all shadow-sm">
                                <Plus className="h-4 w-4" /> Create First Category
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(cat => {
                            const c = getColor(cat.color || 'emerald');
                            return (
                                <div key={cat.id}
                                    className={`relative border rounded-2xl p-5 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg cursor-default ${cat.is_active ? 'bg-white border-gray-200 hover:border-[#FF9900]/30' : 'bg-gray-50/80 border-gray-200 opacity-60'}`}>

                                    {/* Type pill */}
                                    <div className="absolute top-4 right-4">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${cat.type === 'local' ? 'bg-[#FF9900]/10 border-[#FF9900]/20 text-[#FF9900]' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                            {cat.type === 'local' ? '🏠 Local' : '🌍 Imported'}
                                        </span>
                                    </div>

                                    {/* Icon + Code */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${c.bg} ${c.border}`}>
                                            <span className={`text-sm font-black tracking-widest ${c.text}`}>{cat.code}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-gray-900 text-sm leading-tight">{cat.name}</h3>
                                            {cat.country && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                                    <p className="text-[10px] text-gray-400 font-bold truncate">{cat.country}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {cat.description && (
                                        <p className="text-xs text-gray-500 font-medium mb-4 leading-relaxed line-clamp-2">{cat.description}</p>
                                    )}

                                    {/* Badge preview */}
                                    <div className="mb-4">
                                        <CategoryBadge cat={cat} />
                                    </div>

                                    {/* Footer actions */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <button onClick={() => handleToggle(cat)}
                                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${cat.is_active ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
                                            {cat.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                            {cat.is_active ? 'Active' : 'Inactive'}
                                        </button>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button onClick={() => handleEdit(cat)}
                                                className="p-1.5 text-[#FF9900] hover:bg-[#FF9900]/10 rounded-lg transition-colors"
                                                title="Edit">
                                                <Edit2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            </button>
                                            <button onClick={() => handleDelete(cat)}
                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete">
                                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add more card */}
                        <button onClick={() => { setEditing(null); setFormOpen(true); }}
                            className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-[#FF9900]/40 hover:text-[#FF9900] hover:bg-[#FF9900]/5 transition-all duration-300 group min-h-[180px]">
                            <div className="w-12 h-12 bg-gray-100 group-hover:bg-[#FF9900]/10 rounded-xl flex items-center justify-center transition-all">
                                <Plus className="h-5 w-5" strokeWidth={2.5} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Add Category</p>
                        </button>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {formOpen && (
                <CategoryFormModal editing={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={handleSaved} />
            )}

            {/* Delete Confirmation Modal */}
            {categoryToDelete && (
                <DeleteConfirmationModal
                    category={categoryToDelete}
                    onClose={() => setCategoryToDelete(null)}
                    onConfirm={confirmDelete}
                    deleting={deleting}
                />
            )}
        </div>
    );
}
