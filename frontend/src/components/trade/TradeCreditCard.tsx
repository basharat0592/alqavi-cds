"use client";

/*
 * Trade 1.0 — Credit Card (Accounts › Credit Card), in the Receipt Voucher's style.
 *
 * Three entries, chosen at the top:
 *   Card Posting        money taken on one of our cards: Amount Post, the bank's
 *                       charges (1.5 % …), Amount Received into a bank; owed on
 *                       the card by the Payment Date (billing day / due day).
 *   Customer Card       a customer paid by card on our machine: the customer is
 *                       credited the full amount, the bank's charges are ours.
 *   Card Bill Payment   our card bill paid from a bank (oldest posting first).
 * The grid shows the chosen card as the shop's Excel sheet: credit date, billing
 * and payment date, amount post, charges, received, paid, remaining, paid date,
 * by bank — red when the payment date has passed. Cards sets the cards up.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    Modal, ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT,
    guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, isCashBank, type Acc } from '@/components/trade/TradeReceiptVoucher';

type Kind = 'post' | 'customer' | 'pay';
type Card = {
    id: number; kind: 'own' | 'machine'; name: string; bank: string; card_no: string; billing_day: number; due_day: number;
    charge_pct: number; status: string; account: number | null; account_code: string; account_name: string;
    charges_account: number | null; charges_account_code: string; charges_account_name: string;
    bank_account: number | null; bank_account_name: string; owed?: number; due?: number; overdue?: number;
};
type SheetRow = {
    sno: number; voucher_no: string; credit_date: string; billing_date: string; payment_date: string; amount: number; charges: number;
    received: number; paid: number; remaining: number; paid_date: string | null; by_bank: string; note: string; state: string; days: number | null;
};

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const onDay = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
/* Same rule as the server: the first billing day after the credit date, then the due day after it. */
function billDates(credit: string, billingDay: number, dueDay: number) {
    const [y, m, d] = credit.split('-').map(Number);
    const c = new Date(y, m - 1, d);
    let bill = onDay(y, m - 1, billingDay);
    if (bill <= c) bill = onDay(y, m, billingDay);
    const pay = dueDay > billingDay ? onDay(bill.getFullYear(), bill.getMonth(), dueDay) : onDay(bill.getFullYear(), bill.getMonth() + 1, dueDay);
    return { bill: iso(bill), pay: iso(pay) };
}

const KINDS: { v: Kind; label: string }[] = [
    { v: 'post', label: 'Card Posting (our card)' },
    { v: 'customer', label: 'Customer Paid by Card' },
    { v: 'pay', label: 'Card Bill Payment' },
];

