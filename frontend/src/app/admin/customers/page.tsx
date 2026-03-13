'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Users, User, ShoppingBag, Shield, Search,
    Edit3, Trash2, X, Check, Plus,
    Mail, Calendar, AlertTriangle, Loader2, KeyRound, RefreshCw, Database,
    UserCheck, UserMinus, Globe, MoreVertical
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ── Components ────────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const INPUT = `w-full px-3 py-2 bg-white dark:bg-slate-800 border border-[#a6a6a6] dark:border-slate-700 rounded text-sm outline-none transition-all focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400`;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminCustomersPage() {
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState<'all' | 'customer' | 'seller' | 'admin'>('customer');
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState('');
    const [deleteUserTarget, setDeleteUserTarget] = useState<AppUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                userService.getAll().catch(() => []),
                roleService.getAll().catch(() => [])
            ]);
            setRoles(rolesData);
            setUsers(usersData);
        } catch (err) {
            console.error('Failed to load customers data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const confirmDelete = async () => {
        if (!deleteUserTarget) return;
        setDeleting(true);
        try {
            await userService.delete(deleteUserTarget.id);
            setUsers(prev => prev.filter(u => u.id !== deleteUserTarget.id));
            showToast('Customer information deleted.');
        } catch {
            showToast('Action failed.');
        } finally {
            setDeleting(false);
            setDeleteUserTarget(null);
        }
    };

    const filtered = users.filter(u => {
        const name = `${u.first_name} ${u.last_name}`.trim();
        const roleMatch = activeRole === 'all' ||
            (u.role_name && u.role_name.toLowerCase() === activeRole) ||
            (typeof u.role === 'string' && u.role.toLowerCase() === activeRole) ||
            (!u.role && activeRole === 'customer');

        const matchSearch = !search ||
            name.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase());
        return roleMatch && matchSearch;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Amazon Style Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900] z-[100] animate-in slide-in-from-bottom-5">
                    <Check className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-bold uppercase tracking-tight">{toast}</span>
                </div>
            )}

            {/* Simple Amazon Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Users className="h-6 w-6 text-[#FF9900]" /> Customer Management
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage platform users, roles, and security records</p>
                </div>
                <Link href="/admin/customers/add"
                    className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Add Customer
                </Link>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Base', val: loading ? '...' : users.length, icon: Database, color: 'text-blue-600' },
                    { label: 'Active Only', val: users.filter(u => u.is_active !== false).length, icon: UserCheck, color: 'text-green-600' },
                    { label: 'Inactive', val: users.filter(u => u.is_active === false).length, icon: UserMinus, color: 'text-red-600' },
                    {
                        label: 'New This Month', val: users.filter(u => {
                            if (!u.date_joined) return false;
                            const j = new Date(u.date_joined); const n = new Date();
                            return j.getMonth() === n.getMonth() && j.getFullYear() === n.getFullYear();
                        }).length, icon: Calendar, color: 'text-[#FF9900]'
                    }
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 p-4 rounded shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                            <p className={`text-xl font-bold tracking-tight ${s.color}`}>{s.val}</p>
                        </div>
                        <s.icon className={`h-6 w-6 ${s.color} opacity-20`} />
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <SectionCard className="mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find by name, email or ID..."
                            className={INPUT}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded border border-gray-200 dark:border-slate-700">
                        {['customer', 'seller', 'admin', 'all'].map(r => (
                            <button key={r} onClick={() => setActiveRole(r as any)}
                                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${activeRole === r
                                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}>
                                {r}s
                            </button>
                        ))}
                    </div>
                    <button onClick={loadData} className="p-2 border border-[#a6a6a6] rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </SectionCard>

            {/* Content Table */}
            <SectionCard>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-3">Identity</th>
                                <th className="px-6 py-3">Reachability</th>
                                <th className="px-6 py-3">Registration</th>
                                <th className="px-6 py-3">Access</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={5} className="px-6 py-6 animate-pulse"><div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No records found matching criteria.</td>
                                </tr>
                            ) : (
                                filtered.map((u) => {
                                    const name = `${u.first_name} ${u.last_name}`.trim() || u.username;
                                    return (
                                        <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-gray-100 dark:bg-slate-800 text-[#131921] dark:text-[#FF9900] flex items-center justify-center font-bold text-xs rounded">
                                                        {name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <Link href={`/admin/customers/edit/${u.id}`} className="font-bold text-gray-900 dark:text-white hover:text-[#C45500] hover:underline transition-colors text-sm">
                                                            {name}
                                                        </Link>
                                                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">ID: {u.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                    <Mail className="h-3 w-3 opacity-40" /> {u.email}
                                                </div>
                                                {u.phone && <div className="text-[10px] text-gray-400 font-medium mt-0.5">{u.phone}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest">
                                                    {u.date_joined ? formatDate(u.date_joined) : '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${u.is_active !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                    <span className={`text-[10px] font-bold uppercase ${u.is_active !== false ? 'text-green-700' : 'text-gray-400'}`}>
                                                        {u.is_active !== false ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link href={`/admin/customers/edit/${u.id}`} className="p-1.5 text-gray-400 hover:text-[#FF9900]">
                                                        <Edit3 className="h-4 w-4" />
                                                    </Link>
                                                    <button onClick={() => setDeleteUserTarget(u)} className="p-1.5 text-gray-400 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* Amazon Style Delete Modal */}
            {deleteUserTarget && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Removal</h3>
                            </div>
                            <button onClick={() => setDeleteUserTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Proceeding will permanently delete <span className="font-bold text-gray-900 dark:text-white">"{deleteUserTarget.first_name} {deleteUserTarget.last_name}"</span>.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button onClick={() => setDeleteUserTarget(null)} disabled={deleting}
                                className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} disabled={deleting}
                                className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded shadow-sm text-xs font-medium text-[#111] transition-colors flex items-center gap-2 disabled:opacity-50">
                                {deleting && <Loader2 className="h-3 w-3 animate-spin" />} Delete Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
