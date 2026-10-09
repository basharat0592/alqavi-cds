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
import { guardWindowClose, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';

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
    a4: { w: 210, h: 297, m: 5 }, a5: { w: 148, h: 210, m: 4 },
    letter: { w: 216, h: 279, m: 5 }, legal: { w: 216, h: 356, m: 5 },
};
const DESIGN_W = 200; // A4 width less 5 mm margins

/* Business details (the customer's legacy invoice, letterhead and visiting card). */
const NAME_UR = 'القوی ٹریڈرز';
const SHOP_GILGIT_UR = 'قاسمی مارکیٹ CMH روڈ خومر گلگت';
const SHOP_SKARDU_UR = 'ابراہیم مارکیٹ کلفٹن پل سکردو';
const SLOGAN_UR = 'مشہور اور با اعتماد ملکی و غیر ملکی کاسمیٹکس کا مرکز';
/* Payment is due within this many days of the invoice date. */
const DUE_DAYS = 15;

type Line = {
    pid: string; name: string; expiry_date: string | null; unit: string; packing: number; carton: number;
    qty: number; bonus: number; tp: number; retail: number; gross: number; special: number; shelf: number; net: number;
    special_pct: number; shelf_pct: number;
};
type Profile = { proprietor: string; phones: string; easypaisa: string; contact_no: string; whatsapp: string; acct_no?: string };
const DEFAULT_PROFILE: Profile = { proprietor: 'Syed Sakhawat & Associates', phones: '03351240190, 03138692190', easypaisa: '', contact_no: '', whatsapp: '', acct_no: '' };

type Invoice = {
    id: string; invoice_no: string; date: string; time: string; staff: string; staff_cell?: string;
    region?: { code: string; name: string };
    customer: { acc_id: string; name: string; contact?: string; address: string; area: string; phone: string };
    profile?: Profile;
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
    return { text, owing, overdue: owing && left < 0, dueDate: due };
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
    // Proprietor block (Easypaisa, contact …) — edited here, kept on the server.
    const [editPf, setEditPf] = useState<Profile | null>(null);
    const [savingPf, setSavingPf] = useState(false);
    const savePf = async () => {
        if (!editPf || savingPf) return;
        setSavingPf(true);
        try {
            const { data } = await api.patch('v1/sales/orders/invoice_profile/', editPf);
            setInv((v) => (v ? { ...v, profile: data } : v));
            setEditPf(null);
        } catch (e: any) { alert(e?.response?.data?.error || 'Could not save the details.'); }
        finally { setSavingPf(false); }
    };

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
    useEffect(() => guardWindowClose(), []);

    const isSlip = size === '80' || size === '58';
    // Print once the data and the Urdu fonts are in (else the first print shows fallbacks).
    useEffect(() => {
        if (!inv || !autoPrint || (isSlip && !slipH)) return;
        let done = false;
        const go = () => { if (!done) { done = true; setAutoPrint(false); window.print(); } };
        const imgs = Array.from(document.images).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); })));
        Promise.all([(document as any).fonts?.ready, ...imgs]).then(() => setTimeout(go, 300));
        const t = setTimeout(go, 6000);
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
        ? { w: Math.max(80, custom.w || 210), h: Math.max(80, custom.h || 297), m: 5 }
        : PAPER[size] || PAPER.a4;
    const slipW = size === '58' ? 54 : 74; // printable width in mm
    const pageCss = isSlip
        ? `@page { size: ${size}mm ${Math.max(60, Math.ceil(slipH) + 6)}mm; margin: 3mm 0; }`
        : `@page { size: ${paper.w}mm ${paper.h}mm; margin: ${paper.m}mm; @top-right { content: "P. No " counter(page) " of " counter(pages); font: bold 8pt sans-serif; color: #000; } }`;

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
                .inv-spacer { display: none; }
                @media print {
                    .inv-spacer { display: block; }
                    .inv-head { position: fixed; top: 0; left: 0; }
                    .inv-foot { position: fixed; bottom: 0; left: 0; }
                    .sheet-page { min-height: 0 !important; }
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
                <button type="button" onClick={() => setEditPf({ ...DEFAULT_PROFILE, ...(inv?.profile || {}) })} disabled={!inv}
                    className="h-8 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    Invoice details
                </button>
                <button type="button" onClick={() => window.print()} disabled={!inv}
                    className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Printer size={14} /> Print
                </button>
                <button type="button" onClick={() => { if (window.confirm('Do you want to Close the Form ?')) closeTradeWindow(); }} className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                    <X size={14} /> Close
                </button>
            </div>

            {editPf && (
                <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                        <h2 className="mb-3 text-[16px] font-bold text-slate-800">Invoice details (printed under Proprietor)</h2>
                        {([['proprietor', 'Proprietor'], ['easypaisa', 'Easypaisa No'], ['contact_no', 'Contact No'], ['acct_no', 'Acct No (bank)']] as const).map(([k, label]) => (
                            <label key={k} className="mb-2.5 grid grid-cols-[110px_1fr] items-center gap-2 text-[13px] font-semibold text-slate-600">
                                {label}
                                <input value={editPf[k] || ''} onChange={(e) => setEditPf({ ...editPf, [k]: e.target.value })}
                                    className="h-9 rounded-md border border-slate-300 px-2.5 text-[14px] text-slate-900" />
                            </label>
                        ))}
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setEditPf(null)} className="h-9 rounded-md border border-slate-300 px-4 text-[13px] font-semibold">Cancel</button>
                            <button type="button" onClick={savePf} disabled={savingPf || !editPf.proprietor.trim()}
                                className="h-9 rounded-md bg-emerald-600 px-4 text-[13px] font-bold text-white disabled:opacity-50">{savingPf ? 'Saving…' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}
            {err && <p className="no-print text-center text-[14px] font-semibold text-red-600">{err}</p>}
            {!inv && !err && <p className="no-print text-center text-[14px] text-slate-500">Loading invoice…</p>}

            {inv && !isSlip && <Sheet inv={inv} paper={paper} />}
            {inv && isSlip && <Slip inv={inv} widthMm={slipW} onHeight={setSlipH} />}
        </div>
    );
}

