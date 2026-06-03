"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check, Hash, Calendar, Phone, Mail, Building2, Package, CheckCircle2 } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { PageHeader, Card, Button, Badge } from '@/components/admin/ui';

export default function PurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [purchase, setPurchase] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        const fetchPurchase = async () => {
            try {
                const data = await purchaseService.getById(id);
                setPurchase(data);
            } catch (error) {
                console.error("Failed to load purchase details", error);
                toast.error("Failed to load record.");
            } finally {
                setLoading(false);
            }
        };
        fetchPurchase();
    }, [id]);

    const handlePrint = () => { window.print(); };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: `Purchase Order #${purchase?.purchase_number}`, url: url });
            } catch { }
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    if (loading) return <PageLoader />;
    if (!purchase) return <div className="p-20 text-center font-bold text-slate-900">Purchase record not found.</div>;

    const items = purchase.items || [];
    const totalAmount = parseFloat(purchase.total_amount || '0');
    const paidAmount = parseFloat(purchase.paid_amount || '0');
    const balance = totalAmount - paidAmount;

    return (
        <div className="pb-20 font-sans text-slate-900 text-left">

            {/* Integrated Action Bar */}
            <div className="max-w-[850px] mx-auto pt-2 px-4 print:hidden">
                <PageHeader
                    title="Purchase Invoice"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Purchases', href: '/admin/purchases' },
                        { label: 'Purchase Invoice' },
                    ]}
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={() => router.back()}>
                                <ArrowLeft size={14} /> Back
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleShare}>
                                {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                                {shared ? 'Copied' : 'Share Link'}
                            </Button>
                            <Button variant="primary" size="sm" onClick={handlePrint}>
                                <Printer size={14} /> Print Purchase Order
                            </Button>
                        </>
                    }
                />
            </div>

            {/* Paper Container */}
            <Card className="max-w-[850px] mx-auto p-8 print:border-none print:shadow-none print:rounded-none print:p-0">

                {/* Visual Header */}
                <div className="flex justify-between items-start mb-12">
                    <div className="w-1/3">
                        <Logo size="lg" className="!items-start" />
                    </div>

                    <div className="w-1/3 text-center">
                        <h1 className="text-[34px] font-bold leading-[1.8] mb-1 text-slate-900 urdu-text">
                            القوی ٹریڈرز
                        </h1>
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest urdu-text">
                            کاسمیٹکس اسٹوک سپلائی
                        </p>
                    </div>

                    <div className="w-1/3 text-right">
                        <h2 className="text-[20px] font-black uppercase tracking-tighter text-slate-900">Purchase Order</h2>
                        <div className="text-[12px] text-slate-500 mt-2 space-y-0.5 font-medium">
                            <p>Distributor: Al-Qavi Traders Gilgit</p>
                            <p>Warehouse: {purchase.warehouse_name || 'Main Warehouse'}</p>
                        </div>
                        <p className="text-[14px] text-slate-900 font-bold mt-4 tracking-tight">PO No: {purchase.purchase_number}</p>
                        <p className="text-[12px] text-slate-500 font-medium">{formatDate(purchase.order_date || purchase.created_at)}</p>
                    </div>
                </div>

                {/* 2. Supplier & Metadata Grid */}
                <div className="grid grid-cols-4 gap-8 mb-16 px-1">
                    <div className="col-span-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest border-b border-slate-100 pb-1">Supplier Information</h3>
                        <p className="text-[18px] font-black text-slate-900 leading-none">{purchase.supplier_name}</p>
                        {purchase.supplier_company && <p className="text-[13px] text-slate-500 mt-2 font-bold">{purchase.supplier_company}</p>}
                        <p className="text-[13px] font-medium text-slate-900 mt-1">{purchase.supplier_phone || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400 mt-2 w-64 leading-relaxed italic">{purchase.supplier_address || 'Verified Wholesale Partner'}</p>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest border-b border-slate-100 pb-1">Order Status</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">State</p>
                                <Badge tone="indigo">{purchase.status || 'ORDERED'}</Badge>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Payment</p>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    purchase.payment_status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'
                                )}>
                                    {purchase.payment_status || 'UNPAID'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest border-b border-slate-100 pb-1">Reception</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Inventory Sync</p>
                                {purchase.is_inventory_synced ? (
                                    <div className="flex items-center justify-end gap-1 text-emerald-600 font-black text-[10px] uppercase">
                                        <CheckCircle2 size={12} /> Synced to Stock
                                    </div>
                                ) : (
                                    <div className="flex justify-end">
                                        <Badge tone="amber">Pending Sync</Badge>
                                    </div>
                                )}
                            </div>
                            {purchase.reference_number && (
                                <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Ext Ref</p>
                                    <p className="text-[12px] font-bold text-slate-900">{purchase.reference_number}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <div className="mb-12">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                                <th className="py-4 px-2 w-12 text-center">#</th>
                                <th className="py-4 px-3">Item Description</th>
                                <th className="py-4 px-3 text-center w-28">Quantity</th>
                                <th className="py-4 px-3 text-right w-32">Unit Cost</th>
                                <th className="py-4 px-3 text-right w-32">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || 0);
                                const qty = item.quantity || 1;
                                const amt = item.subtotal || (price * qty);
                                return (
                                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                                        <td className="py-4 px-1 text-center text-slate-400 tabular-nums">{i + 1}</td>
                                        <td className="py-4 px-3 font-bold text-slate-900">
                                            {item.product_name}
                                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">Packaging: {item.packaging_type?.toLowerCase()}</div>
                                        </td>
                                        <td className="py-4 px-3 text-center font-bold text-emerald-600 tabular-nums">{qty}</td>
                                        <td className="py-4 px-3 text-right text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                                        <td className="py-4 px-3 text-right font-black text-slate-900 tabular-nums">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}

                            {/* Totals Section */}
                            <tr className="border-t-2 border-slate-300">
                                <td colSpan={3} className="pt-8"></td>
                                <td className="py-2 text-right text-[12px] font-bold text-slate-500 uppercase">Subtotal</td>
                                <td className="py-2 text-right font-black text-slate-900 tabular-nums">{formatCurrency(totalAmount - (purchase.shipping_cost || 0) - (purchase.tax_amount || 0))}</td>
                            </tr>
                            {purchase.shipping_cost > 0 && (
                                <tr>
                                    <td colSpan={3}></td>
                                    <td className="py-2 text-right text-[12px] font-bold text-slate-500 uppercase">Shipping Fees</td>
                                    <td className="py-2 text-right font-black text-slate-900 tabular-nums">{formatCurrency(purchase.shipping_cost)}</td>
                                </tr>
                            )}
                            <tr className="bg-slate-50/60">
                                <td colSpan={3} className="py-4 px-3 italic text-[11px] text-slate-400">
                                    Notes: {purchase.notes || 'Bulk stock replenishment order.'}
                                </td>
                                <td className="py-4 px-3 text-right text-[14px] font-black uppercase tracking-wider text-slate-900">Total Amount</td>
                                <td className="py-4 px-3 text-right text-[18px] font-black text-indigo-600 tabular-nums">{formatCurrency(totalAmount)}</td>
                            </tr>

                            {/* Payment Status Row */}
                            <tr className="border-t border-slate-100">
                                <td colSpan={3}></td>
                                <td className="py-2 text-right text-[12px] font-bold text-emerald-600 uppercase">Total Paid</td>
                                <td className="py-2 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</td>
                            </tr>
                            {balance > 0 && (
                                <tr>
                                    <td colSpan={3}></td>
                                    <td className="py-2 text-right text-[12px] font-black text-rose-600 uppercase italic">Remaining Balance</td>
                                    <td className="py-2 text-right font-black text-rose-600 tabular-nums">{formatCurrency(balance)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Terms Area */}
                <div className="mt-12 mb-6 px-1 border-l-4 border-indigo-600 pl-5">
                    <p className="text-[12px] font-bold text-slate-900 uppercase mb-1">Company Settlement Policy</p>
                    <p className="text-[10px] leading-relaxed text-slate-500 max-w-lg">
                        This purchase order is subject to the standard procurement terms of Al-Qavi Traders. Payment settlements reach finality only upon verification of bank transfer or physical receipt by the finance department. Please include PO #{purchase.purchase_number} in all payment references.
                    </p>
                </div>

                {/* Formal Signatures Area */}
                <div className="mt-16 pt-12 border-t-2 border-dashed border-slate-200">
                    <div className="flex justify-between items-start gap-32">
                        <div className="flex-1 space-y-3 text-center">
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Supplier Confirmation</p>
                            <div className="w-full border-b border-slate-300 pt-10"></div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 pt-2">Authorized Sign/Stamp</p>
                        </div>
                        <div className="flex-1 space-y-3 text-center">
                            <p className="text-[11px] font-bold text-slate-400 uppercase">Company Audit Verification</p>
                            <div className="w-full border-b border-slate-300 pt-10"></div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 pt-2">Gilgit Finance Desk</p>
                        </div>
                    </div>

                    <div className="mt-20 text-center border-t border-slate-100 pt-6">
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.5em]">
                            Global Professional Standard • Internal Procurement Document
                        </p>
                    </div>
                </div>
            </Card>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { padding: 0 !important; margin: 0 !important; background-color: white !important; }
                    .max-w-[850px] { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
                    @page { margin: 1cm; }
                }

                body { font-family: 'Inter', sans-serif; }
                .urdu-text { font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700; line-height: 2.1; }
            `}</style>
        </div>
    );
}
