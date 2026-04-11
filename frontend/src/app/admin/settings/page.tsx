'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    User, Store, Bell, Shield, Palette,
    Save, Camera, Eye, EyeOff, Sun, Moon,
    RefreshCw, Globe, Lock, Key, ChevronRight
} from 'lucide-react';
import { settingsService, companyService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ══════════════════════════════════════════════
   AMAZON DESIGN SYSTEM
   ══════════════════════════════════════════════ */
const AmazonButton = ({ children, onClick, loading, variant = "primary", className = "" }: { children: React.ReactNode; onClick?: () => void; loading?: boolean; variant?: "primary" | "secondary"; className?: string }) => {
    const base = "px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all shadow-sm border focus:ring-2 focus:ring-[#e77600] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2";
    const styles = variant === "primary"
        ? "bg-[#FFD814] hover:bg-[#F7CA00] border-[#FCD200] text-black"
        : "bg-white hover:bg-[#F3F3F3] border-[#DDD] text-black";

    return (
        <button onClick={onClick} disabled={loading} className={`${base} ${styles} ${className}`}>
            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    );
};

const AmazonInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        className={`w-full px-3 py-1.5 border border-[#888c8e] rounded-[3px] text-[13px] focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] outline-none transition-all shadow-inner-sm ${className}`}
        {...props}
    />
);

const SimpleLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[13px] font-bold text-[#111] mb-1 block">{children}</label>
);

/* ════════════════════════════════════════
   MAIN SETTINGS PAGE
   ════════════════════════════════════════ */
type Tab = 'profile' | 'store' | 'notifications' | 'security' | 'display' | 'explorer';

