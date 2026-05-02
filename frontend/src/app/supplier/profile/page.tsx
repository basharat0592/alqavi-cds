'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, ShieldCheck, MapPin, Building, CreditCard, Bell,
    ChevronRight, Camera, Loader2, LogOut, Package, BarChart3, HelpCircle, Key, Headphones,
    Settings, Shield, Info, Lock
} from 'lucide-react';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

export default function SupplierProfile() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('v1/users/profile/');
            setProfile(data);
            setFormData(data);
        } catch (err) {
            console.error("Profile load failed:", err);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setUser(authService.getUser());
        fetchProfile();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await api.patch(`v1/users/${profile.id}/update/`, formData);
            toast.success("Profile updated successfully.");
            fetchProfile();
            setActiveSection(null);
        } catch {
            toast.error("Update failed.");
        } finally {
            setUpdating(false);
        }
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('avatar', file);

        setUploading(true);
        try {
            await api.patch(`v1/users/${profile.id}/update/`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchProfile();
            toast.success("Profile picture updated.");
        } catch {
            toast.error("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.name || 'Partner Account';

    const SECTIONS = [
        { id: 'security', title: 'Login & Security', icon: Shield, desc: 'Update your name, email and basic info.' },
        { id: 'personal', title: 'Business Profile', icon: Info, desc: 'Manage your company details and location.' },
        { id: 'password', title: 'Password Settings', icon: Lock, desc: 'Reset your terminal access credentials.' }
    ];

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        new_password_confirm: ''
    });

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.new_password_confirm) {
            toast.error("New passwords do not match.");
            return;
        }

        setUpdating(true);
        try {
            await api.post(`v1/users/${profile.id}/change-password/`, passwordData);
            toast.success("Password changed successfully.");
            setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' });
            setActiveSection(null);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to change password.");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-[70vh] items-center justify-center bg-white gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#F59E0B]" />
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Authentication Registry...</span>
            </div>
        );
    }

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans text-left">

            {/* ── Page Header ── */}
            <div className="mb-8">
                <h1 className="text-3xl font-medium text-slate-900 mb-2">Partner Account</h1>
                <p className="text-sm text-slate-500 font-medium">Manage your profile, security settings, and business credentials.</p>
            </div>

            {/* ── Master Profile Card ── */}
            <div className="bg-white border border-gray-300 rounded-2xl overflow-hidden shadow-sm mb-10">
                <div className="bg-[#f0f2f2] border-b border-gray-300 px-8 py-6 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group shrink-0">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-400 text-3xl font-bold overflow-hidden border-2 border-white shadow-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300 relative">
                            {uploading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B]" />
                            ) : profile?.avatar ? (
                                <img src={getImageUrl(profile.avatar) || undefined} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-200 font-black">{displayName.charAt(0).toUpperCase()}</span>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            >
                                <Camera size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{displayName}</h2>
                            <span className="inline-flex max-w-fit mx-auto md:mx-0 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 shadow-sm">
                                Verified Node
                            </span>
                        </div>
                        <p className="text-[13px] text-slate-500 font-bold uppercase tracking-widest opacity-70">
                            Partner ID: <span className="text-slate-900">#{(profile?.id || 0).toString().padStart(6, '0')}</span>
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <ShieldCheck size={14} className="text-[#F59E0B]" />
                                Security Active
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                <Building size={14} className="text-[#F59E0B]" />
                                {profile?.company || 'Business Unnamed'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => { authService.logout(); window.location.href = '/login'; }}
                        className="px-8 py-2.5 bg-white border border-gray-300 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-rose-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        <LogOut size={14} /> Exit Console
                    </button>
                </div>
            </div>

            {/* ── Settings Grid ── */}
            {!activeSection ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SECTIONS.map((sec) => (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSection(sec.id)}
                            className="bg-white border border-gray-300 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-[#F59E0B] transition-all text-left flex items-start gap-5 group"
                        >
                            <div className="p-4 bg-slate-50 group-hover:bg-amber-50 text-slate-400 group-hover:text-[#F59E0B] rounded-2xl transition-colors shrink-0">
                                <sec.icon size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-[#F59E0B] transition-colors uppercase">{sec.title}</h3>
                                <p className="text-[13px] text-slate-500 font-medium mt-1 leading-relaxed">{sec.desc}</p>
                            </div>
                        </button>
                    ))}
                    <div className="bg-slate-900 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden group shadow-xl">
                        <Settings className="absolute -right-4 -bottom-4 text-white opacity-10 group-hover:rotate-45 transition-transform" size={100} />
                        <h3 className="text-white text-lg font-black uppercase tracking-widest mb-2 relative z-10">Advanced Config</h3>
                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest relative z-10">Restricted to Hub Admin</p>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-white border border-gray-300 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="px-8 py-6 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveSection(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-gray-200"
                            >
                                <ChevronRight size={20} className="rotate-180" />
                            </button>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                {SECTIONS.find(s => s.id === activeSection)?.title}
                            </h3>
                        </div>
                    </div>

                    <div className="p-10">
                        {activeSection === 'password' ? (
                            <form onSubmit={handlePasswordChange} className="max-w-[400px] space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.old_password}
                                        onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">New Credentials</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Verify New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.new_password_confirm}
                                        onChange={e => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                    />
                                </div>
                                <div className="pt-6">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {updating ? 'Processing...' : 'Authorize Password Reset'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl">
                                {activeSection === 'security' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                            <input
                                                type="text"
                                                value={formData.first_name || ''}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Last Name</label>
                                            <input
                                                type="text"
                                                value={formData.last_name || ''}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Primary Email Node</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Registered Business Entity</label>
                                            <input
                                                type="text"
                                                value={formData.company || ''}
                                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Terminal (Phone)</label>
                                            <input
                                                type="text"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Physical Distribution Node (Address)</label>
                                            <input
                                                type="text"
                                                value={formData.address || ''}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-none focus:border-[#F59E0B] transition-all"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="pt-8 flex items-center gap-4 md:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="h-14 px-12 bg-[#F59E0B] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-900/10 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {updating ? 'Synchronizing...' : 'Save Registry Updates'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(null)}
                                        className="h-14 px-8 border border-gray-300 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                                    >
                                        Abort
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Bottom Disclaimer */}
            <div className="mt-20 pt-10 border-t border-gray-200 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] mb-4">Partner Control Node Ledger v4.1</p>
                <div className="flex justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
                    <HelpCircle size={14} className="text-slate-400" />
                    <Headphones size={14} className="text-slate-400" />
                    <Shield size={14} className="text-slate-400" />
                </div>
            </div>
        </div>
    );
}
