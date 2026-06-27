"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2, MapPin, Users, ShieldCheck, Plus, RefreshCw, AlertTriangle, ChevronRight, Boxes
} from 'lucide-react';
import { userService } from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';
import { areaService, Area } from '@/services/area.service';
import { authService } from '@/lib/auth';
import { PageHeader, Card, Button, Badge, Modal, ui } from '@/components/admin/ui';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function BranchesPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState<boolean | null>(null);

    // "New Branch" creation (a branch is a store/warehouse tagged to a city).
    const [showNew, setShowNew] = useState(false);
    const [creating, setCreating] = useState(false);
    const [nb, setNb] = useState({ name: '', area: '', newCity: '', address: '' });

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

    // Create a branch: optionally spin up a new city, then create the warehouse.
    // The Super Admin never deals with "warehouse" terms — just branch + city.
    const createBranch = async (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        if (!nb.name.trim()) return toast.error('Branch name is required');
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
            await inventoryService.createWarehouse({
                name: nb.name.trim(),
                location: nb.address.trim() || nb.name.trim(),
                area: areaId,
            });
            toast.success('Branch created');
            setShowNew(false);
            setNb({ name: '', area: '', newCity: '', address: '' });
            load();
        } catch {
            toast.error('Failed to create branch');
        } finally {
            setCreating(false);
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

    const byCity = useMemo(() => {
        const groups = new Map<string, { city: string; items: any[] }>();
        warehouses.forEach(w => {
            const city = w.area_name || 'No city';
            if (!groups.has(city)) groups.set(city, { city, items: [] });
            groups.get(city)!.items.push(w);
        });
        return Array.from(groups.values()).sort((a, b) => a.city.localeCompare(b.city));
    }, [warehouses]);

    const name = (u: any) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;

    if (allowed === false) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <ShieldCheck size={26} />
                </div>
                <h2 className="text-[18px] font-bold text-slate-900">Super Admin only</h2>
                <p className="text-[13px] text-slate-500 mt-2">Branch ↔ admin assignments can only be managed by a Super Admin.</p>
            </div>
        );
    }

    if (loading && warehouses.length === 0) return <PageLoader />;

    return (
        <div className="pb-16 text-left text-slate-800">
            <div className="max-w-[1200px] mx-auto">
                <PageHeader
                    title="Branches & Admins"
                    subtitle="Which admin manages which city / branch"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Branches' }]}
                    actions={
                        <>
                            <Button variant="outline" onClick={load} disabled={loading} className="whitespace-nowrap">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                            </Button>
                            <Button onClick={() => { setNb({ name: '', area: '', newCity: '', address: '' }); setShowNew(true); }} className="whitespace-nowrap">
                                <Plus size={16} /> New Branch
                            </Button>
                        </>
                    }
                />

                {/* Global super admins */}
                <Card className="p-5 mb-6 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-indigo-700">
                        <ShieldCheck size={15} /> Global (all branches)
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

                {/* Cities → warehouses → assigned admins */}
                {warehouses.length === 0 ? (
                    <Card className="py-20 text-center text-[13px] text-slate-500">No branches yet. Click “New Branch” to create one.</Card>
                ) : (
                    <div className="space-y-8">
                        {byCity.map(group => (
                            <div key={group.city} className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <h2 className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        <MapPin size={14} className="text-slate-400" /> {group.city}
                                    </h2>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{group.items.length}</span>
                                    <div className="h-px flex-1 bg-slate-200/70" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {group.items.map(wh => {
                                        const admins = adminsFor(wh.id);
                                        return (
                                            <Card key={wh.id} className="overflow-hidden">
                                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                                            <Building2 size={17} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-[14px] text-slate-900 truncate">{wh.name}</h3>
                                                            <p className="text-[11px] text-slate-400 flex items-center gap-1"><Boxes size={11} /> {wh.stock_count || 0} products</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-5 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                            <Users size={12} /> Admins
                                                        </span>
                                                        <Badge tone={admins.length ? 'blue' : 'neutral'}>{admins.length}</Badge>
                                                    </div>
                                                    {admins.length === 0 ? (
                                                        <p className="text-[12px] text-slate-400 italic">No admin assigned to this branch.</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {admins.map(u => (
                                                                <button key={u.id} onClick={() => router.push(`/admin/users/edit/${u.id}`)}
                                                                    title={u.email}
                                                                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 px-2.5 py-1 rounded-full transition-colors">
                                                                    {name(u)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <Link href="/admin/users/add"
                                                        className="flex items-center justify-center gap-1.5 mt-1 text-[11.5px] font-bold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 rounded-lg py-2 transition-colors">
                                                        <Plus size={13} /> Assign an admin
                                                    </Link>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Branch — branch-first creation (no warehouse jargon). */}
            <Modal
                open={showNew}
                onClose={() => { if (!creating) setShowNew(false); }}
                title="New Branch"
                size="md"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowNew(false)} disabled={creating}>Cancel</Button>
                        <Button onClick={() => createBranch()} disabled={creating}>
                            {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Create Branch
                        </Button>
                    </>
                }
            >
                <form onSubmit={createBranch} className="space-y-4">
                    <p className="text-[12px] text-slate-500">
                        A branch is a store/location in a city. Name it and pick its city — you then assign admins to it.
                    </p>
                    <div>
                        <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Branch Name <span className="text-rose-600">*</span></label>
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
        </div>
    );
}
