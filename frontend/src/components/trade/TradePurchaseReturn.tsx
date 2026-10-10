"use client";

/*
 * Trade 1.0 — Purchase Return.
 *
 * Find Product (same window as in Sale) / PID → Exp Date (the stock batch),
 * product and company; Qty (U), Pur.Rate / Sale Rate / Retail Rate (from the
 * batch), Sub Total, Stock, Packing. Find Supp, Date, Bill.No, Less Amount,
 * Recevied Cash, Staff. Grid SNo / PID / Product Name / Pack / Qty(U) /
 * Exp.Date / Pur.Rate / Sale Rate / Retail.Rate / Sub Total. Right: Amt
 * purchase, Net Amount (less the Less Amount), Balance (the supplier's after
 * this return and the cash received), Add / Remove, Total Products, Purchase
 * Return Inv (R…), Voucher No, Save / View / Cancel. Save takes the units out of
 * stock and posts the voucher. View: Pur.Ret.Inv ID, Find Supp, From / To Date
 * → the saved lines (read only; Add New takes the place of Save).
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
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const fmt = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const money = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

type Lot = { key: string; batch: string; expiry_date: string | null; quantity: number; cost_price: any; selling_price: any; retail_price: any };
type Prod = { id: string; code: string; name: string; company: string; packing: number; lots: Lot[] };
type Line = {
    productId?: string; batch?: string; number?: string; date?: string; supplier?: string; pid: string; name: string; pack: number;
    expiry: string | null; qty: number; pur: number; sale: number; retail: number;
};

const RO = `${FIELD} flex h-7 w-full items-center border-[#e6b98a] bg-[#ffe3c7] px-2 !text-[12px] !font-normal text-slate-800`;
const IN = `${EDIT} h-7 w-full !text-[12px] !font-normal`;
const SMALL = `${IN} text-right`;
const COLS = [5, 7, 30, 5, 7, 9, 8, 8, 8, 13];
const HEADS = ['SNo', 'PID', 'Product Name', 'Pack', 'Qty(U)', 'Exp.Date', 'Pur.Rate', 'Sale Rate', 'Retail.Rate', 'Sub Total'];

export default function TradePurchaseReturn() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Purchase Return )'; }, []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const [companies, setCompanies] = useState<any[]>([]);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
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
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
        window.addEventListener('focus', loadAcc);
        return () => window.removeEventListener('focus', loadAcc);
    }, []);
    const supAccounts = useMemo(() => (accounts ? accounts.filter((a) => a.group === 2201) : null), [accounts]);

    const [retNo, setRetNo] = useState('…');
    const loadNo = () => api.get('v1/sales/trade-purchase-returns/next_no/').then(({ data }) => setRetNo(data.return_no)).catch(() => setRetNo('—'));
    useEffect(() => { loadNo(); }, []);
    const [voucherNo, setVoucherNo] = useState('');
    const [viewing, setViewing] = useState(false);

    // product entry
    const [code, setCode] = useState('');
    const [prod, setProd] = useState<Prod | null>(null);
    const [lotKey, setLotKey] = useState('');
    const [qty, setQty] = useState('');
    const [findProd, setFindProd] = useState(false);
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
            if (!lots.length) toast.error(`${p.name} has no stock to return.`);
            setProd({ id: p.id, code: p.code, name: p.name, company: p.company, packing: num(p.packing) || 1, lots });
            setCode(p.code); setLotKey(lots[0]?.key || ''); setQty('');
            setFocusQty((n) => n + 1);
        } catch { toast.error('Could not load the product.'); }
    };
    const addLine = () => {
        if (viewing) return;
        if (!prod) { toast.error('Find the product first.'); codeRef.current?.focus(); return; }
        if (!lot) { toast.error('This product has no stock.'); return; }
        const q = Math.round(num(qty));
        if (q <= 0) { toast.error('Enter Qty (U).'); qtyRef.current?.focus(); return; }
        const left = lotLeft(lot);
        if (q > left) { toast.error(`Only ${left} in stock${lot.expiry_date ? ` (exp ${dmy(lot.expiry_date)})` : ''}.`); qtyRef.current?.select(); return; }
        setLines((ls) => [...ls, {
            productId: prod.id, batch: lot.batch || undefined, pid: prod.code, name: prod.name, pack: prod.packing,
            expiry: lot.expiry_date, qty: q, pur: num(lot.cost_price), sale: num(lot.selling_price), retail: num(lot.retail_price),
        }]);
        setProd(null); setCode(''); setQty(''); setLotKey(''); setSel(-1); setVoucherNo('');
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (viewing) return;
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };

    // supplier / bill
    const [supCode, setSupCode] = useState('');
    const [sup, setSup] = useState<Acc | null>(null);
    const [supBal, setSupBal] = useState(0);
    const [date, setDate] = useState(today);
    const [billNo, setBillNo] = useState('');
    const [less, setLess] = useState('');
    const [received, setReceived] = useState('');
    const [staffId, setStaffId] = useState('');
    const [finder, setFinder] = useState<null | { target: 'sup' | 'view'; q: string }>(null);
    const [vSup, setVSup] = useState<Acc | null>(null);
    const [vSupCode, setVSupCode] = useState('');
    const pickSup = async (a: Acc, target: 'sup' | 'view') => {
        setFinder(null);
        if (target === 'view') { setVSup(a); setVSupCode(a.acc_id); return; }
        setSup(a); setSupCode(a.acc_id);
        try { const { data } = await api.get('v1/sales/vouchers/balance/', { params: { account: a.id } }); setSupBal(num(data.balance)); } catch { setSupBal(0); }
    };
    const resolveSup = (target: 'sup' | 'view') => {
        const c = (target === 'sup' ? supCode : vSupCode).trim();
        const hit = c ? (supAccounts || []).find((a) => a.acc_id === c) : null;
        if (hit) pickSup(hit, target); else setFinder({ target, q: /^\d+$/.test(c) ? '' : c });
    };

    const amount = lines.reduce((s, l) => s + l.qty * l.pur, 0);
    const net = viewing ? amount : Math.max(0, amount - num(less));
    // What we owe the supplier after this return (they owe us the net, less the cash they paid back).
    const balance = viewing ? 0 : supBal - net + num(received);

    const addNew = () => {
        setViewing(false); setLines([]); setSel(-1); setProd(null); setCode(''); setQty(''); setLotKey('');
        setSup(null); setSupCode(''); setSupBal(0); setBillNo(''); setLess(''); setReceived(''); setStaffId('');
        setDate(today()); setVoucherNo(''); loadNo();
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const missing = [!sup && 'the supplier', !lines.length && 'a product'].filter(Boolean) as string[];
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (saving || viewing) return;
        if (missing.length) { toast.error(`Add ${missing.join(' and ')}.`); return; }
        if (num(less) > amount + 0.001) { toast.error('Less Amount is more than the return amount.'); return; }
        if (num(received) > net + 0.001) { toast.error('Recevied Cash is more than the Net Amount.'); return; }
        setAsk({
            msg: `Save Purchase Return ${retNo} to ${sup!.name} for ${fmt(net)} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-purchase-returns/', {
                        supplier: sup!.id, date, bill_no: billNo.trim(), less: num(less), received: num(received), staff: staffId || null,
                        lines: lines.map((l) => ({ product: l.productId, batch: l.batch || null, qty: l.qty })),
                    });
                    toast.success(`Purchase Return ${data.return_no} saved — ${fmt(num(data.net))}${data.voucher_no ? `, voucher ${data.voucher_no}` : ''}.`, { duration: 6000 });
                    addNew();
                    setVoucherNo(data.voucher_no || '');
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the return.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // View Purchase Return Detail
    const [filter, setFilter] = useState(false);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const [loadingView, setLoadingView] = useState(false);
    const runView = async () => {
        const params: any = {};
        if (vNo.trim()) params.return_no = vNo.trim();
        if (vSup) params.supplier = vSup.id;
        if (vFromOn) params.date_from = vFrom;
        if (vToOn) params.date_to = vTo;
        setFilter(false); setLoadingView(true);
        try {
            const { data } = await api.get('v1/sales/trade-purchase-returns/', { params });
            setViewing(true); setSel(-1); setProd(null); setCode(''); setQty(''); setLotKey(''); setVoucherNo('');
            setLines(data.map((r: any) => ({
                number: r.return_no, date: String(r.date).slice(0, 10), supplier: r.supplier, pid: r.pid, name: r.name, pack: num(r.pack),
                expiry: r.expiry_date, qty: num(r.qty), pur: num(r.pur_rate), sale: num(r.sale_rate), retail: num(r.retail_rate),
            })));
            if (!data.length) toast('Nothing found for this search.');
        } catch { toast.error('Could not load.'); }
        finally { setLoadingView(false); }
    };
    const invs = useMemo(() => Array.from(new Set(lines.map((l) => l.number).filter(Boolean))), [lines]);
    const shownInv = viewing ? (invs.length === 1 ? invs[0] : invs.length ? `${invs.length} returns` : '') : retNo;
    const viewSupplier = viewing ? Array.from(new Set(lines.map((l) => l.supplier).filter(Boolean))).join(', ') : '';

    const gridKeys = (e: React.KeyboardEvent) => {
        if (!lines.length) return;
        if (e.key === 'Delete' && !viewing) { e.preventDefault(); removeLine(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        setSel((i) => Math.min(lines.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    };

    const closeWindow = () => askClose(closeTradeWindow, !viewing && lines.length ? 'The return is not saved. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[12px] font-medium text-[#1b1f4b]';
    const findBtn = 'h-7 shrink-0 whitespace-nowrap rounded-md border border-[#c9b85a] bg-gradient-to-b from-[#ffffd6] to-[#f4ef9c] px-2.5 text-[12px] font-semibold text-slate-800 shadow-sm hover:to-[#ece27a] active:translate-y-px disabled:opacity-50';
    const subTotal = lot && num(qty) > 0 ? num(qty) * num(lot.cost_price) : 0;
    const dis = viewing;

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1320} height={680} className="flex flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                    <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Purchase Return ){viewing ? '  —  viewing' : ''}</span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
                    {/* Product */}
                    <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] px-2 pb-2 pt-0">
                        <legend className="px-1 text-[20px] font-bold text-[#1f2bd6]">Purchase Return</legend>
                        <div className="grid grid-cols-[100px_150px_auto_200px_minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-2">
                            <button type="button" onClick={() => setFindProd(true)} disabled={dis} className={findBtn}>Find Product</button>
                            <input ref={codeRef} value={code} disabled={dis} onChange={(e) => { setCode(e.target.value); if (prod) setProd(null); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim()) loadProduct(code.trim()); else setFindProd(true); } }}
                                placeholder="PID / bar code" className={IN} />
                            <span className={lbl}>Exp Date</span>
                            <select value={lotKey} disabled={dis || !prod || (prod?.lots.length || 0) < 2} onChange={(e) => { setLotKey(e.target.value); setFocusQty((n) => n + 1); }}
                                className={`${FIELD} h-7 w-full border-[#e6b98a] bg-[#ffe3c7] !px-1.5 !text-[12px] !font-normal text-slate-900 disabled:opacity-90`} aria-label="Expiry date">
                                {!prod && <option value="" />}
                                {prod && !prod.lots.length && <option value="">No stock</option>}
                                {prod?.lots.map((l) => <option key={l.key} value={l.key}>{l.expiry_date ? dmy(l.expiry_date) : 'No expiry'}  —  {lotLeft(l)} in stock</option>)}
                            </select>
                            <div className={RO} title={prod?.name}>{pn(prod?.name)}</div>
                            <div className={RO} title={prod?.company}>{prod?.company || ''}</div>
                        </div>
                        <div className="mt-1.5 grid grid-cols-[110px_repeat(4,minmax(0,1fr))_minmax(0,1.3fr)_90px_90px] items-end gap-2">
                            {['Qty (U)', 'Pur.Rate', 'Sale Rate', 'Retail Rate', 'Sub Total', '', 'Stock', 'Packing'].map((h, i) => <span key={i} className={lbl}>{h}</span>)}
                            <input ref={qtyRef} value={qty} disabled={dis || !prod} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} className={`${IN} !bg-white text-right`} />
                            <div className={`${RO} justify-end`}>{lot ? fmt(num(lot.cost_price)) : ''}</div>
                            <div className={`${RO} justify-end`}>{lot ? fmt(num(lot.selling_price)) : ''}</div>
                            <div className={`${RO} justify-end`}>{lot ? fmt(num(lot.retail_price)) : ''}</div>
                            <div className={`${RO} justify-end`}>{subTotal ? fmt(subTotal) : ''}</div>
                            <span />
                            <div className={`${RO} justify-end`}>{lot ? fmt(lotLeft(lot)) : prod ? '0' : ''}</div>
                            <div className={`${RO} justify-end`}>{prod ? prod.packing : ''}</div>
                        </div>
                    </fieldset>

                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_230px] gap-2.5">
                        <div className="flex min-h-0 flex-col gap-2">
                            {/* Supplier / bill */}
                            <div className="flex shrink-0 flex-col gap-1.5 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                                <div className="grid grid-cols-[96px_140px_auto_150px_minmax(0,1fr)] items-center gap-2">
                                    <button type="button" onClick={() => setFinder({ target: 'sup', q: '' })} disabled={dis} className={findBtn}>Find Supp</button>
                                    <input value={supCode} disabled={dis} onChange={(e) => { setSupCode(e.target.value); if (sup) setSup(null); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); resolveSup('sup'); } }} placeholder="Supplier ID" className={IN} />
                                    <span className={lbl}>Date</span>
                                    <input type="date" value={date} max={today()} disabled={dis} onChange={(e) => e.target.value && setDate(e.target.value)} className={IN} />
                                    <ReadBox value={viewing ? viewSupplier : (sup ? sup.name : '')} className="h-7 !text-[12px] !font-normal" />
                                </div>
                                <div className="grid grid-cols-[auto_130px_auto_130px_auto_130px_auto_minmax(0,1fr)] items-center gap-2">
                                    <span className={lbl}>Bill.No</span>
                                    <input value={billNo} disabled={dis} onChange={(e) => setBillNo(e.target.value)} maxLength={50} className={IN} />
                                    <span className={lbl}>Less Amount</span>
                                    <input value={less} disabled={dis} onChange={(e) => setLess(money(e.target.value))} className={SMALL} />
                                    <span className={lbl}>Recevied Cash</span>
                                    <input value={received} disabled={dis} onChange={(e) => setReceived(money(e.target.value))} className={SMALL} />
                                    <span className={lbl}>Staff</span>
                                    <select value={staffId} disabled={dis} onChange={(e) => setStaffId(e.target.value)} className={`${COA_SELECT} h-7 !text-[12px] !font-normal`}>
                                        <option value="">Select any one</option>
                                        {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Lines */}
                            <div tabIndex={0} onKeyDown={gridKeys} className="relative min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                                <table className="w-full table-fixed border-collapse bg-white text-[12px]">
                                    <colgroup>{(viewing ? [9, 8.5, 6, 25, 4, 6, 8.5, 7, 7, 7, 10] : COLS).map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                        <tr>{(viewing ? ['Pur.Ret.Inv', 'Date', ...HEADS.slice(1)] : HEADS).map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => (
                                            <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? (viewing ? 'bg-[#7dfa7d]' : 'bg-[#2f5bd3] text-white') : 'hover:bg-indigo-50'}`}>
                                                {[...(viewing ? [l.number, dmy(l.date)] : [i + 1]), l.pid, pn(l.name), l.pack, fmt(l.qty), dmy(l.expiry), fmt(l.pur), fmt(l.sale), fmt(l.retail), fmt(l.qty * l.pur)].map((v, k, arr) => (
                                                    <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= arr.length - 7 && k !== arr.length - 5 ? 'text-right' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!lines.length && (
                                            <tr><td colSpan={viewing ? 11 : 10} className="px-3 py-4 text-center text-slate-400">
                                                {loadingView ? 'Loading…' : viewing ? 'Nothing found.' : 'Find the product, choose the Exp Date, enter Qty (U), press Add.'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>

                                {filter && (
                                    <div className="absolute inset-0 flex items-start justify-center bg-slate-900/20 pt-8"
                                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); runView(); } }}>
                                        <fieldset className="w-[600px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-5 pb-4 pt-1 shadow-xl">
                                            <legend className="px-2 text-[14px] font-semibold text-[#1f2bd6]">View Purchase Return Detail</legend>
                                            <div className="grid grid-cols-[120px_24px_minmax(0,1fr)_150px] items-center gap-x-3 gap-y-2.5">
                                                <span className="text-[12.5px] text-[#1b1f4b]">Pur.Ret.Inv ID</span><span />
                                                <input autoFocus value={vNo} onChange={(e) => setVNo(e.target.value)} placeholder="All" className={IN} />
                                                <ReadBox value={vSup ? vSup.name : ''} className="h-7 !text-[12px] !font-normal" />
                                                <button type="button" onClick={() => setFinder({ target: 'view', q: '' })} className={findBtn}>Find Supp</button><span />
                                                <input value={vSupCode} onChange={(e) => { setVSupCode(e.target.value); if (vSup) setVSup(null); }}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); resolveSup('view'); } }} placeholder="Any supplier" className={IN} />
                                                <span />
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
                        <div className="flex flex-col gap-1.5">
                            <Led label="Amt purchase" value={fmt(amount)} />
                            <Led label="Net Amount" value={fmt(net)} />
                            <Led label="Balance" value={viewing || !sup ? '' : fmt(balance)} />
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={addLine} disabled={dis || !prod} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                                <button type="button" onClick={removeLine} disabled={dis || sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                            </div>
                            <ReadBox value={<span className="w-full text-center text-[#1f2bd6]">Total Products = {lines.length}</span>} className="h-8 !text-[13px] !font-semibold" />
                            <div>
                                <div className={`${LABEL} mb-0.5 text-[13px]`}>Purchase Return Inv</div>
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
                                <button type="button" onClick={save} disabled={saving || missing.length > 0} title={missing.length ? `To save, add ${missing.join(' and ')}.` : undefined} className={ACTION_BTN}>
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setFilter(true)} className={`${ACTION_BTN} !min-w-0`}><span className="underline">V</span>iew</button>
                                <button type="button" onClick={closeWindow} className={`${ACTION_BTN} !min-w-0`}><span className="underline">C</span>ancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </FitStage>

            {findProd && (
                <ReturnFindProductWindow companies={companies} askClose={askClose}
                    onPick={(r) => { setFindProd(false); loadProduct(r.pid); }}
                    onClose={() => setFindProd(false)} onAddNew={() => openPopup('/admin/trade/product-detail')} />
            )}
            {finder && (
                <FindAccountWindow accounts={supAccounts} cashOnly={false} initial={finder.q} askClose={askClose}
                    onPick={(a) => pickSup(a, finder.target)} onClose={() => setFinder(null)}
                    onAddNew={() => openPopup('/admin/trade/chart-of-account')} />
            )}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}
        </div>
    );
}
