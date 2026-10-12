"use client";

/*
 * Trade 1.0 — Bank Withdrawal Voucher (Withdrawal From Bank).
 *
 * Voucher No, Find Banks (the Find Account window, bank accounts only, Add New
 * → Chart of Account) and the bank's Account Balance, Detail (Narration),
 * Amount (as Cash), Date Voucher, Staff. Save: Cash Dr / Bank Cr. View: Voucher
 * No, Find Banks, From / To Date → the withdrawals.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import { ConfirmBox, ReadBox, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
// Banks: Cash-Bank-Cheque (1204) other than Cash and Chq Amount, and Bank (2203).
export const isBankAcc = (a: Acc) => (a.group === 1204 && a.acc_id !== '12040001' && a.acc_id !== '12040002') || a.group === 2203;

const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
const RO = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-normal text-slate-700`;

export default function TradeBankWithdrawal() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  (Bank Withdrawal  Voucher)'; }, []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        const load = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
        load();
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
        window.addEventListener('focus', load);
        return () => window.removeEventListener('focus', load);
    }, []);
    const banks = useMemo(() => (accounts ? accounts.filter(isBankAcc) : null), [accounts]);

    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    const [code, setCode] = useState('');
    const [bank, setBank] = useState<Acc | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [detail, setDetail] = useState('');
    const [amount, setAmount] = useState('');
    const [dateOn, setDateOn] = useState(false); const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [finder, setFinder] = useState<null | { target: 'form' | 'view'; q: string }>(null);
    const detailRef = useRef<HTMLInputElement>(null);
    const [vBank, setVBank] = useState<Acc | null>(null);
    const [vCode, setVCode] = useState('');

    const pick = async (a: Acc, target: 'form' | 'view') => {
        setFinder(null);
        if (target === 'view') { setVBank(a); setVCode(a.acc_id); return; }
        setBank(a); setCode(a.acc_id); setBalance(null);
        setTimeout(() => detailRef.current?.focus(), 0);
        try { const { data } = await api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }); setBalance(num(data.balance)); } catch { setBalance(null); }
    };
    const resolve = (target: 'form' | 'view') => {
        const c = (target === 'form' ? code : vCode).trim();
        const hit = c ? (banks || []).find((a) => a.acc_id === c) : null;
        if (hit) pick(hit, target); else setFinder({ target, q: /^\d+$/.test(c) ? '' : c });
    };

    const [saving, setSaving] = useState(false);
    const ready = !!bank && num(amount) > 0;
    const reset = () => { setBank(null); setCode(''); setBalance(null); setDetail(''); setAmount(''); setDateOn(false); setDate(today()); setStaffId(''); loadNo(); };
    const save = () => {
        if (!ready || saving) return;
        setAsk({
            msg: `Withdraw ${fmt(num(amount))} from ${bank!.name} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-bank/withdrawals/', {
                        bank: bank!.id, amount: num(amount), detail: detail.trim(), date: dateOn ? date : today(), staff: staffId || null,
                    });
                    toast.success(`Voucher ${data.voucher_no} saved — ${fmt(num(data.amount))}.`);
                    reset();
                    if (rows) runView();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Bank withdrawal Voucher Detail
    const [filter, setFilter] = useState(false);
    const [rows, setRows] = useState<any[] | null>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        const params: any = {};
        if (vNo.trim()) params.voucher_no = vNo.trim();
        if (vBank) params.bank = vBank.id;
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false);
        try { const { data } = await api.get('v1/sales/trade-bank/withdrawals/', { params }); setRows(data); }
        catch { toast.error('Could not load.'); }
    };

    const closeWindow = () => askClose(closeTradeWindow, ready ? 'The voucher is not saved. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';
    const findBtn = 'h-8 w-full whitespace-nowrap border border-slate-400 bg-gradient-to-b from-white to-[#e4e4ee] px-3 text-[13px] font-semibold text-slate-800 shadow-sm hover:to-[#d6d6e4]';

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1100} height={rows ? 660 : 400} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;(Bank Withdrawal  Voucher)</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <fieldset className="shrink-0 border border-[#9da1d8] bg-white/30 px-5 pb-4 pt-0">
                        <legend className="px-1 text-[20px] font-semibold text-[#1f2bd6]">Withdrawal From Bank</legend>
                        <div className="grid grid-cols-[150px_200px_minmax(0,1fr)_200px] items-center gap-x-3 gap-y-2.5">
                            <span className={lbl}>Voucher No</span>
                            <div className={`${FIELD} flex h-9 items-center justify-center border-slate-400 bg-[#e1e1e8] font-mono !text-[17px] !font-bold text-[#1f2bd6]`}>{voucherNo}</div>
                            <span className={`${lbl} text-right font-semibold`}>Account Balance</span>
                            <div className={`${FIELD} flex h-8 items-center justify-end border-cyan-300 bg-[#c9f7fb] px-2 !text-[13px] !font-semibold tabular-nums`}>{balance === null ? '' : fmt(balance)}</div>

                            <button type="button" onClick={() => setFinder({ target: 'form', q: '' })} className={findBtn}><span className="underline">F</span>ind Banks</button>
                            <input value={code} onChange={(e) => { setCode(e.target.value); if (bank) { setBank(null); setBalance(null); } }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve('form'); } }} placeholder="Bank account" className={IN} />
                            <div className={`${RO} col-span-2`}>{bank?.name || ''}</div>

                            <span className={lbl}>Detail&nbsp;&nbsp;(Narration)</span>
                            <input ref={detailRef} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255} placeholder={bank ? `Withdrawal from ${bank.name}` : ''} className={IN} />
                            <span className={`${lbl} text-right`}>Amount (as Cash)</span>
                            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} className={`${IN} text-right`} />

                            <label className={`${lbl} flex items-center gap-2`}>Date Voucher
                                <input type="checkbox" checked={dateOn} onChange={(e) => setDateOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /></label>
                            <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)} className={dateOn ? IN : RO} />
                            <span className={`${lbl} text-right`}>Staff</span>
                            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-8 !text-[13px] !font-normal`}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                        </div>
                    </fieldset>

                    {rows && (
                        <div className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full table-fixed border-collapse bg-white text-[12.5px]">
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Acc ID', 'Bank', 'Detail', 'Staff', 'Amount'].map((h) => <th key={h} className="border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="tabular-nums hover:bg-indigo-50">
                                            {[r.voucher_no, dmy(r.date), r.acc_id, r.bank, r.detail, r.staff, fmt(num(r.amount))].map((v, k) => (
                                                <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 6 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!rows.length && <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-500">No withdrawals for this search.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!rows && <span className="flex-1" />}

                    <div className="flex shrink-0 items-center justify-end gap-3">
                        {rows && <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length} · {fmt(rows.reduce((s, r) => s + num(r.amount), 0))}</span>} className="mr-auto h-8 w-[300px] !text-[12.5px] !font-normal" />}
                        <button type="button" onClick={save} disabled={saving || !ready} className={ACTION_BTN}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={() => setFilter(true)} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>

            {filter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30"
                    onKeyDown={(e) => { if (e.key === 'Escape') setFilter(false); if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); runView(); } }}>
                    <fieldset className="w-[640px] border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                        <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">View Bank withdrawal Voucher Detail</legend>
                        <div className="grid grid-cols-[110px_24px_minmax(0,1fr)_150px] items-center gap-x-3 gap-y-2.5">
                            <span className="text-[13px]">Voucher No</span><span />
                            <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} />
                            <ReadBox value={vBank ? vBank.name : ''} className="h-8 !text-[12px] !font-normal" />
                            <button type="button" onClick={() => setFinder({ target: 'view', q: '' })} className={findBtn}><span className="underline">F</span>ind Banks</button><span />
                            <input value={vCode} onChange={(e) => { setVCode(e.target.value); if (vBank) setVBank(null); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); resolve('view'); } }} placeholder="Any bank" className={IN} />
                            <span />
                            <span className="text-[13px]">From Date</span>
                            <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)} className={vFromOn ? IN : RO} />
                            <span className="row-span-2 flex items-center">
                                <button type="button" onClick={runView} className={`${ACTION_BTN} !h-12 w-full !min-w-0 !text-[15px]`}><span className="underline">O</span>K</button>
                            </span>
                            <span className="text-[13px]">To Date</span>
                            <input type="checkbox" checked={vToOn} onChange={(e) => setVToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={vTo} disabled={!vToOn} onChange={(e) => e.target.value && setVTo(e.target.value)} className={vToOn ? IN : RO} />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => setFilter(false)} className="text-[12px] text-slate-600 underline">Back</button>
                        </div>
                    </fieldset>
                </div>
            )}
            {finder && (
                <FindAccountWindow accounts={banks} cashOnly={false} initial={finder.q} askClose={askClose}
                    onPick={(a) => pick(a, finder.target)} onClose={() => setFinder(null)} onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
