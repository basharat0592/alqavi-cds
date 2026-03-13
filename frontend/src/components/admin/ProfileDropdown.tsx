'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    X, User, Settings, LogOut, ChevronRight,
    Mail, Phone, Eye, EyeOff, Save, Loader2, Check
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { settingsService } from '@/lib/api';

/* ═══════════════════════════════════════════════
   PROFILE DROPDOWN
═══════════════════════════════════════════════ */
export default function ProfileDropdown({
    user, onClose, onLogout, onUpdated
}: {
    user: { name: string; email: string; role: string; id?: string; avatar?: string };
    onClose: () => void;
    onLogout: () => void;
    onUpdated: (name: string, email: string, avatar?: string) => void;
}) {
    const [tab, setTab] = useState<'menu' | 'edit' | 'password'>('menu');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    // Edit profile state
    const [firstName, setFirstName] = useState(user.name.split(' ')[0] || '');
    const [lastName, setLastName] = useState(user.name.split(' ').slice(1).join(' ') || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState('');

    // Password state
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);

    // Load phone on edit tab
    useEffect(() => {
        if (tab === 'edit') {
            settingsService.getProfile().then(p => {
                setFirstName(p.first_name || user.name.split(' ')[0] || '');
                setLastName(p.last_name || user.name.split(' ').slice(1).join(' ') || '');
                setEmail(p.email || user.email || '');
                setPhone(p.phone || '');
            }).catch(() => { });
        }
    }, [tab]);

    const showMsg = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            if (!user.id) throw new Error('no id');
            const response = await settingsService.updateProfile(Number(user.id), {
                first_name: firstName, last_name: lastName, email, phone,
            });
            const fullName = `${firstName} ${lastName}`.trim();
            const u = authService.getUser();
            if (u) {
                const updatedUser = { ...u, name: fullName, email, avatar: response?.avatar || u.avatar };
                authService.setSession(
                    updatedUser,
                    localStorage.getItem('accessToken') || '',
                    localStorage.getItem('refreshToken') || undefined
                );
                onUpdated(fullName, email, updatedUser.avatar);
                window.dispatchEvent(new Event('profileUpdated'));
            }
            showMsg('Profile updated!', true);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                const fullName = `${firstName} ${lastName}`.trim();
                const u = authService.getUser();
                if (u) authService.setSession(
                    { ...u, name: fullName, email },
                    localStorage.getItem('accessToken') || '',
                    localStorage.getItem('refreshToken') || undefined
                );
                onUpdated(fullName, email, u?.avatar);
                showMsg('Saved locally!', true);
            } else {
                showMsg(err?.response?.data?.detail || 'Failed to update.', false);
            }
        } finally { setSaving(false); }
    };

    const handleChangePassword = async () => {
        if (newPw !== confirmPw) { showMsg('Passwords do not match!', false); return; }
        if (newPw.length < 8) { showMsg('Min. 8 characters required.', false); return; }
        setSaving(true);
        try {
            await settingsService.changePassword(Number(user.id), oldPw, newPw, confirmPw);
            setOldPw(''); setNewPw(''); setConfirmPw('');
            showMsg('Password changed!', true);
            setTimeout(() => setTab('menu'), 1500);
        } catch (err: any) {
            showMsg(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to change password.', false);
        } finally { setSaving(false); }
    };

    const initials = (user.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const inputCls = "w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9900]/30 focus:border-[#FF9900] text-sm font-medium text-gray-900 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600";

    const TABS = [
        { id: 'menu' as const, label: 'Menu' },
        { id: 'edit' as const, label: 'Edit Profile' },
        { id: 'password' as const, label: 'Password' },
    ];

    const MENU_ITEMS = [
        { icon: User, label: 'View Profile', href: '/admin/settings', color: 'text-blue-500', bg: 'bg-blue-50' },
        { icon: Settings, label: 'Settings', href: '/admin/settings', color: 'text-[#FF9900]', bg: 'bg-[#FF9900]/10' },
    ];

    const PASSWORD_FIELDS = [
        { label: 'Current Password', val: oldPw, set: setOldPw, show: showOld, toggle: setShowOld, placeholder: 'Current password' },
        { label: 'New Password', val: newPw, set: setNewPw, show: showNew, toggle: setShowNew, placeholder: 'Min. 8 characters' },
        { label: 'Confirm Password', val: confirmPw, set: setConfirmPw, show: showNew, toggle: setShowNew, placeholder: 'Repeat new password' },
    ];

    return (
        <div className="absolute top-full right-0 mt-3 w-[340px] bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Toast */}
            {toast && (
                <div className={`absolute top-3 left-3 right-3 flex items-center gap-2 px-3 py-2.5 text-xs font-bold z-10 rounded-xl shadow-lg
                    ${toast.ok ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                    {toast.ok ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <X className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    {toast.msg}
                </div>
            )}

            {/* Profile Header */}
            <div className="bg-[#232F3E] px-5 pt-5 pb-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FF9900] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg border border-orange-400/20">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-base font-black text-white">{initials}</span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-black text-white text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-300 truncate mt-0.5">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#FF9900]/20 text-[#FF9900] text-[9px] font-black uppercase tracking-widest rounded-md">
                            {user.role}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors flex-shrink-0">
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Tab Pills */}
                <div className="flex gap-1 mt-3">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all
                                ${tab === t.id ? 'bg-[#FF9900] text-[#131921]' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MENU TAB ── */}
            {tab === 'menu' && (
                <div className="py-2">
                    {MENU_ITEMS.map(item => (
                        <Link key={item.label} href={item.href} onClick={onClose}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-[#FF9900]/5 dark:hover:bg-[#FF9900]/10 transition-colors group">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg} dark:bg-opacity-20`}>
                                <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-gray-700 dark:text-slate-300 group-hover:text-[#FF9900] dark:group-hover:text-[#FF9900] flex-1 text-left">{item.label}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" strokeWidth={2.5} />
                        </Link>
                    ))}
                    <div className="mx-4 my-1 border-t border-gray-100 dark:border-slate-800" />
                    <button onClick={onLogout}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors group">
                        <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                            <LogOut className="h-4 w-4 text-red-500" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400 flex-1 text-left">Sign Out</span>
                    </button>
                </div>
            )}

            {/* ── EDIT PROFILE TAB ── */}
            {tab === 'edit' && (
                <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">First Name</label>
                            <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Last Name</label>
                            <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
                            <input className={`${inputCls} pl-9`} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
                            <input className={`${inputCls} pl-9`} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 0000000" />
                        </div>
                    </div>
                    <button onClick={handleSaveProfile} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF9900] text-[#131921] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e68a00] transition-all disabled:opacity-60">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} /> : <Save className="h-3.5 w-3.5" strokeWidth={2.5} />}
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            )}

            {/* ── PASSWORD TAB ── */}
            {tab === 'password' && (
                <div className="px-5 py-4 space-y-3">
                    {PASSWORD_FIELDS.map((f, i) => (
                        <div key={i}>
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{f.label}</label>
                            <div className="relative">
                                <input type={f.show ? 'text' : 'password'} className={`${inputCls} pr-9`}
                                    value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} />
                                <button type="button" onClick={() => f.toggle((v: boolean) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {f.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>
                    ))}

                    {newPw && (
                        <div className="flex gap-1 items-center">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`h-1 flex-1 rounded-full ${newPw.length >= i * 3
                                    ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-orange-400' : i <= 3 ? 'bg-yellow-400' : 'bg-emerald-400'
                                    : 'bg-gray-200 dark:bg-slate-800'}`} />
                            ))}
                            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 ml-1">
                                {newPw.length < 4 ? 'Weak' : newPw.length < 7 ? 'Fair' : newPw.length < 10 ? 'Good' : 'Strong'}
                            </span>
                        </div>
                    )}

                    <button onClick={handleChangePassword}
                        disabled={saving || !oldPw || !newPw || newPw !== confirmPw}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} /> : <Save className="h-3.5 w-3.5" strokeWidth={2.5} />}
                        {saving ? 'Updating...' : 'Change Password'}
                    </button>
                </div>
            )}
        </div>
    );
}
