'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { categoryService } from '@/lib/api';
import {
    Save, Loader2, CheckCircle, XCircle, Type, Link as LinkIcon, FolderTree, Activity
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button } from '@/components/admin/ui';

// ─── Shared Utilities ─────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3.5 py-2.5 bg-white border rounded-lg text-[13.5px] text-slate-800 outline-none transition-all
    focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400
    ${err
        ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10 text-rose-600'
        : 'border-slate-200 text-slate-800'}`;

const LABEL = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2';

export default function EditProductCategoryPage() {
    const router = useRouter();
    const params = useParams();
    const categoryId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        status: 'active' as 'active' | 'inactive',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const data = await categoryService.getAll();
                const cat = data.find(c => String(c.id) === categoryId);
                if (cat) {
                    setForm({
                        name: cat.name || '',
                        slug: cat.slug || '',
                        description: cat.description || '',
                        status: cat.status as any || 'active',
                    });
                }
            } catch (err) {
                showToast('Failed to load category logic.', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [categoryId]);

    const handle = (k: string, v: any) => {
        if (k === 'name' && !form.slug) {
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
            await categoryService.update(categoryId, {
                ...form,
                status: form.status.toUpperCase() as 'ACTIVE' | 'INACTIVE',
            });
            showToast('Logic configuration updated successfully!', 'success');
            setTimeout(() => router.push('/admin/products/categories'), 1500);
        } catch (err: any) {
            showToast('Failed to commit updates.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1000px] mx-auto pb-24">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-12 right-12 z-[200] animate-in slide-in-from-right-10 duration-500">
                    <div className="bg-white border border-slate-200/70 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.12)] flex items-center gap-4 min-w-[320px]">
                        <div className={`w-10 h-10 ${toast.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'} rounded-xl flex items-center justify-center`}>
                            {toast.type === 'success'
                                ? <CheckCircle className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
                                : <XCircle className="h-5 w-5 text-rose-500" strokeWidth={2.5} />
                            }
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">System Alert</p>
                            <p className="text-sm font-bold text-slate-900 tracking-tight leading-none">{toast.msg}</p>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Edit Category"
                subtitle={form.name || undefined}
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Categories', href: '/admin/products/categories' },
                    { label: 'Edit Category' },
                ]}
                actions={
                    <Button variant="outline" onClick={() => router.push('/admin/products/categories')}>
                        Cancel
                    </Button>
                }
            />

            {/* ── Form Controls ── */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-8 space-y-8">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <FolderTree className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 tracking-tight">Category Details</h3>
                                <p className="text-[13px] text-slate-500 mt-0.5">Basic information for this category</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={LABEL}>Name <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" value={form.name} onChange={e => handle('name', e.target.value)}
                                        className={INPUT(!!errors.name) + ' pl-10'} placeholder="e.g. Skin Care" />
                                </div>
                                {errors.name && <p className="text-rose-500 text-[11px] font-semibold mt-1.5">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className={LABEL}>Slug</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" value={form.slug} onChange={e => handle('slug', e.target.value.toLowerCase().replace(/ /g, '-'))}
                                        className={INPUT() + ' pl-10 font-mono lowercase'} placeholder="skin-care" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={LABEL}>Description</label>
                            <textarea value={form.description} onChange={e => handle('description', e.target.value)}
                                rows={5} className={INPUT() + ' resize-none min-h-[150px]'} placeholder="Describe this category..." />
                        </div>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="p-8 space-y-8">
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Activity className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">Status</h3>
                        </div>

                        <div className="space-y-3">
                            {(['active', 'inactive'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => handle('status', s)}
                                    className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all ${form.status === s
                                        ? 'bg-indigo-600 border-transparent text-white shadow-sm shadow-indigo-600/20'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-slate-700'
                                    }`}
                                >
                                    <span className="text-[12px] font-bold uppercase tracking-wider">{s === 'active' ? 'Active' : 'Inactive'}</span>
                                    <div className={`w-2 h-2 rounded-full ${form.status === s ? 'bg-white' : 'bg-slate-300'}`} />
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <p className="text-[12px] text-slate-500 leading-relaxed">
                                Changing the status may affect the visibility of products assigned to this category.
                            </p>
                        </div>
                    </Card>

                    <Button type="submit" size="lg" disabled={saving} className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

            </form>
        </div>
    );
}
