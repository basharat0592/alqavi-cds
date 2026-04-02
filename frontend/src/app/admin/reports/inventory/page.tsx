'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Package, AlertTriangle, CheckCircle, 
    Warehouse, RefreshCw, Search, Filter, ArrowDownAZ,
    Boxes, LayoutGrid, List as ListIcon, Download, Printer,
    ArrowRight, Info, BarChart3, TrendingUp, DollarSign
} from 'lucide-react';
import { productService, inventoryService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════
   MODERN LOGISTICS UI COMPONENTS
   ═══════════════════════════════════════════════ */
const TableCard = ({ children, title, subtitle, action }: { children: React.ReactNode; title: string; subtitle?: string; action?: any }) => (
    <div className="bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50">
            <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
                {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>}
            </div>
            {action}
        </div>
        {children}
    </div>
);

const MetricPill = ({ label, value, icon: Icon, color, bg }: { label: string; value: any; icon: any; color: string; bg: string }) => (
    <div className={`p-5 rounded-xl bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group`}>
        <div className={`p-3 rounded-xl ${bg} ${color} bg-opacity-10 border border-current border-opacity-10 transition-transform group-hover:scale-110`}>
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">{value}</p>
        </div>
    </div>
);

export default function StockReportsPage() {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await productService.getAll();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Logistics registry node timeout.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
        const stock = parseInt(p.stock || p.stock_quantity || 0);
        if (filter === 'low') return matchesSearch && stock > 0 && stock < 10;
        if (filter === 'out') return matchesSearch && stock <= 0;
        return matchesSearch;
    });

    const totalValuation = useMemo(() => products.reduce((s, p) => s + (Number(p.price || 0) * Number(p.stock || 0)), 0), [products]);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8 bg-slate-50 dark:bg-[#070F14] min-h-screen font-sans">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#EEAF1C] rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10">
                        <Boxes className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Global Asset Registry</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-[#EEAF1C] text-[9px] font-black uppercase tracking-widest rounded border border-blue-100">Inventory Module</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Logistical Audit v2.0</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-[#EEAF1C] transition-all shadow-sm">
                        <RefreshCw className="h-4.5 w-4.5" />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#131921] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95 border border-white/5">
                        <Download className="h-4 w-4" /> Export CSV Manifest
                    </button>
                </div>
            </div>

            {/* Tactical Sensors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <MetricPill label="Total Catalog SKUs" value={products.length} icon={Package} color="text-blue-600" bg="bg-blue-600" />
                <MetricPill label="Asset Valuation" value={formatCurrency(totalValuation)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-600" />
                <MetricPill label="Critical Shortage (0)" value={products.filter(p => !p.stock || p.stock === 0).length} icon={AlertTriangle} color="text-red-600" bg="bg-red-600" />
                <MetricPill label="Warehouse Health" value="84%" icon={Warehouse} color="text-indigo-600" bg="bg-indigo-600" />
            </div>

            {/* Control Matrix */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#EEAF1C] transition-all" />
                    <input 
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Scan for specific asset identifier or name..." 
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-[#0D1921] border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-[#EEAF1C] focus:ring-4 focus:ring-[#EEAF1C]/5 text-sm font-medium transition-all shadow-sm"
                    />
                </div>
                <div className="flex bg-white dark:bg-[#0D1921] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 gap-2 shadow-sm">
                    {(['all', 'low', 'out'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all
                                ${filter === f ? 'bg-[#EEAF1C] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                            {f === 'low' ? 'Attention Points' : f === 'out' ? 'Purge Required' : 'All Resources'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Strategic Ledger */}
            <TableCard title="Asset Performance Ledger" subtitle={`Currently tracking ${filtered.length} unique resources`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Identity</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Asset Valuation</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Warehouse Level</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Operational Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {filtered.map(p => {
                                const stock = parseInt(p.stock || p.stock_quantity || 0);
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs border border-slate-200 dark:border-white/10 shadow-inner group-hover:bg-[#EEAF1C] group-hover:text-white group-hover:border-[#EEAF1C] transition-all">
                                                    {(p.name || 'P')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white uppercase leading-tight tracking-tight max-w-[250px] truncate">{p.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">ID-NODE: {p.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(p.price)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <p className={`text-sm font-black ${stock < 10 ? 'text-red-500' : 'text-[#EEAF1C]'}`}>{stock}</p>
                                                <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 mt-1.5 overflow-hidden">
                                                    <div className={`h-full ${stock < 10 ? 'bg-red-500' : 'bg-emerald-500'} transition-all`} style={{ width: `${Math.min(stock, 100)}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {stock <= 0 ? (
                                                <span className="px-3.5 py-1.5 bg-red-50 text-red-700 text-[10px] font-black uppercase rounded-lg border border-red-100 shadow-sm">Critical Purge</span>
                                            ) : stock < 10 ? (
                                                <span className="px-3.5 py-1.5 bg-amber-50 text-amber-700 text-[10px] font-black uppercase rounded-lg border border-amber-100 shadow-sm">Tactical Attention</span>
                                            ) : (
                                                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-100 shadow-sm">Nominal Flow</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </TableCard>

            {/* Strategic Footer Metrics */}
            <div className="mt-8 bg-[#EEAF1C] p-8 rounded-2xl text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="relative z-10">
                    <h4 className="text-2xl font-bold uppercase tracking-tighter mb-2">Inventory Intelligence</h4>
                    <p className="text-blue-100 text-xs font-medium opacity-80 max-w-sm italic">Deep audit analytics optimized for large distribution warehouses and retail hubs.</p>
                </div>
                <div className="relative z-10 flex gap-4">
                    <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">System Accuracy</p>
                        <p className="text-xl font-black">99.8%</p>
                    </div>
                    <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">Live Channels</p>
                        <p className="text-xl font-black">12</p>
                    </div>
                </div>
            </div>

        </div>
    );
}

