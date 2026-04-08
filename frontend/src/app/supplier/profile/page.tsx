'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Shield, MapPin, Building2, CreditCard, Bell, ChevronRight, Camera, Loader2, LogOut
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/v1/users/profile/');
            setProfile(data);
        } catch {
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setUser(authService.getUser());
        fetchProfile();
    }, []);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profile_picture', file);

        setUploading(true);
        try {
            await api.patch(`/v1/users/${profile.id}/update/`, formData, {
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
            title: 'Personal Details',
            desc: 'Edit name, phone number, and regional location metadata',
            icon: User,
            href: '/supplier/profile/personal'
        },
        {
            title: 'Login & Security',
            desc: 'Edit login, password, and mobile number credentials',
            icon: Shield,
            href: '/supplier/profile/security'
        },
        {
            title: 'Business Identity',
            desc: 'Edit distribution warehouse and billing addresses',
            icon: MapPin,
            href: '/supplier/profile/address'
        },
        {
            title: 'Distribution Metrics',
            desc: 'View manufacturing certificates and compliance tax data',
            icon: Building2,
            href: '/supplier/profile/metrics'
        },
        {
            title: 'Payment Options',
            desc: 'Edit settlement accounts and payout methods',
            icon: CreditCard,
            href: '/supplier/profile/payments'
        },
        {
            title: 'Alert Preferences',
            desc: 'Configure order and inventory notification protocols',
            icon: Bell,
            href: '/supplier/profile/notifications'
        }
    ];

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="max-w-[1000px] mx-auto py-10 px-4 animate-in fade-in duration-500 pb-20">
            
            {/* Nav Path */}
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-6 font-medium">
                <span className="hover:underline cursor-pointer hover:text-[#c45500]" onClick={() => router.push('/supplier/dashboard')}>Your Account</span>
                <ChevronRight size={10} className="mt-0.5" />
                <span className="text-[#c45500]">Your Profiles</span>
            </div>

            <h1 className="text-[28px] font-medium text-slate-900 mb-8 leading-tight">Your Account</h1>

            {/* Simple Amazon Persona Header */}
            <div className="mb-10 p-6 border border-slate-200 rounded-lg flex items-center justify-between group bg-white shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-sm overflow-hidden border border-slate-100">
                            {uploading ? (
                                <Loader2 className="h-5 w-5 animate-spin data-[loading=true]:text-[#F7CA00]" />
                            ) : profile?.profile_picture ? (
                                <img src={getImageUrl(profile.profile_picture)} alt="" className="w-full h-full object-cover" />
                            ) : (
                                displayName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-1 bg-white border border-slate-200 rounded-full shadow-md text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <Camera size={12} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-none">{displayName}</h2>
                        <p className="text-sm text-slate-500 mt-2">{profile?.email || 'Global Partner Registry'}</p>
                        <div className="flex items-center gap-3 mt-3">
                             <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100">Verified Partner</span>
                             <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">ID: #{String(profile?.id || '').slice(0, 8).toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => { authService.logout(); window.location.href = '/login'; }}
                    className="flex items-center gap-2 px-6 py-2 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>

            {/* Simple Account Grid (Card Row Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {SECTIONS.map((sec, i) => (
                    <div 
                        key={i}
                        onClick={() => router.push(sec.href)}
                        className="flex items-start gap-4 p-5 border border-slate-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all border-b-2 hover:border-b-[#F7CA00] group"
                    >
                        <div className="mt-1 shrink-0">
                            <sec.icon size={34} className="text-[#232f3e] opacity-80" strokeWidth={1} />
                        </div>
                        <div>
                            <h3 className="text-[17px] font-bold text-slate-900 leading-snug group-hover:text-[#c45500] transition-colors">{sec.title}</h3>
                            <p className="text-sm text-slate-500 mt-1 leading-normal font-normal">{sec.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-20 pt-10 border-t border-slate-100 text-center">
                 <p className="text-xs text-slate-400 font-medium italic">
                    Administrative governance protocols managed by Al-Qavi CDS Distribution Services.
                 </p>
                 <div className="mt-5 flex justify-center gap-10 text-[10px] font-bold text-[#007185] uppercase tracking-widest">
                     <span className="hover:underline cursor-pointer">Conditions of Use</span>
                     <span className="hover:underline cursor-pointer">Privacy Notice</span>
                     <span className="hover:underline cursor-pointer">Security Center</span>
                 </div>
            </div>
        </div>
    );
}
