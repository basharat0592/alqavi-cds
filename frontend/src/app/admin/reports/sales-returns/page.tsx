'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    RotateCcw, TrendingUp, Search, Calendar, Download, Filter, 
    Printer, ArrowRight, CheckCircle, Clock, ShoppingCart, 
    Package, RefreshCw, Layers, AlertTriangle, TrendingDown,
    ChevronRight, ChevronLeft, LayoutDashboard, Eye, Info
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SALES & RETURNS REPORTS
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

export default function SaleReturnsReportPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports Center</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Returns Analysis</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Sales vs Returns Performance</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => toast.success('Manifest Exported')}>
                            <Download size={14} /> Export Manifest
                        </Btn>
                        <Btn variant="secondary" onClick={() => window.print()}>
                            <Printer size={14} /> Print
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6 no-print" />

                {/* Tactical Sensors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Gross Sales', value: 'Rs. 5.1M', icon: ShoppingCart, trend: '+12.4%' },
                        { label: 'Net Returns', value: 'Rs. 420,500', icon: RotateCcw, trend: '-2.1%' },
                        { label: 'Return Frequency', value: '4.2%', icon: RefreshCw, trend: '+0.5%' },
                        { label: 'Realized Revenue', value: 'Rs. 4.68M', icon: TrendingUp, trend: '+14.1%' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <stat.icon size={14} className="text-[#565959]" />
                                    <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">{stat.label}</p>
                                </div>
                                <span className={`text-[10px] font-black ${stat.trend.startsWith('+') ? 'text-[#007600]' : 'text-[#B12704]'}`}>{stat.trend}</span>
                            </div>
                            <p className="text-[20px] font-normal text-[#111]">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Recent Returns Table */}
                    <div className="lg:col-span-2 bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                        <div className="px-5 py-3 bg-[#f7f8fa] border-b border-[#ddd]">
                            <h3 className="text-[14px] font-bold text-[#111]">Recent Returns Registry</h3>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                    <th className="px-6 py-3">Return ID</th>
                                    <th className="px-6 py-3">Orig. Order</th>
                                    <th className="px-6 py-3">Customer Identity</th>
                                    <th className="px-6 py-3 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eee]">
                                {[
                                    { id: 'RET-2291', o: 'SO-8172', name: 'Al-Noor Cosmetics', s: 'Reconciled', date: '2026-04-02', v: 'Rs. 12,500' },
                                    { id: 'RET-2290', o: 'SO-8152', name: 'The Glow Mart', s: 'Pending', date: '2026-04-01', v: 'Rs. 4,200' },
                                    { id: 'RET-2289', o: 'SO-8022', name: 'Walk-in Retail', s: 'Reconciled', date: '2026-03-31', v: 'Rs. 1,500' },
                                ].map((ret, i) => (
                                    <tr key={i} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4 font-bold text-[#007185] group-hover:underline cursor-pointer">{ret.id}</td>
                                        <td className="px-6 py-4 text-[#565959] font-medium">{ret.o}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-[#111] font-bold uppercase">{ret.name}</div>
                                            <span className={`text-[10px] font-black uppercase ${ret.s === 'Reconciled' ? 'text-[#007600]' : 'text-[#e47911]'}`}>{ret.s}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-[#B12704] font-bold">{ret.v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Reason Analysis */}
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-6 shadow-sm">
                        <h3 className="text-[14px] font-bold text-[#111] mb-5 pb-2 border-b border-[#eee]">Return Reason Matrix</h3>
                        <div className="space-y-4">
                            {[
                                { l: 'Quality Issue', v: '45%', p: 45, c: 'bg-[#B12704]' },
                                { l: 'Freight Damage', v: '28%', p: 28, c: 'bg-[#e47911]' },
                                { l: 'Wrong Product', v: '15%', p: 15, c: 'bg-[#007185]' },
                                { l: 'Others', v: '12%', p: 12, c: 'bg-[#565959]' },
                            ].map((h, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[12px] font-medium text-[#111] mb-1">
                                        <span>{h.l}</span>
                                        <span>{h.v}</span>
                                    </div>
                                    <div className="w-full h-1 bg-[#f0f2f2] rounded-full overflow-hidden">
                                        <div className={`h-full ${h.c}`} style={{ width: `${h.p}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footnote */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-3 animate-in fade-in duration-1000 no-print">
                    <Info className="text-[#e47911] shrink-0 mt-0.5" size={16} />
                    <p className="text-[12px] text-[#565959] leading-relaxed font-medium">Realized revenue accounts for all returns processed. 'Quality Issues' above 20% should be escalated to the Procurement and QC department immediately.</p>
                </div>
            </div>
        </div>
    );
}
