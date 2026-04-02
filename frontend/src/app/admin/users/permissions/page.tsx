'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Shield, Search, Lock, AlertTriangle, RefreshCw, Layers, X, Loader2, Key,
    ShieldCheck, MoreHorizontal, Database, Terminal
} from 'lucide-react';
import { permissionService } from '@/lib/api';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES (Synchronized with Company Hub)
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[#EEAF1C]" />
            <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";

export default function PermissionsPage() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await permissionService.getAll();
            setPermissions(data || []);
        } catch (err) {
            console.error('Failed to load permissions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = permissions.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Key className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Access Control</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Granular Permission Protocols</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className={SECONDARY_BTN} title="Sync Registry">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Sync Registry
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Filters */}
                <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#EEAF1C] transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search permission code or description..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Table */}
                <SectionCard>
                    <SectionHeader title="Permission Protocol Manifest" icon={Terminal} subtitle="Read-only system access keys" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Access Segment</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">System Code</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Classification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={3} className="px-4 py-6"><div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-10 py-24 text-center">
                                            <Key className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500 dark:text-slate-400">No protocol entries discovered.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(p => (
                                        <tr key={p.id} className="group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/10 text-[#EEAF1C] rounded-lg flex items-center justify-center font-black text-[10px] group-hover:bg-[#EEAF1C] group-hover:text-white transition-all">
                                                        P
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white capitalize leading-none mb-1">
                                                            {p.name.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none">{p.description || "Core system access point"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400 font-bold">
                                                    {p.code}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-block px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-[#EEAF1C] text-[10px] font-bold uppercase tracking-tight">
                                                    {p.category}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}



