"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    FileText, Search, Plus, Printer, Eye, 
    Download, RefreshCw, ShoppingCart,
    User, Calendar, DollarSign, CheckCircle2, Clock, AlertCircle, ChevronRight
} from 'lucide-react';
import { orderService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - INVOICES
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[4px] text-[14px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    'delivered': { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'processing': { label: 'Pending', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    'pending': { label: 'Due', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    'cancelled': { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const MetricCard = ({ label, value, icon: Icon, color = "text-[#111]", borderLeft = "#f0c14b" }: any) => (
    <div className="bg-white border border-[#ddd] p-4 rounded-[4px] shadow-sm flex items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[4px] h-full" style={{ backgroundColor: borderLeft }}></div>
        <div className="p-2.5 bg-[#f7f8fa] rounded-[4px]">
            <Icon size={18} className="text-[#565959]" />
        </div>
        <div>
            <p className="text-[11px] font-bold text-[#565959] uppercase mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
    </div>
);

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
        } catch (err) { toast.error('Failed to load invoices'); } finally { setLoading(false); }
    };

    useEffect(() => { loadInvoices(); }, []);

    const filtered = (invoices || []).filter(inv => {
        const query = search.toLowerCase();
        const matchesSearch = 
            (inv.order_number || inv.id || '').toString().toLowerCase().includes(query) ||
            (inv.customer_name || inv.guest_name || '').toLowerCase().includes(query);
        const matchesStatus = filterStatus === 'all' || inv.status?.toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading && invoices.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1440px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Invoices</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Invoices</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">List of all billing records</p>
                        </div>
                        <div className="flex gap-2">
                             <Btn variant="secondary" onClick={loadInvoices} loading={loading}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Btn>
                            <Btn onClick={() => router.push('/admin/sale')}>
                                <Plus size={14} /> New Invoice
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1440px] mx-auto px-6 mt-8 text-left">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard label="Total Invoices" value={invoices.length} icon={FileText} borderLeft="#3498db" />
                    <MetricCard label="Paid" value={invoices.filter(i => i.status === 'delivered').length} icon={CheckCircle2} borderLeft="#067d62" color="text-green-700" />
                    <MetricCard label="Due" value={invoices.filter(i => i.status === 'pending').length} icon={Clock} borderLeft="#e47911" color="text-[#c45500]" />
                    <MetricCard label="Total Value" value={formatCurrency(invoices.reduce((s, i) => s + Number(i.total_amount), 0))} icon={DollarSign} borderLeft="#111" />
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by invoice # or customer..."
                            className={inputCls + " pl-10 h-[38px]"}
                        />
                    </div>
                    <div className="flex bg-[#f3f3f3] p-1 rounded-[4px] border border-[#ddd] gap-1">
                        {['all', 'delivered', 'processing', 'pending'].map(s => (
                            <button 
                                key={s} 
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded-[3px] transition-all
                                    ${filterStatus === s ? 'bg-white text-[#c45500] shadow-sm' : 'text-[#565959] hover:bg-[#eee]'}`}
                            >
                                {s === 'delivered' ? 'Paid' : s === 'all' ? 'All' : s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">Invoice #</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center text-[13px] text-[#565959]">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(inv => (
                                    <tr key={inv.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-[#007185] hover:underline cursor-pointer" onClick={() => router.push(`/admin/sales/${inv.id}/invoice`)}>
                                                #{inv.order_number || (inv.id && inv.id.toString().slice(0, 8))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#111]">{inv.customer_name || inv.guest_name || 'Walk-in'}</div>
                                            <div className="text-[11px] text-[#aaa] mt-1">{inv.payment_method || 'Internal'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-[#565959]">
                                            <div className="flex items-center gap-1.5 uppercase font-bold text-[11px]">
                                                <Calendar size={12} className="opacity-40" /> {formatDate(inv.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-[#111]">
                                            {formatCurrency(inv.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                const s = STATUS_MAP[inv.status?.toLowerCase()] || { label: inv.status, cls: 'bg-white text-[#565959]' };
                                                return (
                                                    <span className={`inline-block px-3 py-1 rounded-[3px] text-[11px] font-bold border ${s.cls}`}>
                                                        {s.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => router.push(`/admin/sales/${inv.id}/invoice`)}
                                                    className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]" 
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-blue-600">
                                                    <Printer size={14} />
                                                </button>
                                                <button className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-green-600">
                                                    <Download size={14} />
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
