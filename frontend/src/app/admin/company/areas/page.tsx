"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Search, MapPin, RefreshCw, Save, Trash2, Users, ShieldCheck
} from 'lucide-react';
import { areaService, Area } from '@/services/area.service';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, ui, TableShell, Pagination, RowActions } from '@/components/admin/ui';

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-semibold text-[#3A3A38] mb-1.5">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
        {children}
    </div>
);

const inputCls = ui.inputBase;

const emptyForm = {
    name: '',
    code: '',
    description: '',
    parent: '' as number | string,
    is_active: true,
};

export default function AreasPage() {
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editTarget, setEditTarget] = useState<Area | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const [form, setForm] = useState({ ...emptyForm });
    const [allowed, setAllowed] = useState<boolean | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await areaService.getAll();
            setAreas(data || []);
        } catch {
            toast.error('Failed to load areas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setAllowed(authService.isSuperAdmin());
        load();
    }, [load]);

    const openAdd = () => {
        setEditTarget(null);
        const f = { ...emptyForm };
        // Auto-fill Parent Area with the logged-in branch admin's city (the area of
        // their assigned warehouse), so they nest territories under their branch.
        try {
            const u: any = authService.getUser();
            const city = u?.warehouses?.[0]?.area;
            if (city) {
                const match = areas.find(a => (a.name || '').trim().toLowerCase() === String(city).trim().toLowerCase());
                if (match) f.parent = match.id;
            }
        } catch { /* no-op */ }
        setForm(f);
        setShowModal(true);
    };

    const openEdit = (a: Area) => {
        setEditTarget(a);
        setForm({
            name: a.name || '',
            code: a.code || '',
            description: a.description || '',
            parent: a.parent ?? '',
            is_active: a.is_active !== false,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Area name is required');
        setSaving(true);
        try {
            // Code is optional in the UI — generate a stable one from the name when
            // left blank so the backend (which requires a code) accepts it.
            const code = form.code.trim()
                || form.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20)
                || 'AREA';
            const payload: any = {
                name: form.name,
                code,
                description: form.description,
                parent: form.parent === '' ? null : Number(form.parent),
                is_active: form.is_active,
            };
            if (editTarget) {
                await areaService.update(editTarget.id, payload);
                toast.success('Area updated');
            } else {
                await areaService.create(payload);
                toast.success('Area created');
            }
            setShowModal(false);
            setEditTarget(null);
            load();
        } catch (err: any) {
            const detail = err?.response?.data;
            let msg = 'Failed to save area';
            if (detail && typeof detail === 'object') {
                const firstField = Object.keys(detail)[0];
                if (firstField && Array.isArray(detail[firstField])) {
                    msg = `${firstField}: ${detail[firstField][0]}`;
                } else if (detail.detail) {
                    msg = detail.detail;
                }
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (a: Area) => {
        setTogglingId(a.id);
        try {
            await areaService.update(a.id, { is_active: !a.is_active });
            setAreas(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
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
            await areaService.remove(deleteTarget.id);
            toast.success('Area deleted');
            setAreas(prev => prev.filter(x => x.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch {
            toast.error('Failed to delete area');
        } finally {
            setDeleting(false);
        }
    };

    // ── Level-wise (parent → child) ordering, with a depth on every row ──
    const treeAreas = useMemo(() => {
        const byParent = new Map<string, any[]>();
        areas.forEach(a => {
            const pid = (a as any).parent ? String((a as any).parent) : 'root';
            if (!byParent.has(pid)) byParent.set(pid, []);
            byParent.get(pid)!.push(a);
        });
        const out: any[] = [];
        const walk = (pid: string, depth: number) => {
            (byParent.get(pid) || []).slice()
                .sort((x, y) => (x.name || '').localeCompare(y.name || ''))
                .forEach(k => { out.push({ ...k, _depth: depth }); walk(String(k.id), depth + 1); });
        };
        walk('root', 0);
        // Orphans (parent not in the current set) still appear at the top level.
        const seen = new Set(out.map(o => String(o.id)));
        areas.forEach(a => { if (!seen.has(String(a.id))) out.push({ ...a, _depth: 0 }); });
        return out;
    }, [areas]);

    const searching = search.trim().length > 0;
    const filtered = (searching ? areas.map(a => ({ ...(a as any), _depth: 0 })) : treeAreas).filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.code?.toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase())
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const changePageSize = (n: number) => { setPageSize(n); setCurrentPage(1); };
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    // Possible parents (exclude the area being edited to avoid self-parenting),
    // ordered as a tree with depth so the dropdown reads level-wise.
    const parentOptions = treeAreas.filter(a => !editTarget || a.id !== editTarget.id);
    const parentDepth = form.parent ? ((treeAreas.find(a => String(a.id) === String(form.parent))?._depth ?? 0) + 1) : 0;

    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-semibold text-[#1A1A1A]">Super Admin only</h2>
                <p className="text-[13px] text-[#8A8A86] mt-2">Areas / territories can only be managed by a Super Admin.</p>
            </div>
        );
    }

    return (
        <div className="pb-12 text-left text-[#1A1A1A]">
            <div className="max-w-[1200px] mx-auto">

                <PageHeader
                    title="Areas / Territories"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Areas' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={load} disabled={loading} className="whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button onClick={openAdd} className="whitespace-nowrap">
                                <Plus size={16} /> Add Area
                            </Button>
                        </>
                    }
                />

                {/* Table */}
                {/* ── Mobile: card list ── */}
                <div className="sm:hidden space-y-2.5 mb-6">
                    {loading && areas.length === 0 ? (
                        <Card className="py-16 text-center text-[13px] text-[#8A8A86]">Loading areas…</Card>
                    ) : filtered.length === 0 ? (
                        <Card className="py-16 text-center text-[13px] text-[#8A8A86]">No areas found.</Card>
                    ) : paged.map(a => (
                        <div key={a.id} className="bg-white border border-[#EDEDEA] rounded-xl shadow-sm p-3.5" style={{ marginLeft: ((a as any)._depth || 0) * 14 }}>
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${(a as any)._depth ? 'bg-[#FAFAF8] border-[#EDEDEA] text-[#9C9C98]' : 'bg-[#F59E0B]/10 border-[#F59E0B]/15 text-[#B4780B]'}`}>
                                    <MapPin size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{a.name}</p>
                                        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9C9C98] bg-[#F2F2F0] border border-[#EDEDEA] px-1.5 py-0.5 rounded">L{((a as any)._depth || 0) + 1}</span>
                                        {a.code && <span className="text-[10.5px] font-semibold text-[#8A8A86] uppercase tracking-wide bg-[#F2F2F0] border border-[#EDEDEA] px-1.5 py-0.5 rounded">{a.code}</span>}
                                    </div>
                                    {a.parent_name && <p className="text-[10.5px] text-[#9C9C98] font-semibold uppercase tracking-wide mt-0.5">Parent: {a.parent_name}</p>}
                                    {a.description && <p className="text-[11.5px] text-[#8A8A86] line-clamp-2 mt-1">{a.description}</p>}
                                    <div className="flex items-center gap-4 mt-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#3A3A38]"><Users size={12} className="text-[#9C9C98]" /> {a.customer_count ?? 0}</span>
                                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#3A3A38]"><ShieldCheck size={12} className="text-[#9C9C98]" /> {a.manager_count ?? 0}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => toggleActive(a)}
                                    disabled={togglingId === a.id}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ${a.is_active ? 'bg-[#F59E0B]' : 'bg-slate-300'} ${togglingId === a.id ? 'opacity-50' : ''}`}
                                    aria-label="Toggle active"
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${a.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-end mt-3 pt-3 border-t border-[#F2F2F0]">
                                <RowActions items={[
                                    { label: 'Edit', onClick: () => openEdit(a) },
                                    { label: 'Delete', onClick: () => setDeleteTarget(a), danger: true },
                                ]} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Desktop: table ── */}
                <TableShell
                    className="hidden sm:block"
                    filters={
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9C9C98]" />
                            <input
                                value={search}
                                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                                placeholder="Search areas by name, code or description…"
                                className={inputCls + ' pl-10'}
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
                    <div className="overflow-x-auto">
                        <table className={ui.table}>
                            <thead>
                                <tr>
                                    <th className={ui.th}>Area</th>
                                    <th className={ui.th}>Code</th>
                                    <th className={ui.th}>Description</th>
                                    <th className={ui.th + ' text-center'}>Customers</th>
                                    <th className={ui.th + ' text-center'}>Managers</th>
                                    <th className={ui.th + ' text-center'}>Status</th>
                                    <th className={ui.th + ' text-right'}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && areas.length === 0 ? (
                                    <tr><td colSpan={7} className="py-24 text-center text-[13px] text-[#8A8A86] font-medium">Loading areas...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-24 text-center text-[13px] text-[#8A8A86] font-medium">No areas found.</td></tr>
                                ) : (
                                    paged.map(a => (
                                        <tr key={a.id} className="hover:bg-[#FAFAF8] transition-colors group">
                                            <td className={ui.td}>
                                                <div className="flex items-center gap-3" style={{ paddingLeft: ((a as any)._depth || 0) * 24 }}>
                                                    {((a as any)._depth || 0) > 0 && <span className="text-[#C4C4C0] text-[15px] -ml-3 select-none">└</span>}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${(a as any)._depth ? 'bg-[#FAFAF8] border-[#EDEDEA] text-[#9C9C98]' : 'bg-[#F59E0B]/10 border-[#F59E0B]/15 text-[#B4780B]'}`}>
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[15px] font-semibold text-[#1A1A1A]">{a.name}</span>
                                                            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9C9C98] bg-[#F2F2F0] border border-[#EDEDEA] px-1.5 py-0.5 rounded">L{((a as any)._depth || 0) + 1}</span>
                                                        </div>
                                                        {a.parent_name && (
                                                            <div className="text-[11.5px] text-[#9C9C98] font-semibold uppercase tracking-wide mt-0.5">Parent: {a.parent_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={ui.td}>
                                                <span className="text-[11.5px] font-semibold text-[#3A3A38] uppercase tracking-wide">{a.code || '—'}</span>
                                            </td>
                                            <td className={ui.td}>
                                                <span className="text-[13px] text-[#3A3A38] line-clamp-2">{a.description || '—'}</span>
                                            </td>
                                            <td className={ui.td + ' text-center'}>
                                                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3A3A38]"><Users size={13} className="text-[#9C9C98]" /> {a.customer_count ?? 0}</span>
                                            </td>
                                            <td className={ui.td + ' text-center'}>
                                                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#3A3A38]"><ShieldCheck size={13} className="text-[#9C9C98]" /> {a.manager_count ?? 0}</span>
                                            </td>
                                            <td className={ui.td + ' text-center'}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(a)}
                                                    disabled={togglingId === a.id}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${a.is_active ? 'bg-[#F59E0B]' : 'bg-slate-300'} ${togglingId === a.id ? 'opacity-50' : ''}`}
                                                    aria-label="Toggle active"
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${a.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className={ui.td + ' text-right'}>
                                                <RowActions items={[
                                                    { label: 'Edit', onClick: () => openEdit(a) },
                                                    { label: 'Delete', onClick: () => setDeleteTarget(a), danger: true },
                                                ]} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </TableShell>
            </div>

            {/* Add / Edit Modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editTarget ? 'Edit Area' : 'Add Area'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" form="area-form" disabled={saving}>
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} {editTarget ? 'Update Area' : 'Create Area'}
                        </Button>
                    </>
                }
            >
                <form id="area-form" onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <Field label="Area Name" required>
                            <input required className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. North Zone" />
                        </Field>
                        <Field label="Code">
                            <input className={inputCls} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Auto-generated if left blank" />
                        </Field>
                    </div>
                    <Field label="Description">
                        <textarea className={inputCls + ' min-h-[80px]'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description of this territory" />
                    </Field>
                    <Field label="Parent Area (level)">
                        <select className={inputCls + ' cursor-pointer'} value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
                            <option value="">None — top level (L1)</option>
                            {parentOptions.map(p => (
                                <option key={p.id} value={p.id}>
                                    {'   '.repeat((p as any)._depth || 0)}{((p as any)._depth || 0) > 0 ? '└ ' : ''}{p.name} (L{((p as any)._depth || 0) + 1})
                                </option>
                            ))}
                        </select>
                        <p className="text-[11.5px] text-[#8A8A86] mt-1.5">
                            {form.parent
                                ? <>This area will be added as <span className="font-semibold text-[#1A1A1A]">Level {parentDepth + 1}</span>, nested under the selected parent.</>
                                : <>This area will be a <span className="font-semibold text-[#1A1A1A]">Level 1</span> (top-level) territory.</>}
                        </p>
                    </Field>
                    <div className="flex items-center justify-between p-3 bg-[#FAFAF8] border border-[#EDEDEA] rounded-lg">
                        <span className="text-[13px] font-semibold text-[#3A3A38]">Active</span>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.is_active ? 'bg-[#F59E0B]' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
                {deleteTarget && (
                    <div className="text-center py-2">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-[18px] font-semibold text-[#1A1A1A] tracking-tight mb-2">Delete Area</h3>
                        <p className="text-[13px] text-[#3A3A38] leading-relaxed mb-8">
                            Are you sure you want to remove <span className="font-semibold text-[#1A1A1A]">{deleteTarget.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">
                                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                            </Button>
                            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
