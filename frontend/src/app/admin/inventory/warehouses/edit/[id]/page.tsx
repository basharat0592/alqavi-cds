'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import {
    ArrowLeft, Building2, Save, Loader2, MapPin, 
    Phone, Mail, Package, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
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
        email: '',
        capacity: '0',
        status: 'Active'
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchWarehouse = async () => {
            try {
                const data = await inventoryService.getWarehouses();
                const wh = data.find((w: any) => String(w.id) === id);
                if (wh) {
                    // Try to parse location back into components if it follows our pattern
                    let address = wh.location || '';
                    let city = '';
                    let state = '';
                    let postal = '';
                    
                    if (address.includes(',')) {
                        const parts = address.split(',').map((p: string) => p.trim());
                        if (parts.length >= 3) {
                            address = parts[0];
                            city = parts[1];
                            // Last part might contain "Pakistan 12345"
                            const lastParts = parts[2].split(' ');
                            state = lastParts[0] || '';
                            postal = lastParts[lastParts.length - 1] || '';
                        }
                    }

                    setForm({
                        name: wh.name || '',
                        code: wh.warehouse_code || '',
                        type: wh.warehouse_type || 'Main',
                        address: address,
                        city: city || wh.city || '',
                        state: state || wh.state || '',
                        country: 'Pakistan',
                        postal_code: postal || wh.postal_code || '',
                        contact_person: wh.contact_person || '',
                        contact_phone: wh.contact_phone || '',
                        email: wh.email || '',
                        capacity: String(wh.capacity || '0'),
                        status: wh.status ? wh.status.charAt(0).toUpperCase() + wh.status.slice(1) : 'Active'
                    });
                } else {
                    toast.error("Warehouse not found");
                    router.push('/admin/inventory/warehouses');
                }
            } catch (err) {
                toast.error("Failed to load warehouse data");
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
        if (!form.name.trim()) e.name = 'Warehouse name is required';
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
                warehouse_type: form.type === 'Dark Store' ? 'Regional' : form.type,
                location: `${form.address}, ${form.city}, ${form.state}, ${form.country} ${form.postal_code}`,
                status: form.status.toLowerCase(),
            };

            await inventoryService.updateWarehouse(id, payload);
            toast.success('Warehouse updated successfully!');
            setTimeout(() => router.push('/admin/inventory/warehouses'), 1000);
        } catch (err: any) {
            console.error("Warehouse Update Error:", err);
            toast.error('Failed to update warehouse.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = (field: string) =>
        `w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border rounded text-sm font-medium text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-slate-900 ${errors[field]
            ? 'border-red-300 focus:border-red-400'
            : 'border-gray-200 dark:border-slate-700 focus:border-[#E68A00]'
        }`;

    const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-1.5";

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#E68A00]" />
            </div>
        );
    }

    return (
        <div className="max-w-[800px] mx-auto pb-12 font-sans px-4 mt-8">

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <Link href="/admin/inventory/warehouses" className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-gray-400 hover:text-[#E68A00] transition-all shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Edit Distribution Node</h1>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Modify configuration for {form.name}</p>
                </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30_rgba(0,0,0,0.2)] overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Basic Info Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Warehouse Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.name} onChange={e => handle('name', e.target.value)}
                                className={inputCls('name')} placeholder="e.g. Karachi North Hub" />
                            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Internal Code <span className="text-red-500">*</span></label>
                            <input type="text" value={form.code} onChange={e => handle('code', e.target.value)}
                                className={inputCls('code')} placeholder="WH-001" />
                            {errors.code && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.code}</p>}
                        </div>
                    </div>

                    {/* Type & Capacity */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label className={labelCls}>Node Type</label>
                            <select value={form.type} onChange={e => handle('type', e.target.value)}
                                className={inputCls('type')}>
                                <option>Main</option>
                                <option>Regional</option>
                                <option>Store</option>
                                <option>Dark Store</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Capacity (Sqft)</label>
                            <input type="number" value={form.capacity} onChange={e => handle('capacity', e.target.value)}
                                className={inputCls('capacity')} />
                        </div>
                        <div>
                            <label className={labelCls}>Warehouse Status</label>
                            <select value={form.status} onChange={e => handle('status', e.target.value)}
                                className={inputCls('status')}>
                                <option>Active</option>
                                <option>Inactive</option>
                                <option>Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Contact Person</label>
                            <input type="text" value={form.contact_person} onChange={e => handle('contact_person', e.target.value)}
                                className={inputCls('contact_person')} placeholder="Manager Name" />
                        </div>
                        <div>
                            <label className={labelCls}>Direct Phone</label>
                            <input type="tel" value={form.contact_phone} onChange={e => handle('contact_phone', e.target.value)}
                                className={inputCls('contact_phone')} placeholder="+92 3XX XXXXXXX" />
                        </div>
                    </div>

                    {/* Address Group */}
                    <div>
                        <label className={labelCls}>Street Address <span className="text-red-500">*</span></label>
                        <textarea value={form.address} onChange={e => handle('address', e.target.value)}
                            className={`${inputCls('address')} h-24 resize-none`} placeholder="Full physical address..." />
                        {errors.address && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label className={labelCls}>City</label>
                            <input type="text" value={form.city} onChange={e => handle('city', e.target.value)}
                                className={inputCls('city')} />
                        </div>
                        <div>
                            <label className={labelCls}>State / Province</label>
                            <input type="text" value={form.state} onChange={e => handle('state', e.target.value)}
                                className={inputCls('state')} />
                        </div>
                        <div>
                            <label className={labelCls}>Postal Code</label>
                            <input type="text" value={form.postal_code} onChange={e => handle('postal_code', e.target.value)}
                                className={inputCls('postal_code')} />
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/inventory/warehouses" className="px-6 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving}
                        style={{ backgroundColor: '#E68A00' }}
                        className="flex items-center gap-2 px-8 py-2 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-all shadow-sm disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'Saving Changes...' : 'Update Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
