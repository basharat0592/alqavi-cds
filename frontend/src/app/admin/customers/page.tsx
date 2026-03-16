'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Users, ShoppingBag, Shield, Search,
    Edit3, Trash2, X, Check, Plus,
    Mail, Calendar, AlertTriangle, Loader2, KeyRound, RefreshCw, Database,
    UserCheck, UserMinus, Globe, MoreVertical
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { 
    PageWrapper, PageHeader, SectionCard, Toast, DeleteConfirmModal, 
    FilterHub, AdminTable, AMZ_INPUT, PrimaryButton 
} from '@/components/ui/AmazonStyles';

// ── Constants ─────────────────────────────────────────────────────────────────

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
        <PageWrapper>

            {/* Amazon Style Toast */}
            <Toast message={toast} />

            {/* Simple Amazon Header */}
            <PageHeader
                title="Customer Management"
                subtitle="Manage platform users, roles, and security records"
                icon={Users}
                action={
                    <PrimaryButton href="/admin/customers/add">
                        <Plus className="h-4 w-4" /> Add Customer
                    </PrimaryButton>
                }
            />

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
            <FilterHub
                onSearch={setSearch}
                searchValue={search}
                searchPlaceholder="Find by name, email or ID..."
                loading={loading}
                onRefresh={loadData}
            >
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
            </FilterHub>

            {/* Content Table */}
            <AdminTable
                headers={['Identity', 'Reachability', 'Registration', 'Access', 'Actions']}
                data={filtered}
                loading={loading}
                emptyMessage="No records found matching criteria."
                renderRow={(u) => {
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
                }}
            />

            {/* Amazon Style Delete Modal */}
            <DeleteConfirmModal
                isOpen={!!deleteUserTarget}
                itemName={`${deleteUserTarget?.first_name} ${deleteUserTarget?.last_name}`}
                onCancel={() => setDeleteUserTarget(null)}
                onConfirm={confirmDelete}
                deleting={deleting}
            />
        </PageWrapper>
    );
}
