'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { userService } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, KeyRound, MapPin,
    CheckCircle, XCircle, Save, Loader2, Info, History
} from 'lucide-react';

// ── Components ────────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
            <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
        </div>
        {action}
    </div>
);

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const LABEL = 'block text-xs font-bold text-gray-900 dark:text-gray-200 mb-1';

export default function EditCustomerPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        postal_code: '',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        userService.getById(Number(id))
            .then((data: any) => {
                setForm({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: data.email || '',
                    phone: data.phone || data.phone_number || '',
                    address: data.address || '',
                    city: data.city || '',
                    country: data.country || '',
                    postal_code: data.postal_code || '',
                    is_active: data.is_active !== false,
                });
            })
            .catch(() => showToast('Failed to load profile.', 'error'))
            .finally(() => setLoading(false));
    }, [id]);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = 'Required';
        if (!form.last_name.trim()) e.last_name = 'Required';
        if (!form.email.trim()) e.email = 'Required';
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
            await userService.update(Number(id), {
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                phone: form.phone,
                address: form.address,
                city: form.city,
                country: form.country,
                postal_code: form.postal_code,
            } as any);

            if (form.is_active) await userService.activate(Number(id)).catch(() => { });
            else await userService.deactivate(Number(id)).catch(() => { });

            showToast('Profile updated.', 'success');
            setTimeout(() => router.push('/admin/customers'), 1500);
        } catch (err: any) {
            showToast('Sync failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin" strokeWidth={3} />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 font-sans focus-within:z-10">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-normal text-gray-900 dark:text-white flex items-center gap-3 italic">
                   <User className="w-6 h-6 text-[#FF9900]" /> {form.first_name} {form.last_name}
                </h1>
                <Link href="/admin/customers" className="text-xs font-bold text-gray-400 hover:text-[#C45500] hover:underline flex items-center gap-1 uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4" /> Back to list
                </Link>
            </div>

            <form onSubmit={handleSubmit}>
                <SectionCard>
                    <SectionHeader 
                        title="Update Record" 
                        icon={User} 
                        action={
                            <div className="flex gap-2">
                                <Link href={`/admin/customers/edit/${id}/security`} className="text-[10px] font-bold text-gray-500 hover:text-[#C45500] uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded">
                                    <KeyRound className="w-3 h-3" /> Security
                                </Link>
                                <Link href={`/admin/customers/edit/${id}/logs`} className="text-[10px] font-bold text-gray-500 hover:text-[#C45500] uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded">
                                    <History className="w-3 h-3" /> Logs
                                </Link>
                            </div>
                        }
                    />
                    <div className="p-6 space-y-8">
                        
                        {/* Name Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>First Name <span className="text-red-700">*</span></label>
                                <input type="text" value={form.first_name} onChange={e => handle('first_name', e.target.value)}
                                    className={INPUT(!!errors.first_name)} />
                                {errors.first_name && <p className="text-red-600 text-[10px] font-bold mt-1 uppercase tracking-tighter">{errors.first_name}</p>}
                            </div>
                            <div>
                                <label className={LABEL}>Last Name <span className="text-red-700">*</span></label>
                                <input type="text" value={form.last_name} onChange={e => handle('last_name', e.target.value)}
                                    className={INPUT(!!errors.last_name)} />
                                {errors.last_name && <p className="text-red-600 text-[10px] font-bold mt-1 uppercase tracking-tighter">{errors.last_name}</p>}
                            </div>
                        </div>

                        {/* Contact Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                            <div>
                                <label className={LABEL}>Email Address <span className="text-red-700">*</span></label>
                                <input type="email" value={form.email} onChange={e => handle('email', e.target.value)}
                                    className={INPUT(!!errors.email)} />
                                {errors.email && <p className="text-red-600 text-[10px] font-bold mt-1 uppercase tracking-tighter">{errors.email}</p>}
                            </div>
                            <div>
                                <label className={LABEL}>Phone Number</label>
                                <input type="tel" value={form.phone} onChange={e => handle('phone', e.target.value)}
                                    className={INPUT()} />
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                            <div>
                                <label className={LABEL}>Street Address</label>
                                <input type="text" value={form.address} onChange={e => handle('address', e.target.value)}
                                    className={INPUT()} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={LABEL}>City</label>
                                    <input type="text" value={form.city} onChange={e => handle('city', e.target.value)}
                                        className={INPUT()} />
                                </div>
                                <div>
                                    <label className={LABEL}>Country</label>
                                    <input type="text" value={form.country} onChange={e => handle('country', e.target.value)}
                                        className={INPUT()} />
                                </div>
                                <div>
                                    <label className={LABEL}>Postal Code</label>
                                    <input type="text" value={form.postal_code} onChange={e => handle('postal_code', e.target.value)}
                                        className={INPUT()} />
                                </div>
                            </div>
                        </div>

                        {/* Status Toggle */}
                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                            <label className={LABEL}>Connectivity Status</label>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded border border-gray-100 dark:border-slate-800">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">System Access Enabled</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Toggle login and interaction permissions for this profile record.</p>
                                </div>
                                <button type="button" onClick={() => handle('is_active', !form.is_active)}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${form.is_active ? 'bg-[#FF9900]' : 'bg-gray-300 dark:bg-slate-700'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#f6f6f6] dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-[#ddd] dark:border-slate-800">
                        <Link href="/admin/customers">
                            <button type="button" className="px-4 py-1.5 bg-white dark:bg-slate-700 border border-[#adb1b8] dark:border-slate-600 rounded text-sm hover:bg-gray-100 transition-colors shadow-sm text-gray-700 dark:text-gray-300 font-medium">
                                Cancel
                            </button>
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-1.5 bg-[#f0c14b] border border-[#a88734] rounded text-sm hover:bg-[#ebae1e] shadow-sm flex items-center gap-2 disabled:opacity-50 font-medium text-[#111]"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? 'Syncing...' : 'Save Changes'}
                        </button>
                    </div>
                </SectionCard>
            </form>

            {/* Amazon Style Toast Feedback */}
            {toast && (
                <div className={`fixed bottom-6 right-6 ${toast.type === 'success' ? 'bg-[#131921]' : 'bg-red-900'} text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 ${toast.type === 'success' ? 'border-[#FF9900]' : 'border-red-500'} z-[100] animate-in slide-in-from-bottom-5`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                    <span className="text-sm font-bold uppercase tracking-tight">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}