export default function SettingsPage() {
    const [pageLoading, setPageLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [currentUser, setCurrentUser] = useState<any>(null);

    /* ── State ── */
    const [profileSaving, setProfileSaving] = useState(false);
    const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '', avatar: '' });
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [storeSaving, setStoreSaving] = useState(false);
    const [companyId, setCompanyId] = useState<number | null>(null);
    const [store, setStore] = useState({ name: '', email: '', phone: '', website: '', currency: 'PKR', tax_number: '', address: '' });

    const [notifSaving, setNotifSaving] = useState(false);
    const [notif, setNotif] = useState({ notif_new_order: true, notif_low_stock: true, notif_new_user: false, notif_weekly_report: true, notif_marketing: false, notif_sms: false });

    const [pwSaving, setPwSaving] = useState(false);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [animations, setAnimations] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [sidebarVisibility, setSidebarVisibility] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const saved = localStorage.getItem('admin_sidebar_visibility');
        if (saved) setSidebarVisibility(JSON.parse(saved));

        const loadAll = async () => {
            setPageLoading(true);
            try {
                const user = authService.getUser();
                setCurrentUser(user);
                const nameParts = (user?.name || '').split(' ');
                setProfile({ firstName: nameParts[0] || '', lastName: nameParts.slice(1).join(' ') || '', email: user?.email || '', phone: '', avatar: user?.avatar || '' });

                try {
                    const profileData = await settingsService.getProfile();
                    setProfile({ firstName: profileData.first_name || nameParts[0] || '', lastName: profileData.last_name || nameParts.slice(1).join(' ') || '', email: profileData.email || user?.email || '', phone: profileData.phone || '', avatar: profileData.avatar || user?.avatar || '' });
                } catch { }

                try {
                    const companies = await companyService.getAll();
                    if (companies.length > 0) {
                        const c = companies[0];
                        setCompanyId(c.id || null);
                        setStore({ name: c.name || '', email: c.email || '', phone: c.phone || '', website: c.website || '', currency: c.currency || 'PKR', tax_number: c.tax_number || '', address: c.address || '' });
                    }
                } catch { }

                try {
                    const s = await settingsService.getSettings();
                    setNotif({ notif_new_order: s.notif_new_order ?? true, notif_low_stock: s.notif_low_stock ?? true, notif_new_user: s.notif_new_user ?? false, notif_weekly_report: s.notif_weekly_report ?? true, notif_marketing: s.notif_marketing ?? false, notif_sms: s.notif_sms ?? false });
                    setTheme((s.theme as 'light' | 'dark') || 'light');
                    setAnimations(s.animations ?? true);
                    setSidebarCollapsed(s.sidebar_collapsed ?? false);
                } catch { }
            } finally { setPageLoading(false); }
        };
        loadAll();
    }, []);

    const toggleSidebarItem = (href: string) => {
        const newVisibility = { ...sidebarVisibility, [href]: sidebarVisibility[href] === false ? true : false };
        setSidebarVisibility(newVisibility);
        localStorage.setItem('admin_sidebar_visibility', JSON.stringify(newVisibility));
        window.dispatchEvent(new Event('sidebarVisibilityChanged'));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setSelectedAvatar(file); setAvatarPreview(URL.createObjectURL(file)); }
    };

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        try {
            const fd = new FormData();
            fd.append('first_name', profile.firstName); fd.append('last_name', profile.lastName); fd.append('email', profile.email); fd.append('phone', profile.phone);
            if (selectedAvatar) fd.append('avatar', selectedAvatar);
            const updated = await settingsService.updateProfile(Number(currentUser.id), fd as any);
            authService.setSession(updated, localStorage.getItem('accessToken') || '', localStorage.getItem('refreshToken') || '');
            window.dispatchEvent(new Event('profileUpdated'));
            toast.success('Sync complete.');
        } catch { toast.error('Sync failed.'); } finally { setProfileSaving(false); }
    };

    const handleSaveStore = async () => {
        setStoreSaving(true);
        try { if (companyId) await companyService.update(companyId, store as any); toast.success('Infrastructure updated.'); } catch { toast.error('Failed.'); } finally { setStoreSaving(false); }
    };

    const handleSaveAppearance = async (override?: any) => {
        const payload = { theme: override?.theme || theme, animations: override?.animations ?? animations, sidebar_collapsed: override?.sidebarCollapsed ?? sidebarCollapsed };
        try { await settingsService.updateSettings(payload); window.dispatchEvent(new Event('settingsUpdated')); } catch { }
    };

    const isSupplier = currentUser?.role?.toString().toLowerCase() === 'supplier';
    if (pageLoading) return <div className="p-20 text-center font-bold text-slate-300">ADMIN PROTOCOL INITIALIZING...</div>;

    const navItems = [
        { id: 'profile' as Tab, title: 'Profile Info' },
        { id: 'store' as Tab, title: 'Store Details', hidden: isSupplier },
        { id: 'notifications' as Tab, title: 'Notifications', hidden: isSupplier },
        { id: 'security' as Tab, title: 'Login & Security' },
        { id: 'display' as Tab, title: 'Display Settings' },
        { id: 'explorer' as Tab, title: 'All Pages', hidden: isSupplier },
    ].filter(i => !i.hidden);

    return (
        <div className="bg-[#EAEDED] min-h-screen font-sans">
            <div className="bg-white border-b border-[#DDD] sticky top-0 z-40">
                <div className="max-w-[1200px] mx-auto px-4 md:px-8">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] py-2">
                        <Link href="/admin/dashboard" className="hover:text-[#e77600] hover:underline">Your Account</Link>
                        <ChevronRight className="h-2.5 w-2.5" /> <span className="text-[#c45500]">Settings</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4">
                        <h1 className="text-[24px] font-normal text-[#111]">Account Settings</h1>
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                            {navItems.map((item) => (
                                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`px-4 py-2 text-[13px] font-bold whitespace-nowrap rounded-md transition-all ${activeTab === item.id ? "bg-[#FFD814] border-[#FCD200] text-black shadow-sm" : "bg-white hover:bg-[#F3F3F3] border-transparent text-[#007185]"} border`}>{item.title}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto py-10 px-4 md:px-8">
                <div className="animate-in fade-in duration-300">
                    {activeTab === 'profile' && (
                        <div className="bg-white border border-[#DDD] rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-[#F6F6F6] px-5 py-3 border-b border-[#DDD] group flex items-center justify-between">
                                <h2 className="text-[18px] font-bold">Profile Info</h2>
                                <User className="h-4 w-4 text-slate-300 group-hover:text-[#e77600] transition-colors" />
                            </div>
                            <div className="p-8 flex flex-col md:flex-row gap-10">
                                <div className="w-32 flex flex-col items-center gap-3">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border border-[#DDD] bg-[#F3F3F3] flex items-center justify-center">
                                        {avatarPreview || profile.avatar ? <img src={avatarPreview || getImageUrl(profile.avatar) || undefined} alt="Avatar" className="w-full h-full object-cover" /> : <User className="h-10 w-10 text-slate-200" />}
                                    </div>
                                    <AmazonButton variant="secondary" onClick={() => avatarInputRef.current?.click()} className="w-full text-[12px]">Change Photo</AmazonButton>
                                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div><SimpleLabel>First Name</SimpleLabel><AmazonInput value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} /></div>
                                    <div><SimpleLabel>Last Name</SimpleLabel><AmazonInput value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} /></div>
                                    <div><SimpleLabel>Email Address</SimpleLabel><AmazonInput value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
                                    <div><SimpleLabel>Phone Number</SimpleLabel><AmazonInput value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                                    <div className="md:col-span-2 pt-4 flex justify-end"><AmazonButton loading={profileSaving} onClick={handleSaveProfile}>Save Changes</AmazonButton></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'store' && !isSupplier && (
                        <div className="bg-white border border-[#DDD] rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-[#F6F6F6] px-5 py-3 border-b border-[#DDD] flex items-center justify-between">
                                <h2 className="text-[18px] font-bold">Store Details</h2>
                                <Store className="h-4 w-4 text-slate-300" />
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <div><SimpleLabel>Store Name</SimpleLabel><AmazonInput value={store.name} onChange={e => setStore(s => ({ ...s, name: e.target.value }))} /></div>
                                <div><SimpleLabel>Website</SimpleLabel><AmazonInput value={store.website} onChange={e => setStore(s => ({ ...s, website: e.target.value }))} /></div>
                                <div><SimpleLabel>Regional Phone</SimpleLabel><AmazonInput value={store.phone} onChange={e => setStore(s => ({ ...s, phone: e.target.value }))} /></div>
                                <div><SimpleLabel>Tax ID / NTN</SimpleLabel><AmazonInput value={store.tax_number} onChange={e => setStore(s => ({ ...s, tax_number: e.target.value }))} /></div>
                                <div className="md:col-span-2"><SimpleLabel>Address</SimpleLabel><AmazonInput value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} /></div>
                                <div className="md:col-span-2 pt-4 flex justify-end"><AmazonButton loading={storeSaving} onClick={handleSaveStore}>Update Store Info</AmazonButton></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'notifications' && !isSupplier && (
                        <div className="bg-white border border-[#DDD] rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-[#F6F6F6] px-5 py-3 border-b border-[#DDD] flex items-center justify-between"><h2 className="text-[18px] font-bold">Notifications</h2><Bell className="h-4 w-4 text-slate-300" /></div>
                            <div className="p-8 space-y-4">
                                {[{ k: 'notif_new_order', l: 'Inbound Fulfillment Alerts', d: 'Notify on new order arrival' }, { k: 'notif_low_stock', l: 'Inventory Threshold Alerts', d: 'Trigger on critical low stock' }, { k: 'notif_weekly_report', l: 'Analytical Mesh', d: 'Weekly system health reports' }, { k: 'notif_sms', l: 'SMS Trigger', d: 'Emergency cellular alerts' }].map(f => (
                                    <div key={f.k} className="flex items-center justify-between py-3 border-b border-[#F3F3F3] last:border-0">
                                        <div><p className="text-[14px] font-bold">{f.l}</p><p className="text-[12px] text-[#565959]">{f.d}</p></div>
                                        <input type="checkbox" checked={(notif as any)[f.k]} onChange={e => setNotif(n => ({ ...n, [f.k]: e.target.checked }))} className="w-5 h-5 accent-[#e77600]" />
                                    </div>
                                ))}
                                <div className="pt-6 flex justify-end"><AmazonButton loading={notifSaving} onClick={async () => { setNotifSaving(true); try { await settingsService.updateSettings(notif); toast.success('Alerts synced.'); } catch { toast.error('Failed.'); } finally { setNotifSaving(false); } }}>Sync Notification Mesh</AmazonButton></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'security' && (
                        <div className="bg-white border border-[#DDD] rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-[#F6F6F6] px-5 py-3 border-b border-[#DDD] flex items-center justify-between"><h2 className="text-[18px] font-bold">Login & Security</h2><Shield className="h-4 w-4 text-slate-300" /></div>
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div><SimpleLabel>Current Password</SimpleLabel><AmazonInput type="password" value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} /></div>
                                    <div className="hidden md:block"></div>
                                    <div><SimpleLabel>New Password</SimpleLabel><AmazonInput type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} /></div>
                                    <div><SimpleLabel>Re-enter New Password</SimpleLabel><AmazonInput type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} /></div>
                                    <div className="md:col-span-2 flex justify-end pt-4"><AmazonButton loading={pwSaving} onClick={async () => { if (!passwords.old || !passwords.new) { toast.error('Incomplete data.'); return; } setPwSaving(true); try { await settingsService.changePassword(Number(currentUser.id), passwords.old, passwords.new, passwords.confirm); setPasswords({ old: '', new: '', confirm: '' }); toast.success('Credentials rotated.'); } catch { toast.error('Verification failed.'); } finally { setPwSaving(false); } }}>Rotate Credentials</AmazonButton></div>
                                </div>
                                <div className="pt-10 border-t border-[#DDD]">
                                    <h3 className="text-red-700 font-bold mb-2">Danger Zone</h3>
                                    <p className="text-[13px] text-[#565959] mb-4">Permanently purge your account from Alqavi Mesh. Action is irreversible.</p>
                                    <AmazonButton variant="secondary" className="border-red-200 text-red-600 hover:bg-red-50">Purge Account</AmazonButton>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'display' && (
                        <div className="bg-white border border-[#DDD] rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-[#F6F6F6] px-5 py-3 border-b border-[#DDD] flex items-center justify-between"><h2 className="text-[18px] font-bold">Display Settings</h2><Palette className="h-4 w-4 text-slate-300" /></div>
                            <div className="p-8 space-y-10">
                                <div><SimpleLabel>Appearance Protocol</SimpleLabel><div className="flex gap-4 mt-2">{['light', 'dark'].map(t => (
                                    <button key={t} onClick={() => { setTheme(t as any); handleSaveAppearance({ theme: t }); }} className={`px-6 py-4 border rounded-md flex flex-col items-center gap-2 transition-all ${theme === t ? "border-[#e77600] bg-[#FFF8F2]" : "border-[#DDD] hover:bg-[#F9F9F9]"}`}>
                                        {t === 'light' ? <Sun className="h-6 w-6 text-yellow-600" /> : <Moon className="h-6 w-6 text-slate-600" />}
                                        <span className="text-[13px] font-bold capitalize">{t} Mode</span>
                                    </button>
                                ))}</div></div>
                                <div className="space-y-4 pt-4 border-t border-[#F3F3F3]">
                                    <div className="flex items-center justify-between"><div><p className="font-bold text-[14px]">Mesh Animations</p><p className="text-[12px] text-[#565959]">Enable interactive animations</p></div><input type="checkbox" checked={animations} onChange={e => { setAnimations(e.target.checked); handleSaveAppearance({ animations: e.target.checked }); }} className="w-5 h-5 accent-[#e77600]" /></div>
                                    <div className="flex items-center justify-between"><div><p className="font-bold text-[14px]">Minimal Layout</p><p className="text-[12px] text-[#565959]">Start with persistent sidebar collapse</p></div><input type="checkbox" checked={sidebarCollapsed} onChange={e => { setSidebarCollapsed(e.target.checked); handleSaveAppearance({ sidebarCollapsed: e.target.checked }); }} className="w-5 h-5 accent-[#e77600]" /></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'explorer' && !isSupplier && (
                        <div className="bg-white border border-[#DDD] rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-[#F6F6F6] px-5 py-3 border-b border-[#DDD] flex items-center justify-between"><h2 className="text-[18px] font-bold">Registry Explorer (Full Mesh)</h2><Globe className="h-4 w-4 text-[#e77600]" /></div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
                                    {[
                                        { label: 'Operations', items: [{ name: 'Dashboard', href: '/admin/dashboard' }, { name: 'Sale Point (POS)', href: '/admin/sale' }, { name: 'Recent Orders', href: '/admin/sales/recent' }, { name: 'System Alerts', href: '/admin/alerts' }] },
                                        { label: 'Catalog', items: [{ name: 'All Products', href: '/admin/products' }, { name: 'Categories', href: '/admin/products/main-categories' }, { name: 'Sub Categories', href: '/admin/products/categories' }] },
                                        { label: 'Inventory', items: [{ name: 'Stock List', href: '/admin/inventory/list' }, { name: 'Warehouses', href: '/admin/inventory/warehouses' }, { name: 'Stock Movements', href: '/admin/inventory/movements' }, { name: 'Adjustments', href: '/admin/inventory/adjustments' }] },
                                        { label: 'Purchasing', items: [{ name: 'Suppliers', href: '/admin/company/suppliers' }, { name: 'Purchase Orders', href: '/admin/purchases' }, { name: 'Purchase Returns', href: '/admin/purchases/returns' }, { name: 'Company', href: '/admin/company' }] },
                                        { label: 'Sales Flow', items: [{ name: 'Sales Ledger', href: '/admin/sales' }, { name: 'Payments', href: '/admin/payments' }, { name: 'Customer Balance', href: '/admin/payments/customer' }, { name: 'Return Registry', href: '/admin/sale-returns' }] },
                                        { label: 'Security & Core', items: [{ name: 'Reports', href: '/admin/reports' }, { name: 'Profit & Loss', href: '/admin/reports?type=accounting' }, { name: 'System Users', href: '/admin/users' }, { name: 'Roles', href: '/admin/users/roles' }, { name: 'Permissions', href: '/admin/users/permissions' }] }
                                    ].map(group => (
                                        <div key={group.label} className="flex flex-col">
                                            <h3 className="font-bold text-[14px] text-[#111] border-b border-[#EEE] pb-1.5 mb-4 uppercase tracking-tight">{group.label}</h3>
                                            <div className="space-y-4">
                                                {group.items.map(item => {
                                                    const isVisible = sidebarVisibility[item.href] !== false;
                                                    return (
                                                        <div key={item.href} className="flex items-center justify-between group">
                                                            <Link href={item.href} className={`text-[13.5px] font-medium transition-all hover:text-[#e77600] hover:underline ${!isVisible ? 'text-slate-300 line-through' : 'text-[#007185]'}`}>{item.name}</Link>
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => toggleSidebarItem(item.href)} className={`text-[11px] font-black uppercase tracking-tighter ${isVisible ? 'text-[#e77600]' : 'text-slate-400 opacity-50'}`}>{isVisible ? 'Hide' : 'Show'}</button>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${isVisible ? 'bg-green-500' : 'bg-slate-200'}`} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-[#F6F6F6] p-4 text-center border-t border-[#DDD]"><p className="text-[12px] text-[#565959]">Registry changes are synced instantly with the primary sidebar.</p></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
