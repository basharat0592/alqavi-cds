'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, Trash2, Plus, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';
import { roleService, AppRole } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';

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
        <div className="text-left">

            <PageHeader
                title="Staff Roles"
                subtitle="Platform Access Tiers"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Staff Roles' },
                ]}
                actions={
                    <>
                        <Button variant="outline" onClick={loadData} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                        </Button>
                        <Link href="/admin/users/roles/add">
                            <Button variant="primary"><Plus size={14} /> Create Tier</Button>
                        </Link>
                    </>
                }
            />

            {/* Search */}
            <Card className="p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search security tiers by name or description..."
                        className={ui.inputBase + " pl-10"}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden text-left mb-6">
                <div className="bg-slate-50/60 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-[13px] font-bold text-slate-900">Access Privileges Registry</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Security Segment</th>
                                <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Protocol Class</th>
                                <th className="px-2.5 sm:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
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
                                    <td colSpan={3} className="px-10 py-24 text-center text-slate-600">
                                        <Layers className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <h3 className="text-[14px] font-bold text-slate-900">No Tiers Configured</h3>
                                        <p className="text-[11px] text-slate-400 mt-1">Initialize a security role to begin.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(role => (
                                    <tr key={role.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                        <td className="px-2.5 sm:px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                    {(role.name?.[0] || 'R').toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link href={`/admin/users/roles/${role.id}/edit`} className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer truncate">
                                                        {role.name}
                                                    </Link>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-md mt-0.5">{role.description || 'Global system permissions profile'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2.5 sm:px-6 py-3.5 whitespace-nowrap">
                                            {role.is_default ? (
                                                <Badge tone="blue">Core Default</Badge>
                                            ) : (
                                                <Badge tone="neutral">Custom</Badge>
                                            )}
                                        </td>
                                        <td className="px-2.5 sm:px-6 py-3.5 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Link href={`/admin/users/roles/${role.id}/edit`}>
                                                    <Button variant="outline" size="sm">Edit</Button>
                                                </Link>
                                                {!role.is_default && role.name?.toLowerCase() !== 'super admin' && (
                                                    <button
                                                        onClick={() => setDeleteRole(role)}
                                                        className="p-1 border border-rose-200 rounded-lg bg-rose-50/50 hover:bg-rose-50 text-rose-600 h-8 w-8 flex items-center justify-center transition-colors"
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
            </Card>

            {/* Delete Modal */}
            <Modal
                open={!!deleteRole}
                onClose={() => setDeleteRole(null)}
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteRole(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                        <Trash2 size={24} className="text-rose-600" />
                    </div>
                    <h3 className="text-[17px] font-bold text-slate-900 mb-2">Delete Tier?</h3>
                    <p className="text-[13px] text-slate-600">Confirm permanent removal of the security tier <span className="font-bold text-slate-900">"{deleteRole?.name}"</span>? This cannot be undone.</p>
                </div>
            </Modal>
        </div>
    );
}
