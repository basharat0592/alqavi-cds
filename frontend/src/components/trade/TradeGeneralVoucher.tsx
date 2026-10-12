"use client";

/*
 * Trade 1.0 — Post General Voucher (Accounts › Post Voucher (Manually)).
 *
 * Find Account (any account; Add New → Chart of Account) → Account Name, Chq
 * No., Bank, Date chq, Detail, Debit or Credit; Add / Remove into the grid
 * (S.No / Voucher No / Date / Sub.Acc.Name / Acc.ID / Acc.Name / Chq No / Chq
 * Date / Bank / Detail / Debit / Credit). Totals of Debit and Credit and the
 * difference; Save only when they are equal. Prev. Bal shows the chosen
 * account's balance. View: Voucher No, Account (Find), From / To Date, Detail.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import { ConfirmBox, ReadBox, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow, downloadXlsx } from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const money = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

type Line = {
    accountId?: number; voucher_no?: string; date?: string; sub_acc: string; acc_id: string; account: string;
    chq_no: string; chq_date: string | null; bank: string; detail: string; debit: number; credit: number;
};
const HEADS = ['S.No', 'Voucher No', 'Date', 'Sub.Acc.Name', 'Acc.ID', 'Acc.Name', 'Chq No', 'Chq Date', 'Bank', 'Detail', 'Debit', 'Credit'];
const COLS = [4, 9, 8, 11, 8, 14, 7, 8, 7, 12, 8, 8];
const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
const RO = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-normal text-slate-700`;

export default function TradeGeneralVoucher() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Post  General Voucher)'; }, []);

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
    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    // entry
    const [code, setCode] = useState('');
    const [acc, setAcc] = useState<Acc | null>(null);
    const [prevBal, setPrevBal] = useState<number | null>(null);
    const [chqNo, setChqNo] = useState(''); const [bank, setBank] = useState('');
    const [chqOn, setChqOn] = useState(false); const [chqDate, setChqDate] = useState(today);
    const [detail, setDetail] = useState('');
    const [debit, setDebit] = useState(''); const [credit, setCredit] = useState('');
    const [dateOn, setDateOn] = useState(false); const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [finder, setFinder] = useState<null | { target: 'form' | 'view'; q: string }>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const detailRef = useRef<HTMLInputElement>(null);
    const [vAcc, setVAcc] = useState<Acc | null>(null);

    const pick = async (a: Acc, target: 'form' | 'view') => {
        setFinder(null);
        if (target === 'view') { setVAcc(a); return; }
        setAcc(a); setCode(a.acc_id); setPrevBal(null);
        setTimeout(() => detailRef.current?.focus(), 0);
        try { const { data } = await api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }); setPrevBal(num(data.balance)); } catch { setPrevBal(null); }
    };
    const resolve = () => {
        const c = code.trim();
        const hit = c ? (accounts || []).find((a) => a.acc_id === c) : null;
        if (hit) pick(hit, 'form'); else setFinder({ target: 'form', q: /^\d+$/.test(c) ? '' : c });
    };

    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const [viewing, setViewing] = useState(false);
    const addLine = () => {
        if (viewing) return;
        if (!acc) { toast.error('Find the account first.'); codeRef.current?.focus(); return; }
        const dr = num(debit), cr = num(credit);
        if ((dr > 0) === (cr > 0)) { toast.error('Enter either a Debit or a Credit.'); return; }
        setLines((ls) => [...ls, {
            accountId: acc.id, sub_acc: acc.group_name || '', acc_id: acc.acc_id, account: acc.name, chq_no: chqNo.trim(),
            chq_date: chqOn ? chqDate : null, bank: bank.trim(), detail: detail.trim(), debit: dr, credit: cr,
        }]);
        setAcc(null); setCode(''); setPrevBal(null); setChqNo(''); setBank(''); setChqOn(false); setDebit(''); setCredit(''); setSel(-1);
        // The narration usually carries on to the next line.
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (viewing) return;
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };
    const tdr = lines.reduce((s, l) => s + l.debit, 0), tcr = lines.reduce((s, l) => s + l.credit, 0);
    const diff = Math.round((tdr - tcr) * 100) / 100;
    const balanced = lines.length >= 2 && diff === 0 && tdr > 0;

    const addNew = () => {
        setViewing(false); setLines([]); setSel(-1); setAcc(null); setCode(''); setDetail(''); setDebit(''); setCredit('');
        setDateOn(false); setDate(today()); setStaffId(''); loadNo(); setTimeout(() => codeRef.current?.focus(), 0);
    };
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (!balanced || saving || viewing) return;
        setAsk({
            msg: `Save General Voucher ${voucherNo} (${lines.length} lines, ${fmt(tdr)}) ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-general-vouchers/', {
                        date: dateOn ? date : today(), staff: staffId || null,
                        lines: lines.map((l) => ({ account: l.accountId, debit: l.debit, credit: l.credit, detail: l.detail, chq_no: l.chq_no, bank: l.bank, chq_date: l.chq_date })),
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

    // View Voucher Detail
    const [filter, setFilter] = useState(false);
    const [vNo, setVNo] = useState('');
    const [vDetail, setVDetail] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        const params: any = {};
        if (vNo.trim()) params.voucher_no = vNo.trim();
        if (vAcc) params.account = vAcc.id;
        if (vDetail.trim()) params.detail = vDetail.trim();
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false);
        try {
            const { data } = await api.get('v1/sales/trade-general-vouchers/', { params });
            setViewing(true); setSel(-1); setAcc(null); setCode('');
            setLines(data.map((r: any) => ({ voucher_no: r.voucher_no, date: r.date, sub_acc: r.sub_acc, acc_id: r.acc_id, account: r.account,
                chq_no: r.chq_no, chq_date: r.chq_date, bank: r.bank, detail: r.detail, debit: num(r.debit), credit: num(r.credit) })));
            if (!data.length) toast('Nothing found for this search.');
        } catch { toast.error('Could not load.'); }
    };
    const exportRows = () => downloadXlsx('general-vouchers', 'General Vouchers', HEADS,
        lines.map((l, i) => [i + 1, l.voucher_no || voucherNo, dmy(l.date || (dateOn ? date : today())), l.sub_acc, l.acc_id, l.account, l.chq_no, dmy(l.chq_date), l.bank, l.detail, l.debit || '', l.credit || '']));

    const gridKeys = (e: React.KeyboardEvent) => {
        if (!lines.length) return;
        if (e.key === 'Delete' && !viewing) { e.preventDefault(); removeLine(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        setSel((i) => Math.min(lines.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    };
    const closeWindow = () => askClose(closeTradeWindow, !viewing && lines.length ? 'The voucher is not saved. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';
    const enterAdd = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } };
    const dis = viewing;

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1320} height={700} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Post  General Voucher){viewing ? '  —  viewing' : ''}</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                    <fieldset className="shrink-0 border border-[#9da1d8] bg-white/30 px-4 pb-3 pt-0">
                        <legend className="px-1 text-[20px] font-semibold text-[#1f2bd6]">General Voucher</legend>
                        <div className="grid grid-cols-[100px_190px_minmax(0,1fr)_190px_190px_120px] items-end gap-x-2 gap-y-1">
                            <span /><span /><span className={lbl}>Account Name</span><span className={lbl}>Chq No.</span><span className={lbl}>Bank</span><span />
                            <button type="button" onClick={() => setFinder({ target: 'form', q: '' })} disabled={dis} className="row-span-2 h-[52px] border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] text-[13px] font-semibold leading-tight disabled:opacity-50"><span className="underline">F</span>ind<br />Account</button>
                            <input ref={codeRef} value={code} disabled={dis} onChange={(e) => { setCode(e.target.value); if (acc) { setAcc(null); setPrevBal(null); } }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolve(); } }} placeholder="Account" className={`${IN} !bg-white`} />
                            <div className={RO}>{acc?.name || ''}</div>
                            <input value={chqNo} disabled={dis} onChange={(e) => setChqNo(e.target.value)} maxLength={40} className={IN} />
                            <input value={bank} disabled={dis} onChange={(e) => setBank(e.target.value)} maxLength={80} className={IN} />
                            <span />
                            <label className={`${lbl} flex items-center gap-2`}><input type="checkbox" checked={chqOn} disabled={dis} onChange={(e) => setChqOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Date chq</label>
                            <span className={lbl}>Detail</span><span className={lbl}>Debit</span><span className={lbl}>Credit</span><span />
                            <span />
                            <input type="date" value={chqDate} disabled={dis || !chqOn} onChange={(e) => e.target.value && setChqDate(e.target.value)} className={chqOn ? IN : RO} />
                            <input ref={detailRef} value={detail} disabled={dis} onChange={(e) => setDetail(e.target.value)} onKeyDown={enterAdd} maxLength={255} className={IN} />
                            <input value={debit} disabled={dis} onChange={(e) => { setDebit(money(e.target.value)); if (e.target.value) setCredit(''); }} onKeyDown={enterAdd} className={`${IN} text-right`} />
                            <input value={credit} disabled={dis} onChange={(e) => { setCredit(money(e.target.value)); if (e.target.value) setDebit(''); }} onKeyDown={enterAdd} className={`${IN} text-right`} />
                            <button type="button" onClick={addLine} disabled={dis || !acc} className={`${ACTION_BTN} !h-8 !min-w-0 !text-[13px]`}><span className="underline">A</span>dd</button>
                        </div>
                        <div className="mt-2 grid grid-cols-[100px_190px_auto_240px_auto_220px_minmax(0,1fr)_120px] items-center gap-2">
                            <span />
                            <label className={`${lbl} flex items-center gap-2`}><input type="checkbox" checked={dateOn} disabled={dis} onChange={(e) => setDateOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Date Voucher</label>
                            <input type="date" value={date} max={today()} disabled={dis || !dateOn} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${dateOn ? IN : RO} w-[150px]`} />
                            <select value={staffId} disabled={dis} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-8 !text-[13px] !font-normal`}>
                                <option value="">Select any one (Staff)</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                            <span className={lbl}>Voucher No</span>
                            <div className={`${FIELD} flex h-9 items-center justify-center border-slate-400 bg-[#e1e1e8] font-mono !text-[17px] !font-bold text-[#1f2bd6]`}>{viewing ? '' : voucherNo}</div>
                            <span />
                            <button type="button" onClick={removeLine} disabled={dis || sel < 0} className={`${ACTION_BTN} !h-8 !min-w-0 !text-[13px]`}><span className="underline">R</span>emove</button>
                        </div>
                    </fieldset>

                    <div tabIndex={0} onKeyDown={gridKeys} className="relative min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                        <table className="w-full table-fixed border-collapse bg-white text-[12px]">
                            <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                            <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{HEADS.map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? (viewing ? 'bg-[#7dfa7d]' : 'bg-[#2f5bd3] text-white') : 'hover:bg-indigo-50'}`}>
                                        {[i + 1, l.voucher_no || voucherNo, dmy(l.date || (dateOn ? date : today())), l.sub_acc, l.acc_id, l.account, l.chq_no, dmy(l.chq_date), l.bank, l.detail,
                                            l.debit ? fmt(l.debit) : '', l.credit ? fmt(l.credit) : ''].map((v, k) => (
                                            <td key={k} title={String(v ?? '')} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 0 || k >= 10 ? 'text-right' : ''}`}>{v}</td>
                                        ))}
                                    </tr>
                                ))}
                                {!lines.length && <tr><td colSpan={12} className="px-3 py-4 text-center text-slate-400">{viewing ? 'Nothing found.' : 'Find the account, enter the Detail and a Debit or Credit, press Add.'}</td></tr>}
                            </tbody>
                        </table>

                        {filter && (
                            <div className="absolute inset-0 flex items-start justify-center bg-slate-900/20 pt-6"
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); runView(); } }}>
                                <fieldset className="w-[720px] border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                                    <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">View Voucher Detail</legend>
                                    <div className="grid grid-cols-[150px_24px_minmax(0,1fr)_70px_200px] items-center gap-x-3 gap-y-2.5">
                                        <span className="text-[13px]">Voucher No</span><span />
                                        <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} />
                                        <button type="button" onClick={() => setFinder({ target: 'view', q: '' })} className="h-8 border border-slate-400 bg-white text-[13px] font-semibold"><span className="underline">F</span>ind</button>
                                        <ReadBox value={vAcc ? `${vAcc.acc_id} ${vAcc.name}` : 'Any account'} className="h-8 !text-[12px] !font-normal" />
                                        <span className="text-[13px]">From Date Voucher</span>
                                        <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)} className={vFromOn ? IN : RO} />
                                        <span className="col-span-2 row-span-3 flex items-end justify-end gap-2">
                                            {vAcc && <button type="button" onClick={() => setVAcc(null)} className="text-[12px] text-slate-600 underline">Any account</button>}
                                            <button type="button" onClick={runView} className={`${ACTION_BTN} !h-12 w-[140px] !min-w-0 !text-[15px]`}><span className="underline">O</span>K</button>
                                        </span>
                                        <span className="text-[13px]">To Date Voucher</span>
                                        <input type="checkbox" checked={vToOn} onChange={(e) => setVToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vTo} disabled={!vToOn} onChange={(e) => e.target.value && setVTo(e.target.value)} className={vToOn ? IN : RO} />
                                        <span className="text-[13px]">Detail</span><span />
                                        <input value={vDetail} onChange={(e) => setVDetail(e.target.value)} className={`${IN} !bg-white`} />
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <button type="button" onClick={() => setFilter(false)} className="text-[12px] text-slate-600 underline">Back</button>
                                    </div>
                                </fieldset>
                            </div>
                        )}
                    </div>

                    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_300px_200px_200px] items-center gap-x-3 gap-y-2">
                        <div className="text-[14px] font-bold leading-snug text-[#b3261e]">
                            <div>Assets / Exp&nbsp;&nbsp;&nbsp;( Inc &gt;&gt;&gt; Db&nbsp;&nbsp;and Dcr &gt;&gt;&gt; Cr )</div>
                            <div>Income / Lia&nbsp;&nbsp;&nbsp;( Inc &gt;&gt;&gt; Cr&nbsp;&nbsp;&nbsp;and Dcr &gt;&gt;&gt; Db)</div>
                        </div>
                        <div className={`${RO} justify-center ${diff !== 0 ? '!text-red-600 !font-semibold' : ''}`} title="Debit less Credit">
                            {lines.length ? (diff === 0 ? 'Debit = Credit' : `Difference ${fmt(Math.abs(diff))} (${diff > 0 ? 'more Debit' : 'more Credit'})`) : ''}
                        </div>
                        <div className={`${RO} justify-end !font-semibold`} title="Total Debit">{tdr ? fmt(tdr) : ''}</div>
                        <div className={`${RO} justify-end !font-semibold`} title="Total Credit">{tcr ? fmt(tcr) : ''}</div>
                        <div className="flex items-center gap-3">
                            <ReadBox value={lines.length ? <span className="text-[#1f2bd6]">Total Records = {lines.length}</span> : ''} className="h-8 w-[220px] !text-[12.5px] !font-normal" />
                            <span className="text-[18px] font-bold text-[#1b1f4b]">Prev. Bal.</span>
                            <div className={`${FIELD} flex h-8 w-[200px] items-center justify-end border-cyan-300 bg-[#c9f7fb] px-2 !text-[13px] !font-semibold tabular-nums`}>{prevBal === null ? '' : fmt(prevBal)}</div>
                            <button type="button" onClick={exportRows} disabled={!lines.length} className={`${ACTION_BTN} !h-8 !text-[13px]`}>Export</button>
                        </div>
                        <span />
                        <div className="col-span-2 flex justify-end gap-2">
                            {viewing ? (
                                <button type="button" onClick={addNew} className={`${ACTION_BTN} !h-9`}><span>Add <span className="underline">N</span>ew</span></button>
                            ) : (
                                <button type="button" onClick={save} disabled={saving || !balanced} title={lines.length && !balanced ? 'Debit and Credit must be equal' : undefined} className={`${ACTION_BTN} !h-9`}>
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                                </button>
                            )}
                            <button type="button" onClick={() => setFilter(true)} className={`${ACTION_BTN} !h-9`}><span className="underline">V</span>iew</button>
                            <button type="button" onClick={closeWindow} className={`${ACTION_BTN} !h-9`}><span className="underline">C</span>ancel</button>
                        </div>
                    </div>
                </div>
            </FitStage>

            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={false} initial={finder.q} askClose={askClose}
                    onPick={(a) => pick(a, finder.target)} onClose={() => setFinder(null)} onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
