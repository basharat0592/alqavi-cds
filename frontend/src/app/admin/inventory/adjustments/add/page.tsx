'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import {
    ArrowLeft, Settings, Save, Loader2, Info,
    Package, Warehouse, AlertCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

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
                setProducts(prodData);
                setWarehouses(whData);
            } catch (error) {
                console.error("Failed to load inventory data", error);
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
        if (!form.product) e.product = 'Target product is required';
        if (!form.warehouse) e.warehouse = 'Warehouse node is required';
        if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Valid delta quantity is required';
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
            toast.error('Failed to commit adjustment.');
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

    return (
        <div className="max-w-[800px] mx-auto pb-12 font-sans px-4 mt-8">

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <Link href="/admin/inventory/adjustments" className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-gray-400 hover:text-[#E68A00] transition-all shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Initialize Adjustment</h1>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Record a manual system override for stock levels</p>
                </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-[0_8px_30_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30_rgba(0,0,0,0.2)] overflow-hidden">
                <div className="p-8 space-y-8">

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex gap-3 text-blue-800 dark:text-blue-300 text-[11px] font-bold uppercase tracking-tight">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Mandatory Audit Warning: This operation immediately updates live inventory and generates a permanent ledger entry.</p>
                    </div>

                    {/* Target Unit Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Target Inventory Unit <span className="text-red-500">*</span></label>
                            <select value={form.product} onChange={e => handle('product', e.target.value)}
                                className={`${inputCls('product')} font-bold`}>
                                <option value="">Select SKU/Location Pair</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.product}>{p.product_name} — {p.warehouse_name}</option>
                                ))}
                            </select>
                            {errors.product && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.product}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Confirm Warehouse Node <span className="text-red-500">*</span></label>
                            <select value={form.warehouse} onChange={e => handle('warehouse', e.target.value)}
                                className={inputCls('warehouse')}>
                                <option value="">Confirm Warehouse</option>
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                                ))}
                            </select>
                            {errors.warehouse && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.warehouse}</p>}
                        </div>
                    </div>

                    {/* Type & Delta */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                            <label className={labelCls}>Adjustment Type</label>
                            <select value={form.adjustment_type} onChange={e => handle('adjustment_type', e.target.value)}
                                className={`${inputCls('adjustment_type')} font-black`}>
                                <option value="Addition">Addition (+)</option>
                                <option value="Removal">Removal (-)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Quantity Delta <span className="text-red-500">*</span></label>
                            <input type="number" value={form.quantity} onChange={e => handle('quantity', e.target.value)}
                                className={`${inputCls('quantity')} font-black`} placeholder="0" />
                            {errors.quantity && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.quantity}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Reason Code</label>
                            <select value={form.reason} onChange={e => handle('reason', e.target.value)}
                                className={inputCls('reason')}>
                                <option value="Counting Error">Counting Error</option>
                                <option value="Damaged Goods">Damaged Goods</option>
                                <option value="Expired Stock">Expired Stock</option>
                                <option value="Missing Item">Missing Item</option>
                                <option value="Return to Vendor">Return to Vendor</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* Audit Notes */}
                    <div>
                        <label className={labelCls}>Audit Notes / Signature Context</label>
                        <textarea value={form.notes} onChange={e => handle('notes', e.target.value)}
                            className={`${inputCls('notes')} h-32 resize-none shadow-inner`} placeholder="Provide detailed context for this manual bypass..." />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/inventory/adjustments" className="px-6 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        Abort
                    </Link>
                    <button type="submit" disabled={saving}
                        style={{ backgroundColor: '#E68A00' }}
                        className="flex items-center gap-2 px-8 py-2 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-all shadow-sm disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'Processing...' : 'Commit System Adjustment'}
                    </button>
                </div>
            </form>
        </div>
    );
}
