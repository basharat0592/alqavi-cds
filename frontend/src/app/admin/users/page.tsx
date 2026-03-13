'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, User, ShoppingBag, Shield, Search,
    Edit2, Trash2, X, Check, Plus, CheckCircle,
    Mail, Calendar, AlertTriangle, Loader2, KeyRound, Activity, History,
    UserCheck, UserMinus, ChevronRight, MoreVertical, RefreshCw, BarChart2, Star, Zap
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole, ActivityLog } from '@/lib/api';
import { RoleBadge, ActiveBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

type RoleFilter = 'all' | 'customer' | 'seller' | 'admin' | string;

export default function UsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeRole, setActiveRole] = useState<RoleFilter>('all');
    const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

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

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const confirmDelete = async () => {
        if (!deleteUser) return;
        setDeleting(true);
        try {
            await userService.delete(deleteUser.id);
            setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
            showToast(`User "${deleteUser.first_name}" removed successfully.`);
        } catch {
            showToast('Failed to remove user.');
        } finally {
            setDeleting(false);
            setDeleteUser(null);
        }
    };

    const filtered = users.filter(u => {
        const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
        const matchesRole = activeRole === 'all' || u.role_name?.toLowerCase().includes(activeRole);
        const matchesSearch = fullName.includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900]">
                        <CheckCircle className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                        <p className="text-xs font-bold uppercase tracking-widest leading-none">{toast}</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#FF9900]" />
                        User Registry
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Platform management and account settings</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/users/add" className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="h-4 w-4" strokeWidth={3} />
                        Register New User
                    </Link>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricBox label="Total Users" value={users.length} icon={Users} />
                <MetricBox label="Active Profiles" value={users.filter(u => u.is_active).length} icon={UserCheck} color="text-[#007185]" />
                <MetricBox label="Pending" value={users.filter(u => !u.is_active).length} icon={AlertTriangle} color="text-amber-600" />
                <MetricBox label="System Staff" value={users.filter(u => u.role_name?.toLowerCase().includes('admin')).length} icon={Shield} />
            </div>

            {/* Search & Filter Strip */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 border-b-0 rounded-t p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2.5} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#FF9900] dark:text-white transition-all"
                    />
                </div>
                <div className="flex bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-0.5 rounded overflow-hidden">
                    {['all', 'admin', 'seller', 'customer'].map(r => (
                        <button key={r} onClick={() => setActiveRole(r)}
                            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded
                                        ${activeRole === r ? 'bg-white dark:bg-slate-700 text-[#FF9900] shadow-sm border border-gray-100 dark:border-slate-600' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table Card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Identification</th>
                                <th className="px-6 py-4">Role / Permissions</th>
                                <th className="px-6 py-4">Registration</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-10"><div className="h-4 bg-gray-50 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100">
                                            <Users className="w-8 h-8 text-gray-200" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">No Users Found</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{search ? 'Try adjusting your search criteria' : 'Register a new user to populate the registry'}</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(user => (
                                    <tr key={user.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded flex items-center justify-center font-bold text-gray-500 text-sm">
                                                    {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider w-fit
                                                    ${user.role_name?.toLowerCase().includes('admin') ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm' :
                                                        user.role_name?.toLowerCase().includes('seller') ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                                            'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                                    {user.role_name || 'Customer'}
                                                </span>
                                                <p className="text-[10px] text-gray-400 font-medium italic opacity-60 truncate max-w-[150px]">{user.business_name || 'STANDALONE'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Calendar className="h-3 w-3" />
                                                <p className="text-xs font-bold text-gray-500">{formatDate(user.date_joined || new Date().toISOString())}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                <span className={`text-[10px] font-bold uppercase tracking-widest ${user.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
                                                    {user.is_active ? 'Active' : 'Offline'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/admin/users/edit/${user.id}`} title="Modify Account"
                                                    className="p-2 text-gray-400 hover:text-[#FF9900] transition-all rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => setDeleteUser(user)} title="Purge Identity"
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-all rounded hover:bg-gray-100 dark:hover:bg-slate-700">
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

                {/* Footer Count Strip */}
                <div className="bg-gray-50/50 dark:bg-slate-800/50 p-4 border-t border-gray-50 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest italic">
                        Total Identities Mapping: {users.length}
                    </p>
                </div>
            </div>

            {/* Amazon-Style Delete Modal */}
            {deleteUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                            </div>
                            <button onClick={() => setDeleteUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete the user <span className="font-bold text-gray-900 dark:text-white">"{deleteUser.first_name} {deleteUser.last_name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button 
                                onClick={() => setDeleteUser(null)} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={deleting}
                                className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-xs font-medium text-[#111] transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricBox({ label, value, icon: Icon, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; icon: any; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#FF9900] transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-[#FF9900] transition-colors">{label}</p>
                <Icon className="h-4 w-4 text-gray-300 dark:text-slate-700 group-hover:text-[#FF9900]/40 transition-colors" />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
        </div>
    );
}
