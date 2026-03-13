'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { userService } from '@/lib/api';
import {
    ArrowLeft, KeyRound, Save, Loader2, CheckCircle, XCircle, Shield, AlertTriangle, Info
} from 'lucide-react';

// ── Components ────────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-[#FF9900]" />}
        <span className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-widest">{title}</span>
    </div>
);

export default function CustomerSecurityPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customer, setCustomer] = useState<any>(null);
    const [form, setForm] = useState({
        old_password: '',
        new_password: '',
        new_password_confirm: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!id) return;
        userService.getById(Number(id))
            .then(setCustomer)
            .catch(() => showToast('Failed to load customer details', 'error'))
            .finally(() => setLoading(false));
    }, [id]);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.old_password) e.old_password = 'Required';
        if (!form.new_password) e.new_password = 'Required';
        else if (form.new_password.length < 8) e.new_password = 'Min. 8 characters';
        if (form.new_password !== form.new_password_confirm) e.new_password_confirm = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await userService.changePassword(Number(id), {
                old_password: form.old_password,
                new_password: form.new_password,
                new_password_confirm: form.new_password_confirm
            });
            showToast('Password updated successfully', 'success');
            setForm({ old_password: '', new_password: '', new_password_confirm: '' });
        } catch (err: any) {
            showToast(err?.response?.data?.error || err?.response?.data?.detail || 'Update failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = (field: string) =>
        `w-full px-4 py-2.5 bg-white dark:bg-slate-800 border rounded-lg text-sm font-medium text-gray-900 dark:text-white outline-none transition-all placeholder:text-gray-400 focus:border-[#FF9900] ${errors[field]
            ? 'border-red-300 ring-4 ring-red-50'
            : 'border-gray-200 dark:border-slate-700'
        }`;

    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1";

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-[#FF9900] animate-spin" />
        </div>
    );

    return (
        <div className="max-w-[1000px] mx-auto space-y-6 pb-12 font-sans px-4 sm:px-6 mt-6">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-10 right-10 z-[200] animate-in slide-in-from-bottom-5">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-l-4 border-l-[#FF9900]">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-white" /> : <XCircle className="h-4 w-4 text-white" />}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href={`/admin/customers/edit/${id}`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#FF9900] transition-colors w-fit">
                    <ArrowLeft className="h-3 w-3" strokeWidth={3} />
                    Back to Profile
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3 italic">
                    <Shield className="w-6 h-6 text-[#FF9900]" />
                    Update Login Credentials
                </h1>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-9">
                    Modifying security axis for {customer?.first_name} {customer?.last_name}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Rules Side */}
                <div className="space-y-6">
                    <SectionCard className="p-6 bg-gray-50 dark:bg-slate-900/50">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-4">Password Requirements</h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">At least 8 characters in length</span>
                            </li>
                            <li className="flex gap-3">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Mix of letters, numbers, and symbols recommended</span>
                            </li>
                            <li className="flex gap-3">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">Must match confirmation field exactly</span>
                            </li>
                        </ul>
                    </SectionCard>

                    <SectionCard className="p-6 border-amber-200 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/20">
                        <div className="flex gap-4">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900 dark:text-amber-400 mb-1">Session Termination</h4>
                                <p className="text-[10px] text-amber-700 dark:text-amber-500/80 font-medium leading-relaxed">
                                    Updating the password will immediately log the user out of all active devices and sessions for security reasons.
                                </p>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Form Side */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <SectionCard>
                            <SectionHeader title="Authentication Details" icon={KeyRound} />
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className={labelCls}>Current System Password</label>
                                    <input
                                        type="password"
                                        placeholder="Enter existing password"
                                        className={inputCls('old_password')}
                                        value={form.old_password}
                                        onChange={e => setForm({ ...form, old_password: e.target.value })}
                                    />
                                    {errors.old_password && <p className="text-[10px] font-bold text-red-500 mt-2">{errors.old_password}</p>}
                                </div>

                                <div className="h-px bg-gray-100 dark:bg-slate-800" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelCls}>New Password</label>
                                        <input
                                            type="password"
                                            placeholder="Min. 8 chars"
                                            className={inputCls('new_password')}
                                            value={form.new_password}
                                            onChange={e => setForm({ ...form, new_password: e.target.value })}
                                        />
                                        {errors.new_password && <p className="text-[10px] font-bold text-red-500 mt-2">{errors.new_password}</p>}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Confirm New Password</label>
                                        <input
                                            type="password"
                                            placeholder="Repeat password"
                                            className={inputCls('new_password_confirm')}
                                            value={form.new_password_confirm}
                                            onChange={e => setForm({ ...form, new_password_confirm: e.target.value })}
                                        />
                                        {errors.new_password_confirm && <p className="text-[10px] font-bold text-red-500 mt-2">{errors.new_password_confirm}</p>}
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-10 py-3 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin text-[#131921]" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Updating...' : 'Save New Credentials'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
