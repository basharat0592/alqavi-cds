'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { orderService, Order } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Clock, Printer, Plus,
    Activity, Eye, ChevronDown, Check, ChevronRight, Filter, 
    Trash2, AlertTriangle, Calendar, TrendingUp, Package, 
    CheckCircle2, XCircle, Phone, MapPin, User, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PrintSlip } from '@/components/admin/PrintSlip';

/* ══════════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-sm flex items-center justify-between group hover:border-[#F59E0B]/30 transition-all">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
            {subValue && <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-tight">{subValue}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
            <Icon className="h-6 w-6 text-white" />
        </div>
    </div>
);

const PRIMARY_BTN = "bg-[#F59E0B] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";

const STATUS_LIST = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */
export default function RecentOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Stats
            const statsParams: any = {};
            if (dateFilter) statsParams.date = dateFilter;
            const statsData = await orderService.getStats(statsParams);
            setStats(statsData);

            // Fetch Orders with filters
            const params: any = { 
                ordering: '-created_at', 
                page: 1, 
                pageSize: 100 
            };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (dateFilter) params.date = dateFilter;
            
            const response = await orderService.getPaginated(params);
            setOrders(response.results);
        } catch (error) {
            toast.error("Telemetry sync failure.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [statusFilter, dateFilter]);

    const handlePrint = (order?: any) => {
        const target = order || selectedOrder;
        if (!target) return;
        
        // We'll use a timeout to ensure the printable content is ready
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleStatusMove = async (orderId: string, newStatus: string) => {
        setLoading(true);
        try {
            await orderService.update(orderId, { status: newStatus });
            toast.success("Lifecycle synchronization complete.");
            loadData();
        } catch {
            toast.error("Status update failure.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await orderService.delete(deleteTarget.id);
            toast.success("Order purged from registry.");
            loadData();
            setDeleteTarget(null);
        } catch {
            toast.error("Purge sequence failure.");
        } finally {
            setIsDeleting(false);
        }
    };

    const filtered = orders.filter(o => {
        const cName = (o.customer_name || '').toLowerCase();
        const pNum = (o.phone_number || '').toLowerCase();
        const tid = (o.tracking_id || '').toLowerCase();
        const ordNum = (o.order_number || '').toString().toLowerCase();
        const q = searchQuery.toLowerCase();
        return ordNum.includes(q) || cName.includes(q) || pNum.includes(q) || tid.includes(q);
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-24 px-4 mt-4 font-sans animate-in fade-in duration-500">
            
            {/* hidden printable area */}
            <div className="hidden print:block">
                <PrintSlip ref={printRef} order={selectedOrder} />
            </div>

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Sales Intelligence</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Profit Monitoring & Transactional Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className={SECONDARY_BTN}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/sales" className={PRIMARY_BTN}>
                        <Plus className="h-3.5 w-3.5" /> New Order
                    </Link>
                </div>
            </div>

            {/* ── Dashboard Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard 
                    title="Today's Orders" 
                    value={stats?.today_count || '0'} 
                    icon={Package} 
                    color="bg-blue-500" 
                    subValue={`${stats?.pending_count || 0} Pending Now`}
                />
                <StatCard 
                    title="Today's Profit" 
                    value={`Rs. ${stats?.today_profit ? parseFloat(stats.today_profit).toLocaleString() : '0'}`} 
                    icon={TrendingUp} 
                    color="bg-emerald-500" 
                    subValue="Daily Net Gains"
                />
                <StatCard 
                    title="Monthly Profit" 
                    value={`Rs. ${stats?.month_profit ? parseFloat(stats.month_profit).toLocaleString() : '0'}`} 
                    icon={Activity} 
                    color="bg-[#F59E0B]" 
                    subValue="Selection Period Yield"
                />
                <StatCard 
                    title="Total Delivered" 
                    value={stats?.delivered_count || '0'} 
                    icon={CheckCircle2} 
                    color="bg-slate-800"
                    subValue="Sucessful Conversions"
                />
            </div>

            <div className="space-y-4">
                {/* ── Filters Bar ── */}
                <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col xl:flex-row gap-4 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F59E0B] transition-colors" />
                        <input
                            type="text"
                            placeholder="Locate by Phone, Tracking ID or Order #..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 shrink-0 w-full xl:w-auto">
                        {/* Date Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[160px]">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-[#F59E0B] transition-all font-bold appearance-none"
                            />
                            {dateFilter && (
                                <button onClick={() => setDateFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="relative flex-1 sm:flex-none min-w-[160px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold outline-none focus:border-[#F59E0B] transition-all appearance-none uppercase tracking-widest"
                            >
                                {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* ── Tactical Data Registry ── */}
                <SectionCard>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trade Identity</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subscriber Info</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Net Value</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest">Protocol Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 text-right uppercase tracking-widest">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading && filtered.length === 0 ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-4 py-8"><div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-full opacity-50" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-24 text-center">
                                            <ShoppingBag className="w-16 h-16 text-slate-100 dark:text-white/5 mx-auto mb-6 stroke-[1.5]" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zero results in target sector.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((o) => (
                                        <tr key={o.id} className="group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedOrder(o)}>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 bg-amber-50 dark:bg-amber-900/10 text-[#F59E0B] rounded-xl flex items-center justify-center font-black text-[10px] group-hover:bg-[#F59E0B] group-hover:text-white transition-all shadow-sm">
                                                        <Hash className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#F59E0B] transition-colors tracking-tight">#{o.order_number}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{formatDate(o.created_at)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white capitalize mb-1">{o.customer_name || 'Anonymous Node'}</div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-black uppercase tracking-tight">
                                                        <Phone className="h-3 w-3 text-[#F59E0B]" /> {o.phone_number || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-300 font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                        {o.tracking_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(o.total_amount)}</div>
                                                <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{o.items?.length || 0} Unified Products</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <StatusBadge status={o.status || 'PENDING'} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => setSelectedOrder(o)} className="p-2 rounded-xl text-slate-400 hover:text-[#F59E0B] hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors" title="View Intelligence">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => { setSelectedOrder(o); handlePrint(o); }} className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors" title="Print Logistics Slip">
                                                        <Printer className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(o)} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors" title="Purge Sequence">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>

            {/* ── Order Detail Modal ── */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1a252f] rounded-3xl border border-slate-200 dark:border-white/10 max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Order #{selectedOrder.order_number}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedOrder.tracking_id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Customer Info */}
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subscriber Node</p>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-600">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{selectedOrder.customer_name}</p>
                                                <p className="text-xs font-bold text-slate-500">{selectedOrder.phone_number}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Logistics Protocol</p>
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-[#F59E0B]">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-snug">{selectedOrder.shipping_address}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Management */}
                                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Protocol Status</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STATUS_LIST.filter(s => s.value !== 'ALL').map((s) => (
                                            <button
                                                key={s.value}
                                                onClick={() => handleStatusMove(selectedOrder.id, s.value)}
                                                disabled={selectedOrder.status === 'DELIVERED' || loading}
                                                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border
                                                    ${selectedOrder.status === s.value
                                                        ? 'bg-[#F59E0B] border-[#F59E0B] text-white shadow-lg shadow-amber-500/20'
                                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-[#F59E0B]/50'}
                                                    ${(selectedOrder.status === 'DELIVERED' && s.value !== 'DELIVERED') ? 'opacity-50 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Items Registry */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Provisioned Items</p>
                                <div className="border border-slate-100 dark:border-white/10 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-white/5">
                                            <tr>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase">Product</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-center">Qty</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Unit</th>
                                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                            {selectedOrder.items?.map((item: any) => (
                                                <tr key={item.id} className="text-xs font-bold text-slate-900 dark:text-slate-200">
                                                    <td className="px-4 py-3 uppercase tracking-tight">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-center text-[#F59E0B] font-black">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-slate-400">{parseFloat(item.price).toFixed(0)}</td>
                                                    <td className="px-4 py-3 text-right font-black">{ (item.quantity * parseFloat(item.price)).toLocaleString() }</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-900 text-white font-black">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-3 text-[10px] uppercase tracking-[0.2em] opacity-50 text-right">Total Payload Value</td>
                                                <td className="px-4 py-3 text-right text-base tracking-tighter text-[#F59E0B]">Rs. {parseFloat(selectedOrder.total_amount).toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div className="mt-6 p-4 bg-amber-50/50 dark:bg-amber-900/5 border border-amber-100 dark:border-amber-900/20 rounded-2xl">
                                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Observation Logs</p>
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 italic line-clamp-3">"{selectedOrder.notes}"</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-3">
                            <button onClick={() => setSelectedOrder(null)} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 transition-all">Close Deck</button>
                            <button onClick={() => handlePrint()} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                <Printer className="h-4 w-4" /> Print Logistics Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <DeleteConfirmModal 
                    orderNumber={deleteTarget.order_number || deleteTarget.id.toString().slice(-6).toUpperCase()}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                    loading={isDeleting}
                />
            )}
        </div>
    );
}
