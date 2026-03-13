'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertOctagon, Loader2 } from 'lucide-react';
import { roleService } from '@/lib/api';

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
                <Loader2 className="h-8 w-8 animate-spin text-[#FF9900]" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Role</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12 font-sans px-4 mt-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/users/roles" className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors bg-white dark:bg-slate-900 shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <AlertOctagon className="h-5 w-5 text-red-500" />
                        Delete Role
                    </h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    {error ? (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold text-center">
                            {error}
                            <div className="mt-4">
                                <Link href="/admin/users/roles" className="inline-block px-6 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/20 rounded shadow-sm hover:bg-red-50 dark:hover:bg-slate-700 transition">
                                    Go Back
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center py-6">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="h-8 w-8 text-red-500" strokeWidth={1.5} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Are you sure?</h2>
                            <p className="text-gray-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
                                You are about to permanently delete the role <strong className="text-gray-900 dark:text-white">"{role?.name}"</strong>. This action cannot be undone and may affect users currently assigned to this role.
                            </p>
                            
                            <div className="flex items-center gap-3 w-full max-w-sm">
                                <Link href="/admin/users/roles" className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors text-center">
                                    Cancel
                                </Link>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-500/50 rounded transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
