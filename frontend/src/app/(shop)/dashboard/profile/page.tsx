'use client';

import { useState, useEffect } from 'react';
import { 
    User, 
    Mail, 
    ShieldCheck, 
    Lock, 
    Key, 
    CreditCard, 
    MapPin, 
    Bell,
    ChevronRight,
    ArrowUpRight,
    Search,
    ShoppingBag,
    LayoutDashboard
} from 'lucide-react';
import { authService, User as AuthUser } from '@/lib/auth';
import Link from 'next/link';

export default function ProfileDashboard() {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        setUser(authService.getUser());
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            
            {/* ── HEADER (Admin Style) ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Security & Profile</h1>
                    <p className="text-[10px] font-bold text-[#FF9900] tracking-[0.2em] uppercase mt-0.5">Manage your digital identity</p>
                </div>
                <div className="flex gap-4">
                    <Link href="/dashboard" className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all">
                        Overview
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ── PERSONAL INFORMATION ── */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                        <div className="p-6 border-b dark:border-slate-800">
                            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Basic Information</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">Full Name</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{user?.name}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">Email Address</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{user?.email}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">Mobile Contact</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.phone || 'Not provided'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block italic">Account Type</label>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center border border-emerald-100/50 dark:border-emerald-900/20">
                                        <Lock className="h-3.5 w-3.5 text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Verified {user?.role || 'Customer'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Security Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded shadow-sm hover:border-[#FF9900] transition-colors group cursor-pointer">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                                    <Key className="h-5 w-5 text-[#FF9900]" />
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-slate-200 group-hover:text-[#FF9900] transition-colors" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest mb-1">Update Password</h3>
                            <p className="text-[10px] font-bold text-slate-400 italic">Rotate credentials for better security.</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 rounded shadow-sm hover:border-[#FF9900] transition-colors group cursor-pointer">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                                    <ShieldCheck className="h-5 w-5 text-[#FF9900]" />
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-slate-200 group-hover:text-[#FF9900] transition-colors" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest mb-1">Two-Factor Auth</h3>
                            <p className="text-[10px] font-bold text-slate-400 italic">Add layers of hardware protection.</p>
                        </div>
                    </div>
                </div>

                {/* ── SIDEBAR STATS ── */}
                <div className="lg:col-span-4 space-y-6">
                    <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Security Health</h2>
                    <div className="bg-slate-900 dark:bg-slate-900 text-white p-8 rounded-lg shadow-xl shadow-slate-900/10 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                        
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[#FF9900] uppercase tracking-widest">Login Security</p>
                            <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Robust Protection</h4>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-bold tracking-widest uppercase">
                                <span className="text-slate-400">Profile Completion</span>
                                <span>85%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#FF9900] w-[85%] rounded-full" />
                            </div>
                        </div>

                        <ul className="space-y-3 text-[10px] font-bold tracking-widest uppercase text-slate-300">
                            <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> AES-256 Encrypted</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Session Tracking</li>
                            <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Verified Email</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
