'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Clock, Printer, Plus,
    Activity, Eye, ChevronDown, Check, ChevronRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ══════════════════════════════════════════════
   COMPONENTS & STYLES (Synchronized with Company Hub)
   ══════════════════════════════════════════════ */
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const PRIMARY_BTN = "bg-[#F7CA00] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow-sm text-[11px] uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";
const SECONDARY_BTN = "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm text-[11px] font-bold uppercase tracking-widest py-2 px-4 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50";

const STATUS_LIST = [
    { value: 'ordered', label: 'Ordered' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

// ── Status Dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({
    orderId,
    currentStatus,
    onChange
}: {
    orderId: string;
    currentStatus: string;
    onChange: (id: string, s: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeStatus = STATUS_LIST.find(s => s.value === currentStatus) || { label: currentStatus, value: currentStatus };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:border-[#F7CA00]/50 transition-all shadow-sm group"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F7CA00] group-hover:animate-pulse"></span>
                {activeStatus.label}
                <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-1.5 space-y-0.5">
                        <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-white/5 mb-1">Update Protocol</div>
                        {STATUS_LIST.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => { onChange(orderId, s.value); setIsOpen(false); }}
                                className={`w-full flex items-center px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all
                                    ${currentStatus === s.value
                                        ? 'bg-[#F7CA00] text-white'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-[#F7CA00]'}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecentOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = { ordering: '-created_at', page: 1, pageSize: 50, exclude_status: 'delivered,cancelled' };
            const response = await orderService.getPaginated(params);
            setOrders(response.results);
        } catch (error) {
            toast.error("Telemetry sync failure.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadOrders(); }, []);

    const handleStatusMove = async (orderId: string, newStatus: string) => {
        setLoading(true);
        try {
            await orderService.update(orderId, { status: newStatus });
            toast.success("Lifecycle synchronization complete.");
            if (['delivered', 'cancelled'].includes(newStatus)) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } else {
                loadOrders();
            }
        } catch {
            toast.error("Initialization failure.");
        } finally {
            setLoading(false);
        }
    };

    const filtered = orders.filter(o => {
        const c = o.customer as any;
        const cName = ((o as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || '')).toLowerCase();
        const q = searchQuery.toLowerCase();
        return o.order_number.toLowerCase().includes(q) || cName.includes(q);
    });

    return (
        <div className="max-w-[1400px] mx-auto pb-24 px-4 mt-4 font-sans animate-in fade-in duration-500">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F7CA00] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Sales Monitor</h1>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Real-time Transactional Intelligence</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadOrders} className={SECONDARY_BTN}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/sales" className={SECONDARY_BTN}>
                        Archive Ledger
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                {/* ── Filters ── */}
                <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#F7CA00] transition-colors" />
                        <input
                            type="text"
                            placeholder="Locate active trade identifier..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-[#F7CA00] transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="p-2 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-400">
                            <Filter className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* ── Tactical Data Registry ── */}
                <SectionCard>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trade Identifier</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subscriber Node</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Net Value</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest">Protocol Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 text-right uppercase tracking-widest">Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {loading && orders.length === 0 ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-4 py-6"><div className="h-4 bg-slate-100 dark:bg-white/5 rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-24 text-center">
                                            <ShoppingBag className="w-16 h-16 text-slate-100 dark:text-white/5 mx-auto mb-6 stroke-[1.5]" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telemetry void. No active trades detected.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((o) => {
                                        const c = o.customer as any;
                                        const cName = (o as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || 'GUEST-NODE');
                                        return (
                                            <tr key={o.id} className="group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/10 text-[#F7CA00] rounded-lg flex items-center justify-center font-black text-[10px] group-hover:bg-[#F7CA00] group-hover:text-white transition-all">
                                                            ID
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#F7CA00] transition-colors tracking-tight">#{o.order_number}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{formatDate(o.created_at)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">{cName}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60">{c?.email || 'Individual Mesh'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(o.total_amount || 0)}</div>
                                                    <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{o.payment_status || 'Unverified'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <StatusBadge status={o.status || 'pending'} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <Link
                                                            href={`/admin/sales?id=${o.id}`}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#F7CA00] hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                                                            title="View Packet"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                        <StatusDropdown
                                                            orderId={o.id as string}
                                                            currentStatus={o.status}
                                                            onChange={handleStatusMove}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
