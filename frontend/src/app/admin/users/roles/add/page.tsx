'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Shield, Loader2 } from 'lucide-react';
import { roleService } from '@/lib/api';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

export default function AddRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!formData.name.trim()) {
            setError('Role name is required.');
            return;
        }

        setLoading(true);
        try {
            await roleService.create(formData);
            router.push('/admin/users/roles');
        } catch (err: any) {
            const data = err?.response?.data;
            let msg = 'Failed to create role.';
            if (data) {
                if (typeof data === 'string') msg = data;
                else if (data.name) msg = Array.isArray(data.name) ? data.name[0] : String(data.name);
                else if (data.detail) msg = data.detail;
                else { const v = Object.values(data).flat(); if (v.length) msg = String(v[0]); }
            }
            // Friendlier wording for the common duplicate-name case.
            if (/already exists/i.test(msg)) msg = `A role named "${formData.name}" already exists.`;
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12 px-4 mt-6">
            <PageHeader
                title="Add Role"
                subtitle="Define platform access privileges"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Roles', href: '/admin/users/roles' },
                    { label: 'Add Role' },
                ]}
                actions={
                    <Link href="/admin/users/roles">
                        <Button variant="outline" size="sm">Cancel</Button>
                    </Link>
                }
            />

            {/* Form */}
            <Card className="overflow-hidden">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-2 text-slate-900">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#13B0D1]/10 text-[#0E8CA8]">
                                <Shield className="h-5 w-5" />
                            </span>
                            <span className="text-[15px] font-bold tracking-tight">Role Details</span>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-semibold flex flex-col">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Role Name <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Content Manager"
                                className={ui.inputBase}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder="Provide a brief description of what this role entails..."
                                rows={4}
                                className="w-full px-3.5 py-3 bg-white rounded-lg text-[13.5px] text-slate-800 outline-none border border-slate-200 placeholder:text-slate-400 transition-all focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/10 resize-none"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50/60 p-6 flex items-center justify-end gap-3 border-t border-slate-100">
                        <Link href="/admin/users/roles">
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={loading || !formData.name.trim()}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Role
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