/* ───────────────────────── Page invoice (the customer's layout) ─────────────────────────
   Fixed header (monogram | Urdu name + Sale Invoice | proprietor, Easypaisa,
   contact) at the top of every page, fixed footer (shops banner, sole
   distributors, terms, signatures) at the bottom of every page; the body
   between them holds the customer details, the product list (about 20 lines
   a page, carrying on to the next page under the same header / footer), the
   summary and the payment-due alert. Header and footer are `position: fixed`
   in print (repeated on each page); thead / tfoot spacers keep the body clear
   of them. Drawn at A4 width and scaled (CSS zoom) to the chosen paper. */
const B = '0.3mm solid #222';
const SOLE_DISTRIBUTORS = 'SOLE DISTRIBUTORS of Mother Care, BNB Cosmetics, Baba Cosmetics, Doctor Paste, Bio Amla, Kidi Diapers, '
    + 'Santex Ladies Pads, Aish, Face Fresh, Luvel, Amour Diapers, Grace, Pink and White, Perfume — and products of all companies are available at reasonable prices.';
const termsUr = (city: string) =>
    `نوٹ:۔ تمام دکاندار حضرات اس بات کو نوٹ کر لیں کہ جتنی بھی چیزیں القوی ٹریڈرز ${city} سے لے رہے ہیں ان کو ایکسپائری سے تین مہینے پہلے تبدیل کرانا ہوگا۔ زائد المیعاد یا خراب ہونے کے بعد کمپنی تبدیلی کی ذمہ دار نہیں ہوگی۔ امپورٹڈ چیزیں بشمول پرفیوم، باڈی سپرے اور خراب شدہ سامان کی تبدیلی یا واپسی نہیں ہوگی۔ رسید کے بغیر کسی بھی نمائندے کو رقم ادا نہ کریں۔ سامان اور بل میں کسی بھی فرق کی صورت میں فوراً اطلاع کریں بصورت دیگر کمپنی کسی قسم کے کلیم یا نقصانات کی ذمہ دار نہیں ہوگی۔ آپ کے تعاون کا شکریہ`;

