"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, MapPin, Users, ShieldCheck, Plus, RefreshCw, AlertTriangle, ChevronRight, Boxes, Pencil, Trash2, Mail, Search, X as XIcon
} from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { userService } from '@/lib/api';
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
    const [nb, setNb] = useState({ name: '', area: '', newCity: '', address: '' });
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [deletingBranch, setDeletingBranch] = useState(false);

    // "Create admin here" — a two-option menu per organization (pick an existing internal
    // user, or create a brand-new admin) plus the pick-existing modal.
    const [selectFor, setSelectFor] = useState<any | null>(null);
    const [assigningId, setAssigningId] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [u, w, a] = await Promise.all([
                userService.getAll(),
                inventoryService.getWarehouses(),
                areaService.getActive().catch(() => [] as Area[]),
            ]);
            setUsers(Array.isArray(u) ? u : (u as any)?.results || []);
            setWarehouses(w || []);
            setAreas(a || []);
        } catch {
            /* surfaced via empty state */
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setNb({ name: '', area: '', newCity: '', address: '' });
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
        });
        setShowNew(true);
    };

    // Create or update a branch: optionally spin up a new city, then save the
    // warehouse. The Super Admin never deals with "warehouse" terms — just branch.
    const saveBranch = async (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        if (!nb.name.trim()) return toast.error('Organization name is required');
        if (nb.area === '__new__' && !nb.newCity.trim()) return toast.error('Enter the new city name');
        setCreating(true);
        try {
            let areaId: number | null = nb.area && nb.area !== '__new__' ? Number(nb.area) : null;
            if (nb.area === '__new__') {
                const city = await areaService.create({
                    name: nb.newCity.trim(), code: '', description: '', parent: null, is_active: true,
                });
                areaId = city.id;
            }
            const payload = {
                name: nb.name.trim(),
                location: nb.address.trim() || nb.name.trim(),
                area: areaId,
            };
            if (editing) {
                await inventoryService.updateWarehouse(editing.id, payload);
                toast.success('Organization updated');
            } else {
                await inventoryService.createWarehouse(payload);
                toast.success('Organization created');
            }
            setShowNew(false);
            setEditing(null);
            setNb({ name: '', area: '', newCity: '', address: '' });
            load();
        } catch {
            toast.error(editing ? 'Failed to update organization' : 'Failed to create organization');
        } finally {
            setCreating(false);
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

    const superAdmins = useMemo(() => users.filter(u => u.is_super_admin), [users]);
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
    const PAGE_SIZE = 10;

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
                <h2 className="text-[18px] font-bold text-slate-900">Super Admin only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Organization ↔ admin assignments can only be managed by a Super Admin.</p>
            </div>
        );
    }

    if (loading && warehouses.length === 0) return <PageLoader />;

    return (
        <div className="pb-16 text-left text-slate-800">
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

                {/* Global super admins */}
                <Card className="p-5 mb-6 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#B4780B]">
                        <ShieldCheck size={15} /> Global (all organizations)
                    </span>
                    {superAdmins.length === 0 ? (
                        <span className="text-[12px] text-slate-400 italic">No super admins.</span>
                    ) : (
                        superAdmins.map(u => (
                            <button key={u.id} onClick={() => router.push(`/admin/users/edit/${u.id}`)}
                                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-full transition-colors">
                                {name(u)}
                            </button>
                        ))
                    )}
                </Card>

                {/* Unassigned branch admins (fail-closed: they see nothing) */}
                {unassigned.length > 0 && (
                    <Card className="p-5 mb-6 border-amber-200 bg-amber-50/40">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[13px] font-bold text-amber-800">{unassigned.length} admin(s) have no branch — they currently see no data.</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {unassigned.map(u => (
                                        <button key={u.id} onClick={() => router.push(`/admin/users/edit/${u.id}`)}
                                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-800 bg-white hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full transition-colors">
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
                    <Card className="py-20 text-center text-[13px] text-slate-500">No organizations yet. Click “New Organization” to create one.</Card>
                ) : (
                    <Card className="overflow-hidden">
                        {/* Filters */}
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-2.5">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    placeholder="Search organization, area or admin…"
                                    className={ui.inputBase + ' h-9 pl-9 pr-8 text-[12.5px]'}
                                />
                                {q && (
                                    <button
                                        onClick={() => setQ('')}
                                        aria-label="Clear search"
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    >
                                        <XIcon size={14} />
                                    </button>
                                )}
                            </div>

                            <select
                                value={areaFilter}
                                onChange={e => setAreaFilter(e.target.value)}
                                className={ui.inputBase + ' h-9 w-auto min-w-[150px] text-[12.5px] cursor-pointer'}
                            >
                                <option value="">All areas</option>
                                {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>

                            <select
                                value={adminFilter}
                                onChange={e => setAdminFilter(e.target.value as '' | 'with' | 'without')}
                                className={ui.inputBase + ' h-9 w-auto min-w-[160px] text-[12.5px] cursor-pointer'}
                            >
                                <option value="">Any admin status</option>
                                <option value="with">Has an admin</option>
                                <option value="without">Missing an admin</option>
                            </select>

                            {filtersOn && (
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-bold text-slate-600 hover:border-[#F59E0B]/40 hover:text-[#B4780B] transition-colors"
                                >
                                    <XIcon size={13} /> Clear
                                </button>
                            )}
                        </div>

                        <div className={ui.tableWrap}>
                            <table className={ui.table + ' min-w-[940px]'}>
                                <thead>
                                    <tr>
                                        <th className={ui.th}>Organization</th>
                                        <th className={ui.th}>Area</th>
                                        <th className={ui.th + ' text-right'}>Products</th>
                                        <th className={ui.th}>Admins</th>
                                        <th className={ui.th + ' text-right'}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(wh => {
                                        const admins = adminsFor(wh.id);
                                        return (
                                            <tr key={wh.id} className={ui.trHover}>
                                                <td className={ui.td}>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/15 text-[#B4780B] flex items-center justify-center shrink-0">
                                                            <Building2 size={15} />
                                                        </span>
                                                        <span className="font-bold text-[13px] text-slate-900 truncate">{wh.name}</span>
                                                    </div>
                                                </td>
                                                <td className={ui.td}>
                                                    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                                                        <MapPin size={12} className="text-slate-400 shrink-0" />
                                                        {wh.area_name || <span className="text-slate-400 italic">No city</span>}
                                                    </span>
                                                </td>
                                                <td className={ui.td + ' text-right'}>
                                                    <span className={`inline-flex items-center gap-1 text-[12.5px] font-bold tabular-nums ${Number(wh.stock_count || 0) > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                                        <Boxes size={12} className="text-slate-400" /> {wh.stock_count || 0}
                                                    </span>
                                                </td>
                                                <td className={ui.td}>
                                                    {admins.length === 0 ? (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[11.5px] text-slate-400 italic mr-1">None assigned</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectFor(wh)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 transition-colors"
                                                            >
                                                                <Users size={11} className="text-slate-400" /> Select
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => router.push(`/admin/users/add?warehouse=${wh.id}`)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B4780B] hover:bg-[#F59E0B]/10 border border-dashed border-[#F59E0B]/30 rounded-md px-2 py-1 transition-colors"
                                                            >
                                                                <Plus size={11} /> Create
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {admins.map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    onClick={() => router.push(`/admin/users/edit/${u.id}`)}
                                                                    title={`${u.email || ''}${u.phone ? ' · ' + u.phone : ''} — view / edit`}
                                                                    className="inline-flex items-center gap-1.5 max-w-[220px] text-[11.5px] font-semibold text-slate-700 bg-white hover:bg-[#F59E0B]/10 border border-slate-200 hover:border-[#F59E0B]/30 rounded-full pl-1 pr-2.5 py-1 transition-colors group"
                                                                >
                                                                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 text-[9px] font-bold text-slate-500">
                                                                        {u.avatar
                                                                            ? <img src={getImageUrl(u.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                                            : (u.full_name || u.username || 'A').split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                                                                    </span>
                                                                    <span className="truncate">{u.full_name?.trim() || u.username || 'Admin'}</span>
                                                                    {u.status && String(u.status).toLowerCase() !== 'active' && (
                                                                        <span className="text-[9px] font-black uppercase text-slate-400">{u.status}</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={ui.td + ' text-right whitespace-nowrap'}>
                                                    <button onClick={() => openEdit(wh)} title="Edit organization"
                                                        className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-500 hover:text-[#92600A] hover:bg-[#F59E0B]/10 border border-slate-200 hover:border-[#F59E0B]/25 rounded-lg px-2.5 py-1.5 transition-colors">
                                                        <Pencil size={12} /> Edit
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(wh)} title="Delete organization"
                                                        className="inline-flex items-center gap-1 text-[11.5px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg px-2.5 py-1.5 transition-colors ml-1.5">
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {rows.length === 0 && (
                                <div className="py-14 text-center text-[12.5px] text-slate-400">
                                    No organizations match these filters.
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 text-[11.5px] text-slate-500">
                            <b className="text-slate-700 tabular-nums">{rows.length}</b> {rows.length === 1 ? 'organization' : 'organizations'}
                            {filtersOn && <> of <b className="text-slate-700 tabular-nums">{warehouses.length}</b></>}
                            {' · '}
                            <b className="text-slate-700 tabular-nums">{rows.filter(w => adminsFor(w.id).length === 0).length}</b> without an admin
                        </div>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPage={setPage}
                            total={rows.length}
                            pageSize={PAGE_SIZE}
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
                    <p className="text-[12px] text-slate-500">
                        A organization is a store/location in a city. Name it and pick its city — each organization is managed by one admin.
                    </p>
                    <div>
                        <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Organization Name <span className="text-rose-600">*</span></label>
                        <input
                            autoFocus
                            value={nb.name}
                            onChange={e => setNb(p => ({ ...p, name: e.target.value }))}
                            className={ui.inputBase}
                            placeholder="e.g. Gilgit Main Store"
                        />
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-slate-700 mb-1.5">City</label>
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
                            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">New City Name <span className="text-rose-600">*</span></label>
                            <input
                                value={nb.newCity}
                                onChange={e => setNb(p => ({ ...p, newCity: e.target.value }))}
                                className={ui.inputBase}
                                placeholder="e.g. Hunza"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Address <span className="text-slate-400 font-medium">(optional)</span></label>
                        <input
                            value={nb.address}
                            onChange={e => setNb(p => ({ ...p, address: e.target.value }))}
                            className={ui.inputBase}
                            placeholder="e.g. Plot 42, Main Bazaar"
                        />
                    </div>
                    {/* Hidden submit lets Enter create the branch. */}
                    <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
                </form>
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
                    <div className="text-[13px] text-slate-600">
                        <p className="font-bold text-slate-900 mb-1">Delete “{deleteTarget?.name}”?</p>
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
                                <p className="text-[13px] text-slate-500">No other internal users available to assign.</p>
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
                            <p className="text-[12px] text-slate-500 mb-1">Pick an existing internal user to also manage this organization.</p>
                            {eligible.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => assignExisting(u, selectFor)}
                                    disabled={!!assigningId}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-[#B4780B]/50 hover:border-[#F59E0B]/25 transition-colors text-left disabled:opacity-50"
                                >
                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 text-[11px] font-bold text-slate-500">
                                        {u.avatar ? <img src={getImageUrl(u.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                            : name(u).split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-[13px] text-slate-900 truncate">{name(u)}</p>
                                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1"><Mail size={10} className="shrink-0" /> {u.email}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {u.role_name && <Badge tone="blue">{u.role_name}</Badge>}
                                            {(u.warehouses || []).length > 0 && <span className="text-[10px] text-slate-400">Also manages {(u.warehouses || []).length} branch(es)</span>}
                                        </div>
                                    </div>
                                    {assigningId === u.id
                                        ? <RefreshCw size={15} className="animate-spin text-[#B4780B] shrink-0" />
                                        : <Plus size={15} className="text-slate-300 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
