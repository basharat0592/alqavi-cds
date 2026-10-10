"use client";

/*
 * Trade 1.0 — Cash Access (cash excess) and Cash Short vouchers.
 *
 * Voucher No (next), the Cash Short / Excess account 58010002, Amount, Date
 * Voucher, Staff. Save: Cash Access = Cash Dr / 58010002 Cr; Cash Short =
 * 58010002 Dr / Cash Cr. View: Voucher No, From / To Date → the vouchers.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { ConfirmBox, ReadBox, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow } from '@/components/trade/TradeSaleInvoice';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

const CFG = {
    access: { win: 'Cash Excess Voucher', legend: 'Cash  Access', acc: 'Cash Access  Account', view: 'View Cash Access Voucher', bg: '#c9c9f9' },
    short: { win: 'Cash Short  Voucher', legend: 'Cash  Short', acc: 'Cash Short Account', view: 'View Cash Short Voucher', bg: '#fcdcbc' },
};

const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
const RO = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-normal text-slate-500`;
const BIG = `${FIELD} flex h-9 w-[220px] items-center justify-center border-slate-400 bg-[#e1e1e8] font-mono !text-[17px] !font-bold text-[#1f2bd6]`;

export default function TradeCashShortExcess({ kind }: { kind: 'access' | 'short' }) {
    const C = CFG[kind];
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = `AL-QAVI TRADERS  Trade 1.0  ( ${C.win} )`; }, [C.win]);

    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);
    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    const [amount, setAmount] = useState('');
    const [dateOn, setDateOn] = useState(false); const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [saving, setSaving] = useState(false);
    const reset = () => { setAmount(''); setDateOn(false); setDate(today()); setStaffId(''); loadNo(); };
    const save = () => {
        if (saving || num(amount) <= 0) return;
        setAsk({
            msg: `Save ${C.legend.replace(/\s+/g, ' ')} voucher ${voucherNo} for ${fmt(num(amount))} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-cash-short-excess/', { kind, amount: num(amount), date: dateOn ? date : today(), staff: staffId || null });
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

    // View … Voucher
    const [filter, setFilter] = useState(false);
    const [rows, setRows] = useState<any[] | null>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        const params: any = { kind };
        if (vNo.trim()) params.voucher_no = vNo.trim();
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false);
        try { const { data } = await api.get('v1/sales/trade-cash-short-excess/', { params }); setRows(data); }
        catch { toast.error('Could not load.'); }
    };

    const closeWindow = () => setAsk({ msg: num(amount) > 0 ? 'The voucher is not saved. Do you want to Close the Form ?' : 'Do you want to Close the Form ?', yes: closeTradeWindow });
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';

    return (
        <div className="h-screen overflow-hidden font-sans text-slate-900" style={{ background: C.bg }}>
            <FitStage width={980} height={rows ? 640 : 380} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( {C.win} )</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <fieldset className="shrink-0 rounded-md border border-[#9da1d8] bg-white/30 px-5 pb-4 pt-0">
                        <legend className="whitespace-pre px-1 text-[20px] font-semibold text-[#1f2bd6]">{C.legend}</legend>
                        <div className="grid grid-cols-[170px_220px_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5">
                            <span className={lbl}>Voucher No</span><div className={BIG}>{voucherNo}</div><span /><span />
                            <span className={lbl}>{C.acc}</span><div className={BIG}>58010002</div><span /><span />
                            <span className={lbl}>Amount</span>
                            <input autoFocus value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} className={`${IN} text-right`} />
                            <label className={`${lbl} flex items-center gap-2`}>Date Voucher
                                <input type="checkbox" checked={dateOn} onChange={(e) => setDateOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /></label>
                            <input type="date" value={date} max={today()} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${dateOn ? IN : RO} max-w-[260px]`} />
                            <span className={lbl}>Staff</span>
                            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} col-span-2 h-8 !text-[13px] !font-normal`}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                        </div>
                    </fieldset>

                    {rows && (
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full table-fixed border-collapse bg-white text-[12.5px]">
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Detail', 'Staff', 'Amount'].map((h) => <th key={h} className="border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.voucher_no} className="tabular-nums hover:bg-indigo-50">
                                            {[r.voucher_no, dmy(r.date), r.detail, r.staff, fmt(num(r.amount))].map((v, k) => (
                                                <td key={k} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 4 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!rows.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">No vouchers for this search.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!rows && <span className="flex-1" />}

                    <div className="flex shrink-0 items-center justify-end gap-3">
                        {rows && <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length} · {fmt(rows.reduce((s, r) => s + num(r.amount), 0))}</span>} className="mr-auto h-8 w-[300px] !text-[12.5px] !font-normal" />}
                        <button type="button" onClick={save} disabled={saving || num(amount) <= 0} className={ACTION_BTN}>
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
                    <fieldset className="w-[600px] border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                        <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">{C.view}</legend>
                        <div className="grid grid-cols-[110px_24px_minmax(0,1fr)_130px] items-center gap-x-3 gap-y-2.5">
                            <span className="text-[13px]">Voucher No</span><span />
                            <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} />
                            <span className="row-span-3 flex items-center">
                                <button type="button" onClick={runView} className={`${ACTION_BTN} !h-12 w-full !min-w-0 !text-[15px]`}><span className="underline">O</span>K</button>
                            </span>
                            <span className="text-[13px]">From Date</span>
                            <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)} className={vFromOn ? IN : RO} />
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
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
