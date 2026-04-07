'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    FileText, Search, Plus, Printer, Eye, 
    Download, Filter, RefreshCw, ShoppingCart,
    User, Calendar, DollarSign, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';
import { orderService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ══════════════════════════════════════════════
   DESIGN SYSTEM
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, subtitle }: { title: string; icon: any; subtitle?: string }) => (
    <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Icon className="h-4 w-4 text-[#EEAF1C]" />
            </div>
            <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</span>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    </div>
);

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    'delivered': { label: 'Settled', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'processing': { label: 'Pending', cls: 'bg-blue-100 text-[#EEAF1C] border-blue-200' },
    'pending': { label: 'Due', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    'cancelled': { label: 'Void', cls: 'bg-red-100 text-red-700 border-red-200' },
};

export default function InvoicesPage() {
    const router = useRouter();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const loadInvoices = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAll();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Failed to sync invoice registry.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadInvoices(); }, []);

    const filtered = invoices.filter(inv => {
        const query = search.toLowerCase();
        const matchesSearch = 
            (inv.order_number || inv.id).toLowerCase().includes(query) ||
            (inv.customer_name || inv.guest_name || '').toLowerCase().includes(query);
        const matchesStatus = filterStatus === 'all' || inv.status?.toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1500px] mx-auto px-4 py-8 font-sans">
            
            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#EEAF1C] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Billing Registry</h1>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Financial Invoices & Ledger</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadInvoices} className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a252f] text-slate-500 hover:text-[#EEAF1C] transition-all">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => router.push('/admin/sale')} 
                        className="bg-[#EEAF1C] hover:bg-blue-700 text-white flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> New Invoice
                    </button>
                </div>
            </div>

            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Invoices', val: invoices.length, icon: FileText, color: 'text-blue-600' },
                    { label: 'Settled', val: invoices.filter(i => i.status === 'delivered').length, icon: CheckCircle2, color: 'text-emerald-600' },
                    { label: 'Pending', val: invoices.filter(i => i.status === 'processing').length, icon: Clock, color: 'text-amber-600' },
                    { label: 'Total Value', val: formatCurrency(invoices.reduce((s, i) => s + Number(i.total_amount), 0)), icon: DollarSign, color: 'text-indigo-600' },
                ].map((stat, i) => (
                    <SectionCard key={i} className="p-4 flex items-center gap-4 border-l-4 border-l-[#EEAF1C]">
                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl">
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{stat.val}</p>
                        </div>
                    </SectionCard>
                ))}
            </div>

            {/* ── Search & Filter ── */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#EEAF1C] transition-colors" />
                    <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by invoice # or customer name..."
                        className="w-full bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/10 transition-all placeholder:text-slate-400"
                    />
                </div>
                <div className="flex bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 gap-1">
                    {['all', 'delivered', 'processing', 'pending'].map(s => (
                        <button 
                            key={s} 
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all
                                ${filterStatus === s ? 'bg-white dark:bg-[#1a252f] text-[#EEAF1C] shadow-sm shadow-black/5 ring-1 ring-slate-200 dark:ring-white/10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {s === 'delivered' ? 'Settled' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Invoice Table ── */}
            <SectionCard>
                <SectionHeader title="Financial Registry" icon={ShoppingCart} subtitle="Historical billing records" />
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Document #</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Customer Entity</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Issue Date</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Net Ammount</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <AlertCircle className="h-12 w-12 text-slate-200 dark:text-white/10 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-500">No matching invoice records found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-[#EEAF1C] uppercase px-2 py-1 bg-blue-50 dark:bg-blue-900/10 rounded">
                                                #{inv.order_number || inv.id.slice(0, 8)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-inner">
                                                    {(inv.customer_name || inv.guest_name || 'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">{inv.customer_name || inv.guest_name || 'Walk-in Guest'}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{inv.payment_method || 'Standard'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Calendar className="h-3 w-3" />
                                                <span className="text-[11px] font-bold uppercase">{formatDate(inv.created_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(inv.total_amount)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                const s = STATUS_MAP[inv.status?.toLowerCase()] || { label: inv.status, cls: 'bg-slate-100 text-slate-600' };
                                                return (
                                                    <span className={`inline-block px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${s.cls}`}>
                                                        {s.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5 translate-x-2 group-hover:translate-x-0 transition-transform">
                                                <button 
                                                    onClick={() => router.push(`/admin/sales/${inv.id}/invoice`)}
                                                    className="p-2 text-slate-400 hover:text-[#EEAF1C] hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all" 
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-all" title="Print Invoice">
                                                    <Printer className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl transition-all" title="Download PDF">
                                                    <Download className="h-4 w-4" />
                                                </button>
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
    );
}

