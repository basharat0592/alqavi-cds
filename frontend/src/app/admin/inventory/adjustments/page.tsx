"use client";

import React, { useEffect, useState } from 'react';
import { 
    Search, Plus, Settings, RefreshCw, ChevronDown, 
    User, Calendar, FileText, AlertCircle, CheckCircle2,
    X, Package, Warehouse, Info, Boxes, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { inventoryService } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StockAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [products, setProducts] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        product: '',
        warehouse: '',
        batch: '',
        adjustment_type: 'Addition',
        quantity: '',
        reason: 'Counting Error',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [adjData, prodData, whData, batchData] = await Promise.all([
                    inventoryService.getAdjustments(),
                    inventoryService.getInventory(), // We use inventory records to pick product/wh pairs
                    inventoryService.getWarehouses(),
                    inventoryService.getBatches()
                ]);
                setAdjustments(adjData);
                setProducts(prodData);
                setWarehouses(whData);
                setBatches(batchData);
            } catch (error) {
                console.error("Failed to load adjustment data", error);
            } finally {
                setLoading(false);
            }
        };
        loadInitData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await inventoryService.createAdjustment({
                ...formData,
                quantity: Number(formData.quantity)
            });
            toast.success("Stock level adjusted successfully");
            // Refresh list
            const refresh = await inventoryService.getAdjustments();
            setAdjustments(refresh);
            setIsModalOpen(false);
            setFormData({ product: '', warehouse: '', batch: '', adjustment_type: 'Addition', quantity: '', reason: 'Counting Error', notes: '' });
        } catch (error) {
            toast.error("Failed to apply adjustment");
            console.error("Failed to create adjustment", error);
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = adjustments.filter(adj => 
        (adj.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (adj.reason?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-[1400px] mx-auto pb-12 font-sans px-4 mt-6 text-[#111] dark:text-white">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 border border-gray-200 dark:border-slate-800 rounded shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Settings className="h-5 w-5 text-[#E68A00]" />
                        System Stock Adjustments
                    </h1>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Record manual overrides, audits, and damage disposal actions</p>
                </div>
                <Link 
                    href="/admin/inventory/adjustments/add"
                    style={{ backgroundColor: '#E68A00' }}
                    className="text-white px-6 py-2 rounded shadow-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all hover:opacity-90"
                >
                    <Plus className="w-4 h-4" strokeWidth={3} /> Log New Adjustment
                </Link>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricBox label="Adjustments" value={adjustments.length} icon={Settings} />
                <MetricBox label="Additions" value={adjustments.filter(a => a.adjustment_type === 'Addition').length} icon={TrendingUp} color="text-emerald-500" />
                <MetricBox label="Removals" value={adjustments.filter(a => a.adjustment_type !== 'Addition').length} icon={AlertCircle} color="text-red-500" />
                <MetricBox label="Audit Log Size" value={`${Math.ceil(adjustments.length * 0.4)} KB`} icon={FileText} color="text-blue-500" />
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search by Product or Reason..."
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-10 py-2 text-sm outline-none focus:ring-1 focus:ring-[#e47911] dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            <th className="px-6 py-4">Product Details</th>
                            <th className="px-6 py-4">Adjustment Type</th>
                            <th className="px-6 py-4">Reason & Notes</th>
                            <th className="px-6 py-4 text-right">Delta</th>
                            <th className="px-6 py-4 text-right">User / Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => <tr key={i} className="animate-pulse h-16"><td colSpan={5} className="bg-gray-50/20 dark:bg-slate-800/20"></td></tr>)
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-24 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No adjustment logs found in current audit cycle.</td></tr>
                        ) : filtered.map((adj) => (
                            <tr key={adj.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-[#E68A00] transition-colors leading-tight">{adj.product_name}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tight mt-0.5">SKU: {adj.product_sku || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border dark:border-transparent uppercase ${adj.adjustment_type === 'Addition' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                        {adj.adjustment_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{adj.reason}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500 italic font-medium">{adj.notes || 'No supporting notes provided'}</div>
                                </td>
                                <td className={`px-6 py-4 text-right font-black text-sm ${adj.adjustment_type === 'Addition' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {adj.adjustment_type === 'Addition' ? '+' : '-'}{adj.quantity}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-0.5 flex items-center justify-end gap-1.5 leading-none">
                                        <User className="w-3 h-3" /> {adj.user_name || 'System Auto'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-600 font-bold tracking-tighter uppercase mt-1">
                                        {new Date(adj.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(adj.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                            </tr>
                        ))}
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

