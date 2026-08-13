"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, Package, RefreshCw,
    CheckCircle2, Info, Upload
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { WarehouseSelectionModal } from '@/components/admin/WarehouseSelectionModal';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - PURCHASE EDIT PAGE (amber accent, slate neutrals)
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [purchase, setPurchase] = useState<any>(null);
    const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

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

    const handleUpdate = async (warehouseIdOrEvent?: any) => {
        const warehouseId = typeof warehouseIdOrEvent === 'string' ? warehouseIdOrEvent : undefined;
        if (!purchase) return;

        // If status is RECEIVED and no warehouseId provided yet, show modal
        if (purchase.status === 'RECEIVED' && !purchase.is_inventory_synced && !warehouseId) {
            setIsWarehouseModalOpen(true);
            return;
        }

        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('status', purchase.status);
            if (warehouseId) formData.append('warehouse', warehouseId);

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
            setIsWarehouseModalOpen(false);
            router.push('/admin/purchases');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.detail || 'Update failed';
            toast.error(msg);
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-[1000px] mx-auto px-6 pt-6">
                <PageHeader
                    title="Edit Purchase"
                    subtitle={`Order #${purchase?.purchase_number} • ${purchase?.supplier_name}`}
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Purchases', href: '/admin/purchases' },
                        { label: `Edit #${purchase?.purchase_number}` },
                    ]}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                            <Button variant="primary" onClick={handleUpdate} disabled={isUpdating}>
                                {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    }
                />
            </div>

            <main className="max-w-[1000px] mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Section */}
                        <Card className="p-8 text-left">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
                                <Package size={18} className="text-[#B4780B]" />
                                Order Status
                            </h2>
                            <div className="space-y-4">
                                <label className="block text-[13px] font-bold text-slate-900">Update Progress</label>
                                <select
                                    disabled={purchase.status === 'RECEIVED' && purchase.is_inventory_synced}
                                    value={purchase.status}
                                    onChange={(e) => setPurchase({ ...purchase, status: e.target.value })}
                                    className={inputCls + " cursor-pointer" + (purchase.status === 'RECEIVED' && purchase.is_inventory_synced ? ' ' + ui.inputDisabled : '')}
                                >
                                    <option value="PENDING">Ordered</option>
                                    <option value="PROCESSING">Confirmed</option>
                                    <option value="SHIPPED">In Transit</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="RECEIVED">Received</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                {purchase.status === 'RECEIVED' && (
                                    <div className={`flex items-start gap-2 p-3 rounded-lg text-[12px] ${purchase.is_inventory_synced ? 'bg-slate-50 text-slate-600 border border-slate-200' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                        <Info size={16} className="mt-0.5 shrink-0" />
                                        <p>
                                            {purchase.is_inventory_synced
                                                ? "This order has been received and quantities are synced with inventory. Further changes are restricted."
                                                : "Order is marked as Received, but inventory sync is pending. Saving will trigger the sync process."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Payment Section */}
                        <Card className="p-8 text-left">
                            <h2 className="text-[16px] font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-[#B4780B]" />
                                Payment Verification
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setPurchase({ ...purchase, payment_status: 'PAID' })}
                                    className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all gap-2 ${purchase.payment_status?.toUpperCase() === 'PAID' ? 'bg-[#F59E0B]/10 border-[#F59E0B] ring-1 ring-[#F59E0B]/25' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${purchase.payment_status?.toUpperCase() === 'PAID' ? 'bg-[#F59E0B] border-[#F59E0B]' : 'border-slate-400'}`}>
                                        {purchase.payment_status?.toUpperCase() === 'PAID' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-900">Fully Paid</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPurchase({ ...purchase, payment_status: 'PARTIAL' })}
                                    className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all gap-2 ${purchase.payment_status?.toUpperCase() === 'PARTIAL' ? 'bg-[#F59E0B]/10 border-[#F59E0B] ring-1 ring-[#F59E0B]/25' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${purchase.payment_status?.toUpperCase() === 'PARTIAL' ? 'bg-[#F59E0B] border-[#F59E0B]' : 'border-slate-400'}`}>
                                        {purchase.payment_status?.toUpperCase() === 'PARTIAL' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-900">Partial Payment</span>
                                </button>
                            </div>

                            {(purchase.payment_status?.toUpperCase() === 'PAID' || purchase.payment_status?.toUpperCase() === 'PARTIAL') && (
                                <div className="bg-slate-50/60 border border-slate-200/70 rounded-xl p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-sky-50 border border-sky-100 rounded-lg text-[12px] text-sky-700 font-medium">
                                        <Info size={16} />
                                        Important: Upload the bank transfer slip or receipt below for supplier confirmation.
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-[12px] font-bold text-slate-600">Payment Receipt / Screenshot</label>
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
                                                className="flex flex-col items-center justify-center w-full h-[120px] border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-[#F59E0B] transition-all group"
                                            >
                                                {paymentSlip ? (
                                                    <div className="flex items-center gap-3 text-emerald-600 font-bold text-[14px] bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                                        <CheckCircle size={20} />
                                                        {paymentSlip.name}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-[#F59E0B]/10 group-hover:border-[#F59E0B]/15 transition-colors">
                                                            <Upload size={20} className="text-slate-400 group-hover:text-[#92600A]" />
                                                        </div>
                                                        <span className="text-[12px] font-medium text-slate-500">Drag & drop or <span className="text-[#B4780B] hover:underline">browse files</span></span>
                                                        <span className="text-[10px] text-slate-400">Supported: JPG, PNG, PDF (Max 5MB)</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">Payment Date</label>
                                            <input
                                                type="date"
                                                className={inputCls}
                                                value={purchase.payment_date ? purchase.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                                                onChange={e => setPurchase({ ...purchase, payment_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">Transaction reference</label>
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
                                                    <label className="block text-[12px] font-bold text-slate-600 mb-1.5">Amount Paid Now</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">$</span>
                                                        <input
                                                            type="number"
                                                            className={inputCls + " pl-7"}
                                                            value={purchase.paid_amount || 0}
                                                            onChange={e => setPurchase({ ...purchase, paid_amount: parseFloat(e.target.value) })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[12px] font-bold text-slate-600 mb-1.5">Remaining Balance</label>
                                                    <div className="h-10 px-3.5 border border-slate-200 bg-slate-50 rounded-lg text-[14px] font-bold text-rose-600 flex items-center tabular-nums">
                                                        {formatCurrency((purchase.total_amount || 0) - (purchase.paid_amount || 0))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="col-span-2">
                                            <label className="block text-[12px] font-bold text-slate-600 mb-1.5">Internal Notes</label>
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
                        </Card>
                    </div>

                    {/* Right Sidebar */}
                    <aside className="space-y-6">
                        {/* Order Summary Card */}
                        <Card className="p-6 text-left sticky top-8">
                            <h2 className="text-[14px] font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 uppercase tracking-wider">Purchase Summary</h2>
                            <div className="space-y-4">
                                <div className="space-y-2 pb-4 border-b border-slate-100">
                                    <div className="flex justify-between text-[13px] text-slate-600">
                                        <span>Order Date:</span>
                                        <span className="font-medium text-slate-900">{formatDate(purchase.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] text-slate-600">
                                        <span>Items:</span>
                                        <span className="font-medium text-slate-900">{purchase.items?.length || 0} Product(s)</span>
                                    </div>
                                    <div className="flex justify-between text-[13px] text-slate-600">
                                        <span>Supplier:</span>
                                        <span className="font-medium text-slate-900 truncate max-w-[120px]" title={purchase.supplier_name}>{purchase.supplier_name}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-[15px] font-bold text-slate-900">
                                        <span>Order Total:</span>
                                        <span className="text-[#B4780B] font-black tabular-nums">{formatCurrency(purchase.total_amount)}</span>
                                    </div>
                                    {purchase.payment_confirmed && (
                                        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold uppercase tracking-widest border border-emerald-100">
                                            <CheckCircle2 size={14} />
                                            Supplier Confirmed
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <Button variant="primary" className="w-full" onClick={handleUpdate} disabled={isUpdating}>
                                    {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    Save Record Updates
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                            </div>
                        </Card>

                    </aside>
                </div>
            </main>
            <WarehouseSelectionModal 
                isOpen={isWarehouseModalOpen}
                onClose={() => setIsWarehouseModalOpen(false)}
                onConfirm={(warehouseId) => handleUpdate(warehouseId)}
                loading={isUpdating}
            />
        </div>
    );
}
