'use client';

import Link from 'next/link';
import {
    Bell, X, RefreshCw, Clock, Settings
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
   COMPONENT
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
        <div className="absolute top-full right-0 mt-3 w-96 bg-white dark:bg-[#232F3E] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#37475a] flex items-center justify-between bg-[#232F3E] rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center">
                        <Bell className="h-4 w-4 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="font-black text-white text-sm">Recent Activity</p>
                        {unread > 0 && (
                            <p className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-widest">
                                {unread} unread
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={onRefresh} disabled={loading}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white disabled:opacity-50"
                        title="Refresh">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                    </button>
                    {unread > 0 && (
                        <button onClick={onMarkAllRead}
                            className="text-[10px] font-black text-[#F59E0B] hover:underline uppercase tracking-wider px-2 py-1 hover:bg-white/10 rounded-lg transition-colors">
                            Mark all read
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors">
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#F59E0B]/20 border-t-[#F59E0B] rounded-full animate-spin" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading...</p>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="py-12 text-center px-6">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-6 w-6 text-gray-300 dark:text-gray-600" strokeWidth={2} />
                        </div>
                        <p className="font-bold text-gray-600 dark:text-gray-300 text-sm">No recent activity</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Activity will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-white/5 py-1">
                        {activities.map(item => {
                            const Icon = item.icon;
                            return (
                                <Link key={item.id} href={item.href}
                                    onClick={() => { onMarkRead(item.id); onClose(); }}
                                    className={`flex items-start gap-3.5 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-all group ${!item.read ? 'bg-[#F59E0B]/5 dark:bg-[#F59E0B]/10' : ''}`}>
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${item.bg} dark:bg-opacity-20`}>
                                        <Icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm font-bold leading-tight group-hover:text-[#F59E0B] transition-colors ${!item.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}>
                                                {item.title}
                                            </p>
                                            {!item.read && <span className="w-2 h-2 bg-[#F59E0B] rounded-full flex-shrink-0 mt-1.5" />}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
                                            {item.time}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 px-5 py-3 flex items-center justify-between rounded-b-2xl">
                <Link href="/admin/sales" onClick={onClose} className="text-xs font-bold text-[#F59E0B] hover:underline">
                    View all orders →
                </Link>
                <Link href="/admin/settings" onClick={onClose}
                    className="text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white flex items-center gap-1">
                    <Settings className="h-3 w-3" strokeWidth={2.5} /> Settings
                </Link>
            </div>
        </div>
    );
}
