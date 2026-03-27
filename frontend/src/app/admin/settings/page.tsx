'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Settings, User, Store, Bell, Shield, Palette,
    Save, Camera, Eye, EyeOff, Check, X, Sun, Moon,
    Mail, Phone, Globe, Lock, Key, AlertTriangle, Trash2,
    Upload, Loader2, RefreshCw, CheckCircle
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
        <div className="flex items-center justify-between py-4 border-b border-gray-100/80 dark:border-slate-800/80 last:border-0">
            <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</p>
                {description && <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${enabled ? 'bg-[#FF9900]' : 'bg-gray-200 dark:bg-slate-600'}`}
            >
                <span className="sr-only">Use setting</span>
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </div>
    );
}

/* ─── Section Card ─── */
function SectionCard({ children, title, subtitle, icon: Icon }: { children: React.ReactNode; title: string; subtitle?: string; icon: React.ElementType }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-[#FF9900]" />
                    <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{title}</h2>
                        {subtitle && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </div>
            <div className="px-6 py-6">{children}</div>
        </div>
    );
}

/* ─── Field ─── */
function Field({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
            {children}
            {description && <p className="text-[10px] text-slate-400 font-medium">{description}</p>}
        </div>
    );
}

const inputCls = "w-full px-3 py-2 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] transition-all placeholder:text-gray-400";

function SaveBtn({ saving, onClick, label = 'Save Changes' }: { saving: boolean; onClick: () => void; label?: string }) {
    return (
        <button
            onClick={onClick}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-black text-xs uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {saving ? <Loader2 className="h-4 w-4 animate-spin text-[#131921]" /> : <Check className="h-4 w-4" />}
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
    const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '', avatar: '' });
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
                    avatar: user?.avatar || '',
                });

                // 2) Full profile from backend (overrides localStorage data)
                try {
                    const profileData = await settingsService.getProfile();
                    setProfile({
                        firstName: profileData.first_name || nameParts[0] || '',
                        lastName: profileData.last_name || nameParts.slice(1).join(' ') || '',
                        email: profileData.email || user?.email || '',
                        phone: profileData.phone || '',
                        avatar: profileData.avatar || user?.avatar || '',
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

    /* ─── Handle Avatar Choice ─── */
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    /* ─── Profile Save ─── */
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        const accessToken = localStorage.getItem('accessToken') || '';
        const isDemo = accessToken.startsWith('demo-token-');

        try {
            const userId = currentUser?.dbId || currentUser?.id;

            // 1) Prepare Data
            const fd = new FormData();
            fd.append('first_name', profile.firstName);
            fd.append('last_name', profile.lastName);
            fd.append('email', profile.email);
            fd.append('phone', profile.phone);
            if (selectedAvatar) {
                fd.append('avatar', selectedAvatar);
            }

            let updatedUserData = null;

            // 2) Update Remote Database
            if (userId && !isDemo) {
                const response = await settingsService.updateProfile(Number(userId), fd as any);
                updatedUserData = response;
                showToast('Administrative profile synchronized with database.', 'success');
            } else if (isDemo) {
                showToast('Profile updated locally (Demo Mode).', 'success');
            }

            // 3) Update Local Session
            const user = authService.getUser();
            if (user) {
                const updatedUser = {
                    ...user,
                    first_name: profile.firstName,
                    last_name: profile.lastName,
                    name: `${profile.firstName} ${profile.lastName}`.trim(),
                    email: profile.email,
                    avatar: updatedUserData?.avatar || user.avatar
                };
                authService.setSession(updatedUser, accessToken, localStorage.getItem('refreshToken') || undefined);
                setCurrentUser(updatedUser);
                if (updatedUserData?.avatar) {
                    setProfile(prev => ({ ...prev, avatar: updatedUserData.avatar }));
                }
                // Notify other components like Layout/Navbar to refresh
                window.dispatchEvent(new Event('profileUpdated'));
            }
            setSelectedAvatar(null);
            setAvatarPreview(null);
        } catch (err: any) {
            let msg = 'Database synchronization failed.';
            if (err?.response?.status === 401) {
                msg = 'Authentication credentials were not provided.';
            } else {
                msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || msg;
            }
            showToast(msg, 'error');
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
        if (!passwords.old) { showToast('Current password is required.', 'error'); return; }
        if (passwords.new !== passwords.confirm) { showToast('New passwords do not match!', 'error'); return; }
        if (passwords.new.length < 8) { showToast('New password must be at least 8 characters.', 'error'); return; }
        setPwSaving(true);
        try {
            const userId = currentUser?.dbId || currentUser?.id;
            if (!userId) throw new Error('User session not found. Please log in again.');
            await settingsService.changePassword(Number(userId), passwords.old, passwords.new, passwords.confirm);
            setPasswords({ old: '', new: '', confirm: '' });
            showToast('Password updated successfully!', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Update failed (Current password may be incorrect).';
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

    const userRole = (currentUser?.role_name || currentUser?.role || '').toString().toLowerCase();
    const isSupplier = userRole === 'supplier';

    const ALL_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'store', label: 'Store', icon: Store },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'appearance', label: 'Appearance', icon: Palette },
    ];

    const TABS = ALL_TABS.filter(t => isSupplier ? ['profile', 'security', 'appearance'].includes(t.id) : true);

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
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6 animate-in fade-in duration-700">
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className={`bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 ${toast.type === 'error' ? 'border-red-500' : 'border-[#FF9900]'}`}>
                        {toast.type === 'error' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" strokeWidth={2.5} />
                        ) : (
                            <CheckCircle className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                        )}
                        <p className="text-xs font-bold uppercase tracking-widest leading-none">{toast.message}</p>
                    </div>
                </div>
            )}

            {/* Header Card */}
            <div className="mb-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 italic uppercase">
                            <Settings className="h-5 w-5 text-[#FF9900]" />
                            Control Panel
                        </h1>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-[0.2em] mt-1">Manage infrastructure, security and platform appearance</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.location.reload()} className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                            <RefreshCw className={`h-4 w-4 ${pageLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Horizontal Tabs */}
                <div className="px-6 py-1 bg-gray-50/50 dark:bg-slate-800/20 overflow-x-auto scroller-hidden">
                    <div className="flex gap-4">
                        {TABS.map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-4 py-4 text-xs font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap
                                        ${active ? 'text-[#FF9900]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <tab.icon className={`h-3.5 w-3.5 ${active ? 'text-[#FF9900]' : ''}`} strokeWidth={active ? 2.5 : 2} />
                                        {tab.label}
                                    </span>
                                    {active && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF9900] rounded-full animate-in slide-in-from-left duration-300"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {/* ══════════════════════════════ PROFILE ══════════════════════════════ */}
                    {activeTab === 'profile' && (
                        <SectionCard title="Profile Information" subtitle="Your personal account details" icon={User}>
                            {/* Avatar */}
                            <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                                <div className="relative">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 dark:border-slate-700">
                                        {avatarPreview || profile.avatar ? (
                                            <img src={avatarPreview || profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black text-[#FF9900]">
                                                {(profile.firstName[0] || '?').toUpperCase()}{(profile.lastName[0] || '').toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-slate-500" title="Upload Photo">
                                        <Camera className="h-3.5 w-3.5" />
                                    </button>
                                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </div>
                                <div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Identity:</span>
                                        <h1 className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{profile.firstName} {profile.lastName}</h1>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{profile.email}</p>
                                    </div>
                                    <span className="mt-3 inline-block px-3 py-1 bg-slate-900 dark:bg-slate-800 text-[#FF9900] text-[9px] font-black uppercase tracking-[0.2em] rounded">
                                        {currentUser?.role_name || currentUser?.role || 'Administrative Authority'}
                                    </span>
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
                                    <div className="relative group">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                                        <input className={`${inputCls} pl-9`} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+92 300 0000000" />
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
                                    <div className="relative group">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                                        <input className={`${inputCls} pl-9`} value={store.website} onChange={e => setStore(s => ({ ...s, website: e.target.value }))} placeholder="www.example.com" />
                                    </div>
                                </Field>
                                <Field label="Store Email">
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                                        <input className={`${inputCls} pl-9`} value={store.email} onChange={e => setStore(s => ({ ...s, email: e.target.value }))} placeholder="store@example.com" />
                                    </div>
                                </Field>
                                <Field label="Store Phone">
                                    <div className="relative group">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                                        <input className={`${inputCls} pl-9`} value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} placeholder="+92 21 1234567" />
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
                                <SaveBtn saving={storeSaving} onClick={handleSaveStore} />
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
                                <SaveBtn saving={notifSaving} onClick={handleSaveNotifications} label="Save Preferences" />
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
                                            <div className="relative group">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-[#FF9900] transition-colors" />
                                                <input
                                                    type={show ? 'text' : 'password'}
                                                    className={`${inputCls} pl-9 pr-9`}
                                                    placeholder={field === 'old' ? 'Enter current password' : field === 'new' ? 'Min. 8 characters' : 'Repeat new password'}
                                                    value={passwords[field as keyof typeof passwords]}
                                                    onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                                                />
                                                <button type="button" onClick={() => toggle(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
                                        className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
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
                                        await new Promise(r => setTimeout(r, 600));
                                        setSecSaving(false);
                                        showToast('Session settings synchronized.', 'success');
                                    }} label="Save Settings" />
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══════════════════════════════ APPEARANCE ══════════════════════════════ */}
                    {activeTab === 'appearance' && (
                        <SectionCard title="Appearance" subtitle="Customize the interface style" icon={Palette}>
                            {/* Theme Mode */}
                            <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">System Theme</p>
                                <div className="grid grid-cols-2 gap-3 max-w-sm">
                                    {(['light', 'dark'] as const).map(t => (
                                        <button key={t} onClick={() => setTheme(t)}
                                            className={`relative p-3 rounded border transition-all duration-200 flex flex-col items-center gap-2 ${theme === t ? 'border-[#FF9900] bg-[#FF9900]/5' : 'border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-gray-300'}`}>
                                            <div className={`w-10 h-10 rounded flex items-center justify-center ${t === 'light' ? 'bg-amber-50' : 'bg-gray-700'}`}>
                                                {t === 'light' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-gray-300" />}
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300">{t} Mode</span>
                                            {theme === t && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#FF9900] rounded-full flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" strokeWidth={4} /></span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Accent Selection */}
                            <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Accent Priority</p>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    {ACCENT_PRESETS.map(color => (
                                        <button key={color} onClick={() => setAccentColor(color)}
                                            className={`w-8 h-8 rounded transition-all duration-200 flex items-center justify-center ${accentColor === color ? 'ring-2 ring-offset-2 ring-[#FF9900]' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}>
                                            {accentColor === color && <Check className="h-3.5 w-3.5 text-white shadow-sm" strokeWidth={4} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Toggle enabled={compactMode} onChange={setCompactMode} label="High Density Mode" description="Optimized spacing for data-heavy administrative workflows" />
                                <Toggle enabled={animations} onChange={setAnimations} label="Interface Motion" description="Smooth transitions and interactive micro-animations" />
                                <Toggle enabled={sidebarCollapsed} onChange={setSidebarCollapsed} label="Minimal Workspace" description="Start with a collapsed sidebar for maximum focus" />
                            </div>

                            <div className="mt-6 flex justify-end">
                                <SaveBtn saving={appearanceSaving} onClick={handleSaveAppearance} label="Save Style" />
                            </div>
                        </SectionCard>
                    )}
                </div>
            </div>
        </div>
    );
}

const ACCENT_PRESETS = ['#FF9900', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
