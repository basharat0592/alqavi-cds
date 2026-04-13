"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Save, RefreshCw, Building2, 
    MapPin
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import toast from 'react-hot-toast';

const inputCls = (err?: boolean) => `w-full px-4 py-2.5 bg-white dark:bg-[#1a252f] border rounded-xl text-sm outline-none focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200 ${err ? 'border-red-600' : 'border-slate-200 dark:border-white/10'}`;
const labelCls = 'block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest';

export default function AddWarehousePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        location: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.location.trim()) e.location = 'Location is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await inventoryService.createWarehouse(form);
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
        <div className="max-w-xl mx-auto py-12 px-6 font-sans text-left text-left">
            <div className="mb-10 text-left">
                <Link 
                    href="/admin/inventory/warehouses" 
                    className="text-[10px] font-black text-slate-400 hover:text-[#F59E0B] transition-colors mb-4 flex items-center gap-1 uppercase tracking-widest"
                >
                    <ChevronLeft className="h-3 w-3" /> Back to Registry
                </Link>
                <div className="flex items-center gap-3 mt-4">
                    <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Add Warehouse</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Initialize a new storage node</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="space-y-1.5 text-left">
                        <label className={labelCls}>Warehouse Name <span className="text-red-500">*</span></label>
                        <input 
                            className={inputCls(!!errors.name)} 
                            placeholder="e.g. Karachi Central Hub"
                            value={form.name} 
                            onChange={e => handle('name', e.target.value)} 
                        />
                        {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5 text-left">
                        <label className={labelCls}>Physical Location <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                className={inputCls(!!errors.location)} 
                                placeholder="e.g. Plot 42, Sector 5, Karachi"
                                value={form.location} 
                                onChange={e => handle('location', e.target.value)} 
                            />
                        </div>
                        {errors.location && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{errors.location}</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/inventory/warehouses')}
                        className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-3 px-10 py-3.5 bg-[#F59E0B] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-yellow-600 transition-all shadow-xl shadow-yellow-500/20 disabled:opacity-50 active:scale-95"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Register Node
                    </button>
                </div>
            </form>
        </div>
    );
}
