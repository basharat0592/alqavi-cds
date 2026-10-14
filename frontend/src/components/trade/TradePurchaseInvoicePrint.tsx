"use client";

/*
 * Printed purchase invoice (A4): the shop's letterhead, purchase / supplier
 * details, the product lines (about 30 a page, header repeated on each page)
 * and, on the last page, Amount / Extra Disc / Freight / Fare / Goods / Extra
 * Tax / Net Amount / Paid Cash / Balance. Printed through a PDF like the sale
 * invoice, so every printer gives the same page. ?print=1 prints on open.
 *
 * A purchase order (K…) prints as "Purchase Order": PID, product, cartons and
 * quantity, with Pur.Rate / Sub Total / Amount — or, "Without prices"
 * (?prices=0, or the toolbar choice), the products and quantities only.
 */
import { useEffect, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import api from '@/lib/axios';
import { pn } from '@/lib/productName';
import { printSheets } from '@/lib/printWindow';
import { closeTradeWindow } from '@/components/trade/TradeSaleInvoice';

const n = (v: any) => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
const money = (v: any) => n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (v: any) => n(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
const dmy = (iso: any) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const ROWS = 30;
const B = '0.3mm solid #222';

type Pur = {
    purchase_no: string; kind?: 'order' | 'purchase'; date: string; bill_no: string; supplier_acc: string; supplier: string; staff: string;
    amount: any; extra_disc: any; freight: any; fare: any; goods: any; tax: any; net: any; paid: any;
    lines: { pid: string; name: string; qty: any; bonus: any; expiry_date: string | null; pur_rate: any; sale_rate: any; retail_rate: any; sub_total: any }[];
};

export default function TradePurchaseInvoicePrint({ id }: { id: string }) {
    const [p, setP] = useState<Pur | null>(null);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const [prices, setPrices] = useState(() => typeof window === 'undefined' || new URLSearchParams(window.location.search).get('prices') !== '0');
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        api.get(`v1/sales/trade-purchase-invoice/${id}/`).then(({ data }) => setP(data))
            .catch((e) => setErr(e?.response?.data?.detail || 'Could not load the purchase.'));
    }, [id]);
    const isOrder = p?.kind === 'order';
    const title = isOrder ? 'Purchase Order' : 'Purchase Invoice';
    useEffect(() => { if (p) document.title = `${title} ${p.purchase_no}`; }, [p, title]);

    const sheets = () => Array.from(root.current?.querySelectorAll<HTMLElement>('.pinv-page') || []);
    const run = async (save?: string) => {
        if (busy || !p) return;
        setBusy(true);
        try { await printSheets(sheets(), save); } catch { setErr('Could not prepare the print.'); } finally { setBusy(false); }
    };
    // Print once the data and the letterhead images are in.
    const [auto] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('print'));
    useEffect(() => {
        if (!p || !auto) return;
        const imgs = Array.from(document.images).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); })));
        Promise.all([(document as any).fonts?.ready, ...imgs]).then(() => setTimeout(() => run(), 400));
    }, [p, auto]); // eslint-disable-line react-hooks/exhaustive-deps

    if (err) return <p className="p-6 text-center text-[14px] font-semibold text-red-600">{err}</p>;
    if (!p) return <p className="p-6 text-center text-[14px] text-slate-500">Loading purchase…</p>;

    const pages: number[][] = [];
    for (let i = 0; i < Math.max(1, p.lines.length); i += ROWS) pages.push(p.lines.slice(i, i + ROWS).map((_, k) => i + k));
    const balance = n(p.net) - n(p.paid);
    const th = (h: string, right = false, w?: string) => <th style={{ border: B, padding: '0.8mm 1.2mm', textAlign: right ? 'right' : 'left', width: w, background: '#ececec' }}>{h}</th>;
    const td = (v: React.ReactNode, right = false, bold = false) => <td style={{ border: B, padding: '0.6mm 1.2mm', textAlign: right ? 'right' : 'left', fontWeight: bold ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>{v}</td>;
    const kv = (k: string, v: React.ReactNode) => (
        <div className="flex" style={{ gap: '2mm' }}><span style={{ width: '24mm', color: '#333' }}>{k}</span><span style={{ fontWeight: 600 }}>{v || '—'}</span></div>
    );

    return (
        <div className="min-h-screen bg-slate-200 py-6">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 border border-slate-300 bg-white px-3 py-2 shadow-sm">
                <span className="text-[13px] font-bold text-slate-600">{title} {p.purchase_no}</span>
                <span className="mx-1 h-6 w-px bg-slate-200" />
                {isOrder && (<>
                    {[true, false].map((v) => (
                        <button key={String(v)} type="button" onClick={() => setPrices(v)}
                            className={`h-8 border px-3 text-[13px] font-semibold ${prices === v ? 'border-[#3d3f95] bg-[#3d3f95] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                            {v ? 'With prices' : 'Without prices'}
                        </button>
                    ))}
                    <span className="mx-1 h-6 w-px bg-slate-200" />
                </>)}
                <button type="button" onClick={() => run(`${isOrder ? 'Purchase-Order' : 'Purchase'}-${p.purchase_no}${isOrder && !prices ? '-no-prices' : ''}.pdf`)} disabled={busy} className="h-8 border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">PDF</button>
                <button type="button" onClick={() => run()} disabled={busy} className="flex h-8 items-center gap-1.5 bg-emerald-600 px-3 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Printer size={14} /> {busy ? 'Preparing…' : 'Print'}
                </button>
                <button type="button" onClick={() => { if (window.confirm('Do you want to Close the Form ?')) closeTradeWindow(); }} className="flex h-8 items-center gap-1 border border-slate-300 px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                    <X size={14} /> Close
                </button>
            </div>

            <div ref={root}>
                {pages.map((idx, pi) => {
                    const last = pi === pages.length - 1;
                    return (
                        <div key={pi} className="pinv-page mx-auto mb-6 flex flex-col overflow-hidden bg-white shadow-xl"
                            style={{ width: '210mm', height: '297mm', padding: '8mm', boxSizing: 'border-box', fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif", fontSize: '8.5pt', color: '#111' }}>
                            <div style={{ textAlign: 'right', fontSize: '7.5pt', fontWeight: 700 }}>P. No {pi + 1} of {pages.length}</div>
                            <div className="grid items-center" style={{ gridTemplateColumns: '50mm 1fr 50mm', gap: '3mm' }}>
                                <img src="/brand/aqt-monogram.png" alt="Al-Qavi Traders" style={{ width: '40mm', aspectRatio: '1137 / 571', height: 'auto' }} />
                                <div className="flex flex-col items-center">
                                    <img src="/brand/aqt-name-ur.png" alt="" style={{ width: '56mm', aspectRatio: '1398 / 486', height: 'auto' }} />
                                    <div style={{ fontSize: '14pt', fontWeight: 800, marginTop: '1mm' }}>{title}</div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.5 }}>
                                    <div style={{ fontWeight: 800 }}>AL-QAVI TRADERS</div>
                                    <div>Gilgit-Baltistan</div>
                                    <div>Contact: 03138692190</div>
                                </div>
                            </div>
                            <div style={{ borderBottom: '0.4mm solid #222', margin: '2mm 0' }} />
                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1mm 6mm', marginBottom: '2.5mm' }}>
                                {kv(isOrder ? 'Order No:' : 'Pur. Inv No:', p.purchase_no)}{kv('Date:', dmy(p.date))}
                                {kv('Supplier:', `${p.supplier_acc}  ${p.supplier}`)}{isOrder ? <span /> : kv('Bill No:', p.bill_no)}
                                {!isOrder && <>{kv('Staff:', p.staff)}<span /></>}
                            </div>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                {isOrder ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                                    <thead><tr>{th('S.No', true, '10mm')}{th('PID', false, '15mm')}{th('Product Name')}{th('Qty (U)', true, '22mm')}
                                        {prices && <>{th('Pur.Rate', true, '22mm')}{th('Sub Total', true, '28mm')}</>}</tr></thead>
                                    <tbody>
                                        {idx.map((i) => {
                                            const l = p.lines[i];
                                            return <tr key={i}>{td(i + 1, true)}{td(l.pid)}{td(pn(l.name, '7pt'))}{td(qty(l.qty), true, true)}
                                                {prices && <>{td(money(l.pur_rate), true)}{td(money(l.sub_total), true, true)}</>}</tr>;
                                        })}
                                        {last && (
                                            <tr style={{ background: '#f4f4f4', fontWeight: 700 }}>
                                                <td colSpan={3} style={{ border: B, padding: '0.8mm 1.2mm' }}>Total ({p.lines.length} item{p.lines.length === 1 ? '' : 's'})</td>
                                                {td(qty(p.lines.reduce((s, l) => s + n(l.qty), 0)), true, true)}
                                                {prices && <><td style={{ border: B }} />{td(money(p.amount), true, true)}</>}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                    <thead><tr>{th('S.No', true, '9mm')}{th('PID', false, '13mm')}{th('Product Name')}{th('Qty', true, '12mm')}{th('Bonus', true, '11mm')}{th('Exp.Date', false, '18mm')}{th('Pur.Rate', true, '17mm')}{th('Sale Rate', true, '16mm')}{th('Retail', true, '15mm')}{th('Sub Total', true, '22mm')}</tr></thead>
                                    <tbody>
                                        {idx.map((i) => {
                                            const l = p.lines[i];
                                            return <tr key={i}>{td(i + 1, true)}{td(l.pid)}{td(pn(l.name, '6.5pt'))}{td(qty(l.qty), true)}{td(n(l.bonus) ? qty(l.bonus) : '', true)}{td(dmy(l.expiry_date))}{td(money(l.pur_rate), true)}{td(money(l.sale_rate), true)}{td(money(l.retail_rate), true)}{td(money(l.sub_total), true, true)}</tr>;
                                        })}
                                        {last && (
                                            <tr style={{ background: '#f4f4f4', fontWeight: 700 }}>
                                                <td colSpan={3} style={{ border: B, padding: '0.8mm 1.2mm' }}>Total ({p.lines.length} item{p.lines.length === 1 ? '' : 's'})</td>
                                                {td(qty(p.lines.reduce((s, l) => s + n(l.qty), 0)), true, true)}{td(qty(p.lines.reduce((s, l) => s + n(l.bonus), 0)), true, true)}
                                                <td colSpan={4} style={{ border: B }} />{td(money(p.amount), true, true)}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                )}
                                {last && !isOrder && (
                                    <table style={{ marginTop: '3mm', marginLeft: 'auto', width: '80mm', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                                        <tbody>
                                            {([['Amount', p.amount], ['Extra Disc', p.extra_disc], ['Freight', p.freight], ['Fare', p.fare], ['Goods', p.goods], ['Extra Tax', p.tax], ['Net Amount', p.net], ['Paid Cash', p.paid], ['Balance', balance]] as const)
                                                .filter(([k, v]) => n(v) !== 0 || ['Amount', 'Net Amount', 'Paid Cash', 'Balance'].includes(k))
                                                .map(([k, v]) => (
                                                    <tr key={k} style={k === 'Net Amount' || k === 'Balance' ? { fontWeight: 800 } : undefined}>
                                                        <td style={{ border: B, padding: '0.8mm 2mm' }}>{k}</td>
                                                        <td style={{ border: B, padding: '0.8mm 2mm', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(v)}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="flex justify-between" style={{ marginTop: '6mm', fontSize: '8pt', fontWeight: 600 }}>
                                <div style={{ width: '55mm', borderTop: '0.3mm solid #222', textAlign: 'center', paddingTop: '0.6mm' }}>{isOrder ? 'Ordered by' : 'Received by'}</div>
                                <div style={{ width: '55mm', borderTop: '0.3mm solid #222', textAlign: 'center', paddingTop: '0.6mm' }}>Store Manager</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
