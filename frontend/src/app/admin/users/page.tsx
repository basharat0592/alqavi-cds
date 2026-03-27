'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, User, Shield, Search,
    Edit, Trash2, X, Plus, CheckCircle,
    Mail, Calendar, AlertTriangle, Loader2, RefreshCw,
    UserCheck, MapPin, Phone, Building2
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ─── Shared Utilities (Consistency with Company pages) ────────────────────────────────
const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeRole, setActiveRole] = useState<string>('all');
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
            showToast(`User removed.`);
        } catch {
            alert('Failed to remove user.');
        } finally {
            setDeleting(false);
            setDeleteUser(null);
        }
    };

    const filtered = users.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matchesRole = activeRole === 'all' || u.role_name?.toLowerCase().includes(activeRole.toLowerCase());
        const matchesSearch = fullName.includes(search.toLowerCase()) || 
                            (u.email || '').toLowerCase().includes(search.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">
            
            {/* Simple Amazon Style Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6 text-[#E68A00]" /> User Registry
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage platform accounts and identity permissions</p>
                </div>
                <button
                    onClick={() => router.push('/admin/users/add')}
                    className="bg-[#E68A00] hover:bg-[#CC7A00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Register User
                </button>
            </div>

            {/* Statistics Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricBox label="Total Registry" value={users.length} icon={Users} />
                <MetricBox label="Active Profiles" value={users.filter(u => u.is_active).length} icon={UserCheck} color="text-green-600" />
                <MetricBox label="Suppliers" value={users.filter(u => u.role_name?.toLowerCase().includes('supplier')).length} icon={Building2} color="text-amber-600" />
                <MetricBox label="Administrators" value={users.filter(u => u.role_name?.toLowerCase().includes('admin')).length} icon={Shield} color="text-blue-600" />
                <MetricBox label="Growth Rate" value="+12%" icon={RefreshCw} color="text-blue-600" />
            </div>

            {/* Filter Hub */}
            <SectionCard className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search users by name or email..."
                            className={INPUT()}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-0.5 rounded overflow-hidden">
                            {['all', 'admin', 'supplier', 'customer'].map(r => (
                                <button key={r} onClick={() => setActiveRole(r)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded
                                                ${activeRole === r ? 'bg-white dark:bg-slate-700 text-[#E68A00] shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        <button onClick={loadData} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* Content Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Identification</th>
                                <th className="px-6 py-3">Role / Permissions</th>
                                <th className="px-6 py-3">Registration</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-6 animate-pulse"><div className="h-4 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No users found in the identity registry.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md flex items-center justify-center font-black text-gray-400 text-xs">
                                                    {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate uppercase tracking-tight">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest w-fit
                                                    ${user.role_name?.toLowerCase().includes('admin') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        user.role_name?.toLowerCase().includes('supplier') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                    {user.role_name || 'Customer'}
                                                </span>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter opacity-70">{user.business_name || 'Individual'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Calendar className="h-3 w-3" />
                                                <p className="text-xs font-bold text-gray-500">{formatDate(user.date_joined || new Date().toISOString())}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {user.is_active ? 'Active' : 'Offline'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} className="p-1.5 text-gray-600 hover:text-[#E68A00] transition-colors">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setDeleteUser(user)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
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

            {/* Amazon-Style Delete Modal */}
            {deleteUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Revoke Access</h3>
                            </div>
                            <button onClick={() => setDeleteUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to revoke access and delete user <span className="font-bold text-gray-900 dark:text-white">"{deleteUser.first_name} {deleteUser.last_name}"</span>?
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setDeleteUser(null)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] rounded shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-xs font-medium text-[#111] transition-colors">Confirm Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#E68A00] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}

function MetricBox({ label, value, icon: Icon, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; icon: any; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#E68A00] transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] group-hover:text-[#E68A00] transition-colors">{label}</p>
                <Icon className="h-4 w-4 text-gray-300 dark:text-slate-700 group-hover:text-[#E68A00]/40 transition-colors" />
            </div>
            <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
        </div>
    );
}
