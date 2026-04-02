'use client';

import { useState, useEffect } from 'react';
import { 
    User, 
    Mail, 
    Phone, 
    Shield, 
    MapPin, 
    Building2, 
    Key, 
    Bell,
    ChevronRight,
    Camera
} from 'lucide-react';
import { authService } from '@/lib/auth';

export default function SupplierProfile() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setUser(authService.getUser());
    }, []);

    const PROFILE_SECTIONS = [
        { title: "Personal Details", desc: "Name, email, and contact numbers", icon: User },
        { title: "Login & Security", desc: "Update password and secure your hub", icon: Shield },
        { title: "Business Address", desc: "Warehouse and billing locations", icon: MapPin },
        { title: "Distribution Data", desc: "Tax IDs and manufacturing certificates", icon: Building2 },
        { title: "Notifications", desc: "Change alert preferences for orders", icon: Bell }
    ];

    return (
        <div className="max-w-[800px] mx-auto animate-in fade-in duration-700 pb-20">
            
            {/* Breadcrumb style title */}
            <div className="mb-8 px-2">
                <div className="text-[13px] font-bold text-[#007185] hover:text-[#F7CA00] cursor-pointer inline-flex items-center gap-1 mb-4 uppercase tracking-widest">
                    Your Hub <ChevronRight size={12} /> Partner Profile
                </div>
                <h1 className="text-3xl font-medium text-slate-900 border-b pb-4">Login & Security</h1>
            </div>

            {/* Main Profile Grid like Amazon */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-sm divide-y divide-gray-100">
                
                {/* Header Profile Info */}
                <div className="p-8 flex items-center gap-8 group">
                    <div className="relative">
                        <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-slate-900/20 group-hover:scale-105 transition-transform duration-500">
                            {user?.name?.charAt(0) || 'P'}
                        </div>
                        <button className="absolute -bottom-2 -right-2 p-2 bg-white border border-gray-200 rounded-xl shadow-md text-slate-500 hover:text-[#F7CA00] transition-colors">
                            <Camera size={16} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.name || 'Partner Account'}</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">{user?.email}</p>
                        <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-[0.2em]">
                            Verified Partner
                        </div>
                    </div>
                </div>

                {/* Section List */}
                {PROFILE_SECTIONS.map((section, idx) => (
                    <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#F7CA00] group-hover:border-[#F7CA00]/30 transition-all shadow-sm">
                                <section.icon size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 leading-none mb-1.5">{section.title}</h3>
                                <p className="text-xs text-slate-500 font-medium">{section.desc}</p>
                            </div>
                        </div>
                        <div className="text-[11px] font-black text-slate-400 group-hover:text-[#F7CA00] uppercase tracking-widest flex items-center gap-2 transition-colors">
                            Edit <ChevronRight size={14} />
                        </div>
                    </div>
                ))}

                {/* Dangerous Payout Zone */}
                <div className="p-8 bg-rose-50/30">
                    <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-4">Payout Account</h4>
                    <div className="flex items-center justify-between p-4 bg-white border border-rose-100 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                                <Key size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">Settlement Account</p>
                                <p className="text-xs text-slate-500">**** **** **** 4291</p>
                            </div>
                        </div>
                        <button className="px-4 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all uppercase tracking-wider">Update</button>
                    </div>
                </div>
            </div>

            {/* Footer help */}
            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Changes to your account may require re-verification. <br/> For critical security issues, contact Al-Qavi Executive Support.</p>
            </div>
        </div>
    );
}
