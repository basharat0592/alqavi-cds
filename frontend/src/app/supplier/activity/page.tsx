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
    ShoppingCart,
    CreditCard,
    Settings,
    User,
    ShieldCheck,
    RotateCcw,
    XCircle,
    CheckCircle,
    Eye
} from 'lucide-react';
import { userService } from '@/services/user.service';
import { purchaseService } from '@/services/purchase.service';
import { authService } from '@/lib/auth';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY ITEM ICON COLOR MAPPING
   ───────────────────────────────────────────────────────────────────────────── */
const getActivityStyles = (action: string, description: string = '') => {
    const act = (action || '').toLowerCase();
    const desc = (description || '').toLowerCase();

    if (desc.includes('return request')) return { icon: RotateCcw, color: 'text-orange-500', bg: 'bg-orange-50' };
    if (act.includes('log') || act.includes('session')) return { icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-50' };
    if (act.includes('product') || act.includes('inventory')) return { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' };
    if (act.includes('order') || act.includes('purchase')) return { icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-50' };
    if (act.includes('pay') || act.includes('sale')) return { icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-50' };
    if (act.includes('profile') || act.includes('account')) return { icon: User, color: 'text-indigo-500', bg: 'bg-indigo-50' };
    return { icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50' };
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
            if (!user?.id) throw new Error("No user found");
            
            const data = await userService.getActivityLogs(Number(user.id), 100);
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load activity logs");
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
        if (filterType === 'orders' && styles.icon === ShoppingCart) return matchesSearch;
        if (filterType === 'returns' && styles.icon === RotateCcw) return matchesSearch;
        if (filterType === 'security' && (styles.icon === ShieldCheck || styles.icon === User)) return matchesSearch;
        
        return false;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* ── Filter Bar ── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search through your logs..."
                        className="w-full pl-11 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[13px] focus:ring-2 focus:ring-indigo-500 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                    {['all', 'inventory', 'orders', 'returns', 'security'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${filterType === type ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => loadLogs()}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-500"
                    title="Refresh Logs"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* ── Activity Timeline ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Account Audit Trail</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Calendar size={12} /> Last 100 Actions
                    </div>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 opacity-40">
                            <RefreshCw size={40} className="animate-spin mb-4 text-indigo-600" />
                            <p className="text-sm font-medium">Synchronizing with server...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 opacity-40">
                            <Clock size={40} className="mb-4 text-slate-400" />
                            <p className="text-sm font-medium">No activity records found matching your filters.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredLogs.map((log, idx) => {
                                const { icon: ActionIcon, color, bg } = getActivityStyles(log.action, log.description);
                                const isReturnRequest = log.description?.includes('Return Request RECEIVED');
                                const returnId = isReturnRequest ? log.description.match(/\[ID:\s*([^\]]+)\]/)?.[1] : null;

                                return (
                                    <div key={log.id || idx} className="group flex items-start gap-4 p-5 hover:bg-slate-50/80 transition-all">
                                        <div className={`p-2.5 rounded-xl ${bg} ${color} shrink-0 group-hover:scale-110 transition-transform`}>
                                            <ActionIcon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1">
                                                <h4 className="text-[14px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {log.action === 'other' && isReturnRequest ? 'New Return Request' : log.action}
                                                </h4>
                                                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 shrink-0">
                                                    <Clock size={12} /> {formatDate(log.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-slate-500 leading-relaxed mb-3">
                                                {log.description || log.details || 'System automatically recorded this action.'}
                                            </p>
                                            
                                            {/* Action Buttons for Returns */}
                                            {isReturnRequest && returnId && (
                                                <div className="flex flex-wrap items-center gap-2 mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <button 
                                                        onClick={() => handleViewReturn(returnId)}
                                                        className="h-8 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-all"
                                                    >
                                                        <Eye size={12} /> View Details
                                                    </button>
                                                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                                    <button 
                                                        disabled={!!processingId}
                                                        onClick={() => handleAcceptReturn(returnId)}
                                                        className="h-8 px-4 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-emerald-100"
                                                    >
                                                        {processingId === returnId ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                        Accept Return
                                                    </button>
                                                    <button 
                                                        disabled={!!processingId}
                                                        onClick={() => handleRejectReturn(returnId)}
                                                        className="h-8 px-4 rounded-lg bg-white border border-rose-200 text-rose-600 text-[11px] font-bold hover:bg-rose-50 flex items-center gap-1.5 disabled:opacity-50"
                                                    >
                                                        <XCircle size={12} /> Reject Return
                                                    </button>
                                                </div>
                                            )}

                                                <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                                    IP: {log.ip_address || 'Internal'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* View Return Modal */}
            {viewReturn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 leading-tight">Return Request #{viewReturn.return_number}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Order Ref: {viewReturn.purchase_number || 'Standalone'}</p>
                            </div>
                            <button onClick={() => setViewReturn(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-500"><XCircle size={20} /></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Return Date</p>
                                    <p className="text-sm font-bold text-slate-800">{formatDate(viewReturn.return_date)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Notes</p>
                                    <p className="text-sm text-slate-600 italic leading-relaxed">"{viewReturn.reason || 'No specific reason provided'}"</p>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <th className="px-6 py-3">Product Name</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-6 py-3 text-right">Refund Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {viewReturn.items?.map((it: any, i: number) => (
                                            <tr key={i} className="text-[13px] text-slate-700">
                                                <td className="px-6 py-4 font-bold">{it.product_name}</td>
                                                <td className="px-4 py-4 text-center font-bold">{it.quantity}</td>
                                                <td className="px-6 py-4 text-right font-black text-indigo-600">{formatCurrency(it.refund_price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">Total Refund Due:</span>
                                <span className="text-3xl font-black text-indigo-700">{formatCurrency(viewReturn.total_refund_amount)}</span>
                            </div>
                        </div>

                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button 
                                onClick={() => setViewReturn(null)} 
                                className="px-6 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-white transition-all"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => { setViewReturn(null); handleAcceptReturn(viewReturn.id); }}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                            >
                                Accept & Adjust Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to handle the Lucide dynamic components
const DynamicIcon = ({ icon: Icon, size = 16 }: { icon: any, size?: number }) => <Icon size={size} />;
