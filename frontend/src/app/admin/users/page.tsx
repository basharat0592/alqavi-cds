'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, User, Shield, Search,
    Edit, Trash2, X, Plus, CheckCircle,
    Mail, Calendar, AlertTriangle, Loader2, RefreshCw,
    UserCheck, MapPin, Phone, Building2, ShieldCheck,
    Lock, MoreHorizontal
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole } from '@/lib/api';
import { formatDate } from '@/lib/utils';
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeRole, setActiveRole] = useState<string>('all');
    const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                userService.getAll(),
                roleService.getAll()
            ]);
            setUsers(usersData || []);
            setRoles(rolesData || []);
        } catch (err) {
            console.error('Failed to load identity registry', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <PageLoader />;

    const confirmDelete = async () => {
        if (!deleteUser) return;
        setDeleting(true);
        try {
            await userService.delete(deleteUser.id);
            setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
            toast.success(`User access revoked.`);
        } catch {
            toast.error('Failed to remove user.');
        } finally {
            setDeleting(false);
            setDeleteUser(null);
        }
    };

    const toggleUserStatus = async (user: AppUser) => {
        try {
            if (user.is_active) {
                await userService.deactivate(user.id);
                toast.success('User disabled.');
            } else {
                await userService.activate(user.id);
                toast.success('User activated.');
            }
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) {
            toast.error('Failed to change user status.');
        }
    };

    const filtered = users.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matchesRole = activeRole === 'all' || u.role_name?.toLowerCase().includes(activeRole.toLowerCase());
        const matchesSearch = fullName.includes(search.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = activeStatus === 'all' || 
                             (activeStatus === 'active' ? u.is_active : !u.is_active);
        return matchesRole && matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEAF1C] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">System Users</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Identity & Access Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className={SECONDARY_BTN} title="Sync Registry">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => router.push('/admin/users/add')}
                        className={PRIMARY_BTN}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Register User
                    </button>
                </div>
            </div>

            {/* Content Hub */}
            <div className="space-y-4">
                {/* Search & Filter */}
                <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#EEAF1C] transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search system registry..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10 w-full md:w-auto">
                        <div className="flex bg-white dark:bg-black/20 rounded p-0.5 gap-1 shadow-sm">
                            {['all', 'admin', 'supplier'].map(r => (
                                <button 
                                    key={r} 
                                    onClick={() => setActiveRole(r)}
                                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all rounded
                                        ${activeRole === r 
                                            ? 'bg-[#EEAF1C] text-white shadow-md' 
                                            : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />
                        <div className="flex bg-white dark:bg-black/20 rounded p-0.5 gap-1 shadow-sm">
                            {(['all', 'active', 'inactive'] as const).map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setActiveStatus(s)}
                                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all rounded
                                        ${activeStatus === s 
                                            ? 'bg-emerald-600 text-white shadow-md' 
                                            : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <SectionCard>
                    <SectionHeader title="System Identity Registry" icon={Lock} subtitle="Secure access control list" />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Identification</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Role / Access</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Registration</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-tight">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-4 py-4"><div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <Users className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500 dark:text-slate-400">No system identity records found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-lg flex items-center justify-center font-bold text-[10px] group-hover:bg-[#EEAF1C] group-hover:text-white transition-all">
                                                        {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{user.first_name} {user.last_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight w-fit
                                                        ${user.role_name?.toLowerCase().includes('admin') 
                                                            ? 'bg-blue-50 text-[#EEAF1C] border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20' 
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
                                                        {user.role_name || 'Individual'}
                                                    </span>
                                                    {user.business_name && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter opacity-70">{user.business_name}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(user.date_joined || new Date().toISOString())}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <select 
                                                    value={user.is_active ? 'active' : 'inactive'}
                                                    onChange={(e) => toggleUserStatus(user)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm outline-none cursor-pointer border-none
                                                        ${user.is_active 
                                                            ? 'bg-emerald-100/80 text-emerald-700 hover:bg-emerald-200' 
                                                            : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    <option value="active" className="bg-white text-slate-900">Active</option>
                                                    <option value="inactive" className="bg-white text-slate-900">Inactive</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} className="p-1.5 text-slate-400 hover:text-[#EEAF1C] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteUser(user)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>

            {/* Delete Confirmation */}
            {deleteUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0D1921] rounded-xl border border-slate-200 dark:border-white/10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Confirm Revoke</h3>
                            </div>
                            <button onClick={() => setDeleteUser(null)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                Confirm permanent removal of <span className="text-[#EEAF1C] font-bold">"{deleteUser.first_name} {deleteUser.last_name}"</span> from the system?
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/5">
                            <button onClick={() => setDeleteUser(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors">Abort</button>
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



