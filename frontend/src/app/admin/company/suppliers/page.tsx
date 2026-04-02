"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, Plus, Edit, Trash2, Search, 
    RefreshCw, Package, Phone, Mail, 
    MapPin, Globe, CheckCircle, X, 
    AlertCircle, AlertTriangle, Building2, UserCircle, Eye, ShoppingCart,
    MoreHorizontal, ShieldCheck, Activity, Tag
} from 'lucide-react';
import { companyService } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const loadData = async () => {
        setLoading(true);
        try {
            const data = await companyService.getSuppliers();
            setSuppliers(data || []);
        } catch (err) {
            console.error('Failed to load suppliers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filtered = suppliers.filter(s => 
        s.name?.toLowerCase().includes(search.toLowerCase()) || 
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Partner Registry</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage all suppliers and vendor relationships</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] hover:border-[#F7CA00]/40 transition-all font-bold"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Register Partner
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 font-bold" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search partner registry..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                    <Users className="h-3.5 w-3.5 text-[#F7CA00]" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                        {suppliers.length} Partners
                    </span>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Supplier Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Contact Info</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-wider">Activity</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {loading && filtered.length === 0 ? (
                                Array(6).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-4 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-20 text-center">
                                        <Users className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No registered partners found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 dark:bg-white/10 text-slate-400 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#F7CA00] group-hover:text-white transition-all">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{s.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border ${s.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                            {s.is_active ? 'Verified' : 'Suspended'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID #{String(s.id).slice(-4)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                                    <Mail className="h-3 w-3 text-slate-300" /> {s.email || 'no-email@partner.com'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                                                    <MapPin className="h-3 w-3 text-slate-300" /> {s.city || 'Global Hub'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.product_count || 0} Listed Items</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(s.product_list || []).slice(0, 2).map((p: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-50 dark:bg-white/5 text-[9px] font-semibold text-slate-500 rounded border border-slate-100 dark:border-white/10 uppercase tracking-tight truncate max-w-[100px]">{p}</span>
                                                    ))}
                                                    {(s.product_list?.length > 2) && <span className="text-[9px] text-slate-400 font-bold ml-1">+{s.product_list.length - 2}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => router.push(`/admin/company/suppliers/${s.id}/products`)} 
                                                    className="p-1.5 text-slate-400 hover:text-[#F7CA00] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                                                    title="View Catalog"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => router.push(`/admin/purchases/add?supplier_name=${encodeURIComponent(s.name)}`)} 
                                                    className="p-1.5 text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-md transition-colors border border-[#F7CA00]/10"
                                                    title="Initiate Purchase"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
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
