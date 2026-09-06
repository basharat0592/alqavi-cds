'use client';

import { useEffect, useRef } from 'react';
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

/* ═══════════════════════════════════════════════════════════════════════════
   A5 MODE — for A4 sheets physically cut in half (148 x 210mm), one invoice
   per sheet.

   Opt-in per page: use `invoiceStylesA5` instead of `invoiceStyles`, and put
   `invoice-a5` on the outermost element with `invoice-paper` on the sheet
   itself. Reports, statements and ledgers share this file but are multi-page
   tabular documents, so they stay on A4 -- and `@page` is document-level, not
   scoped by a class, so the two sizes cannot coexist in one document anyway.

   The compact type applies on screen as well as in print. That is deliberate:
   it makes the on-screen invoice the sheet you are about to print, and it is
   what lets the auto-fit below measure the real printed height rather than a
   larger screen layout that would fit fine and then overflow on paper.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Printable area of A5 at 6mm margins, in millimetres. */
export const A5_CONTENT_W_MM = 136;   // 148 - 6 - 6
export const A5_CONTENT_H_MM = 198;   // 210 - 6 - 6

export const invoiceStylesA5 = invoiceStyles + `
    /* ── The sheet, on screen and on paper ── */
    .invoice-a5 .invoice-paper {
        width: ${A5_CONTENT_W_MM}mm;
        max-width: 100%;
        padding: 0 !important;
        margin-left: auto;
        margin-right: auto;
        background: #fff;
        /* Only ever shrunk, never enlarged -- see useA5AutoFit. Width is divided
           back out so the scaled result still spans the full printable width
           instead of leaving a gutter down the right. */
        transform: scale(var(--a5-scale, 1));
        transform-origin: top left;
    }
    .invoice-a5 .invoice-paper { width: calc(${A5_CONTENT_W_MM}mm / var(--a5-scale, 1)); }

    /* ── Compact typography ── */
    .invoice-a5 { font-size: 9px; }
    .invoice-a5 .invoice-paper h1 { font-size: 15px !important; line-height: 1.6 !important; }
    .invoice-a5 .invoice-paper h2 { font-size: 11px !important; }
    .invoice-a5 .invoice-paper img { height: 30px !important; }

    /* Tables carry most of the height, so they get the most reduction. */
    .invoice-a5 .invoice-paper table { font-size: 8px !important; }
    .invoice-a5 .invoice-paper thead th { font-size: 6.5px !important; padding: 2px 3px !important; }
    .invoice-a5 .invoice-paper tbody td { padding: 2px 3px !important; }

    /* Everything the invoices size explicitly. Tailwind's arbitrary sizes are
       literal classes, so they are matched literally here. */
    .invoice-a5 .invoice-paper .text-\\[15px\\] { font-size: 10px !important; }
    .invoice-a5 .invoice-paper .text-\\[16px\\] { font-size: 11px !important; }
    .invoice-a5 .invoice-paper .text-\\[13px\\] { font-size: 8.5px !important; }
    .invoice-a5 .invoice-paper .text-\\[12px\\] { font-size: 8px !important; }
    .invoice-a5 .invoice-paper .text-\\[11px\\] { font-size: 7.5px !important; }
    .invoice-a5 .invoice-paper .text-\\[10px\\] { font-size: 7px !important; }
    .invoice-a5 .invoice-paper .text-\\[9px\\]  { font-size: 6.5px !important; }
    .invoice-a5 .invoice-paper .text-\\[8px\\]  { font-size: 6px !important; }

    /* Vertical rhythm: the A4 sheet's generous gaps are what push an A5 sheet
       onto a second page. */
    .invoice-a5 .invoice-paper .mb-6 { margin-bottom: 8px !important; }
    .invoice-a5 .invoice-paper .mb-4 { margin-bottom: 6px !important; }
    .invoice-a5 .invoice-paper .mb-3 { margin-bottom: 5px !important; }
    .invoice-a5 .invoice-paper .gap-6 { gap: 10px !important; }
    .invoice-a5 .invoice-paper .w-\\[280px\\] { width: 150px !important; }

    /* ── Footer: the tallest fixed block on the sheet ── */
    .invoice-a5 .invoice-footer { padding-top: 8px !important; }
    .invoice-a5 .invoice-footer > div:first-child { height: 26px !important; }
    .invoice-a5 .invoice-footer [dir="rtl"] { margin-bottom: 6px !important; }
    .invoice-a5 .invoice-footer [dir="rtl"] p { font-size: 6.5px !important; line-height: 1.7 !important; }
    .invoice-a5 .invoice-footer .mt-12 { margin-top: 14px !important; }
    .invoice-a5 .invoice-footer .w-44 { width: 90px !important; }

    @media print {
        @page { size: A5 portrait; margin: 6mm; }

        html, body { width: ${A5_CONTENT_W_MM}mm; }

        /* An admin invoice renders inside the console shell, whose main column
           has large padding, its own scroll container and a viewport height.
           Left alone that prints as an inset sheet with the overflow clipped,
           so the chain from <main> down is flattened. The shell's own chrome is
           already print:hidden. */
        html, body { height: auto !important; overflow: visible !important; }
        main { padding: 0 !important; margin: 0 !important; overflow: visible !important; height: auto !important; }
        .invoice-a5 { padding: 0 !important; margin: 0 !important; }

        /* Belt and braces over the print:hidden utilities already on the action
           bars: nothing interactive belongs on a printed invoice. */
        .invoice-a5 button, .invoice-a5 select, .invoice-a5 input[type="checkbox"] { display: none !important; }

        /* The A4 rules pin the footer with position:fixed so it repeats at the
           bottom of every page. One invoice per sheet wants it in normal flow,
           pushed to the bottom by the sheet's own flex column -- pinned, it
           would sit on top of a long item table instead of after it. */
        .invoice-a5 .invoice-footer {
            position: static !important;
            bottom: auto !important;
            left: auto !important;
            right: auto !important;
        }

        .invoice-a5 .invoice-paper {
            min-height: ${A5_CONTENT_H_MM}mm;
            box-shadow: none !important;
            border: none !important;
        }

        /* Nothing may split across the fold. */
        .invoice-a5 table, .invoice-a5 tr, .invoice-a5 .invoice-footer {
            page-break-inside: avoid;
            break-inside: avoid;
        }
    }
`;

