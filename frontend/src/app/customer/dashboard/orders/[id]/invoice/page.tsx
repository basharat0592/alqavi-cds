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

export default function CustomerOrderInvoice({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data } = await api.get(`v1/sales/orders/${id}/`);
                setOrder(data);
            } catch (error) {
                console.error("Failed to load order details", error);
                toast.error("Failed to load invoice.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handlePrint = () => { window.print(); };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: `Invoice #${order?.order_number}`, url: url });
            } catch { }
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    if (loading) return <PageLoader />;
    if (!order) return <div className="p-20 text-center font-bold">Invoiced record not found.</div>;

    const items = order.items || [];
    const totalAmount = parseFloat(order.total_amount || '0');

    return (
        <div className="min-h-screen bg-white pb-20 font-sans text-slate-900 selection:bg-amber-100 text-left">

            {/* Integrated Action Bar */}
            <div className="max-w-[850px] mx-auto pt-8 px-4 print:hidden">
                <div className="flex items-center justify-between py-4 border-b border-[#eee]">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] uppercase tracking-wider font-bold">
                        <span className="cursor-pointer hover:text-[#c45500]" onClick={() => router.push('/customer/dashboard')}>Your Account</span>
                        <ChevronRight size={10} />
                        <span className="cursor-pointer hover:text-[#c45500]" onClick={() => router.push('/customer/dashboard/orders')}>Your Orders</span>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Order Invoice</span>
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
                            <Printer size={14} /> Print This Invoice
                        </Btn>
                    </div>
                </div>
            </div>

            {/* Paper Container */}
            <div className="max-w-[850px] mx-auto bg-white p-6 flex flex-col min-h-screen print:min-h-0 print:border-none print:shadow-none print:p-0">

                <InvoiceHeader
                    docTitle="Invoice"
                    metaLines={['Gilgit-Baltistan Distribution']}
                    refLabel="Order No"
                    refValue={order.order_number || String(order.id).split('-')[0]}
                    date={formatDate(order.created_at)}
                />

                {/* Customer & Metadata Grid — compact */}
                <div className="grid grid-cols-3 gap-6 mb-4 px-1 items-start">
                    <div className="col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
                        <p className="text-[15px] font-black text-slate-900 leading-tight">{order.customer_name}</p>
                        {order.phone_number && <p className="text-[12px] font-medium text-slate-600 mt-0.5">{order.phone_number}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                        <p className="text-[12px] font-black uppercase text-slate-900">{order.payment_method || 'Cash on Delivery'}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                                <th className="py-1.5 px-2 w-12 text-center">#</th>
                                <th className="py-1.5 px-3">Product Description</th>
                                <th className="py-1.5 px-3 text-center w-28">Quantity</th>
                                <th className="py-1.5 px-3 text-right w-32">Unit Price</th>
                                <th className="py-1.5 px-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || 0);
                                const qty = item.quantity || 1;
                                const amt = price * qty;
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
                        <p className="text-[11px] text-slate-500 italic max-w-xs leading-relaxed">{order.notes || 'Thank you for shopping with Alqavi Traders.'}</p>
                    </div>
                    <div className="w-[280px] text-[12px] space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-bold uppercase text-[11px]">Subtotal</span>
                            <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(items.reduce((s: number, i: any) => s + (parseFloat(i.price || 0) * (i.quantity || 1)), 0))}</span>
                        </div>
                        {parseFloat(order.shipping_cost || '0') > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Delivery Charges</span>
                                <span className="font-bold text-slate-700 tabular-nums">+{formatCurrency(parseFloat(order.shipping_cost))}</span>
                            </div>
                        )}
                        {parseFloat(order.discount || '0') > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Discount</span>
                                <span className="font-bold text-rose-600 tabular-nums">-{formatCurrency(parseFloat(order.discount))}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-900 font-black uppercase text-[12px]">Total Amount</span>
                            <span className="font-black text-indigo-600 text-[16px] tabular-nums">{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>

                <InvoiceFooter />
            </div>

            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
