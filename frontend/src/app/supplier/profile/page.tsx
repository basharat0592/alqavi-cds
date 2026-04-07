'use client';

import { useState, useEffect } from 'react';
import {
    User, Mail, Phone, Shield, MapPin, Building2, Key, Bell, ChevronRight, Camera, Loader2
} from 'lucide-react';
import { authService } from '@/lib/auth';
import api from '@/lib/axios';

export default function SupplierProfile() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = authService.getUser();
        setUser(u);
        const fetchProfile = async () => {
            try {
                const { data } = await api.get('/v1/users/me/');
                setProfile(data);
            } catch {
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.name || 'Partner Account';
    const displayEmail = profile?.email || user?.email || '—';
    const displayPhone = profile?.phone || '—';
    const displayCity = profile?.city || '—';

    const PROFILE_SECTIONS = [
        { title: 'Personal Details', desc: 'Name, email, and contact numbers', icon: User },
        { title: 'Login & Security', desc: 'Update password and secure your hub', icon: Shield },
        { title: 'Business Address', desc: 'Warehouse and billing locations', icon: MapPin },
        { title: 'Distribution Data', desc: 'Tax IDs and manufacturing certificates', icon: Building2 },
        { title: 'Notifications', desc: 'Change alert preferences for orders', icon: Bell },
    ];

    return (
        <div className="max-w-[800px] mx-auto animate-in fade-in duration-700 pb-20">

            {/* Title */}
            <div className="mb-8">
                <h1 className="text-3xl font-medium text-slate-900 border-b pb-4">Login &amp; Security</h1>
            </div>

            {/* Main Card */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm divide-y divide-gray-100">

                {/* Profile Header */}
                <div className="p-8 flex items-center gap-6">
                    {loading ? (
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl animate-pulse shrink-0" />
                    ) : (
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <button className="absolute -bottom-2 -right-2 p-1.5 bg-white border border-gray-200 rounded-xl shadow-md text-slate-400 hover:text-[#F7CA00] transition-colors">
                                <Camera size={14} />
                            </button>
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{displayName}</h2>
                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {displayEmail}</p>
                        {displayPhone !== '—' && (
                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {displayPhone}</p>
                        )}
                        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                            ✓ Verified Partner · {displayCity}
                        </div>
                    </div>
                </div>

                {/* Account Info Row */}
                {!loading && profile && (
                    <div className="px-8 py-4 bg-[#f0f2f2] grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                        {[
                            { label: 'Username', value: profile.username },
                            { label: 'Role', value: profile.role_name || 'Supplier' },
                            { label: 'Status', value: profile.is_active ? 'Active' : 'Inactive' },
                            { label: 'Member Since', value: profile.date_joined ? new Date(profile.date_joined).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) : '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex flex-col gap-0.5 uppercase tracking-wider font-medium text-slate-500">
                                <span>{label}</span>
                                <span className="text-sm font-bold text-slate-800 normal-case">{value || '—'}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Section List */}
                {PROFILE_SECTIONS.map((section, idx) => (
                    <div key={idx} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#F7CA00] group-hover:border-[#F7CA00]/30 transition-all shadow-sm">
                                <section.icon size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">{section.title}</h3>
                                <p className="text-xs text-slate-500">{section.desc}</p>
                            </div>
                        </div>
                        <div className="text-[11px] font-black text-slate-400 group-hover:text-[#F7CA00] uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                            Edit <ChevronRight size={13} />
                        </div>
                    </div>
                ))}

                {/* Payout Section */}
                <div className="px-8 py-6 bg-rose-50/30">
                    <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-4">Payout Account</h4>
                    <div className="flex items-center justify-between p-4 bg-white border border-rose-100 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                                <Key size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Settlement Account</p>
                                <p className="text-xs text-slate-500">**** **** **** 4291</p>
                            </div>
                        </div>
                        <button className="px-4 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all uppercase tracking-wider">
                            Update
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-10 text-center">
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Changes may require re-verification. For critical issues, contact Al-Qavi Executive Support.
                </p>
            </div>
        </div>
    );
}
