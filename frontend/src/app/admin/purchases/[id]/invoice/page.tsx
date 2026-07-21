"use client";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { purchaseService } from '@/services/purchase.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, ArrowLeft, Share2, Check, Hash, Calendar, Phone, Mail, Building2, Package, CheckCircle2 } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import Logo from '@/components/ui/Logo';
import toast from 'react-hot-toast';
import { cn, exportToCSV } from '@/lib/utils';
import { PageHeader, Card, Button, Badge, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

export default function PurchaseInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [purchase, setPurchase] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        const fetchPurchase = async () => {
            try {
                const data = await purchaseService.getById(id);
                setPurchase(data);
                // Auto-open the print/save-as-PDF dialog when launched with ?print=true
                if (typeof window !== 'undefined' && window.location.search.includes('print=true')) {
                    setTimeout(() => window.print(), 800);
                }
            } catch (error) {
                console.error("Failed to load purchase details", error);
                toast.error("Failed to load record.");
            } finally {
                setLoading(false);
            }
        };
        fetchPurchase();
    }, [id]);

    const lineItems: any[] = (purchase?.items || []).map((it: any, idx: number) => ({ ...it, _rowId: it.id ?? idx }));
    const sel = useTableSelection(lineItems, (it: any) => it._rowId);

    const handlePrint = () => { window.print(); };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: `Purchase Order #${purchase?.purchase_number}`, url: url });
            } catch { }
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    if (loading) return <PageLoader />;
    if (!purchase) return <div className="p-20 text-center font-bold text-slate-900">Purchase record not found.</div>;

    const items = purchase.items || [];
    const totalAmount = parseFloat(purchase.total_amount || '0');
    const paidAmount = parseFloat(purchase.paid_amount || '0');
    const balance = totalAmount - paidAmount;

    return (
        <div className="pb-20 font-sans text-slate-900 text-left">

            {/* Integrated Action Bar */}
            <div className="max-w-[850px] mx-auto pt-2 px-4 print:hidden">
                <PageHeader
                    title="Purchase Invoice"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Purchases', href: '/admin/purchases' },
                        { label: 'Purchase Invoice' },
                    ]}
                    actions={
                        <>
                            <Button variant="secondary" size="sm" onClick={handleShare}>
                                {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                                {shared ? 'Copied' : 'Share Link'}
                            </Button>
                            <Button variant="primary" size="sm" onClick={handlePrint}>
                                <Printer size={14} /> Print Purchase Order
                            </Button>
                        </>
                    }
                />
            </div>

            {/* Paper Container */}
            <Card className="max-w-[850px] mx-auto p-6 flex flex-col min-h-screen print:min-h-0 print:border-none print:shadow-none print:rounded-none print:p-0">

                {/* Visual Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="w-1/3">
                        <img
                            src="/images/invoice-logo.png"
                            alt="Alqavi Traders"
                            className="h-11 w-auto object-contain"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/logo.png'; }}
                        />
                        <p className="text-[12px] font-black text-emerald-700 tracking-wide mt-1">Alqavi Traders</p>
                    </div>

                    <div className="w-1/3 text-center py-1">
                        <h1 className="text-[22px] font-bold text-slate-900 urdu-text mb-1.5" style={{ lineHeight: 2 }}>
                            القوی ٹریڈرز
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-widest urdu-text" style={{ lineHeight: 1.8 }}>
                            کاسمیٹکس ڈیلر گلگت بلتستان
                        </p>
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

                {/* 2. Supplier & Metadata Grid — compact single line per column */}
                <div className="grid grid-cols-3 gap-6 mb-4 px-1 items-start">
                    <div className="col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Supplier</p>
                        <p className="text-[15px] font-black text-slate-900 leading-tight">{purchase.supplier_name}</p>
                        {purchase.supplier_phone && <p className="text-[12px] font-medium text-slate-600 mt-0.5">{purchase.supplier_phone}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inventory</p>
                        <div className="flex justify-end">
                            {purchase.is_inventory_synced ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase"><CheckCircle2 size={12} /> Synced</span>
                            ) : (
                                <Badge tone="amber">Pending Sync</Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Items Table */}
                <div className="mb-6">
                    <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                                <SelectAllTh sel={sel} className="print:hidden" />
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
                                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                                        <RowCheckboxTd sel={sel} id={item._rowId} className="print:hidden" />
                                        <td className="py-1.5 px-1 text-center text-slate-400 tabular-nums">{i + 1}</td>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                                            {item.product_name}
                                            <span className="text-[10px] font-medium text-slate-400 ml-1.5">({item.packaging_type?.toLowerCase()})</span>
                                        </td>
                                        <td className="py-1.5 px-3 text-center font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                                            {item.packaging_type === 'CARTON' ? (
                                                <span>{units} pcs <span className="text-[10px] font-medium text-slate-400">({qty} ctn × {item.items_per_carton || 1})</span></span>
                                            ) : qty}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                                        <td className="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}

                        </tbody>
                    </table>
                </div>

                {/* Summary: notes (left) + totals list box (right) */}
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
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Shipping Fees</span>
                                <span className="font-black text-slate-900 tabular-nums">{formatCurrency(purchase.shipping_cost)}</span>
                            </div>
                        )}
                        {purchase.tax_amount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Tax</span>
                                <span className="font-black text-slate-900 tabular-nums">{formatCurrency(purchase.tax_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-slate-300">
                            <span className="text-slate-900 font-black uppercase text-[13px]">Total Amount</span>
                            <span className="font-black text-indigo-600 text-[17px] tabular-nums">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="text-emerald-600 font-bold uppercase text-[11px]">Total Paid</span>
                            <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</span>
                        </div>
                        {balance > 0 && (
                            <div className="flex justify-between">
                                <span className="text-rose-600 font-black uppercase text-[11px]">Remaining Balance</span>
                                <span className="font-black text-rose-600 tabular-nums">{formatCurrency(balance)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer — Alqavi Traders official stationery (replicated) — pinned to page bottom */}
                <div className="mt-auto pt-6 print-exact invoice-footer">
                    {/* Banner band: branch arrows on both ends + centered tagline */}
                    <div className="flex items-stretch mb-2 overflow-hidden print-exact" style={{ height: '46px' }}>
                        {/* Left branch arrow (points left) */}
                        <div
                            className="text-white flex items-center justify-center px-6 print-exact"
                            style={{ backgroundColor: '#0f172a', clipPath: 'polygon(16% 0, 100% 0, 100% 100%, 16% 100%, 0 50%)' }}
                        >
                            <span className="text-[9px] font-bold urdu-text whitespace-nowrap">قاضی مارکیٹ CMH روڈ خومر گلگت</span>
                        </div>
                        {/* Tagline bar */}
                        <div
                            className="text-white flex-1 flex items-center justify-center gap-3 print-exact"
                            style={{ backgroundColor: '#1e293b' }}
                        >
                            <span className="inline-block w-2 h-2 rotate-45 print-exact" style={{ backgroundColor: '#1d4ed8' }}></span>
                            <span className="text-[13px] font-bold urdu-text">مشہور اور با اعتماد ملکی وغیر ملکی کاسمیٹکس کا مرکز</span>
                            <span className="inline-block w-2 h-2 rotate-45 print-exact" style={{ backgroundColor: '#1d4ed8' }}></span>
                        </div>
                        {/* Right branch arrow (points right) */}
                        <div
                            className="text-white flex items-center justify-center px-6 print-exact"
                            style={{ backgroundColor: '#0f172a', clipPath: 'polygon(0 0, 84% 0, 100% 50%, 84% 100%, 0 100%)' }}
                        >
                            <span className="text-[9px] font-bold urdu-text whitespace-nowrap">ابراہیم مارکیٹ کنفکشن بل سکردو</span>
                        </div>
                    </div>

                    {/* Distributors box (removed) */}
                    <div className="hidden">
                        <div className="px-2 py-[3px] border-b border-slate-800 font-bold">
                            Distributors: <span className="font-medium">{purchase.supplier_name || ''}</span>
                        </div>
                        <div className="px-2 py-[3px] border-b border-slate-800">{purchase.supplier_phone || ' '}</div>
                        <div className="px-2 py-[3px]">{purchase.supplier_address || ' '}</div>
                    </div>

                    {/* Note / Terms (Urdu, justified) */}
                    <div dir="rtl" className="mt-2 mb-10">
                        <p className="text-[11px] text-slate-900 urdu-text text-justify" style={{ lineHeight: 2.2 }}>
                            <span className="font-black">نوٹ:۔ </span>
                            تمام دکاندار حضرات اس بات کو نوٹ کر لیں کہ جتنی بھی چیزیں الْقوی ٹریڈرز گلگت سے خریدی ہیں انہیں ایکسپائری سے تین مہینے پہلے تبدیل کرنا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیل کرنے کی ذمہ دار نہیں ہوگی۔ امپورٹڈ چیزیں بمعہ پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں۔ سامان اور بل میں کسی بھی کمی بیشی کی صورت میں فوراً رابطہ کریں، بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کی ذمہ دار نہیں ہوگی۔ آپ کے تعاون کا شکریہ۔
                        </p>
                    </div>

                    {/* Signatures: Store Manager (left) and Saleman (right) */}
                    <div className="flex justify-between items-end mt-12 px-2">
                        <div className="w-44">
                            <div className="border-t border-slate-700 mb-1.5"></div>
                            <span className="text-[13px] font-black text-slate-900">Store Manager</span>
                        </div>
                        <div className="w-44 text-right">
                            <div className="border-t border-slate-700 mb-1.5"></div>
                            <span className="text-[13px] font-black text-slate-900">Saleman</span>
                        </div>
                    </div>

                    {/* Contact strip */}
                    <div className="mt-3 text-center">
                        <p className="text-[8px] text-slate-400 font-medium tracking-wide">
                            Branch 1: Qazi Market, CMH Road, Khomer Gilgit&nbsp;&nbsp;•&nbsp;&nbsp;Branch 2: Ibrahim Market, Confection Bil, Skardu
                        </p>
                    </div>
                </div>
            </Card>

            <div className="print:hidden">
                <BulkBar
                    sel={sel}
                    entity="line items"
                    onExport={() => exportToCSV(
                        sel.selectedItems.map((it: any) => {
                            const price = parseFloat(it.price || 0);
                            const qty = it.quantity || 1;
                            const units = it.total_units ?? (it.packaging_type === 'CARTON' ? qty * (it.items_per_carton || 1) : qty);
                            return {
                                purchase_number: purchase.purchase_number,
                                product: it.product_name || '',
                                packaging: it.packaging_type || '',
                                quantity: qty,
                                unit_cost: price,
                                subtotal: it.subtotal ?? (price * units),
                            };
                        }),
                        `purchase-${purchase.purchase_number}-items.csv`,
                    )}
                />
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                @media print {
                    .print\\:hidden { display: none !important; }
                    body { padding: 0 !important; margin: 0 !important; background-color: white !important; }
                    .max-w-[850px] { max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 !important; }
                    .invoice-footer { position: fixed; bottom: 0; left: 0; right: 0; margin: 0 !important; padding-top: 0 !important; }
                    @page { margin: 1cm; }
                }

                body { font-family: 'Inter', sans-serif; }
                .urdu-text { font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700; line-height: 1.5; }
                .print-exact { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            `}</style>
        </div>
    );
}
