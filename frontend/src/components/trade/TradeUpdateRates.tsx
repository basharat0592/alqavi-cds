"use client";

/*
 * Trade 1.0 — Update Rates and Expiry Date.
 *
 * View opens "View to Stock Rates and Expiry Date" (Company, Quantity, Product
 * Type, Product Name, Find Product ID, Expiry Apply / Expiry date, Expired
 * after / before, Purchase Rate) → one grid row per stock batch: P ID /
 * Prod.Type / Product Name / Carton / Expiry Date / Qty / Pur.Rate / Sale Rate /
 * Retail Rate / Company / Status. Click selects a row, Enter or double-click
 * brings it into the form; edit Expiry Date and the green rates, choose the
 * Staff, Enter on Retail Rate → Update. Export saves the grid as a CSV file.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { pn, tip } from '@/lib/productName';
import { openPopup } from '@/lib/popup';
import {
    ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, closeTradeWindow, ReturnFindProductWindow,
} from '@/components/trade/TradeSaleInvoice';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const rate = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

type Row = {
    batch_id: string; product_id: string; pid: string; category: string; name: string; pack: number; carton: number;
    expiry_apply: boolean; expiry_date: string | null; qty: number; pur_rate: any; sale_rate: any; retail_rate: any;
    company: string; status: string;
};

const RO = `${FIELD} flex h-7 w-full items-center border-slate-300 bg-[#ececf3] px-2 !text-[12px] !font-normal text-slate-800`;
const IN = `${EDIT} h-7 w-full !text-[12px] !font-normal`;
const SEL = `${EDIT} h-7 w-full !px-1.5 !text-[12px] !font-normal`;
const OFF = `${FIELD} h-7 w-full border-slate-300 bg-[#ececf3] !px-1.5 !text-[12px] !font-normal text-slate-400`;

export default function TradeUpdateRates() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Update Stock Expiry and Rates )'; }, []);

    const [companies, setCompanies] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        const all = async (url: string) => {
            const out: any[] = [];
            try {
                for (let page = 1; page <= 20; page++) {
                    const { data } = await api.get(url, { params: { page, page_size: 100 } });
                    if (Array.isArray(data)) { out.push(...data); break; }
                    out.push(...(data.results || []));
                    if (!data.next) break;
                }
            } catch { /* optional */ }
            return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        };
        all('v1/company/companies/').then(setCompanies);
        all('v1/products/categories/').then(setCategories);
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);

    // form
    const [cur, setCur] = useState<Row | null>(null);
    const [date, setDate] = useState(today);
    const [expiry, setExpiry] = useState(today);
    const [pur, setPur] = useState(''); const [sale, setSale] = useState(''); const [retail, setRetail] = useState('');
    const [staffId, setStaffId] = useState('');
    const purRef = useRef<HTMLInputElement>(null);
    const saleRef = useRef<HTMLInputElement>(null);
    const retailRef = useRef<HTMLInputElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const pick = (r: Row) => {
        setCur(r); setExpiry(r.expiry_date ? String(r.expiry_date).slice(0, 10) : today());
        setPur(String(num(r.pur_rate))); setSale(String(num(r.sale_rate))); setRetail(String(num(r.retail_rate)));
        setTimeout(() => { purRef.current?.focus(); purRef.current?.select(); }, 0);
    };
    const clearForm = () => { setCur(null); setPur(''); setSale(''); setRetail(''); setExpiry(today()); };

    // grid
    const [rows, setRows] = useState<Row[] | null>(null);
    const [sel, setSel] = useState(-1);
    const [loading, setLoading] = useState(false);
    const gridKeys = (ev: React.KeyboardEvent) => {
        if (!rows?.length) return;
        if (ev.key === 'Enter') { ev.preventDefault(); pick(rows[sel < 0 ? 0 : sel]); if (sel < 0) setSel(0); return; }
        if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
        ev.preventDefault();
        setSel((i) => Math.min(rows.length - 1, Math.max(0, i + (ev.key === 'ArrowDown' ? 1 : -1))));
    };
    useEffect(() => {
        if (sel >= 0) gridRef.current?.querySelector(`[data-row="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [sel]);

    // View to Stock Rates and Expiry Date
    const [filterOpen, setFilterOpen] = useState(false);
    const [fCompany, setFCompany] = useState('');
    const [fQty, setFQty] = useState('');
    const [fType, setFType] = useState('');
    const [fName, setFName] = useState('');
    const [fPid, setFPid] = useState('');
    const [fApply, setFApply] = useState('');
    const [fExp, setFExp] = useState('');
    const [fRate, setFRate] = useState('');
    const [fAfterOn, setFAfterOn] = useState(false); const [fAfter, setFAfter] = useState(today);
    const [fBeforeOn, setFBeforeOn] = useState(false); const [fBefore, setFBefore] = useState(today);
    const [findProd, setFindProd] = useState(false);
    const runView = async () => {
        const params: any = {};
        if (fCompany) params.company = fCompany;
        if (fQty) params.quantity = fQty;
        if (fType) params.category = fType;
        if (fName.trim()) params.name = fName.trim();
        if (fPid.trim()) params.pid = fPid.trim();
        if (fApply) params.expiry_apply = fApply;
        if (fApply === 'yes' && fExp) params.expiry_date = fExp;
        if (fRate) params.pur_rate = fRate;
        if (fAfterOn) params.expired_after = fAfter;
        if (fBeforeOn) params.expired_before = fBefore;
        setFilterOpen(false); setLoading(true); setSel(-1); clearForm();
        try {
            const { data } = await api.get('v1/products/items/rate_expiry_list/', { params });
            setRows(data);
            setTimeout(() => gridRef.current?.focus(), 0);
        } catch { toast.error('Could not load the stock.'); setRows([]); }
        finally { setLoading(false); }
    };
    const filterKeys = (ev: React.KeyboardEvent) => { if (ev.key === 'Enter' && (ev.target as HTMLElement).tagName !== 'BUTTON') { ev.preventDefault(); runView(); } };

    // update
    const [saving, setSaving] = useState(false);
    const update = () => {
        if (!cur || saving) return;
        if (num(pur) <= 0 || num(sale) <= 0 || num(retail) <= 0) { toast.error('Enter the Pur.Rate, Sale Rate and Retail Rate.'); return; }
        setAsk({
            msg: `Update rates${cur.expiry_apply ? ' and expiry date' : ''} of ${cur.name} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/products/items/rate_expiry_update/', {
                        product: cur.product_id, batch: cur.batch_id || null, date, staff: staffId || null,
                        expiry_date: cur.expiry_apply ? expiry : null, pur_rate: pur, sale_rate: sale, retail_rate: retail,
                    });
                    setRows((rs) => (rs || []).map((r) => (r.product_id === data.product_id && r.batch_id === data.batch_id ? data : r)));
                    toast.success(`${cur.name} updated.`);
                    clearForm();
                    setTimeout(() => gridRef.current?.focus(), 0);
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not update.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };
    const next = (ref: React.RefObject<HTMLInputElement | null> | null) => (ev: React.KeyboardEvent) => {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        if (ref) { ref.current?.focus(); ref.current?.select(); } else update();
    };

    const exportCsv = () => {
        if (!rows?.length) return;
        const head = ['P ID', 'Prod.Type', 'Product Name', 'Carton', 'Expiry Date', 'Qty', 'Pur.Rate', 'Sale Rate', 'Retail Rate', 'Company', 'Status'];
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const body = rows.map((r) => [r.pid, r.category, r.name, r.carton || '', dmy(r.expiry_date), r.qty, num(r.pur_rate), num(r.sale_rate), num(r.retail_rate), r.company, r.status].map(esc).join(','));
        const blob = new Blob(['﻿' + [head.map(esc).join(','), ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `stock-rates-expiry-${today()}.csv`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    const closeWindow = () => askClose(closeTradeWindow, cur ? 'The changes are not updated. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[12px] font-medium text-[#1b1f4b]';
    const flbl = 'whitespace-nowrap text-[12px] text-[#1b1f4b]';
    const findBtn = 'h-7 shrink-0 whitespace-nowrap rounded-md border border-[#c9b85a] bg-gradient-to-b from-[#ffffd6] to-[#f4ef9c] px-2.5 text-[12px] font-semibold text-slate-800 shadow-sm hover:to-[#ece27a] active:translate-y-px';
    const cols = [8, 10, 26, 6, 9, 6, 7, 7, 7, 9, 7];
    const stateTone = (s: string) => (s === 'Expired' ? 'text-red-600' : s === 'Near Expiry' ? 'text-amber-600' : s === 'Inactive' ? 'text-slate-400' : '');

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1280} height={680} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Update Stock Expiry and Rates )</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
                    <div className="mx-auto shrink-0 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e4e4ee] px-10 py-1 text-[20px] font-bold text-[#1f2bd6] shadow-sm">
                        Update Rates and Expiry Date
                    </div>

                    {/* Form */}
                    <div className="grid shrink-0 grid-cols-[82px_150px_64px_150px_80px_150px_90px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                        <span className={lbl}>Prod.Code</span><div className={RO}>{cur?.pid || ''}</div>
                        <span className={lbl}>Product</span><div className={`${RO} col-span-3`} title={cur?.name}>{pn(cur?.name)}</div>
                        <span className={lbl}>Company</span><div className={RO} title={cur?.company}>{cur?.company || ''}</div>

                        <span className={lbl}>Date</span>
                        <input type="date" value={date} onChange={(ev) => ev.target.value && setDate(ev.target.value)} className={IN} />
                        <span className={lbl}>Carton</span><div className={`${RO} justify-end`}>{cur?.carton ? cur.carton : ''}</div>
                        <span className={lbl}>Qty(Units)</span><div className={`${RO} justify-end`}>{cur ? fmt(num(cur.qty)) : ''}</div>
                        <span className={lbl}>Product Type</span><div className={RO}>{cur?.category || ''}</div>

                        <span className={lbl}>Expiry Date</span>
                        <input type="date" value={expiry} disabled={!cur?.expiry_apply} onChange={(ev) => ev.target.value && setExpiry(ev.target.value)}
                            title={cur && !cur.expiry_apply ? 'Expiry is not applied to this product' : undefined}
                            className={cur?.expiry_apply ? IN : OFF} />
                        <span className={lbl}>Pur.Rate</span>
                        <input ref={purRef} value={pur} disabled={!cur} onChange={(ev) => setPur(rate(ev.target.value))} onKeyDown={next(saleRef)} className={`${cur ? IN : OFF} text-right`} />
                        <span className={lbl}>Sale Rate</span>
                        <input ref={saleRef} value={sale} disabled={!cur} onChange={(ev) => setSale(rate(ev.target.value))} onKeyDown={next(retailRef)} className={`${cur ? IN : OFF} text-right`} />
                        <span className={lbl}>Retail Rate</span>
                        <div className="grid grid-cols-[100px_auto_minmax(0,1fr)] items-center gap-2">
                            <input ref={retailRef} value={retail} disabled={!cur} onChange={(ev) => setRetail(rate(ev.target.value))} onKeyDown={next(null)}
                                title="Enter = Update" className={`${cur ? IN : OFF} text-right`} />
                            <span className={lbl}>Staff</span>
                            <select value={staffId} onChange={(ev) => setStaffId(ev.target.value)} className={SEL}>
                                <option value="">Select any one</option>
                                {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="relative min-h-0 flex-1">
                        <div ref={gridRef} tabIndex={0} onKeyDown={gridKeys}
                            className="h-full overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                            {rows && (
                                <table className="w-full table-fixed border-collapse bg-white text-[12px]">
                                    <colgroup>{cols.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                        <tr>{['P ID', 'Prod.Type', 'Product Name', 'Carton', 'Expiry Date', 'Qty', 'Pur.Rate', 'Sale Rate', 'Retail Rate', 'Company', 'Status'].map((h) => (
                                            <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>
                                        ))}</tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={`${r.product_id}-${r.batch_id}`} data-row={i} onClick={() => setSel(i)} onDoubleClick={() => { setSel(i); pick(r); }}
                                                title="Click to select · Enter or double-click to edit"
                                                className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#7dfa7d]' : cur && cur.product_id === r.product_id && cur.batch_id === r.batch_id ? 'bg-[#fff3c4]' : 'hover:bg-indigo-50'}`}>
                                                {[r.pid, r.category, pn(r.name), r.carton || '', dmy(r.expiry_date), fmt(num(r.qty)), fmt(num(r.pur_rate)), fmt(num(r.sale_rate)), fmt(num(r.retail_rate)), r.company, r.status].map((v, k) => (
                                                    <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-[3px] ${k === 3 || (k >= 5 && k <= 8) ? 'text-right' : ''} ${k === 10 ? stateTone(r.status) : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!rows.length && <tr><td colSpan={11} className="px-3 py-6 text-center text-slate-500">No stock for this search.</td></tr>}
                                    </tbody>
                                </table>
                            )}
                            {loading && <div className="flex h-full items-center justify-center gap-2 text-[13px] text-white"><Loader2 size={16} className="animate-spin" /> Loading…</div>}
                        </div>

                        {filterOpen && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20" onKeyDown={filterKeys}>
                                <fieldset className="w-[760px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                                    <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">View to Stock Rates and Expiry Date</legend>
                                    <div className="grid grid-cols-[96px_200px_120px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
                                        <span className={flbl}>Company</span>
                                        <select autoFocus value={fCompany} onChange={(ev) => setFCompany(ev.target.value)} className={`${SEL} col-span-2`}>
                                            <option value="">Select any one</option>
                                            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <span />

                                        <span className={flbl}>Quantity</span>
                                        <select value={fQty} onChange={(ev) => setFQty(ev.target.value)} className={SEL}>
                                            <option value="">Select any One</option>
                                            <option value="available">Available (&gt; 0)</option>
                                            <option value="zero">Zero</option>
                                            <option value="negative">Negative (&lt; 0)</option>
                                        </select>
                                        <button type="button" onClick={() => setFindProd(true)} className={findBtn}>Find Product ID</button>
                                        <input value={fPid} onChange={(ev) => setFPid(ev.target.value)} placeholder="PID / bar code" className={IN} />

                                        <span className={flbl}>Product Type</span>
                                        <select value={fType} onChange={(ev) => setFType(ev.target.value)} className={SEL}>
                                            <option value="">Select any one</option>
                                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <span className={`${flbl} text-right`}>Expiry Apply</span>
                                        <select value={fApply} onChange={(ev) => setFApply(ev.target.value)} className={SEL}>
                                            <option value="">Select any One</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>

                                        <span className={flbl}>Product Name</span>
                                        <input value={fName} onChange={(ev) => setFName(ev.target.value)} className={IN} />
                                        <span className={`${flbl} text-right`}>Expiry date</span>
                                        <input type="date" value={fExp} disabled={fApply !== 'yes'} onChange={(ev) => setFExp(ev.target.value)}
                                            title="Only batches expiring on this date (leave empty for all)" className={fApply === 'yes' ? IN : OFF} />

                                        <span className={flbl}>Expired after</span>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={fAfterOn} onChange={(ev) => setFAfterOn(ev.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                            <input type="date" value={fAfter} disabled={!fAfterOn} onChange={(ev) => ev.target.value && setFAfter(ev.target.value)} className={fAfterOn ? IN : OFF} />
                                        </div>
                                        <span className={`${flbl} text-right`}>Purchase Rate</span>
                                        <input value={fRate} onChange={(ev) => setFRate(rate(ev.target.value))} className={`${IN} text-right`} />

                                        <span className={flbl}>Expired before</span>
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={fBeforeOn} onChange={(ev) => setFBeforeOn(ev.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                            <input type="date" value={fBefore} disabled={!fBeforeOn} onChange={(ev) => ev.target.value && setFBefore(ev.target.value)} className={fBeforeOn ? IN : OFF} />
                                        </div>
                                        <span />
                                        <div className="flex justify-end gap-2">
                                            {rows && <button type="button" onClick={() => setFilterOpen(false)} className={`${ACTION_BTN} !h-8 !text-[13px]`}>Back</button>}
                                            <button type="button" onClick={runView} className={`${ACTION_BTN} !h-8 !text-[13px]`}><span className="underline">O</span>K</button>
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                        )}
                    </div>

                    {/* Bottom */}
                    <div className="flex shrink-0 items-center gap-3">
                        <ReadBox value={rows ? <span className="text-[#1f2bd6]">Total Records = {rows.length}</span> : ''} className="h-7 w-[220px] !text-[12px] !font-normal" />
                        <ReadBox value={cur ? 'Edit the green boxes, Enter on Retail Rate = Update' : (rows?.length ? 'Click a row, Enter to edit' : '')}
                            className="h-7 w-[300px] !text-[12px] !font-normal" />
                        <span className="flex-1" />
                        {rows && <button type="button" onClick={exportCsv} disabled={!rows.length} className={ACTION_BTN}>Export</button>}
                        <span className="w-6" />
                        <button type="button" onClick={() => setFilterOpen(true)} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </div>
            </FitStage>

            {findProd && (
                <ReturnFindProductWindow companies={companies} askClose={askClose}
                    onPick={(r) => { setFindProd(false); setFPid(r.pid); }} onClose={() => setFindProd(false)}
                    onAddNew={() => openPopup('/admin/trade/product-detail')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
