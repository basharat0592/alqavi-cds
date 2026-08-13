'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, AlertOctagon, Loader2 } from 'lucide-react';
import { roleService } from '@/lib/api';
import { PageHeader, Card, Button } from '@/components/admin/ui';

export default function DeleteRolePage() {
    const router = useRouter();
    const params = useParams();
    const roleId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [role, setRole] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!roleId) return;
        const fetchRole = async () => {
            try {
                const found = await roleService.getById(roleId);
                if (found) {
                    if (found.is_default || found.name?.toLowerCase() === 'super admin') {
                        setError('This role is protected and cannot be deleted.');
                    } else {
                        setRole(found);
                    }
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

    const handleDelete = async () => {
        setLoading(true);
        setError('');
        try {
            await roleService.delete(roleId);
            router.push('/admin/users/roles');
        } catch (err: any) {
            setError(err.message || 'Failed to delete role.');
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#0E8CA8]" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Role</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12">
            <PageHeader
                title="Delete Role"
                breadcrumbs={[
                    { label: 'Console', href: '/admin/dashboard' },
                    { label: 'Roles', href: '/admin/users/roles' },
                    { label: 'Delete Role' },
                ]}
            />

            <Card className="overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    {error ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold text-center">
                            <div className="flex items-center justify-center gap-2">
                                <AlertOctagon className="h-5 w-5" />
                                {error}
                            </div>
                            <div className="mt-4">
                                <Link href="/admin/users/roles">
                                    <Button variant="outline" size="md">Go Back</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center py-6">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="h-8 w-8 text-rose-500" strokeWidth={1.5} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Are you sure?</h2>
                            <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                                You are about to permanently delete the role <strong className="text-slate-900">"{role?.name}"</strong>. This action cannot be undone and may affect users currently assigned to this role.
                            </p>

                            <div className="flex items-center gap-3 w-full max-w-sm">
                                <Link href="/admin/users/roles" className="flex-1">
                                    <Button variant="secondary" size="lg" className="w-full">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    variant="danger"
                                    size="lg"
                                    className="flex-1"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Yes, Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
