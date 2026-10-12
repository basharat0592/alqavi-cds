"use client";

/*
 * Trade 1.0 — Cheque Management.
 *
 * Un Clear Chqs: cheques received (booked into 12040002 Chq Amount by a Receipt
 * Voucher or Opening Assets) that have not gone to a bank yet — From / To Date
 * Chq, OK, Export. Click a cheque (or Enter) to move it into Send to Recovery;
 * click it there to take it back. Find the bank account (Account ID / Name),
 * Date, Staff; Save posts one voucher (Bank Dr / Chq Amount Cr) for the
 * cheques chosen and marks them cleared.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import { ConfirmBox, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow, downloadXlsx } from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import { isBankAcc } from '@/components/trade/TradeBankWithdrawal';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

type Chq = { line: number; voucher_no: string; date: string; acc_id: string; account: string; chq_no: string; chq_date: string | null; bank: string; detail: string; amount: any };
const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
const RO = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-normal text-slate-700`;
const HEADS = ['Vou. No', 'Date Vouc', 'Acc.ID', 'Account', 'Chq No', 'Date Chq', 'Bank', 'Detail', 'Amount'];
const COLS = [10, 9, 9, 17, 10, 9, 11, 15, 10];

export default function TradeChequeManagement() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Cheque Management)'; }, []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);
    const banks = useMemo(() => (accounts ? accounts.filter(isBankAcc) : null), [accounts]);
    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    // Un Clear Chqs
    const [fromOn, setFromOn] = useState(false); const [from, setFrom] = useState(today);
    const [toOn, setToOn] = useState(false); const [to, setTo] = useState(today);
    const [cheques, setCheques] = useState<Chq[] | null>(null);
    const [sel, setSel] = useState(-1);
    const load = async () => {
        const params: any = {};
        if (fromOn) params.date_from = from;
        if (toOn) params.date_to = to;
        try { const { data } = await api.get('v1/sales/trade-bank/cheques/', { params }); setCheques(data); setSel(-1); }
        catch { toast.error('Could not load the cheques.'); setCheques([]); }
    };
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Send to Recovery
    const [send, setSend] = useState<Chq[]>([]);
    const chosen = new Set(send.map((c) => c.line));
    const open = (cheques || []).filter((c) => !chosen.has(c.line));
    const choose = (c: Chq) => { setSend((s) => [...s, c]); setSel(-1); };
    const unchoose = (c: Chq) => setSend((s) => s.filter((x) => x.line !== c.line));
    const total = send.reduce((s, c) => s + num(c.amount), 0);
    const gridKeys = (e: React.KeyboardEvent) => {
        if (!open.length) return;
        if (e.key === 'Enter') { e.preventDefault(); choose(open[sel < 0 ? 0 : sel]); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        setSel((i) => Math.min(open.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    };

    const [code, setCode] = useState('');
    const [bank, setBank] = useState<Acc | null>(null);
    const [finder, setFinder] = useState<string | null>(null);
    const [dateOn, setDateOn] = useState(false); const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [detail, setDetail] = useState('');
    const pick = (a: Acc) => { setFinder(null); setBank(a); setCode(a.acc_id); };
    const resolve = () => {
        const c = code.trim();
        const hit = c ? (banks || []).find((a) => a.acc_id === c) : null;
        if (hit) pick(hit); else setFinder(/^\d+$/.test(c) ? '' : c);
    };

    const [saving, setSaving] = useState(false);
    const ready = !!bank && send.length > 0;
    const save = () => {
        if (!ready || saving) return;
        setAsk({
            msg: `Send ${send.length} cheque${send.length === 1 ? '' : 's'} (${fmt(total)}) to ${bank!.name} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-bank/clear_cheques/', {
                        lines: send.map((c) => c.line), bank: bank!.id, date: dateOn ? date : today(), staff: staffId || null, detail: detail.trim(),
                    });
                    toast.success(`Voucher ${data.voucher_no} saved — ${data.count} cheque${data.count === 1 ? '' : 's'}, ${fmt(num(data.total))}.`);
                    setSend([]); setBank(null); setCode(''); setDetail(''); setDateOn(false); setStaffId(''); loadNo(); load();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };
    const exportRows = () => downloadXlsx('uncleared-cheques', 'Un Clear Chqs', HEADS,
        (cheques || []).map((c) => [c.voucher_no, dmy(c.date), c.acc_id, c.account, c.chq_no, dmy(c.chq_date), c.bank, c.detail, num(c.amount)]));

    const closeWindow = () => askClose(closeTradeWindow, send.length ? 'The cheques are not saved. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';
    const legend = 'px-1 text-[17px] font-semibold text-[#b3261e]';
    const cells = (c: Chq) => [c.voucher_no, dmy(c.date), c.acc_id, c.account, c.chq_no, dmy(c.chq_date), c.bank, c.detail, fmt(num(c.amount))];
    const table = (rows: Chq[], onRow: (c: Chq) => void, selIdx: number, empty: string, hint: string) => (
        <table className="w-full table-fixed border-collapse bg-white text-[12.5px]">
            <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
            <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                <tr>{HEADS.map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
                {rows.map((c, i) => (
                    <tr key={c.line} onClick={() => onRow(c)} title={hint} className={`cursor-pointer tabular-nums ${selIdx === i ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                        {cells(c).map((v, k) => (
                            <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 8 ? 'text-right' : ''}`}>{v}</td>
                        ))}
                    </tr>
                ))}
                {!rows.length && <tr><td colSpan={9} className="px-3 py-4 text-center text-slate-500">{empty}</td></tr>}
            </tbody>
        </table>
    );

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1280} height={720} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Cheque Management)</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                    <fieldset className="flex min-h-0 flex-[1.2] flex-col border border-[#9da1d8] px-3 pb-3 pt-0">
                        <legend className={legend}>Un Clear Chqs</legend>
                        <div className="mb-2 grid shrink-0 grid-cols-[auto_220px_auto_auto_190px_auto_auto_190px_minmax(0,1fr)_110px_110px] items-center gap-2">
                            <span className={lbl}>Voucher No</span>
                            <div className={`${FIELD} flex h-9 items-center justify-center border-slate-400 bg-[#e1e1e8] font-mono !text-[16px] !font-bold text-[#1f2bd6]`}>{voucherNo}</div>
                            <span className={lbl}>From Date Chq</span>
                            <input type="checkbox" checked={fromOn} onChange={(e) => setFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={from} disabled={!fromOn} onChange={(e) => e.target.value && setFrom(e.target.value)} className={fromOn ? IN : RO} />
                            <span className={lbl}>To Date Chq</span>
                            <input type="checkbox" checked={toOn} onChange={(e) => setToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={to} disabled={!toOn} onChange={(e) => e.target.value && setTo(e.target.value)} className={toOn ? IN : RO} />
                            <span />
                            <button type="button" onClick={load} className={`${ACTION_BTN} !h-9 !min-w-0`}><span className="underline">O</span>K</button>
                            <button type="button" onClick={exportRows} disabled={!cheques?.length} className={`${ACTION_BTN} !h-9 !min-w-0`}>Export</button>
                        </div>
                        <div tabIndex={0} onKeyDown={gridKeys} className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                            {table(open, choose, sel, cheques === null ? 'Loading…' : 'No un-cleared cheques.', 'Click (or Enter) to send this cheque to the bank')}
                        </div>
                    </fieldset>

                    <fieldset className="flex min-h-0 flex-1 flex-col border border-[#9da1d8] px-3 pb-3 pt-0">
                        <legend className={legend}>Send to Recovery</legend>
                        <div className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a]">
                            {table(send, unchoose, -1, 'Click a cheque above to send it to the bank.', 'Click to take this cheque back')}
                        </div>
                        <div className="mt-2 grid shrink-0 grid-cols-[60px_190px_minmax(0,1fr)_auto_190px_auto_240px] items-end gap-x-2 gap-y-1">
                            <span /><span className={lbl}>Account ID</span><span className={lbl}>Account Name</span><span /><span /><span /><span className="text-[13px] font-bold text-[#1b1f4b]">Staff</span>
                            <button type="button" onClick={() => setFinder('')} className="h-8 border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] text-[13px] font-semibold"><span className="underline">F</span>ind</button>
                            <input value={code} onChange={(e) => { setCode(e.target.value); if (bank) setBank(null); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve(); } }} placeholder="Bank account" className={IN} />
                            <div className={RO}>{bank?.name || ''}</div>
                            <label className={`${lbl} flex items-center gap-2`}><input type="checkbox" checked={dateOn} onChange={(e) => setDateOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Date</label>
                            <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)} className={dateOn ? IN : RO} />
                            <span />
                            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-8 !text-[13px] !font-normal`}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                        </div>
                    </fieldset>

                    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_380px_150px_110px_110px] items-center gap-2">
                        <span className="text-[12.5px] text-slate-600">{send.length ? `${send.length} cheque${send.length === 1 ? '' : 's'} to send` : ''}</span>
                        <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255} placeholder={bank ? `Cheques sent to ${bank.name}` : 'Detail (Narration)'}
                            className={`${FIELD} h-8 w-full border-cyan-300 bg-[#c9f7fb] px-2 !text-[13px] !font-normal`} />
                        <div className={`${FIELD} flex h-8 items-center justify-end border-slate-300 bg-[#e1e1e8] px-2 !text-[14px] !font-bold tabular-nums text-[#1f2bd6]`}>{total ? fmt(total) : ''}</div>
                        <button type="button" onClick={save} disabled={saving || !ready} className={`${ACTION_BTN} !min-w-0`}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={closeWindow} className={`${ACTION_BTN} !min-w-0`}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>

            {finder !== null && (
                <FindAccountWindow accounts={banks} cashOnly={false} initial={finder} askClose={askClose}
                    onPick={pick} onClose={() => setFinder(null)} onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
