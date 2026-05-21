"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, Save, RefreshCw, Building2, 
    MapPin, Loader2, ChevronRight
} from 'lucide-react';
import { inventoryService } from '@/lib/api';
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

const AmazonInput = ({ label, className = "", required = false, ...props }: { label?: string, required?: boolean } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <div className="w-full">
        {label && <label className="block text-[13px] font-bold text-[#0f1111] mb-1.5">{label} {required && <span className="text-red-600">*</span>}</label>}
        {props.type === 'select' ? (
            <select
                className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] cursor-pointer ${className}`}
                {...(props as any)}
            >
                {props.children}
            </select>
        ) : props.type === 'textarea' ? (
            <textarea
                className={`w-full p-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] placeholder:text-[#888] ${className}`}
                {...(props as any)}
            />
        ) : (
            <input
                className={`w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] text-[#0f1111] outline-none transition-all focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] placeholder:text-[#888] ${className}`}
                {...(props as any)}
            />
        )}
    </div>
);

export default function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        code: '',
        type: 'Main',
        address: '',
        city: '',
        state: '',
        country: 'Pakistan',
        postal_code: '',
        contact_person: '',
        contact_phone: '',
        status: 'Active'
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchWarehouse = async () => {
            try {
                const data = await inventoryService.getWarehouses();
                const wh = data.find((w: any) => String(w.id) === id);
                if (wh) {
                    let address = wh.location || '';
                    let city = wh.city || '';
                    let state = wh.state || '';
                    let postal = wh.postal_code || '';
                    
                    if (address.includes(',') && !city) {
                        const parts = address.split(',').map((p: string) => p.trim());
                        if (parts.length >= 3) {
                            address = parts[0];
                            city = parts[1];
                            const lastParts = parts[2].split(' ');
                            state = lastParts[0] || '';
                            postal = lastParts[lastParts.length - 1] || '';
                        }
                    }

                    setForm({
                        name: wh.name || '',
                        code: wh.warehouse_code || '',
                        type: wh.warehouse_type || 'Main',
                        address: address,
                        city: city,
                        state: state,
                        country: 'Pakistan',
                        postal_code: postal,
                        contact_person: wh.contact_person || '',
                        contact_phone: wh.contact_phone || '',
                        status: wh.status ? wh.status.charAt(0).toUpperCase() + wh.status.slice(1) : 'Active'
                    });
                } else {
                    router.push('/admin/inventory/warehouses');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouse();
    }, [id, router]);

    const handle = (k: string, v: any) => {
        setForm(p => ({ ...p, [k]: v }));
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.address.trim()) e.address = 'Street address is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                warehouse_code: form.code.trim() || null,
                warehouse_type: form.type,
                location: `${form.address}, ${form.city}, ${form.state}, ${form.country} ${form.postal_code}`,
                status: form.status.toLowerCase(),
            };

            await inventoryService.updateWarehouse(id, payload);
            toast.success('Warehouse updated');
            router.push('/admin/inventory/warehouses');
        } catch (err: any) {
            toast.error('Failed to update warehouse');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><RefreshCw className="h-8 w-8 animate-spin text-[#c45500]" /></div>;

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
                        <span className="text-[#c45500]">Edit Warehouse</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[28px] font-normal text-[#111]">Edit Warehouse</h1>
                            <p className="text-[13px] text-[#565959] mt-1">Configure storage details for {form.name}</p>
                        </div>
                        <button onClick={() => router.back()} className="text-[14px] text-[#007185] hover:text-[#c45500] font-bold flex items-center gap-1 transition-colors">
                            <ChevronLeft size={18} /> Back to list
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1240px] mx-auto mt-10 px-4 md:px-8">
                <form onSubmit={handleSubmit} className="space-y-8 max-w-[900px] animate-in slide-in-from-bottom-5 duration-500">
                    
                    {/* 1. WAREHOUSE INFO */}
                    <div className="bg-white border border-[#ddd] rounded-lg p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#111]"></div>
                        
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#eee]">
                            <div className="p-3 bg-slate-50 rounded-xl"><Building2 className="h-8 w-8 text-[#111]" /></div>
                            <div>
                                <h2 className="text-[24px] font-bold text-[#111]">1. Warehouse Info</h2>
                                <p className="text-[14px] text-[#565959]">Essential identification and node type.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <AmazonInput label="Warehouse Name" value={form.name} onChange={e => handle('name', e.target.value)} placeholder="e.g. Karachi Central" required />
                            <AmazonInput label="Internal Code" value={form.code} onChange={e => handle('code', e.target.value)} placeholder="e.g. WH-PK-01" />
                            <AmazonInput label="Warehouse Type" type="select" value={form.type} onChange={e => handle('type', e.target.value)}>
                                <option>Main</option>
                                <option>Regional</option>
                                <option>Store</option>
                            </AmazonInput>
                            <AmazonInput label="Status" type="select" value={form.status} onChange={e => handle('status', e.target.value)}>
                                <option>Active</option>
                                <option>Inactive</option>
                            </AmazonInput>
                        </div>
                    </div>

                    {/* 2. LOCATION & CONTACT */}
                    <div className="bg-white border border-[#ddd] rounded-lg p-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#e47911]"></div>
                        
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-[#eee]">
                            <div className="p-3 bg-slate-50 rounded-xl"><MapPin className="h-8 w-8 text-[#e47911]" /></div>
                            <div>
                                <h2 className="text-[24px] font-bold text-[#111]">2. Location & Contact</h2>
                                <p className="text-[14px] text-[#565959]">Physical address and management details.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <AmazonInput label="Contact Person" value={form.contact_person} onChange={e => handle('contact_person', e.target.value)} placeholder="Node Manager" />
                                <AmazonInput label="Phone Number" value={form.contact_phone} onChange={e => handle('contact_phone', e.target.value)} placeholder="+92 XXX XXXXXXX" />
                            </div>
                            <AmazonInput label="Street Address" type="textarea" value={form.address} onChange={e => handle('address', e.target.value)} rows={3} placeholder="Full physical address..." required />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <AmazonInput label="City" value={form.city} onChange={e => handle('city', e.target.value)} />
                                <AmazonInput label="State" value={form.state} onChange={e => handle('state', e.target.value)} />
                                <AmazonInput label="Postal Code" value={form.postal_code} onChange={e => handle('postal_code', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <AmazonButton variant="secondary" onClick={() => router.push('/admin/inventory/warehouses')} className="w-[140px]">Cancel</AmazonButton>
                        <AmazonButton type="submit" loading={saving} className="w-[200px] h-[40px] text-[15px]">Save Changes</AmazonButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
