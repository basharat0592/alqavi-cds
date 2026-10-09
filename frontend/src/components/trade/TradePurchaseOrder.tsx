"use client";

/*
 * Trade 1.0 — Purchase Order.
 *
 * Find Product (same window as in Sale) / PID → Product, Company, Purchase
 * rate, Available Stock; Qty (U) → Add / Remove into the SNo / PID / Product
 * Name / Carton / Qty(U) / Pur.Rate / SubTotal grid. Find Supp + Date. Right:
 * Total Items, Pur. Order Inv, Voucher No, Amount, Save / View / Cancel.
 * View: "View Purchase Order Detail" (Pur.Order Inv ID, Find Supp, from / to
 * date) → list of orders; picking one shows it in the window (read only) and
 * Add New replaces Save to start a fresh order. No stock or balance change.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { pn, tip } from '@/lib/productName';
import { openPopup } from '@/lib/popup';
import {
    Modal, ConfirmBox, ReadBox, LABEL, FIELD, EDIT, ACTION_BTN, closeTradeWindow, ReturnFindProductWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

type Prod = { id: string; code: string; name: string; company: string; carton: number; stock: number; cost_price: number };
type Line = { productId?: string; pid: string; name: string; carton: number; qty: number; rate: number };

const RO = `${FIELD} flex h-7 w-full items-center border-[#e6b98a] bg-[#ffe3c7] px-2 !text-[12px] !font-normal text-slate-800`;
const IN = `${EDIT} h-7 w-full !text-[12px] !font-normal`;

export default function TradePurchaseOrder() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Purchase Order )'; }, []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [companies, setCompanies] = useState<any[]>([]);
    useEffect(() => {
        const loadAcc = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
        loadAcc();
        (async () => {
            const all: any[] = [];
            try {
                for (let page = 1; page <= 20; page++) {
                    const { data } = await api.get('v1/company/companies/', { params: { page, page_size: 100 } });
                    if (Array.isArray(data)) { all.push(...data); break; }
                    all.push(...(data.results || []));
                    if (!data.next) break;
                }
            } catch { /* optional */ }
            setCompanies(all.sort((a, b) => String(a.name).localeCompare(String(b.name))));
        })();
        window.addEventListener('focus', loadAcc);
        return () => window.removeEventListener('focus', loadAcc);
    }, []);
    const supAccounts = useMemo(() => (accounts ? accounts.filter((a) => a.group === 2201) : null), [accounts]);

    const [orderNo, setOrderNo] = useState('…');
    const loadNo = () => api.get('v1/sales/trade-purchase-orders/next_no/').then(({ data }) => setOrderNo(data.order_no)).catch(() => setOrderNo('—'));
    useEffect(() => { loadNo(); }, []);

    // Viewing a saved order (read only) — Add New takes the place of Save.
    const [viewing, setViewing] = useState<any | null>(null);

    // entry
    const [code, setCode] = useState('');
    const [prod, setProd] = useState<Prod | null>(null);
    const [qty, setQty] = useState('');
    const [findProd, setFindProd] = useState(false);
    const codeRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const [focusQty, setFocusQty] = useState(0);
    useEffect(() => { if (focusQty && prod) requestAnimationFrame(() => qtyRef.current?.focus()); }, [focusQty, prod]);
    const loadProduct = async (c: string) => {
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: c } });
            const p: Prod | undefined = data[0];
            if (!p) { toast.error('Product not found.'); return; }
            setProd(p); setCode(p.code); setQty(''); setFocusQty((n) => n + 1);
        } catch { toast.error('Could not load the product.'); }
    };

    // supplier
    const [supCode, setSupCode] = useState('');
    const [sup, setSup] = useState<Acc | null>(null);
    const [date, setDate] = useState(today);
    const [finder, setFinder] = useState<null | { target: 'sup' | 'view'; q: string }>(null);
    const [vSup, setVSup] = useState<Acc | null>(null);
    const [vSupCode, setVSupCode] = useState('');
    const pickSup = (a: Acc, target: 'sup' | 'view') => {
        setFinder(null);
        if (target === 'view') { setVSup(a); setVSupCode(a.acc_id); } else { setSup(a); setSupCode(a.acc_id); }
    };
    const resolveSup = (target: 'sup' | 'view') => {
        const c = (target === 'sup' ? supCode : vSupCode).trim();
        const hit = c ? (supAccounts || []).find((a) => a.acc_id === c) : null;
        if (hit) pickSup(hit, target); else setFinder({ target, q: /^\d+$/.test(c) ? '' : c });
    };

    // lines
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const addLine = () => {
        if (viewing) return;
        if (!prod) { toast.error('Find the product first.'); codeRef.current?.focus(); return; }
        const q = Math.round(num(qty));
        if (q <= 0) { toast.error('Enter the quantity.'); qtyRef.current?.focus(); return; }
        if (lines.some((l) => l.productId === prod.id)) { toast.error(`${prod.name} is already in the order — remove it first to change it.`); return; }
        setLines((ls) => [...ls, { productId: prod.id, pid: prod.code, name: prod.name, carton: prod.carton, qty: q, rate: num(prod.cost_price) }]);
        setProd(null); setCode(''); setQty(''); setSel(-1);
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (viewing) return;
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };
    const amount = lines.reduce((s, l) => s + l.qty * l.rate, 0);
    const cartons = (l: Line) => (l.carton > 0 ? (l.qty % l.carton ? `${Math.floor(l.qty / l.carton)} + ${l.qty % l.carton}` : String(l.qty / l.carton)) : '');

    const addNew = () => {
        setViewing(null); setLines([]); setSel(-1); setProd(null); setCode(''); setQty('');
        setSup(null); setSupCode(''); setDate(today()); loadNo();
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const [saving, setSaving] = useState(false);
    const missing = [!sup && 'the supplier', !lines.length && 'a product'].filter(Boolean) as string[];
    const save = () => {
        if (saving || viewing) return;
        if (missing.length) { toast.error(`Add ${missing.join(' and ')}.`); return; }
        setAsk({
            msg: `Save Purchase Order ${orderNo} to ${sup!.name} (${lines.length} item${lines.length === 1 ? '' : 's'}) ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-purchase-orders/', {
                        supplier: sup!.id, date, lines: lines.map((l) => ({ product: l.productId, qty: l.qty, pur_rate: l.rate })),
                    });
                    toast.success(`Purchase Order ${data.order_no} saved — ${fmt(num(data.amount))}.`);
                    addNew();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the order.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Purchase Order Detail
    const [view, setView] = useState<null | { rows: any[] | null; filter: boolean }>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const [vSel, setVSel] = useState(-1);
    const runView = async () => {
        setView({ rows: null, filter: false }); setVSel(-1);
        try {
            const params: any = {};
            if (vNo.trim()) params.order_no = vNo.trim();
            if (vSup) params.supplier = vSup.id;
            if (vFromOn) params.date_from = vFrom;
            if (vToOn) params.date_to = vTo;
            const { data } = await api.get('v1/sales/trade-purchase-orders/', { params });
            setView({ rows: data, filter: false });
        } catch { toast.error('Could not load orders.'); setView({ rows: [], filter: false }); }
    };
    const openOrder = (o: any) => {
        setView(null); setViewing(o);
        setOrderNo(o.order_no); setDate(String(o.date || today()).slice(0, 10));
        setSup(null); setSupCode(o.supplier_acc || '');
        setLines(o.lines.map((l: any) => ({ pid: l.pid, name: l.name, carton: 0, qty: num(l.qty), rate: num(l.pur_rate) })));
        setProd(null); setCode(''); setQty(''); setSel(-1);
    };
    const vRows = view?.rows || [];
    const viewKeys = (ev: React.KeyboardEvent) => {
        if (!vRows.length) return;
        if (ev.key === 'Enter') { ev.preventDefault(); openOrder(vRows[vSel < 0 ? 0 : vSel]); return; }
        if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
        ev.preventDefault();
        setVSel((i) => Math.min(vRows.length - 1, Math.max(0, i + (ev.key === 'ArrowDown' ? 1 : -1))));
    };

    const closeWindow = () => askClose(closeTradeWindow, !viewing && lines.length ? 'The order is not saved. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[12px] font-medium text-[#1b1f4b]';
    const findBtn = 'h-7 shrink-0 rounded-md border border-[#c9b85a] bg-gradient-to-b from-[#ffffd6] to-[#f4ef9c] px-2.5 text-[12px] font-semibold text-slate-800 shadow-sm hover:to-[#ece27a] active:translate-y-px disabled:opacity-50';
    const box = `${FIELD} flex h-9 items-center justify-center border-slate-300 bg-[#e6e6ee] text-[15px] font-bold tabular-nums text-[#1f2bd6]`;

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1240} height={600} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Purchase Order ){viewing ? `  —  viewing ${viewing.order_no}` : ''}</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
                    {/* Product */}
                    <div className="grid shrink-0 grid-cols-[100px_150px_auto_minmax(0,1fr)_auto_120px] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                        <button type="button" onClick={() => setFindProd(true)} disabled={!!viewing} className={findBtn}>Find Product</button>
                        <input ref={codeRef} value={code} disabled={!!viewing} onChange={(ev) => { setCode(ev.target.value); if (prod) setProd(null); }}
                            onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (code.trim()) loadProduct(code.trim()); else setFindProd(true); } }}
                            placeholder="PID / bar code" className={IN} />
                        <span className={lbl}>Product</span>
                        <div className={`${RO} !font-semibold`} title={prod?.name}>{pn(prod?.name)}</div>
                        <span className={lbl}>Available Stock</span>
                        <div className={`${RO} justify-end`}>{prod ? fmt(num(prod.stock)) : ''}</div>

                        <span className={`${lbl} text-right`}>Qty (U)</span>
                        <input ref={qtyRef} value={qty} disabled={!!viewing} onChange={(ev) => setQty(ev.target.value.replace(/\D/g, ''))}
                            onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
                        <span className={lbl}>Company</span>
                        <div className={RO} title={prod?.company}>{prod?.company || ''}</div>
                        <span className={lbl}>Purchase</span>
                        <div className={`${RO} justify-end`}>{prod ? fmt(num(prod.cost_price)) : ''}</div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px] gap-2.5">
                        <div className="flex min-h-0 flex-col gap-2">
                            {/* Supplier */}
                            <div className="grid shrink-0 grid-cols-[90px_150px_auto_150px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                                <button type="button" onClick={() => setFinder({ target: 'sup', q: '' })} disabled={!!viewing} className={findBtn}>Find Supp</button>
                                <input value={supCode} disabled={!!viewing} onChange={(ev) => { setSupCode(ev.target.value); if (sup) setSup(null); }}
                                    onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); resolveSup('sup'); } }} placeholder="Supplier ID" className={IN} />
                                <span className={lbl}>Date</span>
                                <input type="date" value={date} disabled={!!viewing} onChange={(ev) => ev.target.value && setDate(ev.target.value)} className={IN} />
                                <ReadBox value={viewing ? viewing.supplier : (sup ? sup.name : '')} className="h-7 !text-[12px] !font-normal" />
                            </div>

                            {/* Lines */}
                            <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                                <table className="w-full table-fixed border-collapse bg-white text-[12px]">
                                    <colgroup>{[6, 9, 43, 8, 9, 11, 14].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                        <tr>{['SNo', 'PID', 'Product Name', 'Carton', 'Qty(U)', 'Pur.Rate', 'SubTotal'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => (
                                            <tr key={i} onClick={() => !viewing && setSel(i)} className={`tabular-nums ${!viewing ? 'cursor-pointer' : ''} ${sel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                                {[i + 1, l.pid, pn(l.name), cartons(l), fmt(l.qty), fmt(l.rate), fmt(l.qty * l.rate)].map((v, k) => (
                                                    <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 3 ? 'text-right' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!lines.length && <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Find the product, enter Qty (U), press Add.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right panel */}
                        <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={addLine} disabled={!!viewing || !prod} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                                <button type="button" onClick={removeLine} disabled={!!viewing || sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                            </div>
                            {[['Total Items', <span key="t" className="text-[18px]">{lines.length}</span>],
                              ['Pur. Order Inv', <span key="o" className="font-mono text-[14px]">{orderNo}</span>]].map(([k, v]) => (
                                <div key={String(k)} className="grid grid-cols-[100px_1fr] items-center gap-2">
                                    <span className={`${LABEL} text-[13px]`}>{k}</span><div className={box}>{v}</div>
                                </div>
                            ))}
                            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                <span className={`${LABEL} text-[13px]`}>Voucher No</span>
                                <div className="flex h-9 items-center justify-center rounded-md bg-black font-mono text-[13px] text-[#3cff5a]" title="Purchase orders post no voucher" />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-2">
                                <span className={`${LABEL} text-[13px]`}>Amount</span><div className={box}>{fmt(amount)}</div>
                            </div>
                            <span className="flex-1" />
                            {!viewing && missing.length > 0 && <span className="text-[11.5px] text-slate-600">To save, add {missing.join(' and ')}.</span>}
                            {viewing ? (
                                <button type="button" onClick={addNew} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            ) : (
                                <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setView({ rows: null, filter: true })} className={`${ACTION_BTN} !min-w-0`}><span className="underline">V</span>iew</button>
                                <button type="button" onClick={closeWindow} className={`${ACTION_BTN} !min-w-0`}><span className="underline">C</span>ancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </FitStage>

            {findProd && (
                <ReturnFindProductWindow companies={companies} askClose={askClose}
                    onPick={(r) => { setFindProd(false); loadProduct(r.pid); }} onClose={() => setFindProd(false)}
                    onAddNew={() => openPopup('/admin/trade/product-detail')} />
            )}
            {finder && (
                <FindAccountWindow accounts={supAccounts} cashOnly={false} initial={finder.q} askClose={askClose}
                    onPick={(a) => pickSup(a, finder.target)} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}

            {view && (
                <Modal title="Purchase Order" onClose={() => askClose(() => setView(null))} xl>
                    <div className="relative flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        <div tabIndex={0} onKeyDown={viewKeys} className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                            <table className="w-full table-fixed border-collapse bg-white text-[12px]">
                                <colgroup>{[14, 12, 12, 38, 9, 15].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Pur.Order Inv', 'Date', 'Supp ID', 'Supplier', 'Items', 'Amount'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {vRows.map((o, i) => (
                                        <tr key={o.id} onClick={() => setVSel(i)} onDoubleClick={() => openOrder(o)} title="Click to select · Enter or double-click to open"
                                            className={`cursor-pointer tabular-nums ${vSel === i ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                            {[o.order_no, dmy(o.date), o.supplier_acc, o.supplier, o.lines.length, fmt(num(o.amount))].map((v, k) => (
                                                <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 4 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {view.rows && !vRows.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No purchase orders for this search.</td></tr>}
                                    {!view.rows && !view.filter && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {vRows.length}</span>} className="w-[220px]" />
                            <span className="text-[12px] text-slate-600">Click an order, then Enter (or double-click) to open it.</span>
                            <span className="flex-1" />
                            <button type="button" onClick={() => setView({ rows: view.rows, filter: true })} className={ACTION_BTN}>Search</button>
                            <button type="button" onClick={() => { setView(null); addNew(); }} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            <button type="button" onClick={() => askClose(() => setView(null))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>

                        {view.filter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                                <fieldset className="w-[620px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-6 pb-5 pt-1 shadow-xl">
                                    <legend className="px-2 text-[16px] font-bold text-[#1f2bd6]">View Purchase Order Detail</legend>
                                    <div className="grid grid-cols-[150px_auto_1fr] items-center gap-x-3 gap-y-3">
                                        <span className={`${LABEL} text-[14px]`}>Pur.Order Inv ID</span><span />
                                        <input autoFocus value={vNo} onChange={(ev) => setVNo(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') runView(); }}
                                            placeholder="All" className={`${EDIT} w-full`} />
                                        <button type="button" onClick={() => setFinder({ target: 'view', q: '' })} className={findBtn}>Find Supp</button>
                                        <span />
                                        <div className="flex gap-2">
                                            <input value={vSupCode} onChange={(ev) => { setVSupCode(ev.target.value); if (vSup) setVSup(null); }}
                                                onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); resolveSup('view'); } }} placeholder="Any supplier" className={`${EDIT} w-[130px]`} />
                                            <ReadBox value={vSup ? vSup.name : ''} className="flex-1" />
                                        </div>
                                        <span className={`${LABEL} text-[14px]`}>From Date</span>
                                        <input type="checkbox" checked={vFromOn} onChange={(ev) => setVFromOn(ev.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vFrom} disabled={!vFromOn} onChange={(ev) => ev.target.value && setVFrom(ev.target.value)}
                                            className={`${FIELD} w-full ${vFromOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                                        <span className={`${LABEL} text-[14px]`}>To Date</span>
                                        <input type="checkbox" checked={vToOn} onChange={(ev) => setVToOn(ev.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vTo} disabled={!vToOn} onChange={(ev) => ev.target.value && setVTo(ev.target.value)}
                                            className={`${FIELD} w-full ${vToOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                                    </div>
                                    <div className="mt-4 flex justify-end gap-2">
                                        {view.rows && <button type="button" onClick={() => setView({ rows: view.rows, filter: false })} className={ACTION_BTN}>Back</button>}
                                        <button type="button" onClick={runView} className={ACTION_BTN}><span className="underline">O</span>K</button>
                                    </div>
                                </fieldset>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
