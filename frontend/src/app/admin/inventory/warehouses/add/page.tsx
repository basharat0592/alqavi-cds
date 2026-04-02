"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Save, RefreshCw, Building2, 
    MapPin, Phone, Mail, Package, ShieldCheck, 
    Activity, Globe, Info
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1B1C1E] border rounded-xl text-sm outline-none focus:border-[#F7CA00] focus:ring-1 focus:ring-[#F7CA00] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F7CA00] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

export default function AddWarehousePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        code: '',
        type: 'Main',
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

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.code.trim()) e.code = 'Internal code is required';
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
                location: `${form.address}, ${form.city}, ${form.state}, ${form.country} ${form.postal_code}`,
                status: form.status.toLowerCase(),
            };

            await inventoryService.createWarehouse(payload);
            toast.success('Warehouse registered successfully!');
            setTimeout(() => router.push('/admin/inventory/warehouses'), 1000);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to register warehouse.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-6 font-sans">
            <div className="mb-8">
                <Link 
                    href="/admin/inventory/warehouses" 
                    className="text-sm font-medium text-slate-500 hover:text-[#F7CA00] transition-colors mb-4 flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Warehouses
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Add Warehouse</h1>
                <p className="text-sm text-slate-500">Initialize a new fulfillment center in the network</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identification Section */}
                <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <Building2 className="h-4 w-4 text-[#F7CA00]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Hub Identification</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className={labelCls}>Warehouse Name <span className="text-red-500">*</span></label>
                            <input 
                                className={inputCls(!!errors.name)} 
                                placeholder="e.g. Karachi North Hub"
                                value={form.name} 
                                onChange={e => handle('name', e.target.value)} 
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Internal Code <span className="text-red-500">*</span></label>
                            <input 
                                className={inputCls(!!errors.code)} 
                                placeholder="WH-001"
                                value={form.code} 
                                onChange={e => handle('code', e.target.value)} 
                            />
                            {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Node Type</label>
                            <select className={selectCls} value={form.type} onChange={e => handle('type', e.target.value)}>
                                <option>Main</option>
                                <option>Regional</option>
                                <option>Store</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Initial Status</label>
                            <select className={selectCls} value={form.status} onChange={e => handle('status', e.target.value)}>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Location Section */}
                <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <MapPin className="h-4 w-4 text-[#F7CA00]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Location & Contact</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Contact Person</label>
                                <input 
                                    className={inputCls()} 
                                    placeholder="Node Manager Name"
                                    value={form.contact_person} 
                                    onChange={e => handle('contact_person', e.target.value)} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Phone Number</label>
                                <input 
                                    className={inputCls()} 
                                    placeholder="+92 XXX XXXXXXX"
                                    value={form.contact_phone} 
                                    onChange={e => handle('contact_phone', e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>Street Address <span className="text-red-500">*</span></label>
                            <textarea 
                                className={`${inputCls(!!errors.address)} h-24 resize-none`} 
                                placeholder="Physical node address..."
                                value={form.address} 
                                onChange={e => handle('address', e.target.value)} 
                            />
                            {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>City</label>
                                <input className={inputCls()} value={form.city} onChange={e => handle('city', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>State</label>
                                <input className={inputCls()} value={form.state} onChange={e => handle('state', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Postal Code</label>
                                <input className={inputCls()} value={form.postal_code} onChange={e => handle('postal_code', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/inventory/warehouses')}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-2.5 bg-[#F7CA00] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Complete Registry
                    </button>
                </div>
            </form>
        </div>
    );
}
