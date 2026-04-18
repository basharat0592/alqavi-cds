'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, ShieldCheck, MapPin, Building, CreditCard, Bell,
    ChevronRight, Camera, Loader2, LogOut, Package, BarChart3, HelpCircle, Key, Headphones
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
        {
            id: 'security',
            title: 'Login & Security',
            icon: ShieldCheck,
        },
        {
            id: 'personal',
            title: 'Personal Info',
            icon: User,
        },
        {
            id: 'password',
            title: 'Change Password',
            icon: Key,
        }
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
            <div className="flex h-[80vh] items-center justify-center bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-[#232f3e] opacity-20" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="max-w-[1020px] mx-auto pt-6 pb-24 px-5">

                {/* ── Breadcrumbs ── */}
                <nav className="flex items-center text-[13px] text-gray-500 mb-6 font-normal">
                    <span className="cursor-pointer hover:underline hover:text-[#c45500]" onClick={() => router.push('/supplier/dashboard')}>Your Account</span>
                    <ChevronRight size={14} className="mx-1 text-gray-400" />
                    <span className="text-[#c45500]">Your Profile</span>
                </nav>

                <h1 className="text-[28px] font-normal text-gray-900 mb-6 tracking-tight">Your Account</h1>

                {/* ── Header Card ── */}
                <div className="mb-8 p-6 border border-gray-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white shadow-sm ring-1 ring-black/5">
                    <div className="flex items-center gap-6">
                        <div className="relative group shrink-0">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-gray-400 text-3xl font-bold overflow-hidden border border-gray-100 flex-shrink-0">
                                {uploading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-[#232f3e] opacity-40" />
                                ) : profile?.avatar ? (
                                    <img src={getImageUrl(profile.avatar) || undefined} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-300 font-medium">{displayName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-1.5 bg-white border border-gray-300 rounded-full shadow-sm text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <Camera size={14} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                {displayName}
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-100">Verified Vendor</span>
                            </h2>
                            <p className="text-[15px] text-gray-600 mt-1 font-normal">{profile?.email}</p>
                            <p className="text-[13px] text-gray-500 mt-1 font-medium">Supplier ID: #{String(profile?.id || '').padStart(6, '0')}</p>

                            {/* ── Quick Action Buttons Row (Integrated) ── */}
                            <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar pb-1">
                                {SECTIONS.map((sec, i) => {
                                    const isActive = activeSection === sec.id;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setActiveSection(isActive ? null : sec.id)}
                                            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all shadow-sm active:scale-[0.96] outline-none shrink-0 group ${isActive
                                                    ? 'border-[#e6be00] bg-[#fff9cc] ring-2 ring-[#febd69]/30'
                                                    : 'border-gray-200 bg-gray-50 hover:border-[#febd69] hover:bg-white'
                                                }`}
                                        >
                                            <sec.icon size={14} className={`${isActive ? 'text-[#c45500]' : 'text-[#232f3e] group-hover:text-[#c45500]'} transition-colors`} strokeWidth={2} />
                                            <span className={`text-[12px] font-bold whitespace-nowrap tracking-tight ${isActive ? 'text-[#c45500]' : 'text-gray-700 group-hover:text-gray-900'}`}>{sec.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => { authService.logout(); window.location.href = '/login'; }}
                            className="px-6 py-1.5 bg-white border border-gray-300 rounded-[7px] text-[13px] font-medium text-gray-800 hover:bg-gray-50 shadow-sm outline-none focus:ring-2 focus:ring-[#febd69] active:bg-gray-100 transition-all min-w-[120px]"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* ── Dynamic Inline Forms ── */}
                {activeSection && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 border border-gray-200 rounded-lg bg-white p-8 shadow-sm mb-12">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">
                                {SECTIONS.find(s => s.id === activeSection)?.title}
                            </h3>
                            <button
                                onClick={() => setActiveSection(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <ChevronRight size={20} className="rotate-90 md:rotate-0" />
                            </button>
                        </div>

                        {activeSection === 'password' ? (
                            <form onSubmit={handlePasswordChange} className="max-w-[500px] space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-gray-900">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.old_password}
                                        onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-gray-900">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-gray-900">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.new_password_confirm}
                                        onChange={e => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                    />
                                </div>
                                <div className="pt-4 flex items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="px-8 py-2 bg-[#F59E0B] border border-[#FCD200] rounded-[7px] text-[13px] font-medium text-black hover:bg-[#F59E0B] shadow-sm outline-none focus:ring-2 focus:ring-[#febd69] active:bg-[#1a1a2e] transition-all disabled:opacity-50"
                                    >
                                        {updating ? 'Updating...' : 'Change Password'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-w-[800px]">
                                {activeSection === 'security' ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-gray-900">First Name</label>
                                            <input
                                                type="text"
                                                value={formData.first_name || ''}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-gray-900">Last Name</label>
                                            <input
                                                type="text"
                                                value={formData.last_name || ''}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[13px] font-bold text-gray-900">Email Address</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[13px] font-bold text-gray-900">Company / Business Name</label>
                                            <input
                                                type="text"
                                                value={formData.company || ''}
                                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[13px] font-bold text-gray-900">Phone Number</label>
                                            <input
                                                type="text"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[13px] font-bold text-gray-900">Address Line</label>
                                            <input
                                                type="text"
                                                value={formData.address || ''}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-gray-900">City</label>
                                            <input
                                                type="text"
                                                value={formData.city || ''}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-gray-900">Country</label>
                                            <input
                                                type="text"
                                                value={formData.country || ''}
                                                onChange={e => setFormData({ ...formData, country: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[13px] font-bold text-gray-900">Postal Code</label>
                                            <input
                                                type="text"
                                                value={formData.postal_code || ''}
                                                onChange={e => setFormData({ ...formData, postal_code: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-[3px] text-[14px] focus:ring-2 focus:ring-[#febd69] focus:border-[#e77600] outline-none shadow-sm transition-all"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="pt-4 flex items-center gap-4 md:col-span-2">
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="px-8 py-2 bg-[#F59E0B] border border-[#FCD200] rounded-[7px] text-[13px] font-medium text-black hover:bg-[#F59E0B] shadow-sm outline-none focus:ring-2 focus:ring-[#febd69] active:bg-[#1a1a2e] transition-all disabled:opacity-50"
                                    >
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(null)}
                                        className="px-6 py-2 bg-white border border-gray-300 rounded-[7px] text-[13px] font-medium text-gray-800 hover:bg-gray-50 shadow-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* ── Amazon Footer Detail ── */}
                <div className="mt-20 pt-12 border-t border-gray-100 flex flex-col items-center">
                    <div className="flex items-center gap-8 text-[11px] font-bold text-[#F59E0B] uppercase tracking-[0.1em] mb-6">
                        <span className="hover:underline cursor-pointer hover:text-[#c45500]">Conditions of Use</span>
                        <span className="hover:underline cursor-pointer hover:text-[#c45500]">Privacy Notice</span>
                        <span className="hover:underline cursor-pointer hover:text-[#c45500]">Help Center</span>
                        <span className="hover:underline cursor-pointer hover:text-[#c45500]">Interest-Based Ads</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-normal italic">
                        © 2026 Al-Qavi Cosmetics Distribution System. All Rights Reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

