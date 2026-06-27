"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw, Building2,
    MapPin
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
import { areaService, Area } from '@/services/area.service';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   FORM FIELD HELPER (indigo/slate design system)
   ───────────────────────────────────────────────────────────────────────────── */
const Field = ({ label, className = "", required = false, ...props }: { label?: string, required?: boolean } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
    const base = "w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-[13.5px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";
    return (
        <div className="w-full">
            {label && <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label} {required && <span className="text-rose-600">*</span>}</label>}
            {props.type === 'select' ? (
                <select
                    className={`${base} cursor-pointer ${className}`}
                    {...(props as any)}
                >
                    {props.children}
                </select>
            ) : props.type === 'textarea' ? (
                <textarea
                    className={`w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-[13.5px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${className}`}
                    {...(props as any)}
                />
            ) : (
                <input
                    className={`${base} ${className}`}
                    {...(props as any)}
                />
            )}
        </div>
    );
};

export default function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [areas, setAreas] = useState<Area[]>([]);
    const [form, setForm] = useState({
        name: '',
        code: '',
        type: 'Main',
        area: '' as number | string,
        address: '',
        city: '',
        state: '',
        country: 'Pakistan',
        postal_code: '',
        contact_person: '',
        contact_phone: '',
        status: 'Active'
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        areaService.getActive().then(setAreas).catch(() => setAreas([]));
        const fetchWarehouse = async () => {
            try {
                const data = await inventoryService.getWarehouses();
                const wh = data.find((w: any) => String(w.id) === id);
                if (wh) {
                    let address = wh.location || '';
                    let city = wh.city || '';
                    let state = wh.state || '';
                    let postal = wh.postal_code || '';
                    
                    if (address.includes(',') && !city) {
                        const parts = address.split(',').map((p: string) => p.trim());
                        if (parts.length >= 3) {
                            address = parts[0];
                            city = parts[1];
                            const lastParts = parts[2].split(' ');
                            state = lastParts[0] || '';
                            postal = lastParts[lastParts.length - 1] || '';
                        }
                    }

                    setForm({
                        name: wh.name || '',
                        code: wh.warehouse_code || '',
                        type: wh.warehouse_type || 'Main',
                        area: wh.area || '',
                        address: address,
                        city: city,
                        state: state,
                        country: 'Pakistan',
                        postal_code: postal,
                        contact_person: wh.contact_person || '',
                        contact_phone: wh.contact_phone || '',
                        status: wh.status ? wh.status.charAt(0).toUpperCase() + wh.status.slice(1) : 'Active'
                    });
                } else {
                    router.push('/admin/inventory/warehouses');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouse();
    }, [id, router]);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.address.trim()) e.address = 'Street address is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                warehouse_code: form.code.trim() || null,
                warehouse_type: form.type,
                area: form.area || null,
                location: `${form.address}, ${form.city}, ${form.state}, ${form.country} ${form.postal_code}`,
                status: form.status.toLowerCase(),
            };

            await inventoryService.updateWarehouse(id, payload);
            toast.success('Warehouse updated');
            router.push('/admin/inventory/warehouses');
        } catch (err: any) {
            toast.error('Failed to update warehouse');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><RefreshCw className="h-8 w-8 animate-spin text-indigo-600" /></div>;

    return (
        <div className="animate-in fade-in duration-500 text-left">

            <PageHeader
                title="Edit Warehouse"
                subtitle={`Configure storage details for ${form.name}`}
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Warehouses', href: '/admin/inventory/warehouses' },
                    { label: 'Edit Warehouse' },
                ]}
            />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-[900px] animate-in slide-in-from-bottom-5 duration-500">

                {/* 1. WAREHOUSE INFO */}
                <Card className="p-8 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>

                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                        <div className="p-3 bg-indigo-50 rounded-xl"><Building2 className="h-7 w-7 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">1. Warehouse Info</h2>
                            <p className="text-[13px] text-slate-500">Essential identification and node type.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        <Field label="Warehouse Name" value={form.name} onChange={e => handle('name', e.target.value)} placeholder="e.g. Karachi Central" required />
                        <Field label="Internal Code" value={form.code} onChange={e => handle('code', e.target.value)} placeholder="e.g. WH-PK-01" />
                        <Field label="Warehouse Type" type="select" value={form.type} onChange={e => handle('type', e.target.value)}>
                            <option>Main</option>
                            <option>Regional</option>
                            <option>Store</option>
                        </Field>
                        <Field label="Status" type="select" value={form.status} onChange={e => handle('status', e.target.value)}>
                            <option>Active</option>
                            <option>Inactive</option>
                        </Field>
                        <Field label="Area / City" type="select" value={form.area} onChange={e => handle('area', e.target.value)}>
                            <option value="">— No area —</option>
                            {areas.map(a => (
                                <option key={a.id} value={a.id}>{a.name}{a.code ? ` (${a.code})` : ''}</option>
                            ))}
                        </Field>
                    </div>
                </Card>

                {/* 2. LOCATION & CONTACT */}
                <Card className="p-8 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>

                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                        <div className="p-3 bg-indigo-50 rounded-xl"><MapPin className="h-7 w-7 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">2. Location & Contact</h2>
                            <p className="text-[13px] text-slate-500">Physical address and management details.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <Field label="Contact Person" value={form.contact_person} onChange={e => handle('contact_person', e.target.value)} placeholder="Node Manager" />
                            <Field label="Phone Number" value={form.contact_phone} onChange={e => handle('contact_phone', e.target.value)} placeholder="+92 XXX XXXXXXX" />
                        </div>
                        <Field label="Street Address" type="textarea" value={form.address} onChange={e => handle('address', e.target.value)} rows={3} placeholder="Full physical address..." required />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Field label="City" value={form.city} onChange={e => handle('city', e.target.value)} />
                            <Field label="State" value={form.state} onChange={e => handle('state', e.target.value)} />
                            <Field label="Postal Code" value={form.postal_code} onChange={e => handle('postal_code', e.target.value)} />
                        </div>
                    </div>
                </Card>

                <div className="pt-2 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => router.push('/admin/inventory/warehouses')}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}
