"use client";

/*
 * Trade 1.0 — printed Sale Invoice.
 *
 *   a5   Half an A4 sheet, landscape (A5 landscape, 210 x 148 mm): monogram,
 *        Urdu name + tagline, the shops banner, account / address / salesman,
 *        the lines with Unit, Bonus, Special Disc % and Shelf %, the totals
 *        and balance, signatures and a barcode of the invoice number.
 *   80 / 58  Thermal slip for a small receipt / label printer — the same
 *        content stacked in one narrow column, barcode at the foot.
 *
 * `@page` is document-wide, so only the chosen layout is rendered.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import api from '@/lib/axios';
import { code128B } from '@/lib/code128';

export type InvoiceSize = 'a5' | '80' | '58';
export const INVOICE_SIZES: { v: InvoiceSize; label: string }[] = [
    { v: 'a5', label: 'Half A4 (landscape)' },
    { v: '80', label: 'Slip 80 mm' },
    { v: '58', label: 'Slip 58 mm' },
];
const SIZE_KEY = 'trade.invoice.size';
export const savedInvoiceSize = (): InvoiceSize => {
    try { const v = localStorage.getItem(SIZE_KEY); return v === '80' || v === '58' ? v : 'a5'; } catch { return 'a5'; }
};

/* Business details (from the shop's letterhead and visiting card). */
const C = { blue: '#2B2F8F', blueDeep: '#1F2370', green: '#14935C', yellow: '#FFD21F', sky: '#2F8FD8' };
const CEO_UR = 'سید سجاد حسین';
const PHONES = ['0335-1240190', '0355-5555190'];
const SLOGAN_A_UR = 'مشہور اور با اعتماد';
const SLOGAN_B_UR = 'ملکی و غیر ملکی کاسمیٹکس کا مرکز';
const DISTRIBUTOR_UR = 'ڈسٹری بیوٹر آف';
const DISTRIBUTES_UR = 'بائیو آملہ کمپنی، مدر کیئر کمپنی، فیس فریش کمپنی، سعید غنی کمپنی، آئش کمپنی، کلر آن کمپنی، سکین وائٹ کمپنی، ڈرما شائن کمپنی، سپر گریس کمپنی، برجین کمپنی، ایزی کلین کمپنی اور یونیورسل کمپنی کی پروڈکٹس کیلئے ہماری خدمات حاصل کریں۔ شکریہ';
const NAME_UR = 'القوی ٹریڈرز';
const TAGLINE_UR = 'کاسمیٹکس ڈیلر گلگت بلتستان';
const SHOP_GILGIT_UR = 'قاسمی مارکیٹ CMH روڈ خومر گلگت';
const SHOP_SKARDU_UR = 'ابراہیم مارکیٹ کلفٹن پل سکردو';

type Line = {
    pid: string; name: string; expiry_date: string | null; unit: string; packing: number; carton: number;
    qty: number; bonus: number; tp: number; gross: number; special: number; shelf: number; net: number;
    special_pct: number; shelf_pct: number;
};
type Invoice = {
    id: string; invoice_no: string; date: string; time: string; staff: string;
    customer: { acc_id: string; name: string; address: string; area: string; phone: string };
    lines: Line[];
    totals: { pieces: number; bonus: number; gross: number; special: number; shelf: number; bill_disc: number;
        net: number; prev_balance: number; total: number; paid: number; balance: number };
};

