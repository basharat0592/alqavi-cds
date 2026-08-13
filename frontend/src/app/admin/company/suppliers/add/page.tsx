'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import {
    Mail, Phone, Shield, Save, Loader2, Building2, MapPin, Camera, X, BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import CredentialShareModal, { CreatedAccount, buildCreatedAccount } from '@/components/admin/CredentialShareModal';

const LABEL = 'block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest';

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-slate-50/60 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-[#0E8CA8]" />}
        <span className="text-sm font-bold text-slate-900 tracking-tight">{title}</span>
    </div>
);

// Same fields as the front-page supplier signup (register/supplier).
export default function OnboardSupplier() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState<CreatedAccount | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        password_confirm: '',
        avatar: null as File | null,
    });

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const INPUT = (err?: boolean) => `${ui.inputBase} ${err ? 'border-rose-400' : ''}`;

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = 'required';
        if (!form.company.trim()) e.company = 'required';
        if (!form.phone.trim()) e.phone = 'required';
        if (!form.email.trim()) e.email = 'required';
        if (!form.password.trim()) e.password = 'required';
        if (form.password !== form.password_confirm) e.password_confirm = 'mismatch';
        if (!form.address.trim()) e.address = 'required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) { toast.error('Please complete all required fields.'); return; }
        setSaving(true);
        try {
            await authService.registerSupplier({
                first_name: form.first_name,
                last_name: form.last_name,
                company: form.company,
                username: form.email.split('@')[0],
                email: form.email,
                phone: form.phone,
                address: form.address,
                password: form.password,
                password_confirm: form.password,
                avatar: form.avatar,
            });
            setCreated(buildCreatedAccount({
                firstName: form.first_name,
                name: `${form.first_name} ${form.last_name}`.trim(),
                email: form.email.trim(),
                password: form.password,
            }));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to onboard supplier.');
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
                actions={<Button variant="outline" onClick={() => router.push('/admin/company/suppliers')}>Back</Button>}
            />

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Card className="overflow-hidden">
                    <SectionHeader title="User Details" icon={Shield} />
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row gap-6">
                            {/* Avatar */}
                            <div className="shrink-0">
                                <div className="relative w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group hover:border-[#13B0D1] transition-colors">
                                    {form.avatar ? (
                                        <>
                                            <img src={URL.createObjectURL(form.avatar)} className="w-full h-full object-cover" alt="" />
                                            <button type="button" onClick={() => handle('avatar', null)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><X size={16} /></button>
                                        </>
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                                            <Camera className="text-slate-300 group-hover:text-[#22C3E0]" size={20} />
                                            <span className="text-[9px] font-bold uppercase text-slate-400 mt-1.5">Upload</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={e => handle('avatar', e.target.files?.[0] || null)} />
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-1.5">
                                    <label className={LABEL}>First Name <span className="text-red-500">*</span></label>
                                    <input value={form.first_name} onChange={e => handle('first_name', e.target.value)} className={INPUT(!!errors.first_name)} placeholder="First Name" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Last Name</label>
                                    <input value={form.last_name} onChange={e => handle('last_name', e.target.value)} className={INPUT()} placeholder="Last Name" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Email <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} className={INPUT(!!errors.email)} placeholder="office@email.com" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Phone / WhatsApp <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input value={form.phone} onChange={e => handle('phone', e.target.value)} className={INPUT(!!errors.phone)} placeholder="03XX XXXXXXX" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="my-2 border-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-1.5">
                                <label className={LABEL}>Password <span className="text-red-500">*</span></label>
                                <input type="password" value={form.password} onChange={e => handle('password', e.target.value)} className={INPUT(!!errors.password)} placeholder="••••••••" />
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
                                <input value={form.company} onChange={e => handle('company', e.target.value)} className={INPUT(!!errors.company)} placeholder="Company Name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Address <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input value={form.address} onChange={e => handle('address', e.target.value)} className={INPUT(!!errors.address)} placeholder="Warehouse / HQ address" />
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
                    <Button type="button" variant="outline" size="lg" onClick={() => router.push('/admin/company/suppliers')}>Cancel</Button>
                    <Button type="submit" size="lg" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Confirm
                    </Button>
                </div>
            </form>

            <CredentialShareModal
                created={created}
                subtitle={`Share the login link with ${created?.name || 'the supplier'}.`}
                onDone={() => router.push('/admin/company/suppliers')}
            />
        </div>
    );
}
