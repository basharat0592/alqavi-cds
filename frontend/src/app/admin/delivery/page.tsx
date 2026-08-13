'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Truck, Plus, Search, Loader2, Trash2, Phone, MapPin, Bike,
    CheckCircle, Package, User,
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';
import { deliveryService, DeliveryPerson } from '@/services/delivery.service';

export default function DeliveryPersonsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [riders, setRiders] = useState<DeliveryPerson[]>([]);
    const [search, setSearch] = useState('');
    const [toDelete, setToDelete] = useState<DeliveryPerson | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setRiders(await deliveryService.getAll());
        } catch { toast.error('Failed to load delivery persons'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = riders.filter(r =>
        `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(search.toLowerCase()));

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

    return (
        <div className="text-left">
            <PageHeader
                title="Delivery Persons"
                subtitle="Create riders and manage their delivery accounts"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Delivery Persons' }]}
                actions={<Button variant="primary" size="sm" onClick={() => router.push('/admin/delivery/add')}><Plus size={14} /> Add Rider</Button>}
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
                            <th className="px-6 py-3">Branch</th>
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
                                        <span className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#B4780B] flex items-center justify-center"><User size={15} /></span>
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
                                <td className="px-6 py-4 text-slate-600">{r.warehouse_name || r.area_name || '—'}</td>
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
                                        <button onClick={() => router.push(`/admin/delivery/edit/${r.id}`)} className="text-[12px] font-bold text-[#B4780B] hover:underline">Edit</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={() => setToDelete(r)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

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
