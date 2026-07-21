'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { companyService } from '@/lib/api';
import { areaService, Area } from '@/services/area.service';
import { User, MapPin, Save, Loader2, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import CredentialShareModal, { CreatedAccount, buildCreatedAccount } from '@/components/admin/CredentialShareModal';

const LABEL = 'block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest';

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-slate-50/60 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-indigo-600" />}
        <span className="text-sm font-bold text-slate-900 tracking-tight">{title}</span>
    </div>
);

export default function AddCustomerPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState<CreatedAccount | null>(null);
    const [areas, setAreas] = useState<Area[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', phone: '', address: '',
        city: '', country: '', postal_code: '', password: '', password_confirm: '',
        status: 'active', is_active: true, area: '' as number | string,
        avatar: null as File | null,
    });

    useEffect(() => { areaService.getActive().then(setAreas).catch(() => setAreas([])); }, []);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const INPUT = (err?: boolean) => `${ui.inputBase} ${err ? 'border-rose-400' : ''}`;

    const validate = () => {
        const e: Record<string, string> = {};
        // Only the name is truly required. Email is optional for walk-in customers —
        // the backend auto-generates a placeholder when it's blank.
        if (!form.first_name.trim()) e.first_name = 'required';
        if (form.password && form.password !== form.password_confirm) e.password_confirm = 'mismatch';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) { toast.error('Please complete all required fields.'); return; }
        setSaving(true);
        try {
            const password = form.password.trim() || 'Password123';
            const payload: any = {
                first_name: form.first_name, last_name: form.last_name, email: form.email.trim(),
                phone: form.phone, address: form.address, city: form.city, country: form.country,
                postal_code: form.postal_code, password, status: form.status, is_active: form.is_active,
                area: form.area === '' ? null : Number(form.area),
            };
            if (form.avatar) payload.avatar = form.avatar;
            await companyService.createCustomer(payload);
            setCreated(buildCreatedAccount({
                firstName: form.first_name,
                name: `${form.first_name} ${form.last_name}`.trim(),
                email: form.email.trim(),
                password,
            }));
        } catch (err: any) {
            const detail = err.response?.data;
            let msg = 'Failed to register customer';
            if (detail && typeof detail === 'object') {
                const f = Object.keys(detail)[0];
                if (f && Array.isArray(detail[f])) msg = `${f}: ${detail[f][0]}`;
                else if (detail.error) msg = detail.error;
                else if (detail.detail) msg = detail.detail;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto">
            <PageHeader
                title="Add Customer"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Customers', href: '/admin/company/customers' },
                    { label: 'Add Customer' },
                ]}
                actions={<Button variant="outline" onClick={() => router.push('/admin/company/customers')}>Back</Button>}
            />

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Card className="overflow-hidden">
                    <SectionHeader title="Customer Details" icon={User} />
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group hover:border-indigo-400 transition-colors shrink-0">
                                {form.avatar ? (
                                    <>
                                        <img src={URL.createObjectURL(form.avatar)} className="w-full h-full object-cover" alt="" />
                                        <button type="button" onClick={() => handle('avatar', null)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><X size={16} /></button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                                        <Camera className="text-slate-300 group-hover:text-indigo-400" size={18} />
                                        <span className="text-[8px] font-bold uppercase text-slate-400 mt-1">Photo</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handle('avatar', e.target.files?.[0] || null)} />
                                    </label>
                                )}
                            </div>
                            <div className="text-[11px] text-slate-400">Profile photo (optional)</div>
                        </div>
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
                                <label className={LABEL}>Email <span className="text-slate-400 font-normal">(optional)</span></label>
                                <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} className={INPUT(!!errors.email)} placeholder="customer@example.com" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Phone Number</label>
                                <input value={form.phone} onChange={e => handle('phone', e.target.value)} className={INPUT()} placeholder="+92 ..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Account Password</label>
                                <input type="password" value={form.password} onChange={e => handle('password', e.target.value)} className={INPUT()} placeholder="Default: Password123" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Confirm Password</label>
                                <input type="password" value={form.password_confirm} onChange={e => handle('password_confirm', e.target.value)} className={INPUT(!!errors.password_confirm)} placeholder="Re-enter password" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Area / Territory</label>
                                <select value={form.area} onChange={e => handle('area', e.target.value)} className={INPUT() + ' cursor-pointer'}>
                                    <option value="">No area assigned</option>
                                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}{a.code ? ` (${a.code})` : ''}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <SectionHeader title="Address" icon={MapPin} />
                    <div className="p-6 space-y-6">
                        <div className="space-y-1.5">
                            <label className={LABEL}>Permanent Address</label>
                            <input value={form.address} onChange={e => handle('address', e.target.value)} className={INPUT()} placeholder="Street address, apartment, etc." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                            <div className="space-y-1.5">
                                <label className={LABEL}>City</label>
                                <input value={form.city} onChange={e => handle('city', e.target.value)} className={INPUT()} placeholder="City" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Country</label>
                                <input value={form.country} onChange={e => handle('country', e.target.value)} className={INPUT()} placeholder="Country" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Postal Code</label>
                                <input value={form.postal_code} onChange={e => handle('postal_code', e.target.value)} className={INPUT()} placeholder="00000" />
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-4 pb-12">
                    <Button type="button" variant="outline" size="lg" onClick={() => router.push('/admin/company/customers')}>Cancel</Button>
                    <Button type="submit" size="lg" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Confirm
                    </Button>
                </div>
            </form>

            <CredentialShareModal
                created={created}
                subtitle={`Share the login link with ${created?.name || 'the customer'}.`}
                onDone={() => router.push('/admin/company/customers')}
            />
        </div>
    );
}
