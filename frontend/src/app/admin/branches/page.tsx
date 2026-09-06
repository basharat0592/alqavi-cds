"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, MapPin, Users, ShieldCheck, Plus, RefreshCw, AlertTriangle, ChevronRight, Boxes, Pencil, Trash2, Mail,
    Search, X as XIcon, Link2, Copy, Check, Clock, Phone, Ban, RotateCcw, UserPlus
} from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { userService, onboardingService, inviteUrl } from '@/lib/api';
import type { OrgInvite } from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';
import { areaService, Area } from '@/services/area.service';
import { authService } from '@/lib/auth';
import { PageHeader, Card, Button, Badge, Modal, ui, Pagination } from '@/components/admin/ui';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function BranchesPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState<boolean | null>(null);

    // "New Organization" creation / edit (a organization is a store/warehouse tagged to a city).
    const [showNew, setShowNew] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [creating, setCreating] = useState(false);
    const [nb, setNb] = useState({ name: '', area: '', newCity: '', address: '', adminName: '', email: '', phone: '' });

    // Pending invites, keyed by the organization they belong to. An organization
    // created through the invite flow has no admin account yet, so without this
    // the row would just read "None assigned" with no sign anyone was invited.
    const [invites, setInvites] = useState<OrgInvite[]>([]);
    const [linkFor, setLinkFor] = useState<OrgInvite | null>(null);
    const [copied, setCopied] = useState(false);
    const [busyInvite, setBusyInvite] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<any>(null);

    // Inviting an admin into an organization that already exists — organizations
    // created before the invite flow, or one whose admin has left.
    const [inviteFor2, setInviteFor2] = useState<any | null>(null);
    const [inviteForm, setInviteForm] = useState({ adminName: '', email: '', phone: '' });
    const [sendingInvite, setSendingInvite] = useState(false);

    // Row click opens the organization's details.
    const [detailFor, setDetailFor] = useState<any | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [deletingBranch, setDeletingBranch] = useState(false);

    // "Create admin here" — a two-option menu per organization (pick an existing internal
    // user, or create a brand-new admin) plus the pick-existing modal.
    const [selectFor, setSelectFor] = useState<any | null>(null);
    const [assigningId, setAssigningId] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [u, w, a, inv] = await Promise.all([
                userService.getAll(),
                inventoryService.getWarehouses(),
                areaService.getActive().catch(() => [] as Area[]),
                onboardingService.listInvites().catch(() => [] as OrgInvite[]),
            ]);
            setUsers(Array.isArray(u) ? u : (u as any)?.results || []);
            setWarehouses(w || []);
            setAreas(a || []);
            setInvites(inv || []);
        } catch {
            /* surfaced via empty state */
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setNb({ name: '', area: '', newCity: '', address: '', adminName: '', email: '', phone: '' });
        setShowNew(true);
    };

    // Open the modal pre-filled to edit an existing branch (warehouse).
    const openEdit = (wh: any) => {
        setEditing(wh);
        setNb({
            name: wh.name || '',
            area: wh.area ? String(wh.area) : '',
            newCity: '',
            address: wh.location || '',
            adminName: '', email: '', phone: '',
        });
        setShowNew(true);
    };

    // Create or update a branch: optionally spin up a new city, then save the
    // warehouse. The Super Admin never deals with "warehouse" terms — just branch.
    const saveBranch = async (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        if (!nb.name.trim()) return toast.error('Organization name is required');
        if (editing && nb.area === '__new__' && !nb.newCity.trim()) return toast.error('Enter the new city name');
        if (!editing && !nb.email.trim()) return toast.error("Enter the admin's email — the invite is sent to it");
        setCreating(true);
        try {
            let areaId: number | null = nb.area && nb.area !== '__new__' ? Number(nb.area) : null;
            if (nb.area === '__new__') {
                const city = await areaService.create({
                    name: nb.newCity.trim(), code: '', description: '', parent: null, is_active: true,
                });
                areaId = city.id;
            }
            if (editing) {
                await inventoryService.updateWarehouse(editing.id, {
                    name: nb.name.trim(),
                    location: nb.address.trim() || nb.name.trim(),
                    area: areaId,
                });
                toast.success('Organization updated');
                setShowNew(false);
                setEditing(null);
            } else {
                // Creating an organization creates the org row AND a pending
                // invite; the admin account itself is only created when the
                // invitee opens the link. The link comes back here to be copied.
                // No address/area: the organization's own admin sets those when
                // they accept the invite.
                const invite = await onboardingService.createOrganization({
                    organization_name: nb.name.trim(),
                    email: nb.email.trim(),
                    admin_name: nb.adminName.trim(),
                    phone: nb.phone.trim(),
                });
                setShowNew(false);
                setLinkFor(invite);
                setCopied(false);
                toast.success('Organization created — send the invite link');
            }
            setNb({ name: '', area: '', newCity: '', address: '', adminName: '', email: '', phone: '' });
            load();
        } catch (err: any) {
            // The API reports per-field problems (email already used, invite
            // already pending); showing them beats a flat "failed".
            const data = err?.response?.data;
            const first = data && typeof data === 'object'
                ? Object.values(data).flat()[0]
                : null;
            toast.error(String(first || (editing ? 'Failed to update organization' : 'Failed to create organization')));
        } finally {
            setCreating(false);
        }
    };

    const openInvite = (wh: any) => {
        setInviteForm({ adminName: '', email: '', phone: '' });
        setInviteFor2(wh);
    };

    const sendInvite = async (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        if (!inviteForm.email.trim()) return toast.error("Enter the admin's email");
        setSendingInvite(true);
        try {
            const invite = await onboardingService.createOrganization({
                warehouse: String(inviteFor2.id),
                email: inviteForm.email.trim(),
                admin_name: inviteForm.adminName.trim(),
                phone: inviteForm.phone.trim(),
            });
            setInviteFor2(null);
            setLinkFor(invite);
            setCopied(false);
            toast.success('Invite created — send the link');
            load();
        } catch (err: any) {
            const data = err?.response?.data;
            const first = data && typeof data === 'object' ? Object.values(data).flat()[0] : null;
            toast.error(String(first || 'Could not create the invite'));
        } finally {
            setSendingInvite(false);
        }
    };

    // Deactivating an organization suspends it: the backend then refuses both a
    // login and any request carrying an already-issued token from anyone whose
    // organizations are all deactivated.
    const toggleActive = async (wh: any) => {
        const next = !(wh.is_active ?? true);
        setTogglingId(wh.id);
        // Flip locally first so the switch responds immediately, and put it back
        // if the write fails -- a switch that silently stayed wrong would be read
        // as the organization having been suspended when it had not.
        setWarehouses(list => list.map(w => (w.id === wh.id ? { ...w, is_active: next } : w)));
        try {
            await inventoryService.updateWarehouse(wh.id, { is_active: next });
            toast.success(next ? `${wh.name} activated` : `${wh.name} deactivated — its admins can no longer sign in`);
        } catch {
            setWarehouses(list => list.map(w => (w.id === wh.id ? { ...w, is_active: !next } : w)));
            toast.error('Could not change the status');
        } finally {
            setTogglingId(null);
        }
    };

    // The live invite for an organization, if it still has one. An accepted
    // invite is not shown as a link — the admin exists and appears in Admins.
    const inviteFor = (whId: any) =>
        invites.find(i => String(i.warehouse) === String(whId) && i.state !== 'accepted') || null;

    const copyLink = async (inv: OrgInvite) => {
        const url = inviteUrl(inv.path);
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard is blocked outside a secure context (plain http on a LAN
            // address, for one), so leave the text selectable rather than
            // claiming a copy that did not happen.
            toast.error('Could not copy — select the link and copy it manually');
        }
    };

    const regenerate = async (inv: OrgInvite) => {
        setBusyInvite(inv.id);
        try {
            const fresh = await onboardingService.regenerateInvite(inv.id);
            setInvites(list => list.map(i => (i.id === fresh.id ? fresh : i)));
            setLinkFor(fresh);
            setCopied(false);
            toast.success('New link generated — the old one no longer works');
        } catch {
            toast.error('Could not generate a new link');
        } finally {
            setBusyInvite(null);
        }
    };

    const revoke = async (inv: OrgInvite) => {
        setBusyInvite(inv.id);
        try {
            const dead = await onboardingService.revokeInvite(inv.id);
            setInvites(list => list.map(i => (i.id === dead.id ? dead : i)));
            if (linkFor?.id === dead.id) setLinkFor(null);
            toast.success('Invite cancelled');
        } catch {
            toast.error('Could not cancel the invite');
        } finally {
            setBusyInvite(null);
        }
    };

    // Assign an existing internal user to this branch (adds the branch to their
    // warehouse list — a user can manage more than one branch).
    const assignExisting = async (u: any, wh: any) => {
        setAssigningId(u.id);
        try {
            const ids = (u.warehouses || []).map((w: any) => w.id);
            await userService.update(u.id, { warehouses: [...ids, wh.id] } as any);
            toast.success(`${name(u)} assigned to ${wh.name}`);
            setSelectFor(null);
            load();
        } catch {
            toast.error('Failed to assign admin');
        } finally {
            setAssigningId(null);
        }
    };

    // Delete a branch (warehouse). Cascades to its stock/products; unassigns admins.
    const doDelete = async () => {
        if (!deleteTarget) return;
        setDeletingBranch(true);
        try {
            await inventoryService.deleteWarehouse(deleteTarget.id);
            toast.success('Organization deleted');
            setDeleteTarget(null);
            load();
        } catch {
            toast.error('Failed to delete organization.');
        } finally {
            setDeletingBranch(false);
        }
    };

    useEffect(() => {
        setAllowed(authService.isSuperAdmin());
        load();
    }, []);

    // Group warehouses by city (area) and resolve each one's assigned admins.
    const adminsFor = (whId: string | number) =>
        users.filter(u => !u.is_super_admin && (u.warehouses || []).some((w: any) => String(w.id) === String(whId)));

    const unassigned = useMemo(
        () => users.filter(u => !u.is_super_admin && (u.warehouses || []).length === 0),
        [users]
    );

    // One flat list for the table, ordered by area then name so rows from the same
    // city still sit together without needing separate grouped tables.
    const sorted = useMemo(
        () => [...warehouses].sort((a, b) =>
            String(a.area_name || 'zzz').localeCompare(String(b.area_name || 'zzz'))
            || String(a.name || '').localeCompare(String(b.name || ''))),
        [warehouses]
    );

    // ── Filters ──
    const [q, setQ] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [adminFilter, setAdminFilter] = useState<'' | 'with' | 'without'>('');
    const [page, setPage] = useState(1);
    const [PAGE_SIZE, setPageSize] = useState(5);

    // Areas actually present on an organization — a filter listing empty areas
    // would offer choices that can only ever return nothing.
    const areaOptions = useMemo(() => {
        const set = new Set<string>();
        warehouses.forEach(w => { if (w.area_name) set.add(String(w.area_name)); });
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [warehouses]);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return sorted.filter(w => {
            if (areaFilter && String(w.area_name || '') !== areaFilter) return false;
            if (adminFilter) {
                const has = adminsFor(w.id).length > 0;
                if (adminFilter === 'with' && !has) return false;
                if (adminFilter === 'without' && has) return false;
            }
            if (!needle) return true;
            // Match the organization, its area, and its admins' names/emails, so
            // searching for a person finds the organization they run.
            const hay = [
                w.name, w.area_name, w.address,
                ...adminsFor(w.id).flatMap((u: any) => [u.full_name, u.username, u.email]),
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(needle);
        });
    }, [sorted, q, areaFilter, adminFilter, users]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const pageRows = useMemo(
        () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [rows, page]
    );

    // A filter change can leave you past the end of the shorter result set.
    useEffect(() => { setPage(1); }, [q, areaFilter, adminFilter]);
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

    const filtersOn = !!(q.trim() || areaFilter || adminFilter);
    const clearFilters = () => { setQ(''); setAreaFilter(''); setAdminFilter(''); };

    const name = (u: any) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;

    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-semibold text-[#1A1A1A]">Super Admin only</h2>
                <p className="text-[13px] text-[#8A8A86] mt-2">Organization ↔ admin assignments can only be managed by a Super Admin.</p>
            </div>
        );
    }

    if (loading && warehouses.length === 0) return <PageLoader />;

    return (
        <div className="pb-16 text-left text-[#1A1A1A]">
            <div className="max-w-[1200px] mx-auto">
                <PageHeader
                    title="Organizations"
                    subtitle="Which admin manages which city / organization"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Organizations' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={load} disabled={loading} className="whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button onClick={openCreate} className="whitespace-nowrap">
                                <Plus size={16} /> New Organization
                            </Button>
                        </>
                    }
                />

                {/* Unassigned branch admins (fail-closed: they see nothing) */}
                {unassigned.length > 0 && (
                    <Card className="p-5 mb-6 border-amber-200 bg-amber-50/40">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[13px] font-semibold text-amber-800">{unassigned.length} admin(s) have no branch — they currently see no data.</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {unassigned.map(u => (
                                        <button key={u.id} onClick={() => router.push(`/admin/users/edit/${u.id}`)}
                                            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-800 bg-white hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full transition-colors">
                                            {name(u)} <ChevronRight size={12} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Organizations as one table — area is a column rather than a heading,
                    so every organization is comparable in a single scan. */}
                {warehouses.length === 0 ? (
                    <Card className="py-20 text-center text-[13px] text-[#8A8A86]">No organizations yet. Click “New Organization” to create one.</Card>
                ) : (
                    <Card className="overflow-hidden">
                        {/* Filters */}
                        <div className="px-4 sm:px-5 py-3.5 border-b border-[#F2F2F0] flex items-center gap-2.5 overflow-x-auto custom-scrollbar">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C98] pointer-events-none" />
                                <input
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    placeholder="Search organization, area or admin…"
                                    className={ui.inputBase + ' h-9 pl-9 pr-8 text-[13px]'}
                                />
                                {q && (
                                    <button
                                        onClick={() => setQ('')}
                                        aria-label="Clear search"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9C9C98] hover:text-[#3A3A38]"
                                    >
                                        <XIcon size={14} />
                                    </button>
                                )}
                            </div>

                            <select
                                value={areaFilter}
                                onChange={e => setAreaFilter(e.target.value)}
                                className={ui.inputBase + ' h-9 w-[150px] shrink-0 text-[13px] cursor-pointer'}
                            >
                                <option value="">All areas</option>
                                {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>

                            <select
                                value={adminFilter}
                                onChange={e => setAdminFilter(e.target.value as '' | 'with' | 'without')}
                                className={ui.inputBase + ' h-9 w-[168px] shrink-0 text-[13px] cursor-pointer'}
                            >
                                <option value="">Any admin status</option>
                                <option value="with">Has an admin</option>
                                <option value="without">Missing an admin</option>
                            </select>

                            {filtersOn && (
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 h-9 px-3 shrink-0 rounded-lg border border-[#EDEDEA] bg-white text-[11.5px] font-semibold text-[#3A3A38] hover:border-[#F59E0B]/40 hover:text-[#0E7F98] transition-colors"
                                >
                                    <XIcon size={13} /> Clear
                                </button>
                            )}
                        </div>

                        <div className={ui.tableWrap}>
                            <table className={ui.table + ' min-w-[1040px]'}>
                                <thead className="sticky top-0 z-10">
                                    <tr>
                                        <th className={ui.th}>Organization</th>
                                        <th className={ui.th}>Area</th>
                                        <th className={ui.th}>Status</th>
                                        <th className={ui.th + ' text-right'}>Products</th>
                                        <th className={ui.th}>Admins</th>
                                        <th className={ui.th + ' text-right'}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((wh, idx) => {
                                        const admins = adminsFor(wh.id);
                                        const invite = inviteFor(wh.id);
                                        const active = wh.is_active ?? true;
                                        return (
                                            <tr
                                                key={wh.id}
                                                onClick={() => setDetailFor(wh)}
                                                className={`${idx % 2 ? 'bg-[#FAFAF8]/40' : 'bg-white'} hover:bg-[#F59E0B]/[0.06] transition-colors group cursor-pointer ${active ? '' : 'opacity-60'}`}
                                            >
                                                <td className={ui.td + ' relative'}>
                                                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-[#F59E0B] transition-colors" />
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 ring-1 ring-inset ring-[#F59E0B]/20 text-[#B4780B] flex items-center justify-center shrink-0">
                                                            <Building2 size={16} />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-[13px] text-[#1A1A1A] truncate leading-tight">{wh.name}</p>
                                                            {wh.location && <p className="text-[11.5px] text-[#9C9C98] truncate">{wh.location}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={ui.td}>
                                                    {wh.area_name ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F2F2F0] text-[11.5px] font-semibold text-[#3A3A38]">
                                                            <MapPin size={11} className="text-[#9C9C98] shrink-0" /> {wh.area_name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11.5px] text-[#9C9C98] italic">No city</span>
                                                    )}
                                                </td>
                                                <td className={ui.td}>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={active}
                                                        disabled={togglingId === wh.id}
                                                        onClick={e => { e.stopPropagation(); toggleActive(wh); }}
                                                        title={active ? 'Deactivate this organization' : 'Activate this organization'}
                                                        className="inline-flex items-center gap-2 group/sw disabled:opacity-50"
                                                    >
                                                        <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${active ? 'left-[18px]' : 'left-0.5'}`} />
                                                        </span>
                                                        <span className={`text-[11.5px] font-semibold uppercase tracking-wider ${active ? 'text-emerald-700' : 'text-[#9C9C98]'}`}>
                                                            {active ? 'Active' : 'Off'}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className={ui.td + ' text-right'}>
                                                    {Number(wh.stock_count || 0) > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-[#1A1A1A]">
                                                            <Boxes size={12} className="text-[#9C9C98]" /> {wh.stock_count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[13px] text-[#C4C4C0] tabular-nums">—</span>
                                                    )}
                                                </td>
                                                <td className={ui.td}>
                                                    {admins.length === 0 && invite ? (
                                                        /* Invited but not yet accepted: the account does not exist yet,
                                                           so the row offers the link rather than an admin chip. */
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold uppercase tracking-wider ${
                                                                invite.state === 'pending' ? 'bg-[#F59E0B]/12 text-[#B4780B]'
                                                                    : invite.state === 'expired' ? 'bg-[#F2F2F0] text-[#8A8A86]'
                                                                        : 'bg-rose-50 text-rose-600'}`}>
                                                                <Clock size={10} /> {invite.state}
                                                            </span>
                                                            <span className="text-[11.5px] text-[#8A8A86] truncate max-w-[160px]" title={invite.email}>
                                                                {invite.admin_name || invite.email}
                                                            </span>
                                                            {invite.state === 'pending' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={e => { e.stopPropagation(); setLinkFor(invite); setCopied(false); }}
                                                                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#B4780B] hover:bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-md px-2 py-1 transition-colors"
                                                                >
                                                                    <Link2 size={11} /> Link
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={busyInvite === invite.id}
                                                                    onClick={e => { e.stopPropagation(); regenerate(invite); }}
                                                                    className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#3A3A38] hover:bg-[#F2F2F0] border border-[#EDEDEA] rounded-md px-2 py-1 transition-colors disabled:opacity-50"
                                                                >
                                                                    <RotateCcw size={11} /> New link
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : admins.length === 0 ? (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[11.5px] text-[#9C9C98] italic mr-1">None assigned</span>
                                                            <button
                                                                type="button"
                                                                onClick={e => { e.stopPropagation(); setSelectFor(wh); }}
                                                                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#3A3A38] hover:bg-[#F2F2F0] border border-[#EDEDEA] rounded-md px-2 py-1 transition-colors"
                                                            >
                                                                <Users size={11} className="text-[#9C9C98]" /> Select
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={e => { e.stopPropagation(); openInvite(wh); }}
                                                                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#B4780B] hover:bg-[#F59E0B]/10 border border-dashed border-[#F59E0B]/30 rounded-md px-2 py-1 transition-colors"
                                                            >
                                                                <Mail size={11} /> Invite
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {admins.map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    onClick={e => { e.stopPropagation(); router.push(`/admin/users/edit/${u.id}`); }}
                                                                    title={`${u.email || ''}${u.phone ? ' · ' + u.phone : ''} — view / edit`}
                                                                    className="inline-flex items-center gap-1.5 max-w-[220px] text-[11.5px] font-semibold text-[#3A3A38] bg-white hover:bg-[#F59E0B]/10 border border-[#EDEDEA] hover:border-[#F59E0B]/30 rounded-full pl-1 pr-2.5 py-1 transition-colors group"
                                                                >
                                                                    <span className="w-5 h-5 rounded-full bg-[#F2F2F0] border border-[#EDEDEA] flex items-center justify-center overflow-hidden shrink-0 text-[10.5px] font-semibold text-[#8A8A86]">
                                                                        {u.avatar
                                                                            ? <img src={getImageUrl(u.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                                            : (u.full_name || u.username || 'A').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                                                                    </span>
                                                                    <span className="truncate">{u.full_name?.trim() || u.username || 'Admin'}</span>
                                                                    {u.status && String(u.status).toLowerCase() !== 'active' && (
                                                                        <span className="text-[10.5px] font-semibold uppercase text-[#9C9C98]">{u.status}</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={ui.td + ' text-right whitespace-nowrap'}>
                                                    <div className="inline-flex items-center gap-1.5 opacity-100 xl:opacity-60 xl:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={e => { e.stopPropagation(); openEdit(wh); }} title="Edit organization"
                                                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#8A8A86] hover:text-[#0E7F98] hover:bg-[#F59E0B]/10 border border-[#EDEDEA] hover:border-[#F59E0B]/25 rounded-lg px-2.5 py-1.5 transition-colors">
                                                        <Pencil size={12} /> Edit
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); setDeleteTarget(wh); }} title="Delete organization"
                                                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-[#EDEDEA] hover:border-rose-200 rounded-lg px-2.5 py-1.5 transition-colors">
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {rows.length === 0 && (
                                <div className="py-14 text-center text-[13px] text-[#9C9C98]">
                                    No organizations match these filters.
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-2.5 border-t border-[#EDEDEA] bg-[#FAFAF8] text-[11.5px] text-[#8A8A86]">
                            <b className="text-[#3A3A38] tabular-nums">{rows.length}</b> {rows.length === 1 ? 'organization' : 'organizations'}
                            {filtersOn && <> of <b className="text-[#3A3A38] tabular-nums">{warehouses.length}</b></>}
                            {' · '}
                            <b className="text-[#3A3A38] tabular-nums">{rows.filter(w => adminsFor(w.id).length === 0).length}</b> without an admin
                            {rows.some(w => !(w.is_active ?? true)) && (
                                <> · <b className="text-[#3A3A38] tabular-nums">{rows.filter(w => !(w.is_active ?? true)).length}</b> deactivated</>
                            )}
                        </div>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPage={setPage}
                            total={rows.length}
                            pageSize={PAGE_SIZE}
                            onPageSize={(n) => { setPageSize(n); setPage(1); }}
                        />
                    </Card>
                )}
            </div>

            {/* New / Edit Organization — branch-first (no warehouse jargon). */}
            <Modal
                open={showNew}
                onClose={() => { if (!creating) { setShowNew(false); setEditing(null); } }}
                title={editing ? 'Edit Organization' : 'New Organization'}
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => { setShowNew(false); setEditing(null); }} disabled={creating}>Cancel</Button>
                        <Button onClick={() => saveBranch()} disabled={creating}>
                            {creating ? <RefreshCw size={14} className="animate-spin" /> : (editing ? <Pencil size={14} /> : <Plus size={14} />)} {editing ? 'Save Changes' : 'Create Organization'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={saveBranch} className="space-y-4">
                    <div>
                        <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Organization Name <span className="text-rose-600">*</span></label>
                        <input
                            autoFocus
                            value={nb.name}
                            onChange={e => setNb(p => ({ ...p, name: e.target.value }))}
                            className={ui.inputBase}
                            placeholder="e.g. Gilgit Main Store"
                        />
                    </div>
                    {/* City and address belong to the organization, so its own admin
                        fills them in during onboarding. They stay editable here for an
                        organization that already exists. */}
                    {editing && (
                        <>
                            <div>
                                <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">City</label>
                                <select
                                    value={nb.area}
                                    onChange={e => setNb(p => ({ ...p, area: e.target.value }))}
                                    className={ui.inputBase}
                                >
                                    <option value="">— No city —</option>
                                    {areas.map(a => <option key={a.id} value={String(a.id)}>{a.name}{a.code ? ` (${a.code})` : ''}</option>)}
                                    <option value="__new__">+ Add a new city…</option>
                                </select>
                            </div>
                            {nb.area === '__new__' && (
                                <div>
                                    <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">New City Name <span className="text-rose-600">*</span></label>
                                    <input
                                        value={nb.newCity}
                                        onChange={e => setNb(p => ({ ...p, newCity: e.target.value }))}
                                        className={ui.inputBase}
                                        placeholder="e.g. Hunza"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Address <span className="text-[#9C9C98] font-medium">(optional)</span></label>
                                <input
                                    value={nb.address}
                                    onChange={e => setNb(p => ({ ...p, address: e.target.value }))}
                                    className={ui.inputBase}
                                    placeholder="e.g. Plot 42, Main Bazaar"
                                />
                            </div>
                        </>
                    )}
                    {!editing && (
                        <div className="pt-4 mt-1 border-t border-[#EDEDEA] space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-[#F59E0B]/10 ring-1 ring-inset ring-[#F59E0B]/20 text-[#B4780B] flex items-center justify-center shrink-0">
                                    <UserPlus size={14} />
                                </span>
                                <p className="text-[13px] font-semibold text-[#1A1A1A] leading-none">Who will run it</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Admin Name</label>
                                    <input
                                        value={nb.adminName}
                                        onChange={e => setNb(p => ({ ...p, adminName: e.target.value }))}
                                        className={ui.inputBase}
                                        placeholder="e.g. Ali Raza"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Phone <span className="text-[#9C9C98] font-medium">(optional)</span></label>
                                    <input
                                        value={nb.phone}
                                        onChange={e => setNb(p => ({ ...p, phone: e.target.value }))}
                                        className={ui.inputBase}
                                        placeholder="+92 300 1234567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Admin Email <span className="text-rose-600">*</span></label>
                                <input
                                    type="email"
                                    value={nb.email}
                                    onChange={e => setNb(p => ({ ...p, email: e.target.value }))}
                                    className={ui.inputBase}
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>
                    )}

                    {/* Hidden submit lets Enter create the branch. */}
                    <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
                </form>
            </Modal>

            {/* Organization details — opened by clicking anywhere on a row. */}
            <Modal
                open={!!detailFor}
                onClose={() => setDetailFor(null)}
                title="Organization"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDetailFor(null)}>Close</Button>
                        <Button onClick={() => { const wh = detailFor; setDetailFor(null); openEdit(wh); }}>
                            <Pencil size={14} /> Edit
                        </Button>
                    </>
                }
            >
                {detailFor && (() => {
                    const dAdmins = adminsFor(detailFor.id);
                    const dInvite = inviteFor(detailFor.id);
                    const dActive = detailFor.is_active ?? true;
                    return (
                        <div className="space-y-5">
                            <div className="flex items-start gap-3">
                                <span className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 ring-1 ring-inset ring-[#F59E0B]/20 text-[#B4780B] flex items-center justify-center shrink-0">
                                    <Building2 size={22} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[17px] font-semibold text-[#1A1A1A] tracking-tight truncate">{detailFor.name}</p>
                                    <p className="text-[11.5px] text-[#8A8A86] truncate">{detailFor.location || 'No address on file'}</p>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-wider ${dActive ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F2F2F0] text-[#8A8A86]'}`}>
                                    {dActive ? 'Active' : 'Deactivated'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-[#EDEDEA] bg-[#FAFAF8] p-3">
                                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9C9C98]">City</p>
                                    <p className="text-[13px] font-semibold text-[#1A1A1A] mt-1 truncate">
                                        {detailFor.area_name || <span className="text-[#9C9C98] font-medium italic">Not set</span>}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[#EDEDEA] bg-[#FAFAF8] p-3">
                                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9C9C98]">Products</p>
                                    <p className="text-[13px] font-semibold text-[#1A1A1A] mt-1 tabular-nums">{detailFor.stock_count || 0}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#9C9C98] pb-2 mb-2.5 border-b border-[#F2F2F0]">
                                    Who runs it
                                </p>
                                {dAdmins.length > 0 ? (
                                    <div className="space-y-2">
                                        {dAdmins.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => router.push(`/admin/users/edit/${u.id}`)}
                                                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-[#EDEDEA] hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/[0.05] transition-colors text-left"
                                            >
                                                <span className="w-8 h-8 rounded-full bg-[#F2F2F0] border border-[#EDEDEA] flex items-center justify-center overflow-hidden shrink-0 text-[10.5px] font-semibold text-[#8A8A86]">
                                                    {u.avatar
                                                        ? <img src={getImageUrl(u.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                        : (u.full_name || u.username || 'A').split(' ').map((x: string) => x[0]).join('').slice(0, 2).toUpperCase()}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{u.full_name?.trim() || u.username}</p>
                                                    <p className="text-[11.5px] text-[#9C9C98] truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                                                </div>
                                                <ChevronRight size={14} className="text-[#C4C4C0] shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                ) : dInvite ? (
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-[#F59E0B]/40 bg-[#F59E0B]/[0.05]">
                                        <Clock size={15} className="text-[#1A1A1A] shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">
                                                {dInvite.admin_name || dInvite.email}
                                            </p>
                                            <p className="text-[11.5px] text-[#8A8A86]">
                                                Invite {dInvite.state}
                                                {dInvite.expires_at && dInvite.state === 'pending'
                                                    ? ` · expires ${new Date(dInvite.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                                                    : ''}
                                            </p>
                                        </div>
                                        {dInvite.state === 'pending' && (
                                            <button
                                                onClick={() => { setLinkFor(dInvite); setCopied(false); setDetailFor(null); }}
                                                className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#B4780B] hover:bg-[#F59E0B]/15 border border-[#F59E0B]/30 rounded-md px-2 py-1 transition-colors"
                                            >
                                                <Link2 size={11} /> Link
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-[#EDEDEA] bg-[#FAFAF8]">
                                        <p className="text-[11.5px] text-[#9C9C98] italic">Nobody runs this organization yet.</p>
                                        <button
                                            onClick={() => { const wh = detailFor; setDetailFor(null); openInvite(wh); }}
                                            className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#B4780B] hover:bg-[#F59E0B]/10 border border-dashed border-[#F59E0B]/30 rounded-md px-2 py-1 transition-colors"
                                        >
                                            <Mail size={11} /> Invite
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Invite an admin into an organization that already exists. */}
            <Modal
                open={!!inviteFor2}
                onClose={() => { if (!sendingInvite) setInviteFor2(null); }}
                title="Invite an admin"
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setInviteFor2(null)} disabled={sendingInvite}>Cancel</Button>
                        <Button onClick={() => sendInvite()} disabled={sendingInvite}>
                            {sendingInvite ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />} Create Link
                        </Button>
                    </>
                }
            >
                <form onSubmit={sendInvite} className="space-y-4">
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 ring-1 ring-inset ring-[#F59E0B]/20 text-[#B4780B] flex items-center justify-center shrink-0">
                            <Building2 size={15} />
                        </span>
                        <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{inviteFor2?.name}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Admin Name</label>
                            <input
                                autoFocus
                                value={inviteForm.adminName}
                                onChange={e => setInviteForm(p => ({ ...p, adminName: e.target.value }))}
                                className={ui.inputBase}
                                placeholder="e.g. Ali Raza"
                            />
                        </div>
                        <div>
                            <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Phone <span className="text-[#9C9C98] font-medium">(optional)</span></label>
                            <input
                                value={inviteForm.phone}
                                onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value }))}
                                className={ui.inputBase}
                                placeholder="+92 300 1234567"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Admin Email <span className="text-rose-600">*</span></label>
                        <input
                            type="email"
                            value={inviteForm.email}
                            onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                            className={ui.inputBase}
                            placeholder="admin@example.com"
                        />
                    </div>

                    <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
                </form>
            </Modal>

            {/* Invite link — shown right after creating, and from the Link button. */}
            <Modal
                open={!!linkFor}
                onClose={() => setLinkFor(null)}
                title="Invite link"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => linkFor && revoke(linkFor)} disabled={busyInvite === linkFor?.id}>
                            <Ban size={14} /> Cancel invite
                        </Button>
                        <Button onClick={() => linkFor && copyLink(linkFor)}>
                            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}
                        </Button>
                    </>
                }
            >
                {linkFor && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 ring-1 ring-inset ring-[#F59E0B]/20 text-[#B4780B] flex items-center justify-center shrink-0">
                                <Building2 size={18} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{linkFor.organization_name}</p>
                                <p className="text-[11.5px] text-[#8A8A86] truncate">
                                    {linkFor.admin_name ? `${linkFor.admin_name} · ` : ''}{linkFor.email}
                                    {linkFor.phone ? ` · ${linkFor.phone}` : ''}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11.5px] font-semibold text-[#3A3A38] mb-1.5">Send them this link</label>
                            {/* Selectable input rather than plain text: if the clipboard
                                API is unavailable the link can still be copied by hand. */}
                            <input
                                readOnly
                                value={inviteUrl(linkFor.path)}
                                onFocus={e => e.currentTarget.select()}
                                className={ui.inputBase + ' font-mono text-[11.5px]'}
                            />
                        </div>

                        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FAFAF8] border border-[#EDEDEA] text-[11.5px] text-[#3A3A38] leading-relaxed">
                            <Clock size={14} className="shrink-0 mt-px text-[#9C9C98]" />
                            <span>
                                Works once, and expires{' '}
                                <b className="text-[#1A1A1A]">
                                    {linkFor.expires_at ? new Date(linkFor.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'in 7 days'}
                                </b>.
                                Anyone holding it can claim this organization, so send it to {linkFor.email} directly.
                                If it expires or goes astray, generate a new one — the old link stops working.
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => regenerate(linkFor)}
                            disabled={busyInvite === linkFor.id}
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#3A3A38] hover:text-[#0E7F98] transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={13} className={busyInvite === linkFor.id ? 'animate-spin' : ''} /> Generate a new link
                        </button>
                    </div>
                )}
            </Modal>

            {/* Delete branch confirmation */}
            <Modal
                open={!!deleteTarget}
                onClose={() => { if (!deletingBranch) setDeleteTarget(null); }}
                title="Delete Organization"
                size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletingBranch}>Cancel</Button>
                        <Button variant="danger" onClick={doDelete} disabled={deletingBranch}>
                            {deletingBranch ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Organization
                        </Button>
                    </>
                }
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="text-[13px] text-[#3A3A38]">
                        <p className="font-semibold text-[#1A1A1A] mb-1">Delete “{deleteTarget?.name}”?</p>
                        <p>This permanently removes the organization and any inventory (products &amp; stock) in it, and unassigns its admin. This cannot be undone.</p>
                    </div>
                </div>
            </Modal>

            {/* Select an existing internal user to manage this branch */}
            <Modal
                open={!!selectFor}
                onClose={() => { if (!assigningId) setSelectFor(null); }}
                title={`Select admin for ${selectFor?.name || 'organization'}`}
                size="md"
            >
                {(() => {
                    const eligible = users.filter(u =>
                        !u.is_super_admin &&
                        !(u.warehouses || []).some((w: any) => String(w.id) === String(selectFor?.id))
                    );
                    if (eligible.length === 0) {
                        return (
                            <div className="py-8 text-center">
                                <p className="text-[13px] text-[#8A8A86]">No other internal users available to assign.</p>
                                <Button
                                    className="mt-4"
                                    onClick={() => { const wh = selectFor; setSelectFor(null); router.push(`/admin/users/add?warehouse=${wh.id}`); }}
                                >
                                    <Plus size={14} /> Create a new admin instead
                                </Button>
                            </div>
                        );
                    }
                    return (
                        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                            <p className="text-[11.5px] text-[#8A8A86] mb-1">Pick an existing internal user to also manage this organization.</p>
                            {eligible.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => assignExisting(u, selectFor)}
                                    disabled={!!assigningId}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-[#EDEDEA] bg-white hover:bg-[#F59E0B]/50 hover:border-[#F59E0B]/25 transition-colors text-left disabled:opacity-50"
                                >
                                    <div className="w-9 h-9 rounded-full bg-[#F2F2F0] border border-[#EDEDEA] flex items-center justify-center overflow-hidden shrink-0 text-[11.5px] font-semibold text-[#8A8A86]">
                                        {u.avatar ? <img src={getImageUrl(u.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                            : name(u).split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-[13px] text-[#1A1A1A] truncate">{name(u)}</p>
                                        <p className="text-[11.5px] text-[#8A8A86] truncate flex items-center gap-1"><Mail size={10} className="shrink-0" /> {u.email}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {u.role_name && <Badge tone="blue">{u.role_name}</Badge>}
                                            {(u.warehouses || []).length > 0 && <span className="text-[10.5px] text-[#9C9C98]">Also manages {(u.warehouses || []).length} branch(es)</span>}
                                        </div>
                                    </div>
                                    {assigningId === u.id
                                        ? <RefreshCw size={15} className="animate-spin text-[#1A1A1A] shrink-0" />
                                        : <Plus size={15} className="text-[#C4C4C0] shrink-0" />}
                                </button>
                            ))}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
