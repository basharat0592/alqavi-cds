'use client';

import Link from 'next/link';
import {
    Bell, X, RefreshCw, Clock, Settings, ChevronRight
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
export type ActivityItem = {
    id: string;
    type: 'order' | 'user' | 'product' | 'alert';
    title: string;
    desc: string;
    time: string;
    timeRaw: number;
    href: string;
    read: boolean;
    icon: React.ElementType;
    color: string;
    bg: string;
};

/* ═══════════════════════════════════════════════
   PURE AMAZON NOTIFICATION PANEL (ADMIN)
   ═══════════════════════════════════════════════ */
export default function NotificationPanel({
    activities, loading, onClose, onMarkAllRead, onMarkRead, onRefresh
}: {
    activities: ActivityItem[];
    loading: boolean;
    onClose: () => void;
    onMarkAllRead: () => void;
    onMarkRead: (id: string) => void;
    onRefresh: () => void;
}) {
    const unread = activities.filter(a => !a.read).length;

    return (
        <div className="relative w-full md:absolute md:top-full md:right-0 md:mt-3 md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-[#E7ECF2] dark:border-white/5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200 text-[#0F1A2B] dark:text-slate-100 font-sans">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#F1F5F9] dark:border-white/5 flex items-center justify-between bg-[#F8FAFC]/55 dark:bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#F4F6F9] dark:bg-white/10 rounded-xl border border-[#E7ECF2] dark:border-white/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-[#64748B] dark:text-zinc-400" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-[#0F1A2B] dark:text-white">Activity Dashboard</p>
                        {unread > 0 && (
                            <p className="text-[9px] font-extrabold text-[#94A3B8] dark:text-[#CBD5E1] uppercase tracking-widest animate-pulse mt-0.5">
                                {unread} UNREAD EVENTS
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onRefresh} disabled={loading}
                        className="p-2 hover:bg-[#F4F6F9] dark:hover:bg-white/5 rounded-xl transition text-[#94A3B8] dark:text-zinc-500 hover:text-[#334155] dark:hover:text-white disabled:opacity-50"
                        title="Refresh Data">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-[#F4F6F9] dark:hover:bg-white/5 rounded-xl text-[#94A3B8] dark:text-zinc-500 hover:text-[#334155] dark:hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Notification Feed */}
            <div className="max-h-[55vh] md:max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 bg-[#F8FAFC]/50 dark:bg-white/5">
                        <RefreshCw className="h-6 w-6 text-[#CBD5E1] dark:text-zinc-500 animate-spin" />
                        <p className="text-[10px] font-extrabold text-[#94A3B8] dark:text-zinc-500 uppercase tracking-widest">Updating feed...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="py-16 text-center px-6 bg-[#F8FAFC]/50 dark:bg-white/5">
                        <Bell className="h-10 w-10 text-[#E2E8F0] dark:text-zinc-700 mx-auto mb-3" />
                        <p className="font-bold text-[#64748B] dark:text-zinc-400 text-[13px]">System clear</p>
                        <p className="text-[10px] text-[#94A3B8] dark:text-zinc-500 mt-1 uppercase tracking-widest font-bold">No critical notifications</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {activities.map(item => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.id} href={item.href}
                                    onClick={() => onClose()}
                                    className={`flex items-start gap-4 px-5 py-4 hover:bg-[#F8FAFC] dark:hover:bg-white/5 transition-all group border-l-2 ${!item.read ? 'border-[#94A3B8] bg-[#94A3B8]/5 dark:bg-[#94A3B8]/10' : 'border-transparent'}`}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#E7ECF2] dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm group-hover:border-[#94A3B8]/20 transition-colors">
                                        <Icon className={`h-4 w-4 ${item.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-[13px] font-bold leading-tight group-hover:text-[#94A3B8] dark:group-hover:text-[#CBD5E1] transition-colors ${!item.read ? 'text-[#0F1A2B] dark:text-white' : 'text-[#64748B] dark:text-zinc-400'}`}>
                                                {item.title}
                                            </p>
                                            <span className="text-[10px] text-[#94A3B8] dark:text-zinc-500 font-medium shrink-0 flex items-center gap-1">
                                                <Clock size={10} /> {item.time}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-[#64748B] dark:text-zinc-400 mt-1 leading-snug line-clamp-2">{item.desc}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-[#F4F6F9] dark:bg-white/10 text-[#64748B] dark:text-zinc-400 rounded-full border border-[#E7ECF2]/60 dark:border-white/5 group-hover:bg-slate-200 dark:group-hover:bg-white/20 transition-colors">
                                                ID: {item.id.slice(0, 8)}
                                            </span>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onMarkRead(item.id);
                                                }}
                                                className="text-[11px] text-[#94A3B8] hover:text-[#64748B] dark:text-[#CBD5E1] dark:hover:text-[#E2E8F0] font-bold hover:underline flex items-center gap-1 transition-colors"
                                            >
                                                Mark as read
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#F1F5F9] dark:border-white/5 bg-[#F8FAFC]/55 dark:bg-white/5 px-5 py-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                    <button onClick={onMarkAllRead} className="text-[11px] font-bold text-[#94A3B8] hover:text-[#64748B] dark:text-[#CBD5E1] dark:hover:text-[#E2E8F0] hover:underline transition-colors">
                        Mark All as Noted
                    </button>
                    <Link href="/admin/notifications" onClick={onClose} className="text-[11px] font-bold text-[#94A3B8] hover:text-[#64748B] dark:text-[#CBD5E1] dark:hover:text-[#E2E8F0] hover:underline transition-colors">
                        View All Activity
                    </Link>
                </div>
                <Link href="/admin/settings" onClick={onClose}
                    className="h-9 w-full justify-center px-3 bg-white dark:bg-white/5 border border-[#E7ECF2] dark:border-white/10 rounded-xl text-xs font-semibold text-[#64748B] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-white/10 flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]">
                    <Settings size={12} /> Configure Alerts
                </Link>
            </div>
        </div>
    );
}
