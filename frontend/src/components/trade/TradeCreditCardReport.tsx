"use client";

/*
 * Trade 1.0 — Credit Card Report (dashboard › Credit Card Report).
 *
 * Every payment made by card: date, voucher, invoice, customer, the payer's
 * card (holder · bank · card no) and the receiver's card (the saleman's), the
 * amount the customer was credited, the card tax and what is left after it.
 * The tax is kept here only, for later calculation — never the customer's.
 * Filters: card (paying or receiving), receiver card, payer card, saleman,
 * search, From / To Date. Totals per receiving card. Shown page-wise (half A4
 * pages, as printed); Print, PDF, Excel.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import PagedReport, { type PSection } from '@/components/trade/PagedReport';
import {
    ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, guardWindowClose, closeTradeWindow, downloadXlsx,
} from '@/components/trade/TradeSaleInvoice';
import { CardTabs, type Card } from '@/components/trade/TradeCreditCard';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
// Overall tax %: the tax as a part of the amount (right even when the cards' rates differ).
const pctOf = (tax: number, amount: number) => (amount > 0 ? `${(Math.round((tax / amount) * 10000) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%` : '');
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

    // The report, page-wise: the payments, then the totals per receiving card.
    const card = (holder: string, bank: string, no: string) => [holder, bank, no].filter(Boolean).join(' · ') || '—';
    const [runNo, setRunNo] = useState(0);
    useEffect(() => { setRunNo((x) => x + 1); }, [rows]);
    const sections = useMemo<PSection[]>(() => [
        {
            columns: COLS.map((c) => ({ h: c.h, a: c.r ? 'r' as const : 'l' as const })),
            rows: list.map((r) => ({
                tip: r.note || undefined,
                c: [dmy(r.date), r.invoice ? `${r.voucher_no} / ${r.invoice}` : r.voucher_no, `${r.customer} (${r.customer_code})`,
                    card(r.payer_holder, r.payer_bank, r.payer_no), card(r.receiver_holder, r.receiver_bank, r.receiver_no),
                    fmt(num(r.amount)), `${num(r.tax_pct)}%`, <span key="t" className="text-red-600">{fmt(num(r.tax))}</span>, fmt(num(r.net)), r.staff],
            })),
            total: list.length ? [`Total (${list.length} payment${list.length === 1 ? '' : 's'})`, '', '', '', '', fmt(total('amount')),
                pctOf(total('tax'), total('amount')), fmt(total('tax')), fmt(total('net')), ''] : null,
            empty: rows ? 'No card payments for this search.' : 'Loading…',
        },
        ...(byReceiver.length ? [{
            title: 'By receiving card',
            columns: [{ h: 'Receiving card' }, { h: 'Payments', a: 'r' as const }, { h: 'Amount', a: 'r' as const }, { h: 'Tax %', a: 'r' as const }, { h: 'Card Tax', a: 'r' as const }],
            rows: byReceiver.map((x) => ({ c: [x.label || '—', String(x.n), fmt(x.amount), pctOf(x.tax, x.amount), fmt(x.tax)] })),
        }] : []),
    ], [list, byReceiver, rows]); // eslint-disable-line react-hooks/exhaustive-deps
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
                <CardTabs on="report" />
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

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-slate-500">
                    <PagedReport title="Credit Card Report" subtitle={subtitle} sections={sections} version={String(runNo)} loading={!rows || loading}
                        file="credit-card-report.pdf" onExport={excel} />
                </div>

                <div className="flex shrink-0 flex-wrap items-end gap-3">
                    <div className="grid min-w-0 flex-1 grid-cols-4 gap-2">
                        {box('Payments', String(list.length))}
                        {box('Paid by Card (customers credited)', fmt(total('amount')))}
                        {box(`Card Tax ${pctOf(total('tax'), total('amount'))} (not the customer’s)`, fmt(total('tax')), true)}
                        {box('After Card Tax', fmt(total('net')))}
                    </div>
                    <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                </div>
                <ReadBox value={<span className="text-[#1f2bd6]">{subtitle}</span>} className="shrink-0" />
            </div>

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
