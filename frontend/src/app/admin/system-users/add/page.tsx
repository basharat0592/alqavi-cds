"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, RefreshCw, Eye, EyeOff, ShieldCheck, LayoutGrid } from 'lucide-react';
import { userService, roleService, AppRole } from '@/lib/api';
import { authService } from '@/lib/auth';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import { ADMIN_PAGE_GROUPS, SUPER_ONLY_HREFS } from '@/lib/adminPages';
import { getRolePreset } from '@/lib/rolePresets';
import CredentialShareModal, { buildCreatedAccount, CreatedAccount } from '@/components/admin/CredentialShareModal';
import toast from 'react-hot-toast';

const FULL_ACCESS = ['admin', 'super admin', 'superadmin'];

// Pages a branch admin can grant to their staff (excludes Super-Admin-only pages
// and the System Users page itself, which is for branch admins).
const PAGE_GROUPS = ADMIN_PAGE_GROUPS
    .map(g => ({ label: g.group, items: g.items.filter(i => !SUPER_ONLY_HREFS.includes(i.h) && i.h !== '/admin/system-users').map(i => ({ name: i.n, href: i.h })) }))
    .filter(g => g.items.length > 0);
const ALL_HREFS = PAGE_GROUPS.flatMap(g => g.items.map(i => i.href));

