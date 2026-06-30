'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { userService, roleService, AppRole, AppUser } from '@/lib/api';
import {
    User, Mail, Phone, KeyRound,
    Shield, Building2, CheckCircle, XCircle, Save, Loader2, Zap, Calendar, History,
    Eye, EyeOff, Lock, ShieldCheck
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Button } from '@/components/admin/ui';

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-indigo-600" />
        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{title}</span>
    </div>
);

const PAGE_GROUPS = [
    {
        label: 'Main Dashboard',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard' },
            { name: 'Recent Activity', href: '/admin/sales/recent' },
            { name: 'Order List', href: '/admin/orders' },
            { name: 'All Sales', href: '/admin/sales' },
            { name: 'Order Tracking', href: '/admin/tracking' },
            { name: 'Website CMS', href: '/admin/website-settings' },
        ],
    },
    {
        label: 'Inventory & Stock',
        items: [
            { name: 'Product Categories', href: '/admin/products/categories' },
            { name: 'Product List', href: '/admin/products' },
            { name: 'Add Product', href: '/admin/products/add' },
            { name: 'Product Sections', href: '/admin/products/sections' },
            { name: 'Current Stocks', href: '/admin/inventory/list' },
            { name: 'Warehouses', href: '/admin/inventory/warehouses' },
        ],
    },
    {
        label: 'Procurement',
        items: [
            { name: 'New Purchase', href: '/admin/purchases/add' },
            { name: 'Purchase History', href: '/admin/purchases' },
            { name: 'Supplier Catalog', href: '/admin/supplier-products' },
            { name: 'Returns / Refunds', href: '/admin/purchases/returns' },
        ],
    },
    {
        label: 'Sales Console',
        items: [
            { name: 'Point of Sale', href: '/admin/sale' },
            { name: 'Invoices', href: '/admin/invoices' },
            { name: 'Global Payments', href: '/admin/payments' },
            { name: 'Company Categories', href: '/admin/company/categories' },
            { name: 'Sale Returns', href: '/admin/sale-returns' },
        ],
    },
    {
        label: 'Security & Logs',
        items: [
            { name: 'Supplier Registry', href: '/admin/company/suppliers' },
            { name: 'Customer Registry', href: '/admin/company/customers' },
            { name: 'Internal Users', href: '/admin/users' },
            { name: 'Staff Roles', href: '/admin/users/roles' },
            { name: 'Permissions', href: '/admin/users/permissions' },
            { name: 'System Alerts', href: '/admin/alerts' },
        ],
    },
    {
        label: 'Detailed Reports',
        items: [
            { name: 'Reports Center', href: '/admin/reports' },
            { name: 'Sales Reports', href: '/admin/reports/sales' },
            { name: 'Purchase Reports', href: '/admin/reports/purchases' },
            { name: 'Inventory Reports', href: '/admin/reports/inventory' },
            { name: 'Customer Reports', href: '/admin/reports/customers' },
            { name: 'Accounting Reports', href: '/admin/reports/accounting' },
            { name: 'Returns Reports', href: '/admin/reports/sales-returns' },
            { name: 'Data Hub', href: '/admin/reports/data-hub' },
        ],
    },
    {
        label: 'System',
        items: [
            { name: 'System Settings', href: '/admin/settings' },
        ],
    },
];

