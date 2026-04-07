'use client';

import Link from 'next/link';
import { X, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

/* ═══════════════════════════════════════════════
   PROFILE DROPDOWN
═══════════════════════════════════════════════ */
export default function ProfileDropdown({
    user, onClose, onLogout, 
}: {
    user: { name: string; email: string; role: string; id?: string; avatar?: string };
    onClose: () => void;
    onLogout: () => void;
    onUpdated: (name: string, email: string, avatar?: string) => void;
}) {
    const initials = (user.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const inputCls = "w-full px-3.5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#EEAF1C]/10 focus:border-[#EEAF1C] text-sm font-medium text-slate-700 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600";

    const MENU_ITEMS = [
        { icon: User, label: 'View Profile', href: '/admin/settings', color: 'text-[#EEAF1C]', bg: 'bg-[#EEAF1C]/10' },
        { icon: Settings, label: 'Settings', href: '/admin/settings', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-white/5' },
    ];

    return (
        <div className="absolute top-full right-0 mt-2.5 w-[280px] bg-white/95 dark:bg-[#232F3E]/95 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">

            {/* Compact Branded Header */}
            <div className="bg-gradient-to-br from-[#1a252f] via-[#232F3E] to-[#EEAF1C] px-4 pt-6 pb-5 relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-11 h-11 bg-[#EEAF1C] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xl border-2 border-white/20 group hover:rotate-6 transition-transform duration-500">
                        {user.avatar ? (
                            <img src={getImageUrl(user.avatar) || ''} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-base font-black text-white">{initials}</span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-black text-white text-sm leading-tight uppercase tracking-tight truncate">{user.name}</p>
                        <p className="text-[9px] text-white/60 font-medium truncate mt-0.5 tracking-wider">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                             <span className="px-2 py-0.5 bg-white/10 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-lg border border-white/10 flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                {user.role}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute -top-3 -right-1 p-1.5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* ── High-Density Actions ── */}
            <div className="py-2.5 px-1.5">
                {MENU_ITEMS.map(item => (
                    <Link key={item.label} href={item.href} onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 group mb-0.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.bg} transition-transform group-hover:scale-110 duration-500`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.5} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#EEAF1C] dark:group-hover:text-[#EEAF1C] flex-1 text-left uppercase tracking-wide transition-colors">{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 group-hover:text-[#EEAF1C] group-hover:translate-x-1 transition-all" strokeWidth={3} />
                    </Link>
                ))}
                <div className="mx-3 my-1.5 border-t border-slate-100 dark:border-white/5" />
                <button onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/5 transition-all duration-300 group">
                    <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:rotate-12 transition-all duration-500">
                        <LogOut className="h-4 w-4 text-red-500 group-hover:text-white transition-colors" strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex-1 text-left uppercase tracking-wide">Logout</span>
                </button>
            </div>
        </div>
    );
}

