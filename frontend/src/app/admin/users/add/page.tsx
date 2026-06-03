'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    User, CheckCircle, Save, Loader2, Eye, EyeOff
} from 'lucide-react';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

// ─── Shared Utilities ────────────────────────────────────────────────────────────────
const INPUT = (err?: boolean) =>
    `${ui.inputBase} ${err ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/10' : ''}`;

const LABEL = 'block text-xs font-bold text-slate-700 mb-1.5';

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-slate-50/60 px-5 py-3 border-b border-slate-100 flex items-center">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-slate-400" />}
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <div className="max-w-4xl mx-auto">
            <PageHeader
                title="Add User"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Users', href: '/admin/users' }, { label: 'Add User' }]}
                actions={
                    <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
                        Back to list
                    </Button>
                }
            />

            <form onSubmit={handleSubmit}>
                <Card className="overflow-hidden">
                    <SectionHeader title="Profile Details" icon={User} />
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>First Name <span className="text-rose-600">*</span></label>
                                <input value={form.first_name} onChange={e => handle('first_name', e.target.value)} className={INPUT(!!errors.first_name)} placeholder="First Name" />
                            </div>
                            <div>
                                <label className={LABEL}>Last Name <span className="text-rose-600">*</span></label>
                                <input value={form.last_name} onChange={e => handle('last_name', e.target.value)} className={INPUT(!!errors.last_name)} placeholder="Last Name" />
                            </div>
                            <div>
                                <label className={LABEL}>Email Address <span className="text-rose-600">*</span></label>
                                <input type="email" value={form.email} onChange={e => handle('email', e.target.value)} className={INPUT(!!errors.email)} placeholder="email@example.com" />
                            </div>
                            <div>
                                <label className={LABEL}>Phone Number</label>
                                <input value={form.phone_number} onChange={e => handle('phone_number', e.target.value)} className={INPUT()} placeholder="+92 ..." />
                            </div>
                            <div>
                                <label className={LABEL}>User Role <span className="text-rose-600">*</span></label>
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

                        <hr className="border-slate-100" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={LABEL}>Password <span className="text-rose-600">*</span></label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={form.password} 
                                        onChange={e => handle('password', e.target.value)} 
                                        className={INPUT(!!errors.password)} 
                                        placeholder="••••••••" 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Confirm Password <span className="text-rose-600">*</span></label>
                                <div className="relative">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        value={form.password_confirm} 
                                        onChange={e => handle('password_confirm', e.target.value)} 
                                        className={INPUT(!!errors.password_confirm)} 
                                        placeholder="••••••••" 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50/60 px-8 py-4 flex justify-end gap-3 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/admin/users')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Registration
                        </Button>
                    </div>
                </Card>
            </form>

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-white text-slate-700 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[240px] border border-slate-200/70 border-l-4 border-l-emerald-500 z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}
        </div>
    );
}

