"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, Share2, Check, ChevronRight, Hash, Calendar, Phone, Mail } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PUBLIC INVOICE (Complete Synchronization)
   ───────────────────────────────────────────────────────────────────────────── */

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

export default function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
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
        navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        toast.success('Link copied to clipboard');
    };

    if (loading) return <PageLoader />;
    if (!order) return <div className="p-20 text-center font-bold text-red-600">Order not found.</div>;

    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || 'Guest');
    const customerCell = c?.phone || c?.phone_number || 'N/A';
    const items = order.items || [];
    const totalAmount = parseFloat(order.total_amount || '0');

    return (
        <div className="min-h-screen bg-white pb-20 font-sans text-[#111] selection:bg-amber-100 text-left">
            
            {/* Integrated Action Bar (Transparent Style) */}
            <div className="max-w-[850px] mx-auto pt-8 px-4 print:hidden">
                <div className="flex items-center justify-between py-4 border-b border-[#eee]">
                    <div className="flex items-center gap-1 text-[11px] text-[#565959] uppercase tracking-wider font-bold">
                        <span className="cursor-pointer hover:text-[#c45500]">Dashboard</span>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Sale Invoice</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`h-[31px] px-4 rounded-[3px] text-[12px] font-bold border border-[#adb1b8] bg-[#f7f8fa] flex items-center justify-center
                            ${(order.status || '').toUpperCase() === 'DELIVERED' ? 'text-green-700 bg-green-50' : 'text-[#c45500]'}`}>
                            {order.status || 'Verified'}
                        </div>
                        <div className="h-6 w-[1px] bg-[#eee] mx-1"></div>
                        <Btn variant="secondary" onClick={handleShare}>
                            {shared ? <Check size={14} className="text-green-600" /> : <Share2 size={14} />}
                            {shared ? 'Copied' : 'Share'}
                        </Btn>
                        <Btn onClick={handlePrint}>
                            <Printer size={14} /> Print
                        </Btn>
                    </div>
                </div>
            </div>

            {/* Paper Container */}
            <div className="max-w-[850px] mx-auto bg-white p-12 print:border-none print:shadow-none print:p-0 overflow-hidden">
                
                {/* 1. Header Section: Corporate Identity */}
                <div className="flex justify-between items-end mb-16 pb-8 border-b-2 border-black">
                    <div className="w-1/3">
                        <Logo size="lg" className="!items-start" />
                    </div>

                    <div className="w-1/3 text-center">
                        <h1 className="text-[38px] font-black leading-tight text-black urdu-text">
                            القوی ٹریڈرز
                        </h1>
                        <p className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] urdu-text">
                            Cosmetics Dealer | Gilgit-Baltistan
                        </p>
                    </div>

                    <div className="w-1/3 text-right">
                        <h2 className="text-[28px] font-serif italic text-black leading-none mb-2">Invoice</h2>
                        <p className="text-[14px] font-black text-black">Doc No: {order.order_number}</p>
                        <p className="text-[12px] text-gray-500 font-bold">{formatDate(order.created_at)}</p>
                    </div>
                </div>

                {/* 2. Information Grid */}
                <div className="grid grid-cols-4 gap-8 mb-16">
                    <div className="col-span-2">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Billing Details</h3>
                        <p className="text-[18px] font-black text-black leading-none">{customerName}</p>
                        <p className="text-[13px] font-medium text-black mt-2">{customerCell}</p>
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
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Verification</h3>
                        <div className="space-y-2">
                            <p className="text-[11px] text-[#565959] font-bold">Document Status</p>
                            <div className="inline-block px-3 py-1 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                                Official Valid Copy
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
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
                        <tbody className="text-[14px] divide-y divide-[#eee]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || item.unit_price || 0);
                                const qty = item.quantity || 1;
                                const amt = price * qty;
                                return (
                                    <tr key={i}>
                                        <td className="py-4 px-1 text-center text-gray-400">{i + 1}</td>
                                        <td className="py-4 px-2 font-bold text-[#111]">{item.product_name || item.name}</td>
                                        <td className="py-4 px-2 text-center">{qty}</td>
                                        <td className="py-4 px-2 text-right text-gray-600">{formatCurrency(price)}</td>
                                        <td className="py-4 px-1 text-right font-black text-[#111]">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}
                            <tr className="border-t-2 border-black font-black text-[#111] bg-gray-50/30">
                                <td colSpan={4} className="py-4 px-3 text-right text-[14px] uppercase tracking-wider">Grand Total Amount</td>
                                <td className="py-4 px-3 text-right text-[18px] text-[#B12704]">{formatCurrency(totalAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 4. Note Area */}
                <div className="mt-8">
                    <p className="text-[11px] leading-[2.1] text-justify text-[#444] urdu-text" dir="rtl">
                        <span className="font-black border-b-2 ml-3 text-[14px]">نوٹ:-</span>
                         تمام دکاندار حضرات اس بات کو نوٹ کر لیں جتنی بھی چیزیں القوی ٹریڈرز گلگت سے خریدی ہیں انکو ایکسپائری سے تین مہینے پہلے تبدیل کرنا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیلی کا ذمہ وار نہیں ہوگا۔ نیز امپورٹڈ چیزیں سمیت پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں سامان اور بل میں کمی بیشی ہونے کی صورت میں فورا رابطہ کریں بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کا ذمہ دار نہیں ہوگا۔ آپ کے تعاون کا شکریہ
                    </p>
                </div>

                {/* 5. Formal Signatures Area */}
                <div className="mt-16 pt-12 border-t-2 border-dashed border-black">
                    <div className="flex justify-between items-start gap-32">
                        <div className="flex-1 space-y-3">
                            <p className="text-[12px] font-bold text-gray-500">Authorized Distribution Signature</p>
                            <div className="w-full border-b border-black pt-8"></div>
                            <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2">Manager Signature</p>
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
                @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@1,400;1,700&display=swap');
                
                @media print {
                    .print\\:hidden { display: none !important; }
                    body { padding: 0 !important; margin: 0 !important; background-color: white !important; }
                    .max-w-[850px] { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
                    @page { margin: 1cm; }
                }

                body {
                    font-family: 'Inter', sans-serif;
                }

                .urdu-text {
                    font-family: 'Noto Nastaliq Urdu', serif;
                    font-weight: 700;
                    line-height: 2.2;
                }
                
                .font-serif {
                    font-family: 'Playfair Display', serif;
                }
            `}</style>
        </div>
    );
}
