"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, User, Shield, Search,
    Edit, Trash2, X, Plus, CheckCircle,
    Mail, Calendar, AlertTriangle, Loader2, RefreshCw,
    UserCheck, MapPin, Phone, Building2, ShieldCheck,
    Lock, MoreHorizontal, KeyRound, Eye, EyeOff
} from 'lucide-react';
import { userService, roleService, AppUser, AppRole } from '@/lib/api';
import { authService } from '@/lib/auth';
import { formatDate, exportToCSV, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Card, Button, Badge, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   INTERNAL USERS — ADMIN DESIGN SYSTEM (INDIGO / SLATE)
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => (
    <Button
        type={type}
        onClick={onClick}
        disabled={loading || disabled}
        variant={variant === 'secondary' ? 'outline' : 'primary'}
        className={`whitespace-nowrap ${className}`}
    >
        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        {children}
    </Button>
);

const inputCls = ui.inputBase;

function BlinkingEye({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
    const [blink, setBlink] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isOpen || !isHovered) return;

        // Blink once immediately on hover
        setBlink(true);
        const timeout = setTimeout(() => setBlink(false), 180);

        // Keep blinking every 1.6 seconds while hovered
        const interval = setInterval(() => {
            setBlink(true);
            setTimeout(() => setBlink(false), 180);
        }, 1600);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [isOpen, isHovered]);

    const isEyeOpen = isOpen || blink;

    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setBlink(false);
            }}
            className="p-1.5 text-slate-400 hover:text-[#92600A] hover:bg-[#B4780B]/50 rounded-lg transition-colors focus:outline-none flex items-center justify-center shrink-0"
            title={isOpen ? "Hide Password" : "Show Password"}
        >
            <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
            >
                {/* Top Lid */}
                <path
                    className="transition-all duration-300 ease-in-out"
                    d={isEyeOpen ? "M2 12C5 5.5 19 5.5 22 12" : "M2 12C5 18.5 19 18.5 22 12"}
                />
                {/* Bottom Lid */}
                <path d="M2 12C5 18.5 19 18.5 22 12" />
                
                {/* Pupil Group with cute sparkle */}
                <g
                    className="transition-all duration-300 ease-in-out origin-center"
                    style={{
                        transform: isEyeOpen ? 'scale(1)' : 'scale(0)',
                        opacity: isEyeOpen ? 1 : 0,
                    }}
                >
                    <circle cx="12" cy="12" r="3.8" fill="currentColor" stroke="none" />
                    <circle cx="13.2" cy="10.8" r="0.9" fill="white" stroke="none" />
                </g>

                {/* Lashes */}
                <g 
                    className="transition-all duration-300 ease-in-out"
                    style={{ 
                        opacity: isEyeOpen ? 0 : 1,
                        transform: isEyeOpen ? 'translateY(1px)' : 'translateY(0px)'
                    }}
                >
                    <line x1="6.5" y1="16" x2="5.2" y2="17.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="17.5" x2="12" y2="19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="17.5" y1="16" x2="18.8" y2="17.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </g>
            </svg>
        </button>
    );
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeRole, setActiveRole] = useState<string>('all');
    const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => { const su = authService.isSuperAdmin(); setIsSuperAdmin(su); setAllowed(su); }, []);
    const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [selectedUserForView, setSelectedUserForView] = useState<AppUser | null>(null);
    const [showPasswordDetail, setShowPasswordDetail] = useState(false);

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
            const res: any = await userService.delete(deleteUser.id as any);
            if (res?.deactivated) {
                // Can't hard-delete an admin that owns branches / transactions — the
                // server deactivated them instead. Keep them in the list as inactive.
                setUsers(prev => prev.map(u => u.id === deleteUser.id ? { ...u, is_active: false, status: 'inactive' } as any : u));
                toast.success(res.message || 'This admin owns records, so it was deactivated (can no longer sign in) instead of deleted.', { duration: 6000 });
            } else {
                setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
                toast.success('User deleted');
            }
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

    // Distinct branches across all users — drives the branch filter dropdown.
    const branchOptions = useMemo(() => {
        const map = new Map<string, string>();
        users.forEach((u: any) => (u.warehouses || []).forEach((w: any) => map.set(String(w.id), w.name)));
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [users]);

    const filtered = users.filter((u: any) => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matchesRole = activeRole === 'all' || u.role_name?.toLowerCase().includes(activeRole.toLowerCase());
        const matchesSearch = fullName.includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = activeStatus === 'all' || (activeStatus === 'active' ? u.is_active : !u.is_active);
        const matchesBranch = branchFilter === 'all'
            || (branchFilter === 'none' ? (!u.is_super_admin && (u.warehouses || []).length === 0)
                : (u.warehouses || []).some((w: any) => String(w.id) === branchFilter));
        return matchesRole && matchesSearch && matchesStatus && matchesBranch;
    });

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: (string | number)[]) => {
        await Promise.allSettled(ids.map(id => userService.delete(Number(id))));
        setUsers(prev => prev.filter(u => !ids.map(String).includes(String(u.id))));
        toast.success(`${ids.length} user(s) deleted`);
    };

    const bulkSetActive = async (ids: (string | number)[], active: boolean) => {
        await Promise.allSettled(ids.map(id => active ? userService.activate(Number(id)) : userService.deactivate(Number(id))));
        setUsers(prev => prev.map(u => ids.map(String).includes(String(u.id)) ? { ...u, is_active: active } : u));
        toast.success(`Marked ${ids.length} user(s) ${active ? 'active' : 'inactive'}`);
    };

    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <Shield size={26} />
                </div>
                <h2 className="text-[18px] font-bold text-slate-900">Super Admin only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Internal user management is restricted to Super Admins.</p>
            </div>
        );
    }

    if (loading && users.length === 0) return <PageLoader />;

    return (
        <div className="pb-12 text-left text-slate-800">
            <div className="max-w-[1400px] mx-auto">
                <PageHeader
                    title="Admins"
                    subtitle="Manage employees and system access"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Admins' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={loadData} disabled={loading} className="whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Sync</span>
                            </Button>
                            {isSuperAdmin && (
                                <Button variant="outline" onClick={() => router.push('/admin/branches')} className="whitespace-nowrap">
                                    <Building2 size={14} /> <span className="hidden sm:inline">Branches</span>
                                </Button>
                            )}
                            <Button onClick={() => router.push('/admin/users/add')} className="whitespace-nowrap">
                                <Plus size={16} /> {isSuperAdmin ? 'Add New Admin' : 'Add User'}
                            </Button>
                        </>
                    }
                />

                {/* Filters */}
                <Card className="p-4 sm:p-5 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search names or email..."
                            className={inputCls + ' pl-10'}
                        />
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-3 bg-slate-50 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
                        {/* Role toggle is meaningless for a Super Admin (they only manage Admins). */}
                        {!isSuperAdmin && (
                            <>
                                <div className="flex bg-white rounded-lg p-0.5 gap-1 border border-slate-200/70 shrink-0">
                                    {['all', 'admin'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setActiveRole(r)}
                                            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all rounded-md
                                                ${activeRole === r ? 'bg-[#F59E0B] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-4 w-px bg-slate-200 shrink-0" />
                            </>
                        )}
                        <div className="flex bg-white rounded-lg p-0.5 gap-1 border border-slate-200/70 shrink-0">
                            {['all', 'active', 'inactive'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setActiveStatus(s as any)}
                                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all rounded-md
                                        ${activeStatus === s ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        {(isSuperAdmin || branchOptions.length > 0) && (
                            <>
                                <div className="h-4 w-px bg-slate-200 shrink-0" />
                                <select
                                    value={branchFilter}
                                    onChange={e => setBranchFilter(e.target.value)}
                                    className="shrink-0 h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] font-bold text-slate-600 outline-none focus:border-[#F59E0B] cursor-pointer"
                                    title="Filter by branch"
                                >
                                    <option value="all">All branches</option>
                                    {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    <option value="none">— Unassigned —</option>
                                </select>
                            </>
                        )}
                    </div>
                </Card>

                {/* ── Mobile: card list ── */}
                <div className="sm:hidden space-y-2.5 mb-6">
                    {filtered.length === 0 ? (
                        <Card className="py-16 text-center text-[13px] text-slate-500">No users found.</Card>
                    ) : filtered.map(user => (
                        <div key={user.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-3.5">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={sel.isSelected(user.id)}
                                    onChange={() => sel.toggle(user.id)}
                                    className="mt-1 w-4 h-4 accent-[#B4780B] rounded border-slate-300 cursor-pointer shrink-0"
                                />
                                <div className="h-10 w-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden font-bold text-slate-500 shrink-0">
                                    {user.avatar ? <img src={getImageUrl(user.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                        : (user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 text-[13.5px] truncate">{user.first_name} {user.last_name}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        <Badge tone={user.role_name?.toLowerCase().includes('admin') ? 'blue' : 'neutral'}>{user.role_name || 'Individual'}</Badge>
                                        {(user as any).is_super_admin
                                            ? <Badge tone="blue">All Branches</Badge>
                                            : ((user as any).warehouses || []).length === 0
                                                ? <span className="text-[10px] font-semibold text-rose-500">No branch</span>
                                                : <span className="text-[10px] font-semibold text-slate-500">{((user as any).warehouses || []).map((w: any) => w.name).join(', ')}</span>}
                                    </div>
                                </div>
                                <select
                                    value={user.is_active ? 'active' : 'inactive'}
                                    onChange={() => toggleUserStatus(user)}
                                    className={`shrink-0 px-2 py-1 rounded-lg text-[9.5px] font-bold uppercase tracking-wide outline-none cursor-pointer border
                                        ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                <button onClick={() => setSelectedUserForView(user)} className="flex-1 h-9 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-600 hover:bg-slate-50">View</button>
                                <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} className="flex-1 h-9 rounded-lg border border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[12px] font-bold text-[#B4780B] hover:bg-[#F59E0B]/15">Edit</button>
                                {!(user as any).is_super_admin && (
                                    <button onClick={() => setDeleteUser(user)} className="flex-1 h-9 rounded-lg border border-rose-200 bg-rose-50 text-[12px] font-bold text-rose-600 hover:bg-rose-100">Delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Desktop: table ── */}
                <Card className="hidden sm:block overflow-hidden text-left mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200/70">
                                    <SelectAllTh sel={sel} />
                                    <th className="px-2.5 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">User</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Role</th>
                                    <th className="hidden md:table-cell px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Branch</th>
                                    <th className="hidden sm:table-cell px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Joined</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center whitespace-nowrap">Status</th>
                                    <th className="px-2.5 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-24 text-center text-[14px] text-slate-500 font-medium">No users found.</td></tr>
                                ) : (
                                    filtered.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
                                            <RowCheckboxTd sel={sel} id={user.id} />
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden font-bold text-slate-500 group-hover:bg-[#B4780B] group-hover:text-white group-hover:border-[#F59E0B] transition-all">
                                                        {user.avatar ? (
                                                            <img src={getImageUrl(user.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            (user.first_name?.[0] || '') + (user.last_name?.[0] || '')
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{user.first_name} {user.last_name}</p>
                                                        <p className="text-[11px] text-slate-400">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge tone={user.role_name?.toLowerCase().includes('admin') ? 'blue' : 'neutral'}>
                                                        {user.role_name || 'Individual'}
                                                    </Badge>
                                                    {user.business_name && <p className="text-[10px] text-slate-400 font-bold uppercase">{user.business_name}</p>}
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                                {(user as any).is_super_admin ? (
                                                    <Badge tone="blue">All Branches</Badge>
                                                ) : ((user as any).warehouses || []).length === 0 ? (
                                                    <span className="text-[11px] font-semibold text-rose-500">No branch</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                        {((user as any).warehouses || []).map((w: any) => (
                                                            <span key={w.id} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                                                <Building2 size={10} className="text-slate-400" />{w.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4 text-slate-600 whitespace-nowrap tabular-nums">
                                                {formatDate(user.date_joined || new Date().toISOString())}
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 text-center whitespace-nowrap">
                                                <select
                                                    value={user.is_active ? 'active' : 'inactive'}
                                                    onChange={() => toggleUserStatus(user)}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all outline-none cursor-pointer border
                                                        ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-2.5 sm:py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2.5 opacity-100 transition-opacity">
                                                    <button onClick={() => setSelectedUserForView(user)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} className="text-[12px] font-bold text-[#B4780B] hover:underline">Edit</button>
                                                    {/* A Super Admin account cannot be deleted from here. */}
                                                    {!(user as any).is_super_admin && (
                                                        <>
                                                            <span className="text-slate-300">|</span>
                                                            <button onClick={() => setDeleteUser(user)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                                        </>
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
            </div>

            <BulkBar
                sel={sel}
                entity="users"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Mark Active', apply: (ids) => bulkSetActive(ids, true) },
                    { label: 'Mark Inactive', apply: (ids) => bulkSetActive(ids, false) },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((u: any) => ({
                        username: u.username || '',
                        email: u.email || '',
                        first_name: u.first_name || '',
                        last_name: u.last_name || '',
                        role: u.role_name || '',
                        phone: u.phone || '',
                        status: u.is_active ? 'active' : 'inactive',
                    })),
                    'users.csv',
                )}
            />

            {/* Delete Modal */}
            <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} size="sm">
                {deleteUser && (
                    <div className="text-center py-2">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600"><AlertTriangle size={32} /></div>
                        <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Delete User?</h3>
                        <p className="text-[13px] text-slate-600 mt-3 leading-relaxed mb-8">Delete <span className="font-bold text-slate-900">"{deleteUser.first_name} {deleteUser.last_name}"</span>? This revokes all system access. If this admin owns branches or transactions, it will be <span className="font-semibold">deactivated</span> (blocked from signing in) instead of permanently removed, so their data stays intact.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setDeleteUser(null)} className="flex-1">Cancel</Button>
                            <Button variant="danger" onClick={confirmDelete} disabled={deleting} className="flex-1">
                                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Password / Details Popup */}
            {selectedUserForView && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50/60 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">Full User Profile</span>
                            <button onClick={() => { setSelectedUserForView(null); setShowPasswordDetail(false); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={16} /></button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                                <div className="w-12 h-12 bg-slate-100 border border-slate-200 flex items-center justify-center rounded-xl">
                                    <User size={24} className="text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none">{selectedUserForView.first_name} {selectedUserForView.last_name}</h3>
                                    <p className="text-[11px] text-[#B4780B] font-bold uppercase mt-1.5 tracking-widest">{selectedUserForView.role_name || 'Individual'}</p>
                                </div>
                            </div>

                            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/15 p-3.5 rounded-xl text-center">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Security Key / Password</label>
                                {selectedUserForView.plain_password ? (
                                    <div className="flex items-center justify-center gap-2">
                                        {/* Spacer to balance the eye button for perfect centering */}
                                        <div className="w-9 shrink-0" />
                                        <div className="text-[24px] font-bold text-[#B4780B] tracking-wider font-mono select-all flex-1 text-center">
                                            {showPasswordDetail ? selectedUserForView.plain_password : '••••••••'}
                                        </div>
                                        <div className="w-9 shrink-0 flex items-center justify-center">
                                            <BlinkingEye isOpen={showPasswordDetail} onClick={() => setShowPasswordDetail(!showPasswordDetail)} />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-[12px] text-slate-400 font-semibold">Not available</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 sm:gap-y-4 text-[12px]">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                                    <p className="font-bold text-slate-900 truncate">{selectedUserForView.email || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</p>
                                    <p className="font-bold text-slate-900">@{selectedUserForView.username}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                                    <p className="font-bold text-slate-900">{selectedUserForView.phone || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">City <span className="text-slate-300 normal-case font-medium">· branch</span></p>
                                    <p className="font-bold text-slate-900">{(selectedUserForView as any).warehouses?.[0]?.area || '—'}</p>
                                </div>
                                <div className="col-span-full space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Address <span className="text-slate-300 normal-case font-medium">· branch</span></p>
                                    <p className="font-bold text-slate-900">{(selectedUserForView as any).warehouses?.[0]?.location || (selectedUserForView as any).warehouses?.[0]?.name || 'No branch assigned'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
                            <Btn onClick={() => router.push(`/admin/users/edit/${selectedUserForView.id}`)} className="flex-1">Edit User</Btn>
                            <Btn variant="secondary" onClick={() => { setSelectedUserForView(null); setShowPasswordDetail(false); }} className="px-8">Close</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
