'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { inventoryService, productService } from '@/lib/api';
import {
    ArrowLeft, Layers, Save, Loader2, Calendar, 
    Clock, Package, Warehouse, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

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
        if (!form.product) e.product = 'Product selection is required';
        if (!form.warehouse) e.warehouse = 'Warehouse node is required';
        if (!form.batch_number.trim()) e.batch_number = 'Batch number is required';
        if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Valid quantity is required';
        if (!form.expiry_date) e.expiry_date = 'Expiry date is required';
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
            toast.success('New batch initialized successfully!');
            setTimeout(() => router.push('/admin/inventory/batches'), 1000);
        } catch (err: any) {
            toast.error('Failed to create batch.');
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
                <Link href="/admin/inventory/batches" className="p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-gray-400 hover:text-[#E68A00] transition-all shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Initialize Batch</h1>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Register a new product lot with expiry tracking</p>
                </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-[0_8px_30_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30_rgba(0,0,0,0.2)] overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Product & Warehouse */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Target Product <span className="text-red-500">*</span></label>
                            <select value={form.product} onChange={e => handle('product', e.target.value)}
                                className={`${inputCls('product')} font-bold`}>
                                <option value="">Select Base SKU</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                ))}
                            </select>
                            {errors.product && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.product}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Direct Node (Warehouse) <span className="text-red-500">*</span></label>
                            <select value={form.warehouse} onChange={e => handle('warehouse', e.target.value)}
                                className={inputCls('warehouse')}>
                                <option value="">Select Location</option>
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                                ))}
                            </select>
                            {errors.warehouse && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.warehouse}</p>}
                        </div>
                    </div>

                    {/* Batch & Qty */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Lot / Batch Number <span className="text-red-500">*</span></label>
                            <input type="text" value={form.batch_number} onChange={e => handle('batch_number', e.target.value)}
                                className={`${inputCls('batch_number')} font-black uppercase tracking-wider`} placeholder="e.g. BATCH-2024-X" />
                            {errors.batch_number && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.batch_number}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Opening Quantity <span className="text-red-500">*</span></label>
                            <input type="number" value={form.quantity} onChange={e => handle('quantity', e.target.value)}
                                className={`${inputCls('quantity')} font-black`} placeholder="0" />
                            {errors.quantity && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.quantity}</p>}
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-slate-800" />

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className={labelCls}>Manufacturing Date</label>
                            <input type="date" value={form.manufacturing_date} onChange={e => handle('manufacturing_date', e.target.value)}
                                className={inputCls('manufacturing_date')} />
                        </div>
                        <div>
                            <label className={labelCls}>Expiration Date <span className="text-red-500">*</span></label>
                            <input type="date" value={form.expiry_date} onChange={e => handle('expiry_date', e.target.value)}
                                className={`${inputCls('expiry_date')} text-red-600 font-bold dark:text-red-400`} />
                            {errors.expiry_date && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.expiry_date}</p>}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 p-6 flex items-center justify-end gap-3">
                    <Link href="/admin/inventory/batches" className="px-6 py-2 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving}
                        style={{ backgroundColor: '#E68A00' }}
                        className="flex items-center gap-2 px-8 py-2 text-white font-bold text-[10px] uppercase tracking-widest rounded transition-all shadow-sm disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
                        {saving ? 'Initializing...' : 'Commit Batch Entry'}
                    </button>
                </div>
            </form>
        </div>
    );
}
