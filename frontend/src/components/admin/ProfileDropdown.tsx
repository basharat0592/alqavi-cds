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
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-[#ddd] rounded-[4px] shadow-2xl z-[100] animate-in fade-in slide-in-from-top-1 duration-200 overflow-hidden text-[#0f1111] font-sans">
            
            {/* Header / Identity */}
            <div className="p-4 bg-[#fcfdff] border-b border-[#ddd]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-[2px] border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatar ? (
                            <img src={getImageUrl(user.avatar) || ''} alt="P" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-[#565959]">{initials}</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[14px] font-bold truncate leading-tight">{user.name}</p>
                        <p className="text-[11px] text-[#565959] truncate mt-0.5">{user.email}</p>
                    </div>
                </div>
                
                {/* Status Badge */}
                <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-[2px] border border-amber-200 w-fit">
                    <Shield size={10} className="fill-current" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{user.role} Status</span>
                </div>
            </div>

            {/* Menu Sections */}
            <div className="py-2 bg-white">
                <div className="px-4 py-1">
                    <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wide mb-2">Administrative</p>
                    <div className="space-y-1">
                        <Link href="/admin/settings" onClick={onClose} className="flex items-center justify-between p-2 rounded-[2px] hover:bg-[#f3f7f7] transition-colors group">
                            <span className="text-[13px] group-hover:text-[#c45500] group-hover:underline">Your Profile</span>
                            <ChevronRight size={12} className="text-[#bbb]" />
                        </Link>
                        <Link href="/admin/settings" onClick={onClose} className="flex items-center justify-between p-2 rounded-[2px] hover:bg-[#f3f7f7] transition-colors group">
                            <span className="text-[13px] group-hover:text-[#c45500] group-hover:underline">System Settings</span>
                            <ChevronRight size={12} className="text-[#bbb]" />
                        </Link>
                    </div>
                </div>

                <div className="mx-4 my-2 border-t border-[#eee]" />

                <div className="px-4 py-1">
                    <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wide mb-2">Shortcuts</p>
                    <div className="space-y-1">
                        <Link href="/admin/sales" onClick={onClose} className="flex items-center gap-2.5 p-2 rounded-[2px] hover:bg-[#f3f7f7] transition-colors group">
                            <ShoppingBag size={14} className="text-[#565959]" />
                            <span className="text-[13px] group-hover:text-[#c45500] group-hover:underline">Manage Sales</span>
                        </Link>
                        <Link href="/" target="_blank" className="flex items-center gap-2.5 p-2 rounded-[2px] hover:bg-[#f3f7f7] transition-colors group">
                            <Globe size={14} className="text-[#565959]" />
                            <span className="text-[13px] group-hover:text-[#c45500] group-hover:underline">Visit Storefront</span>
                        </Link>
                    </div>
                </div>

                <div className="mx-3 my-2 border-t border-[#eee]" />

                <div className="px-4 pb-2">
                    <button 
                        onClick={onLogout}
                        className="w-full mt-2 h-[31px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] rounded-[3px] text-[13px] font-medium text-[#0f1111] flex items-center justify-center hover:from-[#f5d78e] hover:to-[#eeb933] active:from-[#f0c14b] active:to-[#f7dfa5] shadow-sm active:shadow-inner"
                    >
                        Sign Out from Admin
                    </button>
                    <p className="text-center text-[10px] text-[#565959] mt-2">AL-QAVI Cosmetic Solution</p>
                </div>
            </div>
        </div>
    );
}
