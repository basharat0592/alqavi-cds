'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    User, CheckCircle, Save, Loader2, Eye, EyeOff, ShieldCheck, MapPin, ChevronDown, Info, Store,
    Copy, Check, X
} from 'lucide-react';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import { getRolePreset } from '@/lib/rolePresets';
import { areaService, Area } from '@/services/area.service';
import { inventoryService } from '@/services/inventory.service';
import { authService } from '@/lib/auth';

const INPUT = (err?: boolean) =>
    `${ui.inputBase} ${err ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/10' : ''}`;

const LABEL = 'block text-xs font-bold text-slate-700 mb-1.5';

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        {Icon && (
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                <Icon className="w-4 h-4" />
            </span>
        )}
        <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">{title}</span>
    </div>
);

// All admin pages grouped exactly like the sidebar
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
            { name: 'Areas', href: '/admin/company/areas' },
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

// Roles that always get full access (no restriction)
const FULL_ACCESS_ROLES = ['super admin', 'admin', 'superadmin'];

export default function AddUserPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    // After a successful create we surface a shareable login link + credentials.
    const [created, setCreated] = useState<{ name: string; email: string; password: string; loginUrl: string; invite: string } | null>(null);
    const [copied, setCopied] = useState<string>('');

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

    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [selectedEditPages, setSelectedEditPages] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<number[]>([]);

    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
    const [canAssignBranch, setCanAssignBranch] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [branchAreaFilter, setBranchAreaFilter] = useState<string>('');

    useEffect(() => {
        roleService.getAll().then(setRoles).catch(() => setRoles([]));
        areaService.getActive().then(setAreas).catch(() => setAreas([]));
        // Branch assignment is a Super-Admin-only capability. A Super Admin also
        // only ever creates "Admin" users (branch admins); their staff are added
        // by each branch admin within their own branch.
        const superAdmin = authService.isSuperAdmin();
        setIsSuperAdmin(superAdmin);
        setCanAssignBranch(superAdmin);
        inventoryService.getWarehouses().then(setWarehouses).catch(() => setWarehouses([]));
    }, []);

    // For a Super Admin the role is always "Admin" — preselect it once roles load
    // so the admin-specific fields (full access + branch assignment) show right away.
    useEffect(() => {
        if (isSuperAdmin && roles.length && !form.role) {
            const adminRole = roles.find(r => r.name?.trim().toLowerCase() === 'admin');
            if (adminRole) setForm(p => ({ ...p, role: adminRole.id }));
        }
    }, [isSuperAdmin, roles, form.role]);

    // A Super Admin may only assign the "Admin" or "Super Admin" roles. Everyone
    // else sees the full role list. (Branch admins create their own staff.)
    const ADMIN_ASSIGNABLE_ROLES = ['admin', 'super admin', 'superadmin'];
    const visibleRoles = isSuperAdmin
        ? roles.filter(r => ADMIN_ASSIGNABLE_ROLES.includes(r.name?.trim().toLowerCase() || ''))
        : roles;

    const selectedRoleName = roles.find(r => String(r.id) === String(form.role))?.name?.toLowerCase() || '';
    const isFullAccess = FULL_ACCESS_ROLES.includes(selectedRoleName);
    const isAreaManager = selectedRoleName === 'area manager';
    // Super Admin / superadmin roles see every branch, so branch assignment is moot.
    const isGlobalRole = ['super admin', 'superadmin'].includes(selectedRoleName);
    const showBranches = canAssignBranch && !!form.role && !isGlobalRole;
    // Warehouses shown in the picker, narrowed by the chosen area (city).
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

    // Selecting a role auto-fills its recommended page access (still editable).
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

    const copy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(''), 1800);
        } catch {
            showToast('Could not copy — please copy manually.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload: any = { ...form };
            if (payload.role === '') delete payload.role;
            if (!payload.business_name) delete payload.business_name;
            // Full-access roles don't need page_permissions stored
            payload.page_permissions = isFullAccess ? [] : selectedPages;
            payload.page_edit_permissions = isFullAccess ? [] : selectedEditPages;
            payload.areas = isAreaManager ? selectedAreas : [];
            // Only a Super Admin can assign branches; global roles get none (they see all).
            if (canAssignBranch) payload.warehouses = isGlobalRole ? [] : selectedWarehouses;
            await userService.create(payload);
            // Build a shareable login link (email pre-filled) + credentials so the
            // creator can hand the new admin everything they need to sign in.
            const email = form.email.trim();
            const password = form.password;
            const name = `${form.first_name} ${form.last_name}`.trim();
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const loginUrl = `${origin}/login?email=${encodeURIComponent(email)}`;
            const invite =
                `Hi ${form.first_name || 'there'}, your Al-Qavi Hub account is ready.\n\n` +
                `Login link: ${loginUrl}\n` +
                `Email: ${email}\n` +
                `Password: ${password}\n\n` +
                `Open the link and sign in.`;
            setCreated({ name, email, password, loginUrl, invite });
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
        <div className="max-w-5xl mx-auto">
            <PageHeader
                title={isSuperAdmin ? 'Add New Admin' : 'Add User'}
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Users', href: '/admin/users' }, { label: isSuperAdmin ? 'Add New Admin' : 'Add User' }]}
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
                                <div className="relative">
                                    <select value={form.role} onChange={e => handleRoleChange(e.target.value)} className={`${INPUT(!!errors.role)} appearance-none pr-10 cursor-pointer`}>
                                        <option value="">Select Role</option>
                                        {visibleRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                {getRolePreset(selectedRoleName) && (
                                    <p className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium mt-2 bg-indigo-50/60 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        Page access pre-filled for this role — adjust below if needed.
                                    </p>
                                )}
                            </div>
                            {form.role === sellerRoleId?.toString() && (
                                <div>
                                    <label className={LABEL}>Business Name</label>
                                    <input value={form.business_name} onChange={e => handle('business_name', e.target.value)} className={INPUT()} placeholder="Store/Business Name" />
                                </div>
                            )}

                            {/* Assigned Branches — appears right under the role field once an
                                Admin is selected. A branch admin only sees data for the
                                warehouse(s) chosen here. */}
                            {showBranches && (
                                <div className="md:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-5">
                                    <div className="flex items-center gap-2">
                                        <Store className="w-4 h-4 text-indigo-600 shrink-0" />
                                        <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Assigned Branches</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Pick an area, then choose the branch warehouse(s) this admin manages.
                                        They will only see sales, purchases, inventory and payments for these branches.
                                    </p>

                                    {/* Step 1 — choose the area (city) to narrow the warehouse list. */}
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                        <div className="w-full sm:max-w-xs">
                                            <label className={LABEL}>Select Area</label>
                                            <div className="relative">
                                                <select
                                                    value={branchAreaFilter}
                                                    onChange={e => setBranchAreaFilter(e.target.value)}
                                                    className={`${INPUT()} appearance-none pr-10 cursor-pointer`}
                                                >
                                                    <option value="">All areas</option>
                                                    {areas.map(a => (
                                                        <option key={a.id} value={String(a.id)}>{a.name}{a.code ? ` (${a.code})` : ''}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>
                                        {branchWarehouses.length > 0 && (
                                            <div className="flex gap-2 pb-0.5">
                                                <button type="button"
                                                    onClick={() => setSelectedWarehouses(prev => [...new Set([...prev, ...branchWarehouses.map(w => String(w.id))])])}
                                                    className="text-[11px] font-semibold text-indigo-600 hover:underline">
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
                                                <label key={w.id} className="flex items-center gap-3 px-4 py-2.5 border border-slate-200 rounded-xl cursor-pointer bg-white/60 hover:bg-white transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedWarehouses.includes(String(w.id))}
                                                        onChange={() => toggleWarehouse(String(w.id))}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-[12px] font-medium text-slate-700 truncate">
                                                        {w.name}{w.area_name ? ` · ${w.area_name}` : (w.location ? ` · ${w.location}` : '')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    {selectedWarehouses.length === 0 && warehouses.length > 0 && (
                                        <p className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1.5">
                                            <Info className="w-3.5 h-3.5 shrink-0" />
                                            No branch selected — this user will not see any data until a branch is assigned.
                                        </p>
                                    )}
                                    {selectedWarehouses.length > 0 && (
                                        <p className="text-[11px] text-indigo-600 font-medium">
                                            {selectedWarehouses.length} branch{selectedWarehouses.length !== 1 ? 'es' : ''} selected
                                        </p>
                                    )}
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

                    {/* Page Access Section — shown only when a non-full-access role is selected */}
                    {form.role && !isFullAccess && (
                        <>
                            <SectionHeader title="Page Access" icon={ShieldCheck} />
                            <div className="p-6 space-y-5">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {PAGE_GROUPS.map(group => {
                                        const groupHrefs = group.items.map(i => i.href);
                                        const allChecked = groupHrefs.every(h => selectedPages.includes(h));
                                        const someChecked = groupHrefs.some(h => selectedPages.includes(h));
                                        return (
                                            <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                                                {/* Group header with select-all toggle */}
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
                                                {/* Individual items */}
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
                                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">View</span>
                                                                </label>
                                                                <label className={`flex items-center gap-1 select-none ${selectedPages.includes(item.href) ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedEditPages.includes(item.href)}
                                                                        disabled={!selectedPages.includes(item.href)}
                                                                        onChange={() => toggleEdit(item.href)}
                                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
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
                                    <p className="text-[11px] text-indigo-600 font-medium">
                                        {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {form.role && isFullAccess && (
                        <div className="px-6 pb-4">
                            <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                <p className="text-xs text-indigo-700 font-medium">
                                    This role has full access to all pages — no restrictions apply.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Area Assignment — only for Area Manager role */}
                    {isAreaManager && (
                        <>
                            <SectionHeader title="Assigned Areas" icon={MapPin} />
                            <div className="p-6 space-y-4">
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
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-[12px] font-medium text-slate-700">{area.name}{area.code ? ` (${area.code})` : ''}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {selectedAreas.length > 0 && (
                                    <p className="text-[11px] text-indigo-600 font-medium">
                                        {selectedAreas.length} area{selectedAreas.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        </>
                    )}

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

            {toast && (
                <div className="fixed bottom-6 right-6 bg-white text-slate-700 px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[240px] border border-slate-200/70 border-l-4 border-l-emerald-500 z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}

            {/* Success — shareable login link + credentials for the new account. */}
            {created && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
                        <div className="bg-emerald-50/60 px-5 py-4 border-b border-emerald-100 flex items-center gap-3">
                            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 shrink-0"><CheckCircle className="w-5 h-5" /></span>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Account created</h3>
                                <p className="text-[11px] text-slate-500 truncate">Share the login link below with {created.name || 'the new user'}.</p>
                            </div>
                            <button type="button" onClick={() => { setCreated(null); router.push('/admin/users'); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"><X size={16} /></button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Login link</label>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={created.loginUrl}
                                        onFocus={e => e.currentTarget.select()}
                                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[12px] text-slate-700 outline-none focus:border-indigo-400"
                                    />
                                    <button type="button" onClick={() => copy('link', created.loginUrl)} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shrink-0">
                                        {copied === 'link' ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                                    <p className="text-[12px] font-bold text-slate-800 truncate">{created.email}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</p>
                                    <p className="text-[12px] font-bold text-slate-800 font-mono truncate">{created.password}</p>
                                </div>
                            </div>

                            <button type="button" onClick={() => copy('invite', created.invite)} className="w-full h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-[12px] font-bold inline-flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                                {copied === 'invite' ? <><Check className="w-4 h-4" /> Copied invite message</> : <><Copy className="w-4 h-4" /> Copy invite (link + credentials)</>}
                            </button>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                The user opens the link with their email pre-filled — they just enter the password above to sign in.
                            </p>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex justify-end">
                            <Button variant="primary" onClick={() => { setCreated(null); router.push('/admin/users'); }}>
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
