"use client";

import React, { useEffect, useState } from 'react';
import {
    Search, RefreshCw, ShoppingCart, Truck, 
    ArrowRightLeft, History, Download, ChevronLeft,
    Package, Calendar, MapPin
} from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency } from '@/lib/utils';

const StatusPill = ({ type }: { type: string }) => {
    let bg = 'bg-slate-100 text-slate-600 border-slate-200';
    const text = type || 'Unknown';

    if (text === 'Purchase' || text === 'Stock In') bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (text === 'Sale' || text === 'Stock Out') bg = 'bg-red-50 text-red-700 border-red-200';
    else if (text.includes('Transfer')) bg = 'bg-blue-50 text-blue-700 border-blue-200';
    else if (text === 'Adjustment') bg = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (text === 'Return') bg = 'bg-purple-50 text-purple-700 border-purple-200';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${bg}`}>
            <span className={`w-1 h-1 rounded-full ${bg.replace('bg-', 'bg-').replace('text-', 'bg-')}`} />
            {text}
        </span>
    );
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-[24px] font-bold text-[#0f1111] tracking-tight">Inventory Movements</h1>
                    <p className="text-[13px] text-[#565959] mt-0.5">Detailed history of all stock entries, transfers, and sales.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="h-[31px] px-4 rounded-[3px] border border-[#adb1b8] bg-white hover:bg-[#f7f8fa] text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Ledger
                    </button>
                    <button className="h-[31px] px-4 rounded-[3px] border border-[#a88734] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] hover:from-[#f5d78e] hover:to-[#eeb933] text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm">
                        <Download className="h-3.5 w-3.5" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-8 border-b border-[#ddd] mb-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'all', label: 'All Movements', icon: History },
                    { id: 'arrivals', label: 'Recent Arrivals (Stock In)', icon: Package },
                    { id: 'warehouse', label: 'Warehouse Transfers', icon: ArrowRightLeft },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-[14px] font-bold whitespace-nowrap transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-[#c45500]' : 'text-[#565959] hover:text-[#0f1111]'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#c45500] rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* ── Filters Bar ── */}
            <div className="bg-white border border-[#ddd] rounded-[4px] p-5 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888c8e]" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by product, SKU, or reference ID..."
                            className="w-full h-[35px] pl-10 pr-4 py-2 text-[13px] border border-[#888c8e] rounded-[3px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] transition-all"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="h-[35px] px-3 text-[13px] border border-[#888c8e] rounded-[3px] outline-none focus:border-[#e77600] bg-white cursor-pointer font-bold"
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
                        className="h-[35px] px-3 text-[13px] border border-[#888c8e] rounded-[3px] outline-none focus:border-[#e77600] bg-white cursor-pointer font-bold"
                    >
                        <option value="">All Warehouses</option>
                        {warehouses.map(wh => (
                            <option key={wh.id} value={wh.id}>{wh.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white border border-[#ddd] rounded-[4px] overflow-hidden shadow-sm animate-in fade-in duration-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-widest">Date & Time</th>
                                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-widest">Reference No.</th>
                                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-widest">Product Details</th>
                                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-widest text-right">Quantity Change</th>
                                <th className="px-6 py-4 whitespace-nowrap uppercase tracking-widest">Target Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
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
                                        <History size={48} className="text-[#ddd] mx-auto mb-4" />
                                        <p className="text-[15px] font-bold text-[#0f1111]">No Movement History Found</p>
                                        <p className="text-[13px] text-[#565959] mt-1">Try adjusting your filters or search term to discover records.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m) => (
                                    <tr key={m.id} className="hover:bg-[#fcfdff] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-[13px] font-bold text-[#0f1111]">
                                                {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-[#565959] font-black uppercase mt-0.5 tracking-tighter">
                                                {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-[#007185] uppercase tracking-wider">#{m.reference_id || 'ADJ-' + m.id}</span>
                                                <div className="mt-1"><StatusPill type={m.movement_type} /></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-black text-[#565959] uppercase tracking-widest">{m.category_name || 'GENERAL'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-white border border-[#eee] rounded flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#e77600] transition-colors">
                                                    {m.product_image ? (
                                                        <img src={m.product_image} alt="" className="w-full h-full object-contain p-1" />
                                                    ) : <Package className="h-4 w-4 text-slate-200" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-bold text-[#0f1111] truncate max-w-[200px]">{m.product_name}</p>
                                                    <p className="text-[10px] text-[#565959] font-bold uppercase mt-0.5">Stock Event Recorded</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-[16px] font-black ${m.quantity > 0 ? 'text-[#007600]' : 'text-[#B12704]'}`}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-[#565959] font-bold uppercase tracking-tighter">UNITS</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#007185]/20 animate-pulse" />
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-[#0f1111]">{m.warehouse_name || 'Central Hub'}</span>
                                                    <div className="flex items-center gap-1 text-[10px] text-[#565959] font-medium uppercase tracking-tight">
                                                        <MapPin size={10} className="text-[#adb1b8]" />
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
            </div>

        </div>
    );
}

