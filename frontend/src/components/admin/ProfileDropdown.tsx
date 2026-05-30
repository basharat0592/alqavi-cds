'use client';

import Link from 'next/link';
import { X, User, Settings, LogOut, ChevronRight, Shield, Globe, ShoppingBag } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

/* ═══════════════════════════════════════════════
   PURE AMAZON PROFILE DROPDOWN
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

    return (
        <div className="absolute top-full right-0 mt-3 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden text-slate-800 dark:text-slate-100 font-sans">
            
            {/* Header / Identity */}
            <div className="p-4 bg-slate-50/55 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {user.avatar ? (
                                <img src={getImageUrl(user.avatar) || ''} alt="P" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold text-slate-500 dark:text-zinc-400">{initials}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold truncate leading-tight text-slate-900 dark:text-white">{user.name}</p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-sky-500/10 text-sky-500 dark:bg-sky-500/15 dark:text-sky-400 rounded-full border border-sky-500/20 w-fit">
                    <Shield size={10} className="fill-current" />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider">{user.role} Status</span>
                </div>
            </div>

            {/* Menu Sections */}
            <div className="py-2.5">
                <div className="px-4 py-1">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Administrative</p>
                    <div className="space-y-0.5">
                        <Link href="/admin/settings" onClick={onClose} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                            <span className="text-[13px] font-medium text-slate-650 dark:text-zinc-300 group-hover:text-sky-500 dark:group-hover:text-sky-450 transition-colors">Your Profile</span>
                            <ChevronRight size={12} className="text-slate-350 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link href="/admin/settings" onClick={onClose} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                            <span className="text-[13px] font-medium text-slate-650 dark:text-zinc-300 group-hover:text-sky-500 dark:group-hover:text-sky-450 transition-colors">System Settings</span>
                            <ChevronRight size={12} className="text-slate-350 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>
                </div>

                <div className="mx-4 my-2 border-t border-slate-100 dark:border-white/5" />

                <div className="px-4 py-1">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Shortcuts</p>
                    <div className="space-y-0.5">
                        <Link href="/admin/sales" onClick={onClose} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                            <ShoppingBag size={14} className="text-slate-400 dark:text-zinc-500 group-hover:text-sky-500 dark:group-hover:text-sky-450 transition-colors" />
                            <span className="text-[13px] font-medium text-slate-650 dark:text-zinc-300 group-hover:text-sky-500 dark:group-hover:text-sky-450 transition-colors">Manage Sales</span>
                        </Link>
                        <Link href="/" target="_blank" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                            <Globe size={14} className="text-slate-400 dark:text-zinc-500 group-hover:text-sky-500 dark:group-hover:text-sky-450 transition-colors" />
                            <span className="text-[13px] font-medium text-slate-650 dark:text-zinc-300 group-hover:text-sky-500 dark:group-hover:text-sky-450 transition-colors">Visit Storefront</span>
                        </Link>
                    </div>
                </div>

                <div className="mx-4 my-2 border-t border-slate-100 dark:border-white/5" />

                <div className="px-4 pb-2 pt-1">
                    <button 
                        onClick={onLogout}
                        className="w-full mt-2 h-10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-white/5 hover:border-rose-200 dark:hover:border-rose-500/30 rounded-xl h-10 font-extrabold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                        <LogOut size={14} />
                        <span>Sign Out from Admin</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-400 dark:text-zinc-500 mt-3 font-semibold uppercase tracking-wider">AL-QAVI Cosmetic Solution</p>
                </div>
            </div>
        </div>
    );
}
