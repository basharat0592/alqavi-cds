"use client";

/*
 * Trade 1.0 — Sale Invoice window.
 *
 * A faithful web version of the legacy desktop "Sale Invoice" form: same fields,
 * same order, same workflow (find customer → product code → quantities → Add →
 * lines drop into the grid), with a cleaner look. Runs in its own pop-up window.
 *
 * Sales are booked on credit against the customer (Net Balance = Prev. Bal +
 * Net Amount), DELIVERED immediately, drawing stock from the chosen batch.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Loader2, Printer, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '@/lib/axios';
import { companyService, orderService } from '@/lib/api';

/* ───────────────────────── types & helpers ───────────────────────── */
type Batch = {
    id: string; expiry_date: string | null; quantity: number;
    cost_price: number; selling_price: number; retail_price: number;
};
type LookupProduct = {
    id: string; code: string; name: string; company: string; packing: number; stock: number;
    cost_price: number; selling_price: number; retail_price: number; batches: Batch[];
};
type Line = {
    productId: string; code: string; name: string; company: string;
    batchId: string; expiry: string | null;
    qty: number; bonus: number; tp: number; retail: number; discPct: number; cost: number;
};
type Entry = {
    product: LookupProduct | null; batchId: string;
    code: string; qtyP: string; qtyU: string; bonus: string; tp: string; discPct: string;
};