const n = (v: any) => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const money = (v: any) => n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (v: any) => n(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const pct = (v: any) => (n(v) ? `${qtyFmt(v)}%` : '');
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

/* "2 Ctn" when a carton line is whole cartons, else "Pcs". */
function unitLabel(l: Line) {
    if (l.unit === 'CARTON' && l.carton > 0) {
        const c = l.qty / l.carton;
        return Number.isInteger(c) ? `${c} Ctn` : `${Math.floor(c)} Ctn + ${l.qty % l.carton}`;
    }
    return 'Pcs';
}

/* Sized in millimetres: `moduleMm` is the narrowest bar (0.25 mm = 2 dots on a
   203 dpi thermal head; 0.375 mm = 3 dots), so scanners read it reliably. */
function Barcode({ value, heightMm, moduleMm }: { value: string; heightMm: number; moduleMm: number }) {
    const bars = useMemo(() => code128B(value), [value]);
    if (!bars) return null;
    const quiet = 10;
    const total = bars.reduce((s, w) => s + w, 0) + quiet * 2;
    let x = quiet;
    const rects: JSX.Element[] = [];
    bars.forEach((w, i) => {
        if (i % 2 === 0) rects.push(<rect key={i} x={x} y={0} width={w} height={1} />);
        x += w;
    });
    return (
        <svg viewBox={`0 0 ${total} 1`} width={`${total * moduleMm}mm`} height={`${heightMm}mm`} preserveAspectRatio="none"
            shapeRendering="crispEdges" aria-label={`Barcode ${value}`} style={{ display: 'block' }}>
            <g fill="#000">{rects}</g>
        </svg>
    );
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap');`;

export default function TradeInvoicePrint({ id }: { id: string }) {
    const [inv, setInv] = useState<Invoice | null>(null);
    const [err, setErr] = useState('');
    const [size, setSize] = useState<InvoiceSize>('a5');
    const [autoPrint, setAutoPrint] = useState(false);
    // A roll has no fixed page length: the slip's page is exactly as long as
    // its content (measured after layout), so the printer feeds no blank paper.
    const [slipH, setSlipH] = useState(0);

    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const s = q.get('size');
        setSize(s === 'a5' || s === '80' || s === '58' ? s : savedInvoiceSize());
        setAutoPrint(q.has('print'));
        api.get(`v1/sales/orders/${id}/trade_invoice/`)
            .then(({ data }) => setInv(data))
            .catch((e) => setErr(e?.response?.data?.detail || 'Could not load the invoice.'));
    }, [id]);

    useEffect(() => { if (inv) document.title = `Invoice ${inv.invoice_no}`; }, [inv]);

    // Print once the data and the Urdu fonts are in (else the first print shows fallbacks).
    useEffect(() => {
        if (!inv || !autoPrint || (size !== 'a5' && !slipH)) return;
        let done = false;
        const go = () => { if (!done) { done = true; setAutoPrint(false); window.print(); } };
        (document as any).fonts?.ready?.then(() => setTimeout(go, 250));
        const t = setTimeout(go, 3500);
        return () => clearTimeout(t);
    }, [inv, autoPrint, size, slipH]);

    const pick = (s: InvoiceSize) => {
        setSize(s);
        try { localStorage.setItem(SIZE_KEY, s); } catch { /* ignore */ }
    };

    const slipW = size === '58' ? 54 : 74; // printable width in mm
    const pageCss = size === 'a5'
        ? '@page { size: A5 landscape; margin: 6mm; }'
        : `@page { size: ${size}mm ${Math.max(60, Math.ceil(slipH) + 6)}mm; margin: 3mm 0; }`;

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

            {/* Toolbar (screen only) */}
            <div className="no-print mx-auto mb-4 flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
                <span className="text-[13px] font-bold text-slate-600">Print size</span>
                {INVOICE_SIZES.map((o) => (
                    <button key={o.v} type="button" onClick={() => pick(o.v)}
                        className={`h-8 rounded-md border px-3 text-[13px] font-semibold ${size === o.v ? 'border-[#3d3f95] bg-[#3d3f95] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                        {o.label}
                    </button>
                ))}
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

            {inv && size === 'a5' && <A5Sheet inv={inv} />}
            {inv && size !== 'a5' && <Slip inv={inv} widthMm={slipW} onHeight={setSlipH} />}
        </div>
    );
}

/* ───────────────────────── Half A4, landscape ───────────────────────── */
function A5Sheet({ inv }: { inv: Invoice }) {
    const t = inv.totals;
    const c = inv.customer;
    const anyShelf = inv.lines.some((l) => n(l.shelf) > 0);
    const anySpecial = inv.lines.some((l) => n(l.special) > 0);
    return (
        <div className="inv sheet mx-auto bg-white shadow-xl" style={{ width: '198mm', minHeight: '136mm', padding: '0' }}>
            <div style={{ padding: '0 0 1mm' }}>
                <CardHeader inv={inv} />

                {/* Account */}
                <div className="grid" style={{ gridTemplateColumns: '1.25fr 1.6fr 1fr', gap: '0 4mm', fontSize: '8.5pt', margin: '2mm 0 1.5mm', lineHeight: 1.45 }}>
                    <div><span style={{ color: '#666' }}>Account: </span><b style={{ fontFamily: 'ui-monospace, monospace' }}>{c.acc_id}</b><br /><b style={{ fontSize: '10pt' }}>{c.name}</b></div>
                    <div><span style={{ color: '#666' }}>Address: </span>{c.address || '—'}{c.area ? <><br /><span style={{ color: '#666' }}>Area: </span>{c.area}</> : null}</div>
                    <div><span style={{ color: '#666' }}>Phone: </span>{c.phone || '—'}<br /><span style={{ color: '#666' }}>Salesman: </span>{inv.staff || '—'}</div>
                </div>

                {/* Lines */}
                <table style={{ fontSize: '8pt' }}>
                    <thead>
                        <tr style={{ background: C.blue, color: '#fff' }}>
                            {['#', 'PID', 'Product Name', 'Expiry', 'Unit', 'Qty', 'Bonus', 'T.P', 'Amount',
                              ...(anySpecial ? ['S.Disc'] : []), ...(anyShelf ? ['Shelf'] : []), 'Net Amount'].map((h, i) => (
                                <th key={h} style={{ padding: '1.2mm 1.3mm', fontWeight: 700, textAlign: i <= 4 ? 'left' : 'right', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {inv.lines.map((l, i) => (
                            <tr key={i} style={{ borderBottom: '0.2mm solid #d4d4dc', background: i % 2 ? '#f6f6fb' : '#fff' }}>
                                <td style={cell()}>{i + 1}</td>
                                <td style={{ ...cell(), fontFamily: 'ui-monospace, monospace' }}>{l.pid}</td>
                                <td style={{ ...cell(), fontWeight: 600 }}>{l.name}</td>
                                <td style={{ ...cell(), whiteSpace: 'nowrap' }}>{dmy(l.expiry_date)}</td>
                                <td style={{ ...cell(), whiteSpace: 'nowrap' }}>{unitLabel(l)}</td>
                                <td style={cell(true)}>{qtyFmt(l.qty)}</td>
                                <td style={cell(true)}>{l.bonus ? qtyFmt(l.bonus) : ''}</td>
                                <td style={cell(true)}>{money(l.tp)}</td>
                                <td style={cell(true)}>{money(l.gross)}</td>
                                {anySpecial && <td style={cell(true)}>{pct(l.special_pct)}</td>}
                                {anyShelf && <td style={cell(true)}>{pct(l.shelf_pct)}</td>}
                                <td style={{ ...cell(true), fontWeight: 700 }}>{money(l.net)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals (two short columns) + signatures — kept short so the sheet stays on one page */}
                <div className="flex" style={{ gap: '4mm', marginTop: '2.5mm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div className="flex flex-1 flex-col justify-between" style={{ fontSize: '8.5pt' }}>
                        <div>
                            <b>Total Products = {qtyFmt(t.pieces)}</b>{t.bonus ? <span style={{ color: '#555' }}> (+{qtyFmt(t.bonus)} bonus)</span> : null}
                            <span style={{ color: '#555' }}> · {inv.lines.length} item{inv.lines.length === 1 ? '' : 's'}</span>
                        </div>
                        <div className="flex" style={{ gap: '6mm', marginTop: '6mm' }}>
                            <div style={{ flex: 1, borderTop: '0.25mm solid #333', paddingTop: '0.8mm', textAlign: 'center', color: '#444' }}>Customer Signature</div>
                            <div style={{ flex: 1, borderTop: '0.25mm solid #333', paddingTop: '0.8mm', textAlign: 'center', color: '#444' }}>For Al-Qavi Traders</div>
                        </div>
                    </div>
                    <table style={{ width: '56mm', fontSize: '8pt', alignSelf: 'flex-start' }}>
                        <tbody>
                            <TotRow k="Amount Billed" v={t.gross} />
                            {n(t.special) > 0 && <TotRow k="Special Discount" v={-n(t.special)} />}
                            {n(t.shelf) > 0 && <TotRow k="Shelf Rate" v={-n(t.shelf)} />}
                            {n(t.bill_disc) > 0 && <TotRow k="Bill Discount" v={-n(t.bill_disc)} />}
                            <TotRow k="Net Amount" v={t.net} bold />
                        </tbody>
                    </table>
                    <table style={{ width: '56mm', fontSize: '8pt', alignSelf: 'flex-start' }}>
                        <tbody>
                            <TotRow k="Previous Balance" v={t.prev_balance} />
                            <TotRow k="Total" v={t.total} />
                            <TotRow k="Paid Cash" v={-n(t.paid)} />
                            <tr style={{ background: C.green, color: '#fff' }}>
                                <td style={{ padding: '1mm 2mm', fontWeight: 800 }}>Net Balance</td>
                                <td style={{ padding: '1mm 2mm', fontWeight: 800, textAlign: 'right', fontSize: '10pt' }}>{money(t.balance)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <DistributorBand />
            </div>
        </div>
    );
}

const cell = (right = false): React.CSSProperties => ({ padding: '1mm 1.3mm', textAlign: right ? 'right' : 'left', verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' });

function TotRow({ k, v, bold }: { k: string; v: any; bold?: boolean }) {
    return (
        <tr style={{ borderBottom: '0.2mm solid #e1e1e8' }}>
            <td style={{ padding: '0.7mm 2mm', color: bold ? '#111' : '#555', fontWeight: bold ? 800 : 500 }}>{k}</td>
            <td style={{ padding: '0.7mm 2mm', textAlign: 'right', fontWeight: bold ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{money(v)}</td>
        </tr>
    );
}

/* Header in the visiting card's design: royal-blue band, a white panel with a
   curved edge holding the monogram, CEO and phones; the Urdu name in white,
   the tagline in yellow, the slogan in two white pills joined by a yellow bar;
   the invoice box (number, date, barcode) on the left of the band. */
function CardHeader({ inv }: { inv: Invoice }) {
    const pill = (text: string, cut: 'left' | 'right') => (
        <div className="ur-name" style={{
            background: '#fff', color: C.blueDeep, fontSize: '9.5pt', lineHeight: 1, padding: '1.3mm 4mm 1.9mm', whiteSpace: 'nowrap',
            clipPath: cut === 'left' ? 'polygon(2.5mm 0, 100% 0, 100% 100%, 2.5mm 100%, 0 50%)' : 'polygon(0 0, calc(100% - 2.5mm) 0, 100% 50%, calc(100% - 2.5mm) 100%, 0 100%)',
        }}>{text}</div>
    );
    return (
        <div className="flex overflow-hidden" style={{ height: '33mm', borderRadius: '3mm', background: `linear-gradient(100deg, ${C.blueDeep}, ${C.blue} 55%)` }}>
            {/* White logo panel with the card's curved edge */}
            <div className="flex shrink-0 flex-col justify-center" style={{ width: '58mm', background: '#fff', borderRadius: '0 18mm 18mm 0', padding: '0 7mm 0 4mm', boxShadow: `1.2mm 0 0 0 ${C.yellow}` }}>
                <img src="/brand/aqt-monogram-card.png" alt="Al-Qavi Traders" style={{ height: '14mm', width: 'auto', alignSelf: 'flex-start' }} />
                <div className="flex items-center" style={{ gap: '1.5mm', marginTop: '1mm', marginBottom: '1.6mm' }}>
                    <span style={{ background: C.sky, color: '#fff', fontSize: '6.5pt', fontWeight: 800, padding: '0.4mm 2.4mm 0.4mm 1.6mm', clipPath: 'polygon(0 0, calc(100% - 1.4mm) 0, 100% 50%, calc(100% - 1.4mm) 100%, 0 100%)' }}>CEO</span>
                    <span className="ur" dir="rtl" style={{ fontSize: '8pt', lineHeight: 1.5, color: '#333' }}>{CEO_UR}</span>
                </div>
                <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#444', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
                    {PHONES.map((ph) => <div key={ph}>{ph}</div>)}
                </div>
            </div>

            {/* Invoice box */}
            <div className="flex shrink-0 flex-col items-center justify-center" style={{ width: '44mm', margin: '2.5mm 0 2.5mm 4mm', background: '#fff', borderRadius: '2mm', padding: '1.5mm 2mm' }}>
                <div style={{ fontSize: '9.5pt', fontWeight: 800, letterSpacing: '0.14em', color: C.blue }}>SALE INVOICE</div>
                <div style={{ fontSize: '10.5pt', fontWeight: 800, fontFamily: 'ui-monospace, monospace', marginTop: '0.6mm' }}>{inv.invoice_no}</div>
                <div style={{ fontSize: '8pt', color: '#555' }}>Date: <b style={{ color: '#111' }}>{dmy(inv.date)}</b></div>
                <div style={{ marginTop: '1mm' }}><Barcode value={inv.invoice_no} heightMm={7} moduleMm={0.25} /></div>
            </div>

            {/* Name, tagline, slogan */}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center" dir="rtl" style={{ padding: '0 3mm' }}>
                <div className="ur-name" style={{ fontSize: '27pt', lineHeight: 1.05, color: '#fff' }}>{NAME_UR}</div>
                <div className="ur-name" style={{ fontSize: '12.5pt', lineHeight: 1.35, color: C.yellow }}>{TAGLINE_UR}</div>
                <div className="flex items-center" style={{ gap: '1.6mm', marginTop: '1.4mm' }}>
                    {pill(SLOGAN_A_UR, 'left')}
                    <div style={{ width: '6mm', height: '5mm', background: `repeating-linear-gradient(180deg, ${C.yellow} 0 0.7mm, ${C.blueDeep} 0.7mm 1.1mm)` }} />
                    {pill(SLOGAN_B_UR, 'right')}
                </div>
                <div className="ur" style={{ fontSize: '7pt', lineHeight: 1.9, color: '#dfe2ff', marginTop: '0.6mm', whiteSpace: 'nowrap' }}>
                    {SHOP_GILGIT_UR}<span style={{ color: C.yellow, margin: '0 2mm' }}>◆</span>{SHOP_SKARDU_UR}
                </div>
            </div>
        </div>
    );
}

/* The card's green band: "Distributor of" tag and the companies we supply. */
function DistributorBand() {
    return (
        <div className="flex items-stretch overflow-hidden" dir="rtl" style={{ marginTop: '2.5mm', background: C.green, borderRadius: '2mm', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="ur flex shrink-0 items-center" style={{ background: C.sky, color: '#fff', fontSize: '8pt', lineHeight: 1, padding: '0 3mm 0 5mm' }}>
                <span style={{ transform: 'translateY(0.5mm)' }}>{DISTRIBUTOR_UR}</span>
            </div>
            <div style={{ width: 0, height: 0, borderTop: '4.5mm solid transparent', borderBottom: '4.5mm solid transparent', borderRight: `3mm solid ${C.sky}`, alignSelf: 'center' }} />
            <div className="ur" style={{ color: '#fff', fontSize: '7pt', lineHeight: 2, padding: '0.6mm 3mm 0.6mm 3mm', textAlign: 'justify' }}>{DISTRIBUTES_UR}</div>
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
                            {qtyFmt(l.qty)} {unitLabel(l) === 'Pcs' ? 'pcs' : `pcs (${unitLabel(l)})`} × {money(l.tp)}
                            {l.bonus ? ` +${qtyFmt(l.bonus)} bonus` : ''}
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(l.gross)}</span>
                    </div>
                    {(n(l.special) > 0 || n(l.shelf) > 0) && (
                        <div className="flex justify-between" style={{ fontSize: `${fs - 0.5}pt` }}>
                            <span>{[n(l.special) > 0 ? `S.Disc ${pct(l.special_pct)}` : '', n(l.shelf) > 0 ? `Shelf ${pct(l.shelf_pct)}` : ''].filter(Boolean).join(' · ')}</span>
                            <span>-{money(n(l.special) + n(l.shelf))}</span>
                        </div>
                    )}
                </div>
            ))}
            {rule}
            <div style={{ fontWeight: 700 }}>Total Products = {qtyFmt(t.pieces)}{t.bonus ? ` (+${qtyFmt(t.bonus)} bonus)` : ''}</div>
            {row('Amount Billed', t.gross)}
            {n(t.special) > 0 && row('Special Discount', -n(t.special))}
            {n(t.shelf) > 0 && row('Shelf Rate', -n(t.shelf))}
            {n(t.bill_disc) > 0 && row('Bill Discount', -n(t.bill_disc))}
            {row('Net Amount', t.net, true)}
            {row('Previous Balance', t.prev_balance)}
            {row('Paid Cash', -n(t.paid))}
            <div style={{ borderTop: '0.4mm solid #000', marginTop: '1mm', paddingTop: '0.5mm' }}>{row('Net Balance', t.balance, true)}</div>
            {rule}
            <div className="flex flex-col items-center">
                <Barcode value={inv.invoice_no} heightMm={small ? 9 : 11} moduleMm={small ? 0.25 : 0.375} />
                <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, letterSpacing: '0.15em', marginTop: '0.5mm' }}>{inv.invoice_no}</div>
                <div className="ur" dir="rtl" style={{ lineHeight: 2.1, marginTop: '0.5mm' }}>خریداری کا شکریہ</div>
            </div>
            {rule}
            <div className="ur" dir="rtl" style={{ fontSize: `${fs - 1.5}pt`, lineHeight: 2, textAlign: 'center' }}>
                <b>{DISTRIBUTOR_UR}:</b> {DISTRIBUTES_UR}
            </div>
        </div>
    );
}
