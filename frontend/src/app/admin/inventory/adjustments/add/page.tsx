"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, RefreshCw, Package,
    FileText, Info
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button } from '@/components/admin/ui';

const inputCls = (err?: boolean) => `w-full h-10 px-3.5 bg-white rounded-lg text-[13.5px] outline-none border transition-all placeholder:text-slate-400 text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${err ? 'border-rose-500' : 'border-slate-200'}`;
const selectCls = `w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-[13.5px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 text-slate-600 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

export default function AddAdjustmentPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [form, setForm] = useState({
        product: '',
        warehouse: '',
        adjustment_type: 'Addition',
        quantity: '',
        reason: 'Counting Error',
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
                setProducts(prodData || []);
                setWarehouses(whData || []);
            } catch (error) {
                console.error(error);
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
        if (!form.product) e.product = 'Target product required';
        if (!form.warehouse) e.warehouse = 'Node required';
        if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Invalid quantity';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await inventoryService.createAdjustment({
                ...form,
                quantity: Number(form.quantity)
            });
            toast.success('Stock level adjusted successfully!');
            setTimeout(() => router.push('/admin/inventory/adjustments'), 1000);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to commit adjustment.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader
                title="New Stock Adjustment"
                subtitle="Record a manual override or audit corrective action"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Inventory', href: '/admin/inventory/adjustments' },
                    { label: 'New Stock Adjustment' },
                ]}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/admin/inventory/adjustments')}
                        >
                            Discard
                        </Button>
                        <Button
                            type="submit"
                            form="adjustment-form"
                            disabled={saving}
                        >
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Adjustment
                        </Button>
                    </>
                }
            />

            <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-6">
                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                        <Package className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900">Manifest Target</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl flex gap-3 text-sky-700">
                            <Info className="h-5 w-5 shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">
                                Mandatory Audit Warning: This operation immediately updates live inventory and generates a permanent ledger entry.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Target Asset <span className="text-rose-500">*</span></label>
                                <select 
                                    className={selectCls} 
                                    value={form.product} 
                                    onChange={e => handle('product', e.target.value)}
                                >
                                    <option value="">Select SKU/Product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.product}>{p.product_name} — {p.warehouse_name}</option>
                                    ))}
                                </select>
                                {errors.product && <p className="text-xs text-rose-500">{errors.product}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Warehouse Location <span className="text-rose-500">*</span></label>
                                <select 
                                    className={selectCls} 
                                    value={form.warehouse} 
                                    onChange={e => handle('warehouse', e.target.value)}
                                >
                                    <option value="">Confirm Node...</option>
                                    {warehouses.filter(w => w.status?.toLowerCase() !== 'inactive').map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </select>
                                {errors.warehouse && <p className="text-xs text-rose-500">{errors.warehouse}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Protocol Type</label>
                                <select className={selectCls} value={form.adjustment_type} onChange={e => handle('adjustment_type', e.target.value)}>
                                    <option value="Addition">Addition (+)</option>
                                    <option value="Removal">Removal (-)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Delta Quantity <span className="text-rose-500">*</span></label>
                                <input 
                                    type="number" 
                                    className={inputCls(!!errors.quantity)} 
                                    placeholder="0"
                                    value={form.quantity} 
                                    onChange={e => handle('quantity', e.target.value)} 
                                />
                                {errors.quantity && <p className="text-xs text-rose-500">{errors.quantity}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Reason Code</label>
                                <select className={selectCls} value={form.reason} onChange={e => handle('reason', e.target.value)}>
                                    <option value="Counting Error">Counting Error</option>
                                    <option value="Damaged Goods">Damaged Goods</option>
                                    <option value="Expired Stock">Expired Stock</option>
                                    <option value="Missing Item">Missing Item</option>
                                    <option value="Return to Vendor">Return to Vendor</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900">Audit Documentation</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-1">
                            <label className={labelCls}>Audit Context / Signature Notes</label>
                            <textarea 
                                className={`${inputCls()} h-32 resize-none`} 
                                placeholder="Provide technical context for this manual system bypass..."
                                value={form.notes} 
                                onChange={e => handle('notes', e.target.value)} 
                            />
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        onClick={() => router.push('/admin/inventory/adjustments')}
                    >
                        Discard
                    </Button>
                    <Button
                        type="submit"
                        size="lg"
                        disabled={saving}
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commit Adjustment
                    </Button>
                </div>
            </form>
        </div>
    );
}

