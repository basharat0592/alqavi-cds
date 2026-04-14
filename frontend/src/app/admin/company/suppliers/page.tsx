'use client';

import { useState, useEffect } from 'react';
import { 
    Search, RefreshCw, Phone, Mail, 
    Truck, UserCheck, ShieldCheck
} from 'lucide-react';
import { userService } from '@/services/user.service';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const LABEL = "block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch users with role 'Supplier'
            const data = await userService.getAll({ role_name: 'Supplier' });
            // The data structure from list_users is {results: [], count: 0} if using Drf, 
            // but userService.getAll handles both array and results object
            setSuppliers(data || []);
        } catch (err) {
            console.error('Failed to load suppliers', err);
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading && suppliers.length === 0) return <PageLoader />;

    const filtered = suppliers.filter(s => {
        const text = `${s.first_name} ${s.last_name} ${s.email} ${s.phone}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    return (
        <div className="max-w-[1200px] mx-auto pb-20 px-4 mt-4 font-sans">
            
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                    <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">External Suppliers</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered via User Portal</p>
                </div>
            </div>

            {/* SUPPLIERS LIST */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search registered suppliers..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#F59E0B] transition-all font-medium"
                        />
                    </div>
                    <button onClick={loadData} className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 p-2.5 rounded-lg text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <SectionCard className="border-none shadow-none">
                    <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Supplier / User</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Email Address</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Contact</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest border-r border-slate-200 dark:border-white/10">Status</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 whitespace-nowrap uppercase tracking-widest">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#1a252f]">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <Truck className="h-12 w-12 text-slate-400" />
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No registered suppliers found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-[#F59E0B]">
                                                        {s.first_name?.[0] || s.username?.[0] || '?'}{s.last_name?.[0] || ''}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{(s.first_name || s.last_name) ? `${s.first_name || ''} ${s.last_name || ''}` : s.username}</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">@{s.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs font-medium">{s.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs font-medium">{s.phone || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-r border-slate-100 dark:border-white/5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                    s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 text-blue-500 font-bold text-[9px] uppercase tracking-widest">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    System Verified
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
