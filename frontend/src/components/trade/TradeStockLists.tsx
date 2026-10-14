"use client";

/*
 * Trade 1.0 — the two lists that used to sit on the dashboard, now each its own
 * window (dashboard buttons "Expiry List" and "Stock Minimum List"):
 *   Expiry List on / Before   every in-stock batch expiring on or before the date
 *   Stock Minimum Range List  products at or below their minimum stock
 */
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Boxes } from 'lucide-react';
import { productService } from '@/lib/api';
import { ACTION_BTN, EDIT, LABEL, guardWindowClose, closeTradeWindow, ConfirmBox } from '@/components/trade/TradeSaleInvoice';

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtDmy = (d: Date) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function parseExpiry(v: any): Date | null {
    if (!v) return null;
    const s = String(v).trim();
    const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

const TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-slate-100 px-2.5 py-1.5 text-left font-bold text-slate-700';
const TD = 'truncate whitespace-nowrap border-b border-r border-[#e6e2c4] px-2.5 py-[5px]';

let cache: Promise<{ expiry: any[]; low_stock: any[] }> | null = null;
const loadLists = () => (cache ||= productService.getDashboardLists().then((d: any) => ({ expiry: d.expiry || [], low_stock: d.low_stock || [] })));

function Shell({ title, icon, head, children, foot }: { title: string; icon: React.ReactNode; head: string; children: React.ReactNode; foot: React.ReactNode }) {
    const [ask, setAsk] = useState(false);
    useEffect(() => { document.title = `AL-QAVI TRADERS  Trade 1.0  ( ${title} )`; }, [title]);
    useEffect(() => guardWindowClose(), []);
    return (
        <div className="flex h-screen flex-col bg-[#dcdcf7] font-sans text-slate-900">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( {title} )</span>
            </div>
            <section className="m-3 flex min-h-0 flex-1 flex-col overflow-hidden border border-[#c9cdf0] bg-white">
                <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-1.5 ${head}`}>{icon}</div>
                <div className="min-h-0 flex-1 overflow-auto">{children}</div>
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-bold text-[#2B2F8F]">
                    {foot}
                    <button type="button" onClick={() => setAsk(true)} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                </div>
            </section>
            {ask && <ConfirmBox msg="Do you want to Close the Form ?" onNo={() => setAsk(false)} onYes={() => { setAsk(false); closeTradeWindow(); }} />}
        </div>
    );
}

export function TradeExpiryList() {
    const [lists, setLists] = useState<{ expiry: any[] } | null>(null);
    useEffect(() => { loadLists().then(setLists).catch(() => setLists({ expiry: [] })); }, []);
    const [before, setBefore] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return iso(d); });
    const rows = useMemo(() => {
        const b = new Date(before); b.setHours(23, 59, 59, 999);
        return (lists?.expiry || []).map((it: any) => ({ it, exp: parseExpiry(it.exp) })).filter((r) => r.exp && r.exp.getTime() <= b.getTime());
    }, [lists, before]);
    return (
        <Shell title="Expiry List" head="bg-[#2B2F8F]"
            icon={<>
                <h3 className="flex items-center gap-2 text-[15px] font-black text-white"><CalendarClock size={17} /> Expiry List on / Before</h3>
                <label className="flex items-center gap-2"><span className={`${LABEL} text-[14px] !text-white`}>On / Before</span>
                    <input type="date" value={before} onChange={(e) => e.target.value && setBefore(e.target.value)} className={`${EDIT} w-[170px]`} /></label>
            </>}
            foot={<span>Total Records = {rows.length}</span>}>
            <table className="w-full table-fixed border-collapse text-[13px] leading-tight">
                <colgroup><col style={{ width: '9%' }} /><col /><col style={{ width: '9%' }} /><col style={{ width: '13%' }} /><col style={{ width: '20%' }} /></colgroup>
                <thead><tr>{['P ID', 'Product Name', 'Qty(U)', 'Exp Date', 'Company'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                <tbody>
                    {!lists ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                        : !rows.length ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No items expiring on or before this date.</td></tr>
                            : rows.map(({ it, exp }, i) => {
                                const expired = exp!.getTime() < Date.now();
                                return (
                                    <tr key={i} className="bg-[#fffde8] hover:bg-[#fff6c2]">
                                        <td className={`${TD} tabular-nums`}>{it.pid}</td>
                                        <td className={TD} title={it.name}>{it.name}</td>
                                        <td className={`${TD} tabular-nums`}>{it.qty}</td>
                                        <td className={`${TD} tabular-nums ${expired ? 'font-semibold text-rose-600' : ''}`} title={expired ? 'Already expired' : undefined}>{fmtDmy(exp!)}</td>
                                        <td className={TD} title={it.company || ''}>{it.company || '—'}</td>
                                    </tr>
                                );
                            })}
                </tbody>
            </table>
        </Shell>
    );
}

export function TradeStockMinimum() {
    const [rows, setRows] = useState<any[] | null>(null);
    useEffect(() => { loadLists().then((d) => setRows(d.low_stock)).catch(() => setRows([])); }, []);
    return (
        <Shell title="Stock Minimum Range List" head="bg-[#14935C]"
            icon={<h3 className="flex items-center gap-2 py-1 text-[15px] font-black text-white"><Boxes size={17} /> Stock Minimum Range List</h3>}
            foot={<span>Total Records = {rows?.length || 0}</span>}>
            <table className="w-full table-fixed border-collapse text-[13px] leading-tight">
                <colgroup><col style={{ width: '9%' }} /><col /><col style={{ width: '22%' }} /><col style={{ width: '10%' }} /><col style={{ width: '9%' }} /></colgroup>
                <thead><tr>{['P ID', 'Product Name', 'Company', 'Min Limit', 'Stock'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                <tbody>
                    {!rows ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                        : !rows.length ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">All stock above minimum.</td></tr>
                            : rows.map((it: any, i: number) => (
                                <tr key={i} className="bg-[#fffde8] hover:bg-[#fff6c2]">
                                    <td className={`${TD} tabular-nums`}>{it.pid}</td>
                                    <td className={TD} title={it.name}>{it.name}</td>
                                    <td className={TD} title={it.company || ''}>{it.company || '—'}</td>
                                    <td className={`${TD} tabular-nums`}>{it.min}</td>
                                    <td className={`${TD} tabular-nums ${it.qty <= 0 ? 'font-semibold text-rose-600' : ''}`}>{it.qty}</td>
                                </tr>
                            ))}
                </tbody>
            </table>
        </Shell>
    );
}
