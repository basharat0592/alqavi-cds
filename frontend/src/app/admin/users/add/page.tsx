'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userService, roleService, AppRole } from '@/lib/api';
import {
    User, CheckCircle, Save, Loader2, Eye, EyeOff, ShieldCheck, MapPin
} from 'lucide-react';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import { getRolePreset } from '@/lib/rolePresets';
import { areaService, Area } from '@/services/area.service';

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

    useEffect(() => {
        roleService.getAll().then(setRoles).catch(() => setRoles([]));
        areaService.getActive().then(setAreas).catch(() => setAreas([]));
    }, []);

    const selectedRoleName = roles.find(r => String(r.id) === String(form.role))?.name?.toLowerCase() || '';
    const isFullAccess = FULL_ACCESS_ROLES.includes(selectedRoleName);
    const isAreaManager = selectedRoleName === 'area manager';

    const toggleArea = (id: number) => {
        setSelectedAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
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
                                <select value={form.role} onChange={e => handleRoleChange(e.target.value)} className={INPUT(!!errors.role)}>
                                    <option value="">Select Role</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                {getRolePreset(selectedRoleName) && (
                                    <p className="text-[11px] text-indigo-600 font-medium mt-1.5">Page access pre-filled for this role — adjust below if needed.</p>
                                )}
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
        </div>
    );
}
