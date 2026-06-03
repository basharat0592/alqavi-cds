"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, RefreshCw, Layers,
    Calendar
} from 'lucide-react';
import { inventoryService, productService } from '@/lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button } from '@/components/admin/ui';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white border rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ${err ? 'border-rose-500' : 'border-slate-200'}`;
const selectCls = `w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 text-slate-600 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';

export default function AddBatchPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const [form, setForm] = useState({
        product: '',
        warehouse: '',
        batch_number: '',
        quantity: '',
        manufacturing_date: '',
        expiry_date: '',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [prodData, whData] = await Promise.all([
                    productService.getProducts(),
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
        if (!form.product) e.product = 'Selection required';
        if (!form.warehouse) e.warehouse = 'Node required';
        if (!form.batch_number.trim()) e.batch_number = 'Batch ID required';
        if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Invalid quantity';
        if (!form.expiry_date) e.expiry_date = 'Expiry required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await inventoryService.createBatch({
                ...form,
                quantity: Number(form.quantity)
            });
            toast.success('Batch identification initialized!');
            setTimeout(() => router.push('/admin/inventory/batches'), 1000);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to commit batch entry.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader
                title="New Batch"
                subtitle="Register a new product lot with validity tracking"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Batches', href: '/admin/inventory/batches' },
                    { label: 'New Batch' },
                ]}
                actions={
                    <Button
                        variant="outline"
                        onClick={() => router.push('/admin/inventory/batches')}
                    >
                        Back to Batches
                    </Button>
                }
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                        <Layers className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900">Lot Manifest</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Target Asset <span className="text-rose-500">*</span></label>
                                <select 
                                    className={selectCls} 
                                    value={form.product} 
                                    onChange={e => handle('product', e.target.value)}
                                >
                                    <option value="">Select Base SKU...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
                                    ))}
                                </select>
                                {errors.product && <p className="text-xs text-rose-500">{errors.product}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Target Node <span className="text-rose-500">*</span></label>
                                <select 
                                    className={selectCls} 
                                    value={form.warehouse} 
                                    onChange={e => handle('warehouse', e.target.value)}
                                >
                                    <option value="">Select Distribution Node...</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </select>
                                {errors.warehouse && <p className="text-xs text-rose-500">{errors.warehouse}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Lot / Batch Identification <span className="text-rose-500">*</span></label>
                                <input 
                                    className={inputCls(!!errors.batch_number)} 
                                    placeholder="e.g. BTC-2024-X"
                                    value={form.batch_number} 
                                    onChange={e => handle('batch_number', e.target.value)} 
                                />
                                {errors.batch_number && <p className="text-xs text-rose-500">{errors.batch_number}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Opening Stock Units <span className="text-rose-500">*</span></label>
                                <input 
                                    type="number" 
                                    className={inputCls(!!errors.quantity)} 
                                    placeholder="0"
                                    value={form.quantity} 
                                    onChange={e => handle('quantity', e.target.value)} 
                                />
                                {errors.quantity && <p className="text-xs text-rose-500">{errors.quantity}</p>}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        <h2 className="text-sm font-bold text-slate-900">Lifecycle Parameters</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Manufacturing Date</label>
                                <input 
                                    type="date" 
                                    className={inputCls()} 
                                    value={form.manufacturing_date} 
                                    onChange={e => handle('manufacturing_date', e.target.value)} 
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Expiration Horizon <span className="text-rose-500">*</span></label>
                                <input 
                                    type="date" 
                                    className={inputCls(!!errors.expiry_date)} 
                                    value={form.expiry_date} 
                                    onChange={e => handle('expiry_date', e.target.value)} 
                                />
                                {errors.expiry_date && <p className="text-xs text-rose-500">{errors.expiry_date}</p>}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className={labelCls}>Quality Notes</label>
                            <textarea 
                                className={`${inputCls()} h-24 resize-none`} 
                                placeholder="Detail handling or storage protocols..."
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
                        onClick={() => router.push('/admin/inventory/batches')}
                    >
                        Discard
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={saving}
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commence Registry
                    </Button>
                </div>
            </form>
        </div>
    );
}