const EMPTY_ENTRY: Entry = { product: null, batchId: '', code: '', qtyP: '', qtyU: '', bonus: '', tp: '', discPct: '' };

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => round2(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const ymd = (iso: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, '') : '—');
const custCode = (c: any) => String(c?.username || '').replace(/^cust/i, '');
const custName = (c: any) => `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || c?.username || '';

const lineGross = (l: Line) => l.qty * l.tp;
const lineDisc = (l: Line) => lineGross(l) * (l.discPct / 100);
const lineNet = (l: Line) => lineGross(l) - lineDisc(l);
const lineCost = (l: Line) => (l.qty + l.bonus) * l.cost;

/* ───────────────────────── small styled pieces ───────────────────────── */
const LABEL = 'text-[13px] font-bold tracking-tight text-[#1b1f4b] whitespace-nowrap';
const FIELD = 'h-9 w-full rounded-md border px-2.5 text-[13.5px] font-semibold tabular-nums outline-none transition-shadow';
const EDIT = `${FIELD} border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`;
const READ = `${FIELD} border-slate-300 bg-[#ececf3] text-slate-700`;

function ReadBox({ value, className = '' }: { value: React.ReactNode; className?: string }) {
    return <div className={`${READ} flex items-center overflow-hidden whitespace-nowrap ${className}`}>{value}</div>;
}

function Led({ label, value, tone = 'green' }: { label: string; value: string; tone?: 'green' | 'yellow' }) {
    return (
        <div className="min-w-0">
            <div className="mb-1 text-[17px] font-black tracking-tight text-[#1b1f4b]">{label}</div>
            <div className={`flex h-12 items-center justify-end overflow-hidden rounded-md border border-black bg-gradient-to-b from-[#0b0b0b] to-[#1c1c1c] px-3 font-mono text-[24px] font-black tabular-nums shadow-inner ${tone === 'yellow' ? 'text-[#ffe14d]' : 'text-[#3cff5a]'}`}>
                {value}
            </div>
        </div>
    );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-6 pt-16 backdrop-blur-[1px] print:static print:bg-white print:p-0" onMouseDown={onClose}>
            <div className={`flex max-h-[80vh] w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl print:max-h-none print:border-0 print:shadow-none`} onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between bg-gradient-to-r from-[#3b3f8f] to-[#5a5fc4] px-4 py-2 text-white print:hidden">
                    <span className="text-[14px] font-bold">{title}</span>
                    <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/20" aria-label="Close"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ───────────────────────── main window ───────────────────────── */
export default function TradeSaleInvoice() {
    // Customer
    const [customers, setCustomers] = useState<any[]>([]);
    const [customer, setCustomer] = useState<any | null>(null);
    const [custInput, setCustInput] = useState('');
    const [prevBal, setPrevBal] = useState(0);
    const [showFindCust, setShowFindCust] = useState(false);
    const [custQuery, setCustQuery] = useState('');

    // Entry row + grid
    const [entry, setEntry] = useState<Entry>({ ...EMPTY_ENTRY });
    const [lines, setLines] = useState<Line[]>([]);
    const [selected, setSelected] = useState(-1);

    // Product search
    const [showFindProd, setShowFindProd] = useState(false);
    const [prodQuery, setProdQuery] = useState('');
    const [prodResults, setProdResults] = useState<LookupProduct[]>([]);
    const [prodSearching, setProdSearching] = useState(false);

    // Invoice
    const [invoiceNo, setInvoiceNo] = useState('…');
    const [showPR, setShowPR] = useState(false);
    const [showPV, setShowPV] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('F2 Find Customer · F3 Find Product · Enter moves to the next field · F9 Invoice PV');

    const custRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const qtyPRef = useRef<HTMLInputElement>(null);
    const qtyURef = useRef<HTMLInputElement>(null);
    const bonRef = useRef<HTMLInputElement>(null);
    const tpRef = useRef<HTMLInputElement>(null);
    const discRef = useRef<HTMLInputElement>(null);

    useEffect(() => { document.title = "AL-QAVI TRADERS  Trade 1.0  ( Sale Invoice )"; }, []);

    const loadInvoiceNo = useCallback(() => {
        api.get('v1/sales/orders/next_invoice_no/')
            .then(({ data }) => setInvoiceNo(data.invoice_no))
            .catch(() => setInvoiceNo('—'));
    }, []);

    useEffect(() => {
        loadInvoiceNo();
        companyService.getCustomers().then(setCustomers).catch(() => setCustomers([]));
        custRef.current?.focus();
    }, [loadInvoiceNo]);

    useEffect(() => {
        if (!customer) { setPrevBal(0); return; }
        orderService.getCustomerBalance(String(customer.id))
            .then((b: any) => setPrevBal(num(b?.previous_balance)))
            .catch(() => setPrevBal(0));
    }, [customer]);

    // Don't let a refresh/close silently drop an unsaved invoice.
    useEffect(() => {
        if (!lines.length) return;
        const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [lines.length]);

    /* ── customer ── */
    const pickCustomer = (c: any) => {
        setCustomer(c);
        setCustInput(custCode(c));
        setShowFindCust(false);
        setCustQuery('');
        setStatus(`Customer: ${custName(c)}${c.area_name ? ` — ${c.area_name}` : ''}`);
        setTimeout(() => codeRef.current?.focus(), 0);
    };

    const resolveCustomer = () => {
        const q = custInput.trim().toLowerCase();
        if (!q) { setShowFindCust(true); return; }
        const hit = customers.find((c) => custCode(c).toLowerCase() === q);
        if (hit) pickCustomer(hit);
        else { setCustQuery(custInput.trim()); setShowFindCust(true); }
    };

    const custMatches = useMemo(() => {
        const q = custQuery.trim().toLowerCase();
        const list = customers.filter((c) => c.is_active !== false);
        if (!q) return list.slice(0, 200);
        return list.filter((c) =>
            custCode(c).toLowerCase().includes(q) || custName(c).toLowerCase().includes(q) ||
            String(c.area_name || '').toLowerCase().includes(q) || String(c.phone || '').includes(q)).slice(0, 200);
    }, [customers, custQuery]);

    /* ── product ── */
    // Units of a batch already placed on this invoice (so we never oversell it).
    const usedInBatch = (batchId: string) =>
        lines.filter((l) => l.batchId === batchId).reduce((s, l) => s + l.qty + l.bonus, 0);

    const applyBatch = (p: LookupProduct, batchId: string, keep?: Partial<Entry>) => {
        const b = p.batches.find((x) => x.id === batchId);
        setEntry((e) => ({
            ...e, ...keep, product: p, batchId,
            code: p.code,
            tp: String(round2(num(b?.selling_price) || num(p.selling_price))),
        }));
    };

    const loadProduct = (p: LookupProduct) => {
        // First in-stock batch = nearest expiry (FEFO), like the legacy picker.
        const first = p.batches.find((b) => b.quantity - usedInBatch(b.id) > 0) || p.batches[0];
        setEntry({ ...EMPTY_ENTRY });
        applyBatch(p, first?.id || '');
        setShowFindProd(false);
        setStatus(p.batches.length
            ? `${p.name} — ${p.batches.length} batch(es) in stock`
            : `${p.name} has no stock batches.`);
        setTimeout(() => qtyPRef.current?.focus(), 0);
    };

    const resolveCode = async () => {
        const code = entry.code.trim();
        if (!code) { setShowFindProd(true); return; }
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code } });
            if (data.length) loadProduct(data[0]);
            else { setProdQuery(code); setShowFindProd(true); }
        } catch { toast.error('Product lookup failed.'); }
    };

    // Debounced name search inside the Find Product popup.
    useEffect(() => {
        if (!showFindProd) return;
        const q = prodQuery.trim();
        if (q.length < 2) { setProdResults([]); return; }
        setProdSearching(true);
        const t = setTimeout(() => {
            api.get('v1/products/items/sale_lookup/', { params: { q } })
                .then(({ data }) => setProdResults(data))
                .catch(() => setProdResults([]))
                .finally(() => setProdSearching(false));
        }, 250);
        return () => clearTimeout(t);
    }, [prodQuery, showFindProd]);

    /* ── entry maths ── */
    const p = entry.product;
    const batch = p?.batches.find((b) => b.id === entry.batchId) || null;
    const packing = p?.packing || 1;
    const totalUnits = num(entry.qtyP) * packing + num(entry.qtyU);
    const bonus = num(entry.bonus);
    const tp = num(entry.tp);
    const discPct = num(entry.discPct);
    const subTotal = totalUnits * tp;
    const discAmt = subTotal * (discPct / 100);
    const entryNet = subTotal - discAmt;
    const purRate = num(batch?.cost_price) || num(p?.cost_price);
    const entryProfit = entryNet - (totalUnits + bonus) * purRate;
    const entryProfitPct = purRate > 0 && totalUnits + bonus > 0 ? (entryProfit / ((totalUnits + bonus) * purRate)) * 100 : 0;
    const batchLeft = batch ? batch.quantity - usedInBatch(batch.id) : 0;

    const addLine = () => {
        if (!p) { toast.error('Enter a product code first.'); codeRef.current?.focus(); return; }
        if (!batch) { toast.error('This product has no stock batch to sell from.'); return; }
        if (totalUnits <= 0) { toast.error('Enter a quantity.'); qtyPRef.current?.focus(); return; }
        if (totalUnits + bonus > batchLeft) {
            toast.error(`Only ${batchLeft} unit(s) left in batch ${ymd(batch.expiry_date)}.`);
            return;
        }
        setLines((ls) => [...ls, {
            productId: p.id, code: p.code, name: p.name, company: p.company,
            batchId: batch.id, expiry: batch.expiry_date,
            qty: totalUnits, bonus, tp, retail: num(batch.retail_price) || num(p.retail_price),
            discPct, cost: purRate,
        }]);
        setStatus(`Added ${p.name} × ${totalUnits}${bonus ? ` + ${bonus} bonus` : ''}`);
        setEntry({ ...EMPTY_ENTRY });
        setSelected(-1);
        codeRef.current?.focus();
    };

    const removeLine = () => {
        if (selected < 0 || selected >= lines.length) { toast.error('Select a line in the grid to remove.'); return; }
        setStatus(`Removed ${lines[selected].name}`);
        setLines((ls) => ls.filter((_, i) => i !== selected));
        setSelected(-1);
    };

    // Double-click a grid line to pull it back into the entry row for editing.
    const editLine = async (i: number) => {
        const l = lines[i];
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: l.code } });
            const prod: LookupProduct | undefined = data[0];
            if (!prod) return;
            setLines((ls) => ls.filter((_, k) => k !== i));
            setSelected(-1);
            setEntry({ ...EMPTY_ENTRY });
            applyBatch(prod, l.batchId, { qtyU: String(l.qty), bonus: l.bonus ? String(l.bonus) : '', discPct: l.discPct ? String(l.discPct) : '' });
            setEntry((e) => ({ ...e, tp: String(l.tp) }));
            setStatus(`Editing ${l.name} — press Add to put it back`);
            setTimeout(() => qtyURef.current?.focus(), 0);
        } catch { toast.error('Could not load that line.'); }
    };

    /* ── invoice totals ── */
    const amountBilled = lines.reduce((s, l) => s + lineGross(l), 0);
    const totalDisc = lines.reduce((s, l) => s + lineDisc(l), 0);
    const netAmount = amountBilled - totalDisc;
    const netBalance = prevBal + netAmount;
    const invPurValue = lines.reduce((s, l) => s + lineCost(l), 0);
    const invProfit = netAmount - invPurValue;
    const invProfitPct = invPurValue > 0 ? (invProfit / invPurValue) * 100 : 0;

    /* ── save ── */
    const resetInvoice = () => {
        setLines([]); setSelected(-1); setEntry({ ...EMPTY_ENTRY });
        setCustomer(null); setCustInput(''); setPrevBal(0);
        loadInvoiceNo();
        setTimeout(() => custRef.current?.focus(), 0);
    };

    const saveInvoice = async (print: boolean) => {
        if (saving) return;
        if (!customer) { toast.error('Find a customer first.'); return; }
        if (!lines.length) { toast.error('Add at least one product.'); return; }
        setSaving(true);
        try {
            const order: any = await orderService.create({
                customer: customer.id,
                customer_name: custName(customer),
                shipping_address: customer.address || customer.area_name || '-',
                phone_number: customer.phone || 'N/A',
                notes: 'Trade 1.0 Sale Invoice',
                status: 'DELIVERED',
                payment_method: 'SHOP',
                // Booked on credit: it adds to the customer's balance and is
                // settled later through receipts.
                payment_status: 'UNPAID',
                amount_paid: 0,
                discount: 0,
                shipping_cost: 0,
                sale_date: new Date().toISOString().slice(0, 10),
                sale_invoice: true,
                items: lines.map((l) => ({
                    id: l.productId, batch_id: l.batchId,
                    quantity: l.qty, bonus_quantity: l.bonus, price: l.tp,
                    discount: round2(lineDisc(l)),
                })),
            } as any);
            const no = order?.order_number || order?.tracking_id || invoiceNo;
            toast.success(`Invoice ${no} saved.`);
            setStatus(`Saved invoice ${no} — ${custName(customer)} — ${fmt(netAmount)}`);
            if (print) {
                setInvoiceNo(no);
                setTimeout(() => { window.print(); setShowPV(false); resetInvoice(); }, 150);
            } else {
                setShowPV(false);
                resetInvoice();
            }
        } catch (err: any) {
            const d = err?.response?.data;
            const msg = typeof d === 'string' ? d : (d?.detail || d?.error || (Array.isArray(d) ? d[0] : Object.values(d || {})[0]) || 'Could not save the invoice.');
            toast.error(String(msg), { duration: 6000 });
            setStatus(String(msg));
        } finally { setSaving(false); }
    };

    /* ── keyboard ── */
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); setShowFindCust(true); }
            else if (e.key === 'F3') { e.preventDefault(); setShowFindProd(true); }
            else if (e.key === 'F9') { e.preventDefault(); setShowPV(true); }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    const onEnter = (next: () => void) => (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); next(); }
    };
    const setE = (k: keyof Entry) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setEntry((x) => ({ ...x, [k]: e.target.value }));

    /* ───────────────────────── render ───────────────────────── */
    return (
        <div className="flex h-screen min-h-0 flex-col overflow-auto bg-[#dcdcf7] font-sans text-slate-900 print:h-auto print:bg-white">
            <Toaster position="top-center" />

            {/* Window caption */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1.5 print:hidden">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Sale Invoice )</span>
            </div>

            <div className="flex min-h-0 min-w-[1180px] flex-1 flex-col gap-2 p-3 print:hidden">
                <h1 className="-mb-1 text-[26px] font-black leading-none tracking-tight text-[#1f2bd6]">Sale</h1>

                {/* Row 1 — customer / product / stock */}
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowFindCust(true)}
                        className="h-9 shrink-0 rounded-md border-2 border-[#5c4a2a] bg-gradient-to-b from-[#fff1d6] to-[#f3d9a8] px-3 text-[13.5px] font-black text-[#3b2a10] shadow-sm hover:from-[#ffe7bd] active:translate-y-px">
                        Find Customer
                    </button>
                    <input ref={custRef} value={custInput} onChange={(e) => { setCustInput(e.target.value); if (customer) setCustomer(null); }}
                        onKeyDown={onEnter(resolveCustomer)} placeholder="Code" className={`${EDIT} w-[150px] shrink-0`} aria-label="Customer code" />
                    <ReadBox value={customer ? `${custName(customer)}${customer.area_name ? `  ·  ${customer.area_name}` : ''}` : ''} className="min-w-0 flex-[1.15]" />
                    <span className={`${LABEL} ml-2 text-[15px]`}>Product</span>
                    <ReadBox value={p?.name || ''} className="min-w-0 flex-1" />
                    <span className={`${LABEL} ml-2 text-[15px]`}>Stock</span>
                    <ReadBox value={p ? fmt(p.stock) : ''} className="w-[130px] shrink-0 justify-end" />
                </div>

                {/* Row 2/3 — entry labels + fields */}
                <div className="grid grid-cols-[72px_2.1fr_1.05fr_1.05fr_1.25fr_0.85fr_0.85fr_1.2fr_0.95fr_1.3fr_1.35fr_1.7fr] items-end gap-x-1.5 gap-y-1">
                    <span />
                    <span className={LABEL}>Product Code</span>
                    <span className={LABEL}>Qty(P)</span>
                    <span className={LABEL}>Qty(U)</span>
                    <span className={LABEL}>Total Units</span>
                    <span className={LABEL}>Packing</span>
                    <span className={LABEL}>Bon(U)</span>
                    <span className={LABEL}>Unit TP</span>
                    <span className={LABEL}>Disct %</span>
                    <span className={LABEL}>Retail Rate</span>
                    <span className={LABEL}>Disc Amt.</span>
                    <span className={LABEL}>Sub Total</span>

                    <button type="button" onClick={() => setShowFindProd(true)}
                        className="h-9 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] text-[13.5px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px">
                        Find
                    </button>
                    <input ref={codeRef} value={entry.code} onChange={setE('code')} onKeyDown={onEnter(resolveCode)} className={EDIT} aria-label="Product code" />
                    <input ref={qtyPRef} value={entry.qtyP} onChange={setE('qtyP')} onKeyDown={onEnter(() => qtyURef.current?.focus())} inputMode="numeric" className={EDIT} aria-label="Quantity in packs" />
                    <input ref={qtyURef} value={entry.qtyU} onChange={setE('qtyU')} onKeyDown={onEnter(() => bonRef.current?.focus())} inputMode="numeric" className={EDIT} aria-label="Quantity in units" />
                    <ReadBox value={totalUnits ? fmt(totalUnits) : ''} className="justify-end" />
                    <ReadBox value={p ? packing : ''} className="justify-end" />
                    <input ref={bonRef} value={entry.bonus} onChange={setE('bonus')} onKeyDown={onEnter(() => tpRef.current?.focus())} inputMode="numeric" className={EDIT} aria-label="Bonus units" />
                    <input ref={tpRef} value={entry.tp} onChange={setE('tp')} onKeyDown={onEnter(() => discRef.current?.focus())} inputMode="decimal" className={EDIT} aria-label="Unit trade price" />
                    <input ref={discRef} value={entry.discPct} onChange={setE('discPct')} onKeyDown={onEnter(addLine)} inputMode="decimal" className={EDIT} aria-label="Discount percent" />
                    <ReadBox value={p ? fmt(num(batch?.retail_price) || num(p.retail_price)) : ''} className="justify-end" />
                    <ReadBox value={discAmt ? fmt(discAmt) : ''} className="justify-end" />
                    <ReadBox value={subTotal ? fmt(subTotal) : ''} className="justify-end" />
                </div>

                {/* Grid + right panel */}
                <div className="grid min-h-[300px] flex-1 grid-cols-[1fr_390px] gap-3">
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-400 bg-[#b9bccb] shadow-inner">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full table-fixed border-collapse text-[13px]">
                                <colgroup>
                                    <col className="w-[52px]" /><col className="w-[64px]" /><col /><col className="w-[86px]" />
                                    <col className="w-[60px]" /><col className="w-[62px]" /><col className="w-[78px]" /><col className="w-[78px]" />
                                    <col className="w-[96px]" /><col className="w-[58px]" /><col className="w-[84px]" /><col className="w-[100px]" />
                                </colgroup>
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-b from-white to-[#e9e9f1] text-left text-[13px] font-bold text-slate-800">
                                        {['SNo', 'PID', 'Product Name', 'Expiry', 'Qty', 'Bonus', 'TP', 'Retail', 'SubTotal', 'Disc%', 'Dis.Amt', 'Net Amt'].map((h) => (
                                            <th key={h} className="border-b border-r border-slate-300 px-1.5 py-1.5 last:border-r-0">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, i) => (
                                        <tr key={i} onClick={() => setSelected(i)} onDoubleClick={() => editLine(i)}
                                            className={`cursor-pointer tabular-nums ${selected === i ? 'bg-[#2f5bd3] text-white' : i % 2 ? 'bg-[#f6f7ff]' : 'bg-white'} hover:outline hover:outline-1 hover:outline-[#2f5bd3]`}>
                                            {[i + 1, l.code, l.name, ymd(l.expiry), fmt(l.qty), l.bonus ? fmt(l.bonus) : '', fmt(l.tp), fmt(l.retail),
                                              fmt(lineGross(l)), l.discPct ? fmt(l.discPct) : '', lineDisc(l) ? fmt(lineDisc(l)) : '', fmt(lineNet(l))].map((v, k) => (
                                                <td key={k} title={k === 2 ? String(v) : undefined}
                                                    className={`truncate border-b border-r border-slate-200 px-1.5 py-1 last:border-r-0 ${k === 2 ? 'font-semibold' : ''} ${k >= 4 && k !== 9 ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!lines.length && (
                                        <tr className="bg-white"><td colSpan={12} className="px-2 py-1.5 text-[12.5px] italic text-slate-400">No items yet — enter a product code and press Add.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right panel */}
                    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
                        <div className="grid grid-cols-[118px_1fr] items-center gap-x-2 gap-y-2">
                            <span className={`${LABEL} text-[14px]`}>Net Amount</span>
                            <ReadBox value={entryNet ? fmt(entryNet) : ''} className="justify-end" />
                            <span className={`${LABEL} text-[14px]`}>Expiry Date</span>
                            <select value={entry.batchId} disabled={!p || !p.batches.length}
                                onChange={(e) => p && applyBatch(p, e.target.value, { qtyP: entry.qtyP, qtyU: entry.qtyU, bonus: entry.bonus, discPct: entry.discPct })}
                                className={`${FIELD} border-cyan-300 bg-[#d5fbff] text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:opacity-70`}
                                aria-label="Batch expiry date">
                                {!p && <option value="" />}
                                {p && !p.batches.length && <option value="">No stock batch</option>}
                                {p?.batches.map((b) => (
                                    <option key={b.id} value={b.id}>{ymd(b.expiry_date)}  —  {b.quantity - usedInBatch(b.id)} left</option>
                                ))}
                            </select>
                            <span className={`${LABEL} text-[14px]`}>Company</span>
                            <ReadBox value={p?.company || ''} />
                            <span className={`${LABEL} text-[14px]`}>Invoice No.</span>
                            <div className="flex h-11 items-center justify-center rounded-md border border-emerald-400 bg-[#c8fbc8] font-mono text-[20px] font-black tracking-wide text-[#1f2bd6]">
                                {invoiceNo}
                            </div>
                        </div>

                        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2.5">
                            <button type="button" onClick={addLine}
                                className="h-11 rounded-md border border-amber-300 bg-gradient-to-b from-[#fffbd1] to-[#fff09a] text-[15px] font-bold text-slate-600 shadow-sm hover:to-[#ffe86a] active:translate-y-px">
                                <span className="underline">A</span>dd
                            </button>
                            <button type="button" onClick={removeLine}
                                className="h-11 rounded-md border border-amber-200 bg-gradient-to-b from-[#fffde8] to-[#f6f0c4] text-[15px] font-bold text-slate-500 shadow-sm hover:to-[#efe6ad] active:translate-y-px">
                                <span className="underline">R</span>emove
                            </button>
                            <button type="button" onClick={() => p ? setShowPR(true) : toast.error('Enter a product code first.')}
                                className="h-11 rounded-md border border-orange-300 bg-gradient-to-b from-[#ffe8d1] to-[#ffd0a3] text-[15px] font-bold text-slate-800 shadow-sm hover:to-[#ffc287] active:translate-y-px">
                                Product&nbsp;&nbsp;PR
                            </button>
                            <button type="button" onClick={() => setShowPV(true)}
                                className="h-11 rounded-md border border-slate-300 bg-gradient-to-b from-white to-[#e8e8ee] text-[15px] font-bold text-slate-800 shadow-sm hover:to-[#dadae4] active:translate-y-px">
                                Invoice PV
                            </button>
                        </div>

                        <div className="mt-1 grid grid-cols-[1.6fr_1fr_1fr] items-end gap-x-2 gap-y-1">
                            <span className={LABEL}>Product Pur. Rate</span>
                            <span className={LABEL}>Profit</span>
                            <span className={LABEL}>Profit %</span>
                            <ReadBox value={p ? fmt(purRate) : ''} className="justify-end !border-orange-200 !bg-[#ffe3c7]" />
                            <ReadBox value={totalUnits ? fmt(entryProfit) : ''} className={`justify-end !border-orange-200 !bg-[#ffe3c7] ${entryProfit < 0 ? '!text-rose-600' : ''}`} />
                            <ReadBox value={totalUnits && purRate ? `${fmt(entryProfitPct)}%` : ''} className="justify-end !border-orange-200 !bg-[#ffe3c7]" />
                            <span className={`${LABEL} mt-1`}>Invoice Pur.Value</span>
                            <span className={`${LABEL} mt-1`}>Profit</span>
                            <span className={`${LABEL} mt-1`}>Profit %</span>
                            <ReadBox value={fmt(invPurValue)} className="justify-center !bg-white" />
                            <ReadBox value={fmt(invProfit)} className={`justify-center !bg-white ${invProfit < 0 ? '!text-rose-600' : ''}`} />
                            <ReadBox value={invPurValue ? `${fmt(invProfitPct)}%` : ''} className="justify-center !bg-white" />
                        </div>

                        <div className="mt-1 rounded-md bg-black px-3 py-2 font-mono text-[14px] font-bold text-white">LabItems = {lines.length}</div>
                        <div className="min-h-[38px] rounded-md bg-black px-3 py-2 text-[12.5px] font-semibold text-[#9cf7ff]">{status}</div>
                    </div>
                </div>

                {/* Totals */}
                <div className="grid shrink-0 grid-cols-[1fr_1fr_0.95fr_1.1fr_1.5fr] gap-3 pt-1">
                    <Led label="Amount Billed" value={fmt(amountBilled)} />
                    <Led label="Total Disc By%" value={fmt(totalDisc)} />
                    <Led label="Net Amount" value={fmt(netAmount)} />
                    <Led label="Prev. Bal" value={customer ? fmt(prevBal) : ''} />
                    <Led label="Net Balance" value={fmt(netBalance)} tone="yellow" />
                </div>
            </div>

            {/* ─── Find Customer ─── */}
            {showFindCust && (
                <Modal title="Find Customer" onClose={() => setShowFindCust(false)}>
                    <div className="border-b border-slate-200 p-3">
                        <div className="relative">
                            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input autoFocus value={custQuery} onChange={(e) => setCustQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && custMatches[0]) pickCustomer(custMatches[0]); }}
                                placeholder="Code, name, area or phone…" className={`${EDIT} pl-8`} />
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full text-[13px]">
                            <thead className="sticky top-0 bg-slate-100 text-left text-slate-600">
                                <tr><th className="px-3 py-1.5">Code</th><th className="px-3 py-1.5">Name</th><th className="px-3 py-1.5">Area</th><th className="px-3 py-1.5">Phone</th></tr>
                            </thead>
                            <tbody>
                                {custMatches.map((c) => (
                                    <tr key={c.id} onClick={() => pickCustomer(c)} className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50">
                                        <td className="px-3 py-1.5 font-mono tabular-nums">{custCode(c)}</td>
                                        <td className="px-3 py-1.5 font-semibold">{custName(c)}</td>
                                        <td className="px-3 py-1.5 text-slate-600">{c.area_name || '—'}</td>
                                        <td className="px-3 py-1.5 text-slate-600">{c.phone || '—'}</td>
                                    </tr>
                                ))}
                                {!custMatches.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No customers match.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Modal>
            )}

            {/* ─── Find Product ─── */}
            {showFindProd && (
                <Modal title="Find Product" onClose={() => setShowFindProd(false)} wide>
                    <div className="border-b border-slate-200 p-3">
                        <div className="relative">
                            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input autoFocus value={prodQuery} onChange={(e) => setProdQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && prodResults[0]) loadProduct(prodResults[0]); }}
                                placeholder="Product name or code (2+ letters)…" className={`${EDIT} pl-8`} />
                            {prodSearching && <Loader2 size={15} className="absolute right-2.5 top-2.5 animate-spin text-slate-400" />}
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full text-[13px]">
                            <thead className="sticky top-0 bg-slate-100 text-left text-slate-600">
                                <tr><th className="px-3 py-1.5">PID</th><th className="px-3 py-1.5">Product Name</th><th className="px-3 py-1.5">Company</th><th className="px-3 py-1.5 text-right">Stock</th><th className="px-3 py-1.5 text-right">TP</th><th className="px-3 py-1.5">Nearest Exp</th></tr>
                            </thead>
                            <tbody>
                                {prodResults.map((r) => (
                                    <tr key={r.id} onClick={() => loadProduct(r)} className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50">
                                        <td className="px-3 py-1.5 font-mono tabular-nums">{r.code}</td>
                                        <td className="px-3 py-1.5 font-semibold">{r.name}</td>
                                        <td className="px-3 py-1.5 text-slate-600">{r.company || '—'}</td>
                                        <td className={`px-3 py-1.5 text-right tabular-nums ${r.stock <= 0 ? 'text-rose-600' : ''}`}>{fmt(r.stock)}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(num(r.selling_price))}</td>
                                        <td className="px-3 py-1.5 tabular-nums">{ymd(r.batches[0]?.expiry_date || null)}</td>
                                    </tr>
                                ))}
                                {!prodResults.length && (
                                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">{prodQuery.trim().length < 2 ? 'Type at least 2 letters.' : prodSearching ? 'Searching…' : 'No products match.'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Modal>
            )}

            {/* ─── Product PR (batch-wise purchase rates) ─── */}
            {showPR && p && (
                <Modal title={`Product PR — ${p.name}`} onClose={() => setShowPR(false)}>
                    <div className="min-h-0 flex-1 overflow-auto p-3">
                        <table className="w-full text-[13px] tabular-nums">
                            <thead className="bg-slate-100 text-left text-slate-600">
                                <tr><th className="px-3 py-1.5">Expiry</th><th className="px-3 py-1.5 text-right">Qty</th><th className="px-3 py-1.5 text-right">Pur. Rate</th><th className="px-3 py-1.5 text-right">TP</th><th className="px-3 py-1.5 text-right">Retail</th><th className="px-3 py-1.5 text-right">Margin</th></tr>
                            </thead>
                            <tbody>
                                {p.batches.map((b) => {
                                    const cost = num(b.cost_price), sale = num(b.selling_price);
                                    return (
                                        <tr key={b.id} className={`border-t border-slate-100 ${b.id === entry.batchId ? 'bg-cyan-50 font-semibold' : ''}`}>
                                            <td className="px-3 py-1.5">{ymd(b.expiry_date)}</td>
                                            <td className="px-3 py-1.5 text-right">{fmt(b.quantity)}</td>
                                            <td className="px-3 py-1.5 text-right">{fmt(cost)}</td>
                                            <td className="px-3 py-1.5 text-right">{fmt(sale)}</td>
                                            <td className="px-3 py-1.5 text-right">{fmt(num(b.retail_price))}</td>
                                            <td className="px-3 py-1.5 text-right">{cost > 0 ? `${fmt(((sale - cost) / cost) * 100)}%` : '—'}</td>
                                        </tr>
                                    );
                                })}
                                {!p.batches.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No stock batches.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Modal>
            )}

            {/* ─── Invoice PV (preview → save / print) ─── */}
            {showPV && (
                <Modal title={`Invoice PV — ${invoiceNo}`} onClose={() => !saving && setShowPV(false)} wide>
                    <div className="min-h-0 flex-1 overflow-auto p-5 print:overflow-visible print:p-0" id="invoice-print">
                        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2">
                            <div>
                                <div className="text-[22px] font-black tracking-tight">AL-QAVI TRADERS</div>
                                <div className="text-[12px] font-semibold uppercase tracking-widest text-slate-500">Sale Invoice</div>
                            </div>
                            <div className="text-right text-[13px]">
                                <div><span className="text-slate-500">Invoice No.</span> <b className="font-mono">{invoiceNo}</b></div>
                                <div><span className="text-slate-500">Date</span> <b>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</b></div>
                            </div>
                        </div>
                        <div className="py-2 text-[13px]">
                            <span className="text-slate-500">Customer:</span>{' '}
                            <b>{customer ? `${custName(customer)} (${custCode(customer)})` : '— not selected —'}</b>
                            {customer?.area_name ? <span className="text-slate-500"> · {customer.area_name}</span> : null}
                        </div>
                        <table className="w-full border-collapse text-[12.5px] tabular-nums">
                            <thead>
                                <tr className="border-y border-slate-400 bg-slate-50 text-left">
                                    {['#', 'PID', 'Product', 'Expiry', 'Qty', 'Bon', 'TP', 'SubTotal', 'Disc', 'Net'].map((h) => <th key={h} className="px-1.5 py-1">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={i} className="border-b border-slate-200">
                                        <td className="px-1.5 py-1">{i + 1}</td><td className="px-1.5 py-1">{l.code}</td>
                                        <td className="px-1.5 py-1 font-medium">{l.name}</td><td className="px-1.5 py-1">{ymd(l.expiry)}</td>
                                        <td className="px-1.5 py-1 text-right">{fmt(l.qty)}</td><td className="px-1.5 py-1 text-right">{l.bonus ? fmt(l.bonus) : ''}</td>
                                        <td className="px-1.5 py-1 text-right">{fmt(l.tp)}</td><td className="px-1.5 py-1 text-right">{fmt(lineGross(l))}</td>
                                        <td className="px-1.5 py-1 text-right">{lineDisc(l) ? fmt(lineDisc(l)) : ''}</td><td className="px-1.5 py-1 text-right font-semibold">{fmt(lineNet(l))}</td>
                                    </tr>
                                ))}
                                {!lines.length && <tr><td colSpan={10} className="px-2 py-4 text-center text-slate-400">No items.</td></tr>}
                            </tbody>
                        </table>
                        <div className="ml-auto mt-3 w-72 space-y-0.5 text-[13px] tabular-nums">
                            {[['Amount Billed', amountBilled], ['Total Discount', totalDisc], ['Net Amount', netAmount], ['Prev. Balance', prevBal]].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between"><span className="text-slate-500">{k}</span><span>{fmt(v as number)}</span></div>
                            ))}
                            <div className="flex justify-between border-t border-slate-800 pt-1 text-[15px] font-black"><span>Net Balance</span><span>{fmt(netBalance)}</span></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 print:hidden">
                        <button type="button" onClick={() => setShowPV(false)} disabled={saving}
                            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-100">Close</button>
                        <button type="button" onClick={() => saveInvoice(false)} disabled={saving || !lines.length || !customer}
                            className="flex h-9 items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-4 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Invoice
                        </button>
                        <button type="button" onClick={() => saveInvoice(true)} disabled={saving || !lines.length || !customer}
                            className="flex h-9 items-center gap-1.5 rounded-md border border-[#3b3f8f] bg-[#3b3f8f] px-4 text-[13px] font-bold text-white hover:bg-[#2f3278] disabled:opacity-50">
                            <Printer size={14} /> Save &amp; Print
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
