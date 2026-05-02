'use client';

import { useState, useEffect, Fragment } from 'react';
import { Package, RefreshCw, ChevronRight, Search, AlertCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { authService, User as AuthUser } from '@/lib/auth';
import { salesService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CustomerReturnsPage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [returnToDelete, setReturnToDelete] = useState<any>(null);
    const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);

    const loadReturns = () => {
        setLoading(true);
        salesService.getReturns()
            .then(setReturns)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        setUser(authService.getUser());
        loadReturns();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await salesService.deleteReturn(id);
            toast.success('Return request deleted');
            loadReturns();
        } catch {
            toast.error('Failed to delete return request');
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl font-normal text-[#111]">Your Returns</h1>
                    <p className="text-sm text-gray-600 mt-1">View and track your return requests.</p>
                </div>
                <Link href="/customer/dashboard/returns/add" className="h-[42px] px-6 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-bold text-[#111] flex items-center justify-center transition-all shadow-sm active:scale-[0.98]">
                    Request New Return
                </Link>
            </div>

            {returns.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border border-[#D5D9D9]">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-[#111]">No recent return requests.</h3>
                    <p className="text-sm text-gray-600 mt-2 mb-6">If you need to return an item, go to your orders and select the item you'd like to return.</p>
                    <Link href="/customer/dashboard/orders" className="inline-block px-10 py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-medium text-[#111] transition-all shadow-sm">
                        Go to Your Orders
                    </Link>
                </div>
            ) : (
                <div className="bg-white border border-[#D5D9D9] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F0F2F2] border-b border-[#D5D9D9] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Return ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4 text-right">Refund Value</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D5D9D9]">
                            {returns.map((ret) => (
                                <Fragment key={ret.id}>
                                    <tr className={`hover:bg-gray-50 transition-colors group ${expandedReturnId === ret.id ? 'bg-gray-50' : ''}`}>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                                            {formatDateTime(ret.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#111]">
                                            {ret.return_number}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${
                                                ret.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                ret.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {ret.status_display || ret.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600 max-w-xs truncate" title={ret.reason}>
                                                {ret.reason}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-[#B12704] text-right">
                                            Rs. {(ret.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                            <button 
                                                onClick={() => setExpandedReturnId(expandedReturnId === ret.id ? null : ret.id)}
                                                className="text-xs font-bold text-[#007185] hover:text-[#C45500] hover:underline"
                                            >
                                                {expandedReturnId === ret.id ? 'Hide' : 'Details'}
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setReturnToDelete(ret);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedReturnId === ret.id && (
                                        <tr className="bg-white border-t border-[#D5D9D9]">
                                            <td colSpan={6} className="px-12 py-8">
                                                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-[15px] font-bold text-[#111] mb-1">Return Information</h4>
                                                            <p className="text-xs text-gray-500">Order ID: {ret.order_tracking_id || 'N/A'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs font-bold text-gray-500 uppercase">Grand Total</span>
                                                            <p className="text-lg font-bold text-[#B12704]">Rs. {(ret.items?.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid md:grid-cols-2 gap-10">
                                                        <div className="bg-[#fcfdff] p-5 rounded-lg border border-[#eee]">
                                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Reason for Return</p>
                                                            <p className="text-sm text-[#111] leading-relaxed font-medium italic">"{ret.reason}"</p>
                                                            {ret.notes && (
                                                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Customer Notes</p>
                                                                    <p className="text-sm text-gray-600 leading-relaxed">{ret.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Items in this Request</p>
                                                            <div className="space-y-2">
                                                                {ret.items?.map((item: any, i: number) => (
                                                                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                                                        <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center border border-gray-100 shrink-0">
                                                                            <Package size={18} className="text-gray-300" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-bold text-[#111]">{item.product_name}</p>
                                                                            <p className="text-[11px] text-gray-500">Qty: {item.quantity} × Rs. {parseFloat(item.price).toLocaleString()}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-bold text-[#111]">Rs. {(item.quantity * parseFloat(item.price)).toLocaleString()}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl scale-in-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <Package className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Return?</h3>
                        <p className="text-sm text-gray-500 text-center mb-8">
                            Are you sure you want to delete return request <span className="font-bold text-gray-900">#{returnToDelete?.return_number}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (returnToDelete) {
                                        await handleDelete(returnToDelete.id);
                                        setIsDeleteModalOpen(false);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
