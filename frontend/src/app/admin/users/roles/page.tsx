'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Shield, Search, Trash2, Plus, RefreshCw, Layers, ChevronRight, ShieldCheck
} from 'lucide-react';
import { roleService, AppRole } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - ROLE SECURITY
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] whitespace-nowrap ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

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
            toast.error('Failed to sync registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading && roles.length === 0) return <PageLoader />;

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
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111] text-left">
            
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <Link href="/admin/users" className="hover:text-[#c45500] hover:underline">Users</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Role Security</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Role Security</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Platform Access Tiers</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Btn variant="secondary" onClick={loadData} loading={loading} className="flex-1 sm:flex-initial">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Btn>
                            <Link href="/admin/users/roles/add" className="flex-1 sm:flex-initial flex">
                                <Btn className="w-full justify-center"><Plus size={14} /> Create Tier</Btn>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 mt-6">
                {/* Search */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search security tiers by name or description..."
                            className={inputCls + " pl-10 h-[35px]"}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <div className="bg-[#f7f8fa] px-5 py-3 border-b border-[#ddd] flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#e47911]" />
                        <span className="text-[13px] font-bold text-[#111]">Access Privileges Registry</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Security Segment</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Protocol Class</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {loading && filtered.length === 0 ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={3} className="px-2.5 sm:px-6 py-8">
                                                <div className="h-4 bg-slate-100 rounded w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-10 py-24 text-center text-[#565959]">
                                            <Layers className="w-10 h-10 text-[#eee] mx-auto mb-3" />
                                            <h3 className="text-[14px] font-bold text-[#111]">No Tiers Configured</h3>
                                            <p className="text-[11px] text-[#565959] mt-1">Initialize a security role to begin.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(role => (
                                        <tr key={role.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                            <td className="px-2.5 sm:px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-[#f0f2f2] border border-[#ddd] rounded-[4px] flex items-center justify-center font-bold text-[#565959] group-hover:bg-[#f0c14b] group-hover:text-[#111] transition-all">
                                                        {(role.name?.[0] || 'R').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link href={`/admin/users/roles/${role.id}/edit`} className="font-bold text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer truncate">
                                                            {role.name}
                                                        </Link>
                                                        <p className="text-[11px] text-[#565959] truncate max-w-[200px] sm:max-w-md mt-0.5">{role.description || 'Global system permissions profile'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 whitespace-nowrap">
                                                {role.is_default ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] border border-blue-200 bg-blue-50 text-[#007185] text-[10px] font-bold uppercase tracking-tight">
                                                        Core Default
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-tight text-[#565959] border border-[#ddd]">
                                                        Custom
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/admin/users/roles/${role.id}/edit`}>
                                                        <Btn variant="secondary" className="px-2 h-[26px]">Edit</Btn>
                                                    </Link>
                                                    {!role.is_default && role.name?.toLowerCase() !== 'super admin' && (
                                                        <button 
                                                            onClick={() => setDeleteRole(role)}
                                                            className="p-1 border border-red-200 rounded bg-red-50/50 hover:bg-red-50 text-red-600 h-[26px] w-[26px] flex items-center justify-center"
                                                        >
                                                            <Trash2 size={13} />
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
            </div>

            {/* Delete Modal */}
            {deleteRole && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] p-8 w-full max-w-sm shadow-xl text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                            <Trash2 size={24} className="text-red-600" />
                        </div>
                        <h3 className="text-[17px] font-bold text-[#111] mb-2">Delete Tier?</h3>
                        <p className="text-[13px] text-[#565959]">Confirm permanent removal of the security tier <span className="font-bold">"{deleteRole.name}"</span>? This cannot be undone.</p>
                        <div className="mt-6 space-y-2">
                            <button onClick={confirmDelete} disabled={deleting} className="w-full h-[31px] bg-red-600 text-white border border-red-700 rounded-[3px] text-[13px] font-medium shadow-sm flex items-center justify-center gap-2">
                                {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button onClick={() => setDeleteRole(null)} className="w-full text-[13px] text-[#007185] hover:text-[#c45500] hover:underline">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
