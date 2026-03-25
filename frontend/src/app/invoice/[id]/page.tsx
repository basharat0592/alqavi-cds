'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Download, Share2, Check } from 'lucide-react';

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await orderService.getById(id);
                setOrder(data);
            } catch (error) {
                console.error("Failed to load order", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Invoice #${order?.order_number || ''}`,
                    text: 'View invoice details online.',
                    url: url,
                });
            } catch (err) {
                console.error('Share failed', err);
            }
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-[#FF9900]/20 border-t-[#FF9900] rounded-full animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <h2 className="text-xl font-black text-gray-900 mb-2">Order Not Found</h2>
                <button
                    onClick={() => router.push('/admin/sales')}
                    className="text-[#FF9900] hover:underline font-bold text-sm flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Sales
                </button>
            </div>
        );
    }

    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name
        ? `${c.first_name} ${c.last_name || ''}`.trim()
        : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

    const items = order.items || [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price || item.unit_price || 0) * (item.quantity || 1)), 0);
    // Assuming 0 tax for now unless defined in backend
    const tax = 0;
    const total = parseFloat(order.total_amount || '0');

    return (
        <div className="min-h-screen bg-white py-10 px-6 font-sans text-[#111]">
            {/* Action Bar - Hidden in print */}
            <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between print:hidden border-b pb-6">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-xs uppercase tracking-widest"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Home
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-gray-500 hover:text-black font-bold text-xs uppercase tracking-widest"
                    >
                        {shared ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Share2 className="w-3.5 h-3.5" />}
                        {shared ? 'Link Copied' : 'Share'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5" /> Print Invoice
                    </button>
                </div>
            </div>

            {/* Invoice Container */}
            <div className="max-w-3xl mx-auto bg-white print:w-full">
                
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 border-2 border-black flex items-center justify-center p-1 font-black text-[10px] leading-tight text-center">
                                AQT<br/>TRADE
                            </div>
                            <h1 className="text-xl font-black tracking-tighter uppercase">AL-QAVI TRADES</h1>
                        </div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest space-y-1">
                            <p>Customs Made Easy</p>
                            <p>International Logistics & Supply</p>
                            <p>Email: support@aqt-trades.com</p>
                        </div>
                    </div>
                    <div className="sm:text-right">
                        <h2 className="text-3xl font-black tracking-tighter uppercase mb-4">INVOICE</h2>
                        <div className="text-[11px] font-bold uppercase tracking-widest space-y-1">
                            <p className="text-gray-400">Invoice Number</p>
                            <p className="text-black mb-2">#{order.order_number || String(order.id).toUpperCase()}</p>
                            <p className="text-gray-400">Date Issued</p>
                            <p className="text-black">{formatDate(order.created_at)}</p>
                        </div>
                    </div>
                </div>

                {/* Billing Details */}
                <div className="grid grid-cols-2 gap-8 mb-12 pt-8 border-t border-gray-100">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Billed To</h4>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-black uppercase">{customerName}</p>
                            {c?.email && <p className="text-xs text-gray-500 font-medium">{c.email}</p>}
                            {c?.phone && <p className="text-xs text-gray-500 font-medium">{c.phone}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Order Status</h4>
                        <div className="space-y-1">
                            <p className={`text-xs font-black uppercase ${order.status === 'delivered' ? 'text-green-600' : 'text-black'}`}>
                                {order.status}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Payment: {order.payment_status || 'Unpaid'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="mb-12">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-black">Description</th>
                                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-center text-black">Qty</th>
                                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right text-black">Unit</th>
                                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right text-black">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 italic font-medium">
                            {items.map((item: any, i: number) => (
                                <tr key={i} className="text-xs">
                                    <td className="py-4 font-black not-italic text-black">{item.product_name || item.name || `Product ${i + 1}`}</td>
                                    <td className="py-4 text-center text-gray-500">{item.quantity || 1}</td>
                                    <td className="py-4 text-right text-gray-500">{formatCurrency(parseFloat(item.price || item.unit_price || 0))}</td>
                                    <td className="py-4 text-right font-black not-italic text-black">{formatCurrency((parseFloat(item.price || item.unit_price || 0) * (item.quantity || 1)))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Calculations */}
                <div className="flex justify-end pt-6 border-t border-black">
                    <div className="w-64 space-y-3 font-bold text-xs uppercase tracking-widest">
                        <div className="flex justify-between text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 pb-3 border-b border-gray-100">
                            <span>Tax (0%)</span>
                            <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-black text-black pt-2">
                            <span>Total Amount</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="mt-24 pt-12 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-8 opacity-60 grayscale hover:grayscale-0 transition-all">
                    <div className="max-w-xs">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2">Terms & Conditions</p>
                        <p className="text-[9px] font-medium leading-relaxed">Please make payment within 30 days of issuance. Goods once sold are typically non-refundable unless specified.</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 italic">Authorized Signature</p>
                        <div className="w-32 h-0.5 bg-black/20 mt-8 ml-auto"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
