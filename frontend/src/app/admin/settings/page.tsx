'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Settings, User, Store, Bell, Shield, Palette,
    Save, Camera, Eye, EyeOff, Check, X, Sun, Moon,
    Mail, Phone, Globe, Lock, Key, AlertTriangle, Trash2,
    Upload, Loader2, RefreshCw
} from 'lucide-react';
import { settingsService, companyService, CompanyInfo } from '@/lib/api';
import { authService } from '@/lib/auth';

type Tab = 'profile' | 'store' | 'notifications' | 'security' | 'appearance';

/* ─── Toast ─── */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    return (
        <div className={`fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300 ${type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : 'bg-red-50/95 border-red-200 text-red-800'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {type === 'success' ? <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} /> : <X className="w-4 h-4 text-red-600" strokeWidth={2.5} />}
            </div>
            <p className="font-bold text-sm">{message}</p>
            <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
        </div>
    );
}

/* ─── Toggle ─── */
function Toggle({ enabled, onChange, label, description }: { enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string; }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-100/80 last:border-0">
            <div>
                <p className="text-sm font-bold text-gray-800">{label}</p>
                {description && <p className="text-xs font-medium text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button onClick={() => onChange(!enabled)} className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${enabled ? 'bg-[#FF9900]' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${enabled ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );
}

/* ─── Section Card ─── */
function SectionCard({ children, title, subtitle, icon: Icon, accent = '#FF9900' }: { children: React.ReactNode; title: string; subtitle?: string; icon: React.ElementType; accent?: string; }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full blur-[80px] -z-10 pointer-events-none" style={{ background: `${accent}10` }} />
            <div className="px-8 pt-7 pb-5 border-b border-gray-100/60 flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
                    <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-base font-black text-gray-900 tracking-tight">{title}</h2>
                    {subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="px-8 py-6">{children}</div>
        </div>
    );
}

/* ─── Field ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20 focus:border-[#FF9900] text-sm font-medium text-gray-900 shadow-sm transition-all placeholder:text-gray-300";

/* ─── Save Button ─── */
function SaveBtn({ saving, onClick, label = 'Save Changes', gradient = 'from-[#FF9900] to-[#cc7a00]', shadow = 'rgba(0,113,133,0.3)' }: { saving: boolean; onClick: () => void; label?: string; gradient?: string; shadow?: string; }) {
    return (
        <button
            onClick={onClick}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${gradient} text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_${shadow}] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
        >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
            {saving ? 'Saving...' : label}
        </button>
    );
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    /* ── Current user from localStorage ── */
    const [currentUser, setCurrentUser] = useState<any>(null);

    /* ── Profile state ── */
    const [profileSaving, setProfileSaving] = useState(false);
    const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
    const avatarInputRef = useRef<HTMLInputElement>(null);

    /* ── Store / Company state ── */
    const [storeSaving, setStoreSaving] = useState(false);
    const [companyId, setCompanyId] = useState<number | null>(null);
    const [store, setStore] = useState({ name: '', email: '', phone: '', website: '', currency: 'PKR', tax_number: '', address: '' });

    /* ── Notifications ── */
    const [notifSaving, setNotifSaving] = useState(false);
    const [notif, setNotif] = useState({ notif_new_order: true, notif_low_stock: true, notif_new_user: false, notif_weekly_report: true, notif_marketing: false, notif_sms: false });

    /* ── Security ── */
    const [pwSaving, setPwSaving] = useState(false);
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [secSaving, setSecSaving] = useState(false);
    const [sessionTimeout, setSessionTimeout] = useState('30');

    /* ── Appearance ── */
    const [appearanceSaving, setAppearanceSaving] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [accentColor, setAccentColor] = useState('#FF9900');
    const [compactMode, setCompactMode] = useState(false);
    const [animations, setAnimations] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    /* ─── Load all data on mount ─── */
    useEffect(() => {
        const loadAll = async () => {
            setPageLoading(true);
            try {
                // 1) Current user from the auth lib (localStorage)
                const user = authService.getUser();
                // Pre-populate dbId from localStorage user.id so saves work
                // even if the backend profile call fails (demo token etc.)
                const localId = user?.id;
                setCurrentUser((u: any) => ({ ...user, dbId: localId }));

                const nameParts = (user?.name || '').split(' ');
                setProfile({
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    email: user?.email || '',
                    phone: '',
                });

                // 2) Full profile from backend (overrides localStorage data)
                try {
                    const profileData = await settingsService.getProfile();
                    setProfile({
                        firstName: profileData.first_name || nameParts[0] || '',
                        lastName: profileData.last_name || nameParts.slice(1).join(' ') || '',
                        email: profileData.email || user?.email || '',
                        phone: profileData.phone || '',
                    });
                    // Override dbId with real DB id from backend
                    setCurrentUser((u: any) => ({ ...u, dbId: profileData.id }));
                } catch {
                    // Silently use localStorage values already set above
                }

                // 3) Company / Store
                try {
                    const companies = await companyService.getAll();
                    if (companies.length > 0) {
                        const c = companies[0];
                        setCompanyId(c.id || null);
                        setStore({
                            name: c.name || '',
                            email: c.email || '',
                            phone: c.phone || '',
                            website: c.website || '',
                            currency: c.currency || 'PKR',
                            tax_number: c.tax_number || '',
                            address: c.address || '',
                        });
                    }
                } catch { /* keep defaults */ }

                // 4) User Settings (notifications + appearance)
                // Try backend first; fall back to localStorage cache
                const LS_SETTINGS_KEY = 'admin_ui_settings';
                try {
                    const s = await settingsService.getSettings();
                    setNotif({
                        notif_new_order: s.notif_new_order ?? true,
                        notif_low_stock: s.notif_low_stock ?? true,
                        notif_new_user: s.notif_new_user ?? false,
                        notif_weekly_report: s.notif_weekly_report ?? true,
                        notif_marketing: s.notif_marketing ?? false,
                        notif_sms: s.notif_sms ?? false,
                    });
                    setTheme((s.theme as 'light' | 'dark') || 'light');
                    setAccentColor(s.accent_color || '#FF9900');
                    setCompactMode(s.compact_mode ?? false);
                    setAnimations(s.animations ?? true);
                    setSidebarCollapsed(s.sidebar_collapsed ?? false);
                    // Cache for offline / demo use
                    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s));
                } catch {
                    // Load from localStorage cache
                    try {
                        const cached = JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || '{}');
                        if (Object.keys(cached).length > 0) {
                            setNotif({
                                notif_new_order: cached.notif_new_order ?? true,
                                notif_low_stock: cached.notif_low_stock ?? true,
                                notif_new_user: cached.notif_new_user ?? false,
                                notif_weekly_report: cached.notif_weekly_report ?? true,
                                notif_marketing: cached.notif_marketing ?? false,
                                notif_sms: cached.notif_sms ?? false,
                            });
                            setTheme((cached.theme as 'light' | 'dark') || 'light');
                            setAccentColor(cached.accent_color || '#FF9900');
                            setCompactMode(cached.compact_mode ?? false);
                            setAnimations(cached.animations ?? true);
                            setSidebarCollapsed(cached.sidebar_collapsed ?? false);
                        }
                    } catch { /* use defaults */ }
                }

            } finally {
                setPageLoading(false);
            }
        };
        loadAll();
    }, []);

    /* ─── Profile Save ─── */
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        try {
            const userId = currentUser?.dbId || currentUser?.id;
            if (!userId) throw new Error('User ID not found');
            await settingsService.updateProfile(Number(userId), {
                first_name: profile.firstName,
                last_name: profile.lastName,
                email: profile.email,
                phone: profile.phone,
            });
            // Always update localStorage regardless
            const user = authService.getUser();
            if (user) {
                authService.setSession(
                    { ...user, name: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email },
                    localStorage.getItem('accessToken') || '',
                    localStorage.getItem('refreshToken') || undefined
                );
            }
            showToast('Profile updated successfully!', 'success');
        } catch (err: any) {
            // Even if backend fails (e.g. demo token), save name/email to localStorage
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                const user = authService.getUser();
                if (user) {
                    authService.setSession(
                        { ...user, name: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email },
                        localStorage.getItem('accessToken') || '',
                        localStorage.getItem('refreshToken') || undefined
                    );
                }
                showToast('Profile saved locally (login with real account to sync to server).', 'success');
            } else {
                const msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || 'Failed to update profile.';
                showToast(msg, 'error');
            }
        } finally {
            setProfileSaving(false);
        }
    };

    /* ─── Store Save ─── */
    const handleSaveStore = async () => {
        setStoreSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', store.name);
            fd.append('email', store.email);
            fd.append('phone', store.phone);
            fd.append('website', store.website);
            fd.append('currency', store.currency);
            fd.append('tax_number', store.tax_number);
            fd.append('address', store.address);

            if (companyId) {
                await companyService.update(companyId, fd as any);
            } else {
                const created = await companyService.create(fd as any);
                setCompanyId(created.id || null);
            }
            showToast('Store settings saved!', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.name?.[0] || err?.response?.data?.detail || 'Failed to save store settings.';
            showToast(msg, 'error');
        } finally {
            setStoreSaving(false);
        }
    };

    /* ─── Notifications Save ─── */
    const handleSaveNotifications = async () => {
        setNotifSaving(true);
        const LS_KEY = 'admin_ui_settings';
        try {
            await settingsService.updateSettings(notif);
            // Also cache locally
            const cached = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            localStorage.setItem(LS_KEY, JSON.stringify({ ...cached, ...notif }));
            showToast('Notification preferences saved!', 'success');
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                // Save to localStorage fallback
                const cached = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
                localStorage.setItem(LS_KEY, JSON.stringify({ ...cached, ...notif }));
                showToast('Preferences saved locally!', 'success');
            } else {
                showToast('Failed to save notification preferences.', 'error');
            }
        } finally {
            setNotifSaving(false);
        }
    };

    /* ─── Password Save ─── */
    const handleSavePassword = async () => {
        if (passwords.new !== passwords.confirm) { showToast('New passwords do not match!', 'error'); return; }
        if (passwords.new.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
        setPwSaving(true);
        try {
            const userId = currentUser?.dbId || currentUser?.id;
            await settingsService.changePassword(Number(userId), passwords.old, passwords.new, passwords.confirm);
            setPasswords({ old: '', new: '', confirm: '' });
            showToast('Password changed successfully!', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to change password.';
            showToast(msg, 'error');
        } finally {
            setPwSaving(false);
        }
    };

    /* ─── Appearance Save ─── */
    const handleSaveAppearance = async () => {
        setAppearanceSaving(true);
        const LS_KEY = 'admin_ui_settings';
        const appearancePayload = { theme, accent_color: accentColor, compact_mode: compactMode, animations, sidebar_collapsed: sidebarCollapsed };
        try {
            await settingsService.updateSettings(appearancePayload);
            // Also cache locally
            const cached = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            localStorage.setItem(LS_KEY, JSON.stringify({ ...cached, ...appearancePayload }));
            showToast('Appearance settings saved!', 'success');
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                const cached = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
                localStorage.setItem(LS_KEY, JSON.stringify({ ...cached, ...appearancePayload }));
                showToast('Appearance saved locally!', 'success');
            } else {
                showToast('Failed to save appearance settings.', 'error');
            }
        } finally {
            setAppearanceSaving(false);
        }
    };

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'store', label: 'Store', icon: Store },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'appearance', label: 'Appearance', icon: Palette },
    ];

    const ACCENT_PRESETS = ['#FF9900', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#F97316'];

    const pwStrength = (pw: string) => pw.length < 4 ? 'Weak' : pw.length < 7 ? 'Fair' : pw.length < 10 ? 'Good' : 'Strong';

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-12 font-sans px-3 sm:px-6 mt-6 relative z-0">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#FF9900]/15/30 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-50/30 blur-[100px]" />
            </div>

            {/* ── Page Header ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/8 rounded-full blur-[80px] -z-10 pointer-events-none" />
                <div className="px-7 sm:px-10 py-7 flex items-center gap-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#FF9900] to-[#e68a00] rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,113,133,0.25)] flex-shrink-0">
                        <Settings className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Settings</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage your account and store preferences</p>
                    </div>
                </div>

                {/* Tab Nav */}
                <div className="px-7 sm:px-10 border-t border-gray-100/60">
                    <div className="flex gap-1 overflow-x-auto py-3">
                        {TABS.map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${active ? 'bg-[#FF9900] text-white shadow-[0_4px_12px_rgba(0,113,133,0.25)]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                                    <tab.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════ PROFILE ══════════════════════════════ */}
            {activeTab === 'profile' && (
                <SectionCard title="Profile Information" subtitle="Your personal account details" icon={User}>
                    {/* Avatar */}
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                        <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#FF9900] to-[#e68a00] rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(0,113,133,0.25)]">
                                <span className="text-2xl font-black text-white">
                                    {(profile.firstName[0] || '?').toUpperCase()}{(profile.lastName[0] || '').toUpperCase()}
                                </span>
                            </div>
                            <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border-2 border-gray-100 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors" title="Upload Photo">
                                <Camera className="h-3.5 w-3.5 text-gray-500" strokeWidth={2.5} />
                            </button>
                            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
                        </div>
                        <div>
                            <p className="font-black text-gray-900 text-base">{profile.firstName} {profile.lastName}</p>
                            <p className="text-xs font-medium text-gray-400 mt-0.5">{profile.email}</p>
                            <p className="text-[10px] font-bold text-[#FF9900] uppercase tracking-widest mt-1">
                                {currentUser?.role || 'Admin'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="First Name">
                            <input className={inputCls} value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
                        </Field>
                        <Field label="Last Name">
                            <input className={inputCls} value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
                        </Field>
                        <Field label="Email Address">
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                                <input className={`${inputCls} pl-10`} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
                            </div>
                        </Field>
                        <Field label="Phone Number">
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                                <input className={`${inputCls} pl-10`} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+92 300 0000000" />
                            </div>
                        </Field>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <SaveBtn saving={profileSaving} onClick={handleSaveProfile} />
                    </div>
                </SectionCard>
            )}

            {/* ══════════════════════════════ STORE ══════════════════════════════ */}
            {activeTab === 'store' && (
                <SectionCard title="Store Settings" subtitle="Configure your shop details" icon={Store} accent="#8B5CF6">
                    {companyId ? (
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <Check className="h-3 w-3" strokeWidth={3} /> Connected to company ID #{companyId}
                        </p>
                    ) : (
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4">⚠ No company record found — saving will create one</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Store Name">
                            <input className={inputCls} value={store.name} onChange={e => setStore(s => ({ ...s, name: e.target.value }))} placeholder="Online Cosmetics Shop" />
                        </Field>
                        <Field label="Website">
                            <div className="relative">
                                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                                <input className={`${inputCls} pl-10`} value={store.website} onChange={e => setStore(s => ({ ...s, website: e.target.value }))} placeholder="www.example.com" />
                            </div>
                        </Field>
                        <Field label="Store Email">
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                                <input className={`${inputCls} pl-10`} value={store.email} onChange={e => setStore(s => ({ ...s, email: e.target.value }))} placeholder="store@example.com" />
                            </div>
                        </Field>
                        <Field label="Store Phone">
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                                <input className={`${inputCls} pl-10`} value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} placeholder="+92 21 1234567" />
                            </div>
                        </Field>
                        <Field label="Currency">
                            <select className={inputCls} value={store.currency} onChange={e => setStore(s => ({ ...s, currency: e.target.value }))}>
                                <option value="PKR">PKR — Pakistani Rupee</option>
                                <option value="USD">USD — US Dollar</option>
                                <option value="EUR">EUR — Euro</option>
                                <option value="GBP">GBP — British Pound</option>
                            </select>
                        </Field>
                        <Field label="Tax Number / NTN">
                            <input className={inputCls} value={store.tax_number} onChange={e => setStore(s => ({ ...s, tax_number: e.target.value }))} placeholder="NTN / GST number" />
                        </Field>
                        <Field label="Store Address">
                            <textarea rows={2} className={`${inputCls} resize-none`} value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} placeholder="City, Country" />
                        </Field>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <SaveBtn saving={storeSaving} onClick={handleSaveStore} gradient="from-violet-500 to-purple-600" shadow="rgba(139,92,246,0.3)" />
                    </div>
                </SectionCard>
            )}

            {/* ══════════════════════════════ NOTIFICATIONS ══════════════════════════════ */}
            {activeTab === 'notifications' && (
                <SectionCard title="Notification Preferences" subtitle="Control what alerts you receive" icon={Bell} accent="#F59E0B">
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Email Notifications</p>
                        <Toggle enabled={notif.notif_new_order} onChange={v => setNotif(n => ({ ...n, notif_new_order: v }))} label="New Order Received" description="Get notified when a customer places an order" />
                        <Toggle enabled={notif.notif_low_stock} onChange={v => setNotif(n => ({ ...n, notif_low_stock: v }))} label="Low Stock Alert" description="Receive alerts when product stock falls below 10 units" />
                        <Toggle enabled={notif.notif_new_user} onChange={v => setNotif(n => ({ ...n, notif_new_user: v }))} label="New User Registration" description="Notify when a new customer registers an account" />
                        <Toggle enabled={notif.notif_weekly_report} onChange={v => setNotif(n => ({ ...n, notif_weekly_report: v }))} label="Weekly Sales Report" description="Receive a weekly summary of your store's performance" />
                        <Toggle enabled={notif.notif_marketing} onChange={v => setNotif(n => ({ ...n, notif_marketing: v }))} label="Marketing & Promotions" description="Updates about platform features and tips" />
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">SMS Notifications</p>
                        <Toggle enabled={notif.notif_sms} onChange={v => setNotif(n => ({ ...n, notif_sms: v }))} label="SMS Alerts" description="Receive critical alerts via SMS on your phone" />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <SaveBtn saving={notifSaving} onClick={handleSaveNotifications} label="Save Preferences" gradient="from-amber-400 to-orange-500" shadow="rgba(245,158,11,0.3)" />
                    </div>
                </SectionCard>
            )}

            {/* ══════════════════════════════ SECURITY ══════════════════════════════ */}
            {activeTab === 'security' && (
                <div className="space-y-6">
                    {/* Change Password */}
                    <SectionCard title="Change Password" subtitle="Update your account password" icon={Lock} accent="#EF4444">
                        <div className="space-y-4">
                            {[
                                { label: 'Current Password', field: 'old', show: showOld, toggle: setShowOld },
                                { label: 'New Password', field: 'new', show: showNew, toggle: setShowNew },
                                { label: 'Confirm New Password', field: 'confirm', show: showConfirm, toggle: setShowConfirm },
                            ].map(({ label, field, show, toggle }) => (
                                <Field key={field} label={label}>
                                    <div className="relative">
                                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2} />
                                        <input
                                            type={show ? 'text' : 'password'}
                                            className={`${inputCls} pl-10 pr-10`}
                                            placeholder={field === 'old' ? 'Enter current password' : field === 'new' ? 'Min. 8 characters' : 'Repeat new password'}
                                            value={passwords[field as keyof typeof passwords]}
                                            onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                                        />
                                        <button type="button" onClick={() => toggle(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </Field>
                            ))}

                            {passwords.new && (
                                <div className="flex gap-1.5 mt-1 items-center">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${passwords.new.length >= i * 3 ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-emerald-400' : 'bg-gray-200'}`} />
                                    ))}
                                    <span className="text-[10px] font-bold text-gray-400 ml-1">{pwStrength(passwords.new)}</span>
                                </div>
                            )}
                            {passwords.new && passwords.confirm && passwords.new !== passwords.confirm && (
                                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                    <X className="h-3 w-3" /> Passwords do not match
                                </p>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleSavePassword}
                                disabled={pwSaving || !passwords.old || !passwords.new || passwords.new !== passwords.confirm}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_8px_20px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Key className="h-4 w-4" strokeWidth={2.5} />}
                                {pwSaving ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </SectionCard>

                    {/* Session */}
                    <SectionCard title="Access & Sessions" subtitle="Control session and account security" icon={Shield} accent="#10B981">
                        <div className="py-4 border-b border-gray-100/80">
                            <Field label="Session Timeout (minutes)">
                                <select className={`${inputCls} mt-1.5 w-48`} value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)}>
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="120">2 hours</option>
                                    <option value="0">Never</option>
                                </select>
                            </Field>
                        </div>

                        {/* Danger Zone */}
                        <div className="mt-4 p-4 bg-red-50/60 border border-red-100 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="h-4 w-4 text-red-500" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-red-800">Danger Zone</p>
                                    <p className="text-xs font-medium text-red-500 mt-0.5">These actions are irreversible. Proceed with caution.</p>
                                    <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 font-black text-xs rounded-xl hover:bg-red-50 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <SaveBtn saving={secSaving} onClick={async () => {
                                setSecSaving(true);
                                await new Promise(r => setTimeout(r, 500));
                                setSecSaving(false);
                                showToast('Session settings saved!', 'success');
                            }} label="Save Settings" gradient="from-emerald-500 to-indigo-" shadow="rgba(16,185,129,0.3)" />
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* ══════════════════════════════ APPEARANCE ══════════════════════════════ */}
            {activeTab === 'appearance' && (
                <SectionCard title="Appearance" subtitle="Customize the look and feel" icon={Palette} accent="#EC4899">
                    {/* Theme */}
                    <div className="mb-6 pb-6 border-b border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Theme Mode</p>
                        <div className="grid grid-cols-2 gap-3 max-w-sm">
                            {(['light', 'dark'] as const).map(t => (
                                <button key={t} onClick={() => setTheme(t)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${theme === t ? 'border-[#FF9900] bg-[#FF9900]/5 shadow-[0_4px_16px_rgba(0,113,133,0.15)]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t === 'light' ? 'bg-amber-50' : 'bg-gray-800'}`}>
                                        {t === 'light' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-gray-300" />}
                                    </div>
                                    <span className="text-xs font-black text-gray-700 capitalize">{t} Mode</span>
                                    {theme === t && <span className="absolute top-2 right-2 w-5 h-5 bg-[#FF9900] rounded-full flex items-center justify-center"><Check className="h-3 w-3 text-white" strokeWidth={3} /></span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Accent Color */}
                    <div className="mb-6 pb-6 border-b border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Accent Color</p>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {ACCENT_PRESETS.map(color => (
                                <button key={color} onClick={() => setAccentColor(color)}
                                    className={`w-9 h-9 rounded-xl transition-all duration-200 flex items-center justify-center ${accentColor === color ? 'scale-110 shadow-lg ring-2 ring-offset-2' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: color }} title={color}>
                                    {accentColor === color && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                                </button>
                            ))}
                            <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs font-bold text-gray-400">Custom:</span>
                                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white" />
                            </div>
                        </div>
                    </div>

                    <Toggle enabled={compactMode} onChange={setCompactMode} label="Compact Mode" description="Reduce spacing for a denser information layout" />
                    <Toggle enabled={animations} onChange={setAnimations} label="Animations & Transitions" description="Enable smooth animations throughout the dashboard" />
                    <Toggle enabled={sidebarCollapsed} onChange={setSidebarCollapsed} label="Collapsed Sidebar by Default" description="Start with the sidebar minimized on load" />

                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSaveAppearance} disabled={appearanceSaving}
                            className="flex items-center gap-2 px-5 py-2.5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:-translate-y-0.5 transition-all duration-300 shadow-lg disabled:opacity-60"
                            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}>
                            {appearanceSaving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} /> : <Save className="h-4 w-4" strokeWidth={2.5} />}
                            {appearanceSaving ? 'Saving...' : 'Save Appearance'}
                        </button>
                    </div>
                </SectionCard>
            )}
        </div>
    );
}
