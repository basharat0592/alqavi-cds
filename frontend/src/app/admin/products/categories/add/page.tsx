'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { categoryService } from '@/lib/api';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import {
    Save, Loader2, CheckCircle, XCircle, Grid, Type, Link as LinkIcon, Activity
} from 'lucide-react';

// ─── Shared Utilities ─────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `${ui.inputBase} ${err ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10 text-rose-600' : ''}`;

const LABEL = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';

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
        if (!form.name.trim()) e.name = 'Category name is required';
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
            await categoryService.create({
                ...form,
                status: form.status.toUpperCase() as 'ACTIVE' | 'INACTIVE',
            });
            showToast('Category created successfully!', 'success');
            setTimeout(() => router.push('/admin/products/categories'), 1500);
        } catch (err: any) {
            showToast('Failed to create category.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto pb-12">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-right-10 duration-500">
                    <div className="bg-white border border-slate-200/70 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.12)] flex items-center gap-4 min-w-[320px]">
                        <div className={`w-10 h-10 ${toast.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'} rounded-xl flex items-center justify-center`}>
                            {toast.type === 'success'
                                ? <CheckCircle className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
                                : <XCircle className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
                            }
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Notification</p>
                            <p className="text-sm font-bold text-slate-900 tracking-tight leading-snug">{toast.msg}</p>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Add Category"
                subtitle="Create a new product category"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Categories', href: '/admin/products/categories' },
                    { label: 'Add Category' },
                ]}
                actions={
                    <>
                        <Button variant="outline" onClick={() => router.push('/admin/products/categories')}>
                            Cancel
                        </Button>
                        <Button type="submit" form="add-category-form" disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                            {saving ? 'Saving...' : 'Save Category'}
                        </Button>
                    </>
                }
            />

            {/* ── Form Controls ── */}
            <form id="add-category-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-8 space-y-8">
                        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Grid className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Primary Details</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Core category information</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>Category Name <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" value={form.name} onChange={e => handle('name', e.target.value)}
                                        className={INPUT(!!errors.name) + ' pl-10'} placeholder="e.g. Skin Care" autoFocus />
                                </div>
                                {errors.name && <p className="text-rose-500 text-xs font-medium mt-1.5">{errors.name}</p>}
                            </div>
                            <div>
                                <label className={LABEL}>Slug (System Identifier)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" value={form.slug} onChange={e => handle('slug', e.target.value.toLowerCase().replace(/ /g, '-'))}
                                        className={INPUT() + ' pl-10 font-mono'} placeholder="skin-care" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={LABEL}>Description</label>
                            <textarea value={form.description} onChange={e => handle('description', e.target.value)}
                                rows={5} className={INPUT() + ' h-auto py-3 resize-none min-h-[140px]'} placeholder="Describe the scope of this category..." />
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Activity className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Status</h3>
                        </div>

                        <div className="space-y-3">
                            {(['active', 'inactive'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => handle('status', s)}
                                    className={`w-full p-3.5 rounded-xl flex items-center justify-between border transition-all ${form.status === s
                                        ? 'bg-indigo-600 border-transparent text-white shadow-sm shadow-indigo-600/20 ring-4 ring-indigo-500/10'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-slate-700'
                                    }`}
                                >
                                    <span className="text-[13px] font-semibold">{s === 'active' ? 'Active' : 'Inactive'}</span>
                                    <div className={`w-2 h-2 rounded-full ${form.status === s ? 'bg-white' : 'bg-slate-300'}`} />
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Changing the status will propagate downstream to all linked sub-categories and products.
                            </p>
                        </div>
                    </Card>

                    <Button type="submit" form="add-category-form" disabled={saving} size="lg" className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                        {saving ? 'Saving...' : 'Save Category'}
                    </Button>
                </div>

            </form>
        </div>
    );
}
