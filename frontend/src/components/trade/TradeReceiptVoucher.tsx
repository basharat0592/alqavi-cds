"use client";

/*
 * Trade 1.0 — Receipt Voucher.
 *
 * Receipt From: one or more accounts (usually customers), each with an amount,
 * listed in the grid. Receipt as: the cash / bank account the money comes into,
 * with cheque no / date, bank, detail and staff. Save posts the voucher: each
 * customer's receipt settles their unpaid sale invoices, oldest first.
 * View: the legacy "View Receipt Voucher Detail" — voucher no / date range,
 * every line with Total Debit / Total Credits.
 *
 * Cheques: a cheque is saved Pending (red — not in the ledger or the balance
 * yet) or Cashed (blue — counts). Pending cheques are listed under Pending
 * Cheques, red once their cash date comes, and marked Cashed from there.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import { sortByMatch } from '@/lib/searchRank';
import {
    Modal, ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT,
    guardWindowClose, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';

export type Acc = {
    id: number; acc_id: string; name: string; group: number; group_name: string; level2_name: string;
    area_name: string | null; status: string;
};
type Line = { account: Acc; amount: number; note: string };

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
// Money is received into Cash-Bank-Cheque (1204) or a bank / card account (2203).
export const isCashBank = (a: Acc) => a.group === 1204 || a.group === 2203;

/* Legacy Find Account: Account ID | Account Name | Area | Acc. 2nd Level | Acc. 3rd Level. */
export function FindAccountWindow({ accounts, cashOnly, initial, askClose, onPick, onClose, onAddNew }: {
    accounts: Acc[] | null; cashOnly: boolean; initial: string;
    askClose: (fn: () => void, msg?: string) => void; onPick: (a: Acc) => void; onClose: () => void; onAddNew: () => void;
}) {
    const [q, setQ] = useState(initial);
    const [sel, setSel] = useState(-1);
    const gridRef = useRef<HTMLDivElement>(null);
    const rows = useMemo(() => {
        const s = q.trim().toLowerCase();
        return sortByMatch((accounts || []).filter((a) => a.status !== 'inactive' && (!cashOnly || isCashBank(a)) &&
            (!s || a.name.toLowerCase().includes(s) || a.acc_id.includes(s) || (a.area_name || '').toLowerCase().includes(s))), s,
            (a) => [a.name, a.acc_id, a.area_name]);
    }, [accounts, q, cashOnly]);
    useEffect(() => { setSel(-1); }, [q]);
    const keys = (e: React.KeyboardEvent) => {
        if (!rows.length) return;
        if (e.key === 'Enter') { e.preventDefault(); onPick(rows[sel < 0 ? 0 : sel]); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const i = Math.min(rows.length - 1, Math.max(0, sel + (e.key === 'ArrowDown' ? 1 : -1)));
        setSel(i);
        gridRef.current?.querySelectorAll('tbody tr')[i]?.scrollIntoView({ block: 'nearest' });
    };
    return (
        <Modal title="Find Account" onClose={() => askClose(onClose)} wide>
            <div className="flex items-center gap-3 border-b border-[#9da1d8] bg-[#c9c9f9] px-4 py-3">
                <span className="text-[16px] font-semibold text-[#1b1f4b]">Account Name</span>
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={keys}
                    placeholder={cashOnly ? 'Cash / bank account' : 'Name, code or area'} className={`${EDIT} h-9 flex-1 text-[15px]`} />
                <button type="button" onClick={onAddNew} className={`${ACTION_BTN} shrink-0`}><span><span className="underline">A</span>dd New</span></button>
            </div>
            <div ref={gridRef} tabIndex={0} onKeyDown={keys} className="h-[52vh] min-h-0 overflow-auto bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                <table className="w-[94%] table-fixed border-collapse bg-white text-[13px]">
                    <colgroup><col style={{ width: '13%' }} /><col style={{ width: '35%' }} /><col style={{ width: '18%' }} /><col style={{ width: '15%' }} /><col style={{ width: '19%' }} /></colgroup>
                    <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                        <tr>{['Account ID', 'Account Name', 'Area', 'Acc. 2nd Level', 'Acc. 3rd Level'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 400).map((a, i) => (
                            <tr key={a.id} onClick={() => setSel(i)} onDoubleClick={() => onPick(a)} title="Click to select · Enter or double-click to pick"
                                className={`cursor-pointer ${sel === i ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                {[a.acc_id, a.name, a.area_name || '', a.level2_name, a.group_name].map((v, k) => (
                                    <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 0 ? 'font-mono tabular-nums' : ''}`}>{v}</td>
                                ))}
                            </tr>
                        ))}
                        {!rows.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">{accounts ? 'No accounts match.' : 'Loading…'}</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#9da1d8] bg-[#c9c9f9] px-4 py-2.5">
                <ReadBox value={<span className="text-[#1f2bd6]">{rows.length} account(s)</span>} className="w-[220px]" />
                <button type="button" onClick={() => askClose(onClose)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
            </div>
        </Modal>
    );
}

