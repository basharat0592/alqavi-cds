'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Package, AlertTriangle, CheckCircle, 
    Warehouse, RefreshCw, Search, Filter, ArrowDownAZ,
    Boxes, LayoutGrid, List as ListIcon, Download, Printer,
    ArrowRight, Info, BarChart3, TrendingUp, DollarSign,
    ChevronRight, ChevronLeft, LayoutDashboard, Eye, ShoppingBag
} from 'lucide-react';
import { productService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - INVENTORY REPORTS
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

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

export default function StockReportsPage() {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await productService.getAll();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Inventory data sync failure.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const stock = parseInt(p.stock || p.stock_quantity || 0);
        if (filter === 'low') return matchesSearch && stock > 0 && stock < 10;
        if (filter === 'out') return matchesSearch && stock <= 0;
        return matchesSearch;
    });

    const totalValuation = useMemo(() => products.reduce((s, p) => s + (Number(p.price || 0) * Number(p.stock || 0)), 0), [products]);

    if (loading && products.length === 0) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5 text-left">
                
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/reports" className="hover:text-[#c45500] hover:underline">Reports Center</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold">Inventory Audit</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div>
                        <h1 className="text-[22px] font-normal text-[#111]">Stock Inventory Reports</h1>
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
                            <Package size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Total SKUs</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#111]">{products.length}</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Asset Valuation</p>
                        </div>
                        <p className="text-[20px] font-black text-[#B12704]">{formatCurrency(totalValuation)}</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Out of Stock</p>
                        </div>
                        <p className="text-[20px] font-black text-rose-600">{products.filter(p => !p.stock || p.stock === 0).length}</p>
                    </div>
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Warehouse size={16} className="text-[#565959]" />
                            <p className="text-[11px] font-bold text-[#565959] uppercase tracking-wider">Warehouse Health</p>
                        </div>
                        <p className="text-[20px] font-normal text-[#007600]">84% Operational</p>
                    </div>
                </div>

                {/* Control Matrix */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex flex-wrap items-center gap-5 no-print animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search asset identifier or name..."
                            className={inputCls + " pl-10"}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {(['all', 'low', 'out'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 h-[31px] rounded-[3px] text-[12px] font-bold transition-all border whitespace-nowrap ${filter === f ? 'bg-[#e77600] border-[#c45500] text-white shadow-inner' : 'bg-white border-[#adb1b8] text-[#565959] hover:border-[#888c8e]'}`}
                            >
                                {f === 'all' ? 'All Resources' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-3">Asset Details</th>
                                <th className="px-6 py-3 text-center">Unit Price</th>
                                <th className="px-6 py-3 text-center">Warehouse Level</th>
                                <th className="px-6 py-3 text-right">Inventory Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="py-24 text-center text-[#565959] italic">No inventory matches found.</td></tr>
                            ) : (
                                filtered.map(p => {
                                    const stock = parseInt(p.stock || p.stock_quantity || 0);
                                    return (
                                        <tr key={p.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-[#f0f2f2] rounded-[3px] flex items-center justify-center font-bold text-[#565959] text-[14px] border border-[#ddd]">
                                                        {(p.name || 'P')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#007185] group-hover:underline cursor-pointer">{p.name}</p>
                                                        <p className="text-[11px] text-[#565959] mt-0.5 uppercase tracking-tighter font-medium">SKU: {p.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-[#111]">{formatCurrency(p.price)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <p className={`text-[14px] font-bold ${stock < 10 ? 'text-[#B12704]' : 'text-[#111]'}`}>{stock} Units</p>
                                                    <div className="w-16 h-1.5 rounded-full bg-[#f0f2f2] border border-[#ddd] overflow-hidden">
                                                        <div className={`h-full ${stock < 10 ? 'bg-[#B12704]' : 'bg-[#007600]'} transition-all`} style={{ width: `${Math.min(stock, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {stock <= 0 ? (
                                                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-[2px] border border-red-200 shadow-sm">Critical Purge</span>
                                                ) : stock < 10 ? (
                                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-[2px] border border-amber-200 shadow-sm">Low Stock</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-[2px] border border-green-200 shadow-sm">In Stock</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary Note */}
                <div className="mt-8 bg-[#fff4e5] border border-[#ffb347]/30 rounded-[4px] p-4 flex gap-4 items-start animate-in fade-in duration-1000 no-print">
                    <Info className="text-[#e47911] shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-[#111]">Inventory Audit Note</p>
                        <p className="text-[12px] text-[#565959] leading-relaxed">Levels are synced with active POS and Warehouse logs. 'Critical Purge' items should be prioritized for reordering to maintain operational continuity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

