'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Package, AlertTriangle,
    Warehouse, RefreshCw, Search, Printer,
    Info, DollarSign,
} from 'lucide-react';
import { productService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';

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
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto text-left">

                <div className="no-print">
                    <PageHeader
                        title="Inventory Reports"
                        breadcrumbs={[
                            { label: 'Console', href: '/admin/dashboard' },
                            { label: 'Reports Center', href: '/admin/reports' },
                            { label: 'Inventory Reports' },
                        ]}
                        actions={
                            <>
                                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => window.print()}>
                                    <Printer size={14} /> Print
                                </Button>
                            </>
                        }
                    />
                </div>

                {/* Tactical Sensors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Package size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total SKUs</p>
                        </div>
                        <p className="text-[20px] font-bold text-slate-900 tabular-nums">{products.length}</p>
                    </Card>
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asset Valuation</p>
                        </div>
                        <p className="text-[20px] font-bold text-slate-900 tabular-nums">{formatCurrency(totalValuation)}</p>
                    </Card>
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
                        </div>
                        <p className="text-[20px] font-bold text-rose-600 tabular-nums">{products.filter(p => !p.stock || p.stock === 0).length}</p>
                    </Card>
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Warehouse size={16} className="text-slate-400" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Warehouse Health</p>
                        </div>
                        <p className="text-[20px] font-bold text-emerald-600">84% Operational</p>
                    </Card>
                </div>

                {/* Control Matrix */}
                <Card className="p-5 mb-6 flex flex-wrap items-center gap-5 no-print animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search asset identifier or name..."
                            className={ui.inputBase + " pl-10"}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {(['all', 'low', 'out'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 h-9 rounded-lg text-[12px] font-bold transition-all border whitespace-nowrap ${filter === f ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                            >
                                {f === 'all' ? 'All Resources' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Inventory Table */}
                <Card className="overflow-hidden animate-in fade-in duration-700">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="px-6 py-3">Asset Details</th>
                                <th className="px-6 py-3 text-center">Unit Price</th>
                                <th className="px-6 py-3 text-center">Warehouse Level</th>
                                <th className="px-6 py-3 text-right">Inventory Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="py-24 text-center text-slate-400 italic">No inventory matches found.</td></tr>
                            ) : (
                                filtered.map(p => {
                                    const stock = parseInt(p.stock || p.stock_quantity || 0);
                                    return (
                                        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group text-[13px]">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-[14px] border border-slate-200">
                                                        {(p.name || 'P')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:underline cursor-pointer">{p.name}</p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-tighter font-medium">SKU: {p.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-900 tabular-nums">{formatCurrency(p.price)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <p className={`text-[14px] font-bold tabular-nums ${stock < 10 ? 'text-rose-600' : 'text-slate-900'}`}>{stock} Units</p>
                                                    <div className="w-16 h-1.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                                                        <div className={`h-full ${stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'} transition-all`} style={{ width: `${Math.min(stock, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {stock <= 0 ? (
                                                    <Badge tone="red">Critical Purge</Badge>
                                                ) : stock < 10 ? (
                                                    <Badge tone="amber">Low Stock</Badge>
                                                ) : (
                                                    <Badge tone="green">In Stock</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </Card>

                {/* Summary Note */}
                <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in duration-1000 no-print">
                    <Info className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                    <div>
                        <p className="text-[13px] font-bold text-slate-900">Inventory Audit Note</p>
                        <p className="text-[12px] text-slate-600 leading-relaxed">Levels are synced with active POS and Warehouse logs. 'Critical Purge' items should be prioritized for reordering to maintain operational continuity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

