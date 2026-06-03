"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';
import { PageHeader, Button } from '@/components/admin/ui';
import toast from 'react-hot-toast';

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await orderService.getById(id);
                setOrder(data);
            } catch (error) {
                console.error("Failed to load order", error);
            } finally {
                setLoading(false);
                // Auto-print if query param is present
                if (window.location.search.includes('print=true')) {
                    setTimeout(() => window.print(), 800);
                }
            }
        };
        fetchOrder();
    }, [id]);

    const handlePrint = () => { window.print(); };

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdatingStatus(true);
        try {
            await orderService.update(order!.id, { status: newStatus.toUpperCase() });
            setOrder({ ...order!, status: newStatus.toUpperCase() });
            toast.success('Status updated');
        } catch { toast.error('Update failed'); } finally { setUpdatingStatus(false); }
    };

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
    if (!order) return <div className="p-20 text-center font-bold">Order not found.</div>;

    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || 'Guest');
    const customerCell = c?.phone || c?.phone_number || 'N/A';
    const items = order.items || [];
    const totalAmount = parseFloat(order.total_amount || '0');

    return (
        <div className="min-h-screen bg-white pb-20 font-sans text-[#111] selection:bg-indigo-100 text-left">

            {/* Integrated Action Bar */}
            <div className="max-w-[850px] mx-auto pt-8 px-4 print:hidden">
                <PageHeader
                    title="Sales Invoice"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sales Invoice' }]}
                    className="mb-0 pb-6 border-b border-slate-100"
                    actions={
                        <>
                            <Button variant="outline" size="sm" onClick={() => router.back()}>
                                <ArrowLeft size={14} /> Back
                            </Button>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                            <select
                                value={(order.status || '').toLowerCase()}
                                onChange={(e) => handleUpdateStatus(e.target.value)}
                                disabled={updatingStatus || (order.status || '').toUpperCase() === 'DELIVERED'}
                                className={`h-8 px-3 border border-slate-200 rounded-lg text-[12.5px] font-semibold outline-none cursor-pointer bg-white hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all disabled:opacity-60
                                    ${(order.status || '').toUpperCase() === 'DELIVERED' ? 'text-emerald-700' : 'text-slate-700'}`}
                            >
                                {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                            <Button variant="outline" size="sm" onClick={handleShare}>
                                {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                                {shared ? 'Copied' : 'Share'}
                            </Button>
                            <Button variant="primary" size="sm" onClick={handlePrint}>
                                <Printer size={14} /> Print
                            </Button>
                        </>
                    }
                />
            </div>

            {/* Paper Container */}
            <div className="max-w-[850px] mx-auto bg-white p-8 print:border-none print:shadow-none print:p-0">

                {/* Visual Header */}
                <div className="flex justify-between items-start mb-12">
                    <div className="w-1/3">
                        <Logo size="lg" className="!items-start" />
                    </div>

                    <div className="w-1/3 text-center">
                        <h1 className="text-[34px] font-bold leading-[1.8] mb-1 text-[#111] urdu-text">
                            القوی ٹریڈرز
                        </h1>
                        <p className="text-[12px] font-bold text-[#565959] uppercase tracking-widest urdu-text">
                            کاسمیٹکس ڈیلر گلگت بلتستان
                        </p>
                    </div>

                    <div className="w-1/3 text-right">
                        <h2 className="text-[20px] font-black uppercase tracking-tighter text-[#111]">Invoice</h2>
                        <div className="text-[12px] text-gray-500 mt-2 space-y-0.5 font-medium">
                            <p>Syed Sakhawat & Associates</p>
                            <p>0313-8692190 | 0335-1240190</p>
                        </div>
                        <p className="text-[14px] text-[#111] font-bold mt-4 tracking-tight">Invoice No: {order.order_number || order.id.toString().split('-')[0]}</p>
                        <p className="text-[12px] text-[#565959] font-medium">{formatDate(order.created_at)}</p>
                    </div>
                </div>

                {/* 2. Customer & Metadata Grid */}
                <div className="grid grid-cols-4 gap-8 mb-16">
                    <div className="col-span-2">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Billing Details</h3>
                        <p className="text-[18px] font-black text-black leading-none">{customerName}</p>
                        {order.market && <p className="text-[13px] text-[#565959] mt-2 font-bold">{order.market}</p>}
                        <p className="text-[13px] font-medium text-black mt-1">{customerCell}</p>
                        <p className="text-[11px] text-gray-400 mt-2 w-64 leading-relaxed italic">{order.shipping_address || 'Gilgit-Baltistan Distribution Network'}</p>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Financials</h3>
                        <div className="space-y-2">
                            <p className="text-[11px] text-[#565959] font-bold">Payment Method</p>
                            <p className="text-[13px] font-black uppercase text-black">{order.payment_method || 'Cash on Delivery'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Logistics</h3>
                        <div className="space-y-2">
                            <p className="text-[11px] text-[#565959] font-bold">Current Status</p>
                            <div className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                {order.status || 'Verified'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table: Streamlined Distribution Style */}
                <div className="mb-12">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black text-[12px] font-black uppercase tracking-wider text-black bg-gray-50/50">
                                <th className="py-4 px-2 w-12 text-center opacity-40">#</th>
                                <th className="py-4 px-3">Description of Goods</th>
                                <th className="py-4 px-3 text-center w-28">Quantity</th>
                                <th className="py-4 px-3 text-right w-32">Unit Price</th>
                                <th className="py-4 px-3 text-right w-32">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || item.unit_price || 0);
                                const qty = item.quantity || 1;
                                const amt = price * qty;
                                return (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="py-4 px-1 text-center text-gray-400">{i + 1}</td>
                                        <td className="py-4 px-2 font-bold text-[#111]">{item.product_name || item.name}</td>
                                        <td className="py-4 px-2 text-center">{qty}</td>
                                        <td className="py-4 px-2 text-right text-gray-600">{formatCurrency(price)}</td>
                                        <td className="py-4 px-1 text-right font-black text-[#111]">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}
                            {/* Integrated Grand Total Row */}
                            <tr className="border-t-2 border-black font-black text-[#111] bg-gray-50/30">
                                <td colSpan={4} className="py-4 px-2 text-right text-[14px] uppercase tracking-wider">Grand Total</td>
                                <td className="py-4 px-1 text-right text-[16px]">{formatCurrency(totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>


                {/* Urdu Professional Note */}
                <div className="mb-6 px-1">
                    <p className="text-[10px] leading-[2.1] text-justify text-[#444] urdu-text" dir="rtl">
                        <span className="font-black border-b-2 ml-3 text-[14px]">نوٹ:-</span>
                        تمام دکاندار حضرات اس بات کو نوٹ کر لیں جتنی بھی چیزیں القوی ٹریڈرز گلگت سے خریدی ہیں انکو ایکسپائری سے تین مہینے پہلے تبدیل کرنا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیلی کا ذمہ وار نہیں ہوگا۔ نیز امپورٹڈ چیزیں سمیت پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں سامان اور بل میں کمی بیشی ہونے کی صورت میں فورا رابطہ کریں بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کا ذمہ دار نہیں ہوگا۔ آپ کے تعاون کا شکریہ--
                    </p>
                </div>

                {/* 5. Formal Signatures Area */}
                <div className="mt-16 pt-12 border-t-2 border-dashed border-black">
                    <div className="flex justify-between items-start gap-32">
                        <div className="flex-1 space-y-3">
                            <p className="text-[12px] font-bold text-gray-500">Authorized Distribution Signature</p>
                            <div className="w-full border-b border-black pt-8"></div>
                            <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2">Store Manager</p>
                        </div>
                        <div className="flex-1 space-y-3 text-right">
                            <p className="text-[12px] font-bold text-gray-500">Receiver's Confirmation Stamp</p>
                            <div className="w-full border-b border-black pt-8"></div>
                            <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2">Authorized Dealer</p>
                        </div>
                    </div>

                    <div className="mt-16 text-center border-t border-slate-100 pt-6">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">
                            System Generated Professional Copy • Al-Qavi Traders Gilgit
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { padding: 0; margin: 0; background-color: white !important; }
                    .max-w-[850px] { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
                    .PaperContainer { box-shadow: none !important; border: none !important; }
                    @page { margin: 1.5cm; }
                }

                body {
                    font-family: 'Inter', sans-serif;
                }

                .urdu-text {
                    font-family: 'Noto Nastaliq Urdu', serif;
                    font-weight: 700;
                    line-height: 2.4;
                }
            `}</style>
        </div>
    );
}
