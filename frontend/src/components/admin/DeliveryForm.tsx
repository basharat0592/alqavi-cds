'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Eye, EyeOff, Bike } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';
import PageLoader from '@/components/ui/PageLoader';
import { deliveryService } from '@/services/delivery.service';
import { inventoryService } from '@/lib/api';
import { authService } from '@/lib/auth';
import CredentialShareModal, { buildCreatedAccount, CreatedAccount } from '@/components/admin/CredentialShareModal';

const VEHICLES = ['bike', 'car', 'van', 'truck', 'other'];

const EMPTY = {
    first_name: '', last_name: '', email: '', phone: '', password: '',
    vehicle_type: 'bike', vehicle_number: '', cnic: '', city: '', address: '',
    warehouse: '' as number | string, status: 'active', is_active: true, is_system: false,
};

export default function DeliveryForm({ id }: { id?: string }) {
    const router = useRouter();
    const isEdit = !!id;
    const [form, setForm] = useState<any>(EMPTY);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [created, setCreated] = useState<CreatedAccount | null>(null);

    useEffect(() => {
        // Organizations the admin manages come from their session profile (the same
        // source as the topbar branch chip). A super admin has none assigned, so
        // fall back to the full warehouse list for them.
        const mine = (authService.getUser() as any)?.warehouses;
        if (Array.isArray(mine) && mine.length) {
            setBranches(mine);
        } else {
            inventoryService.getWarehouses()
                .then((w: any[]) => setBranches((w || []).filter((b: any) => b.is_active !== false)))
                .catch(() => setBranches([]));
        }
        if (!isEdit) {
            // Default a new rider to the logged-in admin's own branch.
            if (Array.isArray(mine) && mine.length) {
                setForm((p: any) => ({ ...p, warehouse: String(mine[0].id) }));
            }
            return;
        }
        (async () => {
            try {
                const r: any = await deliveryService.getById(id!);
                setForm({
                    first_name: r.first_name || '', last_name: r.last_name || '', email: r.email || '',
                    phone: r.phone || '', password: '', vehicle_type: r.vehicle_type || 'bike',
                    vehicle_number: r.vehicle_number || '', cnic: r.cnic || '', city: r.city || '',
                    address: r.address || '', warehouse: r.warehouse || '', status: r.status || 'active',
                    is_active: r.is_active ?? true, is_system: r.is_system ?? false,
                });
            } catch { toast.error('Failed to load rider'); router.push('/admin/delivery'); }
            finally { setLoading(false); }
        })();
    }, [id, isEdit, router]);

    const handle = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

    const save = async () => {
        if (!form.first_name.trim() || !form.email.trim()) return toast.error('Name and email are required.');
        if (!isEdit && !form.password) return toast.error('Set a password for the new rider.');
        setSaving(true);
        try {
            const payload: any = { ...form };
            if (!payload.warehouse) payload.warehouse = null;
            if (isEdit && !payload.password) delete payload.password;
            if (isEdit) {
                await deliveryService.update(id!, payload);
                toast.success('Rider updated');
                router.push('/admin/delivery');
            } else {
                await deliveryService.create(payload);
                toast.success('Rider created');
                // Show the login credentials so the admin can share them with the rider.
                setCreated(buildCreatedAccount({
                    firstName: form.first_name,
                    name: `${form.first_name} ${form.last_name}`.trim(),
                    email: form.email,
                    password: form.password,
                }));
            }
        } catch (e: any) {
            const d = e?.response?.data;
            toast.error(d ? (typeof d === 'string' ? d : JSON.stringify(d)) : 'Save failed');
        } finally { setSaving(false); }
    };

    if (loading) return <PageLoader />;

    const inputCls = ui.inputBase;
    const labelCls = 'block text-[11px] font-bold text-slate-700 mb-1.5';

    return (
        <div className="text-left max-w-[900px] mx-auto">
            <PageHeader
                title={isEdit ? 'Edit Rider' : 'Add Delivery Person'}
                subtitle={isEdit ? 'Update this riderâ€™s account and vehicle details' : 'Create a rider and their delivery login'}
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Delivery Persons', href: '/admin/delivery' },
                    { label: isEdit ? 'Edit Rider' : 'Add Rider' },
                ]}
                actions={<Button variant="outline" onClick={() => router.push('/admin/delivery')}><ArrowLeft size={14} /> Back</Button>}
            />

            <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#B4780B] flex items-center justify-center"><Bike size={16} /></div>
                    <h3 className="text-[14px] font-bold text-slate-900">Rider Details</h3>
                </div>

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
                        <label className={labelCls}>{isEdit ? 'Reset Password' : 'Password'} {!isEdit && <span className="text-rose-500">*</span>}</label>
                        <div className="relative">
                            <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} value={form.password}
                                onChange={e => handle('password', e.target.value)} placeholder={isEdit ? 'Leave blank to keep' : 'Set a password'} />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0E7F98]">
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
                    <div><label className={labelCls}>Organization</label>
                        <select className={inputCls} value={form.warehouse} onChange={e => handle('warehouse', e.target.value)}>
                            <option value="">â€” None â€”</option>
                            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <p className="text-[10.5px] text-slate-400 mt-1">Rider sees this organizationâ€™s active orders in their notifications.</p>
                    </div>
                    <div><label className={labelCls}>City</label>
                        <input className={inputCls} value={form.city} onChange={e => handle('city', e.target.value)} placeholder="City" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Address</label>
                        <input className={inputCls} value={form.address} onChange={e => handle('address', e.target.value)} placeholder="Address" /></div>
                    <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-lg">
                        <span className="text-[12px] font-bold text-slate-600">Account Active</span>
                        <button type="button" onClick={() => handle('is_active', !form.is_active)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-[#F59E0B]' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between p-3 bg-[#F59E0B]/50 border border-[#F59E0B]/60 rounded-lg">
                        <div>
                            <span className="text-[12px] font-bold text-slate-700">System Rider (in-house)</span>
                            <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug max-w-[440px]">Your own salaried rider â€” visible only to you, shown at the top when dispatching, and no per-delivery charge is offered.</p>
                        </div>
                        <button type="button" onClick={() => handle('is_system', !form.is_system)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.is_system ? 'bg-[#F59E0B]' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.is_system ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-6 pt-5 border-t border-slate-100">
                    <Button variant="outline" onClick={() => router.push('/admin/delivery')} disabled={saving}>Cancel</Button>
                    <Button variant="primary" onClick={save} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isEdit ? 'Save Changes' : 'Create Rider'}
                    </Button>
                </div>
            </Card>

            {/* Login credentials to share with the newly created rider */}
            <CredentialShareModal
                created={created}
                subtitle={`Share these login details with ${created?.name || 'the rider'} so they can sign in.`}
                onDone={() => router.push('/admin/delivery')}
            />
        </div>
    );
}