/**
 * Shrinks the sheet to fit exactly one A5 page when an invoice has more line
 * items than the page holds.
 *
 * CSS alone cannot do this: the item count is unknown until the data loads, and
 * a page-break is the browser's answer to overflow, not a smaller font. So the
 * height is measured and a scale factor set, which the stylesheet above applies
 * as a transform.
 *
 * It only ever shrinks -- a three-line invoice keeps its normal size rather
 * than being blown up to fill the sheet -- and stops at 55%, below which the
 * print is no longer comfortably readable. An invoice long enough to hit that
 * floor genuinely needs a second sheet.
 */
export function useA5AutoFit<T extends HTMLElement>(ready: boolean = true) {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        if (!ready) return;
        const el = ref.current;
        if (!el) return;

        const MIN_SCALE = 0.55;
        const mm = (v: number) => (v * 96) / 25.4;

        const fit = () => {
            // Measure unscaled, or each run would compound the last one's scale.
            el.style.setProperty('--a5-scale', '1');
            const available = mm(A5_CONTENT_H_MM);
            const actual = el.scrollHeight;
            const scale = actual > available
                ? Math.max(MIN_SCALE, available / actual)
                : 1;
            el.style.setProperty('--a5-scale', String(Math.floor(scale * 1000) / 1000));
        };

        fit();
        // Fonts land after first paint and change the height, so re-measure once
        // they are in. Safari lacks document.fonts, hence the guard.
        (document as any).fonts?.ready?.then?.(fit).catch?.(() => { });
        // Chrome fires beforeprint before it lays out the print view, so this is
        // the last chance to correct a height that changed since load.
        window.addEventListener('beforeprint', fit);
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
        // Observe the children: observing `el` itself would loop, since the
        // transform we set changes its own observed box.
        if (ro) Array.from(el.children).forEach(c => ro.observe(c));

        return () => {
            window.removeEventListener('beforeprint', fit);
            ro?.disconnect();
        };
    }, [ready]);

    return ref;
}

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
