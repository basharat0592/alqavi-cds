'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import {
    ArrowLeft, History, Save, Loader2, Info,
    ArrowRightLeft, Package, Warehouse, User, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

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
        `w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border rounded text-sm font-medium text-gray-900 dark:text-white outline-none transition-all focus:bg-white dark:focus:bg-slate-900 ${errors[field]
            ? 'border-red-300 focus:border-red-400'
            : 'border-gray-200 dark:border-slate-700 focus:border-[#F59E0B]'
        }`;

    const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-1.5";

    return (
        <div className="max-w-[800px] mx-auto pb-12 font-sans px-4 mt-8">

            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
                <Link href="/admin/inventory/movements" className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-gray-400 hover:text-[#F59E0B] transition-all shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Log Manual Movement</h1>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Record a physical stock transition or return event</p>
                </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-[0_8px_30_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30_rgba(0,0,0,0.2)] overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Product & Warehouse */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Inventory Item <span className="text-red-500">*</span></label>
                            <select value={form.product} onChange={e => handle('product', e.target.value)}
                                className={`${inputCls('product')} font-bold`}>
                                <option value="">Select SKU/Location</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.product}>{p.product_name} — {p.warehouse_name}</option>
                                ))}
                            </select>
                            {errors.product && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.product}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Select Warehouse Node <span className="text-red-500">*</span></label>
                            <select value={form.warehouse} onChange={e => handle('warehouse', e.target.value)}
                                className={inputCls('warehouse')}>
                                <option value="">Select Target Node</option>
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                                ))}
                            </select>
                            {errors.warehouse && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.warehouse}</p>}
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
                            <label className={labelCls}>Quantity Delta <span className="text-red-500">*</span></label>
                            <input type="number" value={form.quantity} onChange={e => handle('quantity', e.target.value)}
                                className={`${inputCls('quantity')} font-black`} placeholder="0" />
                            {errors.quantity && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.quantity}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Reference ID / Doc #</label>
                            <input type="text" value={form.reference_id} onChange={e => handle('reference_id', e.target.value)}
                                className={inputCls('reference_id')} placeholder="REF-AUTO" />
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Transaction Notes</label>
                        <textarea value={form.notes} onChange={e => handle('notes', e.target.value)}
                            className={`${inputCls('notes')} h-32 resize-none shadow-inner`} placeholder="Physical shipment details, tracking info, or reason..." />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/inventory/movements" className="px-6 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving}
                        style={{ backgroundColor: '#F59E0B' }}
                        className="flex items-center gap-2 px-8 py-2 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-all shadow-sm disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {saving ? 'Recording...' : 'Commit Movement Record'}
                    </button>
                </div>
            </form>
        </div>
    );
}

