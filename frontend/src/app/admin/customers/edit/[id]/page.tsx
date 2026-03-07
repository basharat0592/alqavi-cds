'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { userService } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, KeyRound, MapPin,
    CheckCircle, XCircle, Save, Loader2
} from 'lucide-react';

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

    /* ── Load customer data ── */
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
            .catch(() => showToast('Failed to load customer data.', 'error'))
            .finally(() => setLoading(false));
    }, [id]);

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

            // Sync active/inactive status
            if (form.is_active) {
                await userService.activate(Number(id)).catch(() => { });
            } else {
                await userService.deactivate(Number(id)).catch(() => { });
            }

            showToast('Customer updated successfully!', 'success');
            setTimeout(() => router.push('/admin/customers'), 1500);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || 'Failed to update customer.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = (field: string) =>
        `w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 outline-none transition-all focus:bg-white focus:ring-2 ${errors[field]
            ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
            : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'
        }`;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading customer...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/15 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-50/40 blur-[100px]" />
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <p className="text-gray-900 text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/customers">
                    <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#FF9900] hover:bg-[#FF9900]/10 hover:border-[#FF9900]/30 transition-all shadow-sm">
                        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                </Link>
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Edit Customer</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Update customer information — ID #{id}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Main Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Basic Information */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF9900]/5 rounded-full blur-[60px] pointer-events-none" />
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-[#FF9900]/10 rounded-xl flex items-center justify-center">
                                <User className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Basic Information</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">First Name <span className="text-red-500">*</span></label>
                                <input type="text" value={form.first_name} onChange={e => handle('first_name', e.target.value)}
                                    className={inputCls('first_name')} placeholder="John" />
                                {errors.first_name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.first_name}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Last Name <span className="text-red-500">*</span></label>
                                <input type="text" value={form.last_name} onChange={e => handle('last_name', e.target.value)}
                                    className={inputCls('last_name')} placeholder="Doe" />
                                {errors.last_name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.last_name}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                <Mail className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Contact Information</h2>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Email Address <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="email" value={form.email} onChange={e => handle('email', e.target.value)}
                                        className={`${inputCls('email')} pl-10`} placeholder="john@example.com" />
                                </div>
                                {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="tel" value={form.phone} onChange={e => handle('phone', e.target.value)}
                                        className={`${inputCls('phone')} pl-10`} placeholder="+92 300 1234567" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-purple-500" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Address Information</h2>
                        </div>

                        <div className="mb-5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Street Address</label>
                            <input type="text" value={form.address} onChange={e => handle('address', e.target.value)}
                                className={inputCls('address')} placeholder="123 Main St" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">City</label>
                                <input type="text" value={form.city} onChange={e => handle('city', e.target.value)}
                                    className={inputCls('city')} placeholder="Karachi" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Country</label>
                                <input type="text" value={form.country} onChange={e => handle('country', e.target.value)}
                                    className={inputCls('country')} placeholder="Pakistan" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Postal Code</label>
                                <input type="text" value={form.postal_code} onChange={e => handle('postal_code', e.target.value)}
                                    className={inputCls('postal_code')} placeholder="75500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions & Status */}
                <div className="space-y-6">

                    {/* Actions */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                        <button type="submit" disabled={saving}
                            className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-[#FF9900] to-[#e68a00] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(255,153,0,0.3)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:transform-none mb-3">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                            {saving ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                        <Link href="/admin/customers">
                            <button type="button" className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                        </Link>
                    </div>

                    {/* Account Status */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Account Status</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-black text-gray-900">
                                    {form.is_active ? 'Active' : 'Inactive'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    {form.is_active ? 'Customer can log in' : 'Login is blocked'}
                                </p>
                            </div>
                            <button type="button" onClick={() => handle('is_active', !form.is_active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${form.is_active ? 'bg-[#FF9900]' : 'bg-gray-300'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Customer ID Card */}
                    <div className="bg-[#131921] rounded-2xl p-6 shadow-md">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Customer Preview</p>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-[#131921] font-black text-lg">
                                    {(form.first_name[0] || '?').toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-black text-sm truncate">
                                    {form.first_name || form.last_name
                                        ? `${form.first_name} ${form.last_name}`.trim()
                                        : 'Customer Name'}
                                </p>
                                <p className="text-white/50 text-xs font-medium truncate mt-0.5">
                                    {form.email || 'email@example.com'}
                                </p>
                                {form.city && (
                                    <p className="text-[#FF9900] text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                        📍 {form.city}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
