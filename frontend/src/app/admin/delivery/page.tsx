'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Truck, Plus, Search, Loader2, Trash2, Phone, MapPin, Bike,
    CheckCircle, Package, User, X, Eye, EyeOff, Save
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';
import { deliveryService, DeliveryPerson } from '@/services/delivery.service';
import { areaService, Area } from '@/services/area.service';

const VEHICLES = ['bike', 'car', 'van', 'truck', 'other'];

const EMPTY = {
    first_name: '', last_name: '', email: '', phone: '', password: '',
    vehicle_type: 'bike', vehicle_number: '', cnic: '', city: '', address: '',
    area: '' as number | string, status: 'active', is_active: true,
};

export default function DeliveryPersonsPage() {
    const [loading, setLoading] = useState(true);
    const [riders, setRiders] = useState<DeliveryPerson[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState<{ open: boolean; editId: number | null }>({ open: false, editId: null });
    const [form, setForm] = useState<any>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [toDelete, setToDelete] = useState<DeliveryPerson | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [r, a] = await Promise.all([
                deliveryService.getAll(),
                areaService.getActive().catch(() => [] as Area[]),
            ]);
            setRiders(r);
            setAreas(a);
        } catch { toast.error('Failed to load delivery persons'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = riders.filter(r =>
        `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(search.toLowerCase()));

    const openCreate = () => { setForm(EMPTY); setModal({ open: true, editId: null }); setShowPw(false); };
    const openEdit = (r: DeliveryPerson) => {
        setForm({
            first_name: r.first_name || '', last_name: r.last_name || '', email: r.email || '',
            phone: r.phone || '', password: '', vehicle_type: r.vehicle_type || 'bike',
            vehicle_number: r.vehicle_number || '', cnic: r.cnic || '', city: r.city || '',
            address: r.address || '', area: r.area || '', status: r.status || 'active',
            is_active: r.is_active ?? true,
        });
        setModal({ open: true, editId: r.id });
        setShowPw(false);
    };

    const handle = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

    const save = async () => {
        if (!form.first_name.trim() || !form.email.trim()) return toast.error('Name and email are required.');
        if (!modal.editId && !form.password) return toast.error('Set a password for the new rider.');
        setSaving(true);
        try {
            const payload: any = { ...form };
            if (!payload.area) payload.area = null;
            if (modal.editId && !payload.password) delete payload.password;
            if (modal.editId) await deliveryService.update(modal.editId, payload);
            else await deliveryService.create(payload);
            toast.success(modal.editId ? 'Rider updated' : 'Rider created');
            setModal({ open: false, editId: null });
            load();
        } catch (e: any) {
            const d = e?.response?.data;
            toast.error(d ? (typeof d === 'string' ? d : JSON.stringify(d)) : 'Save failed');
        } finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await deliveryService.remove(toDelete.id);
            toast.success('Rider removed');
            setToDelete(null);
            load();
        } catch { toast.error('Delete failed'); }
        finally { setDeleting(false); }
    };

    if (loading && riders.length === 0) return <PageLoader />;

    const STATS = [
        { label: 'Total Riders', value: riders.length, icon: Truck },
        { label: 'Active', value: riders.filter(r => r.is_active).length, icon: CheckCircle, color: 'text-emerald-600' },
        { label: 'On Delivery', value: riders.reduce((s, r) => s + (r.active_deliveries || 0), 0), icon: Package, color: 'text-amber-600' },
        { label: 'Completed', value: riders.reduce((s, r) => s + (r.completed_deliveries || 0), 0), icon: MapPin },
    ];

    const inputCls = ui.inputBase;
    const labelCls = 'block text-[11px] font-bold text-slate-700 mb-1.5';

    return (
        <div className="text-left">
            <PageHeader
                title="Delivery Persons"
                subtitle="Create riders and manage their delivery accounts"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Delivery Persons' }]}
                actions={<Button variant="primary" size="sm" onClick={openCreate}><Plus size={14} /> Add Rider</Button>}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {STATS.map((s, i) => (
                    <Card key={i} className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <s.icon size={15} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        </div>
                        <p className={`text-[22px] font-bold tracking-tight tabular-nums ${s.color || 'text-slate-900'}`}>{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <Card className="p-4 mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rider by name, email or phone..." className={inputCls + ' pl-10'} />
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Rider</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Vehicle</th>
                            <th className="px-6 py-3">Area</th>
                            <th className="px-6 py-3 text-center">Deliveries</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-16 text-center text-[13px] text-slate-400">No delivery persons yet. Click “Add Rider” to create one.</td></tr>
                        ) : filtered.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors text-[13px]">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><User size={15} /></span>
                                        {r.name}
                                    </div>
                                    <div className="text-[11px] text-slate-400 ml-10">{r.email}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {r.phone || '—'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-1.5 text-slate-700 capitalize"><Bike size={13} className="text-slate-400" /> {r.vehicle_type}</span>
                                    {r.vehicle_number && <div className="text-[10px] text-slate-400 uppercase tracking-wider ml-5">{r.vehicle_number}</div>}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{r.area_name || '—'}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-amber-600 font-bold tabular-nums">{r.active_deliveries || 0}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    <span className="text-emerald-600 font-bold tabular-nums">{r.completed_deliveries || 0}</span>
                                    <div className="text-[9px] text-slate-400 uppercase tracking-wider">active / done</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Badge tone={r.is_active ? 'green' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2.5">
                                        <button onClick={() => openEdit(r)} className="text-[12px] font-bold text-indigo-600 hover:underline">Edit</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={() => setToDelete(r)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Create / Edit Modal */}
            <Modal open={modal.open} onClose={() => setModal({ open: false, editId: null })}
                title={modal.editId ? 'Edit Rider' : 'Add Delivery Person'} size="lg"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal({ open: false, editId: null })}>Cancel</Button>
                        <Button variant="primary" onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {modal.editId ? 'Save Changes' : 'Create Rider'}
                        </Button>
                    </>
                }>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>First Name <span className="text-rose-500">*</span></label>
                        <input className={inputCls} value={form.first_name} onChange={e => handle('first_name', e.target.value)} placeholder="First name" /></div>
                    <div><label className={labelCls}>Last Name</label>
                        <input className={inputCls} value={form.last_name} onChange={e => handle('last_name', e.target.value)} placeholder="Last name" /></div>
                    <div><label className={labelCls}>Email <span className="text-rose-500">*</span></label>
                        <input type="email" className={inputCls} value={form.email} onChange={e => handle('email', e.target.value)} placeholder="rider@example.com" /></div>
                    <div><label className={labelCls}>Phone</label>
                        <input className={inputCls} value={form.phone} onChange={e => handle('phone', e.target.value)} placeholder="+92 ..." /></div>
                    <div>
                        <label className={labelCls}>{modal.editId ? 'Reset Password' : 'Password'} {!modal.editId && <span className="text-rose-500">*</span>}</label>
                        <div className="relative">
                            <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} value={form.password}
                                onChange={e => handle('password', e.target.value)} placeholder={modal.editId ? 'Leave blank to keep' : 'Set a password'} />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>
                    <div><label className={labelCls}>CNIC</label>
                        <input className={inputCls} value={form.cnic} onChange={e => handle('cnic', e.target.value)} placeholder="00000-0000000-0" /></div>
                    <div><label className={labelCls}>Vehicle Type</label>
                        <select className={inputCls} value={form.vehicle_type} onChange={e => handle('vehicle_type', e.target.value)}>
                            {VEHICLES.map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                        </select></div>
                    <div><label className={labelCls}>Vehicle Number</label>
                        <input className={inputCls} value={form.vehicle_number} onChange={e => handle('vehicle_number', e.target.value)} placeholder="ABC-123" /></div>
                    <div><label className={labelCls}>Area</label>
                        <select className={inputCls} value={form.area} onChange={e => handle('area', e.target.value)}>
                            <option value="">— None —</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.name}{a.code ? ` (${a.code})` : ''}</option>)}
                        </select></div>
                    <div><label className={labelCls}>City</label>
                        <input className={inputCls} value={form.city} onChange={e => handle('city', e.target.value)} placeholder="City" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Address</label>
                        <input className={inputCls} value={form.address} onChange={e => handle('address', e.target.value)} placeholder="Address" /></div>
                    <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                        <span className="text-[12px] font-bold text-slate-600">Account Active</span>
                        <button type="button" onClick={() => handle('is_active', !form.is_active)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete confirm */}
            <Modal open={!!toDelete} onClose={() => setToDelete(null)} size="sm"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                        </Button>
                    </>
                }>
                {toDelete && (
                    <div className="text-center space-y-3">
                        <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto"><Trash2 size={22} className="text-rose-600" /></div>
                        <h3 className="text-[15px] font-bold text-slate-900">Remove this rider?</h3>
                        <p className="text-[12px] text-slate-600">Delete <strong>{toDelete.name}</strong>? Their login will be revoked. Assigned orders are kept.</p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
