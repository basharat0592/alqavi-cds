"use client";

import React, { useEffect, useState } from 'react';
import { 
    Search, Filter, History, ArrowUpRight, ArrowDownRight, 
    ArrowRightLeft, ShoppingCart, Truck, RefreshCw, Warehouse,
    Download, Calendar, User, Boxes, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';

export default function StockMovementsPage() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [warehouses, setWarehouses] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [movData, whData] = await Promise.all([
                    inventoryService.getMovements(),
                    inventoryService.getWarehouses()
                ]);
                setMovements(movData);
                setWarehouses(whData);
            } catch (error) {
                console.error("Failed to load movements", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'Purchase': return { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', arrow: ArrowUpRight };
            case 'Sale': return { icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', arrow: ArrowDownRight };
            case 'Transfer In': return { icon: ArrowRightLeft, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', arrow: ArrowUpRight };
            case 'Transfer Out': return { icon: ArrowRightLeft, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', arrow: ArrowDownRight };
            case 'Adjustment': return { icon: RefreshCw, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', arrow: ArrowRightLeft };
            case 'Return': return { icon: History, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', arrow: ArrowUpRight };
            default: return { icon: History, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-slate-800', arrow: ArrowRightLeft };
        }
    };

    const filtered = movements.filter(m => {
        const matchesSearch = 
            (m.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = !filterType || m.movement_type === filterType;
        const matchesWarehouse = !selectedWarehouse || String(m.warehouse) === String(selectedWarehouse);
        return matchesSearch && matchesType && matchesWarehouse;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <History className="h-5 w-5 text-[#E68A00]" />
                        Movement History
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Real-time ledger of all inventory transactions and warehouse activities</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded shadow-sm text-xs font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                    <Link 
                        href="/admin/inventory/movements/add"
                        style={{ backgroundColor: '#E68A00' }}
                        className="text-white px-6 py-2 rounded shadow-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-90"
                    >
                        <RefreshCw className="w-4 h-4" /> Log Movement
                    </Link>
                    <button onClick={() => setLoading(true)} className="p-2 border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-400 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricBox label="Today's Ops" value={movements.filter(m => new Date(m.created_at).toDateString() === new Date().toDateString()).length} icon={TrendingUp} color="text-emerald-500" />
                <MetricBox label="Sales Out" value={movements.filter(m => m.movement_type === 'Sale').length} icon={Truck} color="text-blue-500" />
                <MetricBox label="Purchases In" value={movements.filter(m => m.movement_type === 'Purchase').length} icon={ShoppingCart} color="text-indigo-500" />
                <MetricBox label="Total Records" value={movements.length} icon={Boxes} />
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-t p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by Product or Ref ID..."
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded px-10 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e47911] dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none cursor-pointer dark:text-white"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="">All Movement Types</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Sale">Sale</option>
                    <option value="Transfer In">Transfer In</option>
                    <option value="Transfer Out">Transfer Out</option>
                    <option value="Adjustment">Adjustment</option>
                    <option value="Return">Return</option>
                </select>
                <select 
                    className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none cursor-pointer dark:text-white"
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                >
                    <option value="">All Warehouses</option>
                    {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-b shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Transaction Details</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Node / Location</th>
                            <th className="px-6 py-4 text-right">Delta</th>
                            <th className="px-6 py-4 text-right">Balance</th>
                            <th className="px-6 py-4 text-right">Agent / Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse h-20"><td colSpan={6} className="bg-gray-50/20 dark:bg-slate-800/20"></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-24 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No movement records found in this scope.</td></tr>
                        ) : filtered.map((m) => {
                            const config = getTypeConfig(m.movement_type);
                            return (
                                <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#E68A00] transition-colors leading-tight">{m.product_name}</div>
                                        <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold tracking-tight mt-1 flex items-center gap-1.5 uppercase">
                                            <span>Ref: {m.reference_id || 'AUTO'}</span>
                                            {m.notes && (
                                                <>
                                                    <span className="text-gray-300 dark:text-slate-700">•</span>
                                                    <span className="italic normal-case font-medium opacity-60 truncate max-w-[150px]">{m.notes}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase border dark:border-transparent ${config.bg} ${config.color}`}>
                                            <config.icon className="w-3 h-3" />
                                            {m.movement_type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                                            <Warehouse className="w-3.5 h-3.5 text-gray-400 dark:text-slate-600" strokeWidth={2.5} />
                                            {m.warehouse_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-black text-sm flex items-center justify-end gap-1 ${Number(m.quantity) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {Number(m.quantity) >= 0 ? '+' : ''}{m.quantity}
                                            <config.arrow className="w-3.5 h-3.5" strokeWidth={3} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase mb-0.5">Final</div>
                                        <div className="text-sm font-black text-gray-900 dark:text-white">{m.new_quantity}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] text-gray-500 dark:text-slate-400 font-bold flex items-center justify-end gap-1.5 mb-1 uppercase tracking-tighter">
                                            <User className="w-3 h-3" /> {m.user_name || 'System'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 dark:text-slate-500 tracking-tighter uppercase font-bold">
                                            {new Date(m.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MetricBox({ label, value, icon: Icon, color = 'text-gray-900 dark:text-white' }: { label: string; value: string | number; icon: any; color?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded shadow-sm hover:border-[#E68A00] transition-colors group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-[#E68A00] transition-colors">{label}</p>
                <Icon className="h-4 w-4 text-gray-300 dark:text-slate-700 group-hover:text-[#E68A00]/40 transition-colors" />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
        </div>
    );
}

