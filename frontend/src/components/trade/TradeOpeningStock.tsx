"use client";

/*
 * Trade 1.0 — Opening Stock (Add) / (Less), and Short / Excess › Stock Access
 * (excess, H-numbered, like Opening Stock Add with a GRoup column) / Stock Short
 * (G-numbered, like Opening Stock Less, pink window).
 *
 * Add: Find Product (same window as in Sale) / PID → product, company; Expiry
 * Date (when the product has expiry), Qty (U), Pur.Rate / Sale Rate / Retail
 * Rate (green, from the product), Packing, Stock in Hand, Net Amt. Prod-wise.
 * Date, Bill.No, Staff, Amt purchase, Add / Remove → the Inv.No / Date / SNo /
 * PID / Product Name / Packing / Qty(U) / Exp.Date / Pur.Rate / Sale Rate /
 * Retail.Rate / Sub Total / Bill no / Staff grid. Save puts the stock in as new
 * batches (Inventory Dr / Capital Cr). B-numbered.
 * Less: the stock batch is picked by Exp Date, rates come from it; Save takes
 * the units out (Capital Dr / Inventory Cr). C-numbered.
 * View: Inv ID, Find Product, From / To Date → the saved lines (read only).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { pn, tip } from '@/lib/productName';
import { openPopup } from '@/lib/popup';
import {
    ConfirmBox, ReadBox, Led, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow, ReturnFindProductWindow,
} from '@/components/trade/TradeSaleInvoice';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const money = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const inYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };

type Lot = { key: string; batch: string; expiry_date: string | null; quantity: number; cost_price: any; selling_price: any; retail_price: any };
type Prod = {
    id: string; code: string; name: string; company: string; group: string; packing: number; stock: number; expiryApply: boolean;
    cost: number; sale: number; retail: number; lots: Lot[];
};
export type StockKind = 'oadd' | 'oles' | 'sexc' | 'ssho';
const CFG: Record<StockKind, {
    incoming: boolean; win: string; legend: string; what: string; invLabel: string; viewTitle: string; viewId: string; bg: string; group?: boolean;
}> = {
    oadd: { incoming: true, win: '(Opening Stock)', legend: 'Opening Stock\u00a0\u00a0(Add)', what: 'Opening Stock (Add)', invLabel: 'Opening Stock Add. Inv',
        viewTitle: 'View Opening Stock Detail', viewId: 'Opening.Inv ID', bg: '#c9c9f9' },
    oles: { incoming: false, win: '(Opening Stock (Less) )', legend: 'Opening Stock\u00a0\u00a0(Less)', what: 'Opening Stock (Less)', invLabel: 'Op.Stock Less Inv.No',
        viewTitle: 'View Opening Stock (Less) Detail', viewId: 'Op.Less Inv ID', bg: '#c9c9f9' },
    sexc: { incoming: true, win: '(Stock Excess)', legend: 'Stock Access', what: 'Stock Access', invLabel: 'Stock Access  Inv',
        viewTitle: 'View Stock Access  Detail', viewId: 'Stock Access.Inv ID', bg: '#c9c9f9', group: true },
    ssho: { incoming: false, win: '( Stock Short )', legend: 'Stock\u00a0\u00a0Short', what: 'Stock Short', invLabel: 'Stock Short Inv.No',
        viewTitle: 'View Stock Short  Detail', viewId: 'Short.Inv ID', bg: '#f5c2c2' },
};

type Line = {
    group?: string;
    productId?: string; batch?: string; number?: string; date: string; pid: string; name: string; pack: number;
    expiry: string | null; qty: number; pur: number; sale: number; retail: number; bill: string; staff: string;
};

const RO = `${FIELD} flex h-7 w-full items-center border-[#e6b98a] bg-[#ffe3c7] px-2 !text-[12px] !font-normal text-slate-800`;
const GREY = `${FIELD} flex h-7 w-full items-center justify-end border-slate-300 bg-[#e1e1e8] px-2 !text-[12px] !font-normal text-slate-800`;
const IN = `${EDIT} h-7 w-full !text-[12px] !font-normal`;
const OFF = `${FIELD} h-7 w-full border-slate-300 bg-[#ececf3] !px-1.5 !text-[12px] !font-normal text-slate-400`;

export default function TradeOpeningStock({ kind }: { kind: StockKind }) {
    const C = CFG[kind];
    const add = C.incoming;
    const WIN = C.win;
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = `AL-QAVI TRADERS  Trade 1.0  ${WIN}`; }, [WIN]);

    const [companies, setCompanies] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
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
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaffList((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaffList([]));
    }, []);

    const [invNo, setInvNo] = useState('…');
    const loadNo = () => api.get('v1/sales/trade-opening-stock/next_no/', { params: { kind } }).then(({ data }) => setInvNo(data.number)).catch(() => setInvNo('—'));
    useEffect(() => { loadNo(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [voucherNo, setVoucherNo] = useState('');
    const [viewing, setViewing] = useState(false);

    const [date, setDate] = useState(today);
    const [billNo, setBillNo] = useState('');
    const [staffId, setStaffId] = useState('');
    const staffName = staffList.find((s) => s.id === staffId)?.name || '';

    // entry
    const [code, setCode] = useState('');
    const [prod, setProd] = useState<Prod | null>(null);
    const [lotKey, setLotKey] = useState('');
    const [exp, setExp] = useState(inYear);
    const [qty, setQty] = useState('');
    const [pur, setPur] = useState(''); const [sale, setSale] = useState(''); const [retail, setRetail] = useState('');
    const [findProd, setFindProd] = useState(false);
    const [findFor, setFindFor] = useState<'entry' | 'view'>('entry');
    const codeRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const [focusQty, setFocusQty] = useState(0);
    useEffect(() => { if (focusQty) requestAnimationFrame(() => qtyRef.current?.focus()); }, [focusQty]);
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const lot = prod?.lots.find((l) => l.key === lotKey) || null;
    const lotLeft = (l: Lot) => l.quantity - lines.filter((x) => !viewing && x.productId === prod?.id && (x.batch || '') === l.batch).reduce((s, x) => s + x.qty, 0);

    const loadProduct = async (c: string) => {
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: c } });
            const p = data[0];
            if (!p) { toast.error('Product not found.'); return; }
            let lots: Lot[] = (p.batches || []).map((b: any) => ({ key: `b${b.id}`, batch: b.id, expiry_date: b.expiry_date, quantity: num(b.quantity), cost_price: b.cost_price, selling_price: b.selling_price, retail_price: b.retail_price }));
            if (!lots.length && num(p.stock) > 0) lots = [{ key: 'p', batch: '', expiry_date: null, quantity: num(p.stock), cost_price: p.cost_price, selling_price: p.selling_price, retail_price: p.retail_price }];
            if (!add && !lots.length) toast.error(`${p.name} has no stock to take out.`);
            setProd({
                id: p.id, code: p.code, name: p.name, company: p.company, group: p.category || '', packing: num(p.packing) || 1, stock: num(p.stock),
                expiryApply: !!p.expiry_apply, cost: num(p.cost_price), sale: num(p.selling_price), retail: num(p.retail_price), lots,
            });
            setCode(p.code); setLotKey(lots[0]?.key || ''); setQty('');
            setPur(num(p.cost_price) ? String(num(p.cost_price)) : ''); setSale(num(p.selling_price) ? String(num(p.selling_price)) : '');
            setRetail(num(p.retail_price) ? String(num(p.retail_price)) : '');
            setFocusQty((n) => n + 1);
        } catch { toast.error('Could not load the product.'); }
    };

    const addLine = () => {
        if (viewing) return;
        if (!prod) { toast.error('Find the product first.'); codeRef.current?.focus(); return; }
        const q = Math.round(num(qty));
        if (q <= 0) { toast.error('Enter Qty (U).'); qtyRef.current?.focus(); return; }
        let line: Line;
        if (add) {
            if (num(pur) <= 0) { toast.error('Enter the Pur.Rate.'); return; }
            if (prod.expiryApply && !exp) { toast.error('Choose the Expiry Date.'); return; }
            line = { productId: prod.id, date, pid: prod.code, group: prod.group, name: prod.name, pack: prod.packing, expiry: prod.expiryApply ? exp : null,
                qty: q, pur: num(pur), sale: num(sale), retail: num(retail), bill: billNo, staff: staffName };
        } else {
            if (!lot) { toast.error('This product has no stock.'); return; }
            const left = lotLeft(lot);
            if (q > left) { toast.error(`Only ${left} in stock${lot.expiry_date ? ` (exp ${dmy(lot.expiry_date)})` : ''}.`); qtyRef.current?.select(); return; }
            line = { productId: prod.id, batch: lot.batch || undefined, date, pid: prod.code, group: prod.group, name: prod.name, pack: prod.packing,
                expiry: lot.expiry_date, qty: q, pur: num(lot.cost_price), sale: num(lot.selling_price), retail: num(lot.retail_price), bill: billNo, staff: staffName };
        }
        setLines((ls) => [...ls, line]);
        setProd(null); setCode(''); setQty(''); setLotKey(''); setPur(''); setSale(''); setRetail(''); setSel(-1); setVoucherNo('');
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (viewing) return;
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };
    // Date / Bill.No / Staff apply to every line of the new invoice.
    useEffect(() => { if (!viewing) setLines((ls) => ls.map((l) => ({ ...l, date, bill: billNo, staff: staffName }))); }, [date, billNo, staffName]); // eslint-disable-line react-hooks/exhaustive-deps

    const amount = lines.reduce((s, l) => s + l.qty * l.pur, 0);
    const entryPur = add ? num(pur) : num(lot?.cost_price);
    const netEntry = num(qty) > 0 ? num(qty) * entryPur : 0;

    const addNew = () => {
        setViewing(false); setLines([]); setSel(-1); setProd(null); setCode(''); setQty(''); setLotKey('');
        setPur(''); setSale(''); setRetail(''); setBillNo(''); setDate(today()); setVoucherNo(''); loadNo();
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (saving || viewing) return;
        if (!lines.length) { toast.error('Add a product.'); return; }
        setAsk({
            msg: `Save ${C.what} ${invNo} (${lines.length} item${lines.length === 1 ? '' : 's'}, ${fmt(amount)}) ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-opening-stock/', {
                        kind, date, bill_no: billNo.trim(), staff: staffId || null,
                        lines: lines.map((l) => (add
                            ? { product: l.productId, qty: l.qty, expiry_date: l.expiry, pur_rate: l.pur, sale_rate: l.sale, retail_rate: l.retail }
                            : { product: l.productId, batch: l.batch || null, qty: l.qty })),
                    });
                    toast.success(`${data.number} saved — ${fmt(num(data.total))}${data.voucher_no ? `, voucher ${data.voucher_no}` : ''}.`, { duration: 6000 });
                    addNew();
                    setVoucherNo(data.voucher_no || '');
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Opening Stock Detail
    const [filter, setFilter] = useState(false);
    const [vNo, setVNo] = useState('');
    const [vPid, setVPid] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        const params: any = { kind };
        if (vNo.trim()) params.number = vNo.trim();
        if (vPid.trim()) params.pid = vPid.trim();
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false);
        try {
            const { data } = await api.get('v1/sales/trade-opening-stock/', { params });
            setViewing(true); setSel(-1); setProd(null); setCode(''); setQty(''); setLotKey('');
            setLines(data.map((r: any) => ({
                number: r.number, date: String(r.date).slice(0, 10), pid: r.pid, group: r.category || '', name: r.name, pack: num(r.pack), expiry: r.expiry_date,
                qty: num(r.qty), pur: num(r.pur_rate), sale: num(r.sale_rate), retail: num(r.retail_rate), bill: r.bill_no || '', staff: r.staff || '',
            })));
            const vs = Array.from(new Set(data.map((r: any) => r.voucher_no).filter(Boolean)));
            setVoucherNo(vs.length === 1 ? String(vs[0]) : '');
            if (!data.length) toast('Nothing found for this search.');
        } catch { toast.error('Could not load.'); }
    };
    const invs = useMemo(() => Array.from(new Set(lines.map((l) => l.number).filter(Boolean))), [lines]);
    const shownInv = viewing ? (invs.length === 1 ? invs[0] : invs.length ? `${invs.length} invoices` : '') : invNo;

    const gridKeys = (e: React.KeyboardEvent) => {
        if (!lines.length) return;
        if (e.key === 'Delete' && !viewing) { e.preventDefault(); removeLine(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        setSel((i) => Math.min(lines.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    };
    const closeWindow = () => askClose(closeTradeWindow, !viewing && lines.length ? 'The products are not saved. Do you want to Close the Form ?' : undefined);

    const lbl = 'whitespace-nowrap text-[12px] font-medium text-[#1b1f4b]';
    const findBtn = 'h-7 shrink-0 whitespace-nowrap rounded-md border border-[#c9b85a] bg-gradient-to-b from-[#ffffd6] to-[#f4ef9c] px-2.5 text-[12px] font-semibold text-slate-800 shadow-sm hover:to-[#ece27a] active:translate-y-px disabled:opacity-50';
    // Stock Access shows the product's GRoup (category) where the others show Packing.
    const mid = C.group ? 'GRoup' : 'Packing';
    const heads = add
        ? ['Inv.No', 'Date', 'SNo', 'PID', ...(C.group ? [mid, 'Product Name'] : ['Product Name', mid]), 'Qty(U)', 'Exp.Date', 'Pur.Rate', 'Sale Rate', 'Retail.Rate', 'Sub Total', 'Bill no', 'Staff']
        : ['Inv.No', 'Date', 'SNo', 'PID', 'Product Name', 'Packing', 'Exp.Date', 'Qty', 'P/Rate', 'S/Rate', 'R/Rate', 'Sub Total'];
    const widths = add ? (C.group ? [8, 7, 4, 5, 7, 18, 5, 7, 6, 6, 6, 8, 5, 8] : [8, 7, 4, 5, 19, 5, 5, 7, 6, 6, 6, 8, 6, 8]) : [9, 9, 4, 6, 23, 6, 9, 6, 7, 7, 7, 9];
    const cells = (l: Line, i: number) => (add
        ? [l.number || invNo, dmy(l.date), i + 1, l.pid, ...(C.group ? [l.group || '', pn(l.name)] : [pn(l.name), l.pack]), fmt(l.qty), dmy(l.expiry), fmt(l.pur), fmt(l.sale), fmt(l.retail), fmt(l.qty * l.pur), l.bill, l.staff]
        : [l.number || invNo, dmy(l.date), i + 1, l.pid, pn(l.name), l.pack, dmy(l.expiry), fmt(l.qty), fmt(l.pur), fmt(l.sale), fmt(l.retail), fmt(l.qty * l.pur)]);
    const rightAlign = (k: number) => (add ? [2, ...(C.group ? [] : [5]), 6, 8, 9, 10, 11].includes(k) : [2, 5, 7, 8, 9, 10, 11].includes(k));
    const dis = viewing;

    const grid = (
        <div tabIndex={0} onKeyDown={gridKeys} className="relative min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
            <table className="w-full min-w-[980px] table-fixed border-collapse bg-white text-[12px]">
                <colgroup>{widths.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                    <tr>{heads.map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                    {lines.map((l, i) => (
                        <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? (viewing ? 'bg-[#7dfa7d]' : 'bg-[#2f5bd3] text-white') : 'hover:bg-indigo-50'}`}>
                            {cells(l, i).map((v, k) => (
                                <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${rightAlign(k) ? 'text-right' : ''}`}>{v}</td>
                            ))}
                        </tr>
                    ))}
                    {!lines.length && <tr><td colSpan={heads.length} className="px-3 py-4 text-center text-slate-400">{viewing ? 'Nothing found.' : 'Find the product, enter Qty (U), press Add.'}</td></tr>}
                </tbody>
            </table>

            {filter && (
                <div className="absolute inset-0 flex items-start justify-center bg-slate-900/20 pt-8"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); runView(); } }}>
                    <fieldset className="w-[560px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                        <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">{C.viewTitle}</legend>
                        <div className="grid grid-cols-[130px_24px_minmax(0,1fr)_130px] items-center gap-x-3 gap-y-2.5">
                            <span className="text-[12.5px] text-[#1b1f4b]">{C.viewId}</span><span />
                            <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} /><span />
                            <button type="button" onClick={() => { setFindFor('view'); setFindProd(true); }} className={findBtn}>Find Product</button><span />
                            <input value={vPid} onChange={(e) => setVPid(e.target.value)} placeholder="Any product (PID / bar code)" className={IN} /><span />
                            <span className="text-[12.5px] text-[#1b1f4b]">From Date</span>
                            <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)} className={vFromOn ? IN : OFF} />
                            <span className="row-span-2 flex items-center">
                                <button type="button" onClick={runView} className={`${ACTION_BTN} !h-14 w-full !min-w-0 !text-[15px]`}><span className="underline">O</span>K</button>
                            </span>
                            <span className="text-[12.5px] text-[#1b1f4b]">To Date</span>
                            <input type="checkbox" checked={vToOn} onChange={(e) => setVToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                            <input type="date" value={vTo} disabled={!vToOn} onChange={(e) => e.target.value && setVTo(e.target.value)} className={vToOn ? IN : OFF} />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => setFilter(false)} className="text-[12px] text-slate-600 underline">Back</button>
                        </div>
                    </fieldset>
                </div>
            )}
        </div>
    );

    const productRow = (
        <div className="grid grid-cols-[100px_150px_auto_170px_minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-2">
            <button type="button" onClick={() => { setFindFor('entry'); setFindProd(true); }} disabled={dis} className={findBtn}>Find Product</button>
            <input ref={codeRef} value={code} disabled={dis} onChange={(e) => { setCode(e.target.value); if (prod) setProd(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim()) loadProduct(code.trim()); else { setFindFor('entry'); setFindProd(true); } } }}
                placeholder="PID / bar code" className={IN} />
            {add ? <span className={lbl}>Expiry Date</span> : <span />}
            {add ? (
                <input type="date" value={exp} disabled={dis || !prod?.expiryApply} onChange={(e) => setExp(e.target.value)}
                    title={prod && !prod.expiryApply ? 'Expiry is not applied to this product' : undefined} className={prod?.expiryApply ? IN : OFF} />
            ) : <span />}
            <div className={RO} title={prod?.name}>{pn(prod?.name)}</div>
            <div className={RO} title={prod?.company}>{prod?.company || ''}</div>
        </div>
    );
    const staffSelect = (
        <select value={staffId} disabled={dis} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-7 !text-[12px] !font-normal`}>
            <option value="">Select any one</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
    );
    const qtyInput = (
        <input ref={qtyRef} value={qty} disabled={dis || !prod} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
    );

    return (
        <div className="h-screen overflow-hidden font-sans text-slate-900" style={{ background: C.bg }}>
            <FitStage width={1320} height={680} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;{WIN}{viewing ? '  —  viewing' : ''}</span>
                </div>

                {add ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
                        <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] px-2 pb-2 pt-0">
                            <legend className="px-1 text-[20px] font-bold text-[#1f2bd6]">{C.legend}</legend>
                            {productRow}
                            <div className="mt-1.5 grid grid-cols-[repeat(4,minmax(0,1fr))_110px_150px_150px_minmax(0,0.6fr)] items-end gap-2">
                                {['Qty (U)', 'Pur.Rate', 'Sale Rate', 'Retail Rate', 'Packing', 'Stock in Hand', 'Net Amt. Prod-wise', ''].map((h, i) => <span key={i} className={lbl}>{h}</span>)}
                                {qtyInput}
                                <input value={pur} disabled={dis || !prod} onChange={(e) => setPur(money(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
                                <input value={sale} disabled={dis || !prod} onChange={(e) => setSale(money(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
                                <input value={retail} disabled={dis || !prod} onChange={(e) => setRetail(money(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
                                <div className={`${RO} justify-end`}>{prod ? prod.packing : ''}</div>
                                <div className={`${RO} justify-end`}>{prod ? fmt(prod.stock) : ''}</div>
                                <div className={`${RO} justify-end`}>{netEntry ? fmt(netEntry) : ''}</div>
                                <span />
                            </div>
                        </fieldset>
                        <div className="grid shrink-0 grid-cols-[auto_150px_auto_150px_auto_220px_minmax(0,1fr)_200px_110px_110px] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                            <span className={lbl}>Date</span>
                            <input type="date" value={date} max={today()} disabled={dis} onChange={(e) => e.target.value && setDate(e.target.value)} className={IN} />
                            <span className={lbl}>Bill.No</span>
                            <input value={billNo} disabled={dis} onChange={(e) => setBillNo(e.target.value)} maxLength={50} className={IN} />
                            <span className={lbl}>Staff</span>
                            {staffSelect}
                            <span />
                            <Led label="Amt purchase" value={fmt(amount)} />
                            <button type="button" onClick={addLine} disabled={dis || !prod} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                            <button type="button" onClick={removeLine} disabled={dis || sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                        </div>
                        {grid}
                        <div className="grid shrink-0 grid-cols-[200px_220px_minmax(0,1fr)_auto_auto_auto_200px] items-end gap-3">
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>Voucher No</div>
                                <div className="flex h-8 items-center justify-center rounded-md bg-black font-mono text-[13px] text-[#3cff5a]">{voucherNo}</div>
                            </div>
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>{C.invLabel}</div>
                                <div className={`${FIELD} flex h-8 items-center justify-center border-slate-300 bg-[#e6e6ee] font-mono !text-[14px] text-[#1f2bd6]`}>{shownInv}</div>
                            </div>
                            <span />
                            {viewing ? (
                                <button type="button" onClick={addNew} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            ) : (
                                <button type="button" onClick={save} disabled={saving || !lines.length} className={ACTION_BTN}>
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                                </button>
                            )}
                            <button type="button" onClick={() => setFilter(true)} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                            <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                            <ReadBox value={<span className="w-full text-center text-[#1f2bd6]">Total Products = {lines.length}</span>} className="h-8 !text-[13px] !font-semibold" />
                        </div>
                    </div>
                ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_230px] gap-2.5 p-2.5">
                        <div className="flex min-h-0 flex-col gap-2">
                            <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] px-2 pb-2 pt-0">
                                <legend className="px-1 text-[20px] font-bold text-[#1f2bd6]">{C.legend}</legend>
                                {productRow}
                                <div className="mt-1.5 grid grid-cols-[110px_repeat(3,minmax(0,1fr))_170px_minmax(0,1fr)_100px_100px] items-end gap-2">
                                    {['Qty (U)', 'Pur.Rate', 'Sale Rate', 'Retail Rate', 'Exp Date', 'Sub Total', 'Stock', 'Packing'].map((h) => <span key={h} className={lbl}>{h}</span>)}
                                    {qtyInput}
                                    <div className={GREY}>{lot ? fmt(num(lot.cost_price)) : ''}</div>
                                    <div className={GREY}>{lot ? fmt(num(lot.selling_price)) : ''}</div>
                                    <div className={GREY}>{lot ? fmt(num(lot.retail_price)) : ''}</div>
                                    <select value={lotKey} disabled={dis || !prod || (prod?.lots.length || 0) < 2} onChange={(e) => { setLotKey(e.target.value); setFocusQty((n) => n + 1); }}
                                        className={`${FIELD} h-7 w-full border-slate-300 bg-[#e1e1e8] !px-1.5 !text-[12px] !font-normal text-slate-900 disabled:opacity-90`} aria-label="Expiry date">
                                        {!prod && <option value="" />}
                                        {prod && !prod.lots.length && <option value="">No stock</option>}
                                        {prod?.lots.map((l) => <option key={l.key} value={l.key}>{l.expiry_date ? dmy(l.expiry_date) : 'No expiry'}  —  {lotLeft(l)}</option>)}
                                    </select>
                                    <div className={`${RO} justify-end`}>{netEntry ? fmt(netEntry) : ''}</div>
                                    <div className={`${RO} justify-end`}>{lot ? fmt(lotLeft(lot)) : prod ? '0' : ''}</div>
                                    <div className={`${RO} justify-end`}>{prod ? prod.packing : ''}</div>
                                </div>
                            </fieldset>
                            <div className="grid shrink-0 grid-cols-[auto_150px_auto_150px_auto_220px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                                <span className={lbl}>Date</span>
                                <input type="date" value={date} max={today()} disabled={dis} onChange={(e) => e.target.value && setDate(e.target.value)} className={IN} />
                                <span className={lbl}>Bill.No</span>
                                <input value={billNo} disabled={dis} onChange={(e) => setBillNo(e.target.value)} maxLength={50} className={IN} />
                                <span className={lbl}>Staff</span>
                                {staffSelect}
                                <div className="flex h-7 items-center justify-center rounded-md border border-slate-400 bg-[#e1e1e8] text-[13px] font-semibold text-[#1f2bd6]">{C.what}</div>
                            </div>
                            {grid}
                        </div>
                        <div className="flex flex-col gap-2">
                            <Led label="Amt purchase" value={fmt(amount)} />
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={addLine} disabled={dis || !prod} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                                <button type="button" onClick={removeLine} disabled={dis || sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                            </div>
                            <ReadBox value={<span className="w-full text-center text-[#1f2bd6]">Total Products = {lines.length}</span>} className="h-8 !text-[13px] !font-semibold" />
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>{C.invLabel}</div>
                                <div className={`${FIELD} flex h-8 items-center justify-center border-slate-300 bg-[#e6e6ee] font-mono !text-[14px] text-[#1f2bd6]`}>{shownInv}</div>
                            </div>
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>Voucher No</div>
                                <div className="flex h-8 items-center justify-center rounded-md bg-black font-mono text-[13px] text-[#3cff5a]">{voucherNo}</div>
                            </div>
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
                )}
            </FitStage>

            {findProd && (
                <ReturnFindProductWindow companies={companies} askClose={askClose}
                    onPick={(r) => { setFindProd(false); if (findFor === 'view') setVPid(r.pid); else loadProduct(r.pid); }}
                    onClose={() => setFindProd(false)} onAddNew={() => openPopup('/admin/trade/product-detail')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
