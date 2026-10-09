"use client";

/*
 * Trade 1.0 — Expense Voucher.
 *
 * Expense on: one or more expense accounts, each with amount and detail, added
 * to the S.No / Exp. Acc.ID / Exp. Account Name / Detail / Amount grid.
 * Expens by: the cash / bank account the money comes from, and the staff.
 * View: the legacy "View Expense Voucher Detail" (voucher no, expense account,
 * date range) with Total Records / Total Debit / Total Credits.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    Modal, ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, isCashBank, type Acc } from '@/components/trade/TradeReceiptVoucher';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
// Expense accounts sit under main account 5 (Expenses) in the chart of accounts.
const isExpense = (a: Acc) => String(a.group).startsWith('5');

type Line = { account: Acc; amount: number; detail: string };
type Target = 'exp' | 'by' | 'view';

export default function TradeExpenseVoucher() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Expense Voucher )'; }, []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const loadAccounts = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    useEffect(() => {
        loadAccounts();
        const f = () => loadAccounts();
        window.addEventListener('focus', f);
        return () => window.removeEventListener('focus', f);
    }, []);
    const expAccounts = useMemo(() => (accounts ? accounts.filter(isExpense) : null), [accounts]);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);

    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);
    const [dateOn, setDateOn] = useState(false);
    const [date, setDate] = useState(today);

    // Expense on (entry + grid)
    const [expCode, setExpCode] = useState(''); const [expAcc, setExpAcc] = useState<Acc | null>(null); const [expBal, setExpBal] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [detail, setDetail] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const amountRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);

    // Expens by
    const [byCode, setByCode] = useState(''); const [byAcc, setByAcc] = useState<Acc | null>(null); const [byBal, setByBal] = useState<number | null>(null);
    const [staffId, setStaffId] = useState('');
    const [saving, setSaving] = useState(false);

    const balanceOf = (a: Acc) => api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }).then(({ data }) => num(data.balance)).catch(() => null);

    const [vAcc, setVAcc] = useState<Acc | null>(null);
    const [vCode, setVCode] = useState('');
    const [finder, setFinder] = useState<null | { target: Target; q: string }>(null);
    const pick = async (a: Acc, target: Target) => {
        setFinder(null);
        if (target === 'exp') { setExpAcc(a); setExpCode(a.acc_id); setExpBal(null); setTimeout(() => amountRef.current?.focus(), 0); setExpBal(await balanceOf(a)); }
        else if (target === 'by') { setByAcc(a); setByCode(a.acc_id); setByBal(null); setByBal(await balanceOf(a)); }
        else { setVAcc(a); setVCode(a.acc_id); }
    };
    const resolve = (target: Target) => {
        const code = (target === 'exp' ? expCode : target === 'by' ? byCode : vCode).trim();
        const ok = (a: Acc) => (target === 'by' ? isCashBank(a) : isExpense(a));
        const hit = code ? (accounts || []).find((a) => a.acc_id === code && ok(a)) : null;
        if (hit) pick(hit, target);
        else setFinder({ target, q: /^\d+$/.test(code) ? '' : code });
    };

    const total = lines.reduce((s, l) => s + l.amount, 0);
    const addLine = () => {
        if (!expAcc) { toast.error('Find the expense account first.'); codeRef.current?.focus(); return; }
        const amt = Math.round(num(amount) * 100) / 100;
        if (amt <= 0) { toast.error('Enter the amount.'); amountRef.current?.focus(); return; }
        setLines((ls) => [...ls, { account: expAcc, amount: amt, detail: detail.trim() }]);
        setExpAcc(null); setExpCode(''); setExpBal(null); setAmount(''); setDetail(''); setSel(-1);
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };

    const missing = [!lines.length && 'an expense line', !byAcc && 'the Expens by account'].filter(Boolean) as string[];
    const resetForm = () => {
        setLines([]); setSel(-1); setExpAcc(null); setExpCode(''); setExpBal(null); setAmount(''); setDetail('');
        setByAcc(null); setByCode(''); setByBal(null); setStaffId(''); setDateOn(false); setDate(today()); loadNo();
    };
    const save = () => {
        if (saving) return;
        if (missing.length) { toast.error(`Add ${missing.join(' and ')}.`); return; }
        setAsk({
            msg: `Save Expense Voucher ${voucherNo} for ${fmt(total)} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/vouchers/', {
                        vtype: 'expense', date: dateOn ? date : today(), expense_by: byAcc!.id, staff: staffId || null,
                        lines: lines.map((l) => ({ account: l.account.id, amount: l.amount, detail: l.detail })),
                    });
                    toast.success(`Expense Voucher ${data.voucher_no} saved — ${fmt(num(data.total))}.`);
                    resetForm();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the voucher.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Expense Voucher Detail
    const [view, setView] = useState<null | { rows: any[] | null; filter: boolean }>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        setView({ rows: null, filter: false });
        try {
            const params: any = { vtype: 'expense' };
            if (vNo.trim()) params.voucher_no = vNo.trim();
            if (vAcc) params.account = vAcc.id;
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
    const legend = (t: string) => <legend className="px-1.5 text-[19px] font-black tracking-tight text-[#1f2bd6]">{t}</legend>;
    const findBtn = 'h-9 w-full rounded-md border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] px-3 text-[13.5px] font-bold text-slate-800 shadow-sm hover:to-[#ffcf9a] active:translate-y-px';
    const BAL = `${FIELD} flex h-9 items-center justify-end border-sky-300 bg-[#c9f6ff] font-bold text-slate-900`;

    return (
        <div className="min-h-screen bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Expense Voucher )</span>
            </div>

            <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="flex flex-col gap-3">
                    {/* Expense on */}
                    <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
                        {legend('Expense on')}
                        <div className="grid grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                            <span className={`${LABEL} text-[15px]`}>Voucher No</span>
                            <div className="flex h-9 items-center justify-center rounded-md border border-slate-400 bg-[#e6e6ee] text-[19px] font-black tabular-nums text-[#1f2bd6]">{voucherNo}</div>
                            <ReadBox value={expAcc ? expAcc.name : ''} className="h-9" />

                            <label className={`${LABEL} flex items-center gap-2 text-[15px]`}>
                                Date Voucher <input type="checkbox" checked={dateOn} onChange={(e) => { setDateOn(e.target.checked); if (!e.target.checked) setDate(today()); }} className="h-4 w-4 accent-[#3b3f8f]" />
                            </label>
                            <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)}
                                className={`${FIELD} h-9 w-full ${dateOn ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                            <span className={`${LABEL} self-end text-[15px]`}>Account Balance</span>

                            <button type="button" onClick={() => setFinder({ target: 'exp', q: '' })} className={findBtn}><span className="underline">F</span>ind Expense Acc</button>
                            <input ref={codeRef} value={expCode} onChange={(e) => { setExpCode(e.target.value); if (expAcc) { setExpAcc(null); setExpBal(null); } }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('exp'); } }} placeholder="Expense Acc ID" className={`${EDIT} h-9 w-full`} />
                            <div className={BAL}>{expAcc ? (expBal === null ? '…' : fmt(expBal)) : ''}</div>

                            <span className={`${LABEL} text-[15px]`}>Amount</span>
                            <input ref={amountRef} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${EDIT} h-9 w-full text-right`} />
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={addLine} disabled={!expAcc || num(amount) <= 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                                <button type="button" onClick={removeLine} disabled={sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                            </div>

                            <span className={`${LABEL} text-[15px]`}>Detail (Narration)</span>
                            <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${EDIT} col-span-2 h-9 w-full`} />
                        </div>
                    </fieldset>

                    {/* Expens by */}
                    <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
                        {legend('Expens by')}
                        <div className="grid grid-cols-[150px_160px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                            <button type="button" onClick={() => setFinder({ target: 'by', q: '' })} className={findBtn}><span className="underline">F</span>ind Account</button>
                            <input value={byCode} onChange={(e) => { setByCode(e.target.value); if (byAcc) { setByAcc(null); setByBal(null); } }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('by'); } }} placeholder="Cash / bank ID" className={`${EDIT} h-9 w-full`} />
                            <ReadBox value={byAcc ? byAcc.name : ''} className="h-9" />
                            <span className={`${LABEL} text-right text-[15px]`}>Staff</span>
                            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} col-span-2 h-9`}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                        </div>
                    </fieldset>
                </div>

                {/* Lines + balances */}
                <div className="flex flex-col gap-3">
                    <div className="flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-lg border border-slate-500 bg-[#8a8a8a]">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full table-fixed border-collapse bg-white text-[13px]">
                                <colgroup><col style={{ width: '8%' }} /><col style={{ width: '16%' }} /><col style={{ width: '33%' }} /><col style={{ width: '26%' }} /><col style={{ width: '17%' }} /></colgroup>
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['S.No', 'Exp. Acc.ID', 'Exp.Account Name', 'Detail', 'Amount'].map((h) => <th key={h} className="border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, i) => (
                                        <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1">{i + 1}</td>
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1 font-mono">{l.account.acc_id}</td>
                                            <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1" title={l.account.name}>{l.account.name}</td>
                                            <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1" title={l.detail}>{l.detail}</td>
                                            <td className="border-b border-r border-slate-300 px-1.5 py-1 text-right font-semibold">{fmt(l.amount)}</td>
                                        </tr>
                                    ))}
                                    {!lines.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">Find the expense account, enter amount and detail, press Add.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                        <span className={`${LABEL} text-[15px]`}>Account Balance</span>
                        <div className={BAL}>{byAcc ? (byBal === null ? '…' : fmt(byBal)) : ''}</div>
                        <span className={`${LABEL} text-[15px]`}>Total</span>
                        <div className={BAL}>{fmt(total)}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {missing.length > 0 && <span className="mr-auto text-[12.5px] text-slate-500">To save, add {missing.join(' and ')}.</span>}
                        <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={() => setView({ rows: null, filter: true })} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </div>

            {finder && (
                <FindAccountWindow accounts={finder.target === 'by' ? accounts : expAccounts} cashOnly={finder.target === 'by'} initial={finder.q} askClose={askClose}
                    onPick={(a) => pick(a, finder.target)} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}

            {view && (
                <Modal title="Expense Voucher" onClose={() => askClose(() => setView(null))} full>
                    <div className="relative flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full min-w-[1000px] table-fixed border-collapse bg-white text-[12px]">
                                <colgroup>{[10, 8, 9, 24, 23, 10, 8, 8].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Acc. ID', 'Account', 'Detail', 'Staff', 'Debit', 'Credit'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {vRows.map((r, i) => (
                                        <tr key={i} className={`tabular-nums ${r.line === 1 && i > 0 ? 'border-t-2 border-t-slate-400' : ''} ${num(r.debit) > 0 ? 'bg-[#eaffea]' : 'bg-white'}`}>
                                            {[r.voucher_no, dmy(r.date), r.acc_id, r.account, r.detail, r.staff,
                                              num(r.debit) ? fmt(num(r.debit)) : '', num(r.credit) ? fmt(num(r.credit)) : ''].map((v, k) => (
                                                <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 6 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {view.rows && !vRows.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No expense vouchers for this search.</td></tr>}
                                    {!view.rows && !view.filter && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {vRows.length}</span>} className="w-[220px]" />
                            <span className={`${LABEL} text-[15px]`}>Total Debit</span><div className={`${BAL} w-[170px]`}>{fmt(totDebit)}</div>
                            <span className={`${LABEL} text-[15px]`}>Total Credits</span><div className={`${BAL} w-[170px]`}>{fmt(totCredit)}</div>
                            <span className="flex-1" />
                            <button type="button" onClick={() => setView({ rows: view.rows, filter: true })} className={ACTION_BTN}>Search</button>
                            <button type="button" onClick={() => { setView(null); resetForm(); }} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            <button type="button" onClick={() => askClose(() => setView(null))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>

                        {view.filter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                                <fieldset className="w-[640px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-6 pb-5 pt-1 shadow-xl">
                                    <legend className="px-2 text-[16px] font-bold text-[#1f2bd6]">View Expense Voucher Detail</legend>
                                    <div className="grid grid-cols-[170px_auto_1fr] items-center gap-x-3 gap-y-3">
                                        <span className={`${LABEL} text-[15px]`}>Voucher No</span><span />
                                        <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runView(); }}
                                            placeholder="All" className={`${EDIT} w-full`} />
                                        <button type="button" onClick={() => setFinder({ target: 'view', q: '' })}
                                            className="h-8 rounded border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] px-2 text-[13px] font-semibold text-slate-800"><span className="underline">F</span>ind Expense Acc</button>
                                        <span />
                                        <div className="flex gap-2">
                                            <input value={vCode} onChange={(e) => { setVCode(e.target.value); if (vAcc) setVAcc(null); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('view'); } }} placeholder="Any expense" className={`${EDIT} w-[130px]`} />
                                            <ReadBox value={vAcc ? vAcc.name : ''} className="flex-1" />
                                        </div>
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