const ALL_HREFS = PAGE_GROUPS.flatMap(g => g.items.map(i => i.href));
const FULL_ACCESS_ROLES = ['super admin', 'admin', 'superadmin'];

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        role: '' as number | string,
        business_name: '',
        is_active: true,
    });

    const [selectedPages, setSelectedPages] = useState<string[]>([]);

    const [passwordData, setPasswordData] = useState({
        new_password: '',
        confirm_password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const [r, u] = await Promise.all([
                    roleService.getAll(),
                    userService.getById(Number(userId))
                ]);
                setRoles(r);
                setForm({
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    email: u.email || '',
                    phone_number: u.phone_number || '',
                    role: u.role || '',
                    business_name: u.business_name || '',
                    is_active: u.is_active ?? true,
                });
                setSelectedPages((u as any).page_permissions || []);
            } catch (err) {
                showToast('Failed to load user data.', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const selectedRoleName = roles.find(r => String(r.id) === String(form.role))?.name?.toLowerCase() || '';
    const isFullAccess = FULL_ACCESS_ROLES.includes(selectedRoleName);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const togglePage = (href: string) => {
        setSelectedPages(prev =>
            prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
        );
    };

    const toggleGroup = (hrefs: string[]) => {
        const allSelected = hrefs.every(h => selectedPages.includes(h));
        if (allSelected) {
            setSelectedPages(prev => prev.filter(h => !hrefs.includes(h)));
        } else {
            setSelectedPages(prev => [...new Set([...prev, ...hrefs])]);
        }
    };

    const selectAll = () => setSelectedPages([...ALL_HREFS]);
    const clearAll = () => setSelectedPages([]);

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
            const payload: any = { ...form };
            if (payload.role === '') delete payload.role;
            payload.page_permissions = isFullAccess ? [] : selectedPages;
            await userService.update(Number(userId), payload);
            showToast('Identity updated successfully!', 'success');
            setTimeout(() => router.push('/admin/users'), 1500);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to update user.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!passwordData.new_password || passwordData.new_password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        setUpdatingPassword(true);
        try {
            await userService.adminResetPassword(Number(userId), passwordData.new_password);
            showToast('Password updated successfully!', 'success');
            setPasswordData({ new_password: '', confirm_password: '' });
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'Failed to update password.', 'error');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const sellerRoleId = roles.find(r => r.name.toLowerCase() === 'seller')?.id;

    if (loading) return <PageLoader />;

    const inputCls = (field: string) =>
        `w-full px-4 py-2 bg-white border rounded-lg text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 ${errors[field]
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10'
            : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/10'
        }`;

    const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5";

    return (
        <div className="max-w-[800px] mx-auto pb-12 font-sans px-4 mt-8">

            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-white border border-slate-200/70 px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white" /> : <XCircle className="h-5 w-5 text-white" />}
                        </div>
                        <p className="text-slate-900 text-sm font-bold">{toast.msg}</p>
                    </div>
                </div>
            )}

            <PageHeader
                title="Edit User"
                subtitle="Modify platform identity settings"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Users', href: '/admin/users' }, { label: 'Edit User' }]}
            />

            <form onSubmit={handleSubmit} className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="p-8 space-y-8">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>First Name <span className="text-rose-500">*</span></label>
                            <input type="text" value={form.first_name} onChange={e => handle('first_name', e.target.value)}
                                className={inputCls('first_name')} placeholder="Name" />
                            {errors.first_name && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Last Name <span className="text-rose-500">*</span></label>
                            <input type="text" value={form.last_name} onChange={e => handle('last_name', e.target.value)}
                                className={inputCls('last_name')} placeholder="Surname" />
                            {errors.last_name && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.last_name}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Email Address <span className="text-rose-500">*</span></label>
                            <input type="email" value={form.email} onChange={e => handle('email', e.target.value)}
                                className={inputCls('email')} placeholder="Email address" />
                            {errors.email && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Phone Number</label>
                            <input type="tel" value={form.phone_number} onChange={e => handle('phone_number', e.target.value)}
                                className={inputCls('phone_number')} placeholder="Mobile number" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>User Role</label>
                            <select value={form.role} onChange={e => handle('role', e.target.value)}
                                className={inputCls('role')}>
                                <option value="">Select a role</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            {errors.role && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.role}</p>}
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/70 rounded-lg">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Account State</span>
                                <button type="button" onClick={() => handle('is_active', !form.is_active)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {form.role === sellerRoleId?.toString() && (
                        <div>
                            <label className={labelCls}>Business Association</label>
                            <input type="text" value={form.business_name} onChange={e => handle('business_name', e.target.value)}
                                className={inputCls('business_name')} placeholder="Company / Shop Name" />
                        </div>
                    )}

                    {/* Page Access Section */}
                    {form.role && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <SectionHeader title="Page Access" icon={ShieldCheck} />

                            {isFullAccess ? (
                                <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                    <p className="text-xs text-indigo-700 font-medium">
                                        This role has full access to all pages — no restrictions apply.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500">Select which pages this user can access after login.</p>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={selectAll}
                                                className="text-[11px] font-semibold text-indigo-600 hover:underline">
                                                Select All
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button type="button" onClick={clearAll}
                                                className="text-[11px] font-semibold text-slate-500 hover:underline">
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {PAGE_GROUPS.map(group => {
                                            const groupHrefs = group.items.map(i => i.href);
                                            const allChecked = groupHrefs.every(h => selectedPages.includes(h));
                                            const someChecked = groupHrefs.some(h => selectedPages.includes(h));
                                            return (
                                                <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                                                    <div
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none"
                                                        onClick={() => toggleGroup(groupHrefs)}
                                                    >
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${allChecked ? 'bg-indigo-600 border-indigo-600' : someChecked ? 'bg-indigo-200 border-indigo-400' : 'border-slate-300 bg-white'}`}>
                                                            {allChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                            {someChecked && !allChecked && <div className="w-2 h-0.5 bg-indigo-600 rounded" />}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{group.label}</span>
                                                        <span className="ml-auto text-[10px] text-slate-400">{groupHrefs.filter(h => selectedPages.includes(h)).length}/{groupHrefs.length}</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {group.items.map(item => (
                                                            <label key={item.href} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPages.includes(item.href)}
                                                                    onChange={() => togglePage(item.href)}
                                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="text-[12px] text-slate-700">{item.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedPages.length > 0 && (
                                        <p className="text-[11px] text-indigo-600 font-medium">
                                            {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Password Reset */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <SectionHeader title="Account Security" icon={Shield} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200/70">
                            <div>
                                <label className={labelCls}>Update Master Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                                        className={inputCls('new_password')}
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Confirm New Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={passwordData.confirm_password}
                                        onChange={e => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                                        className={inputCls('confirm_password')}
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="sm:col-span-2 flex justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handlePasswordReset}
                                    disabled={updatingPassword || !passwordData.new_password}
                                    className="font-bold text-[10px] uppercase tracking-widest"
                                >
                                    {updatingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                                    {updatingPassword ? 'Updating...' : 'Set New Password'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/70">
                        <div className="flex items-center gap-3 text-slate-400">
                            <Lock className="h-4 w-4" />
                            <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed font-mono">
                                SECURITY_PROTOCOL_ALPHA: Identity credentials and master access tokens must be handled over secure encrypted channels only.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-200/70 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/users">
                        <Button type="button" variant="outline" size="sm" className="font-bold text-[10px] uppercase tracking-widest">
                            Abort
                        </Button>
                    </Link>
                    <Button type="submit" variant="primary" size="sm" disabled={saving}
                        className="font-bold text-[10px] uppercase tracking-widest">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'UPDATING...' : 'COMMIT PROFILE'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
