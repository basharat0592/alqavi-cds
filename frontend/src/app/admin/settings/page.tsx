'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Settings, User, Store, Bell, Shield, Palette,
    Save, Camera, Eye, EyeOff, Check, X, Sun, Moon,
    Mail, Phone, Globe, Lock, Key, AlertTriangle, Trash2,
    Upload, Loader2, RefreshCw, CheckCircle, Building2,
    Monitor, ShieldCheck, CreditCard, ChevronRight, Hash
} from 'lucide-react';
import { settingsService, companyService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'profile' | 'store' | 'notifications' | 'security' | 'appearance';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES (Synchronized with Company Hub)
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#F7CA00]" />
            <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const PRIMARY_BTN = "bg-[#F7CA00] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";

const INPUT_CLS = "w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#F7CA00] focus:ring-4 focus:ring-[#F7CA00]/10 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400";
const LABEL_CLS = "text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 block";

/* ─── Field Layout ─── */
function Field({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) {
    return (
        <div className="flex flex-col">
            <label className={LABEL_CLS}>{label}</label>
            {children}
            {description && <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">{description}</p>}
        </div>
    );
}

/* ─── Toggle ─── */
function Toggle({ enabled, onChange, label, description }: { enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string; }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5 last:border-0 group">
            <div className="pr-4">
                <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-[#F7CA00] transition-colors">{label}</p>
                {description && <p className="text-[10px] font-medium text-slate-400 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${enabled ? 'bg-[#F7CA00]' : 'bg-slate-200 dark:bg-white/10'}`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
                />
            </button>
        </div>
    );
}

/* ════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════ */
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
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
    const [accentColor, setAccentColor] = useState('#F7CA00');
    const [compactMode, setCompactMode] = useState(false);
    const [animations, setAnimations] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    /* ─── Load all data on mount ─── */
    useEffect(() => {
        const loadAll = async () => {
            setPageLoading(true);
            try {
                const user = authService.getUser();
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

                // 2) Full profile from backend
                try {
                    const profileData = await settingsService.getProfile();
                    setProfile({
                        firstName: profileData.first_name || nameParts[0] || '',
                        lastName: profileData.last_name || nameParts.slice(1).join(' ') || '',
                        email: profileData.email || user?.email || '',
                        phone: profileData.phone || '',
                        avatar: profileData.avatar || user?.avatar || '',
                    });
                    setCurrentUser((u: any) => ({ ...u, dbId: profileData.id }));
                } catch { /* fallback to local */ }

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

                // 4) User Settings
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
                    setAccentColor(s.accent_color || '#F7CA00');
                    setCompactMode(s.compact_mode ?? false);
                    setAnimations(s.animations ?? true);
                    setSidebarCollapsed(s.sidebar_collapsed ?? false);
                } catch { /* offline fallback exists in api service logic usually */ }

            } finally {
                setPageLoading(false);
            }
        };
        loadAll();
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        const accessToken = localStorage.getItem('accessToken') || '';
        const isDemo = accessToken.startsWith('demo-token-');

        try {
            // Standardize ID retrieval from session
            const userId = currentUser?.id;
            if (!userId && !isDemo) {
                throw new Error('Identity identifier lost. Sync protocol aborted.');
            }
            
            const fd = new FormData();
            fd.append('first_name', profile.firstName || '');
            fd.append('last_name', profile.lastName || '');
            fd.append('email', profile.email || '');
            fd.append('phone', profile.phone || '');
            if (selectedAvatar) fd.append('avatar', selectedAvatar);

            let updatedUserData = null;
            if (userId && !isDemo) {
                // Number() is safe for integer IDs even when represented as strings
                updatedUserData = await settingsService.updateProfile(Number(userId), fd as any);
                toast.success('Identity registry synchronized.');
            } else if (isDemo) {
                toast.success('Local cache updated (Demo Mode).');
            }

            // Reconstruct the user object for the session
            const user = authService.getUser();
            if (user) {
                const updatedUser = {
                    ...user,
                    first_name: profile.firstName,
                    last_name: profile.lastName,
                    name: `${profile.firstName} ${profile.lastName}`.trim() || user.name,
                    email: profile.email,
                    phone: profile.phone,
                    avatar: updatedUserData?.avatar || user.avatar
                };
                
                // Persist to localStorage
                authService.setSession(updatedUser, accessToken, localStorage.getItem('refreshToken') || undefined);
                setCurrentUser(updatedUser);
                
                // Signal to layout/navbar to refresh state
                window.dispatchEvent(new Event('profileUpdated'));
                
                // Also update the local profile state with what came back from DB
                if (updatedUserData) {
                    setProfile(prev => ({
                        ...prev,
                        avatar: updatedUserData.avatar || prev.avatar
                    }));
                }
            }
            setSelectedAvatar(null);
            setAvatarPreview(null);
        } catch (err: any) {
            console.error("Profile sync failure:", err);
            
            // Extract meaningful error detail if possible
            const errorDetail = err.response?.data?.detail 
                || (typeof err.response?.data === 'object' ? Object.values(err.response.data)[0] : null)
                || err.message 
                || 'Identity sync failure. Verify network connection.';
            
            toast.error(typeof errorDetail === 'string' ? errorDetail : 'Identity mesh synchronization failed.');
        } finally {
            setProfileSaving(false);
        }
    };

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
            toast.success('Infrastructure settings updated.');
        } catch (err: any) {
            toast.error('Failed to update store metadata.');
        } finally {
            setStoreSaving(false);
        }
    };

    const handleSaveNotifications = async () => {
        setNotifSaving(true);
        try {
            await settingsService.updateSettings(notif);
            toast.success('Protocol preferences updated.');
        } catch (err: any) {
            toast.error('Failed to sync preferences.');
        } finally {
            setNotifSaving(false);
        }
    };

    const handleSavePassword = async () => {
        if (!passwords.old) { toast.error('Verification code required.'); return; }
        if (passwords.new.length < 8) { toast.error('Security sequence requires 8+ characters.'); return; }
        if (passwords.new !== passwords.confirm) { toast.error('Security sequences do not match.'); return; }

        setPwSaving(true);
        try {
            const userId = currentUser?.id;
            if (!userId) throw new Error('Identity identifier lost.');

            await settingsService.changePassword(Number(userId), passwords.old, passwords.new, passwords.confirm);
            
            setPasswords({ old: '', new: '', confirm: '' });
            toast.success('Access credentials rotated successfully.');
        } catch (err: any) {
            console.error('Password sync failure:', err);
            const msg = err.response?.data?.error || err.response?.data?.detail || 'Verification failure. Sequence rejected.';
            toast.error(msg);
        } finally {
            setPwSaving(false);
        }
    };

    const handleSaveAppearance = async (override?: any) => {
        setAppearanceSaving(true);
        const payload = { 
            theme: override?.theme || theme, 
            accent_color: override?.accentColor || accentColor, 
            compact_mode: override?.compactMode ?? compactMode, 
            animations: override?.animations ?? animations, 
            sidebar_collapsed: override?.sidebarCollapsed ?? sidebarCollapsed 
        };
        try {
            await settingsService.updateSettings(payload);
            window.dispatchEvent(new Event('settingsUpdated'));
            if (!override) toast.success('UI parameters synchronized.');
        } catch (err: any) {
            console.error('Appearance sync fail', err);
        } finally {
            setAppearanceSaving(false);
        }
    };

    const userRole = (currentUser?.role_name || currentUser?.role || '').toString().toLowerCase();
    const isSupplier = userRole === 'supplier';

    const TABS: { id: Tab; label: string; icon: any }[] = [
        { id: 'profile', label: 'Identity', icon: User },
        { id: 'store', label: 'Nodes', icon: Store },
        { id: 'notifications', label: 'Alerts', icon: Bell },
        { id: 'security', label: 'Shield', icon: Shield },
        { id: 'appearance', label: 'Display', icon: Palette },
    ].filter(t => isSupplier ? ['profile', 'security', 'appearance'].includes(t.id) : true) as any;

    if (pageLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <RefreshCw className="h-8 w-8 text-[#F7CA00] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Initializing Control Plane...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans animate-in fade-in duration-500">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F7CA00] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Control Center</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Administrative Environment Configuration</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => window.location.reload()} className={SECONDARY_BTN}>
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* ── Tab Sidebar (Vertical on Desktop) ── */}
                <div className="lg:col-span-3 space-y-1">
                    {TABS.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group
                                    ${active 
                                        ? 'bg-[#F7CA00] text-white shadow-xl shadow-blue-500/20' 
                                        : 'bg-white dark:bg-[#1B1C1E] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-[#F7CA00]/30 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <tab.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400'}`} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">{tab.label}</span>
                                </div>
                                {active && <ChevronRight className="h-4 w-4 animate-in slide-in-from-left-2 duration-300" />}
                            </button>
                        );
                    })}
                </div>

                {/* ── Main Panel ── */}
                <div className="lg:col-span-9 animate-in slide-in-from-right-4 duration-500">
                    
                    {/* PROFILE IDENTITIY */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <SectionCard>
                                <SectionHeader title="Operator Identity" icon={User} subtitle="Account profile nodes" />
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8 pb-8 border-b border-slate-100 dark:border-white/5">
                                        <div className="relative group">
                                            <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-200 dark:border-white/10 group-hover:border-[#F7CA00] transition-all duration-500 shadow-inner">
                                                {avatarPreview || profile.avatar ? (
                                                    <img src={avatarPreview || getImageUrl(profile.avatar) || ''} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="h-10 w-10 text-slate-300" />
                                                )}
                                            </div>
                                            <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#F7CA00] text-white rounded-lg shadow-lg flex items-center justify-center hover:scale-110 transition-all active:scale-95 group-hover:rotate-12">
                                                <Camera className="h-4 w-4" />
                                            </button>
                                            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/10 text-[#F7CA00] text-[9px] font-black uppercase tracking-widest mb-1 shadow-sm border border-blue-100 dark:border-blue-900/20">
                                                Active Session
                                            </div>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">{profile.firstName} {profile.lastName}</h2>
                                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{profile.email}</p>
                                            <div className="flex justify-center md:justify-start gap-4">
                                                <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">{userRole || 'Admin'}</div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-[#F7CA00] uppercase tracking-widest">
                                                    <ShieldCheck className="h-3 w-3" /> Encrypted Access
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field label="First Name Mapping">
                                            <input className={INPUT_CLS} value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                                        </Field>
                                        <Field label="Last Name Mapping">
                                            <input className={INPUT_CLS} value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                                        </Field>
                                        <Field label="Network Email">
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                                                <input className={`${INPUT_CLS} pl-10`} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                                            </div>
                                        </Field>
                                        <Field label="Identity Phone">
                                            <div className="relative group">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                                                <input className={`${INPUT_CLS} pl-10`} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                                            </div>
                                        </Field>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                                        <button onClick={handleSaveProfile} disabled={profileSaving} className={PRIMARY_BTN}>
                                            {profileSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            Sync Identity
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* INFRASTRUCTURE / STORE */}
                    {activeTab === 'store' && (
                        <SectionCard>
                            <SectionHeader title="Infrastructure Metadata" icon={Store} subtitle="System node configuration" />
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field label="Organization Label">
                                        <div className="relative group">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                                            <input className={`${INPUT_CLS} pl-10`} value={store.name} onChange={e => setStore(s => ({ ...s, name: e.target.value }))} />
                                        </div>
                                    </Field>
                                    <Field label="Public Mesh Portal (Website)">
                                        <div className="relative group">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                                            <input className={`${INPUT_CLS} pl-10`} value={store.website} onChange={e => setStore(s => ({ ...s, website: e.target.value }))} />
                                        </div>
                                    </Field>
                                    <Field label="Support Mesh (Email)">
                                        <input className={INPUT_CLS} value={store.email} onChange={e => setStore(s => ({ ...s, email: e.target.value }))} />
                                    </Field>
                                    <Field label="Regional Mesh (Phone)">
                                        <input className={INPUT_CLS} value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} />
                                    </Field>
                                    <Field label="System Currency">
                                        <select className={INPUT_CLS} value={store.currency} onChange={e => setStore(s => ({ ...s, currency: e.target.value }))}>
                                            <option value="PKR">PKR — Pakistani Rupee</option>
                                            <option value="USD">USD — US Dollar</option>
                                        </select>
                                    </Field>
                                    <Field label="Fiscal Registry (Tax ID)">
                                        <div className="relative group">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                                            <input className={`${INPUT_CLS} pl-10`} value={store.tax_number} onChange={e => setStore(s => ({ ...s, tax_number: e.target.value }))} />
                                        </div>
                                    </Field>
                                    <div className="md:col-span-2">
                                        <Field label="Geographic Node (Address)">
                                            <textarea rows={2} className={`${INPUT_CLS} resize-none`} value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} />
                                        </Field>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                                    <button onClick={handleSaveStore} disabled={storeSaving} className={PRIMARY_BTN}>
                                        {storeSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        Initialize Metadata
                                    </button>
                                </div>
                            </div>
                        </SectionCard>
                    )}

                    {/* ALERTS / NOTIFICATIONS */}
                    {activeTab === 'notifications' && (
                        <SectionCard>
                            <SectionHeader title="Alert Protocols" icon={Bell} subtitle="System event notification mesh" />
                            <div className="p-6">
                                <div className="bg-slate-50 dark:bg-white/5 px-4 py-2 border border-blue-100 dark:border-blue-900/20 rounded-lg mb-6">
                                    <p className="text-[10px] font-black text-[#F7CA00] uppercase tracking-widest">Network Alert Configuration</p>
                                </div>
                                <div className="space-y-4">
                                    <Toggle enabled={notif.notif_new_order} onChange={v => setNotif(n => ({ ...n, notif_new_order: v }))} label="Inbound Fulfillment Alerts" description="Notify on new order packet arrival" />
                                    <Toggle enabled={notif.notif_low_stock} onChange={v => setNotif(n => ({ ...n, notif_low_stock: v }))} label="Inventory Threshold Alerts" description="Trigger warning on critical low stock units" />
                                    <Toggle enabled={notif.notif_new_user} onChange={v => setNotif(n => ({ ...n, notif_new_user: v }))} label="Identity Registration Packets" description="Log entry for new platform identities" />
                                    <Toggle enabled={notif.notif_weekly_report} onChange={v => setNotif(n => ({ ...n, notif_weekly_report: v }))} label="Performance Analytical Mesh" description="Aggregate weekly system health and sales report" />
                                    <Toggle enabled={notif.notif_sms} onChange={v => setNotif(n => ({ ...n, notif_sms: v }))} label="Off-Mesh SMS Trigger" description="Emergency cellular alerts for critical runtime events" />
                                </div>
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                                    <button onClick={handleSaveNotifications} disabled={notifSaving} className={PRIMARY_BTN}>
                                        Sync Protocols
                                    </button>
                                </div>
                            </div>
                        </SectionCard>
                    )}

                    {/* SHIELD / SECURITY */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <SectionCard>
                                <SectionHeader title="Access Credentials" icon={Lock} subtitle="Secure transmission gateway" />
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <Field label="Current Verification Code (Old Password)">
                                                <div className="relative group">
                                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                                                    <input type={showOld ? 'text' : 'password'} className={`${INPUT_CLS} pl-10 pr-10`} value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} />
                                                    <button onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                        {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </Field>
                                        </div>
                                        <Field label="New Security Sequence">
                                            <div className="relative">
                                                <input type={showNew ? 'text' : 'password'} className={`${INPUT_CLS} pr-10`} value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
                                                <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                        <Field label="Confirm Security Sequence">
                                            <div className="relative">
                                                <input type={showConfirm ? 'text' : 'password'} className={`${INPUT_CLS} pr-10`} value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
                                                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </Field>
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                                        <button onClick={handleSavePassword} disabled={pwSaving} className={PRIMARY_BTN}>
                                            Rotate Credentials
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Danger Zone */}
                            <SectionCard className="border-red-200 dark:border-red-900/30">
                                <SectionHeader title="Critical Protocols" icon={AlertTriangle} subtitle="Destructive system operations" />
                                <div className="p-6 bg-red-50/20 dark:bg-red-900/5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                                            <Trash2 className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-black text-red-800 dark:text-red-400 uppercase tracking-tight mb-1">Identity Termination</p>
                                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mb-4 uppercase tracking-tighter">Initiating this protocol will permanently purge your administrative profile and all associated mesh links from the platform. This action is irreversible.</p>
                                            <button className="px-4 py-2 border-2 border-red-200 dark:border-red-900/30 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95">Purge Identity</button>
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* DISPLAY / APPEARANCE */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <SectionCard>
                                <SectionHeader title="Interface Configuration" icon={Palette} subtitle="Workspace visual parameters" />
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-100 dark:border-white/5">
                                        <div>
                                            <p className={LABEL_CLS}>Master Theme Mode</p>
                                            <div className="flex gap-4">
                                                {(['light', 'dark'] as const).map(t => (
                                                    <button key={t} 
                                                        onClick={() => { setTheme(t); handleSaveAppearance({ theme: t }); }} 
                                                        className={`flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all ${theme === t ? 'bg-[#F7CA00] text-white border-[#F7CA00] shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-[#F7CA00]/30'}`}>
                                                        {t === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                                        <span className="text-[11px] font-black uppercase tracking-widest">{t}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className={LABEL_CLS}>Interface Density</p>
                                            <div className="flex gap-4">
                                                {[false, true].map(v => (
                                                    <button key={String(v)} 
                                                        onClick={() => { setCompactMode(v); handleSaveAppearance({ compactMode: v }); }} 
                                                        className={`flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all ${compactMode === v ? 'bg-[#F7CA00] text-white border-[#F7CA00] shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-[#F7CA00]/30'}`}>
                                                        <Monitor className="h-5 w-5" />
                                                        <span className="text-[11px] font-black uppercase tracking-widest">{v ? 'Compact' : 'Standard'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Toggle 
                                            enabled={animations} 
                                            onChange={(v) => { setAnimations(v); handleSaveAppearance({ animations: v }); }} 
                                            label="Mesh Motion Transitions" 
                                            description="Interactive micro-animations and smooth state changes" 
                                        />
                                        <Toggle 
                                            enabled={sidebarCollapsed} 
                                            onChange={(v) => { setSidebarCollapsed(v); handleSaveAppearance({ sidebarCollapsed: v }); }} 
                                            label="Minimal Workspace Layout" 
                                            description="Initialize administrative view with persistent sidebar collapse" 
                                        />
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
                                        <button onClick={handleSaveAppearance} disabled={appearanceSaving} className={PRIMARY_BTN}>
                                            Sync Style Parameters
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
