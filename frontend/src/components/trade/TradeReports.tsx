"use client";

/*
 * Trade 1.0 — Reports (Reports › Data Reports, and the dashboard report buttons).
 *
 * Left: Report Type, Date from / to (tick to use), Staff, Cheque Status,
 * Financial Year, Invoice No (or Account + Find for the Ledger), Select all
 * Areas and the area list — the boxes a report does not use are greyed.
 * Preview shows the report on the right; Print / PDF give it on A4 pages
 * (landscape for wide reports) with the shop's name, title, period and page
 * numbers; Export saves it as Excel. ?report=<type> opens with that report chosen.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Printer, FileDown, Sheet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import { printSheets } from '@/lib/printWindow';
import { FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow, downloadXlsx, ConfirmBox } from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import { useOwnPrint } from '@/components/trade/WindowPrintButton';
import FitStage from '@/components/trade/FitStage';

type Rep = { key: string; label: string; group: string; filters: string[] };
type Row = { c: any[]; t: null | 'g' | 's' };
type Result = { title: string; subtitle: string; columns: { h: string; a: 'l' | 'r' }[]; rows: Row[]; total: any[] | null };

const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const show = (v: any) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v ?? '');
const IN = `${EDIT} h-9 w-full !text-[14px] !font-normal`;
const OFF = `${FIELD} h-9 w-full border-slate-300 bg-[#ececf3] !text-[14px] !font-normal text-slate-400`;

export default function TradeReports() {
    useOwnPrint();
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Reports )'; }, []);
    const [reports, setReports] = useState<Rep[] | null>(null);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [years, setYears] = useState<{ id: number; title: string; status: string }[]>([]);
    const [areas, setAreas] = useState<{ id: number; name: string; main_name: string; district_name: string }[]>([]);
    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [type, setType] = useState('');
    useEffect(() => {
        api.get('v1/sales/trade-reports/catalog/').then(({ data }) => {
            setReports(data);
            const want = new URLSearchParams(window.location.search).get('report');
            if (want && data.some((r: Rep) => r.key === want)) setType(want);
        }).catch(() => setReports([]));
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => {});
        api.get('v1/sales/trade-financial-years/').then(({ data }) => setYears(data)).catch(() => {});
        api.get('v1/sales/trade-areas/', { params: { level: 'sub' } }).then(({ data }) => setAreas(data)).catch(() => {});
        api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    }, []);
    const rep = reports?.find((r) => r.key === type) || null;
    const uses = (f: string) => !!rep?.filters.includes(f);
    const groups = useMemo(() => {
        const g: Record<string, Rep[]> = {};
        (reports || []).forEach((r) => { (g[r.group] ||= []).push(r); });
        return Object.entries(g);
    }, [reports]);

    const [fromOn, setFromOn] = useState(true); const [from, setFrom] = useState(yearStart);
    const [toOn, setToOn] = useState(true); const [to, setTo] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [cheque, setCheque] = useState('');
    const [fy, setFy] = useState('');
    const [invoice, setInvoice] = useState('');
    const [account, setAccount] = useState<Acc | null>(null);
    const [finder, setFinder] = useState(false);
    const [allAreas, setAllAreas] = useState(true);
    const [picked, setPicked] = useState<Set<number>>(new Set());
    const [areaQ, setAreaQ] = useState('');
    const areaList = areas.filter((a) => !areaQ.trim() || `${a.name} ${a.main_name} ${a.district_name}`.toLowerCase().includes(areaQ.trim().toLowerCase()));
    const ledger = type === 'ledger';

    const [res, setRes] = useState<Result | null>(null);
    const [busy, setBusy] = useState(false);
    const preview = async () => {
        if (!rep || busy) return;
        if (ledger && !account) { toast.error('Find the account first.'); setFinder(true); return; }
        if (type === 'delivery_challan' && !invoice.trim()) { toast.error('Enter the Invoice No.'); return; }
        const params: any = { type };
        if (uses('dates') && fromOn) params.date_from = from;
        if (uses('dates') && toOn) params.date_to = to;
        if (uses('staff') && staffId) params.staff = staffId;
        if (uses('cheque') && cheque) params.cheque_status = cheque;
        if (uses('fy') && fy) params.financial_year = fy;
        if (uses('invoice') && invoice.trim()) params.invoice = invoice.trim();
        if (ledger && account) params.account = account.acc_id;
        if (uses('areas') && !allAreas) {
            if (!picked.size) { toast.error('Tick the areas, or Select all Areas.'); return; }
            params.areas = Array.from(picked).join(',');
        }
        setBusy(true);
        try { const { data } = await api.get('v1/sales/trade-reports/run/', { params, timeout: 180000 }); setRes(data); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not make the report.'); }
        finally { setBusy(false); }
    };

    // Print / PDF: A4 sheets, a header on each and page numbers.
    const wide = (res?.columns.length || 0) > 6;
    const perPage = wide ? 30 : 44;
    const pages = useMemo(() => {
        if (!res) return [] as Row[][];
        const all = [...res.rows];
        const out: Row[][] = [];
        for (let i = 0; i < Math.max(1, all.length); i += perPage) out.push(all.slice(i, i + perPage));
        return out;
    }, [res, perPage]);
    const sheetsRef = useRef<HTMLDivElement>(null);
    const [printing, setPrinting] = useState(false);
    const print = async (save?: string) => {
        if (!res || printing) return;
        setPrinting(true);
        try {
            await new Promise((r) => setTimeout(r, 400));   // let the A4 sheets render
            const sheets = Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>('.rpt-page') || []);
            // Text-only pages: a lighter picture keeps long reports small and quick to print.
            await printSheets(sheets, save, wide ? 'landscape' : 'portrait', 2);
        } catch { toast.error('Could not prepare the print.'); }
        finally { setPrinting(false); }
    };
    const exportXlsx = () => {
        if (!res) return;
        const rows = res.rows.map((r) => (r.t === 'g' ? [r.c[0]] : r.c.map((v) => v ?? '')));
        if (res.total) rows.push(res.total);
        downloadXlsx(res.title.replace(/[^\w]+/g, '-').toLowerCase(), res.title.slice(0, 31), res.columns.map((c) => c.h || ' '), rows);
    };

    const lbl = (on: boolean) => `whitespace-nowrap text-[15px] ${on ? 'text-[#1b1f4b]' : 'text-slate-400'}`;
    const table = (rows: Row[], fs: string, withTotal: boolean) => res && (
        <table className="w-full border-collapse" style={{ fontSize: fs }}>
            <thead>
                <tr>{res.columns.map((c, i) => <th key={i} className={`border border-slate-500 bg-[#ececec] px-1.5 py-1 font-bold ${c.a === 'r' ? 'text-right' : 'text-left'}`}>{c.h}</th>)}</tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (r.t === 'g' ? (
                    <tr key={i}><td colSpan={res.columns.length} className="border border-slate-400 bg-[#f2f2fa] px-1.5 py-[3px] font-bold text-[#1f2bd6]">{r.c[0]}</td></tr>
                ) : (
                    <tr key={i} className={r.t === 's' ? 'bg-[#fafafa] font-bold' : ''}>
                        {res.columns.map((c, k) => (
                            <td key={k} className={`max-w-[60mm] overflow-hidden text-ellipsis whitespace-nowrap border border-slate-300 px-1.5 py-[2px] tabular-nums ${c.a === 'r' ? 'text-right' : ''}`}>{show(r.c[k])}</td>
                        ))}
                    </tr>
                )))}
                {withTotal && res.total && (
                    <tr className="bg-[#e8e8f4] font-bold">
                        {res.columns.map((c, k) => <td key={k} className={`border border-slate-500 px-1.5 py-1 tabular-nums ${c.a === 'r' ? 'text-right' : ''}`}>{show(res.total![k])}</td>)}
                    </tr>
                )}
            </tbody>
        </table>
    );

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1640} height={820} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Reports )</span>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[820px_minmax(0,1fr)] gap-3 p-3">
                    {/* Filters */}
                    <div className="flex min-h-0 flex-col gap-3 border border-[#9da1d8] p-4">
                        <div className="grid shrink-0 grid-cols-[150px_40px_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
                            <span className="text-[16px] text-[#1b1f4b]">Report Type</span><span />
                            <select value={type} onChange={(e) => { setType(e.target.value); setRes(null); }} className={`${COA_SELECT} h-10 !text-[15px] !font-normal`}>
                                <option value="">{reports ? 'Select any one' : 'Loading…'}</option>
                                {groups.map(([g, rs]) => <optgroup key={g} label={g}>{rs.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</optgroup>)}
                            </select>
                            <span className={lbl(uses('dates'))}>Date (From)</span>
                            <input type="checkbox" checked={fromOn} disabled={!uses('dates')} onChange={(e) => setFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={from} disabled={!uses('dates') || !fromOn} onChange={(e) => e.target.value && setFrom(e.target.value)} className={uses('dates') && fromOn ? IN : OFF} />
                            <span className={lbl(uses('dates'))}>Date (To)</span>
                            <input type="checkbox" checked={toOn} disabled={!uses('dates')} onChange={(e) => setToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={to} disabled={!uses('dates') || !toOn} onChange={(e) => e.target.value && setTo(e.target.value)} className={uses('dates') && toOn ? IN : OFF} />
                            <span className={lbl(uses('staff'))}>Staff</span><span />
                            <select value={staffId} disabled={!uses('staff')} onChange={(e) => setStaffId(e.target.value)} className={uses('staff') ? `${COA_SELECT} h-9 !text-[14px] !font-normal` : OFF}>
                                <option value="">All staff</option>
                                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <span className={lbl(uses('cheque'))}>Cheque Status</span><span />
                            <select value={cheque} disabled={!uses('cheque')} onChange={(e) => setCheque(e.target.value)} className={uses('cheque') ? `${COA_SELECT} h-9 !text-[14px] !font-normal` : OFF}>
                                <option value="">All cheques</option><option value="uncleared">Un-clear</option><option value="cleared">Cleared</option>
                            </select>
                            <span className={lbl(uses('fy'))}>Financial Year</span><span />
                            <select value={fy} disabled={!uses('fy')} onChange={(e) => setFy(e.target.value)} className={uses('fy') ? `${COA_SELECT} h-9 !text-[14px] !font-normal` : OFF}>
                                <option value="">The year of the To date</option>
                                {years.map((y) => <option key={y.id} value={y.id}>{y.title}{y.status === 'active' ? ' (Active)' : ''}</option>)}
                            </select>
                            <span className={lbl(uses('invoice') || ledger)}>{ledger ? 'Account' : 'Invice No'}</span><span />
                            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                                <button type="button" disabled={!ledger} onClick={() => setFinder(true)} title={ledger ? 'Find the account' : undefined}
                                    className="h-9 border border-slate-400 bg-gradient-to-b from-white to-[#e4e4ee] text-[14px] font-semibold text-slate-700 disabled:text-slate-400">Find</button>
                                {ledger ? (
                                    <div className={`${FIELD} flex h-9 items-center border-slate-300 bg-white px-2 !text-[14px] !font-normal`}>{account ? `${account.acc_id}  ${account.name}` : ''}</div>
                                ) : (
                                    <input value={invoice} disabled={!uses('invoice')} onChange={(e) => setInvoice(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => { if (e.key === 'Enter') preview(); }} placeholder={uses('invoice') ? 'e.g. S26000897 (empty = list)' : ''}
                                        className={uses('invoice') ? `${IN} !bg-white` : OFF} />
                                )}
                            </div>
                        </div>
                        <div className="grid shrink-0 grid-cols-[240px_minmax(0,1fr)] items-center gap-3">
                            <label className={`flex items-center gap-2 text-[16px] font-semibold ${uses('areas') ? 'text-[#1b1f4b]' : 'text-slate-400'}`}>
                                <input type="checkbox" checked={allAreas} disabled={!uses('areas')} onChange={(e) => setAllAreas(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Select all Areas
                            </label>
                            <div className="flex h-12 items-center gap-2 border border-[#9da1d8] px-2 text-[13px] text-slate-600">
                                <input value={areaQ} disabled={!uses('areas') || allAreas} onChange={(e) => setAreaQ(e.target.value)} placeholder="Search area"
                                    className={`${FIELD} h-8 w-[200px] border-slate-300 bg-white !text-[13px] !font-normal disabled:bg-[#ececf3]`} />
                                {uses('areas') && !allAreas ? `${picked.size} area${picked.size === 1 ? '' : 's'} ticked` : ''}
                                {uses('areas') && !allAreas && picked.size > 0 && <button type="button" onClick={() => setPicked(new Set())} className="underline">clear</button>}
                            </div>
                        </div>
                        <div className={`min-h-0 flex-1 overflow-auto border border-slate-400 bg-white ${uses('areas') && !allAreas ? '' : 'pointer-events-none opacity-50'}`}>
                            {areaList.map((a) => (
                                <label key={a.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-[3px] text-[13px] hover:bg-indigo-50">
                                    <input type="checkbox" checked={picked.has(a.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} className="h-3.5 w-3.5 accent-[#3b3f8f]" />
                                    <span className="font-semibold">{a.name}</span><span className="text-slate-500">· {a.main_name} · {a.district_name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex min-h-0 flex-col gap-2">
                        <div className="flex min-h-0 flex-1 flex-col border border-[#9da1d8] bg-white">
                            {res ? (
                                <>
                                    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[16px] font-bold text-[#1f2bd6]">{res.title}</div>
                                            <div className="text-[12.5px] text-slate-600">{res.subtitle} · {res.rows.filter((r) => !r.t).length} rows</div>
                                        </div>
                                        <button type="button" onClick={() => print()} disabled={printing} className="flex h-8 items-center gap-1.5 bg-emerald-600 px-3 text-[13px] font-bold text-white disabled:opacity-50">
                                            {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Print
                                        </button>
                                        <button type="button" onClick={() => print(`${res.title}.pdf`)} disabled={printing} className="flex h-8 items-center gap-1.5 border border-slate-300 px-3 text-[13px] font-semibold"><FileDown size={14} /> PDF</button>
                                        <button type="button" onClick={exportXlsx} className="flex h-8 items-center gap-1.5 border border-slate-300 px-3 text-[13px] font-semibold"><Sheet size={14} /> Export</button>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-auto p-2">{table(res.rows, '12.5px', true)}</div>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center justify-center text-[14px] text-slate-500">
                                    {busy ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Making the report…</span> : 'Choose the Report Type and press Preview.'}
                                </div>
                            )}
                        </div>
                        <div className="flex shrink-0 justify-end gap-3">
                            <button type="button" onClick={preview} disabled={!rep || busy} className={ACTION_BTN}>
                                {busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">P</span>review</>}
                            </button>
                            <button type="button" onClick={() => setAsk({ msg: 'Do you want to Close the Form ?', yes: closeTradeWindow })} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>
                    </div>
                </div>
            </FitStage>

            {/* A4 sheets for Print / PDF (off screen) */}
            {res && printing && (
                <div ref={sheetsRef} aria-hidden style={{ position: 'fixed', left: -20000, top: 0 }}>
                    {pages.map((rows, pi) => (
                        <div key={pi} className="rpt-page flex flex-col bg-white" style={{ width: wide ? '297mm' : '210mm', height: wide ? '210mm' : '297mm', padding: '9mm', boxSizing: 'border-box', color: '#111' }}>
                            <div className="flex items-end justify-between" style={{ borderBottom: '0.4mm solid #222', paddingBottom: '2mm', marginBottom: '2.5mm' }}>
                                <div>
                                    <div style={{ fontSize: '14pt', fontWeight: 800 }}>AL-QAVI TRADERS</div>
                                    <div style={{ fontSize: '12pt', fontWeight: 700, color: '#1f2bd6' }}>{res.title}</div>
                                    <div style={{ fontSize: '8.5pt', color: '#444' }}>{res.subtitle}</div>
                                </div>
                                <div style={{ fontSize: '8pt', textAlign: 'right', color: '#444' }}>
                                    <div>Page {pi + 1} of {pages.length}</div>
                                    <div>Printed {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{table(rows, '8pt', pi === pages.length - 1)}</div>
                        </div>
                    ))}
                </div>
            )}
            {finder && (
                <FindAccountWindow accounts={accounts} cashOnly={false} initial="" askClose={(fn, msg) => setAsk({ msg: msg || 'Do you want to Close the Form ?', yes: fn })}
                    onPick={(a) => { setAccount(a); setFinder(false); }} onClose={() => setFinder(false)} onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
