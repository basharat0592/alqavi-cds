'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, ShieldCheck, MapPin, Building, CreditCard, Bell,
    ChevronRight, Camera, Loader2, LogOut, Package, BarChart3, HelpCircle, Key, Headphones,
    Settings, Shield, Info, Lock, X, Eye
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
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [viewingAvatar, setViewingAvatar] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowAvatarMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await api.patch(`v1/users/${profile.id}/update/`, formData);
            toast.success("Profile updated successfully.");
            fetchProfile();
            // Trigger layout sync
            window.dispatchEvent(new Event('supplier_profile_updated'));
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
            // Trigger layout sync
            window.dispatchEvent(new Event('supplier_profile_updated'));
            toast.success("Profile picture updated.");
        } catch {
            toast.error("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.name || 'My Account';

    const SECTIONS = [
        { id: 'security', title: 'Personal Info', icon: User, desc: 'Update your name and email address.' },
        { id: 'personal', title: 'Business Details', icon: Building, desc: 'Manage your company name, phone and address.' },
        { id: 'password', title: 'Security', icon: Key, desc: 'Change your account password.' }
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
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                <span className="text-sm font-medium text-slate-500">Loading your profile...</span>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 font-sans text-left p-6">

            {/* ── Page Header (Same as Orders Page) ── */}
            <div className="mb-6">
                <div className="flex items-end justify-between mb-1">
                    <div>
                        <h1 className="text-3xl font-medium text-slate-900 leading-tight">Supplier Profile</h1>
                        <p className="text-[13px] text-slate-500 mt-1 font-medium">Manage your personal information, business credentials, and security settings.</p>
                    </div>
                    <button
                        onClick={() => { authService.logout(); window.location.href = '/login'; }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 border border-gray-300 bg-white rounded-lg hover:bg-rose-50 transition-all shadow-sm"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* ── Profile Snapshot Card ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8 p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative shrink-0" ref={menuRef}>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        <button
                            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                            className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-3xl font-bold overflow-hidden border-4 border-white shadow-md hover:shadow-lg transition-all relative group"
                        >
                            {uploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
                            ) : profile?.avatar ? (
                                <img src={getImageUrl(profile.avatar) || undefined} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{displayName.charAt(0).toUpperCase()}</span>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Camera size={20} />
                            </div>
                        </button>

                        {/* Avatar Menu */}
                        {showAvatarMenu && (
                            <div className="absolute top-full left-0 mt-3 w-52 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => { setViewingAvatar(true); setShowAvatarMenu(false); }}
                                    className="w-full px-5 py-4 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                >
                                    <Eye size={16} className="text-slate-400" />
                                    View Photo
                                </button>
                                <button
                                    onClick={() => { fileInputRef.current?.click(); setShowAvatarMenu(false); }}
                                    className="w-full px-5 py-4 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 border-t border-gray-100 flex items-center gap-3 transition-colors"
                                >
                                    <Camera size={16} className="text-slate-400" />
                                    Update Photo
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
                            <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded border border-emerald-200 tracking-widest">
                                Active Account
                            </span>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-medium">
                                <Building size={14} className="text-slate-300" />
                                {profile?.company || 'Distributor'}
                            </div>
                            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-medium">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Verified Node
                            </div>
                            <div className="text-[13px] text-slate-400 font-bold">
                                #{(profile?.id || 0).toString().slice(0, 8).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Settings Navigation ── */}
            {!activeSection ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {SECTIONS.map((sec) => (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSection(sec.id)}
                            className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:border-[#F59E0B] hover:shadow-md transition-all text-left flex flex-col gap-6 group"
                        >
                            <div className="w-14 h-14 flex items-center justify-center bg-slate-50 group-hover:bg-amber-50 text-slate-400 group-hover:text-[#F59E0B] rounded-xl transition-all">
                                <sec.icon size={28} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-[#F59E0B] transition-colors uppercase tracking-tight">{sec.title}</h3>
                                <p className="text-[13px] text-slate-500 mt-2 leading-relaxed font-medium">{sec.desc}</p>
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-[11px] font-black text-[#F59E0B] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                Configure <ChevronRight size={12} />
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md animate-in slide-in-from-top-4 duration-300">
                    <div className="px-8 py-5 bg-slate-50 border-b border-gray-200 flex items-center gap-4">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-gray-200"
                        >
                            <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                                {SECTIONS.find(s => s.id === activeSection)?.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">Update your account settings</p>
                        </div>
                    </div>

                    <div className="p-10">
                        {activeSection === 'password' ? (
                            <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.old_password}
                                        onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">New Password</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={passwordData.new_password}
                                            onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Confirm New</label>
                                        <input
                                            type="password"
                                            required
                                            value={passwordData.new_password_confirm}
                                            onChange={e => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="pt-6 flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
                                    >
                                        {updating ? 'Processing...' : 'Save Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(null)}
                                        className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl">
                                {activeSection === 'security' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">First Name</label>
                                            <input
                                                type="text"
                                                value={formData.first_name || ''}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Last Name</label>
                                            <input
                                                type="text"
                                                value={formData.last_name || ''}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                                                readOnly
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Company / Business Legal Name</label>
                                            <input
                                                type="text"
                                                value={formData.company || ''}
                                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Primary Contact Number</label>
                                            <input
                                                type="text"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">City</label>
                                            <input
                                                type="text"
                                                value={formData.city || ''}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Business Headquarters Address</label>
                                            <input
                                                type="text"
                                                value={formData.address || ''}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F59E0B] focus:bg-white transition-all"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="pt-8 flex items-center gap-4 md:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="px-10 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                                    >
                                        {updating ? 'Saving Changes...' : 'Synchronize Profile'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(null)}
                                        className="px-8 py-3 border border-gray-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── View Avatar Modal ── */}
            {viewingAvatar && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
                    <button 
                        onClick={() => setViewingAvatar(false)}
                        className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="max-w-xl w-full aspect-square bg-white rounded-[40px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 border-8 border-white/10">
                        {profile?.avatar ? (
                            <img src={getImageUrl(profile.avatar) || undefined} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-200 text-9xl font-bold">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        
                        <div className="absolute bottom-0 inset-x-0 p-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                            <h3 className="text-white text-2xl font-bold">{displayName}</h3>
                            <p className="text-white/60 text-sm font-medium">Business Partner Profile</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
