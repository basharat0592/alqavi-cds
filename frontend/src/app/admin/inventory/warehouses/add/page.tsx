"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Save, RefreshCw, Building2, 
    MapPin, ChevronRight
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PROFESSIONAL AMAZON RETAIL DESIGN SYSTEM (SYNCED)
   ───────────────────────────────────────────────────────────────────────────── */
const AmazonButton = ({ children, onClick, loading, variant = "primary", className = "", type = "button", disabled = false }: any) => {
    const primary = "bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] #9c7e31 #846a29 hover:from-[#f5d78e] hover:to-[#eeb933] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_1px_3px_rgba(0,0,0,0.1)]";
    const secondary = "bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] #a2a6ac #8d9096 hover:from-[#eef1f3] hover:to-[#dce0e4] shadow-sm";
    
    return (
        <button 
            type={type} onClick={onClick} disabled={loading || disabled} 
            className={`h-[31px] px-5 rounded-[3px] text-[13px] font-[500] text-[#0f1111] border transition-all active:shadow-inner flex items-center justify-center gap-2 ${variant === 'primary' ? primary : secondary} ${className}`}
        >
            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    );
};

const AmazonInput = ({ label, className = "", required = false, ...props }: { label?: string, required?: boolean } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (
    <div className="w-full">
        {label && <label className="block text-[13px] font-bold text-[#0f1111] mb-1.5">{label} {required && <span className="text-red-600">*</span>}</label>}
        <input
            className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] placeholder:text-[#888] ${className}`}
            {...(props as any)}
        />
    </div>
);

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
            toast.success('Warehouse added');
            router.push('/admin/inventory/warehouses');
        } catch (err: any) {
            toast.error('Failed to add warehouse');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-[#eaeded] min-h-screen pb-20 font-sans animate-in fade-in duration-500 text-left">
            
            {/* ── PROFESSIONAL HEADER ── */}
            <div className="bg-white border-b border-[#ddd] py-6 shadow-sm">
                <div className="max-w-[1240px] mx-auto px-4 md:px-8">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] mb-4">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <Link href="/admin/inventory/warehouses" className="hover:text-[#c45500] hover:underline">Warehouses</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Add Warehouse</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[28px] font-normal text-[#111]">Add Warehouse</h1>
                            <p className="text-[13px] text-[#565959] mt-1">Add a new storage location</p>
                        </div>
                        <button onClick={() => router.back()} className="text-[14px] text-[#007185] hover:text-[#c45500] font-bold flex items-center gap-1 transition-colors">
                            <ChevronLeft size={18} /> Back to list
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1240px] mx-auto mt-10 px-4 md:px-8">
                <div className="max-w-[800px] animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-white border border-[#ddd] rounded-lg p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#e47911]"></div>
                        
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#eee]">
                            <div className="p-3 bg-slate-50 rounded-xl"><Building2 className="h-8 w-8 text-[#e47911]" /></div>
                            <div>
                                <h2 className="text-[24px] font-bold text-[#111]">Location Details</h2>
                                <p className="text-[14px] text-[#565959]">Enter the warehouse name and physical address.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-1">
                                    <AmazonInput label="Warehouse Name" value={form.name} onChange={e => handle('name', e.target.value)} placeholder="e.g. Karachi Central Hub" required />
                                    {errors.name && <p className="text-[11px] text-red-600 font-bold mt-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <AmazonInput label="Location" value={form.location} onChange={e => handle('location', e.target.value)} placeholder="e.g. Plot 42, Sector 5, Karachi" required />
                                    {errors.location && <p className="text-[11px] text-red-600 font-bold mt-1">{errors.location}</p>}
                                </div>
                            </div>

                            <div className="pt-10 flex border-t border-[#eee] justify-end gap-3">
                                <AmazonButton variant="secondary" onClick={() => router.push('/admin/inventory/warehouses')} className="w-[140px]">Cancel</AmazonButton>
                                <AmazonButton type="submit" loading={saving} className="w-[200px] h-[40px] text-[15px]">Add Warehouse</AmazonButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
