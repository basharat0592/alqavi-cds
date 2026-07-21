"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, RefreshCw, Trash2, ShieldCheck, Mail, Phone, AlertTriangle, UserPlus
} from 'lucide-react';
import { userService } from '@/lib/api';
import { authService } from '@/lib/auth';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';
import toast from 'react-hot-toast';

export default function SystemUsersPage() {
    const router = useRouter();

    // ── Access: branch admins only (not the Super Admin, not restricted staff) ──
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [selfId, setSelfId] = useState<number | null>(null);
    useEffect(() => {
        const u: any = authService.getUser();
        const role = (typeof u?.role === 'string' ? u.role : u?.role_name || '').toLowerCase();
        setSelfId(u?.id ? Number(u.id) : null);
        setAllowed(!authService.isSuperAdmin() && role === 'admin');
    }, []);

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const u = await userService.getAll();
            setUsers(Array.isArray(u) ? u : (u as any)?.results || []);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (allowed) load(); }, [allowed, load]);

    // The list is already tenant-scoped by the API (this admin + their staff).
    // Show only the staff this admin manages — hide the admin's own row.
    const staff = users.filter(u => Number(u.id) !== selfId);
    const filtered = staff.filter(u => {
        const q = search.toLowerCase();
        return !q ||
            (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.role_name || '').toLowerCase().includes(q);
    });

    const fullName = (u: any) => (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).trim() || u.username || u.email;

    const toggleActive = async (u: any) => {
        setTogglingId(u.id);
        try {
            if (u.is_active) await userService.deactivate(u.id);
            else await userService.activate(u.id);
            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active, status: !x.is_active ? 'active' : 'inactive' } : x));
        } catch {
            toast.error('Failed to update status');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await userService.delete(deleteTarget.id);
            if (res?.deactivated) {
                // User owns records — the backend deactivated them instead of deleting.
                setUsers(prev => prev.map(x => x.id === deleteTarget.id
                    ? { ...x, is_active: false, status: 'inactive' } : x));
                toast(res.message || 'User owns records and was deactivated instead of deleted.', { icon: '⚠️' });
            } else {
                setUsers(prev => prev.filter(x => x.id !== deleteTarget.id));
                toast.success('User removed');
            }
            setDeleteTarget(null);
        } catch (e: any) {
            toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed to remove user');
        } finally {
            setDeleting(false);
        }
    };

    if (allowed === null) return null;
    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-bold text-slate-900">Branch admins only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Only a branch admin can manage their own system users.</p>
            </div>
        );
    }

    return (
        <div className="pb-12 text-left text-slate-800">
            <div className="max-w-[1200px] mx-auto">
                <PageHeader
                    title="System Users"
                    subtitle="Add and manage the staff users in your own workspace"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'System Users' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={load} disabled={loading} className="whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button onClick={() => router.push('/admin/system-users/add')} className="whitespace-nowrap">
                                <UserPlus size={16} /> Add User
                            </Button>
                        </>
                    }
                />

                <Card className="p-4 sm:p-5 mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name, email or role..." className={ui.inputBase + ' pl-10'} />
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && users.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[14px] text-slate-500 font-medium">Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-[14px] text-slate-500 font-medium">No system users yet. Click “Add User” to create one.</td></tr>
                                ) : (
                                    filtered.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[13px] shrink-0">
                                                        {(fullName(u)[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-[14px] text-slate-900 truncate">{fullName(u)}</p>
                                                        <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate"><Mail size={11} /> {u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge tone="blue">{u.role_name || '—'}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-[13px] text-slate-600">
                                                {u.phone ? <span className="inline-flex items-center gap-1"><Phone size={11} className="text-slate-400" /> {u.phone}</span> : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(u)}
                                                    disabled={togglingId === u.id}
                                                    title={u.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300'} ${togglingId === u.id ? 'opacity-50' : ''}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${u.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setDeleteTarget(u)} className="text-[12px] font-bold text-rose-600 hover:underline inline-flex items-center gap-1">
                                                    <Trash2 size={13} /> Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Delete confirm */}
            <Modal open={!!deleteTarget} onClose={() => { if (!deleting) setDeleteTarget(null); }} title="Remove User" size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />} Remove
                        </Button>
                    </>
                }
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                        <AlertTriangle size={20} />
                    </div>
                    <p className="text-[13px] text-slate-600">
                        Remove <span className="font-bold text-slate-900">{deleteTarget ? fullName(deleteTarget) : ''}</span> from your workspace? They will no longer be able to sign in. This cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
