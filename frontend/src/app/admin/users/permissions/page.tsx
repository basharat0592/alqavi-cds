'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, RefreshCw, Key, ShieldCheck, ChevronRight
} from 'lucide-react';
import { permissionService } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - ACCESS CONTROL
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] whitespace-nowrap ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

export default function PermissionsPage() {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await permissionService.getAll();
            setPermissions(data || []);
        } catch (err) {
            console.error('Failed to load permissions', err);
            toast.error('Failed to sync registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading && permissions.length === 0) return <PageLoader />;

    const filtered = permissions.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) || 
        p.code?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111] text-left">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-3 sm:px-6">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <Link href="/admin/users" className="hover:text-[#c45500] hover:underline">Users</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Access Control</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Access Control</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Granular Permission Protocols</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Btn variant="secondary" onClick={loadData} loading={loading} className="flex-1 sm:flex-initial">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Registry
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 mt-6">
                {/* Search */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1 w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search permission code or description..."
                            className={inputCls + " pl-10 h-[35px]"}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <div className="bg-[#f7f8fa] px-5 py-3 border-b border-[#ddd] flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#e47911]" />
                        <span className="text-[13px] font-bold text-[#111]">Permission Protocol Manifest</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                                <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">Access Segment</th>
                                    <th className="px-2.5 sm:px-6 py-3 whitespace-nowrap">System Code</th>
                                    <th className="hidden sm:table-cell px-6 py-3 whitespace-nowrap">Classification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {loading && filtered.length === 0 ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={3} className="px-2.5 sm:px-6 py-6">
                                                <div className="h-4 bg-slate-100 rounded w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-10 py-24 text-center text-[#565959]">
                                            <Key className="h-10 w-10 text-[#eee] mx-auto mb-3" />
                                            <p className="text-[13px]">No protocol entries discovered.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(p => (
                                        <tr key={p.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                            <td className="px-2.5 sm:px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-[#f0f2f2] border border-[#ddd] rounded-[4px] flex items-center justify-center font-black text-[10px] text-[#565959] group-hover:bg-[#f0c14b] group-hover:text-[#111] transition-all">
                                                        P
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#007185] capitalize leading-none mb-1">
                                                            {p.name.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-[11px] text-[#565959] leading-none">{p.description || "Core system access point"}</p>
                                                        <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                                                            <span className="inline-block px-1.5 py-0.5 rounded-[2px] border border-blue-200 bg-blue-50 text-[#007185] text-[9px] font-bold uppercase tracking-tight">
                                                                {p.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2.5 sm:px-6 py-3.5">
                                                <code className="px-2 py-0.5 bg-slate-100 border border-[#ddd] rounded text-[11px] font-mono text-[#565959] font-bold">
                                                    {p.code}
                                                </code>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-3.5 whitespace-nowrap">
                                                <span className="inline-block px-2 py-0.5 rounded-[2px] border border-blue-200 bg-blue-50 text-[#007185] text-[10px] font-bold uppercase tracking-tight">
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
        </div>
    );
}
