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
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-8 font-sans">
            {/* Action Bar - Hidden in print */}
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
                <button
                    onClick={() => router.push('/admin/sales')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-sm bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 transition-all hover:shadow-md"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 font-bold text-sm px-4 py-2 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
                    >
                        {shared ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                        {shared ? 'Copied Link' : 'Share'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-[#FF9900] text-gray-900 font-black text-sm px-5 py-2 rounded-xl shadow-sm hover:shadow-md hover:bg-[#e68a00] transition-all"
                    >
                        <Download className="w-4 h-4" /> Print / Download
                    </button>
                </div>
            </div>

            {/* Invoice A4 Container */}
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-none sm:rounded-2xl overflow-hidden tracking-tight print:shadow-none print:w-full print:max-w-none">

                {/* Header Section */}
                <div className="px-8 sm:px-12 py-10 bg-gradient-to-r from-[#131921] to-[#1a222c] text-white flex flex-col sm:flex-row items-center justify-between gap-6 print:bg-white print:text-gray-900">
                    <div className="flex items-center gap-5">
                        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(255,153,0,0.2)] border-2 border-[#FF9900]/30 overflow-hidden shrink-0 print:border-gray-300 print:shadow-none">
                            <img src="/logo.png" alt="AQT Logo" className="w-full h-full object-contain rounded-full" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('bg-gray-100') }} />
                            <span className="hidden w-full h-full items-center justify-center text-[#FF9900] font-black text-xs text-center leading-tight [img:not([style*='display: none'])_~_&]:hidden">AQT<br />LOGO</span>
                        </div>
                        <div className="text-center sm:text-left">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-[#FF9900] mb-1">AQT AL-QAVI TRADES</h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest print:text-gray-500">Customs Made Easy</p>
                        </div>
                    </div>
                    <div className="text-center sm:text-right">
                        <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">INVOICE</h2>
                        <p className="text-sm font-medium text-gray-300 print:text-gray-600">
                            No. #<span className="font-bold">{order.order_number || String(order.id).toUpperCase()}</span>
                        </p>
                        <p className="text-sm font-medium text-gray-300 print:text-gray-600">
                            Date: <span className="font-bold">{formatDate(order.created_at)}</span>
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <div className="px-8 sm:px-12 py-10 grid grid-cols-1 sm:grid-cols-2 gap-10 border-b border-gray-100">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] mb-3">Bill To</p>
                        <h3 className="text-lg font-black text-gray-900 mb-1">{customerName}</h3>
                        {c?.email && <p className="text-sm text-gray-500 font-medium mb-1">{c.email}</p>}
                        {c?.phone && <p className="text-sm text-gray-500 font-medium">{c.phone}</p>}
                    </div>
                    <div className="sm:text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] mb-3">Payment Info</p>
                        {order.status !== 'cancelled' && (
                            <p className="text-sm text-gray-500 font-medium mb-1">
                                Status: <span className="font-bold text-gray-900 uppercase">{order.payment_status || 'Pending'}</span>
                            </p>
                        )}
                        <p className="text-sm text-gray-500 font-medium mb-1">
                            Order Status: <span className={`font-bold uppercase ${order.status === 'delivered' ? 'text-green-600' : 'text-gray-900'}`}>{order.status}</span>
                        </p>
                    </div>
                </div>

                {/* Items Table Section */}
                <div className="px-8 sm:px-12 py-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-900">
                                    <th className="py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest w-1/2">Description</th>
                                    <th className="py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                                    <th className="py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                                    <th className="py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item: any, i: number) => (
                                    <tr key={i} className="text-sm font-medium hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 font-black text-gray-900 pr-4">
                                            {item.product_name || item.name || `Product ${i + 1}`}
                                        </td>
                                        <td className="py-4 text-center text-gray-600">
                                            {item.quantity || 1}
                                        </td>
                                        <td className="py-4 text-right text-gray-600">
                                            {formatCurrency(parseFloat(item.price || item.unit_price || 0))}
                                        </td>
                                        <td className="py-4 text-right font-black text-gray-900">
                                            {formatCurrency((parseFloat(item.price || item.unit_price || 0) * (item.quantity || 1)))}
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-400 italic font-medium">No items found for this order.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals Section */}
                <div className="px-8 sm:px-12 py-10 bg-gray-50 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6 print:bg-transparent">
                    <div className="w-full sm:w-1/2 text-sm text-gray-500 font-medium">
                        <p className="mb-1 font-bold text-gray-900">Terms & Conditions</p>
                        <p className="text-xs">Payment is due within 30 days. Please make checks payable to AQT AL-QAVI TRADES. Thank you for your business.</p>
                    </div>
                    <div className="w-full sm:w-[320px] space-y-3">
                        <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold text-gray-600 pb-3 border-b border-gray-200">
                            <span>Tax (0%)</span>
                            <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-black text-[#FF9900]">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="px-8 sm:px-12 py-6 bg-[#131921] text-center print:bg-white print:border-t print:border-gray-200 print:text-center print:w-full border-t border-gray-200 block text-white/50 print:text-gray-500">
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                        AQT AL-QAVI TRADES • Customs Made Easy • Contact: support@aqt-trades.com
                    </p>
                </div>
            </div>
        </div>
    );
}
