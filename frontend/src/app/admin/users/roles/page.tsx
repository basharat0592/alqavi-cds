'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Shield, Search, Edit2, Trash2, Plus, CheckCircle, AlertTriangle, RefreshCw, Layers, X, Loader2,
    ShieldCheck, Lock, MoreHorizontal
} from 'lucide-react';
import { roleService, AppRole } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

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

const PRIMARY_BTN = "bg-[#EEAF1C] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95";

export default function UserRolesPage() {
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteRole, setDeleteRole] = useState<AppRole | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await roleService.getAll();
            setRoles(data || []);
        } catch (err) {
            console.error('Failed to load user roles', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <PageLoader />;

    const confirmDelete = async () => {
        if (!deleteRole) return;
        setDeleting(true);
        try {
            await roleService.delete(deleteRole.id);
            setRoles(prev => prev.filter(r => r.id !== deleteRole.id));
            toast.success(`Role "${deleteRole.name}" removed successfully.`);
        } catch {
            toast.error('Failed to remove role.');
        } finally {
            setDeleting(false);
            setDeleteRole(null);
        }
    };

    const filtered = roles.filter(r => 
        r.name?.toLowerCase().includes(search.toLowerCase()) || 
        r.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Role Security</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Platform Access Tiers</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className={SECONDARY_BTN} title="Sync Registry">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/users/roles/add" className={PRIMARY_BTN}>
                        <Plus className="h-3.5 w-3.5" />
                        Create Tier
                    </Link>
                </div>
            </div>

                {/* Search & Header */}
                <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl p-3">
                    <div className="relative group max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#EEAF1C] transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search security tiers by name or description..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Content Table */}
                <SectionCard>
                    <SectionHeader title="Access Privileges Registry" icon={ShieldCheck} subtitle="Managed security profiles" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Security Segment</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Protocol Class</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={3} className="px-4 py-8"><div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-10 py-24 text-center">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/10 shadow-inner">
                                                <Layers className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">No Tiers Configured</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Initialize a security role to begin.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(role => (
                                        <tr key={role.id} className="group hover:bg-white group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center font-bold text-[#EEAF1C] text-sm group-hover:bg-[#EEAF1C] group-hover:text-white group-hover:border-[#EEAF1C] transition-all">
                                                        {(role.name?.[0] || 'R').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {role.name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md font-medium">{role.description || 'Global system permissions profile'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-left">
                                                {role.is_default ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-[#EEAF1C] text-[10px] font-bold uppercase tracking-tight">
                                                        Core Default
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight text-slate-400 border border-slate-200 dark:border-white/10">
                                                        Custom
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/admin/users/roles/${role.id}/edit`} className="p-1.5 text-slate-400 hover:text-[#EEAF1C] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Link>
                                                    {!role.is_default && role.name?.toLowerCase() !== 'super admin' && (
                                                        <button 
                                                            onClick={() => setDeleteRole(role)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            {/* Delete Modal */}
            {deleteRole && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0D1921] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Confirm Purge</h3>
                            </div>
                            <button onClick={() => setDeleteRole(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Confirm permanent removal of the security tier <span className="text-[#EEAF1C] font-bold">"{deleteRole.name}"</span>?
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteRole(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors">Abort</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting} 
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />} Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

