'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Shield, Search, Lock, AlertTriangle, RefreshCw, Layers, X, Loader2, Key
} from 'lucide-react';
import { permissionService } from '@/lib/api';

export default function PermissionsPage() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await permissionService.getAll();
            setPermissions(data || []);
        } catch (err) {
            console.error('Failed to load permissions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const filtered = permissions.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1200px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900]">
                        <Lock className="h-4 w-4 text-[#FF9900]" strokeWidth={2.5} />
                        <p className="text-xs font-bold uppercase tracking-widest leading-none">{toast}</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Key className="h-5 w-5 text-[#FF9900]" />
                        System Permissions
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Granular access control registry</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 border-b-0 rounded-t p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" strokeWidth={2.5} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search permissions by name, code or category..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded text-sm outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#FF9900] dark:text-white transition-all"
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-b shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                <th className="px-6 py-4">Permission Detail</th>
                                <th className="px-6 py-4">Unique Code</th>
                                <th className="px-6 py-4">Category</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={3} className="px-6 py-8"><div className="h-4 bg-gray-50 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-10 py-24 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100">
                                            <Key className="w-8 h-8 text-gray-200" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">No Permissions Found</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Dynamic system permissions will list here</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id} className="group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-sm font-medium">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-blue-50 border border-blue-100 rounded flex items-center justify-center font-bold text-blue-600 text-[10px]">
                                                    P
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 dark:text-white capitalize">
                                                        {p.name.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5">{p.description}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-gray-600 dark:text-slate-300">
                                                {p.code}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                             <span className="inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                                                {p.category}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
