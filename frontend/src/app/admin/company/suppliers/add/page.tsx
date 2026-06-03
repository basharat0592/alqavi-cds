'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    Mail, Phone, KeyRound,
    Shield, Save, Loader2,
    Building2, MapPin, BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button } from '@/components/admin/ui';

// -- Shared Utilities --------------------------------
const INPUT = (err?: boolean) =>
    `w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-slate-800 outline-none transition-all
    focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400
    ${err ? 'border-rose-400' : 'border-slate-200'}`;

const LABEL = 'block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest';

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon?: any; subtitle?: string }) => (
    <div className="bg-slate-50/60 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-indigo-600" />}
            <div>
                <span className="text-sm font-bold text-slate-900 tracking-tight">{title}</span>
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
        <div className="max-w-[1000px] mx-auto">
            <PageHeader
                title="Add Supplier"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Suppliers', href: '/admin/company/suppliers' },
                    { label: 'Add Supplier' },
                ]}
                actions={
                    <Button variant="outline" onClick={() => router.push('/admin/company/suppliers')}>
                        Back
                    </Button>
                }
            />

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Card className="overflow-hidden">
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

                        <hr className="my-2 border-slate-100" />

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
                </Card>

                <Card className="overflow-hidden">
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
                        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 flex gap-3 items-center">
                            <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                            <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-tight">This user will have supplier level access.</p>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-4 pb-12">
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => router.push('/admin/company/suppliers')}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        size="lg"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </Button>
                </div>
            </form>
        </div>
    );
}
