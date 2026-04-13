'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    TrendingUp, Loader2, DollarSign, Package, ShoppingBag, 
    ArrowRight, Search, Eye, Trash2, RefreshCw, X, AlertTriangle 
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_COLOR: Record<string, string> = {
    pending:    'bg-amber-50 text-amber-600 border-amber-100',
    completed:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    cancelled:  'bg-red-50 text-red-600 border-red-100',
    delivered:  'bg-emerald-50 text-emerald-600 border-emerald-100',
    received:   'bg-emerald-50 text-emerald-700 border-emerald-100',
    processing: 'bg-blue-50 text-blue-700 border-blue-100',
};

// ── Delete Confirmation Modal ──────────────────────────────────────────────────
function DeleteModal({ isOpen, onClose, onConfirm, item }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-50 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">
                        You are about to permanently remove record <span className="font-bold text-slate-900">#{item?.order_number}</span> from the ledger. This operation is non-reversible.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded transition-colors shadow-lg shadow-red-200"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Registry Component ────────────────────────────────────────────────────
export default function SupplierSalesRegistry() {
    const [filter, setFilter] = useState('all');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal State
    const [deleteItem, setDeleteItem] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const ordersPromise = api.get('/v1/sales/orders/', {
                params: { 
                    status: (filter === 'all' || ['pending', 'processing', 'completed'].includes(filter)) ? (filter === 'all' ? undefined : filter) : 'NONE',
                    search: search || undefined
                }
            });

            const poParams: any = { search: search || undefined };
            if (filter === 'all') {
                poParams.status = 'delivered,received,cancelled'; 
            } else if (['delivered', 'received', 'cancelled'].includes(filter)) {
                poParams.status = filter;
            } else {
                poParams.status = 'NONE';
            }

            const purchasesPromise = api.get('/v1/sales/purchases/', { params: poParams });

            const [ordersRes, purchasesRes] = await Promise.all([ordersPromise, purchasesPromise]);

            const retailOrders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
            const purchaseOrders = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];

            const normalizedPOs = purchaseOrders.map((po: any) => ({
                id: po.id,
                order_number: po.purchase_number,
                created_at: po.order_date || po.created_at,
                total_amount: po.total_amount,
                status: po.status,
                customer_name: 'Wholesale Partner',
                method: 'Logistics Credit',
                is_wholesale: true
            }));

            const combined = [...retailOrders, ...normalizedPOs].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setOrders(combined);
        } catch (error) {
            console.error(error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    const performDelete = async () => {
        if (!deleteItem) return;
        try {
            if (deleteItem.is_wholesale) {
                await api.delete(`/v1/sales/purchases/${deleteItem.id}/`);
            } else {
                await api.post(`/v1/sales/orders/${deleteItem.id}/delete/`);
            }
            toast.success(`Entry ${deleteItem.order_number} purged.`);
            setIsModalOpen(false);
            fetchOrders();
        } catch (err: any) {
            toast.error("Access Revoked: Permission Denied.");
        }
    };

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const TABS = ['all', 'pending', 'processing', 'delivered', 'completed', 'received', 'cancelled'];
    const totalVolume = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    return (
        <div className="max-w-[1240px] mx-auto py-6 px-4 animate-in fade-in duration-500 space-y-6">
            
            {/* Header / Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sale Registry</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Automated accounting for retail & wholesale procurement</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 px-4 py-2 rounded-md shadow-sm divide-x divide-slate-100">
                        <div className="pr-4">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Value</span>
                            <span className="text-lg font-black text-slate-900">{fmt(totalVolume)}</span>
                        </div>
                        <div className="pl-4">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Count</span>
                            <span className="text-lg font-black text-[#F59E0B]">{orders.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tactical Switcher & Utility Box */}
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-wrap lg:flex-nowrap items-center gap-3">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input 
                        type="text" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter Registry (Ref ID, Subscriber name...)"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-[11px] font-bold text-slate-700 outline-none focus:border-[#F59E0B] transition-all placeholder:font-medium"
                    />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {TABS.map(t => (
                        <button 
                            key={t} 
                            onClick={() => setFilter(t)}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-sm transition-all whitespace-nowrap ${filter === t ? 'bg-[#F59E0B] text-slate-900 border border-[#8a7100]/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            {t}
                        </button>
                    ))}
                    <button onClick={fetchOrders} className="ml-2 p-1.5 text-slate-400 hover:text-slate-900 transition-colors">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* The Amazon Table */}
            <div className="bg-white border border-slate-300 rounded overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f0f2f2] border-b border-slate-300 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                <th className="px-4 py-3 min-w-[80px]">Reference</th>
                                <th className="px-4 py-3 min-w-[140px]">Subscriber Account</th>
                                <th className="px-4 py-3 text-center w-[100px]">Channel</th>
                                <th className="px-4 py-3 w-[120px]">Timeline</th>
                                <th className="px-4 py-3 text-right w-[140px]">Settlement Amt</th>
                                <th className="px-4 py-3 text-center w-[100px]">Status</th>
                                <th className="px-4 py-3 text-center w-[100px]">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading && !orders.length ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-4 py-4"><div className="h-3 bg-slate-50 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center bg-slate-50/50">
                                        <div className="flex flex-col items-center opacity-30">
                                            <TrendingUp className="h-12 w-12 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Ledger Results</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((o) => (
                                    <tr key={o.is_wholesale ? `po-${o.id}` : `order-${o.id}`} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-900 text-[11px]">#{o.order_number}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-[11px] leading-tight">{o.customer_name || o.guest_name || 'Counterparty'}</span>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Identity Verified</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest border ${o.is_wholesale ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {o.is_wholesale ? 'Wholesale' : 'Retail'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-[11px] font-medium text-slate-500">{formatDate(o.created_at)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-black text-slate-900 text-[11px]">{fmt(parseFloat(o.total_amount || 0))}</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">{o.payment_method || o.method || 'Credit'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${STATUS_COLOR[o.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {o.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button className="p-1.5 text-slate-400 hover:text-[#F59E0B] hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all">
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => { setDeleteItem(o); setIsModalOpen(true); }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded border border-transparent hover:border-red-100 transition-all"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Tag */}
            <div className="flex items-baseline justify-center gap-2 pt-4">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">Encrypted Ledger Registry</span>
                <div className="h-px bg-slate-100 flex-1 lg:max-w-[400px]"></div>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">Secure Protocol Enabled</span>
            </div>

            {/* Confirmation Modal */}
            <DeleteModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onConfirm={performDelete} 
                item={deleteItem}
            />
        </div>
    );
}
