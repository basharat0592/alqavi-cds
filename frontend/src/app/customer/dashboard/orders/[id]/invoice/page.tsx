"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check, ChevronRight, Hash, Calendar, Phone, MapPin, Package, CheckCircle2 } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - CUSTOMER ORDER INVOICE
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
        <div className="min-h-screen bg-white pb-20 font-sans text-[#111] selection:bg-amber-100 text-left">

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
                            کسٹمر انوائس ریکارڈ
                        </p>
                    </div>

                    <div className="w-1/3 text-right">
                        <h2 className="text-[24px] font-black uppercase tracking-tighter text-[#111]">Invoice</h2>
                        <p className="text-[14px] text-[#111] font-bold mt-4 tracking-tight">Order #: {order.order_number}</p>
                        <p className="text-[12px] text-[#565959] font-medium">Date: {formatDate(order.created_at)}</p>
                    </div>
                </div>

                {/* 2. Customer & Status Grid */}
                <div className="grid grid-cols-3 gap-8 mb-16 px-1">
                    <div className="col-span-2">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Customer & Delivery</h3>
                        <p className="text-[18px] font-black text-black leading-none">{order.customer_name}</p>
                        <div className="flex items-start gap-2 mt-4">
                            <MapPin size={14} className="text-gray-400 mt-0.5" />
                            <p className="text-[13px] text-[#565959] font-medium leading-relaxed italic">{order.shipping_address || order.notes || 'No address provided'}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 font-bold text-[13px]">
                            <Phone size={14} className="text-gray-400" />
                            <span>{order.phone_number || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Order Status</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest mb-1">State</p>
                                <span className={cn(
                                    "inline-block px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-sm",
                                    order.status === 'DELIVERED' ? 'bg-emerald-600' : 
                                    order.status === 'CANCELLED' ? 'bg-rose-600' : 'bg-[#FFD814] text-black'
                                )}>
                                    {order.status_display || order.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest mb-1">Payment</p>
                                <p className="text-[12px] font-black text-black uppercase tracking-widest">{order.payment_method || 'Cash on Delivery'}</p>
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
                                <th className="py-4 px-3">Product Description</th>
                                <th className="py-4 px-3 text-center w-28">Quantity</th>
                                <th className="py-4 px-3 text-right w-32">Unit Price</th>
                                <th className="py-4 px-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || 0);
                                const qty = item.quantity || 1;
                                const amt = price * qty;
                                return (
                                    <tr key={i} className="hover:bg-gray-50/50 border-b border-[#eee]">
                                        <td className="py-4 px-1 text-center text-gray-400">{i + 1}</td>
                                        <td className="py-4 px-3 font-bold text-[#111]">
                                            {item.product_name}
                                        </td>
                                        <td className="py-4 px-3 text-center font-bold text-slate-700">{qty}</td>
                                        <td className="py-4 px-3 text-right text-gray-600">Rs. {price.toLocaleString()}</td>
                                        <td className="py-4 px-3 text-right font-black text-[#111]">Rs. {amt.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                            
                            {/* Calculation Area */}
                            <tr className="border-t-2 border-black">
                                <td colSpan={3} className="pt-8"></td>
                                <td className="py-2 text-right text-[12px] font-bold text-gray-500 uppercase">Subtotal</td>
                                <td className="py-2 text-right font-black text-[#111]">Rs. {totalAmount.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-gray-50/50">
                                <td colSpan={3} className="py-4 px-3 italic text-[11px] text-gray-400">
                                    Notes: {order.notes || 'Thank you for shopping with Al-Qavi Traders!'}
                                </td>
                                <td className="py-4 px-3 text-right text-[14px] font-black uppercase tracking-wider text-black">Grand Total</td>
                                <td className="py-4 px-3 text-right text-[22px] font-black text-[#B12704]">Rs. {totalAmount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signature Block */}
                <div className="mt-24 pt-12 border-t-2 border-dashed border-black">
                    <div className="flex justify-between items-start gap-32">
                        <div className="flex-1 space-y-3 text-center">
                            <p className="text-[11px] font-bold text-gray-400 uppercase">Received By</p>
                            <div className="w-full border-b border-black pt-10"></div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-black pt-2">{order.customer_name}</p>
                        </div>
                        <div className="flex-1 space-y-3 text-center">
                            <p className="text-[11px] font-bold text-gray-400 uppercase">Authorized Signature</p>
                            <div className="w-full border-b border-black pt-10"></div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-black pt-2">Gilgit Distribution Desk</p>
                        </div>
                    </div>

                    <div className="mt-20 text-center border-t border-slate-100 pt-6">
                        <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.5em]">
                            This is a computer generated invoice • Al-Qavi Traders Gilgit
                        </p>
                    </div>
                </div>
            </div>

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
