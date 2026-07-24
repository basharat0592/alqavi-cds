"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   BULK PURCHASE-INVOICE PRINT — opened in the SAME tab from the purchase-history
   bulk bar (?ids=1,2,3). Renders every selected purchase as its own invoice
   page (page-break between), then auto-opens the print dialog once.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Package } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { Button } from '@/components/admin/ui';

function InvoicePaper({ purchase }: { purchase: any }) {
    const lineItems: any[] = purchase.items || [];
    const totalAmount = parseFloat(purchase.total_amount || '0');
    const paidAmount = parseFloat(purchase.paid_amount || '0');
    const balance = totalAmount - paidAmount;

    return (
        <div className="invoice-paper bg-white max-w-[850px] mx-auto p-6 pt-3 flex flex-col text-slate-900">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="w-1/3">
                    <img src="/images/invoice-logo.png" alt="Alqavi Traders" className="h-11 w-auto object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/logo.png'; }} />
                    <p className="text-[12px] font-black text-emerald-700 tracking-wide mt-1">Alqavi Traders</p>
                </div>
                <div className="w-1/3 text-center">
                    <h1 className="text-[19px] font-bold text-slate-900 urdu-text mb-1.5" style={{ lineHeight: 2 }}>القوی ٹریڈرز</h1>
                    <p className="text-[9px] font-bold text-slate-500 tracking-widest urdu-text" style={{ lineHeight: 1.6 }}>کاسمیٹکس ڈیلر گلگت بلتستان</p>
                </div>
                <div className="w-1/3 text-right">
                    <h2 className="text-[15px] font-black uppercase tracking-tighter text-slate-900">Purchase Order</h2>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">
                        <p>Distributor: Al-Qavi Traders Gilgit</p>
                        <p>Warehouse: {purchase.warehouse_name || 'Main Warehouse'}</p>
                    </div>
                    <p className="text-[12px] text-slate-900 font-bold mt-1 tracking-tight">PO No: {purchase.purchase_number}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{formatDate(purchase.order_date || purchase.created_at)}</p>
                </div>
            </div>

            {/* Items */}
            <div className="mb-6">
                <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                    <thead>
                        <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                            <th className="py-1.5 px-2 w-12 text-center">#</th>
                            <th className="py-1.5 px-3">Item Description</th>
                            <th className="py-1.5 px-3 text-center w-28">Quantity</th>
                            <th className="py-1.5 px-3 text-right w-32">Unit Cost</th>
                            <th className="py-1.5 px-3 text-right w-32">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="text-[13px]">
                        {lineItems.map((item: any, i: number) => {
                            const price = parseFloat(item.price || 0);
                            const qty = item.quantity || 1;
                            const units = item.total_units ?? (item.packaging_type === 'CARTON' ? qty * (item.items_per_carton || 1) : qty);
                            const amt = item.subtotal ?? (price * units);
                            return (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="py-1.5 px-1 text-center text-slate-400 tabular-nums">{i + 1}</td>
                                    <td className="py-1.5 px-3 font-bold text-slate-900">
                                        <span>{item.product_name}</span>
                                        <span className="text-[9px] font-medium text-slate-400 ml-1.5">({item.packaging_type?.toLowerCase()})</span>
                                        {item.company_name && <div className="text-[9px] font-semibold text-slate-400">{item.company_name}</div>}
                                    </td>
                                    <td className="py-1.5 px-3 text-center font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                                        {item.packaging_type === 'CARTON'
                                            ? <span>{units} pcs <span className="text-[10px] font-medium text-slate-400">({qty} ctn × {item.items_per_carton || 1})</span></span>
                                            : qty}
                                    </td>
                                    <td className="py-1.5 px-3 text-right text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                                    <td className="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums">{formatCurrency(amt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="flex justify-between items-start gap-6 mb-6">
                <div className="flex-1 pt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                    <p className="text-[11px] text-slate-500 italic max-w-xs leading-relaxed">{purchase.notes || 'Bulk stock replenishment order.'}</p>
                </div>
                <div className="w-[280px] text-[12px] space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-500 font-bold uppercase text-[11px]">Subtotal</span>
                        <span className="font-black text-slate-900 tabular-nums">{formatCurrency(totalAmount - (purchase.shipping_cost || 0) - (purchase.tax_amount || 0))}</span>
                    </div>
                    {purchase.shipping_cost > 0 && (
                        <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[11px]">Shipping Fees</span><span className="font-black text-slate-900 tabular-nums">{formatCurrency(purchase.shipping_cost)}</span></div>
                    )}
                    {purchase.tax_amount > 0 && (
                        <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-[11px]">Tax</span><span className="font-black text-slate-900 tabular-nums">{formatCurrency(purchase.tax_amount)}</span></div>
                    )}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-slate-300">
                        <span className="text-slate-900 font-black uppercase text-[13px]">Total Amount</span>
                        <span className="font-black text-indigo-600 text-[17px] tabular-nums">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-1"><span className="text-emerald-600 font-bold uppercase text-[11px]">Total Paid</span><span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</span></div>
                    {balance > 0 && (
                        <div className="flex justify-between"><span className="text-rose-600 font-black uppercase text-[11px]">Remaining Balance</span><span className="font-black text-rose-600 tabular-nums">{formatCurrency(balance)}</span></div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-6 print-exact">
                <div className="flex items-stretch mb-2 overflow-hidden print-exact" style={{ height: '46px' }}>
                    <div className="text-white flex items-center justify-center px-6 print-exact" style={{ backgroundColor: '#0f172a', clipPath: 'polygon(16% 0, 100% 0, 100% 100%, 16% 100%, 0 50%)' }}>
                        <span className="text-[8px] font-bold urdu-text whitespace-nowrap">قاضی مارکیٹ CMH روڈ خومر گلگت</span>
                    </div>
                    <div className="text-white flex-1 flex items-center justify-center gap-3 print-exact" style={{ backgroundColor: '#1e293b' }}>
                        <span className="inline-block w-2 h-2 rotate-45 print-exact" style={{ backgroundColor: '#1d4ed8' }}></span>
                        <span className="text-[8.5px] font-bold urdu-text">مشہور اور با اعتماد ملکی وغیر ملکی کاسمیٹکس کا مرکز</span>
                        <span className="inline-block w-2 h-2 rotate-45 print-exact" style={{ backgroundColor: '#1d4ed8' }}></span>
                    </div>
                    <div className="text-white flex items-center justify-center px-6 print-exact" style={{ backgroundColor: '#0f172a', clipPath: 'polygon(0 0, 84% 0, 100% 50%, 84% 100%, 0 100%)' }}>
                        <span className="text-[8px] font-bold urdu-text whitespace-nowrap">ابراہیم مارکیٹ کنفکشن بل سکردو</span>
                    </div>
                </div>

                <div dir="rtl" className="mt-2 mb-8">
                    <p className="text-[9px] text-slate-900 urdu-text text-justify" style={{ lineHeight: 1.9 }}>
                        <span className="font-black">نوٹ:۔ </span>
                        تمام دکاندار حضرات اس بات کو نوٹ کر لیں کہ جتنی بھی چیزیں الْقوی ٹریڈرز گلگت سے خریدی ہیں انہیں ایکسپائری سے تین مہینے پہلے تبدیل کرنا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیل کرنے کی ذمہ دار نہیں ہوگی۔ امپورٹڈ چیزیں بمعہ پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں۔ سامان اور بل میں کسی بھی کمی بیشی کی صورت میں فوراً رابطہ کریں، بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کی ذمہ دار نہیں ہوگی۔ آپ کے تعاون کا شکریہ۔
                    </p>
                </div>

                <div className="flex justify-between items-end mt-10 px-2">
                    <div className="w-44">
                        {purchase.staff_name && <p className="text-[12px] font-bold text-slate-900 mb-1 truncate">{purchase.staff_name}</p>}
                        <div className="border-t border-slate-700 mb-1.5"></div>
                        <span className="text-[13px] font-black text-slate-900">Saleman</span>
                    </div>
                    <div className="w-44 text-right">
                        <div className="border-t border-slate-700 mb-1.5"></div>
                        <span className="text-[13px] font-black text-slate-900">Store Manager</span>
                    </div>
                </div>

                <div className="mt-3 text-center">
                    <p className="text-[8px] text-slate-400 font-medium tracking-wide">
                        Branch 1: Qazi Market, CMH Road, Khomer Gilgit&nbsp;&nbsp;•&nbsp;&nbsp;Branch 2: Ibrahim Market, Confection Bil, Skardu
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function BulkPurchasePrintPage() {
    const router = useRouter();
    const search = useSearchParams();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ids = (search.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) { setLoading(false); return; }
        Promise.all(ids.map(id => purchaseService.getById(id).catch(() => null)))
            .then((rows) => {
                setPurchases(rows.filter(Boolean));
                setLoading(false);
                setTimeout(() => window.print(), 800);
            });
    }, [search]);

    if (loading) return <PageLoader />;
    if (purchases.length === 0) return <div className="p-20 text-center font-bold text-slate-900">No purchases to print.</div>;

    return (
        <div className="pb-20 font-sans text-slate-900 bg-[#f1f5f9] min-h-screen">
            <div className="max-w-[850px] mx-auto pt-4 px-4 flex items-center justify-between print:hidden">
                <h1 className="text-[16px] font-bold text-slate-900">Printing {purchases.length} invoice{purchases.length > 1 ? 's' : ''} — 2 per page (rotated)</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => router.back()}><ArrowLeft size={14} /> Back</Button>
                    <Button variant="primary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print</Button>
                </div>
            </div>

            {/* Each invoice = one independent half-page block; the browser flows two
                per A4 page (2 × 148mm ≤ 297mm), breaking to the next sheet after that. */}
            <div className="py-4">
                {purchases.map((p) => (
                    <div key={p.id} className="half-block">
                        <div className="inv"><InvoicePaper purchase={p} /></div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                body { font-family: 'Inter', sans-serif; }
                .urdu-text { font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700; line-height: 1.5; }
                .print-exact { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                /* Screen preview: simple stacked cards. */
                .half-block { max-width: 860px; margin: 0 auto 20px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(15,23,42,0.08); overflow: hidden; }

                @media print {
                    .print\\:hidden { display: none !important; }
                    body { padding: 0 !important; margin: 0 !important; background: white !important; }
                    @page { size: A4 portrait; margin: 0; }

                    /* Independent half-page block sized to fit two per sheet even with the
                       browser's DEFAULT margins (printable ≈ 190 × 277 mm). break-inside:
                       avoid keeps each whole; two flow onto one sheet, then it breaks. */
                    .half-block {
                        position: relative !important; box-sizing: border-box !important;
                        width: 188mm !important; height: 136mm !important;
                        margin: 0 auto !important; max-width: none !important;
                        background: white !important; border-radius: 0 !important; box-shadow: none !important;
                        overflow: hidden !important;
                        contain: layout paint !important;
                        break-inside: avoid !important; page-break-inside: avoid !important;
                    }

                    /* Invoice laid out A5-portrait, rotated 90° to fill the half-page block
                       (content rotates, page stays portrait). */
                    .inv {
                        position: absolute !important; top: 50% !important; left: 50% !important;
                        box-sizing: border-box !important;
                        width: 130mm !important; height: 184mm !important;
                        transform: translate(-50%, -50%) rotate(90deg);
                        transform-origin: center center;
                        font-size: 6.4px !important;
                    }
                    .invoice-paper {
                        max-width: 100% !important; width: 130mm !important; height: 184mm !important;
                        padding: 4mm !important; box-sizing: border-box !important;
                        display: flex !important; flex-direction: column !important;
                    }
                }
            `}</style>
        </div>
    );
}
