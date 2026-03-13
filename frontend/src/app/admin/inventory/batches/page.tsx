"use client";

import React, { useEffect, useState } from 'react';
import { 
    Search, Filter, Layers, Calendar, AlertTriangle, 
    CheckCircle2, Clock, Box, MoreVertical, 
    ArrowUpRight, Warehouse, Trash2, Download, History, Boxes
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';

export default function BatchTrackingPage() {
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const data = await inventoryService.getBatches();
                setBatches(data);
            } catch (error) {
                console.error("Failed to load batches", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    const getStatus = (expiryDate: string) => {
        if (!expiryDate) return { text: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-slate-800', icon: Clock };
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Expired', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20', icon: AlertTriangle };
        if (diffDays <= 30) return { text: 'Expiring Soon', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/20', icon: Clock };
        return { text: 'Valid', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20', icon: CheckCircle2 };
    };

    const filtered = batches.filter(b => {
        const matchesSearch = 
            (b.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const status = getStatus(b.expiry_date).text.toLowerCase().replace(' ', '');
        const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
        
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Layers className="h-5 w-5 text-[#E68A00]" />
                        Batch & Expiry Control
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Monitor product validity, manufacturing dates, and lot segregation</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded shadow-sm text-xs font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                        <Download className="w-4 h-4" /> Batch Audit
                    </button>
                    <Link 
                        href="/admin/inventory/batches/add"
                        style={{ backgroundColor: '#E68A00' }} 
                        className="text-white px-6 py-2 rounded shadow-sm text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90 flex items-center gap-2"
                    >
                        <Boxes className="w-4 h-4" /> Create New Batch
                    </Link>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricBox label="Active Batches" value={batches.length} icon={Layers} />
                <MetricBox label="Expiring Soon" value={batches.filter(b => getStatus(b.expiry_date).text === 'Expiring Soon').length} icon={Clock} color="text-orange-500" />
                <MetricBox label="Expired" value={batches.filter(b => getStatus(b.expiry_date).text === 'Expired').length} icon={AlertTriangle} color="text-red-500" />
                <MetricBox label="Total Stock" value={batches.reduce((a, b) => a + Number(b.quantity || 0), 0)} icon={Boxes} color="text-blue-500" />
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search Batch ID or Product..."
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-10 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e47911] dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-3 py-2 text-sm outline-none cursor-pointer dark:text-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="valid">Valid Batches</option>
                    <option value="soon">Expiring Soon</option>
                    <option value="expired">Expired</option>
                </select>
            </div>

            {/* Grid View for Batches */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg h-48 animate-pulse"></div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-12 text-center text-gray-500">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-50">No batches matching your criteria were found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((batch) => {
                        const status = getStatus(batch.expiry_date);
                        return (
                            <div key={batch.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                <div className="p-5 border-b border-gray-100 dark:border-slate-800 relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status.bg} ${status.color} flex items-center gap-1`}>
                                            <status.icon className="w-3 h-3" />
                                            {status.text}
                                        </div>
                                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#E68A00] transition-colors">{batch.product_name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 tracking-wider uppercase mt-1 flex items-center gap-1.5">
                                        Batch: {batch.batch_number}
                                        <span className="text-gray-300 dark:text-slate-700">|</span>
                                        Available: {batch.quantity}
                                    </p>
                                </div>
                                <div className="p-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight mb-1">Mfd Date</p>
                                        <p className="text-sm font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                            <Calendar className="w-3.5 h-3.5 text-gray-300 dark:text-slate-700" />
                                            {batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight mb-1">Exp Date</p>
                                        <p className={`text-sm font-bold flex items-center gap-1.5 ${status.color}`}>
                                            <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                                            {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">
                                        <Warehouse className="w-3.5 h-3.5" />
                                        Node ID: {batch.warehouse || '--'}
                                    </div>
                                    <Link href={`/admin/inventory/list?search=${batch.product_name}`} className="text-[10px] font-bold text-[#007185] dark:text-[#4caec2] hover:text-[#E68A00] flex items-center gap-1 hover:underline uppercase tracking-tight">
                                        Ledger Record <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
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

