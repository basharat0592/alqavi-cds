"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, RefreshCw,
    ArrowRightLeft, History, Download,
    Package, MapPin
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';

const StatusPill = ({ type }: { type: string }) => {
    const text = type || 'Unknown';
    let tone: 'neutral' | 'indigo' | 'green' | 'amber' | 'red' | 'blue' = 'neutral';

    if (text === 'Purchase' || text === 'Stock In') tone = 'green';
    else if (text === 'Sale' || text === 'Stock Out') tone = 'red';
    else if (text.includes('Transfer')) tone = 'blue';
    else if (text === 'Adjustment') tone = 'amber';
    else if (text === 'Return') tone = 'indigo';

    return <Badge tone={tone}>{text}</Badge>;
};

export default function StockMovementsPage() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'arrivals' | 'warehouse'>('all');

    const loadData = async () => {
        setLoading(true);
        try {
            const [movData, whData] = await Promise.all([
                inventoryService.getMovements(),
                inventoryService.getWarehouses()
            ]);
            setMovements(movData || []);
            setWarehouses(whData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = movements.filter(m => {
        const matchesSearch =
            (m.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        let matchesType = !filterType || m.movement_type === filterType;
        if (activeTab === 'arrivals') {
            matchesType = m.movement_type === 'Purchase' || m.movement_type === 'Stock In' || m.quantity > 0;
        }

        const matchesWarehouse = !selectedWarehouse || String(m.warehouse) === String(selectedWarehouse);
        return matchesSearch && matchesType && matchesWarehouse;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-6 mt-6 font-sans text-left">

            {/* ── Page Header ── */}
            <PageHeader
                title="Stock Movements"
                subtitle="Detailed history of all stock entries, transfers, and sales."
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Stock Movements' }]}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={loadData}>
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Ledger
                        </Button>
                        <Button variant="primary" size="sm">
                            <Download className="h-3.5 w-3.5" />
                            Export Data
                        </Button>
                    </>
                }
            />

            {/* ── Tabs ── */}
            <div className="flex items-center gap-8 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'all', label: 'All Movements', icon: History },
                    { id: 'arrivals', label: 'Recent Arrivals (Stock In)', icon: Package },
                    { id: 'warehouse', label: 'Warehouse Transfers', icon: ArrowRightLeft },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600 rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* ── Filters Bar ── */}
            <Card className="p-5 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by product, SKU, or reference ID..."
                            className={`${ui.inputBase} pl-10`}
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className={`${ui.inputBase} cursor-pointer font-semibold`}
                    >
                        <option value="">All Movement Types</option>
                        <option value="Purchase">Purchase (Stock In)</option>
                        <option value="Sale">Sale (Stock Out)</option>
                        <option value="Transfer In">Transfer In</option>
                        <option value="Transfer Out">Transfer Out</option>
                        <option value="Adjustment">Manual Adjustment</option>
                        <option value="Return">Customer Return</option>
                    </select>
                    <select
                        value={selectedWarehouse}
                        onChange={e => setSelectedWarehouse(e.target.value)}
                        className={`${ui.inputBase} cursor-pointer font-semibold`}
                    >
                        <option value="">All Warehouses</option>
                        {warehouses.map(wh => (
                            <option key={wh.id} value={wh.id}>{wh.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* ── Table ── */}
            <Card className="overflow-hidden animate-in fade-in duration-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="px-6 py-4 whitespace-nowrap">Date & Time</th>
                                <th className="px-6 py-4 whitespace-nowrap">Reference No.</th>
                                <th className="px-6 py-4 whitespace-nowrap">Category</th>
                                <th className="px-6 py-4 whitespace-nowrap">Product Details</th>
                                <th className="px-6 py-4 whitespace-nowrap text-right">Quantity Change</th>
                                <th className="px-6 py-4 whitespace-nowrap">Target Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && filtered.length === 0 ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5">
                                            <div className="h-4 bg-slate-100 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <History size={48} className="text-slate-200 mx-auto mb-4" />
                                        <p className="text-[15px] font-bold text-slate-900">No Movement History Found</p>
                                        <p className="text-[13px] text-slate-600 mt-1">Try adjusting your filters or search term to discover records.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-[13px] font-bold text-slate-900">
                                                {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase mt-0.5 tracking-tighter">
                                                {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-indigo-600 uppercase tracking-wider">#{m.reference_id || 'ADJ-' + m.id}</span>
                                                <div className="mt-1"><StatusPill type={m.movement_type} /></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{m.category_name || 'GENERAL'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 group-hover:border-indigo-400 transition-colors">
                                                    {m.product_image ? (
                                                        <img src={m.product_image} alt="" className="w-full h-full object-contain p-1" />
                                                    ) : <Package className="h-4 w-4 text-slate-300" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-bold text-slate-900 truncate max-w-[200px]">{m.product_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Stock Event Recorded</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-[16px] font-black tabular-nums ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">UNITS</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500/20 animate-pulse" />
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-slate-900">{m.warehouse_name || 'Central Hub'}</span>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                                                        <MapPin size={10} className="text-slate-300" />
                                                        Verified Storage
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
}

