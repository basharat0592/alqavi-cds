'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ArrowLeft, RotateCcw, Package, AlertTriangle, 
    CheckCircle2, XCircle, Loader2, FileText,
    Activity, ShieldCheck
} from 'lucide-react';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

const fmtDate = (d: string) => 
    new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

const fmtTime = (d: string) => 
    new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

const fmt = (n: number) => 
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
    WAITING_FOR_SUPPLIER: { label: 'Waiting for Response', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
    pending: { label: 'Waiting for Response', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
    ACCEPTED: { label: 'Return Accepted', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    REJECTED: { label: 'Return Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
    CANCELLED: { label: 'Return Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle },
};

export default function ReturnDetails() {
    const { id } = useParams();
    const router = useRouter();
    const [ret, setRet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/v1/sales/purchase-returns/${id}/`);
            setRet(data);
        } catch (error) {
            console.error("Failed to fetch return details", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const handleAction = async (action: 'accept' | 'reject') => {
        const confirmMsg = action === 'accept' 
            ? "Accept this return? Stock will be automatically adjusted (Deducted from Admin, Added to your catalog)." 
            : "Reject this return request?";
            
        if (!confirm(confirmMsg)) return;

        setActionLoading(true);
        try {
            await api.post(`/v1/sales/purchase-returns/${id}/${action}/`);
            fetchDetail();
        } catch (error: any) {
            alert(error.response?.data?.error || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm font-bold uppercase tracking-widest">Retrieving RMA Data...</span>
        </div>
    );

    if (!ret) return (
        <div className="max-w-[1000px] mx-auto p-10 text-center">
            <h1 className="text-xl font-bold text-slate-800">Return record not found</h1>
            <button onClick={() => router.back()} className="mt-4 text-blue-600 font-bold flex items-center gap-2 justify-center mx-auto">
                <ArrowLeft size={16} /> Go Back
            </button>
        </div>
    );

    const statusObj = STATUS_MAP[ret.status] || { label: ret.status, color: 'bg-gray-100 text-gray-800', icon: Activity };

    return (
        <div className="max-w-[1000px] mx-auto py-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all shadow-sm group"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-slate-900" />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-medium text-slate-900">RMA Details</h1>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
                        Return Number: <span className="text-slate-900 font-black">{ret.return_number}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Details (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Items Section */}
                    <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-slate-600" />
                                <h2 className="text-[15px] font-bold text-slate-900 uppercase tracking-wide">Returned Items List</h2>
                            </div>
                            <span className="text-xs font-bold text-slate-500">{ret.items?.length || 0} Products</span>
                        </div>
                        <div className="p-0">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Refund Price</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ret.items?.map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                                                        <Package className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{item.product_name}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">SKU: 8872-{item.product?.slice(0,6)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-black text-slate-700">{item.quantity}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-medium text-slate-600">{fmt(item.refund_price)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-slate-900">{fmt(item.total_refund)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex justify-between w-64 text-sm font-bold text-slate-500">
                                    <span>Subtotal</span>
                                    <span>{fmt(ret.total_refund_amount)}</span>
                                </div>
                                <div className="flex justify-between w-64 text-sm font-bold text-slate-500 border-b border-gray-200 pb-2">
                                    <span>Tax Reversal</span>
                                    <span>{fmt(0)}</span>
                                </div>
                                <div className="flex justify-between w-64 pt-2">
                                    <span className="text-xs font-black text-slate-900 uppercase">Total Refund</span>
                                    <span className="text-xl font-black text-[#b12704]">{fmt(ret.total_refund_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reason / Notes */}
                    <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-slate-600" />
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Reason for Return</h3>
                        </div>
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 italic text-slate-700 text-sm leading-relaxed">
                            "{ret.reason || 'No specific reason provided by administrator.'}"
                        </div>
                    </div>
                </div>

                {/* Sidebar Info (Right 1/3) */}
                <div className="space-y-6">
                    
                    {/* Status Card */}
                    <div className={cn("border border-transparent rounded-lg p-6 shadow-sm", statusObj.color)}>
                        <div className="flex gap-4 items-center mb-4">
                            <div className="p-2 bg-white/50 rounded-full shadow-inner">
                                <statusObj.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Current Status</p>
                                <h3 className="text-lg font-black leading-tight">{statusObj.label}</h3>
                            </div>
                        </div>
                        <p className="text-xs font-medium opacity-80 leading-relaxed mb-6">
                            Latest Update: {fmtDate(ret.created_at)} at {fmtTime(ret.created_at)}
                        </p>

                        {(ret.status === 'WAITING_FOR_SUPPLIER' || ret.status?.toLowerCase() === 'pending') && (
                            <div className="space-y-3">
                                <button 
                                    disabled={actionLoading}
                                    onClick={() => handleAction('accept')}
                                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-md shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <ShieldCheck size={18} />}
                                    Accept Request
                                </button>
                                <button 
                                    disabled={actionLoading}
                                    onClick={() => handleAction('reject')}
                                    className="w-full bg-white hover:bg-slate-50 text-rose-700 border border-slate-200 font-bold py-3 rounded-md shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    Reject Request
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Meta Info */}
                    <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm space-y-6">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity size={12} /> Reference Details
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500">Purchase Order</p>
                                    <p className="text-sm font-black text-[#007185] hover:underline cursor-pointer">#{ret.purchase_number || 'Direct return'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500">Initiated By</p>
                                    <p className="text-sm font-black text-slate-800">Administrator Console</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500">Requested Date</p>
                                    <p className="text-sm font-black text-slate-800">{ret.return_date ? fmtDate(ret.return_date) : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Support Advisory */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-white shadow-xl">
                        <div className="flex gap-3">
                            <Activity className="h-5 w-5 text-blue-400 shrink-0" />
                            <div>
                                <h4 className="text-[13px] font-bold mb-1 italic text-blue-200">Processing Shield</h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                    When items are accepted, they are instantly returned to your "Manage Inventory" list as sellable stock. Financial reversals will reflect in your next settlement report.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
