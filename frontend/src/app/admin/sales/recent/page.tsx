'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, productService, userService, Order } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Clock, Printer, Plus, Trash2, Edit,
    AlertTriangle, Loader2, Package, Save, ArrowRight, MoreVertical,
    ExternalLink, Check, Ban, Eye, ChevronDown, Trash, FileText
} from 'lucide-react';
import {
    PageWrapper, SectionCard, PageHeader, Toast, DeleteConfirmModal,
    AMZ_INPUT, ActionButton, SecondaryButton, PrimaryButton,
    FilterHub, AdminTable
} from '@/components/ui/AmazonStyles';

// ── Components ─────────────────────────────────────────────────────────────────

const STATUS_LIST = [
    { value: 'ordered', label: 'Ordered' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

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
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-[#FF9900]/50 transition-all shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]"></span>
                    {activeStatus.label}
                </div>
                <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-1.5 space-y-0.5">
                        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-white/5 mb-1">Update Status</div>
                        {STATUS_LIST.map((s) => (
                            <button 
                                key={s.value}
                                onClick={() => { onChange(orderId, s.value); setIsOpen(false); }}
                                className={`w-full flex items-center px-3 py-2 text-[11px] font-semibold rounded-lg transition-colors
                                    ${currentStatus === s.value 
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
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

// ── Modals ───────────────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const items = order.items || [];
    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name
        ? `${c.first_name} ${c.last_name || ''}`.trim()
        : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

    const currency = order.currency || 'PKR';
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(String(item.price)) * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0f1012] rounded-2xl border border-slate-200 dark:border-white/5 max-w-4xl w-full max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md">Sales Record</span>
                            <span className="text-slate-300 dark:text-slate-700">/</span>
                            <span className="text-[11px] font-mono text-slate-500">{order.id}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Order #{order.order_number}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-slate-400">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Entity</h4>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase leading-tight">{customerName}</p>
                                <p className="text-[11px] text-slate-500 mt-1 font-medium">{c?.email || 'Individual Sale'}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Date</h4>
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase leading-tight">{formatDate(order.created_at, { dateStyle: 'long' })}</p>
                                <p className="text-[11px] text-slate-500 mt-1 font-mono uppercase font-bold">{formatDate(order.created_at, { timeStyle: 'short' })}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifecycle State</h4>
                            <StatusBadge status={order.status} />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Valuation</h4>
                            <p className="text-xl font-mono font-black text-[#FF9900] tracking-tighter">{formatCurrency(order.total_amount || 0, currency)}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5">Product Descriptor</th>
                                    <th className="px-8 py-5 text-center">Qty</th>
                                    <th className="px-8 py-5 text-right">Unit Rate</th>
                                    <th className="px-8 py-5 text-right">Extended Sum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {items.map((item: any, i: number) => (
                                    <tr key={i} className="text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50/30">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter">{item.product_name || item.name || `Registry Item ${i + 1}`}</p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">Reference: {String(item.product?.id || 'N/A').slice(0, 8)}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center font-mono font-bold">{item.quantity}</td>
                                        <td className="px-8 py-5 text-right font-mono">{formatCurrency(parseFloat(item.price || 0), currency)}</td>
                                        <td className="px-8 py-5 text-right font-mono font-bold text-slate-900 dark:text-white">{formatCurrency((parseFloat(item.price || 0) * item.quantity), currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-4 bg-slate-50 dark:bg-white/5 p-8 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                                <span className="text-slate-500">Gross Subtotal</span>
                                <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                                <span className="text-slate-500">Logistic Fees</span>
                                <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(parseFloat(String(order.shipping_cost || 0)), currency)}</span>
                            </div>
                            <div className="flex justify-between text-2xl pt-5 border-t border-slate-200 dark:border-white/10 italic">
                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Total Due</span>
                                <span className="font-mono font-black text-[#FF9900] tracking-tighter">{formatCurrency(order.total_amount || 0, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-white dark:bg-[#0f1012]">
                    <button onClick={onClose} className="px-8 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                        Dismiss
                    </button>
                    <Link
                        href={`/admin/sales/${order.id}/invoice`}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Printer className="h-3.5 w-3.5" /> Execute Print
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecentOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [toast, setToast] = useState('');

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = {
                ordering: '-created_at',
                page: 1,
                pageSize: 25,
                exclude_status: 'delivered,cancelled'
            };
            const response = await orderService.getPaginated(params);
            setOrders(response.results);
        } catch (error) {
            console.error("Error loading recent orders", error);
            showToast("Failed to sync recent transactions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleStatusMove = async (orderId: string, newStatus: string) => {
        setLoading(true);
        try {
            await orderService.update(orderId, { status: newStatus });
            showToast(`Order status updated successfully.`);
            
            // Remove from list if it's now delivered or cancelled
            if (['delivered', 'cancelled'].includes(newStatus)) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } else {
                loadOrders();
            }
        } catch {
            showToast("Transaction update failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewOrder = async (order: Order) => {
        setLoading(true);
        try {
            const fullOrder = await orderService.getById(order.id as string);
            setSelectedOrder(fullOrder);
        } catch (error) {
            console.error("Error fetching order details", error);
            showToast("Failed to load details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageWrapper>
            <Toast message={toast} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4 uppercase">
                        Recent Sales Feed
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF9900] bg-orange-50 dark:bg-orange-500/10 px-3 py-1 rounded-full inline-flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900] animate-pulse"></span> Synchronized
                        </span>
                    </h1>
                    <p className="text-[12px] text-slate-500 mt-2 font-bold uppercase tracking-widest opacity-70">Live registry of procurement and logistics activity.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={loadOrders} 
                        className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link href="/admin/sales/create" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3">
                        <Plus className="h-4 w-4" /> Create Sale
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0f1012] rounded-2xl border border-slate-100 dark:border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
                <AdminTable
                    overflowVisible={true}
                    headers={['Transaction', 'Stakeholder', 'Valuation', 'Current Status', 'Action Axis']}
                    data={orders}
                    loading={loading}
                    emptyMessage="Active transactions not found."
                    renderRow={(o) => {
                        const c = o.customer as any;
                        const cName = (o as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || 'Guest');
                        return (
                            <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <div className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-tighter uppercase">#{o.order_number}</div>
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formatDate(o.created_at, { dateStyle: 'medium' })}</span>
                                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[9px] text-slate-400 font-black uppercase tracking-widest tabular-nums">
                                                {new Date(o.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <div className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{cName}</div>
                                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-[160px] italic">{c?.email || 'Direct Account'}</div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <div className="text-sm font-black text-[#FF9900] font-mono italic tracking-tighter">{formatCurrency(o.total_amount || 0)}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{o.payment_status}</div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <StatusBadge status={o.status || 'pending'} />
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex justify-end items-center gap-3">
                                        <button 
                                            onClick={() => handleViewOrder(o)} 
                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10"
                                            title="View Details"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <StatusDropdown 
                                            orderId={o.id as string}
                                            currentStatus={o.status}
                                            onChange={handleStatusMove}
                                        />
                                    </div>
                                </td>
                            </tr>
                        );
                    }}
                />
            </div>

            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
            `}</style>
        </PageWrapper>
    );
}
