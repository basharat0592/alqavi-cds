"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, RefreshCw, Building2
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

const AdminInput = ({ label, className = "", required = false, ...props }: { label?: string, required?: boolean } & React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (
    <div className="w-full">
        {label && <label className="block text-[13px] font-bold text-slate-900 mb-1.5">{label} {required && <span className="text-rose-600">*</span>}</label>}
        <input
            className={`${ui.inputBase} ${className}`}
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
        <div className="animate-in fade-in duration-500 text-left">

            <PageHeader
                title="Add Warehouse"
                subtitle="Add a new storage location"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Warehouses', href: '/admin/inventory/warehouses' },
                    { label: 'Add Warehouse' },
                ]}
                actions={
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ChevronLeft size={16} /> Back to list
                    </Button>
                }
            />

            <div className="max-w-[800px] animate-in slide-in-from-bottom-5 duration-500">
                <Card className="p-10">
                    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
                        <div className="p-3 bg-indigo-50 rounded-xl"><Building2 className="h-8 w-8 text-indigo-600" /></div>
                        <div>
                            <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">Location Details</h2>
                            <p className="text-[14px] text-slate-600">Enter the warehouse name and physical address.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-1">
                                <AdminInput label="Warehouse Name" value={form.name} onChange={e => handle('name', e.target.value)} placeholder="e.g. Karachi Central Hub" required />
                                {errors.name && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <AdminInput label="Location" value={form.location} onChange={e => handle('location', e.target.value)} placeholder="e.g. Plot 42, Sector 5, Karachi" required />
                                {errors.location && <p className="text-[11px] text-rose-600 font-bold mt-1">{errors.location}</p>}
                            </div>
                        </div>

                        <div className="pt-10 flex border-t border-slate-100 justify-end gap-3">
                            <Button variant="secondary" onClick={() => router.push('/admin/inventory/warehouses')} className="w-[140px]">Cancel</Button>
                            <Button type="submit" disabled={saving} className="w-[200px] h-11 text-[15px]">
                                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                                Add Warehouse
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