function Sheet({ inv, paper }: { inv: Invoice; paper: { w: number; h: number; m: number } }) {
    const t = inv.totals;
    const c = inv.customer;
    const pf = inv.profile || DEFAULT_PROFILE;
    const region = inv.region || { code: 'GLT', name: 'Gilgit' };
    const contentW = paper.w - paper.m * 2;
    const contentH = paper.h - paper.m * 2;
    const zoom = contentW / DESIGN_W;
    const headRef = useRef<HTMLDivElement>(null);
    const footRef = useRef<HTMLDivElement>(null);
    const [hh, setHh] = useState(0);
    const [fh, setFh] = useState(0);
    useLayoutEffect(() => {
        const measure = () => {
            // Spacers sit inside the zoomed body, so they take the unzoomed height.
            if (headRef.current) setHh(headRef.current.getBoundingClientRect().height / zoom);
            if (footRef.current) setFh(footRef.current.getBoundingClientRect().height / zoom);
        };
        measure();
        const ro = new ResizeObserver(measure);
        if (headRef.current) ro.observe(headRef.current);
        if (footRef.current) ro.observe(footRef.current);
        return () => ro.disconnect();
    }, [zoom]);
    const d = inv.date ? new Date(`${String(inv.date).slice(0, 10)}T00:00:00`) : null;
    const longDate = d ? `${d.getDate()} - ${d.toLocaleDateString('en-GB', { month: 'long' })} - ${d.getFullYear()}` : '';
    const day = d ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : '';
    const printTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    const due = dueInfo(inv);
    const remaining = n(t.prev_balance) + n(t.gross) - n(t.special) - n(t.shelf) - n(t.bill_disc) - n(t.paid);
    const cartons = inv.lines.reduce((s, l) => s + (isCarton(l) ? Math.floor(l.qty / l.carton) : 0), 0);
    const field = (k: string, v: React.ReactNode, kw = '24mm') => (
        <div className="flex min-w-0" style={{ gap: '1.5mm' }}>
            <span style={{ width: kw, flexShrink: 0, color: '#333' }}>{k}</span>
            <span className="min-w-0 flex-1" style={{ fontWeight: 600 }}>{v || '—'}</span>
        </div>
    );
    const th = (h: string, right = false, w?: string) => (
        <th style={{ border: B, padding: '0.8mm 1.1mm', fontWeight: 700, textAlign: right ? 'right' : 'left', width: w, lineHeight: 1.1 }}>{h}</th>
    );
    const td = (v: React.ReactNode, right = false, bold = false) => (
        <td style={{ border: B, padding: '0.5mm 1.1mm', textAlign: right ? 'right' : 'left', fontWeight: bold ? 600 : 400, verticalAlign: 'top', fontVariantNumeric: 'tabular-nums', lineHeight: 1.25 }}>{v}</td>
    );
    const sum = (k: string, v: any, strong = false) => (
        <td style={{ border: B, padding: '1.1mm 2mm' }}>
            <div className="flex items-baseline justify-between" style={{ gap: '2mm' }}>
                <span style={{ color: '#333' }}>{k}</span>
                <span style={{ fontWeight: strong ? 800 : 600, fontSize: strong ? '9.5pt' : undefined, fontVariantNumeric: 'tabular-nums' }}>{money(v)}</span>
            </div>
        </td>
    );
    const part = { width: `${DESIGN_W}mm`, zoom, fontSize: '8pt', color: '#111' } as React.CSSProperties;

    return (
        <div className="inv sheet sheet-page mx-auto flex flex-col bg-white shadow-xl" style={{ width: `${contentW}mm`, minHeight: `${contentH}mm` }}>
            {/* Header — fixed at the top of every printed page */}
            <div ref={headRef} className="inv-head bg-white" style={part}>
                <div className="grid items-start" style={{ gridTemplateColumns: '48mm 1fr 56mm', gap: '3mm' }}>
                    <img src="/brand/aqt-monogram.png" alt="Al-Qavi Traders" loading="eager" style={{ width: '44mm', height: 'auto', marginTop: '0.5mm' }} />
                    <div className="flex flex-col items-center text-center">
                        <img src="/brand/aqt-name-ur.png" alt={NAME_UR} loading="eager" style={{ width: '64mm', height: 'auto' }} />
                        <div style={{ fontSize: '14pt', fontWeight: 800, marginTop: '0.8mm' }}>Sale Invoice</div>
                    </div>
                    <div style={{ fontSize: '7.8pt', lineHeight: 1.45 }}>
                        <div style={{ fontWeight: 800, fontSize: '8.5pt' }}>Proprietor:</div>
                        <div style={{ fontWeight: 600 }}>{pf.proprietor}</div>
                        <div>{region.name} Region</div>
                        <div className="grid" style={{ gridTemplateColumns: '19mm 1fr', marginTop: '0.8mm', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ color: '#333' }}>Easypaisa:</span><span style={{ fontWeight: 600 }}>{pf.easypaisa || '—'}</span>
                            <span style={{ color: '#333' }}>Contact No:</span><span style={{ fontWeight: 600 }}>{pf.contact_no || '—'}</span>
                            <span style={{ color: '#333' }}>Acct No:</span><span style={{ fontWeight: 600 }}>{pf.acct_no || '—'}</span>
                        </div>
                    </div>
                </div>
                <div style={{ borderBottom: '0.4mm solid #222', margin: '1.5mm 0 0' }} />
            </div>

            {/* Body */}
            <div className="flex-1" style={part}>
                <table className="inv-frame" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><td style={{ padding: 0 }}><div className="inv-spacer" style={{ height: hh }} /></td></tr></thead>
                    <tbody><tr><td style={{ padding: 0 }}>
                        <div className="grid" style={{ gridTemplateColumns: '1.05fr 1fr 1fr', columnGap: '4mm', rowGap: '0.7mm', margin: '2mm 0 1.6mm', fontSize: '7.8pt', lineHeight: 1.25 }}>
                            {field('Day:', day)}
                            {field('Inv. Date:', longDate, '17mm')}
                            {field('Print Time:', printTime, '17mm')}
                            {field('Inv. No #:', inv.invoice_no)}
                            <div className="col-span-2">{field('Customer Acc. ID:', c.acc_id, '27mm')}</div>
                            {field('Shop Name:', c.name)}
                            {field('Area:', c.area, '17mm')}
                            {field('Address:', c.address, '13mm')}
                            {field('Customer Name:', c.contact)}
                            <div className="col-span-2">{field('C. Cell No:', c.phone, '17mm')}</div>
                            {field('Saleman Name:', inv.staff)}
                            {field('Cell No:', inv.staff_cell, '17mm')}
                            {field('Due Date:', <span style={{ color: due.owing ? '#c62828' : undefined }}>{dmy(due.dueDate)}</span>, '13mm')}
                        </div>

                        <table style={{ fontSize: '7.5pt', width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#ececec' }}>
                                    {th('S.No', false, '8mm')}{th('PID', false, '11mm')}{th('Product Name')}{th('Carton', true, '12mm')}{th('Qty', true, '10mm')}
                                    {th('Bon', true, '8mm')}{th('TP', true, '15mm')}{th('Retail', true, '15mm')}{th('Special Disc %', true, '13mm')}
                                    {th('Shelf Rent %', true, '12mm')}{th('Net Amount', true, '20mm')}
                                </tr>
                            </thead>
                            <tbody>
                                {inv.lines.map((l, i) => (
                                    <tr key={i}>
                                        {td(i + 1, true)}{td(l.pid)}
                                        {td(<>{l.name}{l.expiry_date ? <span style={{ color: '#666', fontSize: '6.3pt' }}> · Exp {dmy(l.expiry_date)}</span> : null}</>)}
                                        {td(isCarton(l) ? cartonCount(l).replace(' Ctn', '') : '', true)}
                                        {td(qtyFmt(l.qty), true)}{td(qtyFmt(l.bonus), true)}{td(money(l.tp), true)}{td(money(l.retail), true)}
                                        {td(money(l.special_pct), true)}{td(money(l.shelf_pct), true)}{td(money(l.net), true, true)}
                                    </tr>
                                ))}
                                <tr style={{ background: '#f4f4f4', fontWeight: 700 }}>
                                    <td colSpan={3} style={{ border: B, padding: '0.6mm 1.1mm' }}>Total ({inv.lines.length} item{inv.lines.length === 1 ? '' : 's'})</td>
                                    {td(cartons || '', true, true)}{td(qtyFmt(t.pieces), true, true)}{td(qtyFmt(t.bonus), true, true)}
                                    <td colSpan={2} style={{ border: B }} />
                                    {td(money(t.special), true, true)}{td(money(t.shelf), true, true)}
                                    {td(money(n(t.gross) - n(t.special) - n(t.shelf)), true, true)}
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                            <table style={{ marginTop: '2mm', fontSize: '8pt', width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        {sum('Previous Amount', t.prev_balance)}
                                        {sum('Total Special Discount', n(t.special) + n(t.bill_disc))}
                                        {sum('Shelf Rent', t.shelf)}
                                        {sum('Total Amount', n(t.gross) - n(t.special) - n(t.shelf) - n(t.bill_disc), true)}
                                    </tr>
                                    <tr>
                                        <td style={{ border: B }} colSpan={2} />
                                        {sum('Advance Amount', t.paid)}
                                        <td style={{ border: B, padding: '1.1mm 2mm', background: '#ececec' }}>
                                            <div className="flex items-baseline justify-between" style={{ gap: '2mm' }}>
                                                <span style={{ fontWeight: 700 }}>Total Remaining Balance</span>
                                                <span style={{ fontWeight: 800, fontSize: '10pt', fontVariantNumeric: 'tabular-nums' }}>{money(remaining)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </td></tr></tbody>
                    <tfoot><tr><td style={{ padding: 0 }}><div className="inv-spacer" style={{ height: fh }} /></td></tr></tfoot>
                </table>
            </div>

            {/* Footer — fixed at the bottom of every printed page */}
            <div ref={footRef} className="inv-foot bg-white" style={part}>
                <div style={{ border: '0.35mm solid #222', padding: '1.3mm 2mm', marginTop: '2mm' }}><ShopsBanner /></div>
                <div style={{ border: '0.35mm solid #222', borderTop: 0, padding: '1mm 2mm', fontSize: '7.3pt', lineHeight: 1.35 }}>{SOLE_DISTRIBUTORS}</div>
                <div className="ur" dir="rtl" style={{ fontSize: '6.8pt', lineHeight: 1.95, marginTop: '0.8mm', textAlign: 'justify' }}>
                    {termsUr(region.code === 'SKD' ? 'سکردو' : 'گلگت')}
                </div>
                <div className="flex justify-between" style={{ marginTop: '6mm', fontSize: '8pt', fontWeight: 600 }}>
                    <div style={{ width: '58mm', borderTop: '0.3mm solid #222', textAlign: 'center', paddingTop: '0.6mm' }}>Store Manager</div>
                    <div style={{ width: '58mm', borderTop: '0.3mm solid #222', textAlign: 'center', paddingTop: '0.6mm' }}>Saleman</div>
                </div>
                <div style={{
                    marginTop: '1.5mm', padding: '1mm 2mm', borderRadius: '1mm', fontSize: '7.8pt', fontWeight: 600, textAlign: 'center',
                    border: `0.35mm solid ${due.owing ? '#c62828' : '#2e7d32'}`, color: due.owing ? '#c62828' : '#2e7d32',
                    background: due.owing ? (due.overdue ? '#ffe5e5' : '#fff3f3') : '#eef8ef',
                }}>
                    {due.owing ? '⚠ ' : '✓ '}{due.text}
                </div>
            </div>
        </div>
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

/* ───────────────────────── Thermal slip (80 / 58 mm) ─────────────────────────
   The same header and footer as the page invoice, stacked for a narrow roll:
   monogram, Urdu name, "Sale Invoice", proprietor + region + phones; invoice /
   customer details; lines; totals; the 15-day alert; shops, distributors,
   terms and signatures. Black only — thermal heads print no colour. */
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
    const region = inv.region || { code: 'GLT', name: 'Gilgit' };
    const pf = inv.profile || DEFAULT_PROFILE;
    const small = widthMm < 60;
    const fs = small ? 7 : 8;
    const due = dueInfo(inv);
    const d = inv.date ? new Date(`${String(inv.date).slice(0, 10)}T00:00:00`) : null;
    const day = d ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : '';
    const rule = <div style={{ borderTop: '0.3mm dashed #000', margin: '1.3mm 0' }} />;
    const kv = (k: string, v: React.ReactNode) => (
        <div className="flex" style={{ gap: '1.5mm' }}><span style={{ minWidth: small ? '15mm' : '19mm', color: '#333' }}>{k}</span><span className="min-w-0 flex-1">{v || '—'}</span></div>
    );
    const row = (k: string, v: any, bold = false) => (
        <div className="flex justify-between" style={{ fontWeight: bold ? 700 : 400, fontSize: bold ? `${fs + 1}pt` : `${fs}pt` }}>
            <span>{k}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</span>
        </div>
    );
    const shop = (text: string) => (
        <div className="ur" dir="rtl" style={{ background: '#000', color: '#fff', fontSize: `${fs - 0.5}pt`, lineHeight: 1.9, padding: '0 2mm', textAlign: 'center', marginTop: '0.8mm' }}>{text}</div>
    );
    return (
        <div ref={ref} className="inv sheet mx-auto bg-white shadow-xl" style={{ width: `${widthMm}mm`, padding: '1mm 0', fontSize: `${fs}pt`, lineHeight: 1.35, color: '#000' }}>
            {/* Header — as on the page invoice */}
            <div className="flex flex-col items-center text-center">
                <img src="/brand/aqt-monogram-black.png" alt="Al-Qavi Traders" style={{ width: small ? '30mm' : '40mm', height: 'auto' }} />
                <img src="/brand/aqt-name-ur-black.png" alt={NAME_UR} style={{ width: small ? '40mm' : '52mm', height: 'auto', marginTop: '1mm' }} />
                <div style={{ fontSize: `${fs + 3}pt`, fontWeight: 800, marginTop: '0.6mm' }}>Sale Invoice</div>
                <div style={{ marginTop: '1mm', lineHeight: 1.4 }}>
                    <b>Proprietor:</b> {pf.proprietor}<br />
                    {region.name} Region<br />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        Easypaisa: <b>{pf.easypaisa || '—'}</b> · Contact: <b>{pf.contact_no || '—'}</b>
                    </span>
                </div>
            </div>
            {rule}
            {kv('Inv. No #:', <b>{inv.invoice_no}</b>)}
            {kv('Inv. Date:', `${dmy(inv.date)} (${day})`)}
            {kv('Print Time:', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }))}
            {kv('Acc. No #:', c.acc_id)}
            {kv('Shop Name:', c.name)}
            {kv('Customer:', c.contact)}
            {kv('Cell No:', c.phone)}
            {kv('Address:', c.address)}
            {kv('Area:', c.area)}
            {kv('Saleman:', inv.staff ? `${inv.staff}${inv.staff_cell ? ` · ${inv.staff_cell}` : ''}` : '')}
            {rule}
            {inv.lines.map((l, i) => (
                <div key={i} style={{ marginBottom: '1.1mm', breakInside: 'avoid' }}>
                    <div style={{ fontWeight: 600 }}>{i + 1}. {l.name}</div>
                    <div className="flex justify-between">
                        <span>
                            {isCarton(l) ? `Carton ${cartonCount(l)} = ${qtyFmt(l.qty)} pcs` : `Piece ${qtyFmt(l.qty)} pcs`} × {money(l.tp)}
                            {l.bonus ? ` +${qtyFmt(l.bonus)} bon` : ''}
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
            <div>Total Carton = {inv.lines.reduce((s2, l) => s2 + (isCarton(l) ? Math.floor(l.qty / l.carton) : 0), 0)} · Total Pcs = {qtyFmt(t.pieces)}{t.bonus ? ` (+${qtyFmt(t.bonus)} bonus)` : ''}</div>
            {row('Previous Amount', t.prev_balance)}
            {row('Total Amount', t.gross, true)}
            {row('Total Special Discount', n(t.special) + n(t.bill_disc))}
            {row('Shelf Rent', t.shelf)}
            {row('Advance Amount', t.paid)}
            <div style={{ borderTop: '0.4mm solid #000', marginTop: '0.8mm', paddingTop: '0.4mm' }}>
                {row('Total Remaining Balance', n(t.prev_balance) + n(t.gross) - n(t.special) - n(t.shelf) - n(t.bill_disc) - n(t.paid), true)}
            </div>
            {rule}
            {/* Footer — as on the page invoice */}
            {shop(SHOP_GILGIT_UR)}
            <div className="ur" dir="rtl" style={{ fontSize: `${fs - 0.5}pt`, lineHeight: 1.9, textAlign: 'center' }}>{SLOGAN_UR}</div>
            {shop(SHOP_SKARDU_UR)}
            <div style={{ border: '0.3mm solid #000', padding: '0.6mm 1.4mm', marginTop: '1.2mm' }}>
                <div style={{ fontSize: `${fs - 1}pt`, lineHeight: 1.35 }}>{SOLE_DISTRIBUTORS}</div>
            </div>
            <div style={{ border: '0.4mm solid #000', padding: '0.9mm 1.4mm', fontWeight: 700, textAlign: 'center', marginTop: '1.4mm' }}>
                Due Date: {dmy(due.dueDate)}<br />{due.owing ? '⚠ ' : ''}{due.text}
            </div>
            <div className="flex justify-between" style={{ gap: '4mm', marginTop: '7mm', fontWeight: 600 }}>
                <div style={{ flex: 1, borderTop: '0.3mm solid #000', textAlign: 'center', paddingTop: '0.6mm' }}>Store Manager</div>
                <div style={{ flex: 1, borderTop: '0.3mm solid #000', textAlign: 'center', paddingTop: '0.6mm' }}>Saleman</div>
            </div>
        </div>
    );
}
