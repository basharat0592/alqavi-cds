"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check, ChevronRight, Hash, Calendar, Phone, Mail, Building2, Package, CheckCircle2 } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SUPPLIER SETTLEMENT INVOICE
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
    const balance = totalAmount - paidAmount;

    return (
        <div className="min-h-screen bg-white pb-20 font-sans text-[#111] selection:bg-amber-100 text-left">

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
                            سپلائر سیٹلمنٹ ریکارڈ
                        </p>
                    </div>

                    <div className="w-1/3 text-right">
                        <h2 className="text-[20px] font-black uppercase tracking-tighter text-[#111]">Supplier Statement</h2>
                        <div className="text-[12px] text-gray-500 mt-2 space-y-0.5 font-medium text-left ml-auto w-fit">
                            <p>To: {purchase.supplier_name}</p>
                            <p>ID: #{purchase.supplier_id || 'PARTNER'}</p>
                        </div>
                        <p className="text-[14px] text-[#111] font-bold mt-4 tracking-tight">Statement No: {purchase.purchase_number}</p>
                        <p className="text-[12px] text-[#565959] font-medium">{formatDate(purchase.order_date || purchase.created_at)}</p>
                    </div>
                </div>

                {/* 2. Partner & Bill Grid */}
                <div className="grid grid-cols-4 gap-8 mb-16 px-1">
                    <div className="col-span-2">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Billed To (Distributor)</h3>
                        <p className="text-[18px] font-black text-black leading-none">Al-Qavi Traders Gilgit</p>
                        <p className="text-[13px] text-[#565959] mt-2 font-bold select-none whitespace-nowrap overflow-hidden">Cosmetic Distribution & Supply Chain Network</p>
                        <p className="text-[13px] font-medium text-black mt-1">0313-8692190</p>
                        <p className="text-[11px] text-gray-400 mt-2 w-64 leading-relaxed italic">Delivery Destination: {purchase.warehouse_name || 'Main Transit Hub'}</p>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Payment Status</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest mb-1">State</p>
                                <span className={cn(
                                    "inline-block px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-sm",
                                    purchase.status === 'RECEIVED' ? 'bg-emerald-600' : 'bg-black'
                                )}>
                                    {purchase.status || 'ORDERED'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest mb-1">Settlement</p>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    purchase.payment_status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'
                                )}>
                                    {purchase.payment_status?.replace('_', ' ') || 'UNPAID'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-[10px] font-black text-[#bbb] uppercase mb-4 tracking-widest border-b border-[#eee] pb-1">Financial Check</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest mb-1">Confirmed</p>
                                {purchase.payment_confirmed ? (
                                    <div className="flex items-center justify-end gap-1 text-emerald-600 font-black text-[10px] uppercase">
                                        <CheckCircle2 size={12} /> Payment Verified
                                    </div>
                                ) : (
                                    <div className="text-amber-600 font-bold text-[10px] uppercase italic">Verification Pending</div>
                                )}
                            </div>
                            {purchase.transaction_id && (
                                <div>
                                    <p className="text-[9px] text-[#565959] font-bold uppercase tracking-widest mb-1">TxID</p>
                                    <p className="text-[12px] font-bold text-black truncate max-w-[120px] ml-auto">{purchase.transaction_id}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <div className="mb-12">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black text-[12px] font-black uppercase tracking-wider text-black bg-gray-50/50">
                                <th className="py-4 px-2 w-12 text-center opacity-40">#</th>
                                <th className="py-4 px-3">Supplied Items</th>
                                <th className="py-4 px-3 text-center w-28">Qty</th>
                                <th className="py-4 px-3 text-right w-32">Unit Price</th>
                                <th className="py-4 px-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[14px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || 0);
                                const qty = item.quantity || 1;
                                const amt = item.subtotal || (price * qty);
                                return (
                                    <tr key={i} className="hover:bg-gray-50/50 border-b border-[#eee]">
                                        <td className="py-4 px-1 text-center text-gray-400">{i + 1}</td>
                                        <td className="py-4 px-3 font-bold text-[#111]">
                                            {item.product_name}
                                            <div className="text-[10px] font-medium text-gray-400 mt-0.5 uppercase tracking-tighter">{item.packaging_type}</div>
                                        </td>
                                        <td className="py-4 px-3 text-center font-bold text-slate-700">{qty}</td>
                                        <td className="py-4 px-3 text-right text-gray-600">{formatCurrency(price)}</td>
                                        <td className="py-4 px-3 text-right font-black text-[#111]">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}
                            
                            {/* Calculation Area */}
                            <tr className="border-t-2 border-black">
                                <td colSpan={3} className="pt-8"></td>
                                <td className="py-2 text-right text-[12px] font-bold text-gray-500 uppercase">Subtotal</td>
                                <td className="py-2 text-right font-black text-[#111]">{formatCurrency(totalAmount - (purchase.shipping_cost || 0) - (purchase.tax_amount || 0))}</td>
                            </tr>
                            <tr className="bg-gray-50/50">
                                <td colSpan={3} className="py-4 px-3 italic text-[11px] text-gray-400">
                                    Notes: {purchase.notes || 'Billed against wholesale delivery contract.'}
                                </td>
                                <td className="py-4 px-3 text-right text-[14px] font-black uppercase tracking-wider text-black">Total Invoiced</td>
                                <td className="py-4 px-3 text-right text-[18px] font-black text-[#c45500]">{formatCurrency(totalAmount)}</td>
                            </tr>

                            {/* Payment Summary */}
                            <tr className="border-t border-[#eee]">
                                <td colSpan={3}></td>
                                <td className="py-2 text-right text-[12px] font-bold text-emerald-600 uppercase">Settled Amount</td>
                                <td className="py-2 text-right font-bold text-emerald-600">{formatCurrency(paidAmount)}</td>
                            </tr>
                            {balance > 0 && (
                                <tr>
                                    <td colSpan={3}></td>
                                    <td className="py-2 text-right text-[12px] font-black text-rose-600 uppercase">Balance Receivable</td>
                                    <td className="py-2 text-right font-black text-rose-600">{formatCurrency(balance)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Signature Block */}
                <div className="mt-24 pt-12 border-t-2 border-dashed border-black">
                    <div className="flex justify-between items-start gap-32">
                        <div className="flex-1 space-y-3 text-center">
                            <p className="text-[11px] font-bold text-gray-400 uppercase">Payment Billed By</p>
                            <div className="w-full border-b border-black pt-10"></div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-black pt-2">{purchase.supplier_name}</p>
                        </div>
                        <div className="flex-1 space-y-3 text-center">
                            <p className="text-[11px] font-bold text-gray-400 uppercase">Finance Approval</p>
                            <div className="w-full border-b border-black pt-10"></div>
                            <p className="text-[12px] font-black uppercase tracking-widest text-black pt-2">Gilgit Disbursement Desk</p>
                        </div>
                    </div>

                    <div className="mt-20 text-center border-t border-slate-100 pt-6">
                        <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.5em]">
                            System Verified Statement • Al-Qavi Supplier Hub
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
