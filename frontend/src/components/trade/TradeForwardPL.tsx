"use client";

/*
 * Trade 1.0 — Forward the Profit and Loss (Post Retain Profit Voucher).
 *
 * Voucher No, Retain Profit Account 32010001 Retain Earning, Detail
 * (Narration), Amount (a loss as a negative amount), Date Voucher, Staff.
 * Save posts the amount to Retain Earning (one line, as the legacy program
 * did). View: Voucher No, From / To Date → the forwarded years.
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

const IN = `${EDIT} h-8 w-full !text-[13px] !font-normal`;
const RO = `${FIELD} flex h-8 w-full items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[13px] !font-normal text-slate-500`;
const BIG = `${FIELD} flex h-9 items-center justify-center border-slate-400 bg-[#e1e1e8] font-mono !text-[17px] !font-bold text-[#1f2bd6]`;

export default function TradeForwardPL() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Post Retain Profit Voucher)'; }, []);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [acc, setAcc] = useState({ acc_id: '32010001', name: 'Retain Earning' });
    const [year, setYear] = useState('');
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
        api.get('v1/sales/trade-forward-pl/account/').then(({ data }) => setAcc(data)).catch(() => {});
        // The narration suggests the year before the Active one (the year being closed).
        api.get('v1/sales/trade-financial-years/').then(({ data }) => {
            const i = (data || []).findIndex((y: any) => y.status === 'active');
            const prev = i > 0 ? data[i - 1] : null;
            if (prev) setYear(prev.title);
        }).catch(() => {});
    }, []);
    const [voucherNo, setVoucherNo] = useState('…');
    const loadNo = () => api.get('v1/sales/vouchers/next_voucher_no/').then(({ data }) => setVoucherNo(data.voucher_no)).catch(() => setVoucherNo('—'));
    useEffect(() => { loadNo(); }, []);

    const [detail, setDetail] = useState('');
    const [amount, setAmount] = useState('');
    const [dateOn, setDateOn] = useState(false); const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [saving, setSaving] = useState(false);
    const amt = num(amount);
    const save = () => {
        if (saving || !amt) return;
        const det = detail.trim() || (year ? `fwd P/L of FY ${year}` : 'fwd P/L');
        setAsk({
            msg: `Forward ${amt < 0 ? 'a loss of' : 'a profit of'} ${fmt(Math.abs(amt))} to ${acc.name} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-forward-pl/', { amount: amt, detail: det, date: dateOn ? date : today(), staff: staffId || null });
                    toast.success(`Voucher ${data.voucher_no} saved — ${fmt(num(data.amount))}.`);
                    setDetail(''); setAmount(''); setDateOn(false); setStaffId(''); loadNo();
                    if (rows) runView();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    const [filter, setFilter] = useState(false);
    const [rows, setRows] = useState<any[] | null>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        const params: any = {};
        if (vNo.trim()) params.voucher_no = vNo.trim();
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false);
        try { const { data } = await api.get('v1/sales/trade-forward-pl/', { params }); setRows(data); } catch { toast.error('Could not load.'); }
    };

    const closeWindow = () => setAsk({ msg: amt ? 'The voucher is not saved. Do you want to Close the Form ?' : 'Do you want to Close the Form ?', yes: closeTradeWindow });
    const lbl = 'whitespace-nowrap text-[14px] text-[#1b1f4b]';

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1100} height={rows ? 640 : 400} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Post Retain Profit Voucher)</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <fieldset className="shrink-0 border border-[#9da1d8] bg-white/30 px-5 pb-4 pt-0">
                        <legend className="px-1 text-[20px] font-semibold text-[#1f2bd6]">Deposit in</legend>
                        <div className="grid grid-cols-[190px_200px_minmax(0,1fr)_auto_200px] items-center gap-x-3 gap-y-2.5">
                            <span className={lbl}>Voucher No</span><div className={BIG}>{voucherNo}</div><span /><span /><span />
                            <span className={lbl}>Retain Profit Account</span><div className={BIG}>{acc.acc_id}</div>
                            <div className={`${FIELD} col-span-3 flex h-9 items-center border-slate-300 bg-[#e1e1e8] px-2 !text-[14px] !font-semibold text-[#1f2bd6]`}>{acc.name}</div>
                            <span className={lbl}>Detail (Narration)</span>
                            <input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={255} placeholder={year ? `fwd P/L of FY ${year}` : 'fwd P/L'} className={`${IN} col-span-2`} />
                            <span className={`${lbl} text-right`}>Amount</span>
                            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.-]/g, '').replace(/(?!^)-/g, ''))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} title="A loss as a negative amount, e.g. -835993"
                                className={`${IN} text-right ${amt < 0 ? '!text-red-600' : ''}`} />
                            <label className={`${lbl} flex items-center gap-2`}>Date Voucher
                                <input type="checkbox" checked={dateOn} onChange={(e) => setDateOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" /></label>
                            <input type="date" value={date} disabled={!dateOn} onChange={(e) => e.target.value && setDate(e.target.value)} className={dateOn ? IN : RO} />
                            <span className={`${lbl} text-right font-semibold`}>Staff</span>
                            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} col-span-2 h-8 !text-[13px] !font-normal`}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                        </div>
                        <div className="mt-2 text-[12px] text-slate-600">Profit: enter the amount. Loss: enter it with a minus sign (e.g. -835993.79).</div>
                    </fieldset>

                    {rows && (
                        <div className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full table-fixed border-collapse bg-white text-[12.5px]">
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Voucher No', 'Date', 'Detail', 'Staff', 'Amount'].map((h) => <th key={h} className="border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.voucher_no} className="tabular-nums hover:bg-indigo-50">
                                            {[r.voucher_no, dmy(r.date), r.detail, r.staff, fmt(num(r.amount))].map((v, k) => (
                                                <td key={k} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 4 ? `text-right ${num(r.amount) < 0 ? 'text-red-600' : ''}` : ''}`}>{v}</td>
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
                        {rows && <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length}</span>} className="mr-auto h-8 w-[220px] !text-[12.5px] !font-normal" />}
                        <button type="button" onClick={save} disabled={saving || !amt} className={ACTION_BTN}>
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
                        <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">View Bank Deposit Voucher</legend>
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
