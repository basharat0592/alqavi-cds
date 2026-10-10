"use client";

/*
 * Trade 1.0 — Damage Stock (Add) and Un-Damage Stock (Less).
 *
 * Find Product (same window as in Sale) / PID → Product, Company, Carton and
 * Stock; Exp Date picks the stock batch (Add) or the damaged lot (Less) and
 * fills Pur / Sale / Retail Rate. Qty (P) in pieces → Add / Remove into the
 * Inv.No / Date / SNo / PID / Product Name / Carton / Exp.Date / Qty / P/Rate /
 * S/Rate / R/Rate / Sub Total / Staff grid. Right: Amt purchase, Total
 * Products, the D- (Add) or U- (Less) invoice number, Voucher No, Save / View /
 * Cancel. Save moves the units out of (Add) or back into (Less) saleable stock
 * and posts the voucher (Demage Inventory ↔ Inventory) at the purchase rate.
 * View: Inv ID, Find Product, From / To Date → the saved lines (read only;
 * Add New takes the place of Save).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');

type Lot = { key: string; batch: string; expiry_date: string | null; quantity: number; cost_price: any; selling_price: any; retail_price: any };
type Prod = { id: string; code: string; name: string; company: string; carton: number; lots: Lot[] };
type Line = {
    productId?: string; batch?: string; number: string; date: string; pid: string; name: string; carton: number;
    expiry: string | null; qty: number; pur: number; sale: number; retail: number; staff: string; voucher?: string;
};

const RO = `${FIELD} flex h-7 w-full items-center border-[#e6b98a] bg-[#ffe3c7] px-2 !text-[12px] !font-normal text-slate-800`;
const GREY = `${FIELD} flex h-7 w-full items-center justify-end border-slate-300 bg-[#ececf3] px-2 !text-[12px] !font-normal text-slate-800`;
const IN = `${EDIT} h-7 w-full !text-[12px] !font-normal`;
const COLS = [9, 8, 4, 6, 20, 5, 8, 5, 6, 6, 6, 8, 9];
const HEADS = ['Inv.No', 'Date', 'SNo', 'PID', 'Product Name', 'Carton', 'Exp.Date', 'Qty', 'P/Rate', 'S/Rate', 'R/Rate', 'Sub Total', 'Staff'];

export default function TradeDamageStock({ kind }: { kind: 'add' | 'less' }) {
    const add = kind === 'add';
    const WIN = add ? '(Damage (Add) Stock)' : '( Damage(Less) Stock )';
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
    const loadNo = () => api.get('v1/sales/trade-damage/next_no/', { params: { kind } }).then(({ data }) => setInvNo(data.number)).catch(() => setInvNo('—'));
    useEffect(() => { loadNo(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [voucherNo, setVoucherNo] = useState('');
    const [viewing, setViewing] = useState(false);

    const [date, setDate] = useState(today);
    const [staffId, setStaffId] = useState('');
    const staffName = staffList.find((s) => s.id === staffId)?.name || '';

    // entry
    const [code, setCode] = useState('');
    const [prod, setProd] = useState<Prod | null>(null);
    const [lotKey, setLotKey] = useState('');
    const [qty, setQty] = useState('');
    const [findProd, setFindProd] = useState(false);
    const codeRef = useRef<HTMLInputElement>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    // Focus Qty (P) once the loaded product has rendered (the box is disabled until then).
    const [focusQty, setFocusQty] = useState(0);
    useEffect(() => { if (focusQty) requestAnimationFrame(() => qtyRef.current?.focus()); }, [focusQty]);
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const lot = prod?.lots.find((l) => l.key === lotKey) || null;
    const usedIn = (key: string) => lines.filter((l) => !viewing && `${l.productId}|${l.batch || ''}|${l.expiry || ''}` === key).reduce((s, l) => s + l.qty, 0);
    const lotLeft = (l: Lot) => l.quantity - usedIn(`${prod?.id}|${l.batch}|${l.expiry_date || ''}`);

    const loadProduct = async (c: string) => {
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: c } });
            const p = data[0];
            if (!p) { toast.error('Product not found.'); return; }
            let lots: Lot[];
            if (add) {
                lots = (p.batches || []).map((b: any) => ({ key: `b${b.id}`, batch: b.id, expiry_date: b.expiry_date, quantity: num(b.quantity), cost_price: b.cost_price, selling_price: b.selling_price, retail_price: b.retail_price }));
                if (!lots.length && num(p.stock) > 0) lots = [{ key: 'p', batch: '', expiry_date: null, quantity: num(p.stock), cost_price: p.cost_price, selling_price: p.selling_price, retail_price: p.retail_price }];
            } else {
                const { data: dm } = await api.get('v1/sales/trade-damage/damaged/', { params: { product: p.id } });
                lots = (dm || []).map((r: any, i: number) => ({ key: `d${i}`, batch: '', expiry_date: r.expiry_date, quantity: num(r.quantity), cost_price: r.cost_price, selling_price: r.selling_price, retail_price: r.retail_price }));
            }
            if (!lots.length) { toast.error(add ? `${p.name} has no stock to mark as damaged.` : `${p.name} has no damaged stock.`); }
            setProd({ id: p.id, code: p.code, name: p.name, company: p.company, carton: num(p.carton), lots });
            setCode(p.code); setLotKey(lots[0]?.key || ''); setQty('');
            setFocusQty((n) => n + 1);
        } catch { toast.error('Could not load the product.'); }
    };

    const addLine = () => {
        if (viewing) return;
        if (!prod) { toast.error('Find the product first.'); codeRef.current?.focus(); return; }
        if (!lot) { toast.error(add ? 'This product has no stock.' : 'This product has no damaged stock.'); return; }
        const q = Math.round(num(qty));
        if (q <= 0) { toast.error('Enter Qty (P).'); qtyRef.current?.focus(); return; }
        const left = lotLeft(lot);
        if (q > left) { toast.error(`Only ${left} ${add ? 'in stock' : 'damaged'}${lot.expiry_date ? ` (exp ${dmy(lot.expiry_date)})` : ''}.`); qtyRef.current?.select(); return; }
        setLines((ls) => [...ls, {
            productId: prod.id, batch: lot.batch || undefined, number: invNo, date, pid: prod.code, name: prod.name, carton: prod.carton,
            expiry: lot.expiry_date, qty: q, pur: num(lot.cost_price), sale: num(lot.selling_price), retail: num(lot.retail_price), staff: staffName,
        }]);
        setProd(null); setCode(''); setQty(''); setLotKey(''); setSel(-1); setVoucherNo('');
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (viewing) return;
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };
    // Date / Staff apply to every line of the new invoice.
    useEffect(() => { if (!viewing) setLines((ls) => ls.map((l) => ({ ...l, date, staff: staffName, number: invNo }))); }, [date, staffName, invNo]); // eslint-disable-line react-hooks/exhaustive-deps

    const amount = lines.reduce((s, l) => s + l.qty * l.pur, 0);
    const cartons = (q: number, c: number) => (c > 0 ? (q % c ? `${Math.floor(q / c)} + ${q % c}` : String(q / c)) : '');

    const addNew = () => {
        setViewing(false); setLines([]); setSel(-1); setProd(null); setCode(''); setQty(''); setLotKey('');
        setDate(today()); setVoucherNo(''); loadNo();
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (saving || viewing) return;
        if (!lines.length) { toast.error('Add a product.'); return; }
        setAsk({
            msg: `Save ${add ? 'Damage Stock' : 'Un-Damage Stock'} ${invNo} (${lines.length} item${lines.length === 1 ? '' : 's'}, ${fmt(amount)}) ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-damage/', {
                        kind, date, staff: staffId || null,
                        lines: lines.map((l) => ({ product: l.productId, batch: l.batch || null, expiry_date: l.expiry, qty: l.qty })),
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

    // View Damage Stock Detail
    const [filter, setFilter] = useState(false);
    const [vNo, setVNo] = useState('');
    const [vPid, setVPid] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const [findFor, setFindFor] = useState<'entry' | 'view'>('entry');
    const [loadingView, setLoadingView] = useState(false);
    const runView = async () => {
        const params: any = { kind };
        if (vNo.trim()) params.number = vNo.trim();
        if (vPid.trim()) params.pid = vPid.trim();
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false); setLoadingView(true);
        try {
            const { data } = await api.get('v1/sales/trade-damage/', { params });
            setViewing(true); setSel(-1); setProd(null); setCode(''); setQty(''); setLotKey('');
            setLines(data.map((r: any) => ({
                number: r.number, date: String(r.date).slice(0, 10), pid: r.pid, name: r.name, carton: num(r.carton), expiry: r.expiry_date,
                qty: num(r.qty), pur: num(r.pur_rate), sale: num(r.sale_rate), retail: num(r.retail_rate), staff: r.staff, voucher: r.voucher_no,
            })));
            if (!data.length) toast('Nothing found for this search.');
        } catch { toast.error('Could not load.'); }
        finally { setLoadingView(false); }
    };
    const invs = useMemo(() => Array.from(new Set(lines.map((l) => l.number))), [lines]);
    const shownInv = viewing ? (invs.length === 1 ? invs[0] : invs.length ? `${invs.length} invoices` : '') : invNo;
    const shownVoucher = viewing ? (invs.length === 1 ? lines[0]?.voucher || '' : '') : voucherNo;

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
    const led = 'flex h-9 items-center justify-end overflow-hidden rounded-md border border-black bg-gradient-to-b from-[#0b0b0b] to-[#1c1c1c] px-3 font-mono tabular-nums text-[#3cff5a] shadow-inner';
    const subTotal = lot && num(qty) > 0 ? num(qty) * num(lot.cost_price) : 0;

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1300} height={660} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;{WIN}{viewing ? '  —  viewing' : ''}</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
                    <div className="mx-auto shrink-0 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e4e4ee] px-16 py-0.5 text-[22px] font-bold text-[#1f2bd6] shadow-sm">
                        {add ? 'Damage  Stock' : 'Un-Damage  Stock'}
                    </div>

                    {/* Product */}
                    <div className="grid shrink-0 grid-cols-[96px_150px_minmax(0,1.4fr)_minmax(0,1fr)_auto_70px_auto_90px] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                        <button type="button" onClick={() => { setFindFor('entry'); setFindProd(true); }} disabled={viewing} className={findBtn}>Find Product</button>
                        <input ref={codeRef} value={code} disabled={viewing} onChange={(e) => { setCode(e.target.value); if (prod) setProd(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim()) loadProduct(code.trim()); else { setFindFor('entry'); setFindProd(true); } } }}
                            placeholder="PID / bar code" className={IN} />
                        <div className={RO} title={prod?.name}>{pn(prod?.name)}</div>
                        <div className={RO} title={prod?.company}>{prod?.company || ''}</div>
                        <span className={lbl}>Carton</span>
                        <div className={`${RO} justify-end`}>{prod?.carton || ''}</div>
                        <span className={lbl}>{add ? 'Stock' : 'Damaged'}</span>
                        <div className={`${RO} justify-end`}>{lot ? fmt(lotLeft(lot)) : prod ? '0' : ''}</div>
                    </div>
                    <div className="grid shrink-0 grid-cols-[auto_90px_auto_100px_auto_100px_auto_100px_auto_minmax(0,1fr)_auto_120px] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                        <span className={lbl}>Qty (P)</span>
                        <input ref={qtyRef} value={qty} disabled={viewing || !prod} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} text-right`} />
                        <span className={lbl}>Pur.Rate</span><div className={GREY}>{lot ? fmt(num(lot.cost_price)) : ''}</div>
                        <span className={lbl}>Sale Rate</span><div className={GREY}>{lot ? fmt(num(lot.selling_price)) : ''}</div>
                        <span className={lbl}>Retail Rate</span><div className={GREY}>{lot ? fmt(num(lot.retail_price)) : ''}</div>
                        <span className={lbl}>Exp Date</span>
                        <select value={lotKey} disabled={viewing || !prod || (prod?.lots.length || 0) < 2} onChange={(e) => { setLotKey(e.target.value); setFocusQty((n) => n + 1); }}
                            className={`${FIELD} h-7 w-full border-cyan-300 bg-[#d5fbff] !px-1.5 !text-[12px] !font-normal text-slate-900 disabled:opacity-80`} aria-label="Expiry date">
                            {!prod && <option value="" />}
                            {prod && !prod.lots.length && <option value="">{add ? 'No stock' : 'Nothing damaged'}</option>}
                            {prod?.lots.map((l) => <option key={l.key} value={l.key}>{l.expiry_date ? dmy(l.expiry_date) : 'No expiry'}  —  {lotLeft(l)} {add ? 'in stock' : 'damaged'}</option>)}
                        </select>
                        <span className={lbl}>Sub Total</span><div className={`${RO} justify-end`}>{subTotal ? fmt(subTotal) : ''}</div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_230px] gap-2.5">
                        <div className="flex min-h-0 flex-col gap-2">
                            <div className="grid shrink-0 grid-cols-[auto_160px_auto_220px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                                <span className={lbl}>Date</span>
                                <input type="date" value={date} max={today()} disabled={viewing} onChange={(e) => e.target.value && setDate(e.target.value)} className={IN} />
                                <span className={lbl}>Staff</span>
                                <select value={staffId} disabled={viewing} onChange={(e) => setStaffId(e.target.value)} className={`${IN} !px-1.5`}>
                                    <option value="">Select any one</option>
                                    {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="flex h-7 items-center justify-center rounded-md border border-slate-400 bg-[#e1e1e8] text-[13px] font-semibold text-[#1f2bd6]">
                                    {add ? 'Damage Stock (Add)' : 'Damage Stock (Less)'}
                                </div>
                            </div>

                            <div tabIndex={0} onKeyDown={gridKeys} className="relative min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                                <table className="w-full min-w-[980px] table-fixed border-collapse bg-white text-[12px]">
                                    <colgroup>{COLS.map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                        <tr>{HEADS.map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => (
                                            <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? (viewing ? 'bg-[#7dfa7d]' : 'bg-[#2f5bd3] text-white') : 'hover:bg-indigo-50'}`}>
                                                {[l.number, dmy(l.date), i + 1, l.pid, pn(l.name), cartons(l.qty, l.carton), dmy(l.expiry), fmt(l.qty), fmt(l.pur), fmt(l.sale), fmt(l.retail), fmt(l.qty * l.pur), l.staff].map((v, k) => (
                                                    <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 || k === 5 || (k >= 7 && k <= 11) ? 'text-right' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!lines.length && (
                                            <tr><td colSpan={13} className="px-3 py-4 text-center text-slate-400">
                                                {loadingView ? 'Loading…' : viewing ? 'Nothing found.' : `Find the product, choose the Exp Date, enter Qty (P), press Add.`}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>

                                {filter && (
                                    <div className="absolute inset-0 flex items-start justify-center bg-slate-900/20 pt-8"
                                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); runView(); } }}>
                                        <fieldset className="w-[560px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                                            <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">View Damage Stock ({add ? 'Add' : 'Less'}) Detail</legend>
                                            <div className="grid grid-cols-[130px_24px_minmax(0,1fr)_130px] items-center gap-x-3 gap-y-2.5">
                                                <span className="text-[12.5px] text-[#1b1f4b]">{add ? 'Damage.Inv ID' : 'Un-Damage.Inv ID'}</span><span />
                                                <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} /><span />
                                                <button type="button" onClick={() => { setFindFor('view'); setFindProd(true); }} className={findBtn}>Find Product</button><span />
                                                <input value={vPid} onChange={(e) => setVPid(e.target.value)} placeholder="Any product (PID / bar code)" className={IN} /><span />
                                                <span className="text-[12.5px] text-[#1b1f4b]">From Date</span>
                                                <input type="checkbox" checked={vFromOn} onChange={(e) => setVFromOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                                <input type="date" value={vFrom} disabled={!vFromOn} onChange={(e) => e.target.value && setVFrom(e.target.value)}
                                                    className={`${FIELD} h-7 w-full !text-[12px] !font-normal ${vFromOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-400'}`} />
                                                <span className="row-span-2 flex items-center">
                                                    <button type="button" onClick={runView} className={`${ACTION_BTN} !h-14 w-full !min-w-0 !text-[15px]`}><span className="underline">O</span>K</button>
                                                </span>
                                                <span className="text-[12.5px] text-[#1b1f4b]">To Date</span>
                                                <input type="checkbox" checked={vToOn} onChange={(e) => setVToOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                                <input type="date" value={vTo} disabled={!vToOn} onChange={(e) => e.target.value && setVTo(e.target.value)}
                                                    className={`${FIELD} h-7 w-full !text-[12px] !font-normal ${vToOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-400'}`} />
                                            </div>
                                            <div className="mt-3 flex justify-end">
                                                <button type="button" onClick={() => setFilter(false)} className="text-[12px] text-slate-600 underline">Back</button>
                                            </div>
                                        </fieldset>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right panel */}
                        <div className="flex flex-col gap-2">
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>Amt purchase</div>
                                <div className={`${led} text-[22px]`}>{fmt(amount)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={addLine} disabled={viewing || !prod} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                                <button type="button" onClick={removeLine} disabled={viewing || sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                            </div>
                            <ReadBox value={<span className="w-full text-center text-[#1f2bd6]">Total Products = {lines.length}</span>} className="h-8 !text-[13px] !font-semibold" />
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>{add ? 'Damage Stock Inv.No' : 'Damage(Less) Stock Inv.'}</div>
                                <div className={`${FIELD} flex h-9 items-center justify-center border-slate-300 bg-[#e6e6ee] font-mono !text-[14px] text-[#1f2bd6]`}>{shownInv}</div>
                            </div>
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>Voucher No</div>
                                <div className={`${led} justify-center text-[14px]`}>{shownVoucher}</div>
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
                </div>
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
