"use client";

/*
 * Trade 1.0 — Credit Card Report (dashboard › Credit Card Report).
 *
 * Every payment made by card: date, voucher, invoice, customer, the payer's
 * card (holder · bank · card no) and the receiver's card (the saleman's), the
 * amount the customer was credited, the card tax and what is left after it.
 * The tax is kept here only, for later calculation — never the customer's.
 * Filters: card (paying or receiving), receiver card, payer card, saleman,
 * search, From / To Date. Totals per receiving card. Print (A4), PDF, Excel.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { printSheets } from '@/lib/printWindow';
import {
    ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, guardWindowClose, closeTradeWindow, downloadXlsx,
} from '@/components/trade/TradeSaleInvoice';
import type { Card } from '@/components/trade/TradeCreditCard';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

type Row = {
    id: number; date: string; voucher_no: string; invoice: string; customer: string; customer_code: string; amount: number;
    tax_pct: number; tax: number; net: number; receiver_holder: string; receiver_bank: string; receiver_no: string;
    payer_holder: string; payer_bank: string; payer_no: string; staff: string; note: string;
};
const COLS: { h: string; w: number; r?: boolean }[] = [
    { h: 'Date', w: 7.5 }, { h: 'Voucher / Invoice', w: 10 }, { h: 'Customer', w: 14 }, { h: 'Payer Card', w: 17 },
    { h: 'Receiver Card', w: 17 }, { h: 'Amount', w: 9, r: true }, { h: 'Tax %', w: 5.5, r: true }, { h: 'Card Tax', w: 8, r: true },
    { h: 'After Tax', w: 9, r: true }, { h: 'Saleman', w: 8 },
];

/* A card in a cell: the holder on top, bank · card no under it — shown in full (wraps). */
function CardCell({ holder, bank, no }: { holder: string; bank: string; no: string }) {
    if (!holder && !bank && !no) return <span className="text-slate-400">—</span>;
    return (
        <span className="block leading-tight">
            <b className="font-semibold">{holder}</b>
            <span className="block text-[0.86em] text-slate-600">{[bank, no].filter(Boolean).join(' · ')}</span>
        </span>
    );
}

