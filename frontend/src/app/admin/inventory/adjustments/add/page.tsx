"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Save, RefreshCw, Package, 
    FileText, Info, AlertTriangle 
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1B1C1E] border rounded-xl text-sm outline-none focus:border-[#F7CA00] focus:ring-1 focus:ring-[#F7CA00] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F7CA00] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

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
        <div className="max-w-4xl mx-auto py-8 px-6 font-sans">
            <div className="mb-8">
                <Link 
                    href="/admin/inventory/adjustments" 
                    className="text-sm font-medium text-slate-500 hover:text-[#F7CA00] transition-colors mb-4 flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Adjustments
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Log Adjustment</h1>
                <p className="text-sm text-slate-500">Record a manual override or audit corrective action</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <Package className="h-4 w-4 text-[#F7CA00]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Manifest Target</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-blue-700">
                            <Info className="h-5 w-5 shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">
                                Mandatory Audit Warning: This operation immediately updates live inventory and generates a permanent ledger entry.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Target Asset <span className="text-red-500">*</span></label>
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
                                {errors.product && <p className="text-xs text-red-500">{errors.product}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Warehouse Location <span className="text-red-500">*</span></label>
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
                                {errors.warehouse && <p className="text-xs text-red-500">{errors.warehouse}</p>}
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
                                <label className={labelCls}>Delta Quantity <span className="text-red-500">*</span></label>
                                <input 
                                    type="number" 
                                    className={inputCls(!!errors.quantity)} 
                                    placeholder="0"
                                    value={form.quantity} 
                                    onChange={e => handle('quantity', e.target.value)} 
                                />
                                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
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
                </div>

                <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <FileText className="h-4 w-4 text-[#F7CA00]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Audit Documentation</h2>
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
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/inventory/adjustments')}
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
                        Commit Adjustment
                    </button>
                </div>
            </form>
        </div>
    );
}
