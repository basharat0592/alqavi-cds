"use client";

/*
 * Trade 1.0 — printed Sale Invoice.
 *
 *   Paper (A4 / A5 / Letter / Legal / Custom W x H): the customer's legacy
 *   invoice layout, drawn at A4 width and scaled to the chosen paper.
 *   80 / 58  Thermal slip for a small receipt printer — the same content
 *   stacked in one narrow column.
 *
 * `@page` is document-wide, so only the chosen layout is rendered.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import api from '@/lib/axios';

export type InvoiceSize = 'a4' | 'a5' | 'letter' | 'legal' | 'custom' | '80' | '58';
export const INVOICE_SIZES: { v: InvoiceSize; label: string }[] = [
    { v: 'a4', label: 'A4' },
    { v: 'a5', label: 'A5 (half A4)' },
    { v: 'letter', label: 'Letter' },
    { v: 'legal', label: 'Legal' },
    { v: 'custom', label: 'Custom size' },
    { v: '80', label: 'Slip 80 mm' },
    { v: '58', label: 'Slip 58 mm' },
];
const SIZE_KEY = 'trade.invoice.size';
const CUSTOM_KEY = 'trade.invoice.custom';
const isSize = (v: any): v is InvoiceSize => INVOICE_SIZES.some((o) => o.v === v);
export const savedInvoiceSize = (): InvoiceSize => {
    try { const v = localStorage.getItem(SIZE_KEY); return isSize(v) ? v : 'a4'; } catch { return 'a4'; }
};

/* Paper sizes, portrait, in mm. The layout is designed at A4 width. */
const PAPER: Record<string, { w: number; h: number; m: number }> = {
    a4: { w: 210, h: 297, m: 8 }, a5: { w: 148, h: 210, m: 6 },
    letter: { w: 216, h: 279, m: 8 }, legal: { w: 216, h: 356, m: 8 },
};
const DESIGN_W = 194; // A4 width less 8 mm margins

/* Business details (the customer's legacy invoice, letterhead and visiting card). */
const NAME_UR = 'القوی ٹریڈرز';
const TAGLINE_UR = 'کاسمیٹکس ڈیلر گلگت بلتستان';
const SHOP_GILGIT_UR = 'قاسمی مارکیٹ CMH روڈ خومر گلگت';
const SHOP_SKARDU_UR = 'ابراہیم مارکیٹ کلفٹن پل سکردو';
const SLOGAN_UR = 'مشہور اور با اعتماد ملکی و غیر ملکی کاسمیٹکس کا مرکز';
const PROPRIETOR = 'Syed Sakhawat & Associates';
const PROPRIETOR_PHONES = ['03138692190', '03351240190'];
const CEO_UR = 'سید سجاد حسین';
const PHONES = ['0335-1240190', '0355-5555190'];
const DISTRIBUTOR_UR = 'ڈسٹری بیوٹر آف';
const DISTRIBUTES_LIST_UR = 'بائیو آملہ کمپنی، مدر کیئر کمپنی، فیس فریش کمپنی، سعید غنی کمپنی، آئش کمپنی، کلر آن کمپنی، سکین وائٹ کمپنی، ڈرما شائن کمپنی، سپر گریس کمپنی، برجین کمپنی، ایزی کلین کمپنی اور یونیورسل کمپنی';
const termsUr = (city: string) =>
    `نوٹ:۔ تمام دکاندار حضرات اس بات کو نوٹ کر لیں کہ جتنی بھی چیزیں القوی ٹریڈرز ${city} سے لے رہے ہیں ان کو ایکسپائری سے تین مہینے پہلے تبدیل کرانا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیلی کی ذمہ دار نہیں ہوگی۔ امپورٹڈ چیزیں بشمول پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں۔ سامان اور بل میں کسی بھی فرق کی صورت میں فوراً اطلاع کریں بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کی ذمہ دار نہیں ہوگی۔ آپ کے تعاون کا شکریہ`;

/* Payment is due within this many days of the invoice date. */
const DUE_DAYS = 15;

