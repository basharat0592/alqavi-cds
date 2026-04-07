'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, KeyRound,
    Shield, CheckCircle, Save, Loader2, XCircle,
    Building2, MapPin, BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

// -- Shared Utilities --------------------------------
const INPUT = (err?: boolean) =>
    `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-lg text-sm outline-none transition-all
    focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 placeholder:text-gray-400
    ${err ? 'border-red-500' : 'border-slate-200 dark:border-white/10'}`;

const LABEL = 'block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon?: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-[#EEAF1C]" />}
            <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
        </div>
    </div>
);

export default function OnboardSupplier() {
    const router = useRouter();
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirm: '',
        role: '' as number | string,
        business_name: '',
        address: '',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        roleService.getAll().then(data => {
            setRoles(data);
            const supplierRole = data.find(r => r.name.toLowerCase().includes('supplier'));
            if (supplierRole) {
                setForm(p => ({ ...p, role: supplierRole.id }));
            }
        }).catch(() => setRoles([]));
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
        if (!form.business_name.trim()) e.business_name = 'required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Please complete all required fields.');
            return;
        }
        setSaving(true);
        try {
            const payload: any = { ...form };
            await userService.create(payload);
            toast.success('Supplier onboarded successfully.');
            setTimeout(() => router.push('/admin/company/suppliers'), 1500);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to onboard supplier.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto py-12 px-6 font-sans">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#EEAF1C] rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-500/20">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                            Add Supplier
                        </h1>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/admin/company/suppliers')}
                    className="group text-sm text-slate-400 hover:text-[#EEAF1C] flex items-center gap-2 uppercase font-bold tracking-widest transition-all"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <SectionCard>
                    <SectionHeader title="User Details" icon={Shield} />
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1.5">
                                <label className={LABEL}>First Name <span className="text-red-500">*</span></label>
                                <input value={form.first_name} onChange={e => handle('first_name', e.target.value)} className={INPUT(!!errors.first_name)} placeholder="First Name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Last Name <span className="text-red-500">*</span></label>
                                <input value={form.last_name} onChange={e => handle('last_name', e.target.value)} className={INPUT(!!errors.last_name)} placeholder="Last Name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Email <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} className={INPUT(!!errors.email)} placeholder="email@example.com" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input value={form.phone_number} onChange={e => handle('phone_number', e.target.value)} className={INPUT()} placeholder="+92 ..." />
                                </div>
                            </div>
                        </div>

                        <hr className="my-2 border-slate-100 dark:border-white/5" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1.5">
                                <label className={LABEL}>Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input type="password" value={form.password} onChange={e => handle('password', e.target.value)} className={INPUT(!!errors.password)} placeholder="••••••••" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Confirm Password <span className="text-red-500">*</span></label>
                                <input type="password" value={form.password_confirm} onChange={e => handle('password_confirm', e.target.value)} className={INPUT(!!errors.password_confirm)} placeholder="••••••••" />
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <SectionHeader title="Company Details" icon={Building2} />
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1.5">
                                <label className={LABEL}>Company Name <span className="text-red-500">*</span></label>
                                <input value={form.business_name} onChange={e => handle('business_name', e.target.value)} className={INPUT(!!errors.business_name)} placeholder="Company Name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Company Address</label>
                                <div className="relative">
                                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input value={form.address} onChange={e => handle('address', e.target.value)} className={INPUT()} placeholder="HQ Address" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-500/10 flex gap-3 items-center">
                            <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-tight">This user will have supplier level access.</p>
                        </div>
                    </div>
                </SectionCard>

                <div className="flex justify-end gap-4 pb-12">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/company/suppliers')}
                        className="px-8 py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="group px-10 py-3.5 bg-[#EEAF1C] hover:bg-[#ebae1e] border border-[#EEAF1C] rounded-xl text-[11px] font-bold uppercase tracking-widest text-white shadow-xl shadow-yellow-500/20 flex items-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />}
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
}
