'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Shield, Loader2 } from 'lucide-react';
import { roleService } from '@/lib/api';

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
            setError(err.message || 'Failed to create role.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12 font-sans px-4 mt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/users/roles" className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 transition-colors bg-white dark:bg-slate-900 shadow-sm">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Shield className="h-5 w-5 text-[#EEAF1C]" />
                            Create New Role
                        </h1>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Define platform access privileges</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded text-sm font-bold flex flex-col">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Role Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Content Manager"
                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all text-sm dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                            placeholder="Provide a brief description of what this role entails..."
                            rows={4}
                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded outline-none focus:border-[#EEAF1C] focus:ring-1 focus:ring-[#EEAF1C] transition-all text-sm dark:text-white resize-none"
                        />
                    </div>
                </div>

                <div className="bg-gray-50/50 dark:bg-slate-800/50 p-6 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                    <Link href="/admin/users/roles" className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading || !formData.name.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#EEAF1C] hover:bg-[#EEAF1C] disabled:bg-[#EEAF1C]/50 disabled:cursor-not-allowed text-[#131921] text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Role
                    </button>
                </div>
            </form>
        </div>
    );
}

