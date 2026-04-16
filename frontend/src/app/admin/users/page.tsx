"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, User, Shield, Search,
    Edit, Trash2, X, Plus, CheckCircle,
    Mail, Calendar, AlertTriangle, Loader2, RefreshCw,
    UserCheck, MapPin, Phone, Building2, ShieldCheck,
    Lock, MoreHorizontal, KeyRound, Eye, EyeOff, ChevronRight
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - USERS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

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
    const [selectedUserForView, setSelectedUserForView] = useState<AppUser | null>(null);
    const [resetting, setResetting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                userService.getAll(),
                roleService.getAll()
            ]);
            setUsers(usersData || []);
            setRoles(rolesData || []);
        } catch (err) { toast.error("Failed to load users"); } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const confirmDelete = async () => {
        if (!deleteUser) return;
        setDeleting(true);
        try {
            await userService.delete(deleteUser.id);
            setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
            toast.success(`User deleted`);
        } catch { toast.error('Failed to remove user'); } finally { setDeleting(false); setDeleteUser(null); }
    };

    const toggleUserStatus = async (user: AppUser) => {
        try {
            if (user.is_active) {
                await userService.deactivate(user.id);
                toast.success('User deactivated');
            } else {
                await userService.activate(user.id);
                toast.success('User activated');
            }
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) { toast.error('Failed to update status'); }
    };

    const filtered = users.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matchesRole = activeRole === 'all' || u.role_name?.toLowerCase().includes(activeRole.toLowerCase());
        const matchesSearch = fullName.includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = activeStatus === 'all' || (activeStatus === 'active' ? u.is_active : !u.is_active);
        return matchesRole && matchesSearch && matchesStatus;
    });

    if (loading && users.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Users</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Users</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Manage employees and system access</p>
                        </div>
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={loadData} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Btn>
                            <Btn onClick={() => router.push('/admin/users/add')}>
                                <Plus size={14} /> Add User
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 text-left">
                {/* Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-3 mb-6 shadow-sm flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search names or email..."
                            className={inputCls}
                        />
                    </div>
                    <div className="flex items-center gap-4 bg-[#f3f3f3] p-1 rounded-[4px] border border-[#ddd] w-full md:w-auto overflow-x-auto">
                        <div className="flex bg-white rounded-[3px] p-0.5 gap-1 shadow-sm shrink-0">
                            {['all', 'admin'].map(r => (
                                <button 
                                    key={r} 
                                    onClick={() => setActiveRole(r)}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-[2px]
                                        ${activeRole === r ? 'bg-[#f0c14b] text-[#0f1111]' : 'text-[#565959] hover:bg-[#eee]'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-[#ddd] shrink-0" />
                        <div className="flex bg-white rounded-[3px] p-0.5 gap-1 shadow-sm shrink-0">
                            {['all', 'active', 'inactive'].map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setActiveStatus(s as any)}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-[2px]
                                        ${activeStatus === s ? 'bg-[#27ae60] text-white' : 'text-[#565959] hover:bg-[#eee]'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Joined</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center text-[13px] text-[#565959]">No users found.</td></tr>
                            ) : (
                                filtered.map(user => (
                                    <tr key={user.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-[#f0f2f2] border border-[#ddd] rounded-[4px] flex items-center justify-center font-bold text-[#565959] group-hover:bg-[#f0c14b] group-hover:text-[#111] transition-all">
                                                    {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#111]">{user.first_name} {user.last_name}</p>
                                                    <p className="text-[11px] text-[#aaa]">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-block px-2 py-0.5 rounded-[2px] border text-[10px] font-bold uppercase tracking-tight w-fit
                                                    ${user.role_name?.toLowerCase().includes('admin') 
                                                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                                        : 'bg-white text-[#565959] border-[#ddd]'}`}>
                                                    {user.role_name || 'Individual'}
                                                </span>
                                                {user.business_name && <p className="text-[10px] text-[#aaa] font-bold uppercase">{user.business_name}</p>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[#565959]">
                                            {formatDate(user.date_joined || new Date().toISOString())}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <select 
                                                value={user.is_active ? 'active' : 'inactive'}
                                                onChange={() => toggleUserStatus(user)}
                                                className={`px-3 py-1 rounded-[3px] text-[10px] font-bold uppercase transition-all outline-none cursor-pointer border
                                                    ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setSelectedUserForView(user)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Eye size={14} /></button>
                                                <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-amber-50 text-amber-600"><Edit size={14} /></button>
                                                <button onClick={() => setDeleteUser(user)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Modal */}
            {deleteUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] max-w-sm w-full shadow-2xl p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-100"><AlertTriangle size={32} /></div>
                        <h3 className="text-[18px] font-bold text-[#111]">Delete User?</h3>
                        <p className="text-[13px] text-[#565959] mt-3 leading-relaxed">Delete <span className="font-bold text-[#111]">"{deleteUser.first_name} {deleteUser.last_name}"</span>? This will revoke all system access.</p>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setDeleteUser(null)} className="flex-1 py-2 text-[13px] font-bold text-[#565959] hover:underline">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-[3px] text-[13px] font-bold flex items-center justify-center gap-2">
                                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        {/* Password / Details Popup */}
        {selectedUserForView && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-[4px] border border-[#ddd] max-w-md w-full shadow-2xl overflow-hidden text-left animate-in zoom-in-95">
                    <div className="bg-[#f6f6f6] px-5 py-3 border-b border-[#ddd] flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[#111] uppercase">Full User Profile</span>
                        <button onClick={() => setSelectedUserForView(null)} className="text-[#aaa] hover:text-[#111]"><X size={20} /></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4 pb-6 border-b border-[#eee]">
                            <div className="w-12 h-12 bg-[#f0f2f2] border border-[#ddd] flex items-center justify-center rounded-[4px]">
                                <User size={24} className="text-[#ccc]" />
                            </div>
                            <div>
                                <h3 className="text-[18px] font-bold text-[#111] leading-none">{selectedUserForView.first_name} {selectedUserForView.last_name}</h3>
                                <p className="text-[11px] text-[#565959] font-bold uppercase mt-1.5 tracking-widest">{selectedUserForView.role_name || 'Individual'}</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-[4px] text-center">
                            <label className="text-[10px] font-bold text-[#565959] uppercase tracking-widest block mb-1">Security Key / Password</label>
                            {selectedUserForView.plain_password ? (
                                <div className="text-[28px] font-bold text-[#e47911] tracking-wider font-mono">{selectedUserForView.plain_password}</div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-[12px] text-red-600 font-bold uppercase">No Tracking</p>
                                    <Btn onClick={async () => {
                                        const newKey = Math.random().toString(36).slice(-8);
                                        setResetting(true);
                                        try {
                                            await userService.adminResetPassword(selectedUserForView.id, newKey);
                                            setSelectedUserForView(p => p ? { ...p, plain_password: newKey } : null);
                                            setUsers(prev => prev.map(u => u.id === selectedUserForView.id ? { ...u, plain_password: newKey } : u));
                                            toast.success("New password generated");
                                        } catch { toast.error("Failed to generate password"); } finally { setResetting(false); }
                                    }} loading={resetting} className="w-full h-[31px]">Reset & Show Password</Btn>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-[12px]">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Email Address</p>
                                <p className="font-bold text-[#111] truncate">{selectedUserForView.email || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Username</p>
                                <p className="font-bold text-[#111]">@{selectedUserForView.username}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Phone Number</p>
                                <p className="font-bold text-[#111]">{selectedUserForView.phone || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Postal Code</p>
                                <p className="font-bold text-[#111]">{selectedUserForView.postal_code || '—'}</p>
                            </div>
                            <div className="col-span-full space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Physical Address</p>
                                <p className="font-bold text-[#111]">{selectedUserForView.address || 'No address provided'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">City</p>
                                <p className="font-bold text-[#111]">{selectedUserForView.city || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#aaa] uppercase tracking-wider">Country</p>
                                <p className="font-bold text-[#111]">{selectedUserForView.country || '—'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-[#f6f6f6] border-t border-[#ddd] flex gap-3">
                         <Btn onClick={() => router.push(`/admin/users/edit/${selectedUserForView.id}`)} className="flex-1 h-[35px]">Edit User</Btn>
                         <Btn variant="secondary" onClick={() => setSelectedUserForView(null)} className="px-8 h-[35px]">Close</Btn>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}
