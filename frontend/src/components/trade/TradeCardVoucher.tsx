"use client";

/*
 * Trade 1.0 — Credit Card Voucher (as the Receipt Voucher, paid by card).
 *
 * Receipt From: one or more customers, each with an amount, listed in the grid.
 * Received on: the Receiver Card (a saleman's or the company's own card) the
 * money comes in on, with staff and detail. Save posts one card voucher per
 * customer — Credit Cards (12040009) Dr / Customer Cr, settling their unpaid
 * invoices oldest first — and records it in the Credit Card Report, the card
 * tax kept there (the customer's own card's %, else the receiving card's).
 * View: the card vouchers by voucher no / date range.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    Modal, ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT,
    guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import type { Card } from '@/components/trade/TradeCreditCard';

type Line = { account: Acc; amount: number; note: string };

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

export default function TradeCardVoucher() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Credit Card Voucher )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const loadAccounts = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    const [cards, setCards] = useState<Card[]>([]);
    const loadCards = () => api.get('v1/sales/trade-cards/').then(({ data }) => setCards((data || []).filter((c: Card) => c.status === 'active'))).catch(() => setCards([]));
    useEffect(() => {
        loadAccounts(); loadCards();
        // New accounts / cards made in their pop-ups show up when we come back.
        const f = () => { loadAccounts(); loadCards(); };
        window.addEventListener('focus', f);
        return () => window.removeEventListener('focus', f);
    }, []);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);

    // Voucher
    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);
    const [dateOn, setDateOn] = useState(false);
    const [date, setDate] = useState(today);

    // Receipt From (entry row + grid)
    const [fromCode, setFromCode] = useState('');
    const [fromAcc, setFromAcc] = useState<Acc | null>(null);
    const [fromBal, setFromBal] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const amountRef = useRef<HTMLInputElement>(null);
    const fromCodeRef = useRef<HTMLInputElement>(null);

    // Received on (the card)
    const [recv, setRecv] = useState('');
    const [staffId, setStaffId] = useState('');
    const [detail, setDetail] = useState('');
    const [saving, setSaving] = useState(false);
    const recvCard = cards.find((c) => String(c.id) === recv) || null;

    const balanceOf = (a: Acc) => api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }).then(({ data }) => num(data.balance)).catch(() => null);
    const [finder, setFinder] = useState<null | { q: string }>(null);
    const pickAccount = async (a: Acc) => {
        setFinder(null);
        setFromAcc(a); setFromCode(a.acc_id); setFromBal(null);
        setFromBal(await balanceOf(a));
        setTimeout(() => amountRef.current?.focus(), 0);
    };
    const resolveCode = () => {
        const code = fromCode.trim();
        const hit = code ? (accounts || []).find((a) => a.acc_id === code) : null;
        if (hit) pickAccount(hit);
        else setFinder({ q: /^\d+$/.test(code) ? '' : code });
    };

    // The card tax: the customer's own card's %, else the receiving card's.
    const ownCard = (a: Acc) => cards.find((c) => c.holder_type === 'customer' && c.customer_acc === a.id) || null;
    const taxPct = (a: Acc) => num((ownCard(a) || recvCard)?.tax_pct);
    const total = lines.reduce((s, l) => s + l.amount, 0);
    const tax = lines.reduce((s, l) => s + Math.round(l.amount * taxPct(l.account)) / 100, 0);

    const addLine = () => {
        if (!fromAcc) { toast.error('Find the customer first.'); fromCodeRef.current?.focus(); return; }
        const amt = Math.round(num(amount) * 100) / 100;
        if (amt <= 0) { toast.error('Enter the amount paid by card.'); amountRef.current?.focus(); return; }
        if (lines.some((l) => l.account.id === fromAcc.id)) { toast.error(`${fromAcc.name} is already in the list — remove it first to change the amount.`); return; }
        setLines((ls) => [...ls, { account: fromAcc, amount: amt, note: note.trim() }]);
        setFromAcc(null); setFromCode(''); setFromBal(null); setAmount(''); setNote(''); setSel(-1);
        setTimeout(() => fromCodeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };

    const missing = [!lines.length && 'a Receipt From line', !recvCard && 'the Receiver Card'].filter(Boolean) as string[];
    const resetForm = () => {
        setLines([]); setSel(-1); setFromAcc(null); setFromCode(''); setFromBal(null); setAmount(''); setNote('');
        setRecv(''); setStaffId(''); setDetail(''); setDateOn(false); setDate(today()); loadNo();
    };
    const save = () => {
        if (saving) return;
        if (missing.length) { toast.error(`Add ${missing.join(' and ')}.`); return; }
        setAsk({
            msg: `Save the Credit Card Voucher${lines.length > 1 ? `s (${lines.length}, one for each customer)` : ` ${voucherNo}`} for ${fmt(total)} on ${recvCard!.label} ?`,
            yes: async () => {
                setSaving(true);
                const made: string[] = [];
                try {
                    for (const l of lines) {
                        const { data } = await api.post('v1/sales/trade-cards/payments/', {
                            customer: l.account.id, amount: l.amount, receiver_card: recvCard!.id, date: dateOn ? date : today(),
                            staff: staffId || null, note: [l.note, detail.trim()].filter(Boolean).join(' - '),
                        }, { params: { vtype: 'card' } });
                        made.push(data.voucher_no);
                    }
                    toast.success(`Credit Card Voucher${made.length > 1 ? 's' : ''} ${made.join(', ')} saved — ${fmt(total)}.`, { duration: 6000 });
                    resetForm();
                } catch (err: any) {
                    const d = err?.response?.data;
                    const done = made.length ? ` (${made.join(', ')} saved — the rest not)` : '';
                    toast.error(`${String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the voucher.')}${done}`, { duration: 8000 });
                    if (made.length) { setLines((ls) => ls.slice(made.length)); loadNo(); }
                } finally { setSaving(false); }
            },
        });
    };

    // View the card vouchers
    const [view, setView] = useState<null | { rows: any[] | null; filter: boolean }>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false);
    const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false);
    const [vTo, setVTo] = useState(today);
    const runView = async () => {
        setView({ rows: null, filter: false });
        try {
            const params: any = { vtype: 'card' };
            if (vNo.trim()) params.q = vNo.trim();
            if (vFromOn) params.date_from = vFrom;
            if (vToOn) params.date_to = vTo;
            const { data } = await api.get('v1/sales/trade-cards/payments/', { params });
            setView({ rows: data, filter: false });
        } catch { toast.error('Could not load the card vouchers.'); setView({ rows: [], filter: false }); }
    };
    const vRows = view?.rows || [];
    const vSum = (k: string) => vRows.reduce((s, r) => s + num(r[k]), 0);

    const closeWindow = () => askClose(closeTradeWindow, lines.length ? 'The voucher is not saved. Do you want to Close the Form ?' : undefined);
    const legend = (t: string) => <legend className="px-1.5 text-[17px] font-black tracking-tight text-[#c0192f]">{t}</legend>;
    const findBtn = 'h-8 shrink-0 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] px-3 text-[13px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px';
    const BAL = `${FIELD} flex items-center justify-end border-sky-300 bg-[#c9f6ff] font-bold text-slate-900`;
    const fromAfter = fromBal === null ? null : fromBal - num(amount);

    return (
        <div className="min-h-screen bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Credit Card Voucher )</span>
            </div>

            <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                {/* Receipt From */}
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
                    {legend('Receipt From')}
                    <div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <span className={`${LABEL} text-[15px]`}>Voucher No</span>
                        <div className="flex h-9 items-center justify-center rounded-md border border-slate-400 bg-[#e6e6ee] text-[19px] font-black tabular-nums text-[#1f2bd6]">{voucherNo}</div>
                        <ReadBox value={fromAcc ? fromAcc.name : ''} className="row-span-2 h-[76px] items-start whitespace-normal py-1.5 text-[14px] font-bold" />

                        <label className={`${LABEL} flex items-center gap-2 text-[15px]`}>
                            Date Voucher <input type="checkbox" checked={dateOn} onChange={(e) => { setDateOn(e.target.checked); if (!e.target.checked) setDate(today()); }} className="h-4 w-4 accent-[#3b3f8f]" />
                        </label>
                        <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)}
                            className={`${FIELD} w-full ${dateOn ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />

                        <button type="button" onClick={() => setFinder({ q: '' })} className={findBtn}><span className="underline">F</span>ind Customer</button>
                        <input ref={fromCodeRef} value={fromCode} onChange={(e) => { setFromCode(e.target.value); if (fromAcc) { setFromAcc(null); setFromBal(null); } }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveCode(); } }} placeholder="Account ID" className={`${EDIT} w-full`} />
                        <span className={`${LABEL} text-[14px]`}>Account Balance</span>

                        <span className={`${LABEL} text-[15px]`}>Amount</span>
                        <input ref={amountRef} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${EDIT} w-full text-right`} />
                        <div className={`${BAL} ${num(amount) > 0 && fromAfter !== null ? 'text-[#1f2bd6]' : ''}`}
                            title={fromBal !== null ? `Previous balance ${fmt(fromBal)}${num(amount) > 0 ? ` − ${fmt(num(amount))}` : ''}` : undefined}>
                            {fromAcc ? (fromAfter === null ? '…' : fmt(fromAfter)) : ''}
                        </div>

                        <span className={`${LABEL} text-[15px]`}>Note</span>
                        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${EDIT} w-full`} />
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={addLine} disabled={!fromAcc || num(amount) <= 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                            <button type="button" onClick={removeLine} disabled={sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                        </div>
                    </div>
                </fieldset>

                {/* Lines */}
                <div className="flex min-h-[230px] flex-col overflow-hidden rounded-lg border border-slate-500 bg-[#8a8a8a]">
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full table-fixed border-collapse bg-white text-[13px]">
                            <colgroup><col style={{ width: '8%' }} /><col style={{ width: '15%' }} /><col style={{ width: '43%' }} /><col style={{ width: '10%' }} /><col style={{ width: '24%' }} /></colgroup>
                            <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{['S.No', 'Acc. ID', 'Customer', 'Tax %', 'Amount'].map((h, k) => <th key={h} className={`border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold ${k >= 3 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={l.account.id} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1">{i + 1}</td>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1 font-mono">{l.account.acc_id}</td>
                                        <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1" title={l.note ? `${l.account.name} — ${l.note}` : l.account.name}>
                                            {l.account.name}{l.note && <span className={sel === i ? 'text-white/80' : 'text-slate-500'}>{`  — ${l.note}`}</span>}
                                        </td>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right" title={ownCard(l.account) ? "The customer's own card" : 'The receiving card'}>{taxPct(l.account)}%</td>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right font-semibold">{fmt(l.amount)}</td>
                                    </tr>
                                ))}
                                {!lines.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">Find the customer, enter the amount paid by card, press Add.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Received on (card) */}
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1 lg:col-span-2">
                    {legend('Received on Card')}
                    <div className="grid grid-cols-[140px_minmax(0,2fr)_88px_minmax(0,1fr)_132px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <span className={`${LABEL} text-[15px]`}>Receiver Card</span>
                        <select value={recv} title={recvCard?.label || ''}
                            onChange={(e) => { if (e.target.value === 'add') { openPopup('/admin/trade/credit-card'); return; } setRecv(e.target.value); }}
                            className={COA_SELECT}>
                            <option value="">Select any one</option>
                            {/* The money is received on a saleman's card or one of the company's own cards. */}
                            {([['saleman', 'Saleman cards'], ['company', 'Company cards']] as const).map(([kind, group]) => cards.some((c) => c.holder_type === kind) && (
                                <optgroup key={kind} label={group}>
                                    {cards.filter((c) => c.holder_type === kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </optgroup>
                            ))}
                            <option value="add">+ Add Credit Card…</option>
                        </select>
                        <span className={`${LABEL} text-right text-[15px]`}>Staff</span>
                        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={COA_SELECT}>
                            <option value="">Select any one</option>
                            {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                        <span className={`${LABEL} text-right text-[15px]`}>Total</span>
                        <div className={BAL}>{fmt(total)}</div>

                        <span className={`${LABEL} text-[15px]`}>Detail</span>
                        <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={200} className={`${EDIT} w-full`} />
                        <span className={`${LABEL} text-right text-[15px]`}>Card Tax</span>
                        <div className={`${BAL} !bg-[#ffe1e1] !text-red-700`} title="Kept in the Credit Card Report only — the customer is credited the full amount">{fmt(tax)}</div>
                        <span className={`${LABEL} text-right text-[15px]`}>After Card Tax</span>
                        <div className={BAL}>{fmt(total - tax)}</div>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-500">Each customer is credited the full amount (Credit Cards 12040009 Dr), settling their unpaid invoices oldest first. The card tax is only kept in the Credit Card Report.</p>
                </fieldset>

                <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
                    {missing.length > 0 ? <span className="mr-auto text-[12.5px] text-slate-500">To save, add {missing.join(' and ')}.</span> : <span className="mr-auto" />}
                    <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                    </button>
                    <button type="button" onClick={() => setView({ rows: null, filter: true })} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                    <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                </div>
            </div>

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={false} initial={finder.q} askClose={askClose}
                    onPick={(a) => pickAccount(a)} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}

            {view && (
                <Modal title="Credit Card Voucher" onClose={() => askClose(() => setView(null))} full>
                    <div className="relative flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full table-fixed border-collapse bg-white text-[12px]">
                                <colgroup>{[9, 7, 8, 17, 18, 8, 7, 8, 9, 9].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Acc. ID', 'Customer', 'Receiver Card', 'Amount', 'Tax %', 'Card Tax', 'After Tax', 'Staff'].map((h, k) =>
                                        <th key={h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold ${k >= 5 && k <= 8 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {vRows.map((r) => (
                                        <tr key={r.id} className="tabular-nums">
                                            {[r.voucher_no, dmy(r.date), r.customer_code, r.customer + (r.note ? ` — ${r.note}` : ''), r.receiver, fmt(num(r.amount)), `${num(r.tax_pct)}%`, fmt(num(r.tax)), fmt(num(r.net)), r.staff].map((v, k) => (
                                                <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 5 && k <= 8 ? 'text-right' : ''} ${k === 7 ? 'text-red-700' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {view.rows && !vRows.length && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No card vouchers for this search.</td></tr>}
                                    {!view.rows && !view.filter && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <ReadBox value={<span className="text-[#1f2bd6]">{vRows.length} voucher(s)</span>} className="w-[180px]" />
                            <span className={`${LABEL} text-[15px]`}>Amount</span><div className={`${BAL} w-[150px]`}>{fmt(vSum('amount'))}</div>
                            <span className={`${LABEL} text-[15px]`}>Card Tax</span><div className={`${BAL} w-[130px] !text-red-700`}>{fmt(vSum('tax'))}</div>
                            <span className={`${LABEL} text-[15px]`}>After Tax</span><div className={`${BAL} w-[150px]`}>{fmt(vSum('net'))}</div>
                            <span className="flex-1" />
                            <button type="button" onClick={() => setView({ rows: view.rows, filter: true })} className={ACTION_BTN}>Search</button>
                            <button type="button" onClick={() => { setView(null); resetForm(); }} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            <button type="button" onClick={() => askClose(() => setView(null))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>

                        {view.filter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                                <fieldset className="w-[560px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-6 pb-5 pt-1 shadow-xl">
                                    <legend className="px-2 text-[16px] font-bold text-[#1f2bd6]">View Credit Card Voucher Detail</legend>
                                    <div className="grid grid-cols-[130px_auto_1fr] items-center gap-x-3 gap-y-3">
                                        <span className={`${LABEL} text-[15px]`}>Voucher / Name</span>
                                        <span />
                                        <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runView(); }}
                                            placeholder="All" className={`${EDIT} w-full`} />
                                        <span className={`${LABEL} text-[15px]`}>From Date</span>
                                        <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)}
                                            className={`${FIELD} w-full ${vFromOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                                        <span className={`${LABEL} text-[15px]`}>To Date</span>
                                        <input type="checkbox" checked={vToOn} onChange={(e) => setVToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vTo} disabled={!vToOn} onChange={(e) => e.target.value && setVTo(e.target.value)}
                                            className={`${FIELD} w-full ${vToOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        {view.rows && <button type="button" onClick={() => setView({ rows: view.rows, filter: false })} className={ACTION_BTN}>Back</button>}
                                        <button type="button" onClick={runView} className={ACTION_BTN}><span className="underline">O</span>K</button>
                                    </div>
                                </fieldset>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