export default function TradeCreditCardReport() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Credit Card Report )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [cards, setCards] = useState<Card[]>([]);
    useEffect(() => { api.get('v1/sales/trade-cards/').then(({ data }) => setCards(data)).catch(() => setCards([])); }, []);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);
    const [receiver, setReceiver] = useState('');
    const [payer, setPayer] = useState('');
    const [staffId, setStaffId] = useState('');
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
            if (receiver) params.receiver = receiver;
            if (payer) params.payer = payer;
            if (staffId) params.staff = staffId;
            if (q.trim()) params.q = q.trim();
            if (fromOn) params.date_from = from;
            if (toOn) params.date_to = to;
            const { data } = await api.get('v1/sales/trade-cards/payments/', { params });
            setRows(data);
        } catch { toast.error('Could not load the report.'); setRows([]); }
        finally { setLoading(false); }
    };
    useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const list = rows || [];
    const total = (k: keyof Row) => list.reduce((s, r) => s + num(r[k]), 0);
    // Per receiving card: what came in on it and its tax.
    const byReceiver = useMemo(() => {
        const m = new Map<string, { label: string; n: number; amount: number; tax: number }>();
        for (const r of list) {
            const key = `${r.receiver_holder}|${r.receiver_bank}|${r.receiver_no}`;
            const x = m.get(key) || { label: [r.receiver_holder, r.receiver_bank, r.receiver_no].filter(Boolean).join(' · '), n: 0, amount: 0, tax: 0 };
            x.n += 1; x.amount += num(r.amount); x.tax += num(r.tax);
            m.set(key, x);
        }
        return Array.from(m.values()).sort((a, b) => b.amount - a.amount);
    }, [list]);
    const name = (id: string) => cards.find((c) => String(c.id) === id)?.label || '';
    const subtitle = [
        receiver ? `Receiver: ${name(receiver)}` : '', payer ? `Payer: ${name(payer)}` : '',
        staffId ? `Saleman: ${staff.find((s) => s.id === staffId)?.name || ''}` : '',
        fromOn || toOn ? `${fromOn ? `From ${dmy(from)}` : ''}${fromOn && toOn ? ' ' : ''}${toOn ? `To ${dmy(to)}` : ''}` : 'All dates',
        q.trim() ? `"${q.trim()}"` : '',
    ].filter(Boolean).join('  ·  ') || 'All card payments';

    const cells = (r: Row) => [
        dmy(r.date), <span key="v" className="block leading-tight">{r.voucher_no}{r.invoice && <span className="block text-[0.86em] text-slate-600">{r.invoice}</span>}</span>,
        <span key="c" className="block leading-tight">{r.customer}<span className="block text-[0.86em] text-slate-600">{r.customer_code}</span></span>,
        <CardCell key="p" holder={r.payer_holder} bank={r.payer_bank} no={r.payer_no} />,
        <CardCell key="r" holder={r.receiver_holder} bank={r.receiver_bank} no={r.receiver_no} />,
        fmt(num(r.amount)), `${num(r.tax_pct)}%`, fmt(num(r.tax)), fmt(num(r.net)), r.staff,
    ];
    const table = (rs: Row[], fs: string, withTotal: boolean) => (
        <table className="w-full table-fixed border-collapse" style={{ fontSize: fs }}>
            <colgroup>{COLS.map((c, i) => <col key={i} style={{ width: `${c.w}%` }} />)}</colgroup>
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                <tr>{COLS.map((c) => <th key={c.h} className={`border border-slate-400 px-1.5 py-1.5 font-semibold leading-tight ${c.r ? 'text-right' : ''}`}>{c.h}</th>)}</tr>
            </thead>
            <tbody>
                {rs.map((r) => (
                    <tr key={r.id} className="tabular-nums" title={r.note || undefined}>
                        {cells(r).map((v, k) => (
                            <td key={k} className={`break-words border border-slate-300 px-1.5 py-1 align-top ${COLS[k].r ? 'text-right' : ''} ${k === 7 ? 'text-red-600' : ''} ${k === 5 ? 'font-semibold' : ''}`}>{v}</td>
                        ))}
                    </tr>
                ))}
                {withTotal && rs.length > 0 && (
                    <tr className="bg-[#e8e8f4] font-bold tabular-nums">
                        <td className="border border-slate-400 px-1.5 py-1" colSpan={5}>Total ({list.length} payment{list.length === 1 ? '' : 's'})</td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(total('amount'))}</td>
                        <td className="border border-slate-400" />
                        <td className="border border-slate-400 px-1.5 py-1 text-right text-red-700">{fmt(total('tax'))}</td>
                        <td className="border border-slate-400 px-1.5 py-1 text-right">{fmt(total('net'))}</td>
                        <td className="border border-slate-400" />
                    </tr>
                )}
            </tbody>
        </table>
    );

    // Print: A4 landscape pages
    const sheetsRef = useRef<HTMLDivElement>(null);
    const [printing, setPrinting] = useState(false);
    const PER = 18;
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
            await printSheets(Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>('.cc-page') || []), save, 'landscape', 2);
        } catch { toast.error('Could not prepare the print.'); }
        finally { setPrinting(false); }
    };
    const excel = () => downloadXlsx('credit-card-report', 'Credit Card Report',
        ['Date', 'Voucher', 'Invoice', 'Customer', 'Acc ID', 'Payer Holder', 'Payer Bank', 'Payer Card No', 'Receiver Holder', 'Receiver Bank', 'Receiver Card No', 'Amount', 'Tax %', 'Card Tax', 'After Tax', 'Saleman', 'Note'],
        list.map((r) => [dmy(r.date), r.voucher_no, r.invoice, r.customer, r.customer_code, r.payer_holder, r.payer_bank, r.payer_no,
            r.receiver_holder, r.receiver_bank, r.receiver_no, num(r.amount), num(r.tax_pct), num(r.tax), num(r.net), r.staff, r.note]));

    const dateIn = (on: boolean) => `${FIELD} w-full ${on ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`;
    const cardOpts = (filter: (c: Card) => boolean) => cards.filter(filter).map((c) => <option key={c.id} value={c.id}>{c.label}</option>);
    const L = `${LABEL} text-[14px]`;
    const box = (label: string, v: string, red = false) => (
        <div className="flex min-w-0 flex-col">
            <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
            <div className={`${FIELD} flex h-9 items-center justify-end text-[15px] font-bold ${red ? 'border-red-300 bg-[#ffe1e1] text-red-700' : 'border-sky-300 bg-[#c9f6ff] text-slate-900'}`}>{v}</div>
        </div>
    );

    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Credit Card Report )</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                    <legend className="px-1.5 text-[16px] font-black text-[#c0192f]">View Credit Card Payments</legend>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,0.7fr)] items-center gap-x-2.5 gap-y-2">
                        <span className={L}>Receiver Card</span>
                        <select value={receiver} onChange={(e) => setReceiver(e.target.value)} className={COA_SELECT} title={name(receiver) || 'All'}>
                            <option value="">All</option>{cardOpts((c) => c.holder_type !== 'customer')}<optgroup label="Other cards">{cardOpts((c) => c.holder_type === 'customer')}</optgroup>
                        </select>
                        <span className={L}>Payer Card</span>
                        <select value={payer} onChange={(e) => setPayer(e.target.value)} className={COA_SELECT} title={name(payer) || 'All'}>
                            <option value="">All</option>{cardOpts((c) => c.holder_type === 'customer')}<optgroup label="Other cards">{cardOpts((c) => c.holder_type !== 'customer')}</optgroup>
                        </select>
                        <span className={L}>Saleman</span>
                        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={COA_SELECT}>
                            <option value="">All</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <span className={L}>Search</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
                            placeholder="Customer, invoice, voucher, card no, bank" className={`${EDIT} w-full`} />
                        <label className={`${L} flex items-center gap-1.5`}><input type="checkbox" checked={fromOn} onChange={(e) => setFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /> From Date</label>
                        <input type="date" value={from} disabled={!fromOn} onChange={(e) => e.target.value && setFrom(e.target.value)} className={dateIn(fromOn)} />
                        <label className={`${L} flex items-center gap-1.5`}><input type="checkbox" checked={toOn} onChange={(e) => setToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /> To Date</label>
                        <div className="flex gap-2">
                            <input type="date" value={to} disabled={!toOn} onChange={(e) => e.target.value && setTo(e.target.value)} className={dateIn(toOn)} />
                            <button type="button" onClick={run} className={`${ACTION_BTN} !min-w-[64px]`}>{loading ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">O</span>K</>}</button>
                        </div>
                    </div>
                </fieldset>

                <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px] gap-2">
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden rounded border border-slate-500 bg-white">
                        {table(list, '13px', true)}
                        {rows && !list.length && <p className="px-3 py-6 text-center text-[14px] text-slate-500">No card payments for this search.</p>}
                        {!rows && <p className="px-3 py-6 text-center text-[14px] text-slate-500">Loading…</p>}
                    </div>
                    <div className="min-h-0 overflow-y-auto rounded border border-slate-500 bg-white">
                        <div className="sticky top-0 bg-[#e8e8f4] px-2 py-1.5 text-[13px] font-bold">By receiving card</div>
                        {byReceiver.map((x) => (
                            <div key={x.label} className="border-b border-slate-200 px-2 py-1.5 text-[13px] leading-tight">
                                <div className="break-words font-semibold">{x.label}</div>
                                <div className="mt-0.5 flex justify-between tabular-nums"><span className="text-slate-600">{x.n} payment{x.n === 1 ? '' : 's'}</span><b>{fmt(x.amount)}</b></div>
                                <div className="flex justify-between tabular-nums text-red-700"><span>Card tax</span><span>{fmt(x.tax)}</span></div>
                            </div>
                        ))}
                        {!byReceiver.length && <p className="px-2 py-4 text-center text-[13px] text-slate-500">—</p>}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-end gap-3">
                    <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
                        {box('Payments', String(list.length))}
                        {box('Paid by Card (customers credited)', fmt(total('amount')))}
                        {box('Card Tax (not the customer’s)', fmt(total('tax')), true)}
                        {box('After Card Tax', fmt(total('net')))}
                    </div>
                    <button type="button" onClick={() => print()} disabled={!rows || printing} className={ACTION_BTN}>{printing ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">P</span>rint</>}</button>
                    <button type="button" onClick={() => print('credit-card-report.pdf')} disabled={!rows || printing} className={ACTION_BTN}>PDF</button>
                    <button type="button" onClick={excel} disabled={!rows} className={ACTION_BTN}>Excel</button>
                    <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                </div>
                <ReadBox value={<span className="text-[#1f2bd6]">{subtitle}</span>} className="shrink-0" />
            </div>

            {rows && (
                <div ref={sheetsRef} aria-hidden style={{ position: 'fixed', left: -20000, top: 0 }}>
                    {pages.map((rs, i) => (
                        <div key={i} className="cc-page bg-white text-slate-900" style={{ width: '297mm', height: '210mm', padding: '9mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            <div className="mb-2 flex items-end justify-between border-b-2 border-slate-800 pb-1">
                                <div>
                                    <div className="text-[17px] font-black">AL-QAVI TRADERS</div>
                                    <div className="text-[13px] font-bold">Credit Card Report</div>
                                    <div className="text-[10.5px] text-slate-600">{subtitle}</div>
                                </div>
                                <div className="text-right text-[10px] text-slate-600">Printed {dmy(today())}<br />Page {i + 1} of {pages.length}</div>
                            </div>
                            <div className="min-h-0 flex-1">{table(rs, '10px', i === pages.length - 1)}</div>
                            {i === pages.length - 1 && (
                                <div className="mt-2 flex gap-8 border-t border-slate-400 pt-1.5 text-[11px]">
                                    <span>Payments <b>{list.length}</b></span><span>Paid by card <b>{fmt(total('amount'))}</b></span>
                                    <span>Card tax <b>{fmt(total('tax'))}</b></span><span>After tax <b>{fmt(total('net'))}</b></span>
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
