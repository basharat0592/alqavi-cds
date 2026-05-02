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
        <div className="absolute top-full right-0 mt-1 w-96 bg-white border border-[#ddd] rounded-[4px] shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-1 duration-200 text-[#0f1111] font-sans">
            
            {/* Amazon Style Header */}
            <div className="px-5 py-4 border-b border-[#ddd] flex items-center justify-between bg-[#fcfdff]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-[2px] border border-zinc-200 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-[#565959]" strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold">Activity Dashboard</p>
                        {unread > 0 && (
                            <p className="text-[10px] font-bold text-[#c45500] uppercase tracking-wider animate-pulse">
                                {unread} UNREAD EVENTS
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onRefresh} disabled={loading}
                        className="p-1.5 hover:bg-[#f3f7f7] rounded-[2px] border border-transparent hover:border-zinc-200 transition-all text-[#565959] disabled:opacity-50"
                        title="Refresh Data">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#f3f7f7] rounded-[2px] text-[#565959] transition-colors">
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Notification Feed */}
            <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 bg-zinc-50">
                        <RefreshCw className="h-6 w-6 text-zinc-300 animate-spin" />
                        <p className="text-[11px] font-bold text-[#565959] uppercase tracking-widest">Updating feed...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="py-16 text-center px-6 bg-zinc-50">
                        <Bell className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                        <p className="font-bold text-[#565959] text-[13px]">System clear</p>
                        <p className="text-[11px] text-zinc-400 mt-1 uppercase tracking-tight">No critical notifications</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#eee]">
                        {activities.map(item => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.id} href={item.href}
                                    onClick={() => { onMarkRead(item.id); onClose(); }}
                                    className={`flex items-start gap-4 px-5 py-4 hover:bg-[#f3f7f7] transition-all group border-l-2 ${!item.read ? 'border-[#e77600] bg-amber-50/30' : 'border-transparent'}`}>
                                    <div className={`w-10 h-10 rounded-[2px] flex items-center justify-center flex-shrink-0 border border-zinc-100 bg-white shadow-sm group-hover:border-[#e77600]/30 transition-colors`}>
                                        <Icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-[13px] font-bold leading-tight group-hover:text-[#c45500] transition-colors ${!item.read ? 'text-[#0f1111]' : 'text-[#565959]'}`}>
                                                {item.title}
                                            </p>
                                            <span className="text-[10px] text-zinc-400 font-medium shrink-0 flex items-center gap-1">
                                                <Clock size={10} /> {item.time}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-[#565959] mt-1 leading-snug line-clamp-2">{item.desc}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-zinc-100 text-[#565959] rounded-[2px] border border-zinc-200 group-hover:bg-[#f3f7f7] transition-colors">
                                                ID: {item.id.slice(0, 8)}
                                            </span>
                                            <span className="text-[11px] text-[#007185] font-medium group-hover:underline flex items-center gap-1">
                                                Manage <ChevronRight size={10} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Advanced Footer */}
            <div className="border-t border-[#ddd] bg-[#fcfdff] px-5 py-3 flex items-center justify-between">
                <button onClick={onMarkAllRead} className="text-[11px] font-bold text-[#007185] hover:text-[#c45500] hover:underline">
                    Mark All as Noted
                </button>
                <Link href="/admin/settings" onClick={onClose}
                    className="h-[25px] px-3 bg-white border border-zinc-300 rounded-[2px] text-[11px] font-medium text-[#565959] hover:bg-zinc-50 flex items-center gap-1.5 transition-all">
                    <Settings size={12} /> Configure Alerts
                </Link>
            </div>
        </div>
    );
}
