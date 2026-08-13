"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    User, Bell, Palette, Save, Camera, Sun, Moon,
    RefreshCw, Lock, Building2, ShieldCheck,
    LayoutGrid, ChevronLeft
} from 'lucide-react';
import { settingsService, companyService } from '@/lib/api';
import { authService, sidebarVisibilityKey } from '@/lib/auth';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';
import { ADMIN_PAGE_GROUPS, SUPER_ONLY_HREFS, SUPER_ADMIN_HIDDEN_HREFS } from '@/lib/adminPages';

/* ─── Button (kit) ─── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => (
    <Button
        type={type} onClick={onClick} disabled={loading || disabled}
        variant={variant === 'secondary' ? 'secondary' : 'primary'}
        className={`whitespace-nowrap ${className}`}
    >
        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        {children}
    </Button>
);

/* ─── Form Field ─── */
const Field = ({ label, required = false, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-slate-700">
            {label} {required && <span className="text-rose-600">*</span>}
        </label>
        {children}
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </div>
);

const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`${ui.inputBase} ${className}`}
        {...props}
    />
);

/* ─── Toggle Switch ─── */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${checked ? 'bg-[#F59E0B] border-[#F59E0B]' : 'bg-slate-200 border-slate-300'}`}
    >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
);

type Tab = 'main' | 'profile' | 'store' | 'notifications' | 'security' | 'display' | 'all-pages';

const TABS = [
    { id: 'profile' as Tab, label: 'Profile Info', icon: User, desc: 'Edit your name, email, and contact details.' },
    { id: 'store' as Tab, label: 'Business Info', icon: Building2, desc: 'Update your store name, address, and NTN.' },
    { id: 'security' as Tab, label: 'Login & Security', icon: ShieldCheck, desc: 'Change your password and manage access.' },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell, desc: 'Set preferences for orders and alerts.' },
    { id: 'display' as Tab, label: 'Display', icon: Palette, desc: 'Switch theme and manage sidebar.' },
    { id: 'all-pages' as Tab, label: 'Sidebar Pages', icon: LayoutGrid, desc: 'Show or hide modules in navigation.' },
];

export default function SettingsPage() {
    const [pageLoading, setPageLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('main');
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [profileSaving, setProfileSaving] = useState(false);
    const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '', avatar: '' });
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const avatarRef = useRef<HTMLInputElement>(null);

    const [storeSaving, setStoreSaving] = useState(false);
    const [companyId, setCompanyId] = useState<number | null>(null);
    const [store, setStore] = useState({ name: '', email: '', phone: '', website: '', currency: 'PKR', tax_number: '', address: '' });

    const [notifSaving, setNotifSaving] = useState(false);
    const [notif, setNotif] = useState({ notif_new_order: true, notif_low_stock: true, notif_weekly_report: true, notif_sms: false });

    const [pwSaving, setPwSaving] = useState(false);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [animations, setAnimations] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarVisibility, setSidebarVisibility] = useState<Record<string, boolean>>({});
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const load = async () => {
            setPageLoading(true);
            try {
                const user = authService.getUser();
                setCurrentUser(user);
                setIsSuperAdmin(authService.isSuperAdmin());
                const stored = localStorage.getItem(sidebarVisibilityKey());
                if (stored) setSidebarVisibility(JSON.parse(stored));

                const [pRes, cRes, sRes] = await Promise.allSettled([
                    settingsService.getProfile(),
                    companyService.getAll(),
                    settingsService.getSettings()
                ]);

                if (pRes.status === 'fulfilled' && pRes.value) {
                    const p = pRes.value;
                    setProfile({ firstName: p.first_name || '', lastName: p.last_name || '', email: p.email || '', phone: p.phone || '', avatar: p.avatar || '' });
                }
                if (cRes.status === 'fulfilled' && cRes.value?.length > 0) {
                    const c = cRes.value[0];
                    setCompanyId(c.id || null);
                    setStore({ name: c.name || '', email: c.email || '', phone: c.phone || '', website: c.website || '', currency: c.currency || 'PKR', tax_number: c.tax_number || '', address: c.address || '' });
                }
                if (sRes.status === 'fulfilled' && sRes.value) {
                    const s = sRes.value;
                    setNotif({ notif_new_order: s.notif_new_order ?? true, notif_low_stock: s.notif_low_stock ?? true, notif_weekly_report: s.notif_weekly_report ?? true, notif_sms: s.notif_sms ?? false });
                    setTheme((s.theme as 'light' | 'dark') || 'light');
                    setAnimations(s.animations ?? true);
                    setSidebarCollapsed(s.sidebar_collapsed ?? false);
                }
            } finally { setPageLoading(false); }
        };
        load();
    }, []);

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        try {
            const fd = new FormData();
            fd.append('first_name', profile.firstName);
            fd.append('last_name', profile.lastName);
            fd.append('email', profile.email);
            fd.append('phone', profile.phone);
            if (selectedAvatar) fd.append('avatar', selectedAvatar);
            const updated = await settingsService.updateProfile(Number(currentUser.id), fd as any);
            // update_user returns role as a numeric FK id (+ role_name string). Keep
            // role as the string name the sidebar/guards rely on, and merge over the
            // existing session user so login-only fields aren't dropped.
            const prev = authService.getUser() as any;
            const merged = { ...(prev || {}), ...updated, role: updated?.role_name || prev?.role || '' };
            authService.setSession(sessionStorage.getItem('accessToken') || '', sessionStorage.getItem('refreshToken') || '', merged as any);
            window.dispatchEvent(new Event('profileUpdated'));
            toast.success('Profile updated');
        } catch { toast.error('Failed to update profile'); } finally { setProfileSaving(false); }
    };

    const handleSaveStore = async () => {
        setStoreSaving(true);
        try {
            if (companyId) await companyService.update(companyId, store as any);
            toast.success('Business info updated');
        } catch { toast.error('Failed to update'); } finally { setStoreSaving(false); }
    };

    const handleSaveAppearance = async (override?: any) => {
        try {
            await settingsService.updateSettings({ theme: override?.theme || theme, animations: override?.animations ?? animations, sidebar_collapsed: override?.sidebarCollapsed ?? sidebarCollapsed });
            window.dispatchEvent(new Event('settingsUpdated'));
        } catch { }
    };

    const toggleSidebarItem = (href: string) => {
        const newVis = { ...sidebarVisibility, [href]: !(sidebarVisibility[href] !== false) };
        setSidebarVisibility(newVis);
    };

    const isSupplier = currentUser?.role?.toString().toLowerCase() === 'supplier';

    const tabLabel: Record<Tab, string> = {
        main: 'Your Account', profile: 'Profile Info', store: 'Business Info',
        notifications: 'Notifications', security: 'Login & Security', display: 'Display', 'all-pages': 'Sidebar Pages'
    };

    if (pageLoading) return <div className="p-20 text-center text-slate-400 text-[13px]">Loading settings...</div>;

    return (
        <div className="pb-20">

            {/* ── BREADCRUMB + TITLE ── */}
            <div className="max-w-[1100px] mx-auto px-0 sm:px-6 pt-2">
                <PageHeader
                    title={tabLabel[activeTab]}
                    hideBack={activeTab !== 'main'}
                    breadcrumbs={activeTab !== 'main'
                        ? [{ label: 'Console', href: '/admin/dashboard' }, { label: 'Settings' }, { label: tabLabel[activeTab] }]
                        : [{ label: 'Console', href: '/admin/dashboard' }, { label: 'Settings' }]}
                    actions={activeTab !== 'main' ? (
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('main')}>
                            <ChevronLeft size={14} /> Back
                        </Button>
                    ) : undefined}
                />
            </div>

            <div className="max-w-[1100px] mx-auto px-0 sm:px-6">

                {/* ── MAIN HUB ── */}
                {activeTab === 'main' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {TABS.filter(t => {
                            // Business Info edits the single shared Company record — Super Admin only.
                            if (t.id === 'store' && !isSuperAdmin) return false;
                            if (isSupplier && (t.id === 'store' || t.id === 'all-pages')) return false;
                            return true;
                        }).map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="text-left group w-full">
                                <Card className="p-5 hover:border-[#F59E0B]/35 transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-2 bg-slate-100 rounded-xl group-hover:bg-[#F59E0B]/10 transition-colors">
                                            <tab.icon size={20} className="text-slate-500 group-hover:text-[#92600A] transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-bold text-slate-900 group-hover:text-[#92600A] transition-colors">{tab.label}</h3>
                                            <p className="text-[12px] text-slate-600 mt-0.5 leading-snug">{tab.desc}</p>
                                        </div>
                                    </div>
                                </Card>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── PROFILE ── */}
                {activeTab === 'profile' && (
                    <Card className="overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Profile Details</h2>
                            <p className="text-[12px] text-slate-600">Manage how you appear in the system.</p>
                        </div>
                        <div className="p-8">
                            <div className="flex flex-col sm:flex-row gap-8 items-start">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-3 shrink-0">
                                    <div
                                        className="w-28 h-28 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer group relative"
                                        onClick={() => avatarRef.current?.click()}
                                    >
                                        {(avatarPreview || profile.avatar) ? (
                                            <img src={avatarPreview || getImageUrl(profile.avatar) || ''} className="w-full h-full object-cover" alt="Avatar" />
                                        ) : (
                                            <User size={40} className="text-slate-300" />
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera size={20} className="text-white" />
                                        </div>
                                    </div>
                                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setSelectedAvatar(f); setAvatarPreview(URL.createObjectURL(f)); }
                                    }} />
                                    <button onClick={() => avatarRef.current?.click()} className="text-[12px] text-[#B4780B] hover:text-[#92600A] hover:underline font-medium">Change photo</button>
                                </div>

                                {/* Fields */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <Field label="First Name" required>
                                        <Input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} placeholder="John" />
                                    </Field>
                                    <Field label="Last Name" required>
                                        <Input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} placeholder="Doe" />
                                    </Field>
                                    <Field label="Email Address" required>
                                        <Input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="you@example.com" />
                                    </Field>
                                    <Field label="Phone Number">
                                        <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+92 300 0000000" />
                                    </Field>
                                </div>
                            </div>

                            <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                                <Btn loading={profileSaving} onClick={handleSaveProfile} className="w-full sm:w-auto justify-center px-6">
                                    <Save size={13} /> Save changes
                                </Btn>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ── BUSINESS INFO ── */}
                {activeTab === 'store' && isSuperAdmin && (
                    <Card className="overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Business Information</h2>
                            <p className="text-[12px] text-slate-600">Store profile and identification details.</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="Store Name" required>
                                    <Input value={store.name} onChange={e => setStore({ ...store, name: e.target.value })} placeholder="Al-Qavi Trades" />
                                </Field>
                                <Field label="Business Website">
                                    <Input value={store.website} onChange={e => setStore({ ...store, website: e.target.value })} placeholder="www.yourstore.com" />
                                </Field>
                                <Field label="Business Email">
                                    <Input type="email" value={store.email} onChange={e => setStore({ ...store, email: e.target.value })} placeholder="contact@store.com" />
                                </Field>
                                <Field label="Business Phone">
                                    <Input value={store.phone} onChange={e => setStore({ ...store, phone: e.target.value })} placeholder="+92 300 0000000" />
                                </Field>
                                <Field label="Tax / NTN Number">
                                    <Input value={store.tax_number} onChange={e => setStore({ ...store, tax_number: e.target.value })} placeholder="1234567-8" />
                                </Field>
                                <Field label="Currency" hint="Currency cannot be changed">
                                    <Input value={store.currency} disabled className="bg-slate-50 cursor-not-allowed opacity-60" />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label="Full Address">
                                        <Input value={store.address} onChange={e => setStore({ ...store, address: e.target.value })} placeholder="123 Street, Area, City" />
                                    </Field>
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                                <Btn loading={storeSaving} onClick={handleSaveStore} className="w-full sm:w-auto justify-center px-6">
                                    <Save size={13} /> Save info
                                </Btn>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ── SECURITY ── */}
                {activeTab === 'security' && (
                    <Card className="overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Change Password</h2>
                            <p className="text-[12px] text-slate-600">Update your login credentials.</p>
                        </div>
                        <div className="p-8">
                            <div className="flex flex-col sm:flex-row gap-8">
                                <div className="flex-1 grid grid-cols-1 gap-5">
                                    <Field label="Current Password" required>
                                        <Input type="password" value={passwords.old} onChange={e => setPasswords({ ...passwords, old: e.target.value })} placeholder="••••••••" />
                                    </Field>
                                    <Field label="New Password" required>
                                        <Input type="password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} placeholder="At least 6 characters" />
                                    </Field>
                                    <Field label="Confirm New Password" required>
                                        <Input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Repeat new password" />
                                    </Field>
                                </div>
                                <div className="w-full sm:w-[220px] bg-[#F59E0B]/10 border border-[#F59E0B]/15 rounded-xl p-5 text-[12px] text-slate-600 leading-relaxed self-start">
                                    <p className="font-bold text-[#B4780B] mb-2 text-[12px]">Security Tips</p>
                                    Use at least 8 characters with a mix of letters, numbers, and symbols. Never share your password with anyone.
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                                <Btn loading={pwSaving} onClick={async () => {
                                    setPwSaving(true);
                                    try {
                                        await settingsService.changePassword(Number(currentUser.id), passwords.old, passwords.new, passwords.confirm);
                                        toast.success('Password changed successfully');
                                        setPasswords({ old: '', new: '', confirm: '' });
                                    } catch { } finally { setPwSaving(false); }
                                }} className="w-full sm:w-auto justify-center px-6">
                                    <Lock size={13} /> Update password
                                </Btn>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ── NOTIFICATIONS ── */}
                {activeTab === 'notifications' && (
                    <Card className="overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Notification Preferences</h2>
                            <p className="text-[12px] text-slate-600">Select which alerts you want to receive.</p>
                        </div>
                        <div className="p-8">
                            <div className="divide-y divide-slate-100">
                                {[
                                    { k: 'notif_new_order', l: 'New Orders', d: 'Alert when a customer places a new order.' },
                                    { k: 'notif_low_stock', l: 'Low Stock', d: 'Alert when items fall below the safety level.' },
                                    { k: 'notif_weekly_report', l: 'Weekly Reports', d: 'Performance summary sent every Monday.' },
                                    { k: 'notif_sms', l: 'SMS Alerts', d: 'Urgent system messages to your phone.' },
                                ].map(f => (
                                    <div key={f.k} className="flex items-center justify-between py-4">
                                        <div>
                                            <h4 className="text-[13px] font-bold text-slate-900">{f.l}</h4>
                                            <p className="text-[12px] text-slate-600 mt-0.5">{f.d}</p>
                                        </div>
                                        <Toggle checked={(notif as any)[f.k]} onChange={v => setNotif({ ...notif, [f.k]: v })} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end">
                                <Btn loading={notifSaving} onClick={async () => {
                                    setNotifSaving(true);
                                    try { await settingsService.updateSettings(notif); toast.success('Preferences saved'); } catch { } finally { setNotifSaving(false); }
                                }} className="w-full sm:w-auto justify-center px-6">
                                    <Save size={13} /> Save preferences
                                </Btn>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ── DISPLAY ── */}
                {activeTab === 'display' && (
                    <Card className="overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Display Settings</h2>
                            <p className="text-[12px] text-slate-600">Customize your workspace appearance.</p>
                        </div>
                        <div className="p-8">
                            {/* Theme */}
                            <p className="text-[13px] font-bold text-slate-900 mb-3">Theme</p>
                            <div className="flex gap-4 mb-8">
                                {[{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setTheme(t.id as any); handleSaveAppearance({ theme: t.id }); }}
                                        className={`flex items-center gap-3 px-5 py-3 border rounded-xl text-[13px] font-bold transition-all ${theme === t.id ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B4780B]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        <t.icon size={16} className={theme === t.id ? 'text-[#B4780B]' : 'text-slate-400'} />
                                        {t.label}
                                        {theme === t.id && <Badge tone="indigo">Active</Badge>}
                                    </button>
                                ))}
                            </div>

                            {/* Toggles */}
                            <div className="border-t border-slate-100 divide-y divide-slate-100">
                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <h4 className="text-[13px] font-bold text-slate-900">Interface Animations</h4>
                                        <p className="text-[12px] text-slate-600">Smooth transitions and micro-animations.</p>
                                    </div>
                                    <Toggle checked={animations} onChange={v => { setAnimations(v); handleSaveAppearance({ animations: v }); }} />
                                </div>
                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <h4 className="text-[13px] font-bold text-slate-900">Condensed Sidebar</h4>
                                        <p className="text-[12px] text-slate-600">Hide text labels, show icons only.</p>
                                    </div>
                                    <Toggle checked={sidebarCollapsed} onChange={v => { setSidebarCollapsed(v); handleSaveAppearance({ sidebarCollapsed: v }); }} />
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ── SIDEBAR PAGES ── */}
                {activeTab === 'all-pages' && (
                    <Card className="overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Sidebar Navigation</h2>
                            <p className="text-[12px] text-slate-600">Show or hide specific pages in the navigation sidebar. Changes apply immediately after saving.</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
                                {ADMIN_PAGE_GROUPS.map(g => {
                                    // Branch admins can't see/toggle Super-Admin-only pages;
                                    // a super admin can't toggle pages hidden from them either.
                                    const items = g.items.filter(i =>
                                        (isSuperAdmin || !SUPER_ONLY_HREFS.includes(i.h)) &&
                                        !(isSuperAdmin && SUPER_ADMIN_HIDDEN_HREFS.includes(i.h)));
                                    if (items.length === 0) return null;
                                    return (
                                    <div key={g.group}>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">{g.group}</p>
                                        <div className="divide-y divide-slate-100">
                                            {items.map(i => {
                                                const vis = sidebarVisibility[i.h] !== false;
                                                return (
                                                    <div key={i.h} className="flex items-center justify-between py-2.5">
                                                        <span className={`text-[13px] ${!vis ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{i.n}</span>
                                                        <Toggle checked={vis} onChange={() => toggleSidebarItem(i.h)} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                <p className="text-[12px] text-slate-600 text-center sm:text-left">Toggling off a page will hide it from the sidebar but not delete it.</p>
                                <Btn onClick={() => {
                                    localStorage.setItem(sidebarVisibilityKey(), JSON.stringify(sidebarVisibility));
                                    window.dispatchEvent(new Event('sidebar_visibility_change'));
                                    toast.success('Navigation layout saved');
                                }} className="w-full sm:w-auto justify-center px-6">
                                    <Save size={13} /> Save layout
                                </Btn>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
