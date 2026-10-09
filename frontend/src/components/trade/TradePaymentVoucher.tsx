"use client";

/*
 * Trade 1.0 — Payment Voucher ("Advance / Payment To").
 *
 * Payment to: the account paid (supplier, expense, customer …); Payment from:
 * the cash / bank account the money leaves. One amount per voucher. Paying a
 * supplier settles their unpaid purchases, oldest first. View: the legacy
 * "View Payment Voucher Detail" (voucher no, payment-to account, date range).
 */

import { useEffect, useState } from 'react';
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

type Target = 'to' | 'from' | 'view';

export default function TradePaymentVoucher() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Payment Voucher )'; }, []);

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

    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);
    const [dateOn, setDateOn] = useState(false);
    const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');

    const [toCode, setToCode] = useState(''); const [toAcc, setToAcc] = useState<Acc | null>(null); const [toBal, setToBal] = useState<number | null>(null);
    const [frCode, setFrCode] = useState(''); const [frAcc, setFrAcc] = useState<Acc | null>(null); const [frBal, setFrBal] = useState<number | null>(null);
    const [detail, setDetail] = useState('');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);

    const balanceOf = (a: Acc) => api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }).then(({ data }) => num(data.balance)).catch(() => null);

    // View filter account (Find Acc Payment to)
    const [vAcc, setVAcc] = useState<Acc | null>(null);
    const [vCode, setVCode] = useState('');

    const [finder, setFinder] = useState<null | { target: Target; q: string }>(null);
    const pick = async (a: Acc, target: Target) => {
        setFinder(null);
        if (target === 'to') { setToAcc(a); setToCode(a.acc_id); setToBal(null); setToBal(await balanceOf(a)); }
        else if (target === 'from') { setFrAcc(a); setFrCode(a.acc_id); setFrBal(null); setFrBal(await balanceOf(a)); }
        else { setVAcc(a); setVCode(a.acc_id); }
    };
    const resolve = (target: Target) => {
        const code = (target === 'to' ? toCode : target === 'from' ? frCode : vCode).trim();
        const hit = code ? (accounts || []).find((a) => a.acc_id === code && (target !== 'from' || isCashBank(a))) : null;
        if (hit) pick(hit, target);
        else setFinder({ target, q: /^\d+$/.test(code) ? '' : code });
    };

    const amt = Math.round(num(amount) * 100) / 100;
    const missing = [!toAcc && 'Payment to', !frAcc && 'Payment from', amt <= 0 && 'the Amount'].filter(Boolean) as string[];
    const resetForm = () => {
        setToAcc(null); setToCode(''); setToBal(null); setFrAcc(null); setFrCode(''); setFrBal(null);
        setDetail(''); setAmount(''); setStaffId(''); setDateOn(false); setDate(today()); loadNo();
    };
    const save = () => {
        if (saving) return;
        if (missing.length) { toast.error(`Add ${missing.join(', ')}.`); return; }
        if (toAcc!.id === frAcc!.id) { toast.error('Payment to and Payment from cannot be the same account.'); return; }
        setAsk({
            msg: `Save Payment Voucher ${voucherNo}: ${fmt(amt)} to ${toAcc!.name} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/vouchers/', {
                        vtype: 'payment', date: dateOn ? date : today(), pay_to: toAcc!.id, pay_from: frAcc!.id,
                        amount: amt, staff: staffId || null, detail: detail.trim(),
                    });
                    toast.success(`Payment Voucher ${data.voucher_no} saved — ${fmt(num(data.total))}.`);
                    resetForm();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the voucher.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Payment Voucher Detail
    const [view, setView] = useState<null | { rows: any[] | null; filter: boolean }>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        setView({ rows: null, filter: false });
        try {
            const params: any = { vtype: 'payment' };
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

    const closeWindow = () => askClose(closeTradeWindow, toAcc || amt > 0 ? 'The voucher is not saved. Do you want to Close the Form ?' : undefined);
    const findBtn = 'h-9 w-full rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] px-3 text-[13.5px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px';
    const BAL = `${FIELD} flex h-9 items-center justify-end border-sky-300 bg-[#c9f6ff] font-bold text-slate-900`;

    return (
        <div className="min-h-screen bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Payment Voucher )</span>
            </div>

            <div className="mx-auto max-w-[1400px] p-3">
                <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-5 pt-1">
                    <legend className="px-1.5 text-[19px] font-black tracking-tight text-[#1f2bd6]">Advance / Payment To</legend>
                    <div className="grid grid-cols-[150px_200px_minmax(0,1fr)_240px] items-center gap-x-3 gap-y-3">
                        <span className={`${LABEL} text-[15px]`}>Voucher No</span>
                        <div className="flex h-9 items-center justify-center rounded-md border border-slate-400 bg-[#e6e6ee] text-[19px] font-black tabular-nums text-[#1f2bd6]">{voucherNo}</div>
                        <span className={`${LABEL} self-end text-[14px]`}>Staff</span>
                        <span />

                        <label className={`${LABEL} flex items-center gap-2 text-[15px]`}>
                            Date Voucher <input type="checkbox" checked={dateOn} onChange={(e) => { setDateOn(e.target.checked); if (!e.target.checked) setDate(today()); }} className="h-4 w-4 accent-[#3b3f8f]" />
                        </label>
                        <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)}
                            className={`${FIELD} h-9 w-full ${dateOn ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-9 max-w-[420px]`}>
                            <option value="">Select any one</option>
                            {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </select>
                        <span className={`${LABEL} self-end text-[15px]`}>Account Balance</span>

                        <button type="button" onClick={() => setFinder({ target: 'to', q: '' })} className={findBtn}>Payment to</button>
                        <input value={toCode} onChange={(e) => { setToCode(e.target.value); if (toAcc) { setToAcc(null); setToBal(null); } }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('to'); } }} placeholder="Account ID" className={`${EDIT} h-9 w-full`} />
                        <ReadBox value={toAcc ? toAcc.name : ''} className="h-9" />
                        <div className={BAL}>{toAcc ? (toBal === null ? '…' : fmt(toBal)) : ''}</div>

                        <button type="button" onClick={() => setFinder({ target: 'from', q: '' })} className={findBtn}>Payment from</button>
                        <input value={frCode} onChange={(e) => { setFrCode(e.target.value); if (frAcc) { setFrAcc(null); setFrBal(null); } }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('from'); } }} placeholder="Cash / bank ID" className={`${EDIT} h-9 w-full`} />
                        <ReadBox value={frAcc ? frAcc.name : ''} className="h-9" />
                        <span className={`${LABEL} self-end text-[15px]`}>Account Balance</span>

                        <span className={`${LABEL} text-right text-[15px]`}>Detail</span>
                        <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_80px_200px] items-center gap-3">
                            <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255} className={`${EDIT} h-9 w-full`} />
                            <span className={`${LABEL} text-right text-[15px]`}>Amount</span>
                            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} className={`${EDIT} h-9 w-full text-right`} />
                        </div>
                        <div className={BAL}>{frAcc ? (frBal === null ? '…' : fmt(frBal)) : ''}</div>
                    </div>
                </fieldset>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                    {missing.length > 0 && <span className="mr-auto text-[12.5px] text-slate-500">To save, add {missing.join(', ')}.</span>}
                    <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                    </button>
                    <button type="button" onClick={() => setView({ rows: null, filter: true })} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                    <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                </div>
            </div>

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={finder.target === 'from'} initial={finder.q} askClose={askClose}
                    onPick={(a) => pick(a, finder.target)} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}

            {view && (
                <Modal title="Payment Voucher" onClose={() => askClose(() => setView(null))} full>
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
                                    {view.rows && !vRows.length && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No payment vouchers for this search.</td></tr>}
                                    {!view.rows && !view.filter && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
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

                        {view.filter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                                <fieldset className="w-[640px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-6 pb-5 pt-1 shadow-xl">
                                    <legend className="px-2 text-[16px] font-bold text-[#1f2bd6]">View Payment Voucher Detail</legend>
                                    <div className="grid grid-cols-[170px_auto_1fr] items-center gap-x-3 gap-y-3">
                                        <span className={`${LABEL} text-[15px]`}>Voucher No</span><span />
                                        <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runView(); }}
                                            placeholder="All" className={`${EDIT} w-full`} />
                                        <button type="button" onClick={() => setFinder({ target: 'view', q: '' })}
                                            className="h-8 rounded border border-slate-400 bg-white px-2 text-[13px] font-semibold text-slate-800 hover:bg-slate-50">Find Acc Payment to</button>
                                        <span />
                                        <div className="flex gap-2">
                                            <input value={vCode} onChange={(e) => { setVCode(e.target.value); if (vAcc) setVAcc(null); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('view'); } }} placeholder="Any account" className={`${EDIT} w-[130px]`} />
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
