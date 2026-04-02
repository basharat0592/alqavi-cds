'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, KeyRound,
    Shield, CheckCircle, Save, Loader2, XCircle
} from 'lucide-react';

// ─── Shared Utilities (Consistency with Company pages) ────────────────────────────────
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

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
    </div>
);

export default function AddUserPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirm: '',
        role: '' as number | string,
        business_name: '',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        roleService.getAll().then(setRoles).catch(() => setRoles([]));
    }, []);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = 'required';
        if (!form.last_name.trim()) e.last_name = 'required';
        if (!form.email.trim()) e.email = 'required';
        if (!form.password.trim()) e.password = 'required';
        if (form.password !== form.password_confirm) e.password_confirm = 'mismatch';
        if (!form.role) e.role = 'required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload: any = { ...form };
            if (payload.role === '') delete payload.role;
            if (!payload.business_name) delete payload.business_name;
            await userService.create(payload);
            showToast('User created successfully.');
            setTimeout(() => router.push('/admin/users'), 1000);
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data ? JSON.stringify(err.response.data) : 'Failed to save.';
            alert(`Error: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const sellerRoleId = roles.find(r => r.name.toLowerCase() === 'seller')?.id;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-normal text-gray-900 dark:text-white uppercase tracking-tight">
                    Register New User
                </h1>
                <button onClick={() => router.push('/admin/users')} className="text-sm text-gray-400 hover:text-[#F7CA00] hover:underline flex items-center gap-1 uppercase font-bold tracking-tighter">
                    <ArrowLeft className="w-4 h-4" /> Back to list
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <SectionCard>
                    <SectionHeader title="Profile Details" icon={User} />
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>First Name <span className="text-red-700">*</span></label>
                                <input value={form.first_name} onChange={e => handle('first_name', e.target.value)} className={INPUT(!!errors.first_name)} placeholder="First Name" />
                            </div>
                            <div>
                                <label className={LABEL}>Last Name <span className="text-red-700">*</span></label>
                                <input value={form.last_name} onChange={e => handle('last_name', e.target.value)} className={INPUT(!!errors.last_name)} placeholder="Last Name" />
                            </div>
                            <div>
                                <label className={LABEL}>Email Address <span className="text-red-700">*</span></label>
                                <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} className={INPUT(!!errors.email)} placeholder="email@example.com" />
                            </div>
                            <div>
                                <label className={LABEL}>Phone Number</label>
                                <input value={form.phone_number} onChange={e => handle('phone_number', e.target.value)} className={INPUT()} placeholder="+92 ..." />
                            </div>
                            <div>
                                <label className={LABEL}>User Role <span className="text-red-700">*</span></label>
                                <select value={form.role} onChange={e => handle('role', e.target.value)} className={INPUT(!!errors.role)}>
                                    <option value="">Select Role</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            {form.role === sellerRoleId?.toString() && (
                                <div>
                                    <label className={LABEL}>Business Name</label>
                                    <input value={form.business_name} onChange={e => handle('business_name', e.target.value)} className={INPUT()} placeholder="Store/Business Name" />
                                </div>
                            )}
                        </div>

                        <hr className="border-gray-100 dark:border-slate-800" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>Password <span className="text-red-700">*</span></label>
                                <input type="password" value={form.password} onChange={e => handle('password', e.target.value)} className={INPUT(!!errors.password)} placeholder="••••••••" />
                            </div>
                            <div>
                                <label className={LABEL}>Confirm Password <span className="text-red-700">*</span></label>
                                <input type="password" value={form.password_confirm} onChange={e => handle('password_confirm', e.target.value)} className={INPUT(!!errors.password_confirm)} placeholder="••••••••" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50/50 dark:bg-slate-800/50 px-8 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => router.push('/admin/users')}
                            className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-800 rounded text-sm hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-1.5 bg-[#F7CA00] border border-[#a88734] rounded text-sm hover:bg-[#ebae1e] shadow-sm flex items-center gap-2 disabled:opacity-50 font-bold uppercase tracking-widest text-white"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Registration
                        </button>
                    </div>
                </SectionCard>
            </form>

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-green-500 z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}
