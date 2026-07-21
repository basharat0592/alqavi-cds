"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check, ChevronRight } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[31px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
        </button>
    );
};

export default function SupplierInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [purchase, setPurchase] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);

    useEffect(() => {
        const fetchPurchase = async () => {
            try {
                // Suppliers can only view their own purchases
                const { data } = await api.get(`v1/sales/purchases/${id}/`);
                setPurchase(data);
            } catch (error) {
                console.error("Failed to load purchase details", error);
                toast.error("Failed to load invoice.");
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
                await navigator.share({ title: `Settlement #${purchase?.purchase_number}`, url: url });
            } catch { }
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    if (loading) return <PageLoader />;
    if (!purchase) return <div className="p-20 text-center font-bold">Invoiced record not found.</div>;

    const items = purchase.items || [];
    const totalAmount = parseFloat(purchase.total_amount || '0');
    const paidAmount = parseFloat(purchase.paid_amount || '0');
    const balance = Math.max(0, totalAmount - paidAmount);

    return (
        <div className="min-h-screen bg-white pb-20 font-sans text-slate-900 selection:bg-amber-100 text-left">

            {/* Integrated Action Bar */}
            <div className="max-w-[850px] mx-auto pt-8 px-4 print:hidden">
                <div className="flex items-center justify-between py-4 border-b border-[#eee]">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] uppercase tracking-wider font-bold">
                        <span className="cursor-pointer hover:text-[#c45500]" onClick={() => router.push('/supplier/dashboard')}>Supplier Hub</span>
                        <ChevronRight size={10} />
                        <span className="cursor-pointer hover:text-[#c45500]" onClick={() => router.push('/supplier/payments')}>Payments</span>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Invoice View</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Btn variant="secondary" onClick={() => router.back()}>
                            <ArrowLeft size={14} /> Back
                        </Btn>
                        <Btn variant="secondary" onClick={handleShare}>
                            {shared ? <Check size={14} className="text-green-600" /> : <Share2 size={14} />}
                            {shared ? 'Link Copied' : 'Share Invoice'}
                        </Btn>
                        <Btn onClick={handlePrint}>
                            <Printer size={14} /> Print This Statement
                        </Btn>
                    </div>
                </div>
            </div>

            {/* Paper Container */}
            <div className="max-w-[850px] mx-auto bg-white p-6 flex flex-col min-h-screen print:min-h-0 print:border-none print:shadow-none print:p-0">

                <InvoiceHeader
                    docTitle="Payment Receipt"
                    metaLines={['Supplier Settlement']}
                    refLabel="Statement No"
                    refValue={purchase.purchase_number || String(purchase.id).split('-')[0]}
                    date={formatDate(purchase.order_date || purchase.created_at)}
                />

                {/* Supplier & Metadata Grid — compact */}
                <div className="grid grid-cols-3 gap-6 mb-4 px-1 items-start">
                    <div className="col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Supplier</p>
                        <p className="text-[15px] font-black text-slate-900 leading-tight">{purchase.supplier_name}</p>
                        {purchase.supplier_phone && <p className="text-[12px] font-medium text-slate-600 mt-0.5">{purchase.supplier_phone}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-[12px] font-black uppercase text-slate-900">{(purchase.payment_status || 'Unpaid').replace('_', ' ')}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                                <th className="py-1.5 px-2 w-12 text-center">#</th>
                                <th className="py-1.5 px-3">Supplied Items</th>
                                <th className="py-1.5 px-3 text-center w-28">Quantity</th>
                                <th className="py-1.5 px-3 text-right w-32">Unit Price</th>
                                <th className="py-1.5 px-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || 0);
                                const qty = item.quantity || 1;
                                const amt = item.subtotal || (price * qty);
                                return (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-1 text-center text-slate-400 tabular-nums">{i + 1}</td>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 whitespace-nowrap">{item.product_name}</td>
                                        <td className="py-1.5 px-3 text-center tabular-nums">{qty}</td>
                                        <td className="py-1.5 px-3 text-right text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                                        <td className="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary: notes (left) + totals (right) */}
                <div className="flex justify-between items-start gap-6 mb-6">
                    <div className="flex-1 pt-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                        <p className="text-[11px] text-slate-500 italic max-w-xs leading-relaxed">{purchase.notes || 'Billed against wholesale delivery contract.'}</p>
                    </div>
                    <div className="w-[280px] text-[12px] space-y-2">
                        <div className="flex justify-between items-center pt-1 border-t-2 border-slate-300">
                            <span className="text-slate-900 font-black uppercase text-[13px]">Total Amount</span>
                            <span className="font-black text-indigo-600 text-[17px] tabular-nums">{formatCurrency(totalAmount)}</span>
                        </div>
                        {paidAmount > 0 && (
                            <div className="flex justify-between pt-1">
                                <span className="text-emerald-600 font-bold uppercase text-[11px]">Total Paid</span>
                                <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</span>
                            </div>
                        )}
                        {balance > 0 && (
                            <div className="flex justify-between">
                                <span className="text-rose-600 font-black uppercase text-[11px]">Remaining Balance</span>
                                <span className="font-black text-rose-600 tabular-nums">{formatCurrency(balance)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <InvoiceFooter />
            </div>

            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
