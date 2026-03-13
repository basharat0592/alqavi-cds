'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Shield, Search, Edit2, Trash2, Plus, CheckCircle, AlertTriangle, RefreshCw, Layers, X, Loader2
} from 'lucide-react';
import { roleService, AppRole } from '@/lib/api';

export default function UserRolesPage() {
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteRole, setDeleteRole] = useState<AppRole | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

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

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const confirmDelete = async () => {
        if (!deleteRole) return;
        setDeleting(true);
        try {
            await roleService.delete(deleteRole.id);
            setRoles(prev => prev.filter(r => r.id !== deleteRole.id));
            showToast(`Role "${deleteRole.name}" removed successfully.`);
        } catch {
            showToast('Failed to remove role.');
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
        <div className="max-w-[1200px] mx-auto pb-12 font-sans px-4 mt-6">

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
                        <Shield className="h-5 w-5 text-[#FF9900]" />
                        User Roles
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Manage system access privileges</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/users/roles/add" className="bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="h-4 w-4" strokeWidth={3} />
                        Create Role
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 border-b-0 rounded-t p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2.5} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search roles by name..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#FF9900] dark:text-white transition-all"
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Role Details</th>
                                <th className="px-6 py-4">Defaults</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={3} className="px-6 py-8"><div className="h-4 bg-gray-50 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-10 py-24 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100">
                                            <Layers className="w-8 h-8 text-gray-200" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">No Roles Found</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Create a role to manage privileges</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(role => (
                                    <tr key={role.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-[#FF9900]/10 border border-[#FF9900]/20 rounded flex items-center justify-center font-bold text-[#FF9900] text-sm">
                                                    {(role.name?.[0] || 'R').toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {role.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-sm">{role.description || 'No description provided'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-left">
                                            {role.is_default ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-200">
                                                    System Default
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                                    Custom Role
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/admin/users/roles/${role.id}/edit`} title="Edit Role"
                                                    className="p-2 text-gray-400 hover:text-[#FF9900] transition-all rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                                {!role.is_default && role.name?.toLowerCase() !== 'super admin' && (
                                                    <button 
                                                        onClick={() => setDeleteRole(role)}
                                                        title="Delete Role"
                                                        className="p-2 text-gray-400 hover:text-red-500 transition-all rounded hover:bg-gray-100 dark:hover:bg-slate-700"
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
            </div>

            {/* Amazon-Style Delete Modal */}
            {deleteRole && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Confirm Delete</h3>
                            </div>
                            <button onClick={() => setDeleteRole(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Are you sure you want to delete the role <span className="font-bold text-gray-900 dark:text-white">"{deleteRole.name}"</span>? This action is permanent.
                            </p>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                            <button 
                                onClick={() => setDeleteRole(null)} 
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
                                Delete Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