export default function AddSystemUserPage() {
    const router = useRouter();

    // Organization admins only (not the Super Admin, not restricted staff).
    const [allowed, setAllowed] = useState<boolean | null>(null);
    useEffect(() => {
        const u: any = authService.getUser();
        const role = (typeof u?.role === 'string' ? u.role : u?.role_name || '').toLowerCase();
        setAllowed(!authService.isSuperAdmin() && role === 'admin');
    }, []);

    const [roles, setRoles] = useState<AppRole[]>([]);
    useEffect(() => { roleService.getAll().then(r => setRoles(Array.isArray(r) ? r : [])).catch(() => setRoles([])); }, []);
    // A branch admin may NOT mint a Super Admin (cross-tenant operator).
    const assignableRoles = roles.filter(r => !['super admin', 'superadmin'].includes((r.name || '').trim().toLowerCase()));

    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', role: '' as number | string });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [created, setCreated] = useState<CreatedAccount | null>(null);

    // Page access — view (open the page) + edit (act on it). Edit implies view.
    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [selectedEditPages, setSelectedEditPages] = useState<string[]>([]);

    const toggleView = (href: string) => {
        setSelectedPages(prev => {
            if (prev.includes(href)) {
                setSelectedEditPages(e => e.filter(h => h !== href));
                return prev.filter(h => h !== href);
            }
            return [...prev, href];
        });
    };
    const toggleEdit = (href: string) => {
        setSelectedEditPages(prev => {
            if (prev.includes(href)) return prev.filter(h => h !== href);
            setSelectedPages(p => (p.includes(href) ? p : [...p, href]));
            return [...prev, href];
        });
    };
    const toggleGroup = (hrefs: string[]) => {
        const all = hrefs.every(h => selectedPages.includes(h));
        if (all) {
            setSelectedPages(prev => prev.filter(h => !hrefs.includes(h)));
            setSelectedEditPages(prev => prev.filter(h => !hrefs.includes(h)));
        } else {
            setSelectedPages(prev => [...new Set([...prev, ...hrefs])]);
        }
    };
    const selectAll = () => { setSelectedPages([...ALL_HREFS]); setSelectedEditPages([...ALL_HREFS]); };
    const clearAll = () => { setSelectedPages([]); setSelectedEditPages([]); };

    const selectedRoleName = (roles.find(r => String(r.id) === String(form.role))?.name || '').trim().toLowerCase();
    const isFullAccess = FULL_ACCESS.includes(selectedRoleName);

    // When a role is picked, pre-fill its recommended pages (view + edit, editable).
    useEffect(() => {
        if (!form.role) return;
        const rn = roles.find(r => String(r.id) === String(form.role))?.name;
        const preset = getRolePreset(rn);
        if (preset) {
            const p = preset.filter(h => ALL_HREFS.includes(h));
            setSelectedPages(p);
            setSelectedEditPages(p);
        }
    }, [form.role, roles]);

    const handle = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: '' })); };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = 'Required';
        if (!form.email.trim()) e.email = 'Required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
        if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
        if (!form.role) e.role = 'Pick a role';
        else if (!isFullAccess && selectedPages.length === 0) e.pages = 'Give the user View access to at least one page';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const submit = async (ev?: React.FormEvent) => {
        ev?.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await userService.create({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password,
                password_confirm: form.password,
                role: Number(form.role),
                // Full-access role -> no restriction; otherwise lock to the picked pages.
                page_permissions: isFullAccess ? [] : selectedPages,
                page_edit_permissions: isFullAccess ? [] : selectedEditPages,
            } as any);
            setCreated(buildCreatedAccount({
                firstName: form.first_name.trim(),
                name: `${form.first_name} ${form.last_name}`.trim(),
                email: form.email.trim(),
                password: form.password,
            }));
            toast.success('System user created');
        } catch (err: any) {
            const d = err?.response?.data;
            let msg = 'Failed to create user';
            if (d && typeof d === 'object') {
                const k = Object.keys(d)[0];
                if (k && Array.isArray(d[k])) msg = `${k}: ${d[k][0]}`;
                else if (d.detail) msg = d.detail;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (allowed === null) return null;
    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-bold text-slate-900">Organization admins only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Only a organization admin can add system users to their workspace.</p>
            </div>
        );
    }

    const inputCls = (err?: boolean) => `${ui.inputBase} ${err ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/10' : ''}`;
    const LABEL = 'block text-[13px] font-semibold text-slate-700 mb-1.5';

    return (
        <div className="pb-12 text-left text-slate-800">
            <div className="max-w-[980px] mx-auto">
                <PageHeader
                    title="Add System User"
                    subtitle="Create a staff user in your own workspace"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'System Users', href: '/admin/system-users' }, { label: 'Add User' }]}
                />

                <Card className="overflow-hidden">
                    <form onSubmit={submit}>
                        {/* ── Identity ── */}
                        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                            <h2 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Account details</h2>
                            <p className="text-[12px] text-slate-500 mt-0.5">This user belongs to <span className="font-semibold text-slate-700">your workspace only</span> — other admins can't see them.</p>
                        </div>

                        <div className="p-6 sm:p-8 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={LABEL}>First Name <span className="text-rose-600">*</span></label>
                                    <input className={inputCls(!!errors.first_name)} value={form.first_name} onChange={e => handle('first_name', e.target.value)} placeholder="John" autoFocus />
                                    {errors.first_name && <p className="text-[11px] text-rose-600 mt-1">{errors.first_name}</p>}
                                </div>
                                <div>
                                    <label className={LABEL}>Last Name</label>
                                    <input className={inputCls()} value={form.last_name} onChange={e => handle('last_name', e.target.value)} placeholder="Doe" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={LABEL}>Email <span className="text-rose-600">*</span></label>
                                    <input className={inputCls(!!errors.email)} value={form.email} onChange={e => handle('email', e.target.value)} placeholder="john@example.com" />
                                    {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className={LABEL}>Phone</label>
                                    <input className={inputCls()} value={form.phone} onChange={e => handle('phone', e.target.value)} placeholder="+92 ..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={LABEL}>Password <span className="text-rose-600">*</span></label>
                                    <div className="relative">
                                        <input type={showPw ? 'text' : 'password'} className={inputCls(!!errors.password) + ' pr-10'} value={form.password} onChange={e => handle('password', e.target.value)} placeholder="Min 8 characters" />
                                        <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-[11px] text-rose-600 mt-1">{errors.password}</p>}
                                </div>
                                <div>
                                    <label className={LABEL}>Role <span className="text-rose-600">*</span></label>
                                    <select className={inputCls(!!errors.role) + ' cursor-pointer'} value={form.role} onChange={e => handle('role', e.target.value)}>
                                        <option value="">— Select a role —</option>
                                        {assignableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    {errors.role && <p className="text-[11px] text-rose-600 mt-1">{errors.role}</p>}
                                </div>
                            </div>
                        </div>

                        {/* ── Page Access ── */}
                        <div className="px-6 sm:px-8 py-5 border-y border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#B4780B] border border-[#F59E0B]/15"><LayoutGrid size={16} /></span>
                                <div>
                                    <h2 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Page Access</h2>
                                    <p className="text-[12px] text-slate-500">Choose which pages this user can <b>View</b> and which they can also <b>Edit</b>.</p>
                                </div>
                            </div>
                            {!isFullAccess && (
                                <div className="flex gap-2 text-[11px] font-semibold">
                                    <button type="button" onClick={selectAll} className="text-[#B4780B] hover:underline">Select all</button>
                                    <span className="text-slate-300">|</span>
                                    <button type="button" onClick={clearAll} className="text-slate-500 hover:underline">Clear</button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 sm:p-8">
                            {errors.pages && <p className="text-[11px] text-rose-600 mb-3">{errors.pages}</p>}
                            {isFullAccess ? (
                                <p className="text-[12px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                                    The <b>{selectedRoleName === 'admin' ? 'Admin' : 'selected'}</b> role has full access to every page — no need to pick.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {PAGE_GROUPS.map(group => {
                                        const hrefs = group.items.map(i => i.href);
                                        const allChecked = hrefs.every(h => selectedPages.includes(h));
                                        const someChecked = hrefs.some(h => selectedPages.includes(h));
                                        return (
                                            <div key={group.label} className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none" onClick={() => toggleGroup(hrefs)}>
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${allChecked ? 'bg-[#F59E0B] border-[#F59E0B]' : someChecked ? 'bg-[#F59E0B]/25 border-[#F59E0B]' : 'border-slate-300 bg-white'}`}>
                                                        {allChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                        {someChecked && !allChecked && <div className="w-2 h-0.5 bg-[#F59E0B] rounded" />}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{group.label}</span>
                                                    <span className="ml-auto text-[10px] text-slate-400">{hrefs.filter(h => selectedPages.includes(h)).length}/{hrefs.length}</span>
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {group.items.map(item => (
                                                        <div key={item.href} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-50 transition-colors">
                                                            <span className="text-[12px] text-slate-700">{item.name}</span>
                                                            <div className="flex items-center gap-4">
                                                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                                                    <input type="checkbox" checked={selectedPages.includes(item.href)} onChange={() => toggleView(item.href)} className="w-3.5 h-3.5 rounded border-slate-300 text-[#B4780B] focus:ring-[#F59E0B]" />
                                                                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">View</span>
                                                                </label>
                                                                <label className={`flex items-center gap-1 select-none ${selectedPages.includes(item.href) ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                                                                    <input type="checkbox" checked={selectedEditPages.includes(item.href)} disabled={!selectedPages.includes(item.href)} onChange={() => toggleEdit(item.href)} className="w-3.5 h-3.5 rounded border-slate-300 text-[#B4780B] focus:ring-[#F59E0B] disabled:cursor-not-allowed" />
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
                            )}
                        </div>

                        <div className="px-6 sm:px-8 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <Button variant="outline" type="button" onClick={() => router.push('/admin/system-users')} disabled={saving}>Cancel</Button>
                            <Button type="submit" disabled={saving} className="px-8">
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Create User
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

            <CredentialShareModal
                created={created}
                subtitle={created ? `Share the login link below with ${created.name || 'them'}.` : undefined}
                onDone={() => router.push('/admin/system-users')}
            />
        </div>
    );
}
