'use client';

import { useState, useEffect } from 'react';
import { 
    Bell, Search, RefreshCw, Trash2, 
    AlertTriangle, Clock, ShoppingBag, 
    Users, Shield, Package, ChevronRight, ListFilter, Mail
} from 'lucide-react';
import { userService } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - NOTIFICATIONS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await userService.getAllActivityLogs(100);
            setNotifications(res);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
            toast.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredNotifications = notifications.filter(notif => {
        const isOrder = (notif.action_type || '').includes('ORDER') || (notif.description || '').toLowerCase().includes('order');
        if (isOrder) return false; // Always exclude orders as requested

        const matchesSearch = (notif.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (notif.action_type || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        if (filter === 'all') return matchesSearch;
        if (filter === 'users') return matchesSearch && (notif.action_type?.includes('USER') || notif.description?.toLowerCase().includes('user'));
        if (filter === 'system') return matchesSearch && !(notif.action_type?.includes('USER')) && !(notif.description?.toLowerCase().includes('newsletter'));
        if (filter === 'newsletter') return matchesSearch && (notif.description?.toLowerCase().includes('newsletter'));
        
        return matchesSearch;
    });

    const getIcon = (log: any) => {
        const desc = (log.description || '').toLowerCase();
        const action = (log.action_type || '').toLowerCase();
        
        if (action.includes('order') || desc.includes('order')) return ShoppingBag;
        if (action.includes('user') || desc.includes('user')) return Users;
        if (action.includes('login') || action.includes('password')) return Shield;
        if (action.includes('product') || desc.includes('product')) return Package;
        if (desc.includes('newsletter')) return Mail;
        return Bell;
    };

    const getColor = (log: any) => {
        const action = (log.action_type || '').toLowerCase();
        const desc = (log.description || '').toLowerCase();
        if (action.includes('error') || action.includes('fail')) return 'text-red-500 bg-red-50';
        if (action.includes('order')) return 'text-blue-500 bg-blue-50';
        if (action.includes('user')) return 'text-green-500 bg-green-50';
        if (action.includes('login')) return 'text-orange-500 bg-orange-50';
        if (desc.includes('newsletter')) return 'text-[#119AB8] bg-teal-50';
        return 'text-[#c45500] bg-amber-50';
    };

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111] -m-8">
            {/* Header Area */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Notifications</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Activity & Notifications</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Real-time system events and customer actions</p>
                        </div>
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={fetchNotifications} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Feed
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 text-left">
                {/* Search & Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-[13px] font-bold text-[#111] mb-1.5">Search Logs</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                            <input 
                                type="text"
                                placeholder="Search by description or type..."
                                className={inputCls + " pl-10 h-[35px]"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <Btn variant="secondary" onClick={fetchNotifications} loading={loading} className="h-[35px]">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Btn>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-8 border-b border-[#ddd] mb-6 px-1 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'all', label: 'All Activity', icon: ListFilter },
                        { id: 'users', label: 'User Actions', icon: Users },
                        { id: 'system', label: 'System Alerts', icon: AlertTriangle },
                        { id: 'newsletter', label: 'Newsletter', icon: Mail }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`flex items-center gap-2 pb-3 text-[14px] font-medium transition-all relative whitespace-nowrap ${filter === tab.id
                                ? 'text-[#c45500]' : 'text-[#565959] hover:text-[#111]'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {filter === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#c45500]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Notifications Table-style List */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="h-6 w-6 text-[#c45500] animate-spin" />
                            <p className="text-[13px] text-[#565959]">Updating activity feed...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                            <Bell className="text-[#ddd] mb-4" size={48} />
                            <h3 className="text-[15px] font-bold text-[#111]">No events found</h3>
                            <p className="text-[13px] text-[#565959] mt-1">Try adjusting your filters or search terms.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#eee]">
                            {filteredNotifications.map((notif) => {
                                const Icon = getIcon(notif);
                                const colorClass = getColor(notif);
                                return (
                                    <div key={notif.id} className="p-5 hover:bg-[#fcfdff] transition-all group flex items-start gap-5">
                                        <div className={cn("w-11 h-11 rounded-[2px] flex items-center justify-center shrink-0 border border-[#eee] bg-white shadow-sm group-hover:border-[#e77600]/30 transition-colors", colorClass)}>
                                            <Icon size={18} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-[14px] font-bold text-[#111] leading-tight group-hover:text-[#c45500] transition-colors">
                                                    {notif.action_type || 'System Event'}
                                                </p>
                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#565959] uppercase tracking-tighter">
                                                    <Clock size={12} className="text-[#aaa]" />
                                                    {new Date(notif.timestamp || Date.now()).toLocaleString('en-PK', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-[#565959] mt-1.5 leading-relaxed">
                                                {notif.description}
                                            </p>
                                            <div className="mt-4 flex items-center gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#f7f8fa] text-[#565959] rounded-[2px] border border-[#ddd]">
                                                    ID: {notif.id}
                                                </span>
                                                {notif.ip_address && (
                                                    <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-tighter">
                                                        Network: {notif.ip_address}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
