'use client';

import { CheckCircle2 } from 'lucide-react';

// Shared <style jsx global> block for every invoice page (fonts + print rules).
export const invoiceStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @media print {
        .print\\:hidden { display: none !important; }
        body { padding: 0 !important; margin: 0 !important; background-color: white !important; }
        .invoice-footer { position: fixed; bottom: 0; left: 0; right: 0; margin: 0 !important; padding-top: 0 !important; }
        @page { margin: 1cm; }
    }

    body { font-family: 'Inter', sans-serif; }
    .urdu-text { font-family: 'Noto Nastaliq Urdu', serif; font-weight: 700; line-height: 1.5; }
    .print-exact { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
`;

/**
 * Branded invoice header: logo + caption (left), Urdu company title (center),
 * and document meta (right). Used across every invoice in the app.
 */
export function InvoiceHeader({
    docTitle,
    metaLines = [],
    refLabel = 'No',
    refValue,
    date,
}: {
    docTitle: string;
    metaLines?: string[];
    refLabel?: string;
    refValue?: string;
    date?: string;
}) {
    return (
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
                <h2 className="text-[15px] font-black uppercase tracking-tighter text-slate-900">{docTitle}</h2>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">
                    {metaLines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
                {refValue && <p className="text-[12px] text-slate-900 font-bold mt-1 tracking-tight">{refLabel}: {refValue}</p>}
                {date && <p className="text-[10px] text-slate-500 font-medium">{date}</p>}
            </div>
        </div>
    );
}

/**
 * Branded invoice footer (Alqavi Traders stationery): banner + Urdu note +
 * Store Manager / Saleman signatures + contact strip. Pinned to the page
 * bottom on print. Fully static.
 */
export function InvoiceFooter({ pinned = true }: { pinned?: boolean }) {
    return (
        <div className={`pt-6 print-exact ${pinned ? 'mt-auto invoice-footer' : 'mt-10'}`}>
            {/* Banner: branch arrows on both ends + centered tagline */}
            <div className="flex items-stretch mb-2 overflow-hidden print-exact" style={{ height: '46px' }}>
                <div
                    className="text-white flex items-center justify-center px-6 print-exact"
                    style={{ backgroundColor: '#0f172a', clipPath: 'polygon(16% 0, 100% 0, 100% 100%, 16% 100%, 0 50%)' }}
                >
                    <span className="text-[9px] font-bold urdu-text whitespace-nowrap">قاضی مارکیٹ CMH روڈ خومر گلگت</span>
                </div>
                <div
                    className="text-white flex-1 flex items-center justify-center gap-3 print-exact"
                    style={{ backgroundColor: '#1e293b' }}
                >
                    <span className="inline-block w-2 h-2 rotate-45 print-exact" style={{ backgroundColor: '#1d4ed8' }}></span>
                    <span className="text-[13px] font-bold urdu-text">مشہور اور با اعتماد ملکی وغیر ملکی کاسمیٹکس کا مرکز</span>
                    <span className="inline-block w-2 h-2 rotate-45 print-exact" style={{ backgroundColor: '#1d4ed8' }}></span>
                </div>
                <div
                    className="text-white flex items-center justify-center px-6 print-exact"
                    style={{ backgroundColor: '#0f172a', clipPath: 'polygon(0 0, 84% 0, 100% 50%, 84% 100%, 0 100%)' }}
                >
                    <span className="text-[9px] font-bold urdu-text whitespace-nowrap">ابراہیم مارکیٹ کنفکشن بل سکردو</span>
                </div>
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
                    Organization 1: Qazi Market, CMH Road, Khomer Gilgit&nbsp;&nbsp;•&nbsp;&nbsp;Organization 2: Ibrahim Market, Confection Bil, Skardu
                </p>
            </div>
        </div>
    );
}
