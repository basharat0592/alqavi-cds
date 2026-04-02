'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';

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

    if (!order) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
            <h2 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-tight">Order Not Found</h2>
            <button onClick={() => router.push('/admin/sales')} className="px-8 py-3 bg-[#1D4ED8] text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-xl flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Sales
            </button>
        </div>
    );

    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || 'Guest');
    const customerCell = c?.phone || c?.phone_number || 'N/A';
    const items = order.items || [];
    const totalAmount = parseFloat(order.total_amount || '0');
    
    // Formatting date to day - month - year
    const rawDate = new Date(order.created_at);
    const day = rawDate.getDate();
    const month = rawDate.toLocaleString('default', { month: 'long' });
    const year = rawDate.getFullYear();
    const formattedDateStr = `${day} - ${month} - ${year}`;

    return (
        <div className="min-h-screen bg-white py-12 px-6 font-sans text-slate-900 selection:bg-blue-100">
            {/* Action Bar */}
            <div className="max-w-5xl mx-auto mb-10 flex items-center justify-between print:hidden border-b border-slate-100 pb-8">
                <button onClick={() => router.push('/admin/sales')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Sales
                </button>
                <div className="flex items-center gap-6">
                    <button onClick={handleShare} className="flex items-center gap-2 text-slate-500 hover:text-[#1D4ED8] font-bold text-xs uppercase tracking-widest transition-colors">
                        {shared ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                        {shared ? 'Link Copied' : 'Share Link'}
                    </button>
                    <button onClick={handlePrint} className="px-8 py-3 bg-[#1D4ED8] text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-3">
                        <Printer className="w-4 h-4" /> Print Invoice
                    </button>
                </div>
            </div>

            {/* Invoice Container */}
            <div className="max-w-5xl mx-auto bg-white p-2 print:p-0">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-8">
                    {/* Logo Area */}
                    <div className="w-1/3">
                        <Logo size="lg" className="!items-start" />
                    </div>

                    {/* Center Arabic Title */}
                    <div className="w-1/3 text-center">
                        <div className="space-y-1">
                            <h1 className="text-[44px] font-bold leading-none mb-1" style={{ fontFamily: 'noto-sans-arabic, "Segoe UI", Tahoma, sans-serif' }}>
                                القوی ٹریڈرز
                            </h1>
                            <p className="text-[14px] font-medium" style={{ fontFamily: 'noto-sans-arabic, "Segoe UI", Tahoma, sans-serif' }}>
                                کاسمیٹکس ڈیلر گلگت بلتستان
                            </p>
                            <div className="mt-4 inline-block">
                                <h2 className="text-[20px] font-bold border-b-2 border-black inline-block px-1">
                                    Sale Invoice
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* Proprietor Info */}
                    <div className="w-1/3 text-right">
                        <div className="space-y-1 text-[13px]">
                            <p><span className="font-bold">Proprietor:</span></p>
                            <p>Syed Sakhawat & Associates</p>
                            <p>Gilgit Region</p>
                            <p className="mt-2">03138692190</p>
                            <p>03351240190</p>
                            
                            <div className="mt-8 inline-block border-2 border-dashed border-black px-8 py-1 rounded-sm">
                                <span className="text-[12px] font-bold">Page - 1 of 1</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-4 text-[13px]">
                    <div className="flex">
                        <span className="font-bold w-32">Date Invoice:</span>
                        <span>{formattedDateStr}</span>
                    </div>
                    <div></div> {/* Spacer */}
                    
                    <div className="flex">
                        <span className="font-bold w-32">Invoice No:</span>
                        <span>{order.order_number || `S26000${order.id}`}</span>
                    </div>
                    <div></div> {/* Spacer */}

                    <div className="flex">
                        <span className="font-bold w-32">Customer Name:</span>
                        <span className="font-medium underline decoration-1 underline-offset-2">{customerName} {order.market ? `(${order.market})` : ''}</span>
                    </div>
                    <div></div> {/* Spacer */}

                    <div className="flex col-span-2">
                        <div className="flex w-1/2">
                            <span className="font-bold w-32">Customer Cell #:</span>
                            <span className="mr-8">{customerCell}</span>
                            <span className="font-bold w-20">Saleman:</span>
                            <span className="min-w-[100px]">supply</span>
                        </div>
                        <div className="flex w-1/2 justify-end">
                            <span className="font-bold w-36">Saleman Cell #:</span>
                            <span className="w-24">03555433112</span>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="mb-8 border-t-[3px] border-black border-double pt-0.5">
                    <table className="w-full text-left border-collapse border border-black">
                        <thead>
                            <tr className="bg-white text-[12px] font-bold">
                                <th className="border border-black py-1 px-1 text-center w-12">S.No</th>
                                <th className="border border-black py-1 px-1 text-center w-16">PID</th>
                                <th className="border border-black py-1 px-2">Product Name</th>
                                <th className="border border-black py-1 px-1 text-center w-12">Qty</th>
                                <th className="border border-black py-1 px-1 text-center w-12">Bon</th>
                                <th className="border border-black py-1 px-2 text-right w-20">TP</th>
                                <th className="border border-black py-1 px-2 text-right w-20">Retail</th>
                                <th className="border border-black py-1 px-1 text-center w-16">Disc%</th>
                                <th className="border border-black py-1 px-2 text-right w-20">Amt</th>
                                <th className="border border-black py-1 px-2 text-right w-24">Net Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-[12px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || item.unit_price || 0);
                                const qty = item.quantity || 1;
                                const amt = price * qty;
                                return (
                                    <tr key={i}>
                                        <td className="border border-black py-1 px-1 text-center">{i + 1}</td>
                                        <td className="border border-black py-1 px-1 text-center font-mono">{item.product?.sku || item.product_id || '1000'}</td>
                                        <td className="border border-black py-1 px-2">{item.product_name || item.name}</td>
                                        <td className="border border-black py-1 px-1 text-center">{qty}</td>
                                        <td className="border border-black py-1 px-1 text-center">0</td>
                                        <td className="border border-black py-1 px-2 text-right">{price.toFixed(2)}</td>
                                        <td className="border border-black py-1 px-2 text-right">{(price * 1.2).toFixed(2)}</td>
                                        <td className="border border-black py-1 px-1 text-center">0.00</td>
                                        <td className="border border-black py-1 px-2 text-right">{amt.toFixed(2)}</td>
                                        <td className="border border-black py-1 px-2 text-right font-bold">{amt.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                            {/* Empty rows to maintain length if needed, or just padding */}
                            {[...Array(Math.max(0, 10 - items.length))].map((_, idx) => (
                                <tr key={`empty-${idx}`} className="h-6">
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                    <td className="border border-black"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Section */}
                <div className="flex justify-between mt-12 items-end">
                    <div className="w-1/2">
                        <div className="space-y-1 text-[11px] font-medium italic">
                            <p>* Goods once sold will not be returned or exchanged.</p>
                            <p>* Check your goods carefully before courier.</p>
                        </div>
                    </div>
                    <div className="w-1/3">
                        <div className="flex justify-between border-b-2 border-black pb-1 mb-6">
                            <span className="font-bold text-[14px]">Grand Total:</span>
                            <span className="font-bold text-[18px]">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="mt-20 border-t border-black pt-1 text-center">
                            <p className="text-[12px] font-bold">Authorized Signature</p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { padding: 0; margin: 0; }
                    .max-w-5xl { max-width: 100% !important; border: none !important; }
                    @page { margin: 1cm; }
                }
                
                @font-face {
                    font-family: 'noto-sans-arabic';
                    src: url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
                }
            `}</style>
        </div>
    );
}