export default function TradeReceiptVoucher() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Receipt Voucher )'; }, []);
    useEffect(() => guardWindowClose(), []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const loadAccounts = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    useEffect(() => {
        loadAccounts();
        // New accounts made in the Chart of Account pop-up show up when we come back.
        const f = () => loadAccounts();
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

    // Receipt as
    const [asCode, setAsCode] = useState('');
    const [asAcc, setAsAcc] = useState<Acc | null>(null);
    const [asBal, setAsBal] = useState<number | null>(null);
    const [chqNo, setChqNo] = useState('');
    const [chqDate, setChqDate] = useState(today);
    const [bank, setBank] = useState('');
    const [detail, setDetail] = useState('');
    const [staffId, setStaffId] = useState('');
    const [chqStatus, setChqStatus] = useState<'pending' | 'cashed'>('pending');
    const [chqReceived, setChqReceived] = useState(today);
    const [chqCashDate, setChqCashDate] = useState(today);
    const [saving, setSaving] = useState(false);

    // Pending cheques (alert when one is due to be cashed)
    type Pend = { id: number; voucher_no: string; chq_no: string; chq_date: string | null; bank: string; received: string; cash_date: string | null;
        amount: number; account: string; acc_id: string; staff: string; days: number | null; due: boolean };
    const [pend, setPend] = useState<{ due: number; rows: Pend[] }>({ due: 0, rows: [] });
    const [pendOpen, setPendOpen] = useState(false);
    const [cashing, setCashing] = useState<null | { row: Pend; date: string; busy?: boolean }>(null);
    const loadPend = (open = false) => api.get('v1/sales/vouchers/pending_cheques/').then(({ data }) => {
        setPend(data);
        if (open && (data.due > 0 || new URLSearchParams(window.location.search).has('cheques'))) setPendOpen(true);
    }).catch(() => { /* keep */ });
    useEffect(() => {
        loadPend(true);
        // Another window may cash a cheque: refresh the list when this one is used again.
        const f = () => loadPend();
        window.addEventListener('focus', f);
        return () => window.removeEventListener('focus', f);
    }, []);
    const cashCheque = async () => {
        if (!cashing || cashing.busy) return;   // one request, however often OK is pressed
        setCashing({ ...cashing, busy: true });
        try {
            await api.post(`v1/sales/vouchers/${cashing.row.id}/cash_cheque/`, { date: cashing.date });
            toast.success(`Cheque ${cashing.row.chq_no} (${cashing.row.voucher_no}) cashed — now in the ledger.`);
            setCashing(null);
        } catch (err: any) {
            const d = err?.response?.data;
            if (d?.already) { toast(d.detail, { icon: 'ℹ️', duration: 6000 }); setCashing(null); }
            else { toast.error(d?.detail || 'Could not mark the cheque cashed.'); setCashing((c) => (c ? { ...c, busy: false } : c)); }
        } finally { loadPend(); }
    };

    const balanceOf = (a: Acc) => api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }).then(({ data }) => num(data.balance)).catch(() => null);

    // Find Account (for Receipt From or Receipt as)
    const [finder, setFinder] = useState<null | { target: 'from' | 'as'; q: string }>(null);
    const pickAccount = async (a: Acc, target: 'from' | 'as') => {
        setFinder(null);
        if (target === 'from') {
            setFromAcc(a); setFromCode(a.acc_id); setFromBal(null);
            setFromBal(await balanceOf(a));
            setTimeout(() => amountRef.current?.focus(), 0);
        } else {
            setAsAcc(a); setAsCode(a.acc_id); setAsBal(null);
            setAsBal(await balanceOf(a));
        }
    };
    const resolveCode = (target: 'from' | 'as') => {
        const code = (target === 'from' ? fromCode : asCode).trim();
        const hit = code ? (accounts || []).find((a) => a.acc_id === code && (target === 'from' || isCashBank(a))) : null;
        if (hit) pickAccount(hit, target);
        else setFinder({ target, q: /^\d+$/.test(code) ? '' : code });
    };

    const total = lines.reduce((s, l) => s + l.amount, 0);
    const addLine = () => {
        if (!fromAcc) { toast.error('Find the Receipt From account first.'); fromCodeRef.current?.focus(); return; }
        const amt = Math.round(num(amount) * 100) / 100;
        if (amt <= 0) { toast.error('Enter the amount received.'); amountRef.current?.focus(); return; }
        if (asAcc && asAcc.id === fromAcc.id) { toast.error('Receipt From and Receipt as cannot be the same account.'); return; }
        if (lines.some((l) => l.account.id === fromAcc.id)) { toast.error(`${fromAcc.name} is already in the list — remove it first to change the amount.`); return; }
        setLines((ls) => [...ls, { account: fromAcc, amount: amt, note: note.trim() }]);
        setFromAcc(null); setFromCode(''); setFromBal(null); setAmount(''); setNote(''); setSel(-1);
        setTimeout(() => fromCodeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };

    const missing = [!lines.length && 'a Receipt From line', !asAcc && 'the Receipt as account'].filter(Boolean) as string[];
    const resetForm = () => {
        setLines([]); setSel(-1); setFromAcc(null); setFromCode(''); setFromBal(null); setAmount(''); setNote('');
        setAsAcc(null); setAsCode(''); setAsBal(null); setChqNo(''); setChqDate(today()); setBank(''); setDetail('');
        setChqStatus('pending'); setChqReceived(today()); setChqCashDate(today());
        setStaffId(''); setDateOn(false); setDate(today()); loadNo();
    };
    const save = () => {
        if (saving) return;
        if (missing.length) { toast.error(`Add ${missing.join(' and ')}.`); return; }
        setAsk({
            msg: `Save Receipt Voucher ${voucherNo} for ${fmt(total)}${isChq ? (chqStatus === 'pending' ? ' — cheque PENDING (not in the ledger until cashed)' : ' — cheque CASHED') : ''} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/vouchers/', {
                        date: dateOn ? date : today(), receipt_as: asAcc!.id, staff: staffId || null,
                        chq_no: chqNo.trim(), chq_date: isChq ? chqDate : null, bank: bank.trim(), detail: detail.trim(),
                        chq_status: isChq ? chqStatus : '', chq_received: isChq ? chqReceived : null, chq_cash_date: isChq ? chqCashDate : null,
                        lines: lines.map((l) => ({ account: l.account.id, amount: l.amount, note: l.note })),
                    });
                    toast.success(`Receipt Voucher ${data.voucher_no} saved — ${fmt(num(data.total))}${data.chq_status === 'pending' ? ' (cheque pending)' : ''}.`);
                    resetForm(); loadPend();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the voucher.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Receipt Voucher Detail
    const [view, setView] = useState<null | { rows: any[] | null; filter: boolean }>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false);
    const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false);
    const [vTo, setVTo] = useState(today);
    const runView = async () => {
        setView({ rows: null, filter: false });
        try {
            const params: any = {};
            if (vNo.trim()) params.voucher_no = vNo.trim();
            if (vFromOn) params.date_from = vFrom;
            if (vToOn) params.date_to = vTo;
            const { data } = await api.get('v1/sales/vouchers/', { params });
            setView({ rows: data, filter: false });
        } catch { toast.error('Could not load vouchers.'); setView({ rows: [], filter: false }); }
    };
    const vRows = view?.rows || [];
    const totDebit = vRows.reduce((s, r) => s + num(r.debit), 0);
    const totCredit = vRows.reduce((s, r) => s + num(r.credit), 0);

    const closeWindow = () => askClose(closeTradeWindow, lines.length ? 'The voucher is not saved. Do you want to Close the Form ?' : undefined);

    const legend = (t: string) => <legend className="px-1.5 text-[17px] font-black tracking-tight text-[#c0192f]">{t}</legend>;
    const findBtn = 'h-8 shrink-0 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] px-3 text-[13px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px';
    const BAL = `${FIELD} flex items-center justify-end border-sky-300 bg-[#c9f6ff] font-bold text-slate-900`;
    // Balances move as the amount is typed: the account after this receipt.
    const fromAfter = fromBal === null ? null : fromBal - num(amount);
    const asAfter = asBal === null ? null : asBal + total;
    // Cheque boxes: red while the cheque is pending, blue once cashed.
    const isChq = !!chqNo.trim();
    const tone = !isChq ? '' : chqStatus === 'pending' ? '!border-red-400 !bg-[#ffe1e1] !text-red-700' : '!border-blue-400 !bg-[#dfe9ff] !text-blue-800';
    const chqDateCls = (on: boolean) => `${FIELD} w-full ${on ? `border-emerald-300 bg-[#e3fbe3] ${tone}` : 'border-slate-300 bg-[#ececf3] text-slate-500'}`;

    return (
        <div className="min-h-screen bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Receipt Voucher )</span>
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

                        <button type="button" onClick={() => setFinder({ target: 'from', q: '' })} className={findBtn}><span className="underline">F</span>ind Receipt Acc</button>
                        <input ref={fromCodeRef} value={fromCode} onChange={(e) => { setFromCode(e.target.value); if (fromAcc) { setFromAcc(null); setFromBal(null); } }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveCode('from'); } }} placeholder="Account ID" className={`${EDIT} w-full`} />
                        <div className="flex flex-col gap-0.5">
                            <span className={`${LABEL} text-[14px]`}>Account Balance</span>
                        </div>

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
                            <colgroup><col style={{ width: '9%' }} /><col style={{ width: '18%' }} /><col style={{ width: '50%' }} /><col style={{ width: '23%' }} /></colgroup>
                            <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{['S.No', 'Acc. ID', 'Account', 'Amount'].map((h) => <th key={h} className="border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={l.account.id} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1">{i + 1}</td>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1 font-mono">{l.account.acc_id}</td>
                                        <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1" title={l.note ? `${l.account.name} — ${l.note}` : l.account.name}>
                                            {l.account.name}{l.note && <span className={sel === i ? 'text-white/80' : 'text-slate-500'}>{`  — ${l.note}`}</span>}
                                        </td>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right font-semibold">{fmt(l.amount)}</td>
                                    </tr>
                                ))}
                                {!lines.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">Find the account, enter the amount, press Add.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Receipt as */}
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1 lg:col-span-2">
                    {legend('Receipt as')}
                    <div className="grid grid-cols-[140px_minmax(0,1fr)_88px_minmax(0,1fr)_132px_minmax(0,1fr)_46px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                        <button type="button" onClick={() => setFinder({ target: 'as', q: '' })} className={findBtn}><span className="underline">F</span>ind Account</button>
                        <input value={asCode} onChange={(e) => { setAsCode(e.target.value); if (asAcc) { setAsAcc(null); setAsBal(null); } }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveCode('as'); } }} placeholder="Cash / bank ID" className={`${EDIT} w-full`} />
                        <ReadBox value={asAcc ? asAcc.name : ''} className="col-span-6" />

                        <span className={`${LABEL} text-right text-[15px]`}>Chq No</span>
                        <input value={chqNo} onChange={(e) => setChqNo(e.target.value)} maxLength={40} className={`${EDIT} w-full ${tone}`} />
                        <span className={`${LABEL} text-right text-[15px]`}>Date Chq</span>
                        <input type="date" value={chqDate} disabled={!isChq} onChange={(e) => e.target.value && setChqDate(e.target.value)} className={chqDateCls(isChq)} />
                        <span className={`${LABEL} text-right text-[15px]`}>Staff</span>
                        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} col-span-3`}>
                            <option value="">Select any one</option>
                            {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>

                        <span className={`${LABEL} text-right text-[15px]`}>Bank</span>
                        <input value={bank} onChange={(e) => setBank(e.target.value)} maxLength={80} className={`${EDIT} w-full ${tone}`} />
                        <span className={`${LABEL} text-right text-[15px]`}>Detail</span>
                        <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255} className={`${EDIT} w-full ${tone}`} />
                        <span className={`${LABEL} text-right text-[15px]`}>Account Balance</span>
                        <div className={`${BAL} ${tone}`} title={asBal !== null ? `Previous balance ${fmt(asBal)}${total ? ` + ${fmt(total)}` : ''}` : undefined}>
                            {asAcc ? (asAfter === null ? '…' : fmt(asAfter)) : ''}
                        </div>
                        <span className={`${LABEL} text-right text-[15px]`}>Total</span>
                        <div className={`${BAL} ${tone}`}>{fmt(total)}</div>

                        <span className={`${LABEL} text-right text-[15px] leading-tight`}>Chq Received</span>
                        <input type="date" value={chqReceived} max={today()} disabled={!isChq} onChange={(e) => e.target.value && setChqReceived(e.target.value)} className={chqDateCls(isChq)} />
                        <span className={`${LABEL} text-right text-[15px] leading-tight`}>Cash Date</span>
                        <input type="date" value={chqCashDate} min={chqReceived} max={chqStatus === 'cashed' ? today() : undefined} disabled={!isChq}
                            onChange={(e) => e.target.value && setChqCashDate(e.target.value)} className={chqDateCls(isChq)}
                            title={chqStatus === 'pending' ? 'The day the cheque is to be cashed — an alert shows from that day' : 'The day the cheque was cashed'} />
                        <span className={`${LABEL} text-right text-[15px]`}>Status</span>
                        <select value={chqStatus} disabled={!isChq}
                            onChange={(e) => { const s = e.target.value as 'pending' | 'cashed'; setChqStatus(s); if (s === 'cashed' && chqCashDate > today()) setChqCashDate(today()); }}
                            className={`${COA_SELECT} ${isChq ? tone : 'opacity-60'}`}>
                            <option value="pending">Pending</option>
                            <option value="cashed">Cashed</option>
                        </select>
                        <span className={`col-span-2 text-[13px] font-bold ${!isChq ? 'text-slate-400' : chqStatus === 'pending' ? 'text-red-600' : 'text-blue-700'}`}>
                            {!isChq ? 'Enter the Chq No for a cheque' : chqStatus === 'pending' ? 'Not in the ledger until cashed' : 'Counts in the ledger'}
                        </span>
                    </div>
                </fieldset>

                <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
                    {pend.rows.length > 0 && (
                        <button type="button" onClick={() => setPendOpen(true)}
                            className={`h-9 border px-3 text-[13px] font-bold ${pend.due ? 'animate-pulse border-red-500 bg-red-600 text-white' : 'border-red-300 bg-[#ffe1e1] text-red-700'}`}>
                            {pend.due ? `⚠ ${pend.due} cheque${pend.due > 1 ? 's' : ''} due for cashing` : `${pend.rows.length} cheque${pend.rows.length > 1 ? 's' : ''} pending`} — Show
                        </button>
                    )}
                    {missing.length > 0 && <span className="mr-auto text-[12.5px] text-slate-500">To save, add {missing.join(' and ')}.</span>}
                    {!missing.length && <span className="mr-auto" />}
                    <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                    </button>
                    <button type="button" onClick={() => setView({ rows: null, filter: true })} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                    <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                </div>
            </div>

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={finder.target === 'as'} initial={finder.q} askClose={askClose}
                    onPick={(a) => pickAccount(a, finder.target)} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}

            {view && (
                <Modal title="Receipt Voucher" onClose={() => askClose(() => setView(null))} full>
                    <div className="relative flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full min-w-[1100px] table-fixed border-collapse bg-white text-[12px]">
                                <colgroup>{[9, 7, 8, 17, 17, 7, 7, 8, 6, 6, 8, 8].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Acc. ID', 'Account', 'Detail', 'Chq No', 'Date Chq', 'Bank', 'Chq', 'Staff', 'Debit', 'Credit'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {vRows.map((r, i) => (
                                        <tr key={i} className={`tabular-nums ${r.line === 1 && i > 0 ? 'border-t-2 border-t-slate-400' : ''} ${num(r.debit) > 0 ? 'bg-[#eaffea]' : 'bg-white'} ${r.chq_status === 'pending' ? 'font-semibold text-red-600' : r.chq_status === 'cashed' ? 'text-blue-700' : ''}`}>
                                            {[r.voucher_no, dmy(r.date), r.acc_id, r.account, r.detail, r.chq_no, dmy(r.chq_date), r.bank,
                                              r.chq_status === 'pending' ? 'Pending' : r.chq_status === 'cashed' ? `Cashed ${dmy(r.chq_cash_date)}` : '', r.staff,
                                              num(r.debit) ? fmt(num(r.debit)) : '', num(r.credit) ? fmt(num(r.credit)) : ''].map((v, k) => (
                                                <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 10 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {view.rows && !vRows.length && <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">No receipt vouchers for this search.</td></tr>}
                                    {!view.rows && !view.filter && <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <ReadBox value={<span className="text-[#1f2bd6]">{vRows.length} line(s)</span>} className="w-[220px]" />
                            <span className={`${LABEL} text-[15px]`}>Total Debit</span><div className={`${BAL} w-[170px]`}>{fmt(totDebit)}</div>
                            <span className={`${LABEL} text-[15px]`}>Total Credits</span><div className={`${BAL} w-[170px]`}>{fmt(totCredit)}</div>
                            <span className="flex-1" />
                            <button type="button" onClick={() => setView({ rows: view.rows, filter: true })} className={ACTION_BTN}>Search</button>
                            <button type="button" onClick={() => { setView(null); resetForm(); }} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            <button type="button" onClick={() => askClose(() => setView(null))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>

                        {/* View Receipt Voucher Detail — the search box over the grid */}
                        {view.filter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                                <fieldset className="w-[560px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-6 pb-5 pt-1 shadow-xl">
                                    <legend className="px-2 text-[16px] font-bold text-[#1f2bd6]">View Receipt Voucher Detail</legend>
                                    <div className="grid grid-cols-[130px_auto_1fr] items-center gap-x-3 gap-y-3">
                                        <span className={`${LABEL} text-[15px]`}>Voucher No</span>
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

            {pendOpen && (
                <Modal title="Pending Cheques" onClose={() => askClose(() => setPendOpen(false))} xl>
                    <div className="flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        {pend.due > 0 && (
                            <div className="border border-red-500 bg-red-600 px-3 py-1.5 text-[14px] font-bold text-white">
                                ⚠ {pend.due} cheque{pend.due > 1 ? 's are' : ' is'} due for cashing — cash {pend.due > 1 ? 'them' : 'it'} and mark Cashed.
                            </div>
                        )}
                        <div className="min-h-[160px] flex-1 overflow-auto border border-slate-500 bg-white">
                            {/* Fixed widths: every column, the Cashed button too, in one view — no sideways scroll. */}
                            <table className="w-full table-fixed border-collapse text-[12.5px]">
                                <colgroup>{[11, 10, 19, 11, 10, 9, 13, 9, 8].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Acc. ID', 'Account', 'Chq No', 'Bank', 'Received', 'Cash Date', 'Amount', ''].map((h, k) =>
                                        <th key={k} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold ${k === 7 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {pend.rows.map((r) => (
                                        <tr key={r.id} className={`tabular-nums ${r.due ? 'bg-[#ffd9d9] font-semibold text-red-700' : 'text-red-600'}`}>
                                            {[r.voucher_no, r.acc_id, r.account, r.chq_no, r.bank, dmy(r.received)].map((v, k) => (
                                                <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 1 ? 'font-mono' : ''}`}>{v}</td>
                                            ))}
                                            <td className="overflow-hidden whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-0.5 leading-tight">
                                                {dmy(r.cash_date)}
                                                {r.days !== null && <span className="block text-[11px]">{r.days < 0 ? `${-r.days} day${r.days === -1 ? '' : 's'} late` : r.days === 0 ? 'Due today' : `in ${r.days} day${r.days === 1 ? '' : 's'}`}</span>}
                                            </td>
                                            <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 text-right">{fmt(num(r.amount))}</td>
                                            <td className="border-b border-slate-300 px-1 py-0.5">
                                                <button type="button" onClick={() => setCashing({ row: r, date: today() })}
                                                    className="h-7 w-full border border-blue-500 bg-[#dfe9ff] text-[12px] font-bold text-blue-800 hover:bg-[#c9dcff]">Cashed</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!pend.rows.length && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No pending cheques.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center gap-3">
                            <ReadBox value={<span className="text-red-700">{pend.rows.length} pending · {fmt(pend.rows.reduce((s, r) => s + num(r.amount), 0))}</span>} className="w-[260px]" />
                            <span className="flex-1" />
                            <button type="button" onClick={() => askClose(() => setPendOpen(false))} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                        </div>
                    </div>
                </Modal>
            )}

            {cashing && (
                <Modal title="Cheque Cashed" onClose={() => setCashing(null)} small>
                    <div className="flex flex-col gap-3 bg-[#e4e4fb] p-4 text-[14px]">
                        <p>Cheque <b>{cashing.row.chq_no}</b> of <b>{cashing.row.voucher_no}</b> — {cashing.row.account}, <b>{fmt(num(cashing.row.amount))}</b>.
                            Once cashed it counts in the ledger and is taken off the balance.</p>
                        <label className="flex items-center gap-3">
                            <span className={`${LABEL} text-[15px]`}>Cashed on</span>
                            <input type="date" value={cashing.date} min={String(cashing.row.received).slice(0, 10)} max={today()}
                                onChange={(e) => e.target.value && setCashing({ ...cashing, date: e.target.value })} className={`${EDIT} w-[170px]`} />
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={cashCheque} disabled={!!cashing.busy} className={ACTION_BTN}>
                                {cashing.busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">O</span>K</>}
                            </button>
                            <button type="button" onClick={() => setCashing(null)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
