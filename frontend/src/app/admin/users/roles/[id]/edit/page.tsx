'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2 } from 'lucide-react';
import { roleService } from '@/lib/api';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

export default function EditRolePage() {
    const router = useRouter();
    const params = useParams();
    const roleId = params.id as string;
    
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!roleId) return;
        const fetchRole = async () => {
            try {
                const role = await roleService.getById(roleId);
                if (role) {
                    setFormData({ name: role.name, description: role.description || '' });
                } else {
                    setError('Role not found.');
                }
            } catch (err: any) {
                setError('Failed to fetch role details.');
            } finally {
                setFetching(false);
            }
        };
        fetchRole();
    }, [roleId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!formData.name.trim()) {
            setError('Role name is required.');
            return;
        }

        setLoading(true);
        try {
            await roleService.update(roleId, formData);
            router.push('/admin/users/roles');
        } catch (err: any) {
            setError(err.message || 'Failed to update role.');
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Role</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12 px-4 mt-6">
            <PageHeader
                title="Edit Role"
                subtitle="Update platform access privileges"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Roles', href: '/admin/users/roles' },
                    { label: 'Edit Role' },
                ]}
            />

            {/* Form */}
            <Card className="overflow-hidden">
            <form onSubmit={handleSubmit}>
                <div className="p-6 md:p-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-bold flex flex-col">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Role Name <span className="text-rose-500">*</span></label>
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
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            placeholder="Provide a brief description of what this role entails..."
                            rows={4}
                            className="w-full px-3.5 py-3 bg-white rounded-lg text-[13.5px] text-slate-800 outline-none border border-slate-200 placeholder:text-slate-400 transition-all focus:border-[#F59E0B] focus:ring-4 focus:ring-[#F59E0B]/10 resize-none"
                        />
                    </div>
                </div>

                <div className="bg-slate-50/60 p-6 flex items-center justify-end gap-3 border-t border-slate-100">
                    <Link
                        href="/admin/users/roles"
                        className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                    >
                        Cancel
                    </Link>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={loading || !formData.name.trim()}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </form>
            </Card>
        </div>
    );
}
