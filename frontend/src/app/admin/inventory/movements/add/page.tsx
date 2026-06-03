'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import {
    ArrowLeft, Save, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

export default function AddMovementPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [form, setForm] = useState({
        product: '',
        warehouse: '',
        movement_type: 'Transfer In',
        quantity: '',
        reference_id: '',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [prodData, whData] = await Promise.all([
                    inventoryService.getInventory(),
                    inventoryService.getWarehouses()
                ]);
                setProducts(prodData);
                setWarehouses(whData);
            } catch (error) {
                console.error("Failed to load data", error);
            }
        };
        loadInitData();
    }, []);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.product) e.product = 'Target product unit is required';
        if (!form.warehouse) e.warehouse = 'Warehouse node is required';
        if (!form.quantity || Number(form.quantity) === 0) e.quantity = 'Non-zero quantity is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await inventoryService.createMovement({
                ...form,
                quantity: Number(form.quantity)
            });
            toast.success('Movement record logged successfully!');
            setTimeout(() => router.push('/admin/inventory/movements'), 1000);
        } catch (err: any) {
            toast.error('Failed to log movement.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = (field: string) =>
        `${ui.inputBase} ${errors[field]
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/10'
            : ''
        }`;

    const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5";

    return (
        <div className="max-w-[800px] mx-auto pb-12">

            <PageHeader
                title="New Stock Movement"
                subtitle="Record a physical stock transition or return event"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Stock Movements', href: '/admin/inventory/movements' },
                    { label: 'New Stock Movement' },
                ]}
                actions={
                    <Link
                        href="/admin/inventory/movements"
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 text-[13.5px] rounded-lg font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                }
            />

            {/* Form Card */}
            <Card className="overflow-hidden">
                <form onSubmit={handleSubmit}>
                <div className="p-8 space-y-8">

                    {/* Product & Warehouse */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Inventory Item <span className="text-rose-500">*</span></label>
                            <select value={form.product} onChange={e => handle('product', e.target.value)}
                                className={inputCls('product')}>
                                <option value="">Select SKU/Location</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.product}>{p.product_name} — {p.warehouse_name}</option>
                                ))}
                            </select>
                            {errors.product && <p className="text-rose-500 text-[11px] font-semibold mt-1">{errors.product}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Select Warehouse Node <span className="text-rose-500">*</span></label>
                            <select value={form.warehouse} onChange={e => handle('warehouse', e.target.value)}
                                className={inputCls('warehouse')}>
                                <option value="">Select Target Node</option>
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                                ))}
                            </select>
                            {errors.warehouse && <p className="text-rose-500 text-[11px] font-semibold mt-1">{errors.warehouse}</p>}
                        </div>
                    </div>

                    {/* Type, Qty & Ref */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label className={labelCls}>Movement Type</label>
                            <select value={form.movement_type} onChange={e => handle('movement_type', e.target.value)}
                                className={inputCls('movement_type')}>
                                <option value="Transfer In">Transfer In</option>
                                <option value="Transfer Out">Transfer Out</option>
                                <option value="Return">Return</option>
                                <option value="Adjustment">Adjustment</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Quantity Delta <span className="text-rose-500">*</span></label>
                            <input type="number" value={form.quantity} onChange={e => handle('quantity', e.target.value)}
                                className={`${inputCls('quantity')} tabular-nums font-semibold`} placeholder="0" />
                            {errors.quantity && <p className="text-rose-500 text-[11px] font-semibold mt-1">{errors.quantity}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Reference ID / Doc #</label>
                            <input type="text" value={form.reference_id} onChange={e => handle('reference_id', e.target.value)}
                                className={inputCls('reference_id')} placeholder="REF-AUTO" />
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Transaction Notes</label>
                        <textarea value={form.notes} onChange={e => handle('notes', e.target.value)}
                            className={`${inputCls('notes')} h-32 py-2.5 resize-none`} placeholder="Physical shipment details, tracking info, or reason..." />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50/60 border-t border-slate-200/70 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/inventory/movements" className="inline-flex items-center justify-center h-10 px-4 text-[13.5px] rounded-lg font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all">
                        Cancel
                    </Link>
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {saving ? 'Recording...' : 'Commit Movement Record'}
                    </Button>
                </div>
                </form>
            </Card>
        </div>
    );
}

