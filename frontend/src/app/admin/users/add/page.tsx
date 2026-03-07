'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    ArrowLeft, User, Mail, Phone, KeyRound,
    Shield, Building2, CheckCircle, XCircle, Save, Loader2
} from 'lucide-react';

export default function AddUserPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
        if (!form.first_name.trim()) e.first_name = 'First name is required';
        if (!form.last_name.trim()) e.last_name = 'Last name is required';
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
        if (!form.password.trim()) e.password = 'Password is required';
        else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
        if (form.password !== form.password_confirm) e.password_confirm = 'Passwords do not match';
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
            if (!payload.business_name) delete payload.business_name;
            await userService.create(payload);
            showToast('User created successfully!', 'success');
            setTimeout(() => router.push('/admin/users'), 1500);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || err?.response?.data?.password?.[0] || 'Failed to create user.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const sellerRoleId = roles.find(r => r.name.toLowerCase() === 'seller')?.id;

    const inputCls = (field: string) =>
        `w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 outline-none transition-all focus:bg-white focus:ring-2 ${errors[field]
            ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
            : 'border-gray-200 focus:ring-[#FF9900]/20 focus:border-[#FF9900]'
        }`;

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/15/30 blur-[120px]" />
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
                <Link href="/admin/users">
                    <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#FF9900] hover:bg-[#FF9900]/10 hover:border-[#FF9900]/30 transition-all shadow-sm">
                        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                </Link>
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Add New User</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Create a new user account</p>
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
                                    <input type="tel" value={form.phone_number} onChange={e => handle('phone_number', e.target.value)}
                                        className={`${inputCls('phone_number')} pl-10`} placeholder="+92 300 1234567" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-7 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                                <KeyRound className="h-4 w-4 text-orange-500" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Security</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Password <span className="text-red-500">*</span></label>
                                <input type="password" value={form.password} onChange={e => handle('password', e.target.value)}
                                    className={inputCls('password')} placeholder="Min. 8 characters" />
                                {errors.password && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                                <input type="password" value={form.password_confirm} onChange={e => handle('password_confirm', e.target.value)}
                                    className={inputCls('password_confirm')} placeholder="Repeat password" />
                                {errors.password_confirm && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.password_confirm}</p>}
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium mt-4 bg-gray-50 rounded-xl px-4 py-3">
                            🔒 Password must be at least 8 characters for security.
                        </p>
                    </div>
                </div>

                {/* Right: Role & Status */}
                <div className="space-y-6">

                    {/* Actions */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                        <button type="submit" disabled={saving}
                            className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-[#FF9900] to-[#e68a00] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(0,113,133,0.3)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:transform-none mb-3">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                            {saving ? 'Creating User...' : 'Create User'}
                        </button>
                        <Link href="/admin/users">
                            <button type="button" className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                        </Link>
                    </div>

                    {/* User Role */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                                <Shield className="h-4 w-4 text-purple-500" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">User Role</h2>
                        </div>
                        <div className="space-y-2">
                            {roles.length > 0 ? roles.map(role => (
                                <button key={role.id} type="button" onClick={() => handle('role', role.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-black transition-all duration-200 ${form.role === role.id
                                        ? 'border-[#FF9900] bg-[#FF9900]/5 text-[#FF9900]'
                                        : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50'
                                        }`}>
                                    {role.name}
                                    {form.role === role.id && <CheckCircle className="h-4 w-4" strokeWidth={2.5} />}
                                </button>
                            )) : (
                                <p className="text-xs text-gray-400 font-medium text-center py-4">No roles found in system.</p>
                            )}
                        </div>
                    </div>

                    {/* Business Name (Seller only) */}
                    {form.role === sellerRoleId && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-blue-500" strokeWidth={2.5} />
                                </div>
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Business</h2>
                            </div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Business Name</label>
                            <input type="text" value={form.business_name} onChange={e => handle('business_name', e.target.value)}
                                className={inputCls('business_name')} placeholder="Your business name" />
                        </div>
                    )}

                    {/* Account Status */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-black text-gray-900">Account Status</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                    {form.is_active ? 'Active — user can log in' : 'Inactive — login blocked'}
                                </p>
                            </div>
                            <button type="button" onClick={() => handle('is_active', !form.is_active)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${form.is_active ? 'bg-[#FF9900]' : 'bg-gray-300'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
