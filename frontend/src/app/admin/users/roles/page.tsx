'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, Trash2, Plus, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';
import { roleService, AppRole } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar, TableShell, Pagination, RowActions } from '@/components/admin/ui';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const changePageSize = (n: number) => { setPageSize(n); setCurrentPage(1); };
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: (string | number)[]) => {
        await Promise.allSettled(ids.map(id => roleService.delete(id)));
        setRoles(prev => prev.filter(r => !ids.map(String).includes(String(r.id))));
        toast.success(`${ids.length} role(s) deleted`);
    };

    if (loading && roles.length === 0) return <PageLoader />;

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
            <TableShell
                className="mb-6"
                filters={
                <div className="relative flex-1 w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9C98]" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search security tiers by name or description..."
                        className={ui.inputBase + " pl-10"}
                    />
                </div>
                }
                footer={
                    <Pagination
                        page={safePage}
                        totalPages={totalPages}
                        onPage={setCurrentPage}
                        total={filtered.length}
                        pageSize={pageSize}
                        onPageSize={changePageSize}
                    />
                }
            >
                <div className="bg-[#FAFAF8] px-5 py-3 border-b border-[#F2F2F0] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#1A1A1A]" />
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">Access Privileges Registry</span>
                </div>
                <div className="overflow-x-auto">
                    <table className={ui.table}>
                        <thead>
                            <tr>
                                <SelectAllTh sel={sel} />
                                <th className={ui.th + ' whitespace-nowrap'}>Security Segment</th>
                                <th className={ui.th + ' whitespace-nowrap'}>Protocol Class</th>
                                <th className={ui.th + ' text-right whitespace-nowrap'}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && filtered.length === 0 ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-2.5 sm:px-6 py-8">
                                            <div className="h-4 bg-[#F2F2F0] rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-10 py-24 text-center text-[#3A3A38]">
                                        <Layers className="w-10 h-10 text-[#DCDCD8] mx-auto mb-3" />
                                        <h3 className="text-[13px] font-semibold text-[#1A1A1A]">No Tiers Configured</h3>
                                        <p className="text-[11.5px] text-[#9C9C98] mt-1">Initialize a security role to begin.</p>
                                    </td>
                                </tr>
                            ) : (
                                paged.map(role => (
                                    <tr key={role.id} className="hover:bg-[#FAFAF8] transition-colors group text-[13px]">
                                        <RowCheckboxTd sel={sel} id={role.id} />
                                        <td className={ui.td}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-[#F2F2F0] border border-[#EDEDEA] rounded-lg flex items-center justify-center font-semibold text-[#8A8A86] group-hover:bg-[#F59E0B] group-hover:text-white group-hover:border-[#F59E0B] transition-all">
                                                    {(role.name?.[0] || 'R').toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link href={`/admin/users/roles/${role.id}/edit`} className="font-semibold text-[#119AB8] hover:text-[#0E7F98] hover:underline cursor-pointer truncate">
                                                        {role.name}
                                                    </Link>
                                                    <p className="text-[11.5px] text-[#9C9C98] truncate max-w-[200px] sm:max-w-md mt-0.5">{role.description || 'Global system permissions profile'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={ui.td + ' whitespace-nowrap'}>
                                            {role.is_default ? (
                                                <Badge tone="blue">Core Default</Badge>
                                            ) : (
                                                <Badge tone="neutral">Custom</Badge>
                                            )}
                                        </td>
                                        <td className={ui.td + ' text-right whitespace-nowrap'}>
                                            <RowActions items={[
                                                { label: 'Edit', href: `/admin/users/roles/${role.id}/edit` },
                                                !role.is_default && role.name?.toLowerCase() !== 'super admin'
                                                    && { label: 'Delete', onClick: () => setDeleteRole(role), danger: true },
                                            ]} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </TableShell>

            <BulkBar
                sel={sel}
                entity="roles"
                onDelete={bulkDelete}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((r: any) => ({
                        name: r.name || '',
                        description: r.description || '',
                        type: r.is_default ? 'Core Default' : 'Custom',
                        permissions: Array.isArray(r.permissions) ? r.permissions.length : (r.permissions_count ?? 0),
                    })),
                    'roles.csv',
                )}
            />

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
                    <h3 className="text-[17px] font-semibold text-[#1A1A1A] mb-2">Delete Tier?</h3>
                    <p className="text-[13px] text-[#3A3A38]">Confirm permanent removal of the security tier <span className="font-semibold text-[#1A1A1A]">"{deleteRole?.name}"</span>? This cannot be undone.</p>
                </div>
            </Modal>
        </div>
    );
}
