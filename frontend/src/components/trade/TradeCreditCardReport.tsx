"use client";

/*
 * Trade 1.0 — Credit Card Report (dashboard button), in the Receipt Voucher's
 * View style: choose the card (name / card no), the entry, a search over
 * details / notes / customer, and From / To Date; OK lists every entry — date,
 * voucher, card and card no, customer, amount, card tax (the bank's charges,
 * always ours), received, bank, payment date, paid / remaining, details and
 * note — all in one view, with the totals for our cards and the customers'
 * card payments. Print makes A4 landscape pages; Excel exports the list.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { printSheets } from '@/lib/printWindow';
import {
    ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, guardWindowClose, closeTradeWindow, downloadXlsx,
} from '@/components/trade/TradeSaleInvoice';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const KIND: Record<string, string> = { post: 'Card Posting', customer: 'Customer Paid', pay: 'Card Bill Paid' };

type Row = {
    id: number; voucher_no: string; kind: string; date: string; card: string; card_no: string; customer: string; customer_acc: string;
    amount: number; charge_pct: number; charges: number; received: number; bank: string; billing_date: string | null; payment_date: string | null;
    paid: number | null; remaining: number | null; paid_date: string | null; state: string; detail: string; note: string; staff: string;
};
const COLS: { h: string; w: number; r?: boolean }[] = [
    { h: 'Voucher No', w: 8 }, { h: 'Date', w: 7 }, { h: 'Entry', w: 8.5 }, { h: 'Card / Card No', w: 11 }, { h: 'Customer', w: 11 },
    { h: 'Amount', w: 7, r: true }, { h: 'Tax %', w: 4, r: true }, { h: 'Card Tax', w: 6, r: true }, { h: 'Received', w: 7, r: true },
    { h: 'Bank', w: 8 }, { h: 'Payment Date', w: 7 }, { h: 'Remaining', w: 6.5, r: true }, { h: 'Details / Note', w: 9 },
];
const cells = (r: Row) => [
    r.voucher_no, dmy(r.date), KIND[r.kind] || r.kind, `${r.card}${r.card_no ? ` · ${r.card_no}` : ''}`, r.customer,
    fmt(num(r.amount)), r.kind === 'pay' ? '' : `${num(r.charge_pct)}%`, r.kind === 'pay' ? '' : fmt(num(r.charges)), fmt(num(r.received)),
    r.bank, dmy(r.payment_date), r.remaining === null || r.remaining === undefined ? '' : fmt(num(r.remaining)),
    [r.note, r.detail].filter(Boolean).join(' — '),
];

export default function TradeCreditCardReport() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Credit Card Report )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [cards, setCards] = useState<any[]>([]);
    useEffect(() => { api.get('v1/sales/trade-cards/').then(({ data }) => setCards(data)).catch(() => setCards([])); }, []);
    const [card, setCard] = useState('');
    const [kind, setKind] = useState('');
    const [q, setQ] = useState('');
    const [fromOn, setFromOn] = useState(false);
    const [from, setFrom] = useState(() => today().slice(0, 8) + '01');
    const [toOn, setToOn] = useState(false);
    const [to, setTo] = useState(today);
    const [rows, setRows] = useState<Row[] | null>(null);
    const [loading, setLoading] = useState(false);
    const run = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (card) params.card = card;
            if (kind) params.kind = kind;
            if (q.trim()) params.q = q.trim();
            if (fromOn) params.date_from = from;
            if (toOn) params.date_to = to;
            const { data } = await api.get('v1/sales/trade-cards/entries/', { params });
            setRows([...data].reverse());     // oldest first, like a statement
        } catch { toast.error('Could not load the report.'); setRows([]); }
        finally { setLoading(false); }
    };
    useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const list = rows || [];
    const sum = (k: keyof Row, f?: (r: Row) => boolean) => list.filter((r) => !f || f(r)).reduce((s, r) => s + num(r[k]), 0);
    const own = (r: Row) => r.kind === 'post';
    const cust = (r: Row) => r.kind === 'customer';
    const pays = (r: Row) => r.kind === 'pay';
    const totals = {
        posted: sum('amount', own), ownTax: sum('charges', own), ownRec: sum('received', own), paid: sum('amount', pays), owed: sum('remaining', own),
        custPaid: sum('amount', cust), custTax: sum('charges', cust), custRec: sum('received', cust),
    };
    const cardName = cards.find((c) => String(c.id) === card);
    const subtitle = [
        cardName ? `${cardName.name}${cardName.card_no ? ` ${cardName.card_no}` : ''}` : 'All cards',
        kind ? KIND[kind] : 'All entries',
        fromOn || toOn ? `${fromOn ? `From ${dmy(from)}` : ''}${fromOn && toOn ? ' ' : ''}${toOn ? `To ${dmy(to)}` : ''}` : 'All dates',
        q.trim() ? `"${q.trim()}"` : '',
    ].filter(Boolean).join('  ·  ');

    // Print: A4 landscape pages
    const sheetsRef = useRef<HTMLDivElement>(null);
    const [printing, setPrinting] = useState(false);
    const PER = 24;
    const pages = useMemo(() => {
        const out: Row[][] = [];
        for (let i = 0; i < Math.max(1, list.length); i += PER) out.push(list.slice(i, i + PER));
        return out;
    }, [list]);
    const print = async (save?: string) => {
        if (printing || !rows) return;
        setPrinting(true);
        try {
            await new Promise((r) => setTimeout(r, 300));
            const sheets = Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>('.cc-page') || []);
            await printSheets(sheets, save, 'landscape', 2);
        } catch { toast.error('Could not prepare the print.'); }
        finally { setPrinting(false); }
    };
    const excel = () => {
        if (!rows) return;
        downloadXlsx('credit-card-report', 'Credit Card Report', COLS.map((c) => c.h), list.map((r) => cells(r)));
    };

    const box = (label: string, v: number, red = false) => (
        <div className="flex min-w-0 flex-col">
            <span className="truncate text-[12px] font-semibold text-slate-600">{label}</span>
            <div className={`${FIELD} flex h-8 items-center justify-end font-bold ${red ? 'border-red-300 bg-[#ffe1e1] text-red-700' : 'border-sky-300 bg-[#c9f6ff] text-slate-900'}`}>{fmt(v)}</div>
        </div>
    );
    const dateIn = (on: boolean) => `${FIELD} w-full ${on ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`;

    const table = (rs: Row[], fs: string, withTotal: boolean) => (
        <table className="w-full table-fixed border-collapse" style={{ fontSize: fs }}>
            <colgroup>{COLS.map((c, i) => <col key={i} style={{ width: `${c.w}%` }} />)}</colgroup>
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                <tr>{COLS.map((c) => <th key={c.h} className={`overflow-hidden text-ellipsis whitespace-nowrap border border-slate-400 px-1.5 py-1.5 font-semibold ${c.r ? 'text-right' : ''}`}>{c.h}</th>)}</tr>
            </thead>
            <tbody>
                {rs.map((r) => (
                    <tr key={r.id} className={`tabular-nums ${r.state === 'overdue' ? 'bg-[#ffd9d9] text-red-700' : r.kind === 'pay' ? 'bg-[#eef4ff] text-blue-800' : r.kind === 'customer' ? 'bg-[#f2fbf2]' : 'bg-white'}`}>
                        {cells(r).map((v, k) => (
                            <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border border-slate-300 px-1.5 py-1 ${COLS[k].r ? 'text-right' : ''} ${k === 7 && v ? 'text-red-600' : ''}`}>{v}</td>
                        ))}
                    </tr>
                ))}
                {withTotal && rs.length > 0 && (
                    <tr className="bg-[#e8e8f4] font-bold tabular-nums">
                        <td className="border border-slate-400 px-1.5 py-1" colSpan={5}>Total ({list.length} entries)</td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(sum('amount'))}</td>
                        <td className="border border-slate-400" />
                        <td className="border border-slate-400 px-1.5 py-1 text-right text-red-700">{fmt(totals.ownTax + totals.custTax)}</td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(sum('received'))}</td>
                        <td className="border border-slate-400" colSpan={2} />
                        <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(totals.owed)}</td>
                        <td className="border border-slate-400" />
                    </tr>
                )}
            </tbody>
        </table>
    );

    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Credit Card Report )</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                {/* View Credit Card Detail */}
                <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                    <legend className="px-1.5 text-[16px] font-black text-[#c0192f]">View Credit Card Detail</legend>
                    <div className="grid grid-cols-[70px_minmax(0,1.3fr)_56px_minmax(0,1fr)_64px_minmax(0,1.3fr)_auto_minmax(0,0.9fr)_auto_minmax(0,0.9fr)_auto] items-center gap-x-2.5 gap-y-2">
                        <span className={`${LABEL} text-[14px]`}>Card</span>
                        <select value={card} onChange={(e) => setCard(e.target.value)} className={COA_SELECT}>
                            <option value="">All cards</option>
                            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.card_no ? ` · ${c.card_no}` : ''}{c.kind === 'machine' ? ' (machine)' : ''}</option>)}
                        </select>
                        <span className={`${LABEL} text-[14px]`}>Entry</span>
                        <select value={kind} onChange={(e) => setKind(e.target.value)} className={COA_SELECT}>
                            <option value="">All</option>
                            <option value="post">Card Posting (our card)</option>
                            <option value="customer">Customer Paid by Card</option>
                            <option value="pay">Card Bill Payment</option>
                        </select>
                        <span className={`${LABEL} text-[14px]`}>Search</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
                            placeholder="Details, notes, customer, card no, voucher" className={`${EDIT} w-full`} />
                        <label className={`${LABEL} flex items-center gap-1.5 whitespace-nowrap text-[14px]`}>
                            <input type="checkbox" checked={fromOn} onChange={(e) => setFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /> From Date
                        </label>
                        <input type="date" value={from} disabled={!fromOn} onChange={(e) => e.target.value && setFrom(e.target.value)} className={dateIn(fromOn)} />
                        <label className={`${LABEL} flex items-center gap-1.5 whitespace-nowrap text-[14px]`}>
                            <input type="checkbox" checked={toOn} onChange={(e) => setToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /> To Date
                        </label>
                        <input type="date" value={to} disabled={!toOn} onChange={(e) => e.target.value && setTo(e.target.value)} className={dateIn(toOn)} />
                        <button type="button" onClick={run} className={`${ACTION_BTN} !min-w-[70px]`}>{loading ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">O</span>K</>}</button>
                    </div>
                </fieldset>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                    {table(list, '12px', true)}
                    {rows && !list.length && <p className="px-3 py-6 text-center text-[13px] text-slate-500">No credit card entries for this search.</p>}
                    {!rows && <p className="px-3 py-6 text-center text-[13px] text-slate-500">Loading…</p>}
                </div>

                {/* Totals: our cards / customers' card payments */}
                <div className="grid shrink-0 grid-cols-[repeat(5,minmax(0,1fr))_14px_repeat(3,minmax(0,1fr))] items-end gap-2 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-3 py-2">
                    {box('Our cards: Posted', totals.posted)}
                    {box('Card Tax (ours)', totals.ownTax, true)}
                    {box('Amount Received', totals.ownRec)}
                    {box('Card Bills Paid', totals.paid)}
                    {box('Still Owed', totals.owed, totals.owed > 0)}
                    <span />
                    {box('Customers Paid by Card', totals.custPaid)}
                    {box('Card Tax (on us)', totals.custTax, true)}
                    {box('Received in Bank', totals.custRec)}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <ReadBox value={<span className="text-[#1f2bd6]">{subtitle}</span>} className="min-w-0 flex-1" />
                    <span className={`${LABEL} text-[14px]`}>Total Card Tax</span>
                    <div className={`${FIELD} flex h-9 w-[150px] items-center justify-end border-red-300 bg-[#ffe1e1] font-bold text-red-700`}>{fmt(totals.ownTax + totals.custTax)}</div>
                    <button type="button" onClick={() => print()} disabled={!rows || printing} className={ACTION_BTN}>{printing ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">P</span>rint</>}</button>
                    <button type="button" onClick={() => print('credit-card-report.pdf')} disabled={!rows || printing} className={ACTION_BTN}>PDF</button>
                    <button type="button" onClick={excel} disabled={!rows} className={ACTION_BTN}>Excel</button>
                    <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                </div>
            </div>

            {/* A4 landscape pages for Print / PDF (off screen) */}
            {rows && (
                <div ref={sheetsRef} aria-hidden style={{ position: 'fixed', left: -20000, top: 0 }}>
                    {pages.map((rs, i) => (
                        <div key={i} className="cc-page bg-white text-slate-900" style={{ width: '297mm', height: '210mm', padding: '9mm 9mm 7mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <div className="mb-2 flex items-end justify-between border-b-2 border-slate-800 pb-1">
                                <div>
                                    <div className="text-[17px] font-black">AL-QAVI TRADERS</div>
                                    <div className="text-[13px] font-bold">Credit Card Report</div>
                                    <div className="text-[10.5px] text-slate-600">{subtitle}</div>
                                </div>
                                <div className="text-right text-[10px] text-slate-600">Printed {dmy(today())}<br />Page {i + 1} of {pages.length}</div>
                            </div>
                            <div className="min-h-0 flex-1">{table(rs, '9.5px', i === pages.length - 1)}</div>
                            {i === pages.length - 1 && (
                                <div className="mt-2 grid grid-cols-4 gap-x-6 gap-y-0.5 border-t border-slate-400 pt-1.5 text-[10.5px]">
                                    {[['Our cards: Posted', totals.posted], ['Card Tax (ours)', totals.ownTax], ['Amount Received', totals.ownRec], ['Card Bills Paid', totals.paid],
                                      ['Still Owed', totals.owed], ['Customers Paid by Card', totals.custPaid], ['Card Tax (on us)', totals.custTax], ['Total Card Tax', totals.ownTax + totals.custTax]].map(([k, v]) => (
                                        <div key={String(k)} className="flex justify-between gap-2"><span>{k}</span><b className="tabular-nums">{fmt(Number(v))}</b></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
