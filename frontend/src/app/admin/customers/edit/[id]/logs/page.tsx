'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { userService, ActivityLog } from '@/lib/api';
import {
    ArrowLeft, History, Loader2, Search, Calendar, MapPin, Activity, ShieldAudit
} from 'lucide-react';

// ── Components ────────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-[#FF9900]" />}
        <span className="text-[11px] font-black text-gray-800 dark:text-white uppercase tracking-widest">{title}</span>
    </div>
);

export default function CustomerLogsPage() {
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<any>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const [c, l] = await Promise.all([
                    userService.getById(Number(id)),
                    userService.getActivityLogs(Number(id))
                ]);
                setCustomer(c);
                setLogs(l);
            } catch { }
            finally { setLoading(false); }
        };
        load();
    }, [id]);

    const filtered = logs.filter(l =>
        l.description?.toLowerCase().includes(search.toLowerCase()) ||
        l.action_display?.toLowerCase().includes(search.toLowerCase())
    );

    const labelCls = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1";

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-[#FF9900] animate-spin" />
        </div>
    );

    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-12 font-sans px-4 sm:px-6 mt-6">

            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href={`/admin/customers/edit/${id}`} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#FF9900] transition-colors w-fit">
                    <ArrowLeft className="h-3 w-3" strokeWidth={3} />
                    Back to Profile
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3 italic">
                    <History className="w-6 h-6 text-[#FF9900]" />
                    Activity Logs
                </h1>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-9">
                    Auditing events for {customer?.first_name} {customer?.last_name}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Audit Controls */}
                <div className="md:col-span-1 space-y-6">
                    <SectionCard className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-4 h-4 text-[#FF9900]" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Audit Hub</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className={labelCls}>Find Event</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter description..."
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg text-xs font-medium text-gray-900 dark:text-white outline-none focus:border-[#FF9900]/40 transition-all placeholder:text-gray-400"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <p className={labelCls}>Statistics</p>
                                <div className="space-y-3 mt-1">
                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                        <span>Total Records</span>
                                        <span className="text-[#FF9900]">{logs.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                        <span>Logins</span>
                                        <span className="text-gray-900 dark:text-white">{logs.filter(l => l.action.toLowerCase().includes('login')).length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Timeline */}
                <div className="md:col-span-3">
                    <SectionCard>
                        <SectionHeader title="System Events Timeline" icon={History} />
                        
                        {filtered.length === 0 ? (
                            <div className="py-24 text-center">
                                <History className="w-12 h-12 text-gray-100 dark:text-slate-800 mx-auto mb-4" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight uppercase">No logs identified</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-6">Adjust your filters or confirm system synchronization.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-900">
                                {filtered.map((log) => (
                                    <div key={log.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-slate-900/30 transition-all group">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="space-y-3 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest rounded shadow-xs group-hover:bg-[#131921] group-hover:text-[#FF9900] group-hover:border-[#131921] transition-all">
                                                        {log.action_display || log.action}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-900/50 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-800">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </span>
                                                </div>

                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-200 leading-relaxed">
                                                    {log.description}
                                                </p>

                                                <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/20">
                                                        <MapPin className="w-3 h-3" />
                                                        IP: {log.ip_address}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/20">
                                                        <Activity className="w-3 h-3 shrink-0" />
                                                        Trace Verified
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex h-10 w-10 bg-gray-50 dark:bg-slate-900 rounded-lg items-center justify-center text-gray-200 dark:text-slate-700 group-hover:bg-[#FF9900]/10 group-hover:text-[#FF9900] transition-all shrink-0">
                                                <History className="w-5 h-5 shadow-sm" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
