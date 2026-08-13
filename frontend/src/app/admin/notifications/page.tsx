'use client';

import { useState, useEffect } from 'react';
import {
    Bell, Search, RefreshCw,
    AlertTriangle, Clock, ShoppingBag,
    Users, Shield, Package, ListFilter, Mail
} from 'lucide-react';
import { userService } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

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
        const interval = setInterval(fetchNotifications, 60000);
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
        if (action.includes('error') || action.includes('fail')) return 'text-rose-500 bg-rose-50';
        if (action.includes('order')) return 'text-sky-500 bg-sky-50';
        if (action.includes('user')) return 'text-emerald-500 bg-emerald-50';
        if (action.includes('login')) return 'text-amber-500 bg-amber-50';
        if (desc.includes('newsletter')) return 'text-sky-600 bg-sky-50';
        return 'text-[#B4780B] bg-[#F59E0B]/10';
    };

    return (
        <div>
            <PageHeader
                title="Notifications"
                subtitle="Real-time system events and customer actions"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Notifications' }]}
                actions={
                    <Button variant="secondary" onClick={fetchNotifications} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Feed
                    </Button>
                }
            />

            {/* Search & Filters */}
            <Card className="p-5 mb-6 flex items-end gap-4">
                <div className="flex-1">
                    <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Search Logs</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by description or type..."
                            className={cn(ui.inputBase, "pl-10")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <Button variant="outline" onClick={fetchNotifications} disabled={loading} className="shrink-0">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Button>
            </Card>

            {/* Status Tabs */}
            <div className="flex gap-8 border-b border-slate-200 mb-6 px-1 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'all', label: 'All Activity', icon: ListFilter },
                    { id: 'users', label: 'User Actions', icon: Users },
                    { id: 'system', label: 'System Alerts', icon: AlertTriangle },
                    { id: 'newsletter', label: 'Newsletter', icon: Mail }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={cn(
                            'flex items-center gap-2 pb-3 text-[14px] font-medium transition-all relative whitespace-nowrap',
                            filter === tab.id ? 'text-[#B4780B]' : 'text-slate-600 hover:text-slate-900'
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {filter === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#F59E0B]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Notifications Table-style List */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="h-6 w-6 text-[#B4780B] animate-spin" />
                        <p className="text-[13px] text-slate-600">Updating activity feed...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                        <Bell className="text-slate-300 mb-4" size={48} />
                        <h3 className="text-[15px] font-bold text-slate-900">No events found</h3>
                        <p className="text-[13px] text-slate-600 mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredNotifications.map((notif) => {
                            const Icon = getIcon(notif);
                            const colorClass = getColor(notif);
                            return (
                                <div key={notif.id} className="p-5 hover:bg-slate-50 transition-all group flex items-start gap-5">
                                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm group-hover:border-[#F59E0B]/25 transition-colors", colorClass)}>
                                        <Icon size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-[14px] font-bold text-slate-900 leading-tight group-hover:text-[#92600A] transition-colors">
                                                {notif.action_type || 'System Event'}
                                            </p>
                                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-tighter tabular-nums">
                                                <Clock size={12} className="text-slate-400" />
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
                                        <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">
                                            {notif.description}
                                        </p>
                                        <div className="mt-4 flex items-center gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200 tabular-nums">
                                                ID: {notif.id}
                                            </span>
                                            {notif.ip_address && (
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
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
            </Card>
        </div>
    );
}
