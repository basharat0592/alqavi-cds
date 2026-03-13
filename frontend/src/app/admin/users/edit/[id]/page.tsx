'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { userService, roleService, AppRole, AppUser } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, KeyRound,
    Shield, Building2, CheckCircle, XCircle, Save, Loader2, Zap, Calendar, History
} from 'lucide-react';

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        role: '' as number | string,
        business_name: '',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const [r, u] = await Promise.all([
                    roleService.getAll(),
                    userService.getById(Number(userId))
                ]);
                setRoles(r);
                setForm({
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    email: u.email || '',
                    phone_number: u.phone_number || '',
                    role: u.role || '',
                    business_name: u.business_name || '',
                    is_active: u.is_active ?? true,
                });
            } catch (err) {
                showToast('Failed to load user data.', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = 'First name is required';
        if (!form.last_name.trim()) e.last_name = 'Last name is required';
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
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
            const payload: any = { ...form };
            if (payload.role === '') delete payload.role;
            await userService.update(Number(userId), payload);
            showToast('Identity updated successfully!', 'success');
            setTimeout(() => router.push('/admin/users'), 1500);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to update user.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const sellerRoleId = roles.find(r => r.name.toLowerCase() === 'seller')?.id;

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 flex-col gap-4">
            <Loader2 className="h-10 w-10 text-[#FF9900] animate-spin" />
            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest italic animate-pulse">Retrieving Profile...</p>
        </div>
    );

    const inputCls = (field: string) =>
        `w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border rounded text-sm font-medium text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-slate-900 ${errors[field]
            ? 'border-red-300 focus:border-red-400'
            : 'border-gray-200 dark:border-slate-700 focus:border-[#FF9900]'
        }`;

    const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-1.5";

    return (
        <div className="max-w-[800px] mx-auto pb-12 font-sans px-4 mt-8">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-5 py-4 rounded shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <p className="text-gray-900 dark:text-white text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <Link href="/admin/users" className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-gray-400 hover:text-[#FF9900] transition-all shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Edit Identity profile</h1>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Modify platform identity settings</p>
                </div>
            </div>

            {/* Single Card Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Basic Info Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.first_name} onChange={e => handle('first_name', e.target.value)}
                                className={inputCls('first_name')} placeholder="Name" />
                            {errors.first_name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.last_name} onChange={e => handle('last_name', e.target.value)}
                                className={inputCls('last_name')} placeholder="Surname" />
                            {errors.last_name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.last_name}</p>}
                        </div>
                    </div>

                    {/* Contact & Role Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
                            <input type="email" value={form.email} onChange={e => handle('email', e.target.value)}
                                className={inputCls('email')} placeholder="Email address" />
                            {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Phone Number</label>
                            <input type="tel" value={form.phone_number} onChange={e => handle('phone_number', e.target.value)}
                                className={inputCls('phone_number')} placeholder="Mobile number" />
                        </div>
                    </div>

                    {/* Role & Status Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>User Role</label>
                            <select value={form.role} onChange={e => handle('role', e.target.value)}
                                className={inputCls('role')}>
                                <option value="">Select a role</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            {errors.role && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.role}</p>}
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest pl-2">Account State</span>
                                <button type="button" onClick={() => handle('is_active', !form.is_active)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.is_active ? 'bg-[#FF9900]' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Business Name (Conditional) */}
                    {form.role === sellerRoleId?.toString() && (
                        <div>
                            <label className={labelCls}>Business Association</label>
                            <input type="text" value={form.business_name} onChange={e => handle('business_name', e.target.value)}
                                className={inputCls('business_name')} placeholder="Company / Shop Name" />
                        </div>
                    )}

                    {/* Profile Information Note */}
                    <hr className="border-gray-100 dark:border-slate-800" />
                    <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 text-gray-400 dark:text-slate-500">
                            <KeyRound className="h-4 w-4" />
                            <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">Identity credentials and password updates are managed via standard security protocols.</p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/users" className="px-6 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        Abort
                    </Link>
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-8 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-bold text-[10px] uppercase tracking-widest rounded transition-all shadow-sm disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'UPDATING...' : 'COMMIT PROFILE'}
                    </button>
                </div>
            </form>
        </div>
    );
}
