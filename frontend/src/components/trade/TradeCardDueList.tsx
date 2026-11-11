"use client";

/*
 * Credit Card Due List — opened from the dashboard's "Card Due" button (as the
 * Expiry List). Every Credit Card Voucher with a due date not paid yet: red from
 * 4 days before the due date, and once late. Mark Paid when the card bill is paid.
 */
import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { ACTION_BTN, EDIT, guardWindowClose, closeTradeWindow, ConfirmBox } from '@/components/trade/TradeSaleInvoice';

type Due = { id: number; voucher_no: string; date: string; credit_date: string | null; bill_date: string | null; due_date: string;
    amount: number; days: number; alert: boolean; account: string; customers: string };

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-bold text-slate-700';
const TD = 'truncate whitespace-nowrap border-b border-r border-slate-200 px-2 py-[5px]';

export default function TradeCardDueList() {
    const [data, setData] = useState<{ alert: number; rows: Due[] } | null>(null);
    const [paid, setPaid] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState(0);
    const [ask, setAsk] = useState(false);
    const load = () => api.get('v1/sales/trade-cards/dues/').then(({ data }) => setData(data)).catch(() => setData({ alert: 0, rows: [] }));
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Credit Card Due List )'; load(); }, []);
    useEffect(() => guardWindowClose(), []);
    const mark = async (r: Due) => {
        setBusy(r.id);
        try {
            await api.post('v1/sales/trade-cards/dues/', { voucher: r.id, paid_on: paid[r.id] || today() });
            toast.success(`${r.voucher_no} marked paid.`);
            await load();
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not save.'); }
        finally { setBusy(0); }
    };
    const rows = data?.rows || [];
    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Credit Card Due List )</span>
            </div>
            <section className="m-3 flex min-h-0 flex-1 flex-col overflow-hidden border border-[#c9cdf0] bg-white">
                <div className="flex shrink-0 items-center gap-2 bg-red-700 px-3 py-1.5">
                    <h3 className="flex items-center gap-2 text-[15px] font-black text-white"><CreditCard size={17} /> Credit Card Due Dates — not paid</h3>
                    {!!data?.alert && <span className="ml-auto animate-pulse rounded bg-white px-2 py-0.5 text-[13px] font-black text-red-700">⚠ {data.alert} due within 4 days or late</span>}
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full table-fixed border-collapse text-[13px] leading-tight">
                        <colgroup>{[9, 17, 15, 8, 8, 8, 10, 9, 16].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                        <thead><tr>{['Voucher', 'Card Account', 'Customers', 'Credit', 'Billing', 'Due', 'Status', 'Amount', ''].map((h, k) =>
                            <th key={k} className={`${TH} ${k === 7 ? '!text-right' : ''}`}>{h}</th>)}</tr></thead>
                        <tbody>
                            {!data ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                                : !rows.length ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">No card due dates — none waiting to be paid.</td></tr>
                                    : rows.map((r) => (
                                        <tr key={r.id} className={`tabular-nums ${r.alert ? (r.days < 0 ? 'bg-[#ffd9d9] font-semibold text-red-700' : 'bg-[#fff0f0] text-red-600') : ''}`}>
                                            <td className={TD}>{r.voucher_no}</td>
                                            <td className={TD} title={r.account}>{r.account}</td>
                                            <td className={TD} title={r.customers}>{r.customers}</td>
                                            <td className={TD}>{dmy(r.credit_date)}</td>
                                            <td className={TD}>{dmy(r.bill_date)}</td>
                                            <td className={`${TD} font-bold`}>{dmy(r.due_date)}</td>
                                            <td className={TD}>{r.days < 0 ? `${-r.days} day${r.days === -1 ? '' : 's'} LATE` : r.days === 0 ? 'Due TODAY' : `in ${r.days} day${r.days === 1 ? '' : 's'}`}</td>
                                            <td className={`${TD} text-right`}>{fmt(num(r.amount))}</td>
                                            <td className="border-b border-slate-200 px-1 py-0.5">
                                                <div className="flex gap-1">
                                                    <input type="date" value={paid[r.id] || today()} max={today()} onChange={(e) => e.target.value && setPaid((p) => ({ ...p, [r.id]: e.target.value }))}
                                                        className={`${EDIT} !h-7 w-[118px] !px-1 !text-[11.5px]`} aria-label="Paid on" />
                                                    <button type="button" disabled={busy === r.id} onClick={() => mark(r)}
                                                        className={`h-7 flex-1 border text-[11.5px] font-bold ${r.alert ? 'border-red-500 bg-red-600 text-white' : 'border-blue-500 bg-[#dfe9ff] text-blue-800'}`}>Paid</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-bold text-[#2B2F8F]">
                    <span>Total Records = {rows.length} · Amount {fmt(rows.reduce((s, r) => s + num(r.amount), 0))}</span>
                    <button type="button" onClick={() => setAsk(true)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                </div>
            </section>
            {ask && <ConfirmBox msg="Do you want to Close the Form ?" onNo={() => setAsk(false)} onYes={() => { setAsk(false); closeTradeWindow(); }} />}
        </div>
    );
}
