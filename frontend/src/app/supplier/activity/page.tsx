'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Search,
    Calendar,
    ChevronRight,
    LucideIcon,
    Package,
    ShoppingBag,
    ShoppingCart,
    CreditCard,
    Settings,
    User,
    ShieldCheck,
    RotateCcw,
    XCircle,
    CheckCircle,
    Eye,
    Activity,
    ShieldAlert,
    History,
    Shield
} from 'lucide-react';
import { userService } from '@/services/user.service';
import { purchaseService } from '@/services/purchase.service';
import { authService } from '@/lib/auth';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY ITEM ICON COLOR MAPPING
   ───────────────────────────────────────────────────────────────────────────── */
const getActivityStyles = (action: string, description: string = '') => {
    const act = (action || '').toLowerCase();
    const desc = (description || '').toLowerCase();

    if (desc.includes('return request')) return { icon: RotateCcw, color: 'text-amber-600', bg: 'bg-amber-50' };
    if (act.includes('log') || act.includes('session')) return { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-50' };
    if (act.includes('product') || act.includes('inventory')) return { icon: Package, color: 'text-slate-400', bg: 'bg-slate-50' };
    if (act.includes('order') || act.includes('purchase')) return { icon: ShoppingBag, color: 'text-[#F59E0B]', bg: 'bg-amber-50' };
    if (act.includes('pay') || act.includes('sale')) return { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (act.includes('profile') || act.includes('account')) return { icon: User, color: 'text-slate-400', bg: 'bg-slate-50' };
    return { icon: History, color: 'text-slate-400', bg: 'bg-slate-50' };
};

export default function SupplierRecentActivityPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [viewReturn, setViewReturn] = useState<any | null>(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const user = authService.getUser();
            const userId = Number(user?.id);

            if (!user || isNaN(userId)) {
                setLogs([]);
                return;
            }

            const data = await userService.getActivityLogs(userId, 100);
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Activity load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleAcceptReturn = async (returnId: string) => {
        setProcessingId(returnId);
        try {
            await purchaseService.acceptReturn(returnId);
            toast.success("Return Accepted and Stocks Adjusted!");
            loadLogs();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to accept return");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectReturn = async (returnId: string) => {
        setProcessingId(returnId);
        try {
            await purchaseService.rejectReturn(returnId);
            toast.success("Return Rejected");
            loadLogs();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to reject return");
        } finally {
            setProcessingId(null);
        }
    };

    const handleViewReturn = async (returnId: string) => {
        try {
            const data = await purchaseService.getReturnById(returnId);
            setViewReturn(data);
        } catch {
            toast.error("Failed to load return details");
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.description?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterType === 'all') return matchesSearch;
        const styles = getActivityStyles(log.action, log.description);

        if (filterType === 'inventory' && styles.icon === Package) return matchesSearch;
        if (filterType === 'orders' && styles.icon === ShoppingBag) return matchesSearch;
        if (filterType === 'returns' && styles.icon === RotateCcw) return matchesSearch;
        if (filterType === 'security' && (styles.icon === Shield || styles.icon === User)) return matchesSearch;

        return matchesSearch;
    });

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 font-sans text-left">

            {/* ── Page Header ── */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-medium text-slate-900 tracking-tight">Audit Ledger</h1>
                    <button onClick={() => loadLogs()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F59E0B] border border-gray-300 bg-white rounded hover:bg-gray-50 transition-all font-bold">
                        <RefreshCw className={cn("h-3.5 w-3.5 text-[#F59E0B] transition-colors", loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>

                {/* Filters Row */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search through audit logs..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-[#F59E0B] transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-6 border-b border-gray-200">
                    {['all', 'inventory', 'orders', 'returns', 'security'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${filterType === type ? 'border-[#F59E0B] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main Log Registry ── */}
            <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-[#f0f2f2] border-b border-gray-300 flex items-center justify-between text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                    <h3 className="font-bold">Protocol History</h3>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Calendar size={12} /> Live Trace (Last 100)
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="p-6 animate-pulse border-b border-gray-50">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 bg-slate-50 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-50 rounded w-1/4" />
                                        <div className="h-3 bg-slate-50 rounded w-full" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : filteredLogs.length === 0 ? (
                        <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                            <Clock size={48} />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">No activity records detected</p>
                        </div>
                    ) : (
                        filteredLogs.map((log, idx) => {
                            const { icon: ActionIcon, color, bg } = getActivityStyles(log.action, log.description);
                            const isReturnRequest = log.description?.includes('Return Request RECEIVED');
                            const returnId = isReturnRequest ? log.description.match(/\[ID:\s*([^\]]+)\]/)?.[1] : null;

                            return (
                                <div key={log.id || idx} className="group flex items-start gap-5 p-5 hover:bg-slate-50/50 transition-all duration-200 border-l-4 border-transparent hover:border-[#F59E0B]">
                                    <div className={cn("p-3 rounded-xl shrink-0 transition-transform shadow-sm", bg, color)}>
                                        <ActionIcon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-[15px] font-bold text-slate-900 group-hover:text-[#F59E0B] transition-colors tracking-tight">
                                                {log.action === 'other' && isReturnRequest ? 'New Return Request' : log.action}
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 shrink-0 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                {formatDate(log.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                                            {log.description || log.details || 'System recorded a standard protocol action.'}
                                        </p>

                                        {/* Action Buttons for Returns */}
                                        {isReturnRequest && returnId && (
                                            <div className="flex flex-wrap items-center gap-3 mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                                <button
                                                    onClick={() => handleViewReturn(returnId)}
                                                    className="h-9 px-4 rounded-lg bg-white border border-amber-200 text-[10px] font-black uppercase tracking-widest text-[#F59E0B] hover:bg-amber-50 flex items-center gap-2 transition-all shadow-sm"
                                                >
                                                    <Eye size={14} /> Review Request
                                                </button>
                                                <div className="h-5 w-px bg-amber-200 hidden sm:block"></div>
                                                <button
                                                    disabled={!!processingId}
                                                    onClick={() => handleAcceptReturn(returnId)}
                                                    className="h-9 px-5 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                                                >
                                                    {processingId === returnId ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                    Accept
                                                </button>
                                                <button
                                                    disabled={!!processingId}
                                                    onClick={() => handleRejectReturn(returnId)}
                                                    className="h-9 px-5 rounded-lg bg-white border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* View Return Modal */}
            {viewReturn && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-50 text-[#F59E0B] rounded-xl">
                                    <RotateCcw size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Return Receipt</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Trace: #{viewReturn.return_number}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewReturn(null)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><XCircle size={24} /></button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged At</p>
                                    <p className="text-[14px] font-black text-slate-800">{formatDate(viewReturn.return_date)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason Context</p>
                                    <p className="text-[13px] text-slate-500 font-medium italic leading-relaxed">"{viewReturn.reason || 'No specific reason provided'}"</p>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-inner">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f0f2f2] border-b border-gray-100 font-medium text-slate-600 uppercase tracking-widest text-[9px]">
                                        <tr>
                                            <th className="px-6 py-2.5">Product Name</th>
                                            <th className="px-4 py-2.5 text-center">Qty</th>
                                            <th className="px-6 py-2.5 text-right">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {viewReturn.items?.map((it: any, i: number) => (
                                            <tr key={i} className="text-[13px] text-slate-700">
                                                <td className="px-6 py-4 font-bold">{it.product_name}</td>
                                                <td className="px-4 py-4 text-center font-black text-[#F59E0B]">x{it.quantity}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(it.refund_price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl shadow-xl shadow-slate-100">
                                <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">Total Settlement Value</span>
                                <span className="text-2xl font-black text-white">{formatCurrency(viewReturn.total_refund_amount)}</span>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setViewReturn(null)}
                                className="px-8 py-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-white transition-all font-bold"
                            >
                                Discard
                            </button>
                            <button
                                onClick={() => { setViewReturn(null); handleAcceptReturn(viewReturn.id); }}
                                className="px-8 py-3 rounded-xl bg-[#F59E0B] text-white text-[11px] font-black uppercase tracking-widest hover:shadow-xl shadow-amber-100 transition-all hover:-translate-y-0.5"
                            >
                                Accept & Adjust Stocks
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Telemetry */}
            <div className="text-center pt-8">
                <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.6em] mb-4">Audit Node Trace Ledger v4.1</p>
                <div className="flex justify-center gap-8 opacity-20 grayscale hover:grayscale-0 transition-all duration-500">
                    <ShieldCheck size={14} className="text-slate-400" />
                    <History size={14} className="text-slate-400" />
                    <Shield size={14} className="text-slate-400" />
                </div>
            </div>
        </div>
    );
}