export default function TradeCreditCard() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Credit Card )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const loadAccounts = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    useEffect(() => {
        loadAccounts();
        const f = () => loadAccounts();
        window.addEventListener('focus', f);
        return () => window.removeEventListener('focus', f);
    }, []);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);

    const [cards, setCards] = useState<Card[] | null>(null);
    const loadCards = () => api.get('v1/sales/trade-cards/').then(({ data }) => setCards(data)).catch(() => setCards([]));
    useEffect(() => { loadCards(); }, []);

    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    const [kind, setKind] = useState<Kind>('post');
    const [cardId, setCardId] = useState('');
    const card = (cards || []).find((c) => String(c.id) === cardId) || null;
    const cardChoices = (cards || []).filter((c) => c.status === 'active' && (kind === 'customer' ? c.kind === 'machine' : c.kind === 'own'));
    useEffect(() => {
        // Keep the chosen card when it suits the entry, else the first that does.
        if (!cards) return;
        if (!cardChoices.some((c) => String(c.id) === cardId)) setCardId(cardChoices[0] ? String(cardChoices[0].id) : '');
    }, [cards, kind]); // eslint-disable-line react-hooks/exhaustive-deps

    const [dateOn, setDateOn] = useState(false);
    const [date, setDate] = useState(today);
    const [amount, setAmount] = useState('');
    const [pct, setPct] = useState('');
    const [note, setNote] = useState('');
    const [staffId, setStaffId] = useState('');
    const amountRef = useRef<HTMLInputElement>(null);

    // Customer (Customer Paid by Card)
    const [custCode, setCustCode] = useState('');
    const [cust, setCust] = useState<Acc | null>(null);
    const [custBal, setCustBal] = useState<number | null>(null);
    // Received in / Paid from
    const [bankCode, setBankCode] = useState('');
    const [bank, setBank] = useState<Acc | null>(null);
    const [bankBal, setBankBal] = useState<number | null>(null);

    const balanceOf = (a: Acc) => api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }).then(({ data }) => num(data.balance)).catch(() => null);
    const pickBank = async (a: Acc) => { setBank(a); setBankCode(a.acc_id); setBankBal(null); setBankBal(await balanceOf(a)); };
    const pickCust = async (a: Acc) => { setCust(a); setCustCode(a.acc_id); setCustBal(null); setCustBal(await balanceOf(a)); setTimeout(() => amountRef.current?.focus(), 0); };

    // A card brings its charges % and its bank.
    useEffect(() => {
        setPct(card ? String(card.charge_pct) : '');
        if (card?.bank_account && accounts) {
            const b = accounts.find((a) => a.id === card.bank_account);
            if (b && (!bank || bank.id !== b.id)) pickBank(b);
        }
    }, [cardId, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

    const [finder, setFinder] = useState<null | { target: 'cust' | 'bank'; q: string }>(null);
    const resolve = (target: 'cust' | 'bank') => {
        const code = (target === 'cust' ? custCode : bankCode).trim();
        const hit = code ? (accounts || []).find((a) => a.acc_id === code && (target === 'cust' || isCashBank(a))) : null;
        if (hit) (target === 'cust' ? pickCust : pickBank)(hit);
        else setFinder({ target, q: /^\d+$/.test(code) ? '' : code });
    };

    // The card's sheet (own card) / its customer payments (machine)
    const [sheet, setSheet] = useState<any>(null);
    const loadSheet = (id = cardId) => {
        if (!id) { setSheet(null); return; }
        api.get(`v1/sales/trade-cards/${id}/sheet/`).then(({ data }) => setSheet(data)).catch(() => setSheet(null));
    };
    useEffect(() => { loadSheet(); }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

    const amt = Math.round(num(amount) * 100) / 100;
    const rate = kind === 'pay' ? 0 : num(pct);
    const charges = kind === 'pay' ? 0 : Math.round(amt * rate) / 100;
    const received = amt - charges;
    const dueInfo = kind === 'post' && card ? billDates(dateOn ? date : today(), card.billing_day, card.due_day) : null;
    const owed = num(sheet?.owed ?? card?.owed);
    const owedAfter = kind === 'post' ? owed + amt : kind === 'pay' ? owed - amt : null;
    const bankAfter = bankBal === null ? null : bankBal + (kind === 'pay' ? -amt : received);
    const custAfter = custBal === null ? null : custBal - amt;

    const missing = [
        !card && (kind === 'customer' ? 'the card machine' : 'the card'),
        kind === 'customer' && !cust && 'the customer',
        amt <= 0 && 'the amount',
        !bank && (kind === 'pay' ? 'the Paid from account' : 'the Received in account'),
    ].filter(Boolean) as string[];

    const resetForm = () => {
        setAmount(''); setNote(''); setCust(null); setCustCode(''); setCustBal(null); setDateOn(false); setDate(today());
        setPct(card ? String(card.charge_pct) : ''); loadNo();
        if (bank) pickBank(bank);
    };
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (saving) return;
        if (missing.length) { toast.error(`Add ${missing.join(', ')}.`); return; }
        const what = kind === 'post' ? `Card posting ${fmt(amt)} on ${card!.name} (charges ${fmt(charges)}, received ${fmt(received)})`
            : kind === 'customer' ? `${cust!.name} paid ${fmt(amt)} by card (bank charges ${fmt(charges)} on us)`
                : `Card bill payment ${fmt(amt)} to ${card!.name}`;
        setAsk({
            msg: `Save ${voucherNo} — ${what} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-cards/entries/', {
                        kind, card: card!.id, date: dateOn ? date : today(), amount: amt, charge_pct: kind === 'pay' ? null : rate,
                        bank: bank!.id, customer: kind === 'customer' ? cust!.id : null, note: note.trim(), staff: staffId || null,
                    });
                    toast.success(`${data.voucher_no} saved${kind === 'post' ? ` — pay ${fmt(amt)} by ${dmy(data.payment_date)}` : ''}.`, { duration: 6000 });
                    resetForm(); loadSheet(); loadCards();
                } catch (err: any) {
                    toast.error(err?.response?.data?.detail || 'Could not save.', { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    const [cardsOpen, setCardsOpen] = useState(false);
    const [view, setView] = useState<null | { rows: any[] | null }>(null);
    const [vFrom, setVFrom] = useState('');
    const [vTo, setVTo] = useState('');
    const runView = async () => {
        setView({ rows: null });
        try {
            const params: any = {};
            if (vFrom) params.date_from = vFrom;
            if (vTo) params.date_to = vTo;
            const { data } = await api.get('v1/sales/trade-cards/entries/', { params });
            setView({ rows: data });
        } catch { toast.error('Could not load the entries.'); setView({ rows: [] }); }
    };

    const closeWindow = () => askClose(closeTradeWindow, amt > 0 ? 'The entry is not saved. Do you want to Close the Form ?' : undefined);

    const legend = (t: string) => <legend className="px-1.5 text-[17px] font-black tracking-tight text-[#c0192f]">{t}</legend>;
    const findBtn = 'h-8 shrink-0 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] px-3 text-[13px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px';
    const BAL = `${FIELD} flex items-center justify-end border-sky-300 bg-[#c9f6ff] font-bold text-slate-900`;
    const RED = `${FIELD} flex items-center justify-end border-red-300 bg-[#ffe1e1] font-bold text-red-700`;
    const amountLabel = kind === 'post' ? 'Amount Post' : kind === 'customer' ? 'Customer Paid' : 'Amount Paid';
    const rowTone = (s: string) => (s === 'overdue' ? 'bg-[#ffd9d9] font-semibold text-red-700' : s === 'due' ? 'bg-[#fff1c9] text-amber-800' : s === 'paid' ? 'text-blue-700' : '');

    const ownRows: SheetRow[] = card?.kind === 'own' ? (sheet?.rows || []) : [];
    const tot = (k: keyof SheetRow) => ownRows.reduce((s, r) => s + num(r[k]), 0);

    return (
        <div className="min-h-screen bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Credit Card )</span>
            </div>

            <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                {/* What is entered */}
                <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
                    {KINDS.map((k) => (
                        <label key={k.v} className={`flex h-9 cursor-pointer items-center gap-2 border px-3 text-[14px] font-bold ${kind === k.v ? 'border-[#3b3f8f] bg-[#3b3f8f] text-white' : 'border-[#9da1d8] bg-[#ececfd] text-slate-800 hover:bg-white'}`}>
                            <input type="radio" name="kind" checked={kind === k.v} onChange={() => { setKind(k.v); setAmount(''); }} className="h-4 w-4 accent-white" /> {k.label}
                        </label>
                    ))}
                    <span className="flex-1" />
                    <button type="button" onClick={() => setCardsOpen(true)} className={ACTION_BTN}>Cards…</button>
                </div>

                {/* Credit Card */}
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
                    {legend(kind === 'customer' ? 'Customer Paid by Card' : kind === 'pay' ? 'Card Bill Payment' : 'Credit Card')}
                    <div className="grid grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <span className={`${LABEL} text-[15px]`}>Voucher No</span>
                        <div className="flex h-9 items-center justify-center rounded-md border border-slate-400 bg-[#e6e6ee] text-[19px] font-black tabular-nums text-[#1f2bd6]">{voucherNo}</div>
                        <ReadBox value={card ? (
                            <span className="leading-tight">
                                <b>{card.name}{card.card_no ? ` ${card.card_no}` : ''}</b>
                                <span className="block whitespace-normal text-[12px] text-slate-600">{card.kind === 'own' ? `Billing day ${card.billing_day} · Due day ${card.due_day} · ` : ''}Charges {card.charge_pct}%</span>
                            </span>
                        ) : ''} className="row-span-2 h-[76px] items-center whitespace-normal py-1.5 text-[14px]" />

                        <label className={`${LABEL} flex items-center gap-2 text-[15px]`}>
                            {kind === 'pay' ? 'Paid Date' : kind === 'post' ? 'Credit Date' : 'Date'} <input type="checkbox" checked={dateOn} onChange={(e) => { setDateOn(e.target.checked); if (!e.target.checked) setDate(today()); }} className="h-4 w-4 accent-[#3b3f8f]" />
                        </label>
                        <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)}
                            className={`${FIELD} w-full ${dateOn ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />

                        <span className={`${LABEL} text-[15px]`}>{kind === 'customer' ? 'Card Machine' : 'Card'}</span>
                        <select value={cardId} onChange={(e) => setCardId(e.target.value)} className={`${COA_SELECT} col-span-2`}>
                            {!cardChoices.length && <option value="">{cards ? `No ${kind === 'customer' ? 'card machine' : 'card'} yet — press Cards…` : 'Loading…'}</option>}
                            {cardChoices.map((c) => <option key={c.id} value={c.id}>{c.name}{c.card_no ? ` ${c.card_no}` : ''}{c.bank ? ` (${c.bank})` : ''}</option>)}
                        </select>

                        {kind === 'customer' && (<>
                            <button type="button" onClick={() => setFinder({ target: 'cust', q: '' })} className={findBtn}><span className="underline">F</span>ind Customer</button>
                            <input value={custCode} onChange={(e) => { setCustCode(e.target.value); if (cust) { setCust(null); setCustBal(null); } }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('cust'); } }} placeholder="Account ID" className={`${EDIT} w-full`} />
                            <ReadBox value={cust ? cust.name : ''} className="font-bold" />
                        </>)}

                        <span className={`${LABEL} text-[15px]`}>{amountLabel}</span>
                        <input ref={amountRef} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} className={`${EDIT} w-full text-right`} />
                        {kind === 'customer'
                            ? <div className={BAL} title={custBal !== null ? `Customer balance ${fmt(custBal)} − ${fmt(amt)} (credited in full)` : undefined}>{cust ? (custAfter === null ? '…' : `Balance ${fmt(custAfter)}`) : ''}</div>
                            : <div className={owedAfter && owedAfter > 0 ? RED : BAL} title={card ? `Owed on the card now ${fmt(owed)}` : undefined}>{card ? `Owed ${fmt(owedAfter ?? owed)}` : ''}</div>}

                        {kind !== 'pay' && (<>
                            <span className={`${LABEL} text-[15px]`}>Bank Charges %</span>
                            <input value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" className={`${EDIT} w-full text-right`} />
                            <div className={RED} title="The bank's charges are our expense, never the customer's">{fmt(charges)}<span className="ml-1 text-[11px] font-semibold">on us</span></div>

                            <span className={`${LABEL} text-[15px]`}>Amount Received</span>
                            <div className={`${BAL} text-[#1f2bd6]`}>{fmt(received)}</div>
                            <span className="text-[12px] text-slate-500">{kind === 'customer' ? 'reaches the bank; the customer is credited the full amount' : 'reaches the bank'}</span>
                        </>)}

                        {kind === 'post' && dueInfo && (<>
                            <span className={`${LABEL} text-[15px]`}>Billing Date</span>
                            <ReadBox value={dmy(dueInfo.bill)} />
                            <div className={`${FIELD} flex items-center justify-between border-amber-300 bg-[#fff6d6] font-bold text-amber-800`}>
                                <span className="text-[12.5px] font-semibold">Payment Date</span>{dmy(dueInfo.pay)}
                            </div>
                        </>)}

                        <span className={`${LABEL} text-[15px]`}>Note</span>
                        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={`${EDIT} col-span-2 w-full`} />
                    </div>
                </fieldset>

                {/* The card's sheet */}
                <div className="flex min-h-[300px] flex-col overflow-hidden rounded-lg border border-slate-500 bg-[#8a8a8a]">
                    <div className="min-h-0 flex-1 overflow-auto">
                        {card?.kind === 'machine' ? (
                            <table className="w-full border-collapse bg-white text-[12px]">
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Date', 'Voucher', 'Customer', 'Paid', 'Charges (on us)', 'Received', 'Bank'].map((h, k) => <th key={h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold ${k >= 3 && k <= 5 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {(sheet?.rows || []).map((r: any, i: number) => (
                                        <tr key={i} className="tabular-nums">
                                            {[dmy(r.date), r.voucher_no, r.customer, fmt(num(r.amount)), fmt(num(r.charges)), fmt(num(r.received)), r.bank].map((v, k) => (
                                                <td key={k} className={`whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 3 && k <= 5 ? 'text-right' : ''} ${k === 4 ? 'text-red-600' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!(sheet?.rows || []).length && <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">No customer card payments on this machine yet.</td></tr>}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full border-collapse bg-white text-[12px]">
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['S.No', 'Credit Date', 'Billing', 'Payment Date', 'Amount Post', 'Charges', 'Received', 'Paid', 'Remaining', 'Paid Date', 'By Bank'].map((h, k) =>
                                        <th key={h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold ${k >= 4 && k <= 8 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {num(sheet?.opening) > 0 && (
                                        <tr className="tabular-nums text-slate-600">
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1" colSpan={4}>Card balance before these entries</td>
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right">{fmt(num(sheet.opening))}</td>
                                            <td className="border-b border-r border-slate-300" colSpan={2} />
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right">{fmt(num(sheet.opening) - num(sheet.opening_remaining))}</td>
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right">{fmt(num(sheet.opening_remaining))}</td>
                                            <td className="border-b border-r border-slate-300" colSpan={2} />
                                        </tr>
                                    )}
                                    {ownRows.map((r) => (
                                        <tr key={r.voucher_no} className={`tabular-nums ${rowTone(r.state)}`} title={r.note || r.voucher_no}>
                                            {[r.sno, dmy(r.credit_date), dmy(r.billing_date), dmy(r.payment_date), fmt(num(r.amount)), fmt(num(r.charges)), fmt(num(r.received)),
                                              fmt(num(r.paid)), fmt(num(r.remaining)), dmy(r.paid_date), r.by_bank].map((v, k) => (
                                                <td key={k} className={`whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 4 && k <= 8 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {card && !ownRows.length && <tr><td colSpan={11} className="px-3 py-4 text-center text-slate-400">No postings on this card yet.</td></tr>}
                                    {!card && <tr><td colSpan={11} className="px-3 py-4 text-center text-slate-400">Add a card with Cards… first.</td></tr>}
                                </tbody>
                                {ownRows.length > 0 && (
                                    <tfoot className="sticky bottom-0 bg-[#e8e8f4] font-bold tabular-nums">
                                        <tr>
                                            <td className="border-t border-r border-slate-400 px-1.5 py-1" colSpan={4}>Total</td>
                                            {(['amount', 'charges', 'received', 'paid', 'remaining'] as const).map((k) => <td key={k} className={`border-t border-r border-slate-400 px-1.5 py-1 text-right ${k === 'remaining' && tot(k) > 0 ? 'text-red-700' : ''}`}>{fmt(tot(k))}</td>)}
                                            <td className="border-t border-slate-400" colSpan={2} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        )}
                    </div>
                    {card?.kind === 'own' && (card.overdue || 0) > 0 && (
                        <div className="shrink-0 bg-red-600 px-3 py-1 text-[13px] font-bold text-white">⚠ {card.overdue} posting{card.overdue! > 1 ? 's' : ''} past the payment date — pay the card bill.</div>
                    )}
                </div>

                {/* Received in / Paid from */}
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1 lg:col-span-2">
                    {legend(kind === 'pay' ? 'Paid from' : 'Received in')}
                    <div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,2fr)_132px_minmax(0,1fr)_52px_minmax(0,1.3fr)] items-center gap-x-3 gap-y-2.5">
                        <button type="button" onClick={() => setFinder({ target: 'bank', q: '' })} className={findBtn}><span className="underline">F</span>ind Account</button>
                        <input value={bankCode} onChange={(e) => { setBankCode(e.target.value); if (bank) { setBank(null); setBankBal(null); } }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('bank'); } }} placeholder="Cash / bank ID" className={`${EDIT} w-full`} />
                        <ReadBox value={bank ? bank.name : ''} />
                        <span className={`${LABEL} text-right text-[15px]`}>Account Balance</span>
                        <div className={BAL} title={bankBal !== null ? `Balance now ${fmt(bankBal)}` : undefined}>{bank ? (bankAfter === null ? '…' : fmt(bankAfter)) : ''}</div>
                        <span className={`${LABEL} text-right text-[15px]`}>Staff</span>
                        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={COA_SELECT}>
                            <option value="">Select any one</option>
                            {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                    </div>
                </fieldset>

                <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
                    {missing.length > 0 && <span className="mr-auto text-[12.5px] text-slate-500">To save, add {missing.join(', ')}.</span>}
                    <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                    </button>
                    <button type="button" onClick={runView} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                    <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                </div>
            </div>

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={finder.target === 'bank'} initial={finder.q} askClose={askClose}
                    onPick={(a) => { setFinder(null); (finder.target === 'cust' ? pickCust : pickBank)(a); }} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}

            {cardsOpen && <CardsWindow cards={cards || []} accounts={accounts || []} askClose={askClose}
                onClose={() => setCardsOpen(false)} onSaved={() => { loadCards(); loadSheet(); }} />}

            {view && (
                <Modal title="Credit Card Entries" onClose={() => askClose(() => setView(null))} full>
                    <div className="flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`${LABEL} text-[15px]`}>From</span>
                            <input type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} className={`${EDIT} w-[170px]`} />
                            <span className={`${LABEL} text-[15px]`}>To</span>
                            <input type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} className={`${EDIT} w-[170px]`} />
                            <button type="button" onClick={runView} className={ACTION_BTN}><span className="underline">O</span>K</button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-white">
                            <table className="w-full min-w-[1150px] border-collapse text-[12px]">
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Entry', 'Card', 'Customer', 'Amount', 'Charges %', 'Charges', 'Received', 'Bank', 'Payment Date', 'Note', 'Staff'].map((h, k) =>
                                        <th key={h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold ${k >= 5 && k <= 8 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {(view.rows || []).map((r) => (
                                        <tr key={r.id} className="tabular-nums">
                                            {[r.voucher_no, dmy(r.date), KINDS.find((k) => k.v === r.kind)?.label, r.card, r.customer, fmt(num(r.amount)),
                                              r.kind === 'pay' ? '' : `${num(r.charge_pct)}%`, r.kind === 'pay' ? '' : fmt(num(r.charges)), fmt(num(r.received)), r.bank,
                                              dmy(r.payment_date), r.note, r.staff].map((v, k) => (
                                                <td key={k} title={String(v ?? '')} className={`max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 5 && k <= 8 ? 'text-right' : ''} ${k === 7 ? 'text-red-600' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {view.rows && !view.rows.length && <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">No entries for these dates.</td></tr>}
                                    {!view.rows && <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <ReadBox value={<span className="text-[#1f2bd6]">{(view.rows || []).length} entr{(view.rows || []).length === 1 ? 'y' : 'ies'}</span>} className="w-[200px]" />
                            <span className={`${LABEL} text-[15px]`}>Total Charges</span>
                            <div className={`${RED} w-[160px]`}>{fmt((view.rows || []).reduce((s, r) => s + num(r.charges), 0))}</div>
                            <span className="flex-1" />
                            <button type="button" onClick={() => askClose(() => setView(null))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}

/* Cards: our credit cards and the card machines customers pay on. */
function CardsWindow({ cards, accounts, askClose, onClose, onSaved }: {
    cards: Card[]; accounts: Acc[]; askClose: (fn: () => void, msg?: string) => void; onClose: () => void; onSaved: () => void;
}) {
    const blank = { id: 0, kind: 'own', name: '', bank: '', card_no: '', billing_day: '5', due_day: '26', charge_pct: '1.5', account: 'new', charges_account: 'new', bank_account: '', status: 'active' };
    const [f, setF] = useState<any>(blank);
    const [sel, setSel] = useState(-1);
    const [busy, setBusy] = useState(false);
    const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
    const edit = (c: Card, i: number) => {
        setSel(i);
        setF({ id: c.id, kind: c.kind, name: c.name, bank: c.bank, card_no: c.card_no, billing_day: String(c.billing_day), due_day: String(c.due_day),
            charge_pct: String(c.charge_pct), account: c.account ? String(c.account) : 'new', charges_account: c.charges_account ? String(c.charges_account) : 'new',
            bank_account: c.bank_account ? String(c.bank_account) : '', status: c.status });
    };
    // Card accounts: Bank (2203) and the card accounts under payables (2201); charges: expenses (5…); banks: cash / bank.
    const cardAccs = useMemo(() => accounts.filter((a) => a.group === 2203 || (a.group === 2201 && /card/i.test(a.name))), [accounts]);
    const chargeAccs = useMemo(() => accounts.filter((a) => String(a.group).startsWith('5')), [accounts]);
    const bankAccs = useMemo(() => accounts.filter(isCashBank), [accounts]);
    const save = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const body = { ...f, bank_account: f.bank_account || null };
            if (f.id) await api.patch(`v1/sales/trade-cards/${f.id}/`, body);
            else await api.post('v1/sales/trade-cards/', body);
            toast.success(`${f.name} saved.`);
            onSaved(); setF(blank); setSel(-1);
        } catch (err: any) { toast.error(err?.response?.data?.detail || 'Could not save the card.'); }
        finally { setBusy(false); }
    };
    const del = async () => {
        if (!f.id) return;
        try { await api.delete(`v1/sales/trade-cards/${f.id}/`); toast.success('Card deleted.'); onSaved(); setF(blank); setSel(-1); }
        catch (err: any) { toast.error(err?.response?.data?.detail || 'Could not delete the card.'); }
    };
    const accSelect = (k: string, list: Acc[], newLabel: string) => (
        <select value={f[k]} onChange={(e) => set(k, e.target.value)} className={`${COA_SELECT} w-full`}>
            {newLabel && <option value="new">{newLabel}</option>}
            {!newLabel && <option value="">—</option>}
            {list.map((a) => <option key={a.id} value={a.id}>{a.acc_id}  {a.name}</option>)}
        </select>
    );
    const L = `${LABEL} text-[14px]`;
    return (
        <Modal title="Credit Cards" onClose={() => askClose(onClose)} xl>
            <div className="flex min-h-0 flex-1 flex-col gap-3 bg-[#c9c9f9] p-3">
                <div className="max-h-[32vh] min-h-[120px] overflow-auto border border-slate-500 bg-white">
                    <table className="w-full border-collapse text-[12.5px]">
                        <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                            <tr>{['Card', 'Type', 'Bank', 'Billing', 'Due', 'Charges %', 'Card Account', 'Charges Account', 'Owed', 'Status'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {cards.map((c, i) => (
                                <tr key={c.id} onClick={() => edit(c, i)} className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                    {[`${c.name}${c.card_no ? ` ${c.card_no}` : ''}`, c.kind === 'own' ? 'Our card' : 'Card machine', c.bank, c.kind === 'own' ? c.billing_day : '', c.kind === 'own' ? c.due_day : '',
                                      `${c.charge_pct}%`, c.account_code ? `${c.account_code} ${c.account_name}` : '', `${c.charges_account_code} ${c.charges_account_name}`,
                                      c.kind === 'own' ? fmt(num(c.owed)) : '', c.status].map((v, k) => (
                                        <td key={k} className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1">{v}</td>
                                    ))}
                                </tr>
                            ))}
                            {!cards.length && <tr><td colSpan={10} className="px-3 py-5 text-center text-slate-500">No cards yet — fill in below and Save.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
                    <legend className="px-1.5 text-[16px] font-black text-[#c0192f]">{f.id ? 'Update Card' : 'New Card'}</legend>
                    <div className="grid grid-cols-[130px_minmax(0,1fr)_130px_minmax(0,1fr)_130px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <span className={L}>Type</span>
                        <select value={f.kind} disabled={!!f.id} onChange={(e) => set('kind', e.target.value)} className={`${COA_SELECT} w-full`}>
                            <option value="own">Our credit card</option>
                            <option value="machine">Card machine (customers pay)</option>
                        </select>
                        <span className={L}>Card Name</span>
                        <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. HBL Credit Card" className={`${EDIT} w-full`} />
                        <span className={L}>Card No</span>
                        <input value={f.card_no} onChange={(e) => set('card_no', e.target.value)} placeholder="e.g. 7219" className={`${EDIT} w-full`} />

                        <span className={L}>Bank</span>
                        <input value={f.bank} onChange={(e) => set('bank', e.target.value)} className={`${EDIT} w-full`} />
                        <span className={L}>Bank Charges %</span>
                        <input value={f.charge_pct} onChange={(e) => set('charge_pct', e.target.value.replace(/[^\d.]/g, ''))} className={`${EDIT} w-full text-right`} />
                        <span className={L}>Status</span>
                        <select value={f.status} onChange={(e) => set('status', e.target.value)} className={`${COA_SELECT} w-full`}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        {f.kind === 'own' && (<>
                            <span className={L}>Billing Day</span>
                            <input value={f.billing_day} onChange={(e) => set('billing_day', e.target.value.replace(/\D/g, ''))} className={`${EDIT} w-full text-right`} />
                            <span className={L}>Due Day</span>
                            <input value={f.due_day} onChange={(e) => set('due_day', e.target.value.replace(/\D/g, ''))} className={`${EDIT} w-full text-right`} />
                            <span className={L}>Card Account</span>
                            {accSelect('account', cardAccs, '+ New account (Bank 2203)')}
                        </>)}

                        <span className={L}>Charges Account</span>
                        {accSelect('charges_account', chargeAccs, '+ New account (credit card tax 5501)')}
                        <span className={L}>{f.kind === 'own' ? 'Money goes to' : 'Paid into'}</span>
                        {accSelect('bank_account', bankAccs, '')}
                        <span className="col-span-2 text-[12px] text-slate-500">The bank charges always go to the charges account (our expense).</span>
                    </div>
                </fieldset>
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setF(blank); setSel(-1); }} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                    <button type="button" onClick={save} disabled={busy || !f.name.trim()} className={ACTION_BTN}>{f.id ? 'Update' : <><span className="underline">S</span>ave</>}</button>
                    <button type="button" onClick={() => setAsk_(f, del, askClose)} disabled={!f.id} className={ACTION_BTN}><span className="underline">D</span>elete</button>
                    <button type="button" onClick={() => askClose(onClose)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                </div>
            </div>
        </Modal>
    );
}

function setAsk_(f: any, del: () => void, askClose: (fn: () => void, msg?: string) => void) {
    askClose(del, `Delete the card ${f.name} ?`);
}