type Line = {
    pid: string; name: string; expiry_date: string | null; unit: string; packing: number; carton: number;
    qty: number; bonus: number; tp: number; retail: number; gross: number; special: number; shelf: number; net: number;
    special_pct: number; shelf_pct: number;
};
type Invoice = {
    id: string; invoice_no: string; date: string; time: string; staff: string; staff_cell?: string;
    region?: { code: string; name: string };
    customer: { acc_id: string; name: string; address: string; area: string; phone: string };
    lines: Line[];
    totals: { pieces: number; bonus: number; gross: number; special: number; shelf: number; bill_disc: number;
        net: number; prev_balance: number; total: number; paid: number; balance: number };
};

const n = (v: any) => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const money = (v: any) => n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (v: any) => n(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const pct = (v: any) => (n(v) ? `${qtyFmt(v)}%` : '');
const dmy = (iso: string | Date | null) => {
    if (!iso) return '';
    if (iso instanceof Date) return `${String(iso.getDate()).padStart(2, '0')}-${String(iso.getMonth() + 1).padStart(2, '0')}-${iso.getFullYear()}`;
    return String(iso).slice(0, 10).split('-').reverse().join('-');
};
const isCarton = (l: Line) => l.unit === 'CARTON' && l.carton > 0;
/* "2 Ctn" for whole cartons, "2 Ctn + 6" for a part carton. */
const cartonCount = (l: Line) => {
    const c = Math.floor(l.qty / l.carton);
    return l.qty % l.carton ? `${c} Ctn + ${l.qty % l.carton}` : `${c} Ctn`;
};

/* 15-day payment window, counted from the invoice date to today. */
function dueInfo(inv: Invoice) {
    const start = new Date(`${String(inv.date).slice(0, 10)}T00:00:00`);
    const due = new Date(start); due.setDate(due.getDate() + DUE_DAYS);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const left = Math.round((due.getTime() - today.getTime()) / 86400000);
    const owing = n(inv.totals.net) - n(inv.totals.paid) > 0.004;
    let text: string;
    if (!owing) text = 'Paid in full — no amount due on this invoice.';
    else if (left > 0) text = `Payment due within ${DUE_DAYS} days — by ${dmy(due)} · ${left} day${left === 1 ? '' : 's'} left`;
    else if (left === 0) text = `Payment due TODAY (${dmy(due)})`;
    else text = `OVERDUE by ${-left} day${left === -1 ? '' : 's'} — payment was due on ${dmy(due)}`;
    return { text, owing, overdue: owing && left < 0 };
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap');`;

export default function TradeInvoicePrint({ id }: { id: string }) {
    const [inv, setInv] = useState<Invoice | null>(null);
    const [err, setErr] = useState('');
    const [size, setSize] = useState<InvoiceSize>('a4');
    const [custom, setCustom] = useState({ w: 210, h: 297 });
    const [autoPrint, setAutoPrint] = useState(false);
    // A roll has no fixed page length: the slip's page is exactly as long as
    // its content (measured after layout), so the printer feeds no blank paper.
    const [slipH, setSlipH] = useState(0);

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const s = q.get('size');
        setSize(isSize(s) ? s : savedInvoiceSize());
        try {
            const c = JSON.parse(localStorage.getItem(CUSTOM_KEY) || 'null');
            if (c && n(c.w) >= 50 && n(c.h) >= 50) setCustom({ w: n(c.w), h: n(c.h) });
        } catch { /* default */ }
        setAutoPrint(q.has('print'));
        api.get(`v1/sales/orders/${id}/trade_invoice/`)
            .then(({ data }) => setInv(data))
            .catch((e) => setErr(e?.response?.data?.detail || 'Could not load the invoice.'));
    }, [id]);

    useEffect(() => { if (inv) document.title = `Invoice ${inv.invoice_no}`; }, [inv]);

    const isSlip = size === '80' || size === '58';
    // Print once the data and the Urdu fonts are in (else the first print shows fallbacks).
    useEffect(() => {
        if (!inv || !autoPrint || (isSlip && !slipH)) return;
        let done = false;
        const go = () => { if (!done) { done = true; setAutoPrint(false); window.print(); } };
        (document as any).fonts?.ready?.then(() => setTimeout(go, 250));
        const t = setTimeout(go, 3500);
        return () => clearTimeout(t);
    }, [inv, autoPrint, isSlip, slipH]);

    const pick = (s: InvoiceSize) => {
        setSize(s);
        try { localStorage.setItem(SIZE_KEY, s); } catch { /* ignore */ }
    };
    const setCustomDim = (k: 'w' | 'h', v: string) => {
        const next = { ...custom, [k]: Math.max(0, Math.round(n(v))) };
        setCustom(next);
        try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    };

    const paper = size === 'custom'
        ? { w: Math.max(80, custom.w || 210), h: Math.max(80, custom.h || 297), m: 6 }
        : PAPER[size] || PAPER.a4;
    const slipW = size === '58' ? 54 : 74; // printable width in mm
    const pageCss = isSlip
        ? `@page { size: ${size}mm ${Math.max(60, Math.ceil(slipH) + 6)}mm; margin: 3mm 0; }`
        : `@page { size: ${paper.w}mm ${paper.h}mm; margin: ${paper.m}mm ${paper.m}mm ${paper.m + 2}mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt sans-serif; color: #555; } }`;

    return (
        <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
            <style>{`${FONTS}
                ${pageCss}
                .inv * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .inv { font-family: 'Inter', system-ui, sans-serif; color: #111; }
                .ur-name { font-family: 'Noto Naskh Arabic', serif; font-weight: 700; }
                .ur { font-family: 'Noto Nastaliq Urdu', serif; }
                .inv table { border-collapse: collapse; width: 100%; }
                .inv thead { display: table-header-group; }
                .inv tr { break-inside: avoid; }
                @media print {
                    html, body { background: #fff !important; }
                    .no-print { display: none !important; }
                    .sheet { box-shadow: none !important; margin: 0 !important; }
                }
            `}</style>

            {/* Toolbar (screen only): paper size is chosen here before printing */}
            <div className="no-print mx-auto mb-4 flex w-fit flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
                <span className="text-[13px] font-bold text-slate-600">Paper</span>
                {INVOICE_SIZES.map((o) => (
                    <button key={o.v} type="button" onClick={() => pick(o.v)}
                        className={`h-8 rounded-md border px-3 text-[13px] font-semibold ${size === o.v ? 'border-[#3d3f95] bg-[#3d3f95] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                        {o.label}
                    </button>
                ))}
                {size === 'custom' && (
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600">
                        <input value={custom.w || ''} onChange={(e) => setCustomDim('w', e.target.value)} inputMode="numeric" aria-label="Width in mm"
                            className="h-8 w-16 rounded-md border border-slate-300 px-2 text-right tabular-nums" />
                        ×
                        <input value={custom.h || ''} onChange={(e) => setCustomDim('h', e.target.value)} inputMode="numeric" aria-label="Height in mm"
                            className="h-8 w-16 rounded-md border border-slate-300 px-2 text-right tabular-nums" />
                        mm
                    </span>
                )}
                <span className="mx-1 h-6 w-px bg-slate-200" />
                <button type="button" onClick={() => window.print()} disabled={!inv}
                    className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Printer size={14} /> Print
                </button>
                <button type="button" onClick={() => window.close()} className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                    <X size={14} /> Close
                </button>
            </div>

            {err && <p className="no-print text-center text-[14px] font-semibold text-red-600">{err}</p>}
            {!inv && !err && <p className="no-print text-center text-[14px] text-slate-500">Loading invoice…</p>}

            {inv && !isSlip && <Sheet inv={inv} paper={paper} />}
            {inv && isSlip && <Slip inv={inv} widthMm={slipW} onHeight={setSlipH} />}
        </div>
    );
}

/* ───────────────────────── Page invoice (customer's legacy layout) ─────────────────────────
   Monogram | Urdu name + "Sale Invoice" | Proprietor, region, phones, page box.
   Invoice / customer / salesman on the left, day, date, account, address and
   area on the right; bordered grid with Unit, Special Disc and Shelf Rent;
   totals with advance and left amount; the red 15-day payment alert; shops
   banner, distributors, terms and signatures. Drawn at A4 width and scaled
   (CSS zoom) to the chosen paper. */
function Sheet({ inv, paper }: { inv: Invoice; paper: { w: number; h: number; m: number } }) {
    const t = inv.totals;
    const c = inv.customer;
    const region = inv.region || { code: 'GLT', name: 'Gilgit' };
    const contentW = paper.w - paper.m * 2;
    const contentH = paper.h - paper.m * 2 - 2;
    const zoom = contentW / DESIGN_W;
    const ref = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState(1);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setPages(Math.max(1, Math.ceil((el.getBoundingClientRect().height * 25.4 / 96 - 1) / contentH)));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [contentH, zoom]);
    const d = inv.date ? new Date(`${String(inv.date).slice(0, 10)}T00:00:00`) : null;
    const longDate = d ? `${d.getDate()} - ${d.toLocaleDateString('en-GB', { month: 'long' })} - ${d.getFullYear()}` : '';
    const day = d ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : '';
    const left = n(t.net) - n(t.paid);
    const due = dueInfo(inv);
    const kv = (k: string, v: React.ReactNode) => (
        <><span style={{ color: '#555' }}>{k}</span><span>{v || '—'}</span></>
    );
    const th = (h: string, right = false, w?: string) => (
        <th style={{ border: '0.25mm solid #333', padding: '0.9mm 1.1mm', fontWeight: 600, textAlign: right ? 'right' : 'left', width: w, lineHeight: 1.15 }}>{h}</th>
    );
    const td = (v: React.ReactNode, right = false, bold = false) => (
        <td style={{ borderLeft: '0.25mm solid #333', borderRight: '0.25mm solid #333', borderBottom: '0.15mm solid #bbb', padding: '0.7mm 1.1mm', textAlign: right ? 'right' : 'left', fontWeight: bold ? 600 : 400, verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>{v}</td>
    );
    return (
        <div className="inv sheet mx-auto bg-white shadow-xl" style={{ width: `${contentW}mm` }}>
            <div ref={ref} style={{ width: `${DESIGN_W}mm`, zoom, fontSize: '8pt', color: '#111' }}>
                {/* Letterhead */}
                <div className="grid items-start" style={{ gridTemplateColumns: '50mm 1fr 52mm', gap: '3mm' }}>
                    <img src="/brand/aqt-monogram.png" alt="Al-Qavi Traders" style={{ width: '46mm', height: 'auto', marginTop: '1mm' }} />
                    <div className="flex flex-col items-center text-center">
                        <div className="ur-name" dir="rtl" style={{ fontSize: '30pt', lineHeight: 1.15, color: '#343434' }}>{NAME_UR}</div>
                        <div className="ur" dir="rtl" style={{ fontSize: '9pt', lineHeight: 1.9, color: '#343434' }}>{TAGLINE_UR}</div>
                        <div style={{ fontSize: '15pt', fontWeight: 800, marginTop: '0.5mm' }}>Sale Invoice</div>
                    </div>
                    <div style={{ fontSize: '8pt', lineHeight: 1.45 }}>
                        <div style={{ fontWeight: 700 }}>Proprietor:</div>
                        <div>{PROPRIETOR}</div>
                        <div><b>{region.code}</b> · {region.name} Region</div>
                        <div style={{ marginTop: '1mm', fontVariantNumeric: 'tabular-nums' }}>{PROPRIETOR_PHONES.map((p) => <div key={p}>{p}</div>)}</div>
                        <div style={{ marginTop: '1.5mm', border: '0.3mm dashed #333', textAlign: 'center', padding: '0.5mm 0' }}>Page - 1 of {pages}</div>
                    </div>
                </div>

                {/* Invoice + customer (left) | day, date, account, address, area (right) — small, unbold */}
                <div className="grid" style={{ gridTemplateColumns: '1fr 72mm', gap: '4mm', margin: '2mm 0 1.8mm', fontSize: '7.5pt', lineHeight: 1.35 }}>
                    <div className="grid" style={{ gridTemplateColumns: '25mm 1fr', rowGap: '0.4mm' }}>
                        {kv('Date Invoice:', longDate)}
                        {kv('Invoice No:', inv.invoice_no)}
                        {kv('Customer Name:', c.name)}
                        {kv('Customer Cell #:', c.phone)}
                        {kv('Saleman:', inv.staff)}
                        {kv('Saleman Cell #:', inv.staff_cell)}
                    </div>
                    <div className="grid self-start" style={{ gridTemplateColumns: '15mm 1fr', rowGap: '0.4mm', border: '0.25mm solid #999', borderRadius: '1mm', padding: '1.3mm 2mm' }}>
                        {kv('Day', day)}
                        {kv('Date', dmy(inv.date))}
                        {kv('Account', c.acc_id)}
                        {kv('Address', c.address)}
                        {kv('Area', c.area)}
                    </div>
                </div>

                {/* Items */}
                <table style={{ fontSize: '7.5pt', borderBottom: '0.25mm solid #333' }}>
                    <thead>
                        <tr style={{ background: '#efefef' }}>
                            {th('S.No', false, '8mm')}{th('PID', false, '11mm')}{th('Product Name')}{th('Unit', false, '12mm')}{th('Qty', true, '12mm')}{th('Bon', true, '8mm')}
                            {th('TP', true, '15mm')}{th('Retail', true, '15mm')}{th('Special Disc %', true, '13mm')}{th('Shelf Rent %', true, '12mm')}
                            {th('Disc Amt', true, '16mm')}{th('Net Amount', true, '20mm')}
                        </tr>
                    </thead>
                    <tbody>
                        {inv.lines.map((l, i) => (
                            <tr key={i}>
                                {td(i + 1, true)}{td(l.pid)}
                                {td(<>{l.name}{l.expiry_date ? <div style={{ color: '#666', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>Exp {dmy(l.expiry_date)}</div> : null}</>)}
                                {td(isCarton(l) ? <>Carton<div style={{ color: '#666', fontSize: '6.5pt', whiteSpace: 'nowrap' }}>{cartonCount(l)}</div></> : 'Piece')}
                                {td(qtyFmt(l.qty), true)}{td(qtyFmt(l.bonus), true)}{td(money(l.tp), true)}{td(money(l.retail), true)}
                                {td(money(l.special_pct), true)}{td(money(l.shelf_pct), true)}
                                {td(money(n(l.special) + n(l.shelf)), true)}{td(money(l.net), true, true)}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals + 15-day payment alert */}
                <div className="flex items-start justify-between" style={{ gap: '5mm', marginTop: '2mm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div style={{ flex: 1, fontSize: '7.5pt', paddingTop: '0.5mm' }}>
                        <div>Total Products = {qtyFmt(t.pieces)}{t.bonus ? <span style={{ color: '#555' }}> (+{qtyFmt(t.bonus)} bonus)</span> : null}
                            <span style={{ color: '#555' }}> · {inv.lines.length} item{inv.lines.length === 1 ? '' : 's'}</span></div>
                        <div style={{
                            marginTop: '2.5mm', padding: '1.6mm 2.2mm', borderRadius: '1mm', fontSize: '8pt', fontWeight: 600,
                            border: `0.35mm solid ${due.owing ? '#c62828' : '#2e7d32'}`, color: due.owing ? '#c62828' : '#2e7d32',
                            background: due.owing ? (due.overdue ? '#ffe5e5' : '#fff3f3') : '#eef8ef',
                        }}>
                            {due.owing ? '⚠ ' : '✓ '}{due.text}
                        </div>
                    </div>
                    <table style={{ width: '78mm', fontSize: '7.5pt', border: '0.25mm solid #333' }}>
                        <tbody>
                            <Tot k="Amount" v={t.gross} />
                            <Tot k="Special Discount" v={-n(t.special)} />
                            <Tot k="Shelf Rent" v={-n(t.shelf)} />
                            {n(t.bill_disc) > 0 && <Tot k="Bill Discount" v={-n(t.bill_disc)} />}
                            <Tot k="Net Amount" v={t.net} strong />
                            <Tot k="Advance Amount" v={t.paid} />
                            <Tot k="Left Amount" v={left} strong />
                            <Tot k="Previous Balance" v={t.prev_balance} />
                            <Tot k="Net Balance" v={t.balance} strong shade />
                        </tbody>
                    </table>
                </div>

                {/* Footer: shops banner, distributors, terms, signatures */}
                <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div style={{ border: '0.35mm solid #222', padding: '1.5mm 2mm', marginTop: '3.5mm' }}><ShopsBanner /></div>
                    <div dir="rtl" style={{ border: '0.35mm solid #222', borderTop: 0, padding: '0.8mm 2mm', fontSize: '7.5pt' }}>
                        <div dir="ltr" style={{ fontWeight: 600, borderBottom: '0.2mm solid #555', paddingBottom: '0.5mm' }}>Distributors:</div>
                        <div className="ur" style={{ fontSize: '7.5pt', lineHeight: 2.05 }}>{DISTRIBUTES_LIST_UR}</div>
                    </div>
                    <div className="ur" dir="rtl" style={{ fontSize: '7.5pt', lineHeight: 2.1, marginTop: '1.5mm', textAlign: 'justify' }}>
                        {termsUr(region.code === 'SKD' ? 'سکردو' : 'گلگت')}
                    </div>
                    <div className="flex justify-between" style={{ marginTop: '9mm', fontSize: '8pt', fontWeight: 600 }}>
                        <div style={{ width: '58mm', borderTop: '0.3mm solid #222', textAlign: 'center', paddingTop: '0.8mm' }}>Store Manager</div>
                        <div style={{ width: '58mm', borderTop: '0.3mm solid #222', textAlign: 'center', paddingTop: '0.8mm' }}>Saleman</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Tot({ k, v, strong, shade }: { k: string; v: any; strong?: boolean; shade?: boolean }) {
    return (
        <tr style={{ borderBottom: '0.15mm solid #bbb', background: shade ? '#efefef' : undefined }}>
            <td style={{ padding: '0.65mm 2mm', fontWeight: strong ? 600 : 400 }}>{k}</td>
            <td style={{ padding: '0.65mm 2mm', textAlign: 'right', fontWeight: strong ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>{money(v)}</td>
        </tr>
    );
}

/* The shops strip from the letterhead: Gilgit shop | slogan | Skardu shop, right to left. */
function ShopsBanner() {
    const box = (text: string, point: 'left' | 'right') => (
        <div className="ur flex items-center justify-center" dir="rtl"
            style={{
                background: '#2f2f33', color: '#fff', fontSize: '8pt', lineHeight: 1, height: '7mm', padding: '0 5mm', whiteSpace: 'nowrap',
                clipPath: point === 'left' ? 'polygon(4mm 0, 100% 0, 100% 100%, 4mm 100%, 0 50%)' : 'polygon(0 0, calc(100% - 4mm) 0, 100% 50%, calc(100% - 4mm) 100%, 0 100%)',
            }}>
            <span style={{ transform: 'translateY(0.6mm)' }}>{text}</span>
        </div>
    );
    const bar = (dir: string) => <div style={{ width: '9mm', height: '4.5mm', background: `linear-gradient(${dir}, #2a2e8f, #8c8fd6)` }} />;
    return (
        <div className="flex items-center justify-between" dir="rtl" style={{ gap: '2mm' }}>
            {box(SHOP_GILGIT_UR, 'left')}
            <div className="flex items-center" style={{ gap: '2mm' }}>
                {bar('90deg')}
                <span className="ur" style={{ fontSize: '9pt', lineHeight: 1, whiteSpace: 'nowrap', transform: 'translateY(0.6mm)' }}>{SLOGAN_UR}</span>
                {bar('270deg')}
            </div>
            {box(SHOP_SKARDU_UR, 'right')}
        </div>
    );
}

/* ───────────────────────── Thermal slip (80 / 58 mm) ───────────────────────── */
function Slip({ inv, widthMm, onHeight }: { inv: Invoice; widthMm: number; onHeight: (mm: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => onHeight(el.getBoundingClientRect().height * 25.4 / 96);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [onHeight, widthMm]);
    const t = inv.totals;
    const c = inv.customer;
    const small = widthMm < 60;
    const fs = small ? 7.5 : 8.5;
    const due = dueInfo(inv);
    const rule = <div style={{ borderTop: '0.3mm dashed #000', margin: '1.5mm 0' }} />;
    const row = (k: string, v: any, bold = false) => (
        <div className="flex justify-between" style={{ fontWeight: bold ? 800 : 500, fontSize: bold ? `${fs + 1.5}pt` : `${fs}pt` }}>
            <span>{k}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</span>
        </div>
    );
    return (
        <div ref={ref} className="inv sheet mx-auto bg-white shadow-xl" style={{ width: `${widthMm}mm`, padding: '1mm 0', fontSize: `${fs}pt`, lineHeight: 1.35, color: '#000' }}>
            <div className="flex flex-col items-center text-center">
                <img src="/brand/aqt-monogram-black.png" alt="Al-Qavi Traders" style={{ width: small ? '30mm' : '40mm', height: 'auto' }} />
                <div className="ur-name" dir="rtl" style={{ fontSize: small ? '14pt' : '17pt', lineHeight: 1.3, marginTop: '1mm' }}>{NAME_UR}</div>
                <div className="ur" dir="rtl" style={{ fontSize: `${fs}pt`, lineHeight: 1.9 }}>{TAGLINE_UR}</div>
                <div className="ur" dir="rtl" style={{ fontSize: `${fs - 1}pt`, lineHeight: 1.9 }}>{SHOP_GILGIT_UR}</div>
                <div className="ur" dir="rtl" style={{ fontSize: `${fs - 1}pt`, lineHeight: 1.9 }}>{SHOP_SKARDU_UR}</div>
                <div className="flex items-center justify-center" style={{ gap: '1.5mm', marginTop: '0.5mm' }}>
                    <span style={{ fontWeight: 800, fontSize: `${fs - 1}pt`, border: '0.3mm solid #000', padding: '0 1.2mm' }}>CEO</span>
                    <span className="ur" dir="rtl" style={{ fontSize: `${fs}pt`, lineHeight: 1.7 }}>{CEO_UR}</span>
                </div>
                <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{PHONES.join('  ·  ')}</div>
            </div>
            {rule}
            <div style={{ textAlign: 'center', fontWeight: 800, letterSpacing: '0.1em' }}>SALE INVOICE</div>
            <div className="flex justify-between"><span>No: <b>{inv.invoice_no}</b></span><span>{dmy(inv.date)}</span></div>
            {inv.staff && <div>Salesman: {inv.staff}</div>}
            {rule}
            <div><b>{c.name}</b>{c.acc_id ? <span> ({c.acc_id})</span> : null}</div>
            {c.address && <div style={{ fontSize: `${fs - 0.5}pt` }}>{c.address}</div>}
            {(c.area || c.phone) && <div style={{ fontSize: `${fs - 0.5}pt` }}>{[c.area, c.phone].filter(Boolean).join(' · ')}</div>}
            {rule}
            {inv.lines.map((l, i) => (
                <div key={i} style={{ marginBottom: '1.2mm', breakInside: 'avoid' }}>
                    <div style={{ fontWeight: 700 }}>{i + 1}. {l.name}</div>
                    <div className="flex justify-between">
                        <span>
                            {isCarton(l) ? `Carton: ${cartonCount(l)} = ${qtyFmt(l.qty)} pcs` : `Piece: ${qtyFmt(l.qty)} pcs`} × {money(l.tp)}
                            {l.bonus ? ` +${qtyFmt(l.bonus)} bonus` : ''}
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(l.gross)}</span>
                    </div>
                    {(n(l.special) > 0 || n(l.shelf) > 0) && (
                        <div className="flex justify-between" style={{ fontSize: `${fs - 0.5}pt` }}>
                            <span>{[n(l.special) > 0 ? `Special Disc ${pct(l.special_pct)}` : '', n(l.shelf) > 0 ? `Shelf Rent ${pct(l.shelf_pct)}` : ''].filter(Boolean).join(' · ')}</span>
                            <span>-{money(n(l.special) + n(l.shelf))}</span>
                        </div>
                    )}
                </div>
            ))}
            {rule}
            <div style={{ fontWeight: 700 }}>Total Products = {qtyFmt(t.pieces)}{t.bonus ? ` (+${qtyFmt(t.bonus)} bonus)` : ''}</div>
            {row('Amount', t.gross)}
            {n(t.special) > 0 && row('Special Discount', -n(t.special))}
            {n(t.shelf) > 0 && row('Shelf Rent', -n(t.shelf))}
            {n(t.bill_disc) > 0 && row('Bill Discount', -n(t.bill_disc))}
            {row('Net Amount', t.net, true)}
            {row('Advance Amount', t.paid)}
            {row('Left Amount', n(t.net) - n(t.paid))}
            {row('Previous Balance', t.prev_balance)}
            <div style={{ borderTop: '0.4mm solid #000', marginTop: '1mm', paddingTop: '0.5mm' }}>{row('Net Balance', t.balance, true)}</div>
            {rule}
            <div style={{ border: '0.4mm solid #000', padding: '1mm 1.5mm', fontWeight: 700, textAlign: 'center' }}>{due.owing ? '⚠ ' : ''}{due.text}</div>
            <div className="ur text-center" dir="rtl" style={{ lineHeight: 2.1, marginTop: '1mm' }}>خریداری کا شکریہ</div>
            {rule}
            <div className="ur" dir="rtl" style={{ fontSize: `${fs - 1.5}pt`, lineHeight: 2, textAlign: 'center' }}>
                <b>{DISTRIBUTOR_UR}:</b> {DISTRIBUTES_LIST_UR}
            </div>
        </div>
    );
}
