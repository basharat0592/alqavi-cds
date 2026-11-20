"use client";

/*
 * Trade 1.0 — Reports (Reports › Data Reports, and the dashboard report buttons).
 *
 * Report Type picks the group (401 Stock, 402 Stock Adjustments, 403 Purchase
 * Order / Purchase / Purchase Return, 404 Sale / Sale Return, 405 Sale
 * Statements, 406 Accounting); the right side lists that group's reports as
 * radio buttons. The left side follows the report chosen: only the boxes it
 * uses are open (Date from / to, Staff, Cheque Status, Financial Year, Select
 * all Areas), and the Find row turns into what it needs — Invoice No /
 * Voucher No (typed), or Company / Supplier / Product / Customer / Account
 * (Find opens the finder). Preview opens the report page-wise, with PDF / Export.
 * ?cat=401&report=<key> opens with that group / report chosen.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { openPopup } from '@/lib/popup';
import {
    FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow, downloadXlsx, ConfirmBox, FindCompanyWindow, ReturnFindProductWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';
import PagedReport, { type PSection } from '@/components/trade/PagedReport';

import { sortByMatch } from '@/lib/searchRank';
type Rep = { key: string; label: string; filters: string[] };
type Cat = { code: string; label: string; reports: (Rep | null)[] };
// t: g group heading, s subtotal, p cheque pending (red, not in the balance)
type Row = { c: any[]; t: null | 'g' | 's' | 'p' };
type Result = { title: string; subtitle: string; columns: { h: string; a: 'l' | 'r' }[]; rows: Row[]; total: any[] | null };
type Pick = { id: string; code: string; name: string } | null;

const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const show = (v: any) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v ?? '');
const IN = `${EDIT} h-9 w-full !text-[15px] !font-normal`;
const OFF = `${FIELD} h-9 w-full border-slate-300 bg-[#ececf3] !text-[15px] !font-normal text-slate-400`;
const FIND_LABEL: Record<string, string> = {
    invoice: 'Invice No', voucher: 'Voucher No', company: 'Company', supplier: 'Supplier', product: 'Product', customer: 'Customer', account: 'Account',
};

export default function TradeReports() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Reports )'; }, []);
    const [cats, setCats] = useState<Cat[] | null>(null);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [years, setYears] = useState<{ id: number; title: string; status: string }[]>([]);
    const [areas, setAreas] = useState<{ id: number; name: string; main_name: string; district_name: string }[]>([]);
    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [companies, setCompanies] = useState<any[]>([]);
    const [catCode, setCatCode] = useState('');
    const [type, setType] = useState('');
    useEffect(() => {
        api.get('v1/sales/trade-reports/catalog/').then(({ data }) => {
            setCats(data);
            const q = new URLSearchParams(window.location.search);
            const c = data.find((x: Cat) => x.code === q.get('cat')) || null;
            if (c) {
                setCatCode(c.code);
                const want = c.reports.find((r: Rep | null) => r && r.key === q.get('report')) || c.reports.find(Boolean);
                if (want) setType(want.key);
            }
        }).catch(() => setCats([]));
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => {});
        api.get('v1/sales/trade-financial-years/').then(({ data }) => setYears(data)).catch(() => {});
        api.get('v1/sales/trade-areas/', { params: { level: 'sub' } }).then(({ data }) => setAreas(data)).catch(() => {});
        api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
        loadCompanies();
    }, []);
    const loadCompanies = async () => {
        const all: any[] = [];
        try {
            for (let page = 1; page <= 20; page++) {
                const { data } = await api.get('v1/company/companies/', { params: { page, page_size: 100 } });
                if (Array.isArray(data)) { all.push(...data); break; }
                all.push(...(data.results || []));
                if (!data.next) break;
            }
        } catch { /* optional */ }
        setCompanies(all);
    };
    const cat = cats?.find((c) => c.code === catCode) || null;
    const rep = (cat?.reports.find((r) => r && r.key === type) as Rep | undefined) || null;
    const uses = (f: string) => !!rep?.filters.includes(f) || (f === 'staff' && !!rep?.filters.includes('staff!'));
    // find:x = must be found first; find?:x = optional (none = all, e.g. all companies).
    const findF = rep?.filters.find((f) => f.startsWith('find:') || f.startsWith('find?:')) || '';
    const find = findF.replace(/^find\??:/, '');
    const findOptional = findF.startsWith('find?:');
    const pickCat = (code: string) => {
        setCatCode(code);
        const c = cats?.find((x) => x.code === code);
        setType((c?.reports.find(Boolean) as Rep | undefined)?.key || '');
    };

    const [fromOn, setFromOn] = useState(true); const [from, setFrom] = useState(yearStart);
    const [toOn, setToOn] = useState(true); const [to, setTo] = useState(today);
    const [staffId, setStaffId] = useState('');
    const [cheque, setCheque] = useState('');
    const [fy, setFy] = useState('');
    const [typed, setTyped] = useState('');
    const [picks, setPicks] = useState<Record<string, Pick>>({});
    const [finder, setFinder] = useState<string | null>(null);
    const [allAreas, setAllAreas] = useState(true);
    const [picked, setPicked] = useState<Set<number>>(new Set());
    const [areaQ, setAreaQ] = useState('');
    const areaList = sortByMatch(areas.filter((a) => !areaQ.trim() || `${a.name} ${a.main_name} ${a.district_name}`.toLowerCase().includes(areaQ.trim().toLowerCase())),
        areaQ, (a) => [a.name, a.main_name, a.district_name]);
    const setPick = (k: string, p: Pick) => { setPicks((s) => ({ ...s, [k]: p })); setFinder(null); };
    const accGroup = (g: number | null) => (accounts || []).filter((a) => g === null || a.group === g);

    const [res, setRes] = useState<Result | null>(null);
    const [busy, setBusy] = useState(false);
    const preview = async () => {
        if (!rep || busy) return;
        const params: any = { type };
        if (uses('dates') && fromOn) params.date_from = from;
        if (uses('dates') && toOn) params.date_to = to;
        if (uses('staff') && staffId) params.staff = staffId;
        if (rep.filters.includes('staff!') && !staffId) { toast.error('Choose the Staff (saleman).'); return; }
        if (uses('cheque') && cheque) params.cheque_status = cheque;
        if (uses('fy') && fy) params.financial_year = fy;
        if (find === 'invoice' || find === 'voucher') {
            if (!typed.trim()) { toast.error(`Enter the ${FIND_LABEL[find]}.`); return; }
            params.invoice = typed.trim();
        } else if (find) {
            const p = picks[find];
            if (!p && !findOptional) { toast.error(`Find the ${FIND_LABEL[find].toLowerCase()} first.`); setFinder(find); return; }
            if (p) params[find] = find === 'account' ? p.code : p.id;
        }
        if (uses('areas') && !allAreas) {
            if (!picked.size) { toast.error('Tick the areas, or Select all Areas.'); return; }
            params.areas = Array.from(picked).join(',');
        }
        setBusy(true);
        try { const { data } = await api.get('v1/sales/trade-reports/run/', { params, timeout: 180000 }); setRes(data); setRunNo((x) => x + 1); }
        catch (e: any) { toast.error(e?.response?.data?.detail || 'Could not make the report.'); }
        finally { setBusy(false); }
    };

    // The report, page-wise: half A4 pages, one at a time (Print / PDF give the same pages).
    const [runNo, setRunNo] = useState(0);
    const sections = useMemo<PSection[]>(() => (res ? [{
        columns: res.columns.map((c) => ({ h: c.h, a: c.a })),
        rows: res.rows.map((r) => ({ c: r.t === 'g' ? [r.c[0]] : res.columns.map((_, k) => show(r.c[k])), t: r.t })),
        total: res.total ? res.columns.map((_, k) => show(res.total![k])) : null,
        empty: 'Nothing for this selection.',
    }] : []), [res]);
    const exportXlsx = () => {
        if (!res) return;
        const rows = res.rows.map((r) => (r.t === 'g' ? [r.c[0]] : r.c.map((v) => v ?? '')));
        if (res.total) rows.push(res.total);
        downloadXlsx(res.title.replace(/[^\w]+/g, '-').toLowerCase(), res.title.slice(0, 31), res.columns.map((c) => c.h || ' '), rows);
    };

    const lbl = (on: boolean) => `whitespace-nowrap text-[16px] ${on ? 'text-[#1b1f4b]' : 'text-slate-400'}`;
    const sel = (on: boolean) => (on ? `${COA_SELECT} h-9 !text-[15px] !font-normal` : OFF);
    const findOn = !!find;
    const typedFind = find === 'invoice' || find === 'voucher';
    const cur = find && !typedFind ? picks[find] : null;

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1460} height={790} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Reports )</span>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[700px_minmax(0,1fr)] gap-3 p-3">
                    {/* Left: the boxes the chosen report uses */}
                    <div className="flex min-h-0 flex-col gap-3 border border-[#9da1d8] p-4">
                        <div className="grid shrink-0 grid-cols-[150px_32px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                            <span className="text-[17px] text-[#1b1f4b]">Report Type</span><span />
                            <select value={catCode} onChange={(e) => { pickCat(e.target.value); setRes(null); }} className={`${COA_SELECT} h-10 !text-[16px] !font-normal`}>
                                <option value="">{cats ? 'Select any one' : 'Loading…'}</option>
                                {(cats || []).map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                            <span className={lbl(uses('dates'))}>From Date</span>
                            <input type="checkbox" checked={fromOn} disabled={!uses('dates')} onChange={(e) => setFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={from} disabled={!uses('dates') || !fromOn} onChange={(e) => e.target.value && setFrom(e.target.value)} className={uses('dates') && fromOn ? IN : OFF} />
                            <span className={lbl(uses('dates'))}>To Date</span>
                            <input type="checkbox" checked={toOn} disabled={!uses('dates')} onChange={(e) => setToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={to} disabled={!uses('dates') || !toOn} onChange={(e) => e.target.value && setTo(e.target.value)} className={uses('dates') && toOn ? IN : OFF} />
                            <span className={lbl(uses('staff'))}>Staff</span><span />
                            <select value={staffId} disabled={!uses('staff')} onChange={(e) => setStaffId(e.target.value)} className={sel(uses('staff'))}>
                                <option value="">{rep?.filters.includes('staff!') ? 'Select the saleman' : 'All staff'}</option>
                                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <span className={lbl(uses('cheque'))}>Cheque Status</span><span />
                            <select value={cheque} disabled={!uses('cheque')} onChange={(e) => setCheque(e.target.value)} className={sel(uses('cheque'))}>
                                <option value="">All (cash and cheques)</option><option value="cash">Cash only</option>
                                <option value="cheque">Cheques only</option><option value="uncleared">Cheques un-clear</option><option value="cleared">Cheques cleared</option>
                            </select>
                            <span className={lbl(uses('fy'))}>Financial Year</span><span />
                            <select value={fy} disabled={!uses('fy')} onChange={(e) => setFy(e.target.value)} className={sel(uses('fy'))}>
                                <option value="">The year of the To Date</option>
                                {years.map((y) => <option key={y.id} value={y.id}>{y.title}{y.status === 'active' ? ' (Active)' : ''}</option>)}
                            </select>
                            <span className={lbl(findOn)}>{FIND_LABEL[find] || 'Invice No'}</span><span />
                            <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                                <button type="button" disabled={!findOn || typedFind} onClick={() => setFinder(find)}
                                    className="h-9 border border-slate-400 bg-gradient-to-b from-white to-[#e4e4ee] text-[15px] font-semibold text-slate-700 disabled:text-slate-400">Find</button>
                                {typedFind ? (
                                    <input value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') preview(); }}
                                        placeholder={find === 'voucher' ? 'e.g. V26001704' : 'e.g. S26000897'} className={`${IN} !bg-white`} />
                                ) : (
                                    <div className={`${FIELD} flex h-9 items-center px-2 !text-[15px] !font-normal ${findOn ? 'border-slate-300 bg-white' : 'border-slate-300 bg-[#ececf3] text-slate-400'}`}>
                                        <span className="min-w-0 flex-1 truncate">{cur ? `${cur.code}  ${cur.name}` : findOptional ? <span className="text-slate-500">All {FIND_LABEL[find].toLowerCase()}s</span> : ''}</span>
                                        {cur && findOptional && <button type="button" onClick={() => setPicks((x) => ({ ...x, [find]: null }))} title={`Show all ${FIND_LABEL[find].toLowerCase()}s`} className="ml-1 shrink-0 px-1 text-[13px] font-bold text-slate-500 hover:text-red-600">✕ All</button>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid shrink-0 grid-cols-[200px_minmax(0,1fr)] items-center gap-3">
                            <label className={`flex items-center gap-2 text-[16px] font-semibold ${uses('areas') ? 'text-[#1b1f4b]' : 'text-slate-400'}`}>
                                <input type="checkbox" checked={allAreas} disabled={!uses('areas')} onChange={(e) => setAllAreas(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />Select all Areas
                            </label>
                            <div className="flex h-11 items-center gap-2 border border-[#9da1d8] px-2 text-[14px] text-slate-600">
                                <input value={areaQ} disabled={!uses('areas') || allAreas} onChange={(e) => setAreaQ(e.target.value)} placeholder="Search area"
                                    className={`${FIELD} h-8 w-[220px] border-slate-300 bg-white !text-[14px] !font-normal disabled:bg-[#ececf3]`} />
                                {uses('areas') && !allAreas ? `${picked.size} area${picked.size === 1 ? '' : 's'} ticked` : ''}
                                {uses('areas') && !allAreas && picked.size > 0 && <button type="button" onClick={() => setPicked(new Set())} className="underline">clear</button>}
                            </div>
                        </div>
                        <div className={`min-h-0 flex-1 overflow-auto border border-slate-400 bg-white ${uses('areas') && !allAreas ? '' : 'pointer-events-none opacity-50'}`}>
                            {areaList.map((a) => (
                                <label key={a.id} className="flex cursor-pointer items-center gap-2.5 border-b border-slate-100 px-2.5 py-[6px] text-[15px] hover:bg-indigo-50">
                                    <input type="checkbox" checked={picked.has(a.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} className="h-4 w-4 shrink-0 accent-[#3b3f8f]" />
                                    <span className="font-semibold">{a.name}</span><span className="truncate text-[14px] text-slate-500">· {a.main_name} · {a.district_name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Right: the group's reports */}
                    <div className="flex min-h-0 flex-col gap-2">
                        <div className="min-h-0 flex-1 overflow-auto border border-[#9da1d8] px-6 py-3">
                            {!cat && <div className="pt-10 text-center text-[16px] text-slate-500">Choose the Report Type.</div>}
                            {cat?.reports.map((r, i) => (r ? (
                                <label key={r.key} className={`flex cursor-pointer items-center gap-3 rounded px-2 py-[4px] text-[18px] ${type === r.key ? 'bg-white/70 font-semibold text-[#1f2bd6]' : 'text-slate-900 hover:bg-white/40'}`}>
                                    <input type="radio" name="report" checked={type === r.key} onChange={() => { setType(r.key); }} className="h-[18px] w-[18px] shrink-0 accent-[#3b3f8f]" />
                                    {r.label}
                                </label>
                            ) : <div key={`gap${i}`} className="h-3" />))}
                        </div>
                        <div className="flex shrink-0 justify-end gap-3">
                            <button type="button" onClick={preview} disabled={!rep || busy} className={ACTION_BTN}>
                                {busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">P</span>review</>}
                            </button>
                            <button type="button" onClick={() => askClose(closeTradeWindow)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>
                    </div>
                </div>
            </FitStage>

            {/* Preview window — page-wise, as in the old program */}
            {res && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-200">
                    <div className="flex shrink-0 items-center gap-2 border-b border-slate-300 bg-white px-4 py-2 shadow-sm">
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[16px] font-bold text-[#1f2bd6]">{res.title}</div>
                            <div className="text-[12.5px] text-slate-600">{res.subtitle} · {res.rows.filter((r) => !r.t).length} rows</div>
                        </div>
                        <button type="button" onClick={() => setRes(null)} className="flex h-8 items-center gap-1 border border-slate-300 px-3 text-[13px] font-semibold"><X size={14} /> Close</button>
                    </div>
                    <PagedReport title={res.title} subtitle={res.subtitle} sections={sections} version={String(runNo)}
                        file={`${res.title}.pdf`} onExport={exportXlsx} />
                </div>
            )}

            {finder === 'company' && (
                <FindCompanyWindow companies={companies} current={picks.company?.id || ''} askClose={askClose} reload={loadCompanies}
                    onPick={(c) => setPick('company', { id: String(c.id), code: String(c.code ?? ''), name: c.name })} onClose={() => setFinder(null)} />
            )}
            {finder === 'product' && (
                <ReturnFindProductWindow companies={companies} askClose={askClose}
                    onPick={(r) => setPick('product', { id: String(r.id), code: r.pid, name: r.name })}
                    onClose={() => setFinder(null)} onAddNew={() => openPopup('/admin/trade/product-detail')} />
            )}
            {(finder === 'supplier' || finder === 'customer' || finder === 'account') && (
                <FindAccountWindow accounts={finder === 'supplier' ? accGroup(2201) : finder === 'customer' ? accGroup(1202) : accounts} cashOnly={false} initial="" askClose={askClose}
                    onPick={(a) => setPick(finder, { id: String(a.id), code: a.acc_id, name: a.name })} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
