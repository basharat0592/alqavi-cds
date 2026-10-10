"use client";

/*
 * Trade 1.0 — Opening Assets / Opening Receivables / Opening Liabilities.
 *
 * Find Account (assets; customers 1202; liabilities incl. suppliers) → its
 * name; Opening Assets also takes Chq No, Bank and a cheque date. Detail is
 * fixed ("Opening Balance of …") and the grey line under it shows the other
 * side of the entry, 31010001 Capital. Date Voucher, Staff, Voucher No, Add /
 * Remove into the grid; Save posts one voucher (each account against Capital).
 * View: Voucher No, From / To Date Voucher → the saved lines (read only).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';

export type OpeningKind = 'assets' | 'receivables' | 'liabilities';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

const META: Record<OpeningKind, { title: string; window: string; detail: string; viewTitle: string; allow: (a: Acc) => boolean }> = {
    assets: {
        title: 'Opening Assets', window: 'Opening Assets', detail: 'Opening Balance of Assets', viewTitle: 'View Opening Assets Voucher Detail',
        allow: (a) => String(a.group).startsWith('1') && a.group !== 1202,
    },
    receivables: {
        title: 'Opening Receivables', window: 'Opening Receivable', detail: 'Opening Balance of Receiveables', viewTitle: 'View Opening Receivable Voucher Detail',
        allow: (a) => a.group === 1202,
    },
    liabilities: {
        title: 'Opening Liabilities', window: 'Opening Liabilities', detail: 'Opening Balance of Liabilities', viewTitle: 'View Opening Liabilities Voucher Detail',
        allow: (a) => String(a.group).startsWith('2'),
    },
};
const CAPITAL = '31010001';

type Line = { acc_id: string; account: string; accountId?: number; chq_no: string; bank: string; chq_date: string | null; amount: number; voucher_no?: string; date?: string };

const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
const RO = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-normal text-slate-700`;
const DETAIL = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-semibold text-[#1f2bd6]`;

export default function TradeOpeningVoucher({ kind }: { kind: OpeningKind }) {
    const M = META[kind];
    const assets = kind === 'assets';
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = `AL-QAVI TRADERS  Trade 1.0  ( ${M.window} )`; }, [M.window]);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        const loadAcc = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
        loadAcc();
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
        window.addEventListener('focus', loadAcc);
        return () => window.removeEventListener('focus', loadAcc);
    }, []);
    const allowed = useMemo(() => (accounts ? accounts.filter(M.allow) : null), [accounts, M]);
    const capital = (accounts || []).find((a) => a.acc_id === CAPITAL);

    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    // entry
    const [code, setCode] = useState('');
    const [acc, setAcc] = useState<Acc | null>(null);
    const [chqNo, setChqNo] = useState('');
    const [bank, setBank] = useState('');
    const [chqOn, setChqOn] = useState(false); const [chqDate, setChqDate] = useState(today);
    const [amount, setAmount] = useState('');
    const [finder, setFinder] = useState<string | null>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const amtRef = useRef<HTMLInputElement>(null);
    const pick = (a: Acc) => { setFinder(null); setAcc(a); setCode(a.acc_id); setTimeout(() => amtRef.current?.focus(), 0); };
    const resolve = () => {
        const c = code.trim();
        const hit = c ? (allowed || []).find((a) => a.acc_id === c) : null;
        if (hit) pick(hit); else setFinder(/^\d+$/.test(c) ? '' : c);
    };

    const [dateOn, setDateOn] = useState(false); const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const [viewing, setViewing] = useState(false);
    const addLine = () => {
        if (viewing) return;
        if (!acc) { toast.error('Find the account first.'); codeRef.current?.focus(); return; }
        const a = num(amount);
        if (a <= 0) { toast.error('Enter the Amount.'); amtRef.current?.focus(); return; }
        if (lines.some((l) => l.accountId === acc.id)) { toast.error(`${acc.name} is already in the voucher.`); return; }
        setLines((ls) => [...ls, {
            accountId: acc.id, acc_id: acc.acc_id, account: acc.name, chq_no: assets ? chqNo.trim() : '', bank: assets ? bank.trim() : '',
            chq_date: assets && chqOn ? chqDate : null, amount: a,
        }]);
        setAcc(null); setCode(''); setAmount(''); setChqNo(''); setBank(''); setChqOn(false); setSel(-1);
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (viewing) return;
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };
    const total = lines.reduce((s, l) => s + l.amount, 0);

    const addNew = () => {
        setViewing(false); setLines([]); setSel(-1); setAcc(null); setCode(''); setAmount(''); setDateOn(false); setDate(today());
        setStaffId(''); loadNo(); setTimeout(() => codeRef.current?.focus(), 0);
    };
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (saving || viewing || !lines.length) return;
        setAsk({
            msg: `Save ${M.title} voucher ${voucherNo} (${lines.length} account${lines.length === 1 ? '' : 's'}, ${fmt(total)}) ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-opening-vouchers/', {
                        kind, date: dateOn ? date : today(), staff: staffId || null,
                        lines: lines.map((l) => ({ account: l.accountId, amount: l.amount, chq_no: l.chq_no, bank: l.bank, chq_date: l.chq_date })),
                    });
                    toast.success(`Voucher ${data.voucher_no} saved — ${fmt(num(data.total))}.`);
                    addNew();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the voucher.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View … Voucher Detail
    const [filter, setFilter] = useState(false);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        const params: any = { kind };
        if (vNo.trim()) params.voucher_no = vNo.trim();
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false);
        try {
            const { data } = await api.get('v1/sales/trade-opening-vouchers/', { params });
            setViewing(true); setSel(-1); setAcc(null); setCode(''); setAmount('');
            setLines(data.map((r: any) => ({ voucher_no: r.voucher_no, date: r.date, acc_id: r.acc_id, account: r.account, chq_no: r.chq_no, bank: r.bank, chq_date: r.chq_date, amount: num(r.amount) })));
            if (!data.length) toast('Nothing found for this search.');
        } catch { toast.error('Could not load.'); }
    };

    const gridKeys = (e: React.KeyboardEvent) => {
        if (!lines.length) return;
        if (e.key === 'Delete' && !viewing) { e.preventDefault(); removeLine(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        setSel((i) => Math.min(lines.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    };
    const closeWindow = () => askClose(closeTradeWindow, !viewing && lines.length ? 'The voucher is not saved. Do you want to Close the Form ?' : undefined);

    const lbl = 'whitespace-nowrap text-[13px] text-[#1b1f4b]';
    const findBtn = 'h-8 shrink-0 whitespace-nowrap rounded-md border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] px-3 text-[13px] font-semibold text-slate-800 shadow-sm hover:to-[#ffcf9a] active:translate-y-px disabled:opacity-50';
    const heads = viewing
        ? ['Voucher No', 'Date', 'AccID', 'Account', ...(assets ? ['Chq No', 'Bank', 'Chq Date'] : []), 'Detail', 'Amount']
        : ['S.No', 'AccID', 'Account', ...(assets ? ['Chq No', 'Bank', 'Chq Date'] : []), 'Detail', 'Amount'];
    const cells = (l: Line, i: number) => [
        ...(viewing ? [l.voucher_no, dmy(l.date)] : [i + 1]), l.acc_id, l.account,
        ...(assets ? [l.chq_no, l.bank, dmy(l.chq_date)] : []), M.detail, fmt(l.amount),
    ];

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1200} height={640} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( {M.window} ){viewing ? '  —  viewing' : ''}</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                    <fieldset className="shrink-0 rounded-md border border-[#9da1d8] bg-[#d9d9fb] px-4 pb-3 pt-0">
                        <legend className="px-1 text-[20px] font-semibold text-[#1f2bd6]">{M.title}</legend>
                        <div className="grid grid-cols-[110px_160px_minmax(0,1fr)] items-center gap-2">
                            <button type="button" onClick={() => setFinder('')} disabled={viewing} className={findBtn}>{assets ? 'Find Account' : 'Find'}</button>
                            <input ref={codeRef} value={code} disabled={viewing} onChange={(e) => { setCode(e.target.value); if (acc) setAcc(null); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve(); } }} placeholder="Account" className={IN} />
                            <div className={RO}>{acc?.name || ''}</div>
                        </div>
                        <div className={`mt-2 grid items-end gap-x-2 gap-y-1 ${assets ? 'grid-cols-[150px_minmax(0,1fr)_170px_260px_170px]' : 'grid-cols-[minmax(0,1fr)_260px_170px]'}`}>
                            {assets && <><span className={lbl}>Chq No</span><span className={lbl}>Bank</span>
                                <label className={`${lbl} flex items-center gap-1.5`}><input type="checkbox" checked={chqOn} disabled={viewing} onChange={(e) => setChqOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Date cheque</label></>}
                            {!assets && <span />}
                            <span className={lbl}>Detail</span><span className={lbl}>Amount</span>
                            {assets && <>
                                <input value={chqNo} disabled={viewing} onChange={(e) => setChqNo(e.target.value)} maxLength={40} className={`${IN} !bg-white`} />
                                <input value={bank} disabled={viewing} onChange={(e) => setBank(e.target.value)} maxLength={80} className={`${IN} !bg-white`} />
                                <input type="date" value={chqDate} disabled={viewing || !chqOn} onChange={(e) => e.target.value && setChqDate(e.target.value)}
                                    className={chqOn ? `${IN} !bg-white` : RO} />
                            </>}
                            {!assets && <span />}
                            <div className={DETAIL}>{M.detail}</div>
                            <input ref={amtRef} value={amount} disabled={viewing} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
                            {/* The other side of each line: Capital. */}
                            {assets ? <><div className={RO}>{capital?.acc_id || CAPITAL}</div><div className={`${RO} col-span-2`}>{capital?.name || 'Capital'}</div></>
                                : <div className={RO}>{capital ? `${capital.acc_id}  ${capital.name}` : `${CAPITAL}  Capital`}</div>}
                            <div className={DETAIL}>{M.detail}</div>
                            <div className={`${RO} justify-end`}>{num(amount) > 0 ? fmt(num(amount)) : ''}</div>
                        </div>
                        <div className="mt-2 grid grid-cols-[auto_160px_auto_240px_auto_190px_minmax(0,1fr)_110px_110px] items-center gap-2">
                            <label className={`${lbl} flex items-center gap-1.5`}><input type="checkbox" checked={dateOn} disabled={viewing} onChange={(e) => setDateOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Date Voucher</label>
                            <input type="date" value={date} max={today()} disabled={viewing || !dateOn} onChange={(e) => e.target.value && setDate(e.target.value)} className={dateOn ? IN : RO} />
                            <span className={lbl}>Staff</span>
                            <select value={staffId} disabled={viewing} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-8 !text-[13px] !font-normal`}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                            <span className={lbl}>Voucher No</span>
                            <div className={`${FIELD} flex h-8 items-center justify-center border-slate-300 bg-[#e1e1e8] font-mono !text-[15px] !font-bold text-[#1f2bd6]`}>{viewing ? '' : voucherNo}</div>
                            <span />
                            <button type="button" onClick={addLine} disabled={viewing || !acc} className={`${ACTION_BTN} !h-8 !min-w-0 !text-[13px]`}><span className="underline">A</span>dd</button>
                            <button type="button" onClick={removeLine} disabled={viewing || sel < 0} className={`${ACTION_BTN} !h-8 !min-w-0 !text-[13px]`}><span className="underline">R</span>emove</button>
                        </div>
                    </fieldset>

                    <div tabIndex={0} onKeyDown={gridKeys} className="relative min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                        <table className="w-full table-fixed border-collapse bg-white text-[12.5px]">
                            <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{heads.map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? (viewing ? 'bg-[#7dfa7d]' : 'bg-[#2f5bd3] text-white') : 'hover:bg-indigo-50'}`}>
                                        {cells(l, i).map((v, k, arr) => (
                                            <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === arr.length - 1 ? 'text-right' : ''}`}>{v}</td>
                                        ))}
                                    </tr>
                                ))}
                                {!lines.length && <tr><td colSpan={heads.length} className="px-3 py-4 text-center text-slate-400">{viewing ? 'Nothing found.' : 'Find the account, enter the Amount, press Add.'}</td></tr>}
                            </tbody>
                        </table>

                        {filter && (
                            <div className="absolute inset-0 flex items-start justify-center bg-slate-900/20 pt-8"
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); runView(); } }}>
                                <fieldset className="w-[600px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                                    <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">{M.viewTitle}</legend>
                                    <div className="grid grid-cols-[150px_24px_minmax(0,1fr)_130px] items-center gap-x-3 gap-y-2.5">
                                        <span className="text-[13px] text-[#1b1f4b]">Voucher No</span><span />
                                        <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} />
                                        <span className="row-span-3 flex items-center">
                                            <button type="button" onClick={runView} className={`${ACTION_BTN} !h-12 w-full !min-w-0 !text-[15px]`}><span className="underline">O</span>K</button>
                                        </span>
                                        <span className="text-[13px] text-[#1b1f4b]">From Date Voucher</span>
                                        <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)} className={vFromOn ? IN : RO} />
                                        <span className="text-[13px] text-[#1b1f4b]">To Date Voucher</span>
                                        <input type="checkbox" checked={vToOn} onChange={(e) => setVToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vTo} disabled={!vToOn} onChange={(e) => e.target.value && setVTo(e.target.value)} className={vToOn ? IN : RO} />
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <button type="button" onClick={() => setFilter(false)} className="text-[12px] text-slate-600 underline">Back</button>
                                    </div>
                                </fieldset>
                            </div>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <ReadBox value={lines.length ? <span className="text-[#1f2bd6]">Total = {fmt(total)}</span> : ''} className="h-8 w-[240px] !text-[13px] !font-semibold" />
                        <span className="flex-1" />
                        {viewing ? (
                            <button type="button" onClick={addNew} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                        ) : (
                            <button type="button" onClick={save} disabled={saving || !lines.length} className={ACTION_BTN}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                            </button>
                        )}
                        <button type="button" onClick={() => setFilter(true)} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>

            {finder !== null && (
                <FindAccountWindow accounts={allowed} cashOnly={false} initial={finder} askClose={askClose}
                    onPick={pick} onClose={() => setFinder(null)} onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
