"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Save, RefreshCw, Layers, 
    Calendar, Package, Warehouse, Info 
} from 'lucide-react';
import { inventoryService, productService } from '@/lib/api';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-xl text-sm outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const selectCls = `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#EEAF1C] text-slate-600 dark:text-slate-300 cursor-pointer transition-all`;
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

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
        <div className="max-w-4xl mx-auto py-8 px-6 font-sans">
            <div className="mb-8">
                <Link 
                    href="/admin/inventory/batches" 
                    className="text-sm font-medium text-slate-500 hover:text-[#EEAF1C] transition-colors mb-4 flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Batches
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Batch Identification</h1>
                <p className="text-sm text-slate-500">Register a new product lot with validity tracking</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <Layers className="h-4 w-4 text-[#EEAF1C]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Lot Manifest</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Target Asset <span className="text-red-500">*</span></label>
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
                                {errors.product && <p className="text-xs text-red-500">{errors.product}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Target Node <span className="text-red-500">*</span></label>
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
                                {errors.warehouse && <p className="text-xs text-red-500">{errors.warehouse}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelCls}>Lot / Batch Identification <span className="text-red-500">*</span></label>
                                <input 
                                    className={inputCls(!!errors.batch_number)} 
                                    placeholder="e.g. BTC-2024-X"
                                    value={form.batch_number} 
                                    onChange={e => handle('batch_number', e.target.value)} 
                                />
                                {errors.batch_number && <p className="text-xs text-red-500">{errors.batch_number}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>Opening Stock Units <span className="text-red-500">*</span></label>
                                <input 
                                    type="number" 
                                    className={inputCls(!!errors.quantity)} 
                                    placeholder="0"
                                    value={form.quantity} 
                                    onChange={e => handle('quantity', e.target.value)} 
                                />
                                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-[16px] overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center gap-3 bg-slate-50 dark:bg-white/5">
                        <Calendar className="h-4 w-4 text-[#EEAF1C]" />
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Lifecycle Parameters</h2>
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
                                <label className={labelCls}>Expiration Horizon <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    className={inputCls(!!errors.expiry_date)} 
                                    value={form.expiry_date} 
                                    onChange={e => handle('expiry_date', e.target.value)} 
                                />
                                {errors.expiry_date && <p className="text-xs text-red-500">{errors.expiry_date}</p>}
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
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/inventory/batches')}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-2.5 bg-[#EEAF1C] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commence Registry
                    </button>
                </div>
            </form>
        </div>
    );
}

