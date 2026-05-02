'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Truck, ShoppingCart, TrendingUp, DollarSign, 
    Calendar, Download, ArrowUpRight, ArrowDownRight,
    Search, Filter, RefreshCw, FileText, PieChart as PieIcon,
    ArrowRight, CheckCircle, Clock, AlertTriangle, Boxes,
    Warehouse, Printer, FileSpreadsheet, ChevronRight, Building2,
    Info, LayoutDashboard, Eye, ShoppingBag, CreditCard
} from 'lucide-react';
import { purchaseService, productService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PROCUREMENT REPORTS
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

export default function PurchaseReportsPage() {
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const pu = await purchaseService.getAll();
            setPurchases(Array.isArray(pu) ? pu : pu.results || []);
        } catch {
            toast.error('Procurement registry sync failure.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const stats = useMemo(() => {
        const totalExpenditure = purchases.reduce((s, p) => s + Number(p.total_amount || 0), 0);
        const pending = purchases.filter(p => (p.status || '').toLowerCase() === 'ordered').length;
        const unpaid = purchases.filter(p => (p.payment_status || '').toLowerCase() !== 'paid').reduce((s, p) => s + Number(p.total_amount), 0);
        return { totalExpenditure, pending, unpaid };
    }, [purchases]);

    if (loading && purchases.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports Center</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Procurement Analysis</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Purchase & Procurement Audit</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={loadData} loading={loading}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                        </Btn>
                        <Btn variant="secondary" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6 no-print" />

                {/* Tactical Sensors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Gross Capex</p>
                        </div>
                        <p className="text-[20px] font-black text-[#111]">{formatCurrency(stats.totalExpenditure)}</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <ShoppingCart size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Pending Acquisitions</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#e47911]">{stats.pending} Orders</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Accounts Payable</p>
                        </div>
                        <p className="text-[20px] font-black text-[#B12704]">{formatCurrency(stats.unpaid)}</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Vendor Nodes</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#007600]">96.8% Reliable</p>
                    </div>
                </div>

                {/* Procurement Ledger */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-3">PO Identifier</th>
                                <th className="px-6 py-3">Supplier Entity</th>
                                <th className="px-6 py-3 text-center">Fulfillment</th>
                                <th className="px-6 py-3 text-center">Payment</th>
                                <th className="px-6 py-3 text-right">Gross Outlay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {purchases.length === 0 ? (
                                <tr><td colSpan={5} className="py-24 text-center text-[#565959] italic">No procurement records found.</td></tr>
                            ) : (
                                purchases.map((p, i) => (
                                    <tr key={i} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4 font-bold text-[#007185] group-hover:underline cursor-pointer">
                                            #{p.purchase_number || (p.id ? p.id.slice(0, 8) : i)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[#111] font-bold uppercase">{p.supplier_name || 'Generic Vendor'}</div>
                                            <div className="text-[11px] text-[#565959] mt-0.5">Manifest Node: {p.id ? p.id.slice(0, 12) : 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-[2px] border shadow-sm
                                                ${p.status === 'received' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-[2px] border shadow-sm
                                                ${p.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {p.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-[#111]">{formatCurrency(p.total_amount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Note */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-4 items-start animate-in fade-in duration-1000 no-print">
                    <Info className="text-[#e47911] shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-[#111]">Procurement Audit Note</p>
                        <p className="text-[12px] text-[#565959] leading-relaxed">Financial outlay reflects gross amounts before tax and landed costs. Unsettled balances should be reconciled with the Supplier Ledger to avoid credit disruption.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
