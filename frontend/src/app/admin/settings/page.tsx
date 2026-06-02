"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    User, Bell, Shield, Palette, Save, Camera, Sun, Moon,
    RefreshCw, Lock, ChevronRight, Building2, ShieldCheck,
    LayoutGrid, BellRing, UserCheck, ChevronLeft
} from 'lucide-react';
import { settingsService, companyService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─── Amazon Button ─── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4]',
    };
    return (
        <button
            type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium text-[#0f1111] border transition-all flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap ${styles[variant as keyof typeof styles]} ${className}`}
        >
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

/* ─── Amazon Input ─── */
const Field = ({ label, required = false, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[13px] font-bold text-[#0f1111]">
            {label} {required && <span className="text-red-600">*</span>}
        </label>
        {children}
        {hint && <span className="text-[11px] text-[#565959]">{hint}</span>}
    </div>
);

const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.07)] placeholder:text-[#aaa] ${className}`}
        {...props}
    />
);

/* ─── Toggle Switch ─── */
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${checked ? 'bg-[#e47911] border-[#c45500]' : 'bg-[#ddd] border-[#bbb]'}`}
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

    useEffect(() => {
        const load = async () => {
            setPageLoading(true);
            try {
                const user = authService.getUser();
                setCurrentUser(user);
                const stored = localStorage.getItem('sidebar_visibility');
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
            authService.setSession(sessionStorage.getItem('accessToken') || '', sessionStorage.getItem('refreshToken') || '', updated);
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

    if (pageLoading) return <div className="p-20 text-center text-[#565959] text-[13px]">Loading settings...</div>;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">

            {/* ── BREADCRUMB + TITLE ── */}
            <div className="max-w-[1100px] mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-3">
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    {activeTab !== 'main' ? (
                        <>
                            <button onClick={() => setActiveTab('main')} className="hover:text-[#c45500] hover:underline">Account Settings</button>
                            <ChevronRight size={10} />
                            <span className="text-[#c45500]">{tabLabel[activeTab]}</span>
                        </>
                    ) : (
                        <span className="text-[#c45500]">Account Settings</span>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <h1 className="text-[22px] font-normal">{tabLabel[activeTab]}</h1>
                    {activeTab !== 'main' && (
                        <button onClick={() => setActiveTab('main')} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                            <ChevronLeft size={14} /> Back
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-[1100px] mx-auto px-3 sm:px-6">
                <div className="border-b border-[#ddd] mb-6" />

                {/* ── MAIN HUB ── */}
                {activeTab === 'main' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {TABS.filter(t => !isSupplier || (t.id !== 'store' && t.id !== 'all-pages')).map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="text-left group">
                                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 hover:border-[#e47911] transition-all shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-2 bg-[#f0f2f2] rounded-[4px] group-hover:bg-amber-50 transition-colors">
                                            <tab.icon size={20} className="text-[#565959] group-hover:text-[#e47911] transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="text-[14px] font-bold text-[#0f1111] group-hover:text-[#c45500] transition-colors">{tab.label}</h3>
                                            <p className="text-[12px] text-[#565959] mt-0.5 leading-snug">{tab.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── PROFILE ── */}
                {activeTab === 'profile' && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#ddd] bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold">Profile Details</h2>
                            <p className="text-[12px] text-[#565959]">Manage how you appear in the system.</p>
                        </div>
                        <div className="p-8">
                            <div className="flex flex-col sm:flex-row gap-8 items-start">
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-3 shrink-0">
                                    <div
                                        className="w-28 h-28 rounded-full border-2 border-[#ddd] bg-[#f7f8fa] flex items-center justify-center overflow-hidden cursor-pointer group relative"
                                        onClick={() => avatarRef.current?.click()}
                                    >
                                        {(avatarPreview || profile.avatar) ? (
                                            <img src={avatarPreview || getImageUrl(profile.avatar) || ''} className="w-full h-full object-cover" alt="Avatar" />
                                        ) : (
                                            <User size={40} className="text-[#ccc]" />
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera size={20} className="text-white" />
                                        </div>
                                    </div>
                                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setSelectedAvatar(f); setAvatarPreview(URL.createObjectURL(f)); }
                                    }} />
                                    <button onClick={() => avatarRef.current?.click()} className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-medium">Change photo</button>
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

                            <div className="mt-8 pt-5 border-t border-[#eee] flex justify-end">
                                <Btn loading={profileSaving} onClick={handleSaveProfile} className="w-full sm:w-auto h-[31px] justify-center px-6">
                                    <Save size={13} /> Save changes
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── BUSINESS INFO ── */}
                {activeTab === 'store' && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#ddd] bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold">Business Information</h2>
                            <p className="text-[12px] text-[#565959]">Store profile and identification details.</p>
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
                                    <Input value={store.currency} disabled className="bg-[#f7f8fa] cursor-not-allowed opacity-60" />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label="Full Address">
                                        <Input value={store.address} onChange={e => setStore({ ...store, address: e.target.value })} placeholder="123 Street, Area, City" />
                                    </Field>
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t border-[#eee] flex justify-end">
                                <Btn loading={storeSaving} onClick={handleSaveStore} className="w-full sm:w-auto h-[31px] justify-center px-6">
                                    <Save size={13} /> Save info
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SECURITY ── */}
                {activeTab === 'security' && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#ddd] bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold">Change Password</h2>
                            <p className="text-[12px] text-[#565959]">Update your login credentials.</p>
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
                                <div className="w-full sm:w-[220px] bg-[#f7f8fa] border border-[#ddd] rounded-[4px] p-5 text-[12px] text-[#565959] leading-relaxed self-start">
                                    <p className="font-bold text-[#111] mb-2 text-[12px]">Security Tips</p>
                                    Use at least 8 characters with a mix of letters, numbers, and symbols. Never share your password with anyone.
                                </div>
                            </div>
                            <div className="mt-8 pt-5 border-t border-[#eee] flex justify-end">
                                <Btn loading={pwSaving} onClick={async () => {
                                    setPwSaving(true);
                                    try {
                                        await settingsService.changePassword(Number(currentUser.id), passwords.old, passwords.new, passwords.confirm);
                                        toast.success('Password changed successfully');
                                        setPasswords({ old: '', new: '', confirm: '' });
                                    } catch { } finally { setPwSaving(false); }
                                }} className="w-full sm:w-auto h-[31px] justify-center px-6">
                                    <Lock size={13} /> Update password
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NOTIFICATIONS ── */}
                {activeTab === 'notifications' && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#ddd] bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold">Notification Preferences</h2>
                            <p className="text-[12px] text-[#565959]">Select which alerts you want to receive.</p>
                        </div>
                        <div className="p-8">
                            <div className="divide-y divide-[#eee]">
                                {[
                                    { k: 'notif_new_order', l: 'New Orders', d: 'Alert when a customer places a new order.' },
                                    { k: 'notif_low_stock', l: 'Low Stock', d: 'Alert when items fall below the safety level.' },
                                    { k: 'notif_weekly_report', l: 'Weekly Reports', d: 'Performance summary sent every Monday.' },
                                    { k: 'notif_sms', l: 'SMS Alerts', d: 'Urgent system messages to your phone.' },
                                ].map(f => (
                                    <div key={f.k} className="flex items-center justify-between py-4">
                                        <div>
                                            <h4 className="text-[13px] font-bold text-[#0f1111]">{f.l}</h4>
                                            <p className="text-[12px] text-[#565959] mt-0.5">{f.d}</p>
                                        </div>
                                        <Toggle checked={(notif as any)[f.k]} onChange={v => setNotif({ ...notif, [f.k]: v })} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-5 border-t border-[#eee] flex justify-end">
                                <Btn loading={notifSaving} onClick={async () => {
                                    setNotifSaving(true);
                                    try { await settingsService.updateSettings(notif); toast.success('Preferences saved'); } catch { } finally { setNotifSaving(false); }
                                }} className="w-full sm:w-auto h-[31px] justify-center px-6">
                                    <Save size={13} /> Save preferences
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── DISPLAY ── */}
                {activeTab === 'display' && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#ddd] bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold">Display Settings</h2>
                            <p className="text-[12px] text-[#565959]">Customize your workspace appearance.</p>
                        </div>
                        <div className="p-8">
                            {/* Theme */}
                            <p className="text-[13px] font-bold text-[#0f1111] mb-3">Theme</p>
                            <div className="flex gap-4 mb-8">
                                {[{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setTheme(t.id as any); handleSaveAppearance({ theme: t.id }); }}
                                        className={`flex items-center gap-3 px-5 py-3 border rounded-[4px] text-[13px] font-bold transition-all ${theme === t.id ? 'border-[#e47911] bg-amber-50 text-[#c45500]' : 'border-[#ddd] bg-white text-[#565959] hover:border-[#aaa]'}`}
                                    >
                                        <t.icon size={16} className={theme === t.id ? 'text-[#e47911]' : 'text-[#888]'} />
                                        {t.label}
                                        {theme === t.id && <span className="text-[11px] bg-[#e47911] text-white px-1.5 py-0.5 rounded-sm font-bold">Active</span>}
                                    </button>
                                ))}
                            </div>

                            {/* Toggles */}
                            <div className="border-t border-[#eee] divide-y divide-[#eee]">
                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <h4 className="text-[13px] font-bold">Interface Animations</h4>
                                        <p className="text-[12px] text-[#565959]">Smooth transitions and micro-animations.</p>
                                    </div>
                                    <Toggle checked={animations} onChange={v => { setAnimations(v); handleSaveAppearance({ animations: v }); }} />
                                </div>
                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <h4 className="text-[13px] font-bold">Condensed Sidebar</h4>
                                        <p className="text-[12px] text-[#565959]">Hide text labels, show icons only.</p>
                                    </div>
                                    <Toggle checked={sidebarCollapsed} onChange={v => { setSidebarCollapsed(v); handleSaveAppearance({ sidebarCollapsed: v }); }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SIDEBAR PAGES ── */}
                {activeTab === 'all-pages' && (
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-[#ddd] bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold">Sidebar Navigation</h2>
                            <p className="text-[12px] text-[#565959]">Show or hide specific pages in the navigation sidebar. Changes apply immediately after saving.</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
                                {[
                                    {
                                        group: 'Main',
                                        items: [
                                            { n: 'Dashboard', h: '/admin/dashboard' },
                                            { n: 'Customers', h: '/admin/company/customers' },
                                            { n: 'Recent Activity', h: '/admin/sales/recent' },
                                            { n: 'Order List', h: '/admin/orders' },
                                            { n: 'All Sales', h: '/admin/sales' },
                                            { n: 'Order Tracking', h: '/admin/tracking' },
                                        ]
                                    },
                                    {
                                        group: 'Inventory',
                                        items: [
                                            { n: 'Product Categories', h: '/admin/products/categories' },
                                            { n: 'Product List', h: '/admin/products' },
                                            { n: 'Add Product', h: '/admin/products/add' },
                                            { n: 'Product Sections', h: '/admin/products/sections' },
                                            { n: 'Current Stocks', h: '/admin/inventory/list' },
                                            { n: 'Warehouses', h: '/admin/inventory/warehouses' },
                                        ]
                                    },
                                    {
                                        group: 'Procurement',
                                        items: [
                                            { n: 'Supplier List', h: '/admin/company/suppliers' },
                                            { n: 'New Purchase', h: '/admin/purchases/add' },
                                            { n: 'Purchase History', h: '/admin/purchases' },
                                            { n: 'Supplier Catalog', h: '/admin/supplier-products' },
                                            { n: 'Returns / Refunds', h: '/admin/purchases/returns' },
                                        ]
                                    },
                                    {
                                        group: 'Sales Console',
                                        items: [
                                            { n: 'Point of Sale', h: '/admin/sale' },
                                            { n: 'Invoices', h: '/admin/invoices' },
                                            { n: 'Global Payments', h: '/admin/payments' },
                                            { n: 'Company Categories', h: '/admin/company/categories' },
                                            { n: 'Sale Returns', h: '/admin/sale-returns' },
                                        ]
                                    },
                                    {
                                        group: 'Security & Logs',
                                        items: [
                                            { n: 'User Registry', h: '/admin/users' },
                                            { n: 'Staff Roles', h: '/admin/users/roles' },
                                            { n: 'Permissions', h: '/admin/users/permissions' },
                                            { n: 'System Alerts', h: '/admin/alerts' },
                                            { n: 'Company Hub', h: '/admin/company' },
                                        ]
                                    },
                                    {
                                        group: 'Detailed Reports',
                                        items: [
                                            { n: 'Reports Center', h: '/admin/reports' },
                                            { n: 'Sales Reports', h: '/admin/reports/sales' },
                                            { n: 'Purchase Reports', h: '/admin/reports/purchases' },
                                            { n: 'Inventory Reports', h: '/admin/reports/inventory' },
                                            { n: 'Customer Reports', h: '/admin/reports/customers' },
                                            { n: 'Accounting Reports', h: '/admin/reports/accounting' },
                                            { n: 'Returns Reports', h: '/admin/reports/sales-returns' },
                                            { n: 'Data Hub', h: '/admin/reports/data-hub' },
                                        ]
                                    },
                                ].map(g => (
                                    <div key={g.group}>
                                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider mb-3 pb-2 border-b border-[#eee]">{g.group}</p>
                                        <div className="divide-y divide-[#f5f5f5]">
                                            {g.items.map(i => {
                                                const vis = sidebarVisibility[i.h] !== false;
                                                return (
                                                    <div key={i.h} className="flex items-center justify-between py-2.5">
                                                        <span className={`text-[13px] ${!vis ? 'text-[#bbb] line-through' : 'text-[#0f1111]'}`}>{i.n}</span>
                                                        <Toggle checked={vis} onChange={() => toggleSidebarItem(i.h)} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-5 border-t border-[#eee] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                <p className="text-[12px] text-[#565959] text-center sm:text-left">Toggling off a page will hide it from the sidebar but not delete it.</p>
                                <Btn onClick={() => {
                                    localStorage.setItem('sidebar_visibility', JSON.stringify(sidebarVisibility));
                                    window.dispatchEvent(new Event('sidebar_visibility_change'));
                                    toast.success('Navigation layout saved');
                                }} className="w-full sm:w-auto h-[31px] justify-center px-6">
                                    <Save size={13} /> Save layout
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
