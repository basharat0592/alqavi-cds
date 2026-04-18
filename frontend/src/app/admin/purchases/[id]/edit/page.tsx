"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    X, CheckCircle, Package, RefreshCw, ChevronRight, 
    CheckCircle2, Info, Upload, ArrowLeft, Loader2
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PURCHASE EDIT PAGE
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[35px] px-6 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[35px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [purchase, setPurchase] = useState<any>(null);
    const [paymentSlip, setPaymentSlip] = useState<File | null>(null);

    useEffect(() => {
        const fetchPurchase = async () => {
            try {
                const data = await purchaseService.getById(id);
                setPurchase(data);
            } catch (err: any) {
                console.error(err);
                toast.error('Failed to load purchase details');
                router.push('/admin/purchases');
            } finally {
                setLoading(false);
            }
        };
        fetchPurchase();
    }, [id, router]);

    const handleUpdate = async () => {
        if (!purchase) return;
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('status', purchase.status);
            
            if (purchase.status !== 'cancelled') {
                if (purchase.payment_status) formData.append('payment_status', purchase.payment_status.toUpperCase());
                if (purchase.payment_method) formData.append('payment_method', purchase.payment_method.toUpperCase());
                
                if (purchase.payment_status?.toUpperCase() === 'PARTIAL' || purchase.payment_status?.toUpperCase() === 'PAID') {
                    const finalPaid = purchase.payment_status?.toUpperCase() === 'PAID' ? purchase.total_amount : purchase.paid_amount;
                    formData.append('paid_amount', (finalPaid || 0).toString());
                    formData.append('payment_date', purchase.payment_date || new Date().toISOString().slice(0, 10));
                    formData.append('payment_notes', purchase.payment_notes || '');
                    if (purchase.transaction_id) formData.append('transaction_id', purchase.transaction_id);
                    if (paymentSlip) formData.append('payment_slip', paymentSlip);
                }
            }
            
            await purchaseService.update(id, formData);
            toast.success('Purchase updated successfully');
            router.push('/admin/purchases');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Update failed';
            toast.error(msg);
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1000px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <Link href="/admin/purchases" className="hover:text-[#c45500] hover:underline">Purchases</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Edit #{purchase?.purchase_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft size={20} className="text-[#565959]" />
                            </button>
                            <div>
                                <h1 className="text-[22px] font-normal text-[#111]">Edit Purchase Record</h1>
                                <p className="text-[13px] text-[#565959] mt-0.5">Order #{purchase?.purchase_number} • {purchase?.supplier_name}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => router.back()} className="text-[13px] font-bold text-[#565959] hover:underline px-4">Cancel</button>
                            <Btn onClick={handleUpdate} loading={isUpdating}>Save Changes</Btn>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-[1000px] mx-auto px-6 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Section */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-8 shadow-sm text-left">
                            <h2 className="text-[16px] font-bold mb-6 flex items-center gap-2">
                                <Package size={18} className="text-[#c45500]" />
                                Order Status
                            </h2>
                            <div className="space-y-4">
                                <label className="block text-[13px] font-bold text-[#111]">Update Progress</label>
                                <select
                                    disabled={purchase.status === 'RECEIVED' && purchase.is_inventory_synced}
                                    value={purchase.status}
                                    onChange={(e) => setPurchase({ ...purchase, status: e.target.value })}
                                    className={inputCls + " h-[40px] cursor-pointer" + (purchase.status === 'RECEIVED' && purchase.is_inventory_synced ? ' bg-gray-50 opacity-70' : '')}
                                >
                                    <option value="PENDING">Ordered</option>
                                    <option value="PROCESSING">Confirmed</option>
                                    <option value="SHIPPED">In Transit</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="RECEIVED">Received</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                {purchase.status === 'RECEIVED' && (
                                    <div className={`flex items-start gap-2 p-3 rounded-[4px] text-[12px] ${purchase.is_inventory_synced ? 'bg-gray-50 text-[#565959]' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                        <Info size={16} className="mt-0.5 shrink-0" />
                                        <p>
                                            {purchase.is_inventory_synced
                                                ? "This order has been received and quantities are synced with inventory. Further changes are restricted."
                                                : "Order is marked as Received, but inventory sync is pending. Saving will trigger the sync process."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Section */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-8 shadow-sm text-left">
                            <h2 className="text-[16px] font-bold mb-6 flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-[#c45500]" />
                                Payment Verification
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button 
                                    type="button"
                                    onClick={() => setPurchase({ ...purchase, payment_status: 'PAID' })}
                                    className={`flex flex-col items-center justify-center p-4 border rounded-[4px] transition-all gap-2 ${purchase.payment_status?.toUpperCase() === 'PAID' ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-200 shadow-inner' : 'bg-white border-[#ddd] hover:bg-[#f7f8fa]'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${purchase.payment_status?.toUpperCase() === 'PAID' ? 'bg-[#c45500] border-[#c45500]' : 'border-gray-400'}`}>
                                        {purchase.payment_status?.toUpperCase() === 'PAID' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[13px] font-bold">Fully Paid</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPurchase({ ...purchase, payment_status: 'PARTIAL' })}
                                    className={`flex flex-col items-center justify-center p-4 border rounded-[4px] transition-all gap-2 ${purchase.payment_status?.toUpperCase() === 'PARTIAL' ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-200 shadow-inner' : 'bg-white border-[#ddd] hover:bg-[#f7f8fa]'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${purchase.payment_status?.toUpperCase() === 'PARTIAL' ? 'bg-[#c45500] border-[#c45500]' : 'border-gray-400'}`}>
                                        {purchase.payment_status?.toUpperCase() === 'PARTIAL' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[13px] font-bold">Partial Payment</span>
                                </button>
                            </div>

                            {(purchase.payment_status?.toUpperCase() === 'PAID' || purchase.payment_status?.toUpperCase() === 'PARTIAL') && (
                                <div className="bg-[#fcfdff] border border-[#eee] rounded-[4px] p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded text-[12px] text-blue-700 font-medium">
                                        <Info size={16} />
                                        Important: Upload the bank transfer slip or receipt below for supplier confirmation.
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-[12px] font-bold text-[#565959]">Payment Receipt / Screenshot</label>
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                id="payment-slip"
                                                className="hidden" 
                                                accept="image/*,application/pdf"
                                                onChange={(e) => setPaymentSlip(e.target.files?.[0] || null)}
                                            />
                                            <label 
                                                htmlFor="payment-slip"
                                                className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 hover:border-orange-400 transition-all group"
                                            >
                                                {paymentSlip ? (
                                                    <div className="flex items-center gap-3 text-emerald-600 font-bold text-[14px] bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                                        <CheckCircle size={20} />
                                                        {paymentSlip.name}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                                                            <Upload size={20} className="text-gray-400 group-hover:text-orange-500" />
                                                        </div>
                                                        <span className="text-[12px] font-medium text-gray-500">Drag & drop or <span className="text-[#007185] hover:underline">browse files</span></span>
                                                        <span className="text-[10px] text-[#aaa]">Supported: JPG, PNG, PDF (Max 5MB)</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-[#565959] mb-1.5">Payment Date</label>
                                            <input 
                                                type="date" 
                                                className={inputCls} 
                                                value={purchase.payment_date ? purchase.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10)} 
                                                onChange={e => setPurchase({ ...purchase, payment_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-[#565959] mb-1.5">Transaction reference</label>
                                            <input 
                                                type="text" 
                                                className={inputCls} 
                                                placeholder="e.g. Bank Ref #, Check #"
                                                value={purchase.transaction_id || ''} 
                                                onChange={e => setPurchase({ ...purchase, transaction_id: e.target.value })}
                                            />
                                        </div>

                                        {purchase.payment_status?.toUpperCase() === 'PARTIAL' && (
                                            <>
                                                <div>
                                                    <label className="block text-[12px] font-bold text-[#565959] mb-1.5">Amount Paid Now</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa] text-[13px]">$</span>
                                                        <input 
                                                            type="number" 
                                                            className={inputCls + " pl-7"} 
                                                            value={purchase.paid_amount || 0} 
                                                            onChange={e => setPurchase({ ...purchase, paid_amount: parseFloat(e.target.value) })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[12px] font-bold text-[#565959] mb-1.5">Remaining Balance</label>
                                                    <div className="h-[35px] px-3 border border-[#ddd] bg-[#f7f8fa] rounded-[3px] text-[14px] font-bold text-red-600 flex items-center shadow-sm">
                                                        {formatCurrency((purchase.total_amount || 0) - (purchase.paid_amount || 0))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        
                                        <div className="col-span-2">
                                            <label className="block text-[12px] font-bold text-[#565959] mb-1.5">Internal Notes</label>
                                            <textarea 
                                                className={inputCls + " h-[80px] py-3 resize-none"} 
                                                placeholder="Enter any additional payment details for records..."
                                                value={purchase.payment_notes || ''} 
                                                onChange={e => setPurchase({ ...purchase, payment_notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <aside className="space-y-6">
                        {/* Order Summary Card */}
                        <div className="bg-white border border-[#ddd] rounded-[4px] p-6 shadow-sm text-left sticky top-8">
                            <h2 className="text-[14px] font-bold text-[#111] border-b border-[#eee] pb-3 mb-4 uppercase tracking-wider">Purchase Summary</h2>
                            <div className="space-y-4">
                                <div className="space-y-2 pb-4 border-b border-[#eee]">
                                    <div className="flex justify-between text-[13px] text-[#565959]">
                                        <span>Order Date:</span>
                                        <span className="font-medium text-[#111]">{formatDate(purchase.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] text-[#565959]">
                                        <span>Items:</span>
                                        <span className="font-medium text-[#111]">{purchase.items?.length || 0} Product(s)</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] text-[#565959]">
                                        <span>Supplier:</span>
                                        <span className="font-medium text-[#111] truncate max-w-[120px]" title={purchase.supplier_name}>{purchase.supplier_name}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[15px] font-bold text-[#111]">
                                        <span>Order Total:</span>
                                        <span className="text-[#c45500] font-black">{formatCurrency(purchase.total_amount)}</span>
                                    </div>
                                    {purchase.payment_confirmed && (
                                        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold uppercase tracking-widest border border-emerald-100">
                                            <CheckCircle2 size={14} />
                                            Supplier Confirmed
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-8 space-y-3">
                                <Btn className="w-full h-[40px]" onClick={handleUpdate} loading={isUpdating}>
                                    Save Record Updates
                                </Btn>
                                <button 
                                    onClick={() => router.back()}
                                    className="w-full h-[40px] text-[13px] font-bold text-[#565959] hover:bg-gray-50 rounded-[4px] border border-[#ddd] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>

                    </aside>
                </div>
            </main>
        </div>
    );
}
