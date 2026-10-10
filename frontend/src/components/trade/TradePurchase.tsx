"use client";

/*
 * Trade 1.0 — Purchase Product.
 *
 * Top: Find Product (same window as in Sale) / PID, Exp Date, product and
 * company; Qty(Ctn) / Qty(U) / Total Units / Bonus(U) / Purchase Value /
 * Pur.Rate / Retail Rate / S.R % / Sale Rate / %Profit Retail / %Profit TP /
 * Sub Total / Stock / Packing. Middle: Find Supp (supplier accounts, Find
 * Account window with Add New → Chart of Account), Date, Bill.No, Extra Disc,
 * Freight (city to city), Fare, Goods, Extra Tax Amt, Paid Cash, Staff, Show
 * Previous Purchase History.
 * Grid of lines; history grid below. Right: Amt purchase / Amt Bonus / Net
 * Amount / Balance, Add / Remove, Total Products, Purchase.Inv, Voucher No,
 * Save / View / Cancel. Saving adds a stock batch per line.
 *
 * S.R % is the sale rate's discount on the retail rate:
 *   Sale Rate = Retail Rate × (1 − S.R % / 100).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { pn, tip } from '@/lib/productName';
import { openPopup } from '@/lib/popup';
import {
    Modal, ConfirmBox, ReadBox, Led, LABEL, FIELD, EDIT, ACTION_BTN, COA_SELECT, closeTradeWindow, ReturnFindProductWindow,
} from '@/components/trade/TradeSaleInvoice';
import { FindAccountWindow, type Acc } from '@/components/trade/TradeReceiptVoucher';
import FitStage from '@/components/trade/FitStage';

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => r2(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const plusYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };
const dmy = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('-') : '');
const isSupplierAcc = (a: Acc) => a.group === 2201;

type Prod = { id: string; code: string; name: string; company: string; packing: number; carton: number; stock: number;
    cost_price: number; selling_price: number; retail_price: number; expiry_apply?: boolean };
type Line = { product: Prod; qty: number; bonus: number; expiry: string | null; pur: number; sale: number; retail: number };
const EMPTY = { qtyC: '', qtyU: '', bonus: '', value: '', pur: '', retail: '', sr: '', sale: '' };

const SMALL = `${EDIT} h-7 w-full px-1.5 text-right !text-[12px] !font-normal`;
const RO = `${FIELD} flex h-7 w-full items-center justify-end border-[#e6b98a] bg-[#ffe3c7] px-1.5 !text-[12px] !font-normal text-slate-800`;

export default function TradePurchase() {
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });
    useEffect(() => { document.title = 'AL-QAVI TRADERS  Trade 1.0  ( Purchase Product )'; }, []);

    const [accounts, setAccounts] = useState<Acc[] | null>(null);
    const loadAccounts = () => api.get('v1/company/ledger-accounts/').then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
    const [companies, setCompanies] = useState<any[]>([]);
    useEffect(() => {
        loadAccounts();
        (async () => {
            const all: any[] = [];
            try {
                for (let page = 1; page <= 20; page++) {
                    const { data } = await api.get('v1/company/companies/', { params: { page, page_size: 100 } });
                    if (Array.isArray(data)) { all.push(...data); break; }
                    all.push(...(data.results || []));
                    if (!data.next) break;
                }
            } catch { /* optional filter */ }
            setCompanies(all.sort((a, b) => String(a.name).localeCompare(String(b.name))));
        })();
        const f = () => loadAccounts();
        window.addEventListener('focus', f);
        return () => window.removeEventListener('focus', f);
    }, []);
    const supAccounts = useMemo(() => (accounts ? accounts.filter(isSupplierAcc) : null), [accounts]);
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => setStaff((data || []).filter((x: any) => x.status === 'active')
            .map((x: any) => ({ id: String(x.id), name: x.name })))).catch(() => setStaff([]));
    }, []);

    const [purNo, setPurNo] = useState('…');
    const loadNo = () => api.get('v1/sales/trade-purchases/next_no/').then(({ data }) => setPurNo(data.purchase_no)).catch(() => setPurNo('—'));
    useEffect(() => { loadNo(); }, []);
    const [voucherNo, setVoucherNo] = useState('');

    // ── entry row ──
    const [code, setCode] = useState('');
    const [prod, setProd] = useState<Prod | null>(null);
    const [expOn, setExpOn] = useState(false);
    const [exp, setExp] = useState(plusYear);
    const [e, setE] = useState({ ...EMPTY });
    const codeRef = useRef<HTMLInputElement>(null);
    const qtyCRef = useRef<HTMLInputElement>(null);
    const perCarton = prod ? (prod.carton || prod.packing || 1) : 1;
    const units = num(e.qtyC) * perCarton + num(e.qtyU);
    const pur = num(e.pur), retail = num(e.retail), sale = num(e.sale);
    const sub = units * pur;
    const profitRetail = pur > 0 && retail > 0 ? ((retail - pur) / pur) * 100 : 0;
    const profitTP = pur > 0 && sale > 0 ? ((sale - pur) / pur) * 100 : 0;
    const setF = (k: keyof typeof EMPTY) => (ev: React.ChangeEvent<HTMLInputElement>) => {
        const v = ev.target.value.replace(/[^\d.]/g, '');
        setE((x) => {
            const n = { ...x, [k]: v };
            const u = num(k === 'qtyC' ? v : n.qtyC) * perCarton + num(k === 'qtyU' ? v : n.qtyU);
            if (k === 'value' && u > 0) n.pur = String(r2(num(v) / u));
            if (k === 'pur' || k === 'qtyC' || k === 'qtyU') n.value = u > 0 && num(n.pur) > 0 ? String(r2(u * num(n.pur))) : n.value;
            if (k === 'sr' && num(n.retail) > 0) n.sale = String(r2(num(n.retail) * (1 - num(v) / 100)));
            if (k === 'retail' && n.sr !== '') n.sale = String(r2(num(v) * (1 - num(n.sr) / 100)));
            if (k === 'sale' && num(n.retail) > 0) n.sr = String(r2((1 - num(v) / num(n.retail)) * 100));
            return n;
        });
    };
    const next = (id: string) => (ev: React.KeyboardEvent) => {
        if (ev.key !== 'Enter') return;
        ev.preventDefault();
        if (id === 'add') { addLine(); return; }
        (document.getElementById(id) as HTMLInputElement | null)?.focus();
    };

    const loadProduct = async (codeOrId: string) => {
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: codeOrId } });
            const p: Prod | undefined = data[0];
            if (!p) { toast.error('Product not found.'); return; }
            setProd(p); setCode(p.code);
            setE({ ...EMPTY, pur: p.cost_price ? String(r2(num(p.cost_price))) : '', retail: p.retail_price ? String(r2(num(p.retail_price))) : '',
                sale: p.selling_price ? String(r2(num(p.selling_price))) : '',
                sr: num(p.retail_price) > 0 && num(p.selling_price) > 0 ? String(r2((1 - num(p.selling_price) / num(p.retail_price)) * 100)) : '' });
            setExpOn(!!p.expiry_apply); setExp(plusYear());
            loadHistory({ product: p.id });
            setFocusQty((n) => n + 1);
        } catch { toast.error('Could not load the product.'); }
    };
    const [findProd, setFindProd] = useState(false);
    // Focus the first quantity box once the loaded product is on screen.
    const [focusQty, setFocusQty] = useState(0);
    useEffect(() => {
        if (!focusQty || !prod) return;
        const id = prod.carton > 0 ? 'pf-qtyc' : 'pf-qtyu';
        requestAnimationFrame(() => (document.getElementById(id) as HTMLInputElement | null)?.focus());
    }, [focusQty, prod]);

    // ── supplier / bill ──
    const [supCode, setSupCode] = useState('');
    const [sup, setSup] = useState<Acc | null>(null);
    const [supBal, setSupBal] = useState(0);
    const [date, setDate] = useState(today);
    const [billNo, setBillNo] = useState('');
    const [extraDisc, setExtraDisc] = useState('');
    const [freight, setFreight] = useState('');
    const [fare, setFare] = useState('');
    const [goods, setGoods] = useState('');
    const [tax, setTax] = useState('');
    const [paid, setPaid] = useState('');
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

    // ── lines ──
    const [lines, setLines] = useState<Line[]>([]);
    const [sel, setSel] = useState(-1);
    const addLine = () => {
        if (!prod) { toast.error('Find the product first.'); codeRef.current?.focus(); return; }
        const qty = Math.round(units), bonus = Math.round(num(e.bonus));
        if (qty <= 0 && bonus <= 0) { toast.error('Enter the quantity.'); qtyCRef.current?.focus(); return; }
        if (qty > 0 && pur <= 0) { toast.error('Enter the purchase rate.'); return; }
        if (expOn && !exp) { toast.error('Choose the expiry date.'); return; }
        setLines((ls) => [...ls, { product: prod, qty, bonus, expiry: expOn ? exp : null, pur, sale, retail }]);
        setProd(null); setCode(''); setE({ ...EMPTY }); setSel(-1);
        setTimeout(() => codeRef.current?.focus(), 0);
    };
    const removeLine = () => {
        if (sel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setLines((ls) => ls.filter((_, i) => i !== sel)); setSel(-1);
    };
    const amtPurchase = lines.reduce((s, l) => s + l.qty * l.pur, 0);
    const amtBonus = lines.reduce((s, l) => s + l.bonus * l.pur, 0);
    const net = amtPurchase - num(extraDisc) + num(freight) + num(fare) + num(goods) + num(tax);
    const balance = supBal + net - num(paid);
    const totalPieces = lines.reduce((s, l) => s + l.qty, 0);
    const totalBonus = lines.reduce((s, l) => s + l.bonus, 0);
    const cartonsOf = (l: Line) => (l.product.carton > 0 ? Math.floor(l.qty / l.product.carton) : 0);

    // ── history (bottom grid) ──
    const [history, setHistory] = useState<any[]>([]);
    const [histLabel, setHistLabel] = useState('');
    const loadHistory = async (q: { product?: string; supplier?: number }) => {
        try {
            if (q.product) { const { data } = await api.get('v1/sales/trade-purchases/product_history/', { params: { product: q.product } }); setHistory(data); setHistLabel('this product'); }
            else if (q.supplier) { const { data } = await api.get('v1/sales/trade-purchases/', { params: { supplier: q.supplier } }); setHistory(data); setHistLabel('this supplier'); }
        } catch { setHistory([]); }
    };
    const showHistory = () => {
        if (prod) loadHistory({ product: prod.id });
        else if (sup) loadHistory({ supplier: sup.id });
        else toast.error('Find a product or a supplier first.');
    };

    // ── save ──
    const missing = [!sup && 'the supplier', !lines.length && 'a product line'].filter(Boolean) as string[];
    const resetForm = () => {
        setLines([]); setSel(-1); setProd(null); setCode(''); setE({ ...EMPTY }); setSup(null); setSupCode(''); setSupBal(0);
        setBillNo(''); setExtraDisc(''); setFreight(''); setFare(''); setGoods(''); setTax(''); setPaid(''); setStaffId(''); setDate(today()); setHistory([]); loadNo();
    };
    const [saving, setSaving] = useState(false);
    const save = () => {
        if (saving) return;
        if (missing.length) { toast.error(`Add ${missing.join(' and ')}.`); return; }
        if (num(paid) > net + 0.001) { toast.error('Paid Cash is more than the Net Amount.'); return; }
        setAsk({
            msg: `Save Purchase ${purNo} from ${sup!.name} for ${fmt(net)} ?`,
            yes: async () => {
                setSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-purchases/', {
                        supplier: sup!.id, date, bill_no: billNo.trim(), extra_disc: num(extraDisc), freight: num(freight), fare: num(fare), goods: num(goods), tax: num(tax),
                        paid: num(paid), staff: staffId || null,
                        lines: lines.map((l) => ({ product: l.product.id, qty: l.qty, bonus: l.bonus, expiry_date: l.expiry,
                            pur_rate: l.pur, sale_rate: l.sale, retail_rate: l.retail })),
                    });
                    toast.success(`Purchase ${data.purchase_no} saved${data.voucher_no ? ` — Voucher ${data.voucher_no}` : ''}.`);
                    setVoucherNo(data.voucher_no || '');
                    resetForm();
                } catch (err: any) {
                    const d = err?.response?.data;
                    toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the purchase.'), { duration: 7000 });
                } finally { setSaving(false); }
            },
        });
    };

    // ── View Purchase Detail ──
    const [view, setView] = useState<null | { rows: any[] | null; filter: boolean }>(null);
    const [vNo, setVNo] = useState('');
    const [vFromOn, setVFromOn] = useState(false); const [vFrom, setVFrom] = useState(today);
    const [vToOn, setVToOn] = useState(false); const [vTo, setVTo] = useState(today);
    const runView = async () => {
        setView({ rows: null, filter: false });
        try {
            const params: any = {};
            if (vNo.trim()) params.purchase_no = vNo.trim();
            if (vSup) params.supplier = vSup.id;
            if (vFromOn) params.date_from = vFrom;
            if (vToOn) params.date_to = vTo;
            const { data } = await api.get('v1/sales/trade-purchases/', { params });
            setView({ rows: data, filter: false });
        } catch { toast.error('Could not load purchases.'); setView({ rows: [], filter: false }); }
    };
    const vRows = view?.rows || [];

    const closeWindow = () => askClose(closeTradeWindow, lines.length ? 'The purchase is not saved. Do you want to Close the Form ?' : undefined);
    const lbl = 'whitespace-nowrap text-[11.5px] font-medium text-[#1b1f4b]';
    const findBtn = 'h-7 shrink-0 rounded-md border border-[#c9b85a] bg-gradient-to-b from-[#ffffd6] to-[#f4ef9c] px-2.5 text-[12px] font-semibold text-slate-800 shadow-sm hover:to-[#ece27a] active:translate-y-px';

    return (
        <div className="h-screen overflow-hidden bg-[#c9c9f9] font-sans text-slate-900">
            <FitStage width={1360} height={720} className="flex flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Purchase Product )</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-2">
                {/* Product entry */}
                <div className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                    <div className="grid grid-cols-[110px_150px_auto_auto_150px_minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-2">
                        <button type="button" onClick={() => setFindProd(true)} className={findBtn}>Find Product</button>
                        <input ref={codeRef} value={code} onChange={(ev) => { setCode(ev.target.value); if (prod) setProd(null); }}
                            onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (code.trim()) loadProduct(code.trim()); else setFindProd(true); } }}
                            placeholder="PID / bar code" className={`${EDIT} h-7 w-full !text-[12px] !font-normal`} />
                        <span className={`${lbl} pl-1`}>Exp Date</span>
                        <input type="checkbox" checked={expOn} onChange={(ev) => setExpOn(ev.target.checked)} title="Product has an expiry date" className="h-4 w-4 accent-[#3b3f8f]" />
                        <input type="date" value={exp} disabled={!expOn} onChange={(ev) => ev.target.value && setExp(ev.target.value)}
                            className={`${FIELD} h-7 w-full !text-[12px] !font-normal ${expOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-400'}`} />
                        <div className={`${RO} !justify-start !font-semibold`} title={prod?.name}>{pn(prod?.name)}</div>
                        <div className={`${RO} !justify-start`} title={prod?.company}>{prod?.company || ''}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5">
                        {['Qty (Ctn)', 'Qty (U)', 'Total Units', 'Bonus (U)', 'Purchase Value', 'Pur.Rate', 'Retail Rate', 'S.R %', 'Sale Rate', '%Profit Retail', '%Profit TP', 'Sub Total', 'Stock', 'Packing'].map((h) => (
                            <span key={h} className={`${lbl} truncate`} title={h}>{h}</span>
                        ))}
                        <input id="pf-qtyc" ref={qtyCRef} value={e.qtyC} onChange={setF('qtyC')} onKeyDown={next('pf-qtyu')} disabled={!prod || !(prod.carton > 0)}
                            title={prod && !(prod.carton > 0) ? 'No carton size set (Product Detail › Carton)' : `${perCarton} pcs per carton`} className={`${SMALL} disabled:opacity-50`} />
                        <input id="pf-qtyu" value={e.qtyU} onChange={setF('qtyU')} onKeyDown={next('pf-bonus')} className={SMALL} />
                        <div className={RO}>{units ? fmt(units) : ''}</div>
                        <input id="pf-bonus" value={e.bonus} onChange={setF('bonus')} onKeyDown={next('pf-pur')} className={SMALL} />
                        <input id="pf-value" value={e.value} onChange={setF('value')} onKeyDown={next('pf-retail')} className={SMALL} />
                        <input id="pf-pur" value={e.pur} onChange={setF('pur')} onKeyDown={next('pf-retail')} className={SMALL} />
                        <input id="pf-retail" value={e.retail} onChange={setF('retail')} onKeyDown={next('pf-sr')} className={SMALL} />
                        <input id="pf-sr" value={e.sr} onChange={setF('sr')} onKeyDown={next('pf-sale')} className={SMALL} />
                        <input id="pf-sale" value={e.sale} onChange={setF('sale')} onKeyDown={next('add')} className={SMALL} />
                        <div className={RO}>{profitRetail ? `${fmt(profitRetail)}%` : ''}</div>
                        <div className={RO}>{profitTP ? `${fmt(profitTP)}%` : ''}</div>
                        <div className={RO}>{sub ? fmt(sub) : ''}</div>
                        <div className={RO}>{prod ? fmt(num(prod.stock)) : ''}</div>
                        <div className={RO}>{prod ? `${prod.packing}${prod.carton ? ` / ${prod.carton}` : ''}` : ''}</div>
                    </div>
                </div>

                <div className="mt-2 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_230px] gap-2">
                    <div className="flex min-h-0 min-w-0 flex-col gap-2">
                        {/* Supplier + bill */}
                        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_150px] gap-2 rounded-lg border border-[#9da1d8] bg-[#d9d9fb] p-2">
                            <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-[96px_140px_auto_150px_minmax(0,1fr)] items-center gap-2">
                                    <button type="button" onClick={() => setFinder({ target: 'sup', q: '' })} className={findBtn}>Find Supp</button>
                                    <input value={supCode} onChange={(ev) => { setSupCode(ev.target.value); if (sup) setSup(null); }}
                                        onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); resolveSup('sup'); } }} placeholder="Supplier ID" className={`${EDIT} h-7 w-full !text-[12px] !font-normal`} />
                                    <span className={lbl}>Date</span>
                                    <input type="date" value={date} max={today()} onChange={(ev) => ev.target.value && setDate(ev.target.value)} className={`${EDIT} h-7 w-full !text-[12px] !font-normal`} />
                                    <ReadBox value={sup ? sup.name : ''} className="h-7 !text-[12px] !font-normal" />
                                </div>
                                <div className="grid grid-cols-[minmax(0,1.2fr)_repeat(6,minmax(0,1fr))_minmax(0,1.6fr)] items-end gap-2">
                                    {['Bill.No', 'Extra Disc', 'Freight', 'Fare', 'Goods', 'Extra Tax Amt', 'Paid Cash', 'Staff'].map((h) => (
                                        <span key={h} className={lbl} title={h === 'Freight' ? 'Freight (city to city)' : undefined}>{h}</span>
                                    ))}
                                    <input value={billNo} onChange={(ev) => setBillNo(ev.target.value)} maxLength={50} className={`${EDIT} h-7 w-full !text-[12px] !font-normal`} />
                                    <input value={extraDisc} onChange={(ev) => setExtraDisc(ev.target.value.replace(/[^\d.]/g, ''))} className={SMALL} />
                                    <input value={freight} onChange={(ev) => setFreight(ev.target.value.replace(/[^\d.]/g, ''))} title="Freight (city to city)" className={SMALL} />
                                    <input value={fare} onChange={(ev) => setFare(ev.target.value.replace(/[^\d.]/g, ''))} title="Fare" className={SMALL} />
                                    <input value={goods} onChange={(ev) => setGoods(ev.target.value.replace(/[^\d.]/g, ''))} title="Goods" className={SMALL} />
                                    <input value={tax} onChange={(ev) => setTax(ev.target.value.replace(/[^\d.]/g, ''))} className={SMALL} />
                                    <input value={paid} onChange={(ev) => setPaid(ev.target.value.replace(/[^\d.]/g, ''))} className={SMALL} />
                                    <select value={staffId} onChange={(ev) => setStaffId(ev.target.value)} className={`${COA_SELECT} h-7 !text-[12px] !font-normal`}>
                                        <option value="">Select any one</option>
                                        {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="button" onClick={showHistory}
                                className="rounded-md border border-emerald-500 bg-gradient-to-b from-[#d6ffd6] to-[#a8f0a8] px-2 text-[12.5px] font-bold leading-tight text-[#0b3d0b] shadow-sm hover:to-[#8fe68f]">
                                Show Previous Purchase History
                            </button>
                        </div>

                        {/* Lines */}
                        <div className="min-h-0 flex-[3] overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full table-fixed border-collapse bg-white text-[11.5px]">
                                <colgroup>{[4.5, 7, 22, 6.5, 6, 7, 6, 9.5, 8, 8, 8, 9.5].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['SNo', 'PID', 'Product Name', 'Carton', 'Pack', 'Qty(U)', 'Bonus', 'Exp.Date', 'Pur.Rate', 'Sale Rate', 'Retail.Rate', 'Sub Total'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, i) => (
                                        <tr key={i} onClick={() => setSel(i)} className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                            {[i + 1, l.product.code, pn(l.product.name), cartonsOf(l) || '', l.product.packing, fmt(l.qty), l.bonus || '', dmy(l.expiry),
                                              fmt(l.pur), fmt(l.sale), fmt(l.retail), fmt(l.qty * l.pur)].map((v, k) => (
                                                <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 3 && k !== 7 ? 'text-right' : ''} `}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!lines.length && <tr><td colSpan={12} className="px-3 py-4 text-center text-slate-400">Find the product, enter quantity and rates, press Add.</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        {/* Previous purchase history */}
                        <div className="min-h-0 flex-[2] overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full table-fixed border-collapse bg-[#ffffcf] text-[11.5px]">
                                <colgroup>{[10, 8.5, 18, 6.5, 20, 6, 6, 8.5, 8, 8.5].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 bg-[#ffe1b8] text-left">
                                    <tr>{['Pur.Inv', 'Date', 'Supplier', 'PID', 'Product Name', 'Qty', 'Bonus', 'Exp.Date', 'Pur.Rate', 'Sale Rate'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i} className="tabular-nums">
                                            {[h.purchase_no, dmy(h.date), h.supplier, h.pid, pn(h.name), fmt(num(h.qty)), num(h.bonus) || '', dmy(h.expiry_date), fmt(num(h.pur_rate)), fmt(num(h.sale_rate))].map((v, k) => (
                                                <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-0.5 ${k >= 5 && k !== 7 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!history.length && <tr><td colSpan={10} className="px-3 py-3 text-center text-slate-500">Previous purchases of the product (or supplier) show here.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {history.length > 0 && <div className="-mt-1 shrink-0 text-[11px] text-[#1f2bd6]">Previous purchases of {histLabel}: {history.length} line(s)</div>}
                    </div>

                    {/* Right panel */}
                    <div className="flex min-h-0 flex-col gap-1.5 [&_.text-\[16px\]]:!text-[13px] [&_.text-\[22px\]]:!text-[18px] [&_.h-10]:!h-8">
                        <Led label="Amt purchase" value={fmt(amtPurchase)} />
                        <Led label="Amt Bonus" value={fmt(amtBonus)} />
                        <Led label="Net Amount" value={fmt(net)} />
                        <Led label="Balance" value={sup ? fmt(balance) : fmt(net - num(paid))} tone="yellow" />
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={addLine} disabled={!prod} className={`${ACTION_BTN} !min-w-0`}><span className="underline">A</span>dd</button>
                            <button type="button" onClick={removeLine} disabled={sel < 0} className={`${ACTION_BTN} !min-w-0`}><span className="underline">R</span>emove</button>
                        </div>
                        <ReadBox value={<span className="w-full text-center font-bold text-[#1f2bd6]">Total Products = {fmt(totalPieces)}{totalBonus ? ` (+${fmt(totalBonus)})` : ''}</span>} />
                        <span className={`${LABEL} text-[14px]`}>Purchase . Inv</span>
                        <ReadBox value={<span className="font-mono font-bold text-[#1f2bd6]">{purNo}</span>} />
                        <span className={`${LABEL} text-[14px]`}>Voucher No</span>
                        <div className="flex h-9 items-center justify-center rounded-md bg-black font-mono text-[15px] font-bold text-[#3cff5a]">{voucherNo}</div>
                        {missing.length > 0 && <span className="text-[11.5px] text-slate-600">To save, add {missing.join(' and ')}.</span>}
                        <button type="button" onClick={save} disabled={saving || missing.length > 0} className={ACTION_BTN}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
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
                <Modal title="Purchase Product" onClose={() => askClose(() => setView(null))} full>
                    <div className="relative flex min-h-0 flex-1 flex-col gap-2 bg-[#c9c9f9] p-3">
                        <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-500 bg-[#8a8a8a]">
                            <table className="w-full min-w-[1150px] table-fixed border-collapse bg-white text-[12px]">
                                <colgroup>{[9, 7.5, 7, 15, 6, 19, 5.5, 5, 7.5, 7, 7, 8.5].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['Pur.Inv', 'Date', 'Bill.No', 'Supplier', 'PID', 'Product Name', 'Qty', 'Bonus', 'Exp.Date', 'Pur.Rate', 'Sale Rate', 'Sub Total'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {vRows.map((r, i) => (
                                        <tr key={i} className={`tabular-nums ${i > 0 && vRows[i - 1].purchase_no !== r.purchase_no ? 'border-t-2 border-t-slate-400' : ''}`}>
                                            {[r.purchase_no, dmy(r.date), r.bill_no, r.supplier, r.pid, pn(r.name), fmt(num(r.qty)), num(r.bonus) || '', dmy(r.expiry_date), fmt(num(r.pur_rate)), fmt(num(r.sale_rate)), fmt(num(r.sub_total))].map((v, k) => (
                                                <td key={k} title={tip(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k >= 6 && k !== 8 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {view.rows && !vRows.length && <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">No purchases for this search.</td></tr>}
                                    {!view.rows && !view.filter && <tr><td colSpan={12} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {vRows.length}</span>} className="w-[220px]" />
                            <span className={`${LABEL} text-[15px]`}>Total</span>
                            <div className={`${FIELD} flex h-9 w-[180px] items-center justify-end border-sky-300 bg-[#c9f6ff] font-bold`}>{fmt(vRows.reduce((s, r) => s + num(r.sub_total), 0))}</div>
                            <span className="flex-1" />
                            <button type="button" onClick={() => setView({ rows: view.rows, filter: true })} className={ACTION_BTN}>Search</button>
                            <button type="button" onClick={() => { setView(null); resetForm(); }} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>
                            <button type="button" onClick={() => askClose(() => setView(null))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                        </div>

                        {view.filter && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                                <fieldset className="w-[620px] rounded-md border-2 border-[#1f2bd6] bg-[#e4e4fb] px-6 pb-5 pt-1 shadow-xl">
                                    <legend className="px-2 text-[16px] font-bold text-[#1f2bd6]">View Purchase Detail</legend>
                                    <div className="grid grid-cols-[130px_auto_1fr] items-center gap-x-3 gap-y-3">
                                        <span className={`${LABEL} text-[15px]`}>Pur.Inv ID</span><span />
                                        <input autoFocus value={vNo} onChange={(ev) => setVNo(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') runView(); }}
                                            placeholder="All" className={`${EDIT} w-full`} />
                                        <button type="button" onClick={() => setFinder({ target: 'view', q: '' })} className={findBtn}>Find Supp</button>
                                        <span />
                                        <div className="flex gap-2">
                                            <input value={vSupCode} onChange={(ev) => { setVSupCode(ev.target.value); if (vSup) setVSup(null); }}
                                                onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); resolveSup('view'); } }} placeholder="Any supplier" className={`${EDIT} w-[130px]`} />
                                            <ReadBox value={vSup ? vSup.name : ''} className="flex-1" />
                                        </div>
                                        <span className={`${LABEL} text-[15px]`}>From Date</span>
                                        <input type="checkbox" checked={vFromOn} onChange={(ev) => setVFromOn(ev.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                        <input type="date" value={vFrom} disabled={!vFromOn} onChange={(ev) => ev.target.value && setVFrom(ev.target.value)}
                                            className={`${FIELD} w-full ${vFromOn ? 'border-emerald-300 bg-[#e3fbe3]' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                                        <span className={`${LABEL} text-[15px]`}>To Date</span>
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
