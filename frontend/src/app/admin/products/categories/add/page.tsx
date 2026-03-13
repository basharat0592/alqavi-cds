'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { categoryService } from '@/lib/api';
import {
    ArrowLeft, FolderTree, Save, Loader2, CheckCircle, XCircle, Grid, Type, Link as LinkIcon, Layers, Activity
} from 'lucide-react';

// ─── Shared Utilities ─────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-5 py-3.5 bg-white/60 border rounded-2xl text-sm font-medium outline-none transition-all
    focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300
    ${err
        ? 'border-rose-300 ring-rose-200 text-rose-600'
        : 'border-slate-200/60 text-slate-900'}`;

const LABEL = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`admin-card border-white/60 shadow-xl shadow-slate-200/50 overflow-hidden ${className}`}>
        {children}
    </div>
);

export default function AddProductCategoryPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        status: 'active' as 'active' | 'inactive',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handle = (k: string, v: any) => {
        if (k === 'name') {
            const slug = v.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            setForm(p => ({ ...p, [k]: v, slug }));
        } else {
            setForm(p => ({ ...p, [k]: v }));
        }
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Classification label is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await categoryService.create(form);
            showToast('Classification logic established successfully!', 'success');
            setTimeout(() => router.push('/admin/products/categories'), 1500);
        } catch (err: any) {
            showToast('Failed to establish classification.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto pb-24 font-sans px-8 mt-12 relative z-0">

            {/* Premium Toast */}
            {toast && (
                <div className="fixed bottom-12 right-12 z-[200] animate-in slide-in-from-right-10 duration-500">
                    <div className="glass-effect px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-4 min-w-[320px] border-white/60">
                        <div className={`w-10 h-10 ${toast.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'} rounded-2xl flex items-center justify-center`}>
                            {toast.type === 'success' 
                                ? <CheckCircle className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
                                : <XCircle className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
                            }
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[.2em] mb-0.5">System Alert</p>
                            <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{toast.msg}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── GLASS HEADER ── */}
            <div className="glass-effect p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 border-white/60">
                <div className="flex items-center gap-6">
                    <Link href="/admin/products/categories" className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-100 transition-all shadow-sm">
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">New Logic Node</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em] mt-1.5 opacity-80">Category Initialization • Taxonomic Protocol</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/admin/products/categories" className="px-8 py-4 text-slate-400 text-xs font-bold uppercase tracking-[.2em] hover:text-slate-900 transition-colors">
                        Abort Mission
                    </Link>
                </div>
            </div>

            {/* ── Form Controls ── */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 space-y-8">
                    <SectionCard className="p-10 space-y-10">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                                <Grid className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Primary Parameters</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core Identity Configuration</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className={LABEL}>CLASSIFICATION LABEL <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <Type className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input type="text" value={form.name} onChange={e => handle('name', e.target.value)}
                                        className={INPUT(!!errors.name) + ' pl-12'} placeholder="e.g. Skin Care" autoFocus />
                                </div>
                                {errors.name && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1 uppercase tracking-widest">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>SYSTEM IDENTIFIER (SLUG)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input type="text" value={form.slug} onChange={e => handle('slug', e.target.value.toLowerCase().replace(/ /g, '-'))}
                                        className={INPUT() + ' pl-12 font-mono lower-case'} placeholder="skin-care" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={LABEL}>OPERATIONAL SCOPE / DESCRIPTION</label>
                            <textarea value={form.description} onChange={e => handle('description', e.target.value)}
                                rows={5} className={INPUT() + ' resize-none min-h-[150px]'} placeholder="Define the logical boundaries for this primary category classification..." />
                        </div>
                    </SectionCard>
                </div>

                <div className="space-y-8">
                    <SectionCard className="p-8 space-y-8">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Activity className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[.2em]">Deployment State</h3>
                        </div>

                        <div className="space-y-4">
                            {(['active', 'inactive'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => handle('status', s)}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${form.status === s
                                        ? 'bg-indigo-500 border-transparent text-white shadow-xl shadow-indigo-100 ring-4 ring-indigo-500/10'
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-slate-600'
                                    }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-[.2em]">{s === 'active' ? 'Operational' : 'Halted'}</span>
                                    <div className={`w-2 h-2 rounded-full ${form.status === s ? 'bg-white text-indigo-500' : 'bg-slate-200'}`} />
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed italic">
                                Changing the status will propagate downstream to all linked sub-classifications and products.
                            </p>
                        </div>
                    </SectionCard>

                    <button type="submit" disabled={saving}
                        className="w-full py-6 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-[.3em] rounded-[2rem] shadow-2xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4">
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" strokeWidth={2.5} />}
                        {saving ? 'Synchronizing...' : 'Execute Node'}
                    </button>
                </div>

            </form>
        </div>
    );
}
