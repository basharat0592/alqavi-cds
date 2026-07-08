"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, MapPin, RefreshCw, Save, Trash2, Users, ShieldCheck
} from 'lucide-react';
import { areaService, Area } from '@/services/area.service';
import { authService } from '@/lib/auth';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Modal, ui } from '@/components/admin/ui';

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}{required && <span className="text-rose-600 ml-0.5">*</span>}</label>
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

    const filtered = areas.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.code?.toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase())
    );

    // Possible parents (exclude the area being edited to avoid self-parenting)
    const parentOptions = areas.filter(a => !editTarget || a.id !== editTarget.id);

    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-bold text-slate-900">Super Admin only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Areas / territories can only be managed by a Super Admin.</p>
            </div>
        );
    }

    return (
        <div className="pb-12 text-left text-slate-800">
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

                {/* Search */}
                <Card className="p-4 sm:p-5 mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search areas by name, code or description..."
                            className={inputCls + ' pl-10'}
                        />
                    </div>
                </Card>

                {/* Table */}
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-200/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Area</th>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-center">Customers</th>
                                    <th className="px-6 py-4 text-center">Managers</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && areas.length === 0 ? (
                                    <tr><td colSpan={7} className="py-24 text-center text-[14px] text-slate-500 font-medium">Loading areas...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="py-24 text-center text-[14px] text-slate-500 font-medium">No areas found.</td></tr>
                                ) : (
                                    filtered.map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[15px] font-bold text-slate-900">{a.name}</div>
                                                        {a.parent_name && (
                                                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Parent: {a.parent_name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">{a.code || '—'}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[13px] text-slate-600 line-clamp-2">{a.description || '—'}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-700"><Users size={13} className="text-slate-400" /> {a.customer_count ?? 0}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-slate-700"><ShieldCheck size={13} className="text-slate-400" /> {a.manager_count ?? 0}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleActive(a)}
                                                    disabled={togglingId === a.id}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${a.is_active ? 'bg-indigo-600' : 'bg-slate-300'} ${togglingId === a.id ? 'opacity-50' : ''}`}
                                                    aria-label="Toggle active"
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${a.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    <button onClick={() => openEdit(a)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button onClick={() => setDeleteTarget(a)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
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
                    <Field label="Parent Area">
                        <select className={inputCls + ' cursor-pointer'} value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
                            <option value="">None (top-level)</option>
                            {parentOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </Field>
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                        <span className="text-[13px] font-semibold text-slate-700">Active</span>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${form.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}
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
                        <h3 className="text-[18px] font-bold text-slate-900 tracking-tight mb-2">Delete Area</h3>
                        <p className="text-[13px] text-slate-600 leading-relaxed mb-8">
                            Are you sure you want to remove <span className="font-bold text-slate-900">{deleteTarget.name}</span>? This action cannot be undone.
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
