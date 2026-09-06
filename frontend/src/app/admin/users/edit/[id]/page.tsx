'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { userService, roleService, AppRole, AppUser } from '@/lib/api';
import {
    User, Mail, Phone, KeyRound,
    Shield, Building2, CheckCircle, XCircle, Save, Loader2, Zap, Calendar, History,
    Eye, EyeOff, Lock, ShieldCheck, MapPin, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Button } from '@/components/admin/ui';
import { getRolePreset } from '@/lib/rolePresets';
import { areaService, Area } from '@/services/area.service';
import { inventoryService } from '@/services/inventory.service';
import { authService } from '@/lib/auth';

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-[#1A1A1A]" />
        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">{title}</span>
    </div>
);

const PAGE_GROUPS = [
    {
        label: 'Main Dashboard',
        items: [
            { name: 'Dashboard', href: '/admin/dashboard' },
            { name: 'Recent Orders', href: '/admin/orders' },
            { name: 'All Sales', href: '/admin/sales' },
            { name: 'Website CMS', href: '/admin/website-settings' },
        ],
    },
    {
        label: 'Inventory & Stock',
        items: [
            { name: 'Live Products', href: '/admin/products' },
            { name: 'Add Listing', href: '/admin/products/add' },
            { name: 'Current Stocks', href: '/admin/inventory/list' },
            { name: 'Warehouses', href: '/admin/inventory/warehouses' },
        ],
    },
    {
        label: 'Procurement',
        items: [
            { name: 'New Purchase', href: '/admin/purchases/add' },
            { name: 'Purchase History', href: '/admin/purchases' },
            { name: 'Returns / Refunds', href: '/admin/purchases/returns' },
        ],
    },
    {
        label: 'Sales Console',
        items: [
            { name: 'Point of Sale', href: '/admin/sale' },
            { name: 'Global Payments', href: '/admin/payments' },
            { name: 'Sale Returns', href: '/admin/sale-returns' },
        ],
    },
    {
        label: 'Security & Logs',
        items: [
            { name: 'Supplier Registry', href: '/admin/company/suppliers' },
            { name: 'Customer Registry', href: '/admin/company/customers' },
            { name: 'Areas', href: '/admin/company/areas' },
            { name: 'Admins', href: '/admin/users' },
            { name: 'Staff Roles', href: '/admin/users/roles' },
            { name: 'System Alerts', href: '/admin/alerts' },
        ],
    },
    {
        label: 'Detailed Reports',
        items: [
            { name: 'Reports Center', href: '/admin/reports' },
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
    const [selectedEditPages, setSelectedEditPages] = useState<string[]>([]);

    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<number[]>([]);

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
    const [canAssignBranch, setCanAssignBranch] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [branchAreaFilter, setBranchAreaFilter] = useState<string>('');

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
                const [r, u, a, w] = await Promise.all([
                    roleService.getAll(),
                    userService.getById(Number(userId)),
                    areaService.getActive().catch(() => [] as Area[]),
                    inventoryService.getWarehouses().catch(() => [] as any[]),
                ]);
                setRoles(r);
                setAreas(a);
                setWarehouses(w);
                const superAdmin = authService.isSuperAdmin();
                setIsSuperAdmin(superAdmin);
                setCanAssignBranch(superAdmin);
                setForm({
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    email: u.email || '',
                    // API returns `phone`; the form/service use phone_number.
                    phone_number: (u as any).phone || (u as any).phone_number || '',
                    role: u.role || '',
                    business_name: u.business_name || '',
                    is_active: u.is_active ?? true,
                });
                setSelectedPages((u as any).page_permissions || []);
                setSelectedEditPages((u as any).page_edit_permissions || []);
                // Loaded user may expose `areas` as array of ids or objects {id,...}
                const rawAreas = (u as any).areas;
                if (Array.isArray(rawAreas)) {
                    setSelectedAreas(
                        rawAreas
                            .map((x: any) => (typeof x === 'object' && x !== null ? x.id : x))
                            .filter((id: any) => id != null)
                            .map((id: any) => Number(id))
                    );
                }
                // Preload assigned branches (array of {id,name,area} or ids).
                const rawWh = (u as any).warehouses;
                if (Array.isArray(rawWh)) {
                    setSelectedWarehouses(
                        rawWh
                            .map((x: any) => (typeof x === 'object' && x !== null ? x.id : x))
                            .filter((id: any) => id != null)
                            .map((id: any) => String(id))
                    );
                }
            } catch (err) {
                showToast('Failed to load user data.', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    // A Super Admin may only assign the "Admin" or "Super Admin" roles. We still
    // keep the user's current role in the list so editing never drops it.
    const ADMIN_ASSIGNABLE_ROLES = ['admin', 'super admin', 'superadmin'];
    const visibleRoles = isSuperAdmin
        ? roles.filter(r => ADMIN_ASSIGNABLE_ROLES.includes(r.name?.trim().toLowerCase() || '') || String(r.id) === String(form.role))
        : roles;

    const selectedRoleName = roles.find(r => String(r.id) === String(form.role))?.name?.toLowerCase() || '';
    const isFullAccess = FULL_ACCESS_ROLES.includes(selectedRoleName);
    const isAreaManager = selectedRoleName === 'area manager';
    const isGlobalRole = ['super admin', 'superadmin'].includes(selectedRoleName);
    const showBranches = canAssignBranch && !!form.role && !isGlobalRole;
    const branchWarehouses = branchAreaFilter
        ? warehouses.filter(w => String((w as any).area ?? '') === branchAreaFilter)
        : warehouses;

    const toggleArea = (id: number) => {
        setSelectedAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    };

    const toggleWarehouse = (id: string) => {
        setSelectedWarehouses(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
    };

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    // View toggle: removing view also removes edit (can't edit a page you can't view).
    const toggleView = (href: string) => {
        setSelectedPages(prev => {
            if (prev.includes(href)) {
                setSelectedEditPages(e => e.filter(h => h !== href));
                return prev.filter(h => h !== href);
            }
            return [...prev, href];
        });
    };

    // Edit toggle: adding edit implies view.
    const toggleEdit = (href: string) => {
        setSelectedEditPages(prev => {
            if (prev.includes(href)) {
                return prev.filter(h => h !== href);
            }
            setSelectedPages(p => (p.includes(href) ? p : [...p, href]));
            return [...prev, href];
        });
    };

    const toggleGroup = (hrefs: string[]) => {
        const allSelected = hrefs.every(h => selectedPages.includes(h));
        if (allSelected) {
            setSelectedPages(prev => prev.filter(h => !hrefs.includes(h)));
            setSelectedEditPages(prev => prev.filter(h => !hrefs.includes(h)));
        } else {
            setSelectedPages(prev => [...new Set([...prev, ...hrefs])]);
        }
    };

    const selectAll = () => setSelectedPages([...ALL_HREFS]);
    const clearAll = () => { setSelectedPages([]); setSelectedEditPages([]); };

    // Switching role re-applies its recommended page access (still editable).
    const handleRoleChange = (roleId: string) => {
        handle('role', roleId);
        const roleName = roles.find(r => String(r.id) === String(roleId))?.name;
        const preset = getRolePreset(roleName);
        if (preset) {
            setSelectedPages([...preset]);
            setSelectedEditPages([...preset]);
        }
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
        // If a new password was typed in the security section, validate it here too
        // so the main Save persists it — users expect one Save to save everything,
        // not a separate "Set New Password" click.
        const wantsPasswordChange = !!(passwordData.new_password || passwordData.confirm_password);
        if (wantsPasswordChange) {
            if (passwordData.new_password.length < 8) {
                showToast('Password must be at least 8 characters.', 'error');
                return;
            }
            if (passwordData.new_password !== passwordData.confirm_password) {
                showToast('Passwords do not match.', 'error');
                return;
            }
        }
        setSaving(true);
        try {
            const payload: any = { ...form };
            if (payload.role === '') delete payload.role;
            payload.page_permissions = isFullAccess ? [] : selectedPages;
            payload.page_edit_permissions = isFullAccess ? [] : selectedEditPages;
            payload.areas = isAreaManager ? selectedAreas : [];
            // Only a Super Admin can (re)assign branches; backend enforces this too.
            if (canAssignBranch) payload.warehouses = isGlobalRole ? [] : selectedWarehouses;
            await userService.update(Number(userId), payload);
            // Apply the password change in the same Save (updates login + stored password).
            if (wantsPasswordChange) {
                await userService.adminResetPassword(Number(userId), passwordData.new_password);
                setPasswordData({ new_password: '', confirm_password: '' });
            }
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
            : 'border-slate-200 focus:border-[#F59E0B] focus:ring-[#F59E0B]/10'
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
                            <select value={form.role} onChange={e => handleRoleChange(e.target.value)}
                                className={inputCls('role')}>
                                <option value="">Select a role</option>
                                {visibleRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            {errors.role && <p className="text-rose-500 text-[10px] font-bold mt-1">{errors.role}</p>}
                        </div>
                        <div className="flex flex-col justify-end">
                            <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/70 rounded-lg">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Account State</span>
                                <button type="button" onClick={() => handle('is_active', !form.is_active)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.is_active ? 'bg-[#F59E0B]' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Organizations — appears right under the role field once an
                        Admin is selected. A branch admin only sees data for the
                        warehouse(s) chosen here. */}
                    {showBranches && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <SectionHeader title="Assigned Organizations" icon={Building2} />
                            <p className="text-xs text-slate-500">
                                This admin has their own fully independent workspace — their own products,
                                stock, customers, sales and payments. Optionally tag the organization warehouse(s)
                                they work in (organizational only); it can be left empty.
                            </p>

                            {/* Step 1 — choose the area (city) to narrow the warehouse list. */}
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                <div className="w-full sm:max-w-xs">
                                    <label className={labelCls}>Select Area</label>
                                    <select
                                        value={branchAreaFilter}
                                        onChange={e => setBranchAreaFilter(e.target.value)}
                                        className={inputCls('branch_area')}
                                    >
                                        <option value="">All areas</option>
                                        {areas.map(a => (
                                            <option key={a.id} value={String(a.id)}>{a.name}{a.code ? ` (${a.code})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                {branchWarehouses.length > 0 && (
                                    <div className="flex gap-2 pb-2.5">
                                        <button type="button"
                                            onClick={() => setSelectedWarehouses(prev => [...new Set([...prev, ...branchWarehouses.map(w => String(w.id))])])}
                                            className="text-[11px] font-semibold text-[#119AB8] hover:underline">
                                            Select all shown
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button type="button"
                                            onClick={() => setSelectedWarehouses(prev => prev.filter(id => !branchWarehouses.some(w => String(w.id) === id)))}
                                            className="text-[11px] font-semibold text-slate-500 hover:underline">
                                            Clear shown
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Step 2 — pick warehouses (multi-select). */}
                            {warehouses.length === 0 ? (
                                <p className="text-[12px] text-slate-400 italic">No warehouses available. Create a warehouse first.</p>
                            ) : branchWarehouses.length === 0 ? (
                                <p className="text-[12px] text-slate-400 italic">No warehouses in this area yet. Tag a warehouse to this area first, or pick "All areas".</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {branchWarehouses.map(w => (
                                        <label key={w.id} className="flex items-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedWarehouses.includes(String(w.id))}
                                                onChange={() => toggleWarehouse(String(w.id))}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#B4780B] focus:ring-[#F59E0B]"
                                            />
                                            <span className="text-[12px] font-medium text-slate-700 truncate">
                                                {w.name}{w.area_name ? ` · ${w.area_name}` : (w.location ? ` · ${w.location}` : '')}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {selectedWarehouses.length === 0 && warehouses.length > 0 && (
                                <p className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                    <Info className="w-3.5 h-3.5 shrink-0" />
                                    Optional — leaving this empty is fine. This admin has their own independent
                                    workspace regardless of organization tagging.
                                </p>
                            )}
                            {selectedWarehouses.length > 0 && (
                                <p className="text-[11px] text-[#1A1A1A] font-medium">
                                    {selectedWarehouses.length} branch{selectedWarehouses.length !== 1 ? 'es' : ''} selected
                                </p>
                            )}
                        </div>
                    )}

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
                                <div className="flex items-center gap-2 px-4 py-3 bg-[#F59E0B]/10 rounded-lg border border-[#F59E0B]/15">
                                    <ShieldCheck className="w-4 h-4 text-[#1A1A1A] flex-shrink-0" />
                                    <p className="text-xs text-[#1A1A1A] font-medium">
                                        This role has full access to all pages — no restrictions apply.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500">Select which pages this user can access after login.</p>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={selectAll}
                                                className="text-[11px] font-semibold text-[#119AB8] hover:underline">
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
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${allChecked ? 'bg-[#F59E0B] border-[#F59E0B]' : someChecked ? 'bg-[#F59E0B]/25 border-[#F59E0B]' : 'border-slate-300 bg-white'}`}>
                                                            {allChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                            {someChecked && !allChecked && <div className="w-2 h-0.5 bg-[#F59E0B] rounded" />}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{group.label}</span>
                                                        <span className="ml-auto text-[10px] text-slate-400">{groupHrefs.filter(h => selectedPages.includes(h)).length}/{groupHrefs.length}</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {group.items.map(item => (
                                                            <div key={item.href} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-50 transition-colors">
                                                                <span className="text-[12px] text-slate-700">{item.name}</span>
                                                                <div className="flex items-center gap-4">
                                                                    <label className="flex items-center gap-1 cursor-pointer select-none">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedPages.includes(item.href)}
                                                                            onChange={() => toggleView(item.href)}
                                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#B4780B] focus:ring-[#F59E0B]"
                                                                        />
                                                                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">View</span>
                                                                    </label>
                                                                    <label className={`flex items-center gap-1 select-none ${selectedPages.includes(item.href) ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedEditPages.includes(item.href)}
                                                                            disabled={!selectedPages.includes(item.href)}
                                                                            onChange={() => toggleEdit(item.href)}
                                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#B4780B] focus:ring-[#F59E0B] disabled:cursor-not-allowed"
                                                                        />
                                                                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Edit</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedPages.length > 0 && (
                                        <p className="text-[11px] text-[#1A1A1A] font-medium">
                                            {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Area Assignment — only for Area Manager role */}
                    {isAreaManager && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <SectionHeader title="Assigned Areas" icon={MapPin} />
                            <p className="text-xs text-slate-500">Select the territories this area manager is responsible for.</p>
                            {areas.length === 0 ? (
                                <p className="text-[12px] text-slate-400 italic">No active areas available. Create areas first.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {areas.map(area => (
                                        <label key={area.id} className="flex items-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedAreas.includes(area.id)}
                                                onChange={() => toggleArea(area.id)}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#B4780B] focus:ring-[#F59E0B]"
                                            />
                                            <span className="text-[12px] font-medium text-slate-700">{area.name}{area.code ? ` (${area.code})` : ''}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {selectedAreas.length > 0 && (
                                <p className="text-[11px] text-[#1A1A1A] font-medium">
                                    {selectedAreas.length} area{selectedAreas.length !== 1 ? 's' : ''} selected
                                </p>
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0E7F98]"
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0E7F98]"
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
