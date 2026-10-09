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
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import * as XLSX from 'xlsx';
import { orderService, installmentService } from '@/lib/api';
import { openPopup } from '@/lib/popup';
import { getImageUrl } from '@/lib/utils';
import FitStage from '@/components/trade/FitStage';
import { INVOICE_SIZES, savedInvoiceSize, type InvoiceSize } from '@/components/trade/TradeInvoicePrint';

/* ───────────────────────── types & helpers ───────────────────────── */
type Batch = {
    id: string; expiry_date: string | null; quantity: number;
    cost_price: number; selling_price: number; retail_price: number;
};
type LookupProduct = {
    id: string; code: string; name: string; company: string; packing: number; carton: number; stock: number;
    cost_price: number; selling_price: number; retail_price: number; batches: Batch[];
};
type SaleUnit = 'PIECE' | 'CARTON';
type Line = {
    productId: string; code: string; name: string; company: string;
    batchId: string; expiry: string | null;
    qty: number; bonus: number; tp: number; retail: number; discPct: number; shelfPct: number; cost: number;
    unit: SaleUnit; carton: number;
};
type Entry = {
    product: LookupProduct | null; batchId: string;
    code: string; unit: SaleUnit; qtyP: string; qtyU: string; bonus: string; tp: string; discPct: string; shelfPct: string;
};
// PIECE: Qty(P) packs × Packing + Qty(U) loose pieces. CARTON: Qty(C) cartons × pieces per carton + Qty(U).

const EMPTY_ENTRY: Entry = { product: null, batchId: '', code: '', unit: 'PIECE', qtyP: '', qtyU: '', bonus: '', tp: '', discPct: '', shelfPct: '' };

const num = (v: any) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => round2(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
// Dates read as dd-mm-yyyy (e.g. 17-10-2029), like the dashboard lists.
const ymd = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('-') : '—');
const custCode = (c: any) => String(c?.username || '').replace(/^cust/i, '');
const custName = (c: any) => `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || c?.username || '';

const lineGross = (l: Line) => l.qty * l.tp;
// Special Discount and Shelf Rate are both % of the line's sub total; Disc.Amt is the two together.
const lineSpecial = (l: Line) => lineGross(l) * (l.discPct / 100);
const lineShelf = (l: Line) => lineGross(l) * (l.shelfPct / 100);
const lineDisc = (l: Line) => lineSpecial(l) + lineShelf(l);
// "2 Ctn" for whole cartons, "Ctn" for a part carton, else "Pcs".
const lineCartons = (l: Line) => {
    if (l.unit !== 'CARTON' || !(l.carton > 0)) return '';
    const c = Math.floor(l.qty / l.carton), r = l.qty % l.carton;
    return r ? `${c} + ${r} pcs` : String(c);
};
const lineNet = (l: Line) => lineGross(l) - lineDisc(l);
const lineCost = (l: Line) => (l.qty + l.bonus) * l.cost;

/* No browser "Leave site?" box on the Trade pop-ups (not wanted); closing is
   confirmed by our own "Do you want to Close the Form ?" dialog instead. */
export function guardWindowClose() {
    return () => {};
}
export function closeTradeWindow() {
    window.close();
    // Still open (not a pop-up): go back to the dashboard.
    setTimeout(() => { if (!window.closed) window.location.href = '/admin/dashboard'; }, 200);
}

/* ───────────────────────── small styled pieces ───────────────────────── */
export const LABEL = 'text-[13px] font-bold tracking-tight text-[#1b1f4b] whitespace-nowrap';
// No width here: callers size each field (w-full in grids, fixed px in rows) so
// two width utilities never fight over the same element.
export const FIELD = 'h-8 min-w-0 rounded-md border px-2.5 text-[13.5px] font-semibold tabular-nums outline-none transition-shadow';
export const EDIT = `${FIELD} border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`;
export const READ = `${FIELD} border-slate-300 bg-[#ececf3] text-slate-700`;

const PANEL_BTN = 'h-9 rounded-md border bg-gradient-to-b text-[14.5px] font-bold shadow-sm active:translate-y-px';
export const ACTION_BTN = 'flex h-9 min-w-[104px] items-center justify-center rounded-md border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] px-4 text-[14px] font-bold text-slate-800 shadow-sm hover:to-[#ffcf9a] active:translate-y-px disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-[#f3f3f6] disabled:to-[#e2e2e8] disabled:text-slate-400 disabled:shadow-none';

/* Design size of the form. FitStage scales it to fill the window in proportion
   to the screen; this is the smallest area the whole form needs. */
const STAGE_W = 1240;
const STAGE_H = 760;

export const COA_SELECT = `${FIELD} w-full border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60`;
const COA_VIEW_COLS = [
    { h: 'Main Account', w: '8%' }, { h: '2nd Level Acc.', w: '12%' }, { h: '3rd Level Acc.', w: '11%' },
    { h: 'Account ID', w: '8%' }, { h: 'Acc. Name', w: '18%' }, { h: 'Area', w: '10%' },
    { h: 'Cell No', w: '10%' }, { h: 'Contact Person', w: '10%' }, { h: 'Address', w: '13%' },
];

/* Download rows as an Excel workbook (.xlsx). Numeric-looking IDs/codes are
   kept as text so leading digits and long codes stay exactly as shown. */
function downloadXlsx(name: string, sheet: string, head: string[], rows: any[][]) {
    const data = [head, ...rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : String(v))))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Fit each column to its longest value (capped), like the legacy export.
    ws['!cols'] = head.map((_, c) => ({
        wch: Math.min(48, Math.max(8, ...data.map((r) => String(r[c] ?? '').length + 2))),
    }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: head.length - 1 } }) };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
    XLSX.writeFile(wb, `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* Find Product grids (legacy column order). */
const FP_STOCK_COLS = [
    { h: 'PID', w: '7%' }, { h: 'Category', w: '10%' }, { h: 'Product Name', w: '27%' }, { h: 'Pack', w: '6%' },
    { h: 'Expiry Date', w: '10%' }, { h: 'Qty(U)', w: '7%' }, { h: 'T.P', w: '8%' }, { h: 'Retail Rate', w: '9%' },
    { h: 'Company', w: '16%' },
];
const FP_HIST_COLS = [
    { h: 'PID', w: '7%' }, { h: 'Category', w: '10%' }, { h: 'Product', w: '21%' }, { h: 'Pack', w: '6%' },
    { h: 'Expiry Date', w: '10%' }, { h: 'Qty(U)', w: '7%' }, { h: 'Qty(B)', w: '7%' }, { h: 'T.P', w: '9%' },
    { h: 'Special Disc %', w: '7%' }, { h: 'Shelf Rent %', w: '6%' }, { h: 'Retail Rate', w: '10%' },
];

/* Sale / Sale-Return Records grid (legacy column order). */
const SR_COLS = [
    { h: 'SaleID', w: '7.5%' }, { h: 'Date Sale', w: '8.5%' }, { h: 'Staff', w: '7%' }, { h: 'Acc.ID', w: '8%' },
    { h: 'Acc.Name', w: '12.5%' }, { h: 'Carton', w: '4.5%' }, { h: 'Amount', w: '7%' }, { h: 'Special Disc', w: '6%' }, { h: 'Shelf Rent', w: '5.5%' },
    { h: 'Net.Amount', w: '7.5%' }, { h: 'Pre. Bal.', w: '6.5%' }, { h: 'Total', w: '7%' }, { h: 'Paid', w: '5.5%' }, { h: 'Balance', w: '7%' },
];

/* Sale return grids (legacy column order). */
const RET_COLS = [
    { h: 'SNo', w: '4.5%' }, { h: 'PID', w: '6.5%' }, { h: 'Product Name', w: '17%' }, { h: 'Expiry', w: '9.5%' },
    { h: 'Qty', w: '5%' }, { h: 'Bons', w: '5%' }, { h: 'TP', w: '7%' }, { h: 'Retail', w: '7%' },
    { h: 'Sub Total', w: '8.5%' }, { h: 'Special Disc %', w: '5.5%' }, { h: 'Shelf Rent %', w: '6%' }, { h: 'Dis.Amt', w: '8%' }, { h: 'Net Amt', w: '10.5%' },
]
const RR_HIST_COLS = [
    { h: 'Sale Inv.', w: '11%' }, { h: 'Date', w: '9.5%' }, { h: 'PID', w: '6.5%' }, { h: 'Product Name', w: '17.5%' },
    { h: 'Expiry', w: '9.5%' }, { h: 'Qty', w: '5%' }, { h: 'Bonus', w: '6%' }, { h: 'Returned', w: '7.5%' },
    { h: 'TP', w: '7%' }, { h: 'Special Disc %', w: '6%' }, { h: 'Shelf Rent %', w: '5.5%' }, { h: 'Retail', w: '9%' },
]

/* Lays a window body out at a design size (w x h) and scales it to exactly fit
   the space it is given — everything in one view, never a scrollbar. */
function FitBox({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ s: 1, x: 0 });
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const fit = () => {
            const s = Math.min(el.clientWidth / w, el.clientHeight / h);
            setBox({ s, x: Math.max(0, (el.clientWidth - w * s) / 2) });
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(el);
        return () => ro.disconnect();
    }, [w, h]);
    return (
        <div ref={ref} className="relative min-h-0 w-full flex-1 overflow-hidden bg-[#e4e4fb]">
            <div style={{ width: w, height: h, transform: `translate(${box.x}px, 0) scale(${box.s})`, transformOrigin: '0 0' }}>
                {children}
            </div>
        </div>
    );
}

/* Keyboard shortcuts shown in the grid footer. */
const SHORTCUTS: [string, string][] = [
    ['F2', 'Find Customer'], ['F3', 'Find Product'], ['Enter', 'Next field / Add'],
    ['Dbl-click', 'Edit line'], ['F9', 'Preview / Print'], ['Ctrl+S', 'Save'],
];

/* Sale grid columns — legacy order and proportions (as % of the grid width, so
   they scale with the window); headers and values left-aligned like Trade 1.0. */
// Long "Special Disc" headers wrap in a smaller font instead of being cut off.
const thFit = (h: string) => (h.startsWith('Special') || h.startsWith('Shelf Rent') ? ' !whitespace-normal !text-[10.5px] !leading-tight' : '');

const GRID_COLS: { h: string; w?: string; right?: boolean }[] = [
    { h: 'SNo', w: '3.5%' }, { h: 'PID', w: '6.5%' }, { h: 'Product Name', w: '17%' }, { h: 'Expiry', w: '10%' },
    { h: 'Carton', w: '5.5%' }, { h: 'Qty', w: '4.5%' }, { h: 'Bonus', w: '5.5%' }, { h: 'TP', w: '6%' },
    { h: 'Retail', w: '6%' }, { h: 'SubTotal', w: '7.5%' }, { h: 'Special Disc %', w: '5%' }, { h: 'Shelf Rent %', w: '5%' },
    { h: 'Dis.Amt', w: '8.5%' }, { h: 'Net Amt', w: '9.5%' },
];

export function ReadBox({ value, className = '' }: { value: React.ReactNode; className?: string }) {
    const sized = /(^|\s)(w-|flex-)/.test(className);
    return <div className={`${READ} ${sized ? '' : 'w-full'} flex items-center overflow-hidden whitespace-nowrap ${className}`}>{value}</div>;
}

export function Led({ label, value, tone = 'green' }: { label: string; value: string; tone?: 'green' | 'yellow' }) {
    return (
        <div className="min-w-0">
            <div className="mb-0.5 text-[16px] font-black tracking-tight text-[#1b1f4b]">{label}</div>
            <div className={`flex h-10 items-center justify-end overflow-hidden rounded-md border border-black bg-gradient-to-b from-[#0b0b0b] to-[#1c1c1c] px-3 font-mono text-[22px] font-black tabular-nums shadow-inner ${tone === 'yellow' ? 'text-[#ffe14d]' : 'text-[#3cff5a]'}`}>
                {value}
            </div>
        </div>
    );
}

// Open modals, oldest first — Esc closes only the topmost one (windows can stack,
// e.g. Find Customer › Chart of Accounts › Sub Area).
const modalStack: number[] = [];
let modalSeq = 0;

/* Legacy-style Yes/No confirmation ("Conformation" box). Esc = No, Enter = Yes. */
export function ConfirmBox({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
    const yesRef = useRef(onYes); yesRef.current = onYes;
    const noRef = useRef(onNo); noRef.current = onNo;
    useEffect(() => {
        const id = ++modalSeq;
        modalStack.push(id);
        const h = (e: KeyboardEvent) => {
            if (modalStack[modalStack.length - 1] !== id) return;
            if (e.key === 'Escape') { e.preventDefault(); noRef.current(); }
            else if (e.key === 'Enter') { e.preventDefault(); yesRef.current(); }
        };
        window.addEventListener('keydown', h);
        return () => {
            window.removeEventListener('keydown', h);
            modalStack.splice(modalStack.indexOf(id), 1);
        };
    }, []);
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-6 print:hidden">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl" role="alertdialog" aria-label="Confirmation">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-semibold text-slate-700">
                    <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#3b3f8f] text-[9px] font-black text-white">AQ</span>
                    Confirmation
                </div>
                <div className="flex items-center gap-4 px-6 py-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#4f7be8] to-[#2347b8] text-[22px] font-black text-white shadow-md">?</span>
                    <p className="text-[15px] font-medium text-slate-800">{msg}</p>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <button type="button" autoFocus onClick={onYes}
                        className="h-9 min-w-[96px] rounded-md border border-[#3b3f8f] bg-[#3b3f8f] px-4 text-[14px] font-bold text-white hover:bg-[#2f3278]">Yes</button>
                    <button type="button" onClick={onNo}
                        className="h-9 min-w-[96px] rounded-md border border-slate-300 bg-white px-4 text-[14px] font-bold text-slate-700 hover:bg-slate-100">No</button>
                </div>
            </div>
        </div>
    );
}

export function Modal({ title, onClose, children, wide = false, large = false, xl = false, small = false, full = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; large?: boolean; xl?: boolean; small?: boolean; full?: boolean }) {
    // How many windows are already open (the first one dims the screen; windows
    // behind a newer one dim a little more).
    const [depth] = useState(() => modalStack.length);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        const id = ++modalSeq;
        modalStack.push(id);
        const h = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) closeRef.current();
        };
        window.addEventListener('keydown', h);
        return () => {
            window.removeEventListener('keydown', h);
            modalStack.splice(modalStack.indexOf(id), 1);
        };
    }, []);
    return (
        // Like the legacy windows, clicking outside does not close it — only X,
        // Esc or the window's own Cancel/Close (which ask for confirmation).
        // Every window opens centred straight on top of the previous one and is
        // sized to fit the screen, so nothing in it is ever cut off.
        // Stacked by opening order, so the newest window is always on top.
        <div style={{ zIndex: 50 + depth }}
            className={`fixed inset-0 flex items-center justify-center p-4 print:static print:bg-white print:p-0 ${depth === 0 ? 'bg-slate-900/40 backdrop-blur-[1px]' : 'bg-slate-900/25'}`}>
            <div className={`flex max-h-[calc(100vh-2rem)] w-full ${full ? 'h-[calc(100vh-2rem)] max-w-[min(96vw,1600px)]' : xl ? 'h-[calc(100vh-2rem)] max-w-6xl' : large ? 'max-w-6xl' : wide ? 'max-w-4xl' : small ? 'max-w-lg' : 'max-w-2xl'} flex-col overflow-hidden rounded-xl border border-slate-400 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.55)] print:max-h-none print:border-0 print:shadow-none`}>
                <div className="flex items-center justify-between bg-gradient-to-r from-[#3b3f8f] to-[#5a5fc4] px-4 py-2 text-white print:hidden">
                    <span className="text-[13.5px] font-semibold">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( {title} )</span>
                    <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/20" aria-label="Close"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ───────────────────────── Find Company / New Company (legacy Trade 1.0) ─────────────────────────
   Product Detail › Find Company: search by name, pick a row. Add Company opens
   the New Company window (Company Code + Name); its View lists every company
   for Update / Delete. */
const byCode = (a: any, b: any) => (a.code ?? 1e9) - (b.code ?? 1e9) || String(a.name).localeCompare(String(b.name));
const errMsg = (err: any, fallback: string) => {
    const d = err?.response?.data;
    return String(d?.error || d?.detail || (d && typeof d === 'object' && Object.values(d).flat()[0]) || fallback);
};

function FindCompanyWindow({ companies, current, askClose, reload, onPick, onClose }: {
    companies: any[]; current: string;
    askClose: (fn: () => void, msg?: string) => void; reload: () => Promise<void>;
    onPick: (c: any) => void; onClose: () => void;
}) {
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(current);
    const [adding, setAdding] = useState(false);
    const rows = useMemo(() => {
        const s = q.trim().toLowerCase();
        return [...companies].sort(byCode).filter((c) => !s || String(c.name).toLowerCase().includes(s) || String(c.code ?? '') === s);
    }, [companies, q]);
    const enter = () => { const c = rows.find((r) => String(r.id) === sel) || rows[0]; if (c) onPick(c); };

    return (
        <Modal title="Find Company" onClose={() => askClose(onClose)} wide>
            <div className="flex min-h-0 flex-1 flex-col gap-3 bg-[#c9c9f9] p-4">
                <fieldset className="shrink-0 rounded-md border-2 border-white/80 px-4 pb-4 pt-0">
                    <legend className="px-1 text-[22px] font-semibold tracking-tight text-[#1a1aff]">Search Company Name</legend>
                    <div className="flex items-center justify-end gap-3">
                        <span className={`${LABEL} text-[14px]`}>Company Name</span>
                        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enter(); } }}
                            className={`${EDIT} h-9 w-[340px] text-[15px]`} />
                        <button type="button" onClick={() => setAdding(true)} className={`${ACTION_BTN} min-w-[190px]`}>
                            <span><span className="underline">A</span>dd Company</span>
                        </button>
                    </div>
                </fieldset>
                <div className="h-[52vh] min-h-[220px] overflow-auto border border-slate-500 bg-[#8a8a8a]">
                    <table className="w-[70%] min-w-[460px] table-fixed border-collapse bg-white text-[14px]">
                        <colgroup><col style={{ width: '22%' }} /><col style={{ width: '56%' }} /><col style={{ width: '22%' }} /></colgroup>
                        <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                            <tr>{['Categ ID', 'Company', ''].map((h, i) => <th key={i} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 text-[15px] font-semibold">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map((c) => (
                                <tr key={c.id} onClick={() => setSel(String(c.id))} onDoubleClick={() => onPick(c)} title="Double-click to select"
                                    className={`cursor-pointer tabular-nums ${sel === String(c.id) ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                    <td className="border-b border-r border-slate-300 px-1.5 py-1">{c.code ?? ''}</td>
                                    <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 font-semibold" title={c.name}>{c.name}</td>
                                    <td className="border-b border-r border-slate-300 px-1.5 py-1" />
                                </tr>
                            ))}
                            {!rows.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">{companies.length ? 'No company matches.' : 'Loading…'}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-[#9da1d8] bg-[#c9c9f9] px-4 py-3">
                <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length}</span>} className="w-[200px]" />
                <span className="flex-1" />
                <button type="button" onClick={enter} disabled={!rows.length} className={ACTION_BTN}>Select</button>
                <button type="button" onClick={() => askClose(onClose)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
            </div>

            {adding && (
                <NewCompanyWindow companies={companies} askClose={askClose} reload={reload}
                    onClose={() => setAdding(false)}
                    onSaved={(c) => { setAdding(false); onPick(c); }} />
            )}
        </Modal>
    );
}

function NewCompanyWindow({ companies, askClose, reload, initialName = '', onClose, onSaved }: {
    companies: any[]; askClose: (fn: () => void, msg?: string) => void; reload: () => Promise<void>;
    initialName?: string; onClose: () => void; onSaved?: (c: any) => void;
}) {
    const [name, setName] = useState(initialName);
    const [nextCode, setNextCode] = useState('');
    const [viewing, setViewing] = useState(false);
    const [sel, setSel] = useState<any | null>(null);
    const [busy, setBusy] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    const loadCode = () => api.get('v1/company/companies/next_code/').then(({ data }) => setNextCode(String(data.code))).catch(() => setNextCode(''));
    useEffect(() => { loadCode(); nameRef.current?.focus(); }, []);

    const rows = useMemo(() => [...companies].sort(byCode), [companies]);
    const pick = (c: any) => { setSel(c); setName(c.name); };
    const addNew = () => { setSel(null); setName(''); setViewing(false); loadCode(); nameRef.current?.focus(); };

    const save = async () => {
        if (busy || !name.trim()) return;
        setBusy(true);
        try {
            const { data } = await api.post('v1/company/companies/', { name: name.trim() });
            await reload();
            toast.success(`Company ${data.code} — ${data.name} added.`);
            if (onSaved) { onSaved(data); return; }
            setName(''); loadCode();
        } catch (err) { toast.error(errMsg(err, 'Could not add the company.')); }
        finally { setBusy(false); }
    };
    const update = async () => {
        if (busy || !sel || !name.trim()) return;
        setBusy(true);
        try {
            const { data } = await api.patch(`v1/company/companies/${sel.id}/`, { name: name.trim() });
            await reload();
            setSel(data);
            toast.success(`Company ${data.code} — ${data.name} updated.`);
        } catch (err) { toast.error(errMsg(err, 'Could not update the company.')); }
        finally { setBusy(false); }
    };
    const remove = () => {
        if (!sel) return;
        askClose(async () => {
            setBusy(true);
            try {
                await api.delete(`v1/company/companies/${sel.id}/`);
                await reload();
                toast.success(`Company ${sel.code} — ${sel.name} deleted.`);
                setSel(null); setName('');
            } catch (err) { toast.error(errMsg(err, 'Could not delete the company.')); }
            finally { setBusy(false); }
        }, `Do you want to Delete ${sel.name} ?`);
    };
    const exportRows = () => downloadXlsx('companies', 'Companies', ['Company Code', 'Company Name'], rows.map((c) => [c.code ?? '', c.name]));

    return (
        <Modal title="New Company" onClose={() => !busy && askClose(onClose)} wide>
            <div className="flex min-h-0 flex-1 flex-col gap-3 bg-[#c9c9f9] p-4">
                <fieldset className="shrink-0 rounded-md border-2 border-white/80 px-4 pb-4 pt-0">
                    <legend className="px-1 text-[22px] font-black tracking-tight text-[#1a1aff]">New Company</legend>
                    <div className="grid grid-cols-[150px_1fr] items-center gap-x-3 gap-y-2.5">
                        <span className={`${LABEL} text-[15px] font-semibold`}>Company Code</span>
                        <div className="flex h-9 w-[180px] items-center rounded-sm border border-slate-500 bg-[#dedede] px-2.5 text-[15px] font-bold tabular-nums text-[#1f2bd6]">{sel ? sel.code : nextCode}</div>
                        <span className={`${LABEL} text-[15px] font-semibold`}>Company Name</span>
                        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} maxLength={150}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (sel) update(); else save(); } }}
                            className={`${EDIT} h-9 w-full max-w-[500px] text-[15px]`} />
                    </div>
                </fieldset>
                {viewing && (
                    <div className="h-[48vh] min-h-[200px] overflow-auto border border-slate-500 bg-[#8a8a8a]">
                        <table className="w-[86%] min-w-[460px] table-fixed border-collapse bg-white text-[14px]">
                            <colgroup><col style={{ width: '36%' }} /><col style={{ width: '64%' }} /></colgroup>
                            <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{['Company Code', 'Company Name'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {rows.map((c) => (
                                    <tr key={c.id} onClick={() => pick(c)}
                                        className={`cursor-pointer tabular-nums ${sel?.id === c.id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                        <td className="border-b border-r border-slate-300 px-1.5 py-1">{c.code ?? ''}</td>
                                        <td className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1" title={c.name}>{c.name}</td>
                                    </tr>
                                ))}
                                {!rows.length && <tr><td colSpan={2} className="px-3 py-4 text-center text-slate-500">No companies.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#9da1d8] bg-[#c9c9f9] px-4 py-3">
                {viewing && (
                    <>
                        <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length}</span>} className="w-[190px]" />
                        <button type="button" onClick={exportRows} className={ACTION_BTN}>Export</button>
                    </>
                )}
                <span className="flex-1" />
                {viewing ? (
                    <>
                        <button type="button" onClick={addNew} disabled={busy} className={ACTION_BTN}><span><span className="underline">A</span>dd New</span></button>
                        <button type="button" onClick={update} disabled={busy || !sel || !name.trim() || name.trim() === sel?.name} className={ACTION_BTN}><span className="underline">U</span>pdate</button>
                        <button type="button" onClick={remove} disabled={busy || !sel} className={ACTION_BTN}><span className="underline">D</span>elete</button>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={save} disabled={busy || !name.trim()} className={ACTION_BTN}>
                            {busy ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={() => { setViewing(true); setName(''); }} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                    </>
                )}
                <button type="button" onClick={() => askClose(onClose)} disabled={busy} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
            </div>
        </Modal>
    );
}

/* ───────────────────────── Product Detail (legacy Trade 1.0) ─────────────────────────
   Opened from Find Product › Add New Product. Same fields and layout as the
   legacy window (PID, Product Name + Find Company, Bar Code, Carton, Packing,
   Expiry Apply, Category, Status), plus a product picture. Carton = pieces in
   one carton; Packing = pieces per pack (what Qty(P) multiplies on the invoice). View lists every
   product under the form; picking a row loads it for Update. */
type ProdForm = {
    name: string; company: string; barcode: string; carton: string; packing: string;
    expiry: string; category: string; status: string;
};
const EMPTY_PROD: ProdForm = { name: '', company: '', barcode: '', carton: '', packing: '', expiry: '', category: '', status: '' };
const PD_VIEW_COLS = [
    { h: 'PID', w: '7%' }, { h: 'Product Name', w: '26%' }, { h: 'Company', w: '17%' }, { h: 'Category', w: '12%' },
    { h: 'Bar Code', w: '12%' }, { h: 'Carton', w: '6%' }, { h: 'Packing', w: '6%' }, { h: 'Expiry', w: '6%' }, { h: 'Status', w: '8%' },
];

function ProductDetailWindow({ companies, reloadCompanies, initialName, askClose, onClose }: {
    companies: any[]; reloadCompanies: () => Promise<void>; initialName: string;
    askClose: (fn: () => void, msg?: string) => void; onClose: () => void;
}) {
    const [f, setF] = useState<ProdForm>({ ...EMPTY_PROD, name: initialName });
    const [pid, setPid] = useState('…');
    const [categories, setCategories] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    // Picture: a newly chosen file, or the saved one (URL) of the loaded product.
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const [removeImage, setRemoveImage] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    // View grid
    const [list, setList] = useState<any[] | null>(null);
    const [sel, setSel] = useState<any | null>(null);
    const [search, setSearch] = useState('');
    // Find Company
    const [findCo, setFindCo] = useState(false);

    const loadPid = () => api.get('v1/products/items/next_pid/').then(({ data }) => setPid(data.pid)).catch(() => setPid('—'));
    useEffect(() => {
        loadPid();
        (async () => {
            const all: any[] = [];
            try {
                for (let page = 1; page <= 20; page++) {
                    const { data } = await api.get('v1/products/categories/', { params: { page, page_size: 100 } });
                    if (Array.isArray(data)) { all.push(...data); break; }
                    all.push(...(data.results || []));
                    if (!data.next) break;
                }
            } catch { /* leave the list empty */ }
            setCategories(all.filter((c) => String(c.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
                .sort((a, b) => String(a.name).localeCompare(String(b.name))));
        })();
        nameRef.current?.focus();
    }, []);
    useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

    const set = (k: keyof ProdForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setF((p) => ({ ...p, [k]: e.target.value }));
    const digits = (k: keyof ProdForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setF((p) => ({ ...p, [k]: e.target.value.replace(/\D/g, '') }));
    const cartonN = Number(f.carton), packN = Number(f.packing);
    const cartonOk = cartonN >= 1 && packN >= 1 && cartonN >= packN;
    const complete = !!(f.name.trim() && f.company && cartonOk && f.expiry && f.category && f.status);
    // "1 Carton = 24 pcs = 2 packs × 12" under the two boxes.
    const cartonHint = !(cartonN >= 1 && packN >= 1) ? 'Carton = pieces in one carton · Packing = pieces in one pack'
        : cartonN < packN ? 'A carton cannot hold less than one pack.'
        : `1 Carton = ${cartonN} pcs = ${cartonN % packN ? `${Math.floor(cartonN / packN)} packs × ${packN} + ${cartonN % packN} pcs` : `${cartonN / packN} pack${cartonN / packN === 1 ? '' : 's'} × ${packN}`}`;

    const pickImage = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Choose a picture file (JPG, PNG…).'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('The picture must be 5 MB or smaller.'); return; }
        setImage(file); setRemoveImage(false); setPreview(URL.createObjectURL(file));
    };
    const clearImage = () => {
        setImage(null); setPreview(''); setRemoveImage(true);
        if (fileRef.current) fileRef.current.value = '';
    };

    const resetForm = () => {
        setF({ ...EMPTY_PROD }); setSel(null);
        setImage(null); setPreview(''); setRemoveImage(false);
        if (fileRef.current) fileRef.current.value = '';
        loadPid();
        nameRef.current?.focus();
    };

    const loadList = async () => {
        try {
            const { data } = await api.get('v1/products/items/trade_list/');
            setList(data);
        } catch { toast.error('Could not load products.'); setList([]); }
    };
    const view = () => { setSearch(''); if (!list) setList([]); loadList(); };

    const pickRow = (r: any) => {
        setSel(r);
        setPid(r.pid || '—');
        setF({
            name: r.name || '', company: r.company_id || '', barcode: r.barcode || '',
            carton: r.carton ? String(r.carton) : '', packing: String(r.packing || ''),
            expiry: r.expiry_apply ? 'Yes' : 'No', category: r.category_id || '',
            status: String(r.status || '').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        });
        setImage(null); setRemoveImage(false);
        setPreview(r.image ? (getImageUrl(r.image) || '') : '');
        if (fileRef.current) fileRef.current.value = '';
    };

    const save = async () => {
        if (saving || !complete) return;
        setSaving(true);
        try {
            const body = new FormData();
            if (sel) body.append('id', sel.id);
            body.append('name', f.name.trim());
            body.append('company', f.company);
            body.append('barcode', f.barcode.trim());
            body.append('packing', f.packing);
            body.append('carton', f.carton);
            body.append('expiry_apply', f.expiry);
            body.append('category', f.category);
            body.append('status', f.status);
            if (image) body.append('image', image);
            else if (removeImage) body.append('remove_image', '1');
            const { data } = await api.post('v1/products/items/trade_save/', body);
            toast.success(sel ? `Product ${data.pid} — ${data.name} updated.` : `Product ${data.pid} — ${data.name} added.`);
            resetForm();
            if (list) loadList();
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(String(d?.error || d?.detail || 'Could not save the product.'));
        } finally { setSaving(false); }
    };

    const rows = useMemo(() => {
        if (!list) return [];
        const q = search.trim().toLowerCase();
        return list.filter((r) => !q || String(r.name).toLowerCase().includes(q) || String(r.pid).includes(q)
            || String(r.barcode).toLowerCase().includes(q) || String(r.company).toLowerCase().includes(q));
    }, [list, search]);

    const exportRows = () => downloadXlsx('products', 'Products', PD_VIEW_COLS.map((c) => c.h),
        rows.map((r) => [r.pid, r.name, r.company, r.category, r.barcode, r.carton ?? '', r.packing, r.expiry_apply ? 'Yes' : 'No',
            String(r.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive']));


    const PD_SELECT = `${COA_SELECT} h-9 text-[15px]`;
    const PD_EDIT = `${EDIT} h-9 w-full text-[15px]`;
    const viewing = list !== null;

    return (
        <Modal title="Product Detail" onClose={() => !saving && askClose(onClose)} large={!viewing} xl={viewing}>
            <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-auto bg-[#c9c9f9] p-4`}>
                <fieldset className="shrink-0 rounded-md border-2 border-white/80 px-4 pb-4 pt-1">
                    <legend className="px-1 text-[24px] font-black tracking-tight text-[#1a1aff]">Product Detail</legend>
                    <div className="flex gap-4">
                        <div className="grid min-w-0 flex-1 grid-cols-[110px_minmax(0,1.3fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
                            <span className={LABEL}>PID</span>
                            <div className="flex h-9 w-[150px] items-center justify-center rounded-sm border border-slate-500 bg-[#dedede] text-[17px] font-black tabular-nums text-[#1f2bd6]">{pid}</div>
                            <span className="col-span-4" />

                            <span className={LABEL}>Product Name</span>
                            <input ref={nameRef} value={f.name} onChange={set('name')} maxLength={255} className={PD_EDIT} />
                            <button type="button" onClick={() => setFindCo(true)}
                                className="h-9 whitespace-nowrap rounded-sm border border-slate-500 bg-gradient-to-b from-white to-[#e2e2e8] px-3 text-[13px] font-bold text-slate-800 shadow-sm hover:to-[#d4d4dc] active:translate-y-px">
                                Find Company
                            </button>
                            <select value={f.company} onChange={set('company')} className={`${PD_SELECT} col-span-3`}>
                                <option value="">Select any one</option>
                                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <span className={LABEL}>Bar Code</span>
                            <input value={f.barcode} onChange={set('barcode')} maxLength={100} className={PD_EDIT} />
                            <span className={LABEL}>Carton</span>
                            <input value={f.carton} onChange={digits('carton')} inputMode="numeric" placeholder="pcs / carton" title="Pieces in one carton" className={PD_EDIT} />
                            <span className={LABEL}>Packing</span>
                            <input value={f.packing} onChange={digits('packing')} inputMode="numeric" placeholder="pcs / pack" title="Pieces in one pack" className={PD_EDIT} />
                            <span className="col-span-2" />
                            <span className={`col-span-4 -mt-1.5 text-[12.5px] font-semibold ${cartonN >= 1 && packN >= 1 && cartonN < packN ? 'text-red-600' : 'text-[#1f2bd6]'}`}>{cartonHint}</span>

                            <span className={LABEL}>Expiry Apply</span>
                            <select value={f.expiry} onChange={set('expiry')} className={PD_SELECT}>
                                <option value="">Select any One</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                            <span className={LABEL}>Category</span>
                            <select value={f.category} onChange={set('category')} className={PD_SELECT}>
                                <option value="">Select any one</option>
                                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <span className={LABEL}>Status</span>
                            <select value={f.status} onChange={set('status')} className={PD_SELECT}>
                                <option value="">Select any One</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>

                        {/* Picture */}
                        <div className="flex w-[150px] shrink-0 flex-col items-center gap-1.5">
                            <span className={LABEL}>Picture</span>
                            <button type="button" onClick={() => fileRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); pickImage(e.dataTransfer.files[0]); }}
                                title="Click or drop a picture"
                                className="flex h-[118px] w-full items-center justify-center overflow-hidden rounded-sm border border-slate-500 bg-white text-[12px] font-semibold text-slate-400 hover:bg-slate-50">
                                {preview ? <img src={preview} alt="Product" className="h-full w-full object-contain" /> : 'No Picture'}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
                            <div className="flex w-full gap-1.5">
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="h-7 flex-1 rounded-sm border border-slate-500 bg-gradient-to-b from-white to-[#e2e2e8] text-[12px] font-bold text-slate-800 hover:to-[#d4d4dc]">Browse</button>
                                <button type="button" onClick={clearImage} disabled={!preview}
                                    className="h-7 flex-1 rounded-sm border border-slate-500 bg-gradient-to-b from-white to-[#e2e2e8] text-[12px] font-bold text-slate-800 hover:to-[#d4d4dc] disabled:opacity-40">Remove</button>
                            </div>
                        </div>
                    </div>
                </fieldset>

                {viewing && (
                    <div className="min-h-[160px] flex-1 overflow-auto border border-slate-500 bg-[#9ea1ad]">
                        <table className="w-full min-w-[900px] table-fixed border-collapse bg-white text-[13px]">
                            <colgroup>{PD_VIEW_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                            <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{PD_VIEW_COLS.map((c) => <th key={c.h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{c.h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id} onClick={() => pickRow(r)}
                                        className={`cursor-pointer tabular-nums ${sel?.id === r.id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                        {[r.pid, r.name, r.company, r.category, r.barcode, r.carton ?? '', r.packing, r.expiry_apply ? 'Yes' : 'No',
                                            String(r.status).toUpperCase() === 'ACTIVE' ? 'Active' : 'Inactive'].map((v, k) => (
                                            <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 1 ? 'font-semibold' : ''}`}>{v}</td>
                                        ))}
                                    </tr>
                                ))}
                                {!rows.length && <tr><td colSpan={PD_VIEW_COLS.length} className="px-3 py-4 text-center text-slate-500">{list && list.length ? 'No products match.' : 'Loading…'}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#9da1d8] bg-[#c9c9f9] px-4 py-3">
                {viewing && (
                    <>
                        <span className={`${LABEL} text-[14px]`}>Search</span>
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, PID, bar code or company" className={`${EDIT} w-[240px]`} />
                        <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {rows.length}</span>} className="w-[190px]" />
                        <button type="button" onClick={exportRows} className={ACTION_BTN}>Export</button>
                    </>
                )}
                <span className="flex-1" />
                {sel && <button type="button" onClick={resetForm} className={ACTION_BTN}><span>Add <span className="underline">N</span>ew</span></button>}
                {!viewing && <button type="button" onClick={view} className={ACTION_BTN}><span className="underline">V</span>iew</button>}
                <button type="button" onClick={save} disabled={saving || !complete} className={ACTION_BTN}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : sel ? <><span className="underline">U</span>pdate</> : <><span className="underline">S</span>ave</>}
                </button>
                <button type="button" onClick={() => askClose(onClose)} disabled={saving} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
            </div>

            {findCo && (
                <FindCompanyWindow companies={companies} current={f.company} askClose={askClose} reload={reloadCompanies}
                    onPick={(c) => { setF((p) => ({ ...p, company: String(c.id) })); setFindCo(false); }}
                    onClose={() => setFindCo(false)} />
            )}
        </Modal>
    );
}

/* ───────────────────────── Find Product for Sale Return (legacy Trade 1.0) ─────────────────────────
   Every product (not only what is in stock): Company Name / Product Name /
   Product Bar Code filters; grid PID, Product Name, Pack, Company, Category.
   Click selects, Enter or double-click picks; Add New Product opens Product
   Detail. Works with or without a customer chosen. */
function ReturnFindProductWindow({ companies, askClose, onPick, onAddNew, onClose }: {
    companies: any[]; askClose: (fn: () => void, msg?: string) => void;
    onPick: (r: any) => void; onAddNew: (name: string) => void; onClose: () => void;
}) {
    const [all, setAll] = useState<any[] | null>(null);
    const [company, setCompany] = useState('');
    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState('');
    const [sel, setSel] = useState(-1);
    const gridRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        api.get('v1/products/items/trade_list/')
            .then(({ data }) => setAll(data.filter((r: any) => String(r.status).toUpperCase() === 'ACTIVE')))
            .catch(() => { toast.error('Could not load products.'); setAll([]); });
    }, []);
    const rows = useMemo(() => {
        const q = name.trim().toLowerCase();
        const bc = barcode.trim().toLowerCase();
        return (all || []).filter((r) =>
            (!company || String(r.company_id) === company) &&
            (!q || String(r.name).toLowerCase().includes(q) || String(r.pid).includes(q)) &&
            (!bc || String(r.barcode || '').toLowerCase() === bc));
    }, [all, company, name, barcode]);
    useEffect(() => { setSel(-1); }, [company, name, barcode]);
    const keys = (e: React.KeyboardEvent) => {
        if (!rows.length) return;
        if (e.key === 'Enter') { e.preventDefault(); onPick(rows[sel < 0 ? 0 : sel]); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const i = Math.min(rows.length - 1, Math.max(0, sel + (e.key === 'ArrowDown' ? 1 : -1)));
        setSel(i);
        gridRef.current?.querySelectorAll('tbody tr')[i]?.scrollIntoView({ block: 'nearest' });
    };
    return (
        <Modal title="Find Product" onClose={() => askClose(onClose)} xl>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#c9c9f9] p-3">
                <div className="grid shrink-0 grid-cols-[1.5fr_1.15fr_auto] gap-3">
                    <div className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-2 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 py-3">
                        <span className={LABEL}>Company Name</span>
                        <select value={company} onChange={(e) => setCompany(e.target.value)} className={COA_SELECT}>
                            <option value="">Select any one</option>
                            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <span className={LABEL}>Product Name</span>
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={keys}
                            placeholder="Name or PID" className={`${EDIT} w-full`} />
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 py-3">
                        <span className={`${LABEL} leading-tight`}>Product<br />Bar Code</span>
                        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={keys}
                            placeholder="Scan or type" className={`${FIELD} w-full border-slate-400 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200`} />
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                        <button type="button" onClick={() => onAddNew(/^\d+$/.test(name.trim()) ? '' : name.trim())} className={`${ACTION_BTN} min-w-[170px]`}>
                            <span><span className="underline">A</span>dd New Product</span>
                        </button>
                        <button type="button" onClick={() => askClose(onClose)}
                            className="flex h-9 min-w-[170px] items-center justify-center rounded-md border border-slate-400 bg-gradient-to-b from-[#f1f1f4] to-[#d6d6de] px-4 text-[14px] font-bold text-slate-700 shadow-sm hover:to-[#c9c9d4]">
                            <span className="underline">C</span>ancel
                        </button>
                    </div>
                </div>
                <div ref={gridRef} tabIndex={0} onKeyDown={keys}
                    className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                    <table className="w-[72%] min-w-[640px] table-fixed border-collapse bg-white text-[12.5px]">
                        <colgroup><col style={{ width: '10%' }} /><col style={{ width: '44%' }} /><col style={{ width: '10%' }} /><col style={{ width: '20%' }} /><col style={{ width: '16%' }} /></colgroup>
                        <thead className="sticky top-0 z-10 bg-[#ffe1b8] text-left">
                            <tr>{['PID', 'Product Name', 'Pack', 'Company', 'Category'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.slice(0, 500).map((r, i) => (
                                <tr key={r.id} onClick={() => setSel(i)} onDoubleClick={() => onPick(r)} title="Click to select · Enter or double-click to pick"
                                    className={`cursor-pointer tabular-nums ${sel === i ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                    {[r.pid, r.name, r.packing, r.company, r.category].map((v, k) => (
                                        <td key={k} title={String(v ?? '')} className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1">{v}</td>
                                    ))}
                                </tr>
                            ))}
                            {!rows.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">{all ? 'No product matches.' : 'Loading…'}</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="shrink-0 text-[12.5px] font-semibold text-[#1f2bd6]">
                    {all ? `${rows.length} product(s)${rows.length > 500 ? ' — showing the first 500, type to narrow' : ''}` : ''} · click a row, then Enter (or double-click) to pick it
                </div>
            </div>
        </Modal>
    );
}

/* ───────────────────────── main window ───────────────────────── */
/* mode 'records': the dashboard's Sale Records button — the Sale / Sale-Return
   Records window on its own (Find Account, Chart of Account, Print and Sale
   Return all work from it); closing it closes the pop-up. */
export default function TradeSaleInvoice({ mode = 'invoice' }: { mode?: 'invoice' | 'records' | 'return' | 'coa' }) {
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

    // Invoice
    const [invoiceNo, setInvoiceNo] = useState('…');
    // Product PR / Invoice PV are show-hide switches for the two profit rows
    // (legacy behaviour); the choice is remembered in this browser.
    const [prRow, setPrRow] = useState(true);
    const [pvRow, setPvRow] = useState(true);
    useEffect(() => {
        try {
            setPrRow(localStorage.getItem('trade.sale.prRow') !== '0');
            setPvRow(localStorage.getItem('trade.sale.pvRow') !== '0');
        } catch { /* storage unavailable: keep both shown */ }
    }, []);
    const toggleRow = (key: 'prRow' | 'pvRow') => {
        const set = key === 'prRow' ? setPrRow : setPvRow;
        set((v) => {
            try { localStorage.setItem(`trade.sale.${key}`, v ? '0' : '1'); } catch { /* ignore */ }
            return !v;
        });
    };
    const [showPV, setShowPV] = useState(false);
    // Printed invoice size: Half A4 landscape or a thermal slip (remembered per browser).
    const [printSize, setPrintSize] = useState<InvoiceSize>('a4');
    useEffect(() => { setPrintSize(savedInvoiceSize()); }, []);
    const choosePrintSize = (v: InvoiceSize) => {
        setPrintSize(v);
        try { localStorage.setItem('trade.invoice.size', v); } catch { /* ignore */ }
    };
    const [saving, setSaving] = useState(false);

    // Bottom bar: Paid Cash / Saleman / Sale Date
    const [paidCash, setPaidCash] = useState('');
    const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
    const [salesman, setSalesman] = useState('');
    const [backDate, setBackDate] = useState(false);
    const today = () => new Date().toISOString().slice(0, 10);
    const [saleDate, setSaleDate] = useState(today);

    // View: saved sale invoices
    const [showView, setShowView] = useState(false);

    const custRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const unitRef = useRef<HTMLSelectElement>(null);
    const qtyPRef = useRef<HTMLInputElement>(null);
    const qtyURef = useRef<HTMLInputElement>(null);
    const bonRef = useRef<HTMLInputElement>(null);
    const tpRef = useRef<HTMLInputElement>(null);
    const discRef = useRef<HTMLInputElement>(null);
    const shelfRef = useRef<HTMLInputElement>(null);

    useEffect(() => { document.title = `AL-QAVI TRADERS  Trade 1.0  ( ${mode === 'records' ? 'Sale Records' : mode === 'return' ? 'Sale Return' : mode === 'coa' ? 'Chart of Account' : 'Sale Invoice'} )`; }, [mode]);

    const loadInvoiceNo = useCallback(() => {
        api.get('v1/sales/orders/next_invoice_no/')
            .then(({ data }) => setInvoiceNo(data.invoice_no))
            .catch(() => setInvoiceNo('—'));
    }, []);

    useEffect(() => {
        loadInvoiceNo();
        // The customers API pages at most 100 rows, so walk every page — the
        // code lookup and Find Customer need the whole list.
        (async () => {
            const all: any[] = [];
            try {
                for (let page = 1; page <= 100; page++) {
                    const { data } = await api.get('/v1/company/customers/', { params: { page, page_size: 100 } });
                    if (Array.isArray(data)) { all.push(...data); break; }
                    all.push(...(data.results || []));
                    if (!data.next) break;
                }
            } catch { /* keep whatever loaded */ }
            setCustomers(all);
        })();
        custRef.current?.focus();
    }, [loadInvoiceNo]);

    /* ── "Do you want to Close the Form ?" — every window asks before closing
       (programmatic closes after a save/pick don't). */
    const [ask, setAsk] = useState<null | { msg: string; yes: () => void }>(null);
    const askClose = (fn: () => void, msg = 'Do you want to Close the Form ?') => setAsk({ msg, yes: fn });

    /* ── Add New → Chart of Accounts (legacy Trade 1.0 "Chart of Account" window) ──
       Opened from Find Customer with Assets › Current assets › Accounts
       Receivables preselected, so a new account is a customer by default. */
    const CUSTOMER_GROUP = 1202;
    const EMPTY_COA = { main: '', l2: '', l3: '', name: '', cell: '', contact: '', address: '', area: '', status: '' };
    const [addingCust, setAddingCust] = useState(false);
    const [coa, setCoa] = useState({ ...EMPTY_COA });
    const [groups, setGroups] = useState<{ code: number; name: string; level: number; parent: number | null }[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [nextAccId, setNextAccId] = useState('');
    const [savingCust, setSavingCust] = useState(false);
    const [coaList, setCoaList] = useState<any[] | null>(null);

    const groupsAt = (level: number, parent: string) =>
        groups.filter((g) => g.level === level && (level === 1 || String(g.parent) === parent));

    const loadAreas = async () => {
        const all: any[] = [];
        try {
            for (let page = 1; page <= 50; page++) {
                const { data } = await api.get('v1/company/areas/', { params: { page, page_size: 100 } });
                if (Array.isArray(data)) { all.push(...data); break; }
                all.push(...(data.results || []));
                if (!data.next) break;
            }
        } catch { /* area is optional */ }
        setAreas(all.filter((a) => a.is_active !== false).sort((a, b) => String(a.name).localeCompare(String(b.name))));
    };

    // From Find Account a new account is a customer by default; the dashboard's
    // Chart of Account button (mode 'coa') starts with no level chosen.
    const openAddCustomer = (blank = false) => {
        const q = custQuery.trim();
        setCoa(blank ? { ...EMPTY_COA } : { ...EMPTY_COA, main: '1', l2: '12', l3: String(CUSTOMER_GROUP), name: q && !/^\d+$/.test(q) ? q : '' });
        setCoaList(null);
        setCoaSel(null);
        setAddingCust(true);
        if (!groups.length) api.get('v1/company/account-groups/').then(({ data }) => setGroups(data)).catch(() => setGroups([]));
        if (!areas.length) loadAreas();
    };

    // Account ID preview follows the chosen 3rd level.
    useEffect(() => {
        if (!addingCust || !coa.l3) { setNextAccId(''); return; }
        api.get('v1/company/ledger-accounts/next_id/', { params: { group: coa.l3 } })
            .then(({ data }) => setNextAccId(data.acc_id || ''))
            .catch(() => setNextAccId(''));
    }, [addingCust, coa.l3]);

    /* ── Sub Area window (Area › Add) — legacy District › Main Area › Sub Area.
       Area codes follow the import: D# district, M# main area, A# sub area. */
    const [showSubArea, setShowSubArea] = useState(false);
    const [subArea, setSubArea] = useState({ name: '', district: '', main: '' });
    const [savingArea, setSavingArea] = useState(false);
    const areaKind = (a: any) => String(a.code || '').charAt(0).toUpperCase();
    const districts = areas.filter((a) => areaKind(a) === 'D');
    const mainAreas = areas.filter((a) => areaKind(a) === 'M' && (!subArea.district || String(a.parent) === subArea.district));
    const nextSubAreaId = useMemo(() => {
        const nums = areas.filter((a) => areaKind(a) === 'A').map((a) => parseInt(String(a.code).slice(1), 10)).filter((n) => !isNaN(n));
        return nums.length ? Math.max(...nums) + 1 : 1;
    }, [areas]);

    const addArea = () => {
        setSubArea({ name: '', district: '', main: '' });
        setShowSubArea(true);
    };

    const saveSubArea = async () => {
        if (savingArea) return;
        const name = subArea.name.trim();
        if (!name) { toast.error('Enter the Sub Area Name.'); return; }
        if (!subArea.main) { toast.error('Select the Main Area.'); return; }
        setSavingArea(true);
        try {
            const { data } = await api.post('v1/company/areas/', {
                name, code: `A${nextSubAreaId}`, parent: Number(subArea.main), is_active: true,
            });
            await loadAreas();
            setCoa((c) => ({ ...c, area: String(data.id) }));
            setShowSubArea(false);
            toast.success(`Sub area ${nextSubAreaId} — ${name} added.`);
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not add the sub area.'));
        } finally { setSavingArea(false); }
    };

    /* ── Chart of Account › View — its own window (legacy view screen): the form
       on top, every account in a grid below. Picking a row loads it into this
       window's form for Update / Delete. */
    const [showCoaView, setShowCoaView] = useState(false);
    const [coaV, setCoaV] = useState({ ...EMPTY_COA });
    const [coaSearch, setCoaSearch] = useState('');
    const [coaSel, setCoaSel] = useState<any | null>(null);
    const [coaBusy, setCoaBusy] = useState(false);

    const viewAccounts = async () => {
        setCoaV({ ...EMPTY_COA });
        setCoaSel(null);
        setCoaSearch('');
        setCoaList(null);
        setShowCoaView(true);
        try {
            const { data } = await api.get('v1/company/ledger-accounts/');
            setCoaList(data);
        } catch { toast.error('Could not load accounts.'); setCoaList([]); }
    };

    // Grid narrows by the level dropdowns and the Search Account box. While a row
    // is selected its levels fill the dropdowns, so they don't filter then.
    const coaRows = useMemo(() => {
        if (!coaList) return [];
        const q = coaSearch.trim().toLowerCase();
        const byLevel = !coaSel;
        return coaList.filter((a) =>
            (!byLevel || !coaV.main || String(a.main) === coaV.main) &&
            (!byLevel || !coaV.l2 || String(a.level2) === coaV.l2) &&
            (!byLevel || !coaV.l3 || String(a.group) === coaV.l3) &&
            (!q || String(a.acc_id).includes(q) || String(a.name).toLowerCase().includes(q)
                || String(a.area_name || '').toLowerCase().includes(q)));
    }, [coaList, coaV.main, coaV.l2, coaV.l3, coaSearch, coaSel]);

    const pickCoaRow = (a: any) => {
        setCoaSel(a);
        setCoaV({
            main: String(a.main ?? ''), l2: String(a.level2 ?? ''), l3: String(a.group ?? ''),
            name: a.name || '', cell: a.cell_no || '', contact: a.contact_person || '', address: a.address || '',
            area: a.area ? String(a.area) : '', status: a.status || '',
        });
    };

    // Add New: back to the entry window, cleared for a new account.
    const coaAddNew = () => {
        setShowCoaView(false);
        setCoa((c) => ({ ...EMPTY_COA, main: coaV.main || c.main, l2: coaV.l2 || c.l2, l3: coaV.l3 || c.l3 }));
    };

    const updateAccount = async () => {
        if (!coaSel || coaBusy) return;
        if (!coaV.name.trim()) { toast.error('Enter the Acc. Name.'); return; }
        setCoaBusy(true);
        try {
            const { data } = await api.patch(`v1/company/ledger-accounts/${coaSel.id}/`, {
                name: coaV.name.trim(), cell_no: coaV.cell.trim(), contact_person: coaV.contact.trim(), address: coaV.address.trim(),
                area: coaV.area || null, status: coaV.status || coaSel.status,
            });
            setCoaList((l) => (l || []).map((x) => (x.id === data.id ? data : x)));
            setCoaSel(data);
            if (data.customer) {
                setCustomers((cs) => cs.map((c) => (c.id === data.customer
                    ? { ...c, first_name: data.name, last_name: '', phone: data.cell_no, address: data.address, area: data.area, area_name: data.area_name, is_active: data.status === 'active' }
                    : c)));
            }
            toast.success(`Account ${data.acc_id} updated.`);
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(String(d?.detail || 'Could not update the account.'));
        } finally { setCoaBusy(false); }
    };

    const deleteAccount = () => {
        if (!coaSel) return;
        const sel = coaSel;
        setAsk({
            msg: `Do you want to Delete account ${sel.acc_id} — ${sel.name} ?`,
            yes: async () => {
                setCoaBusy(true);
                try {
                    await api.delete(`v1/company/ledger-accounts/${sel.id}/`);
                    setCoaList((l) => (l || []).filter((x) => x.id !== sel.id));
                    if (sel.customer) setCustomers((cs) => cs.filter((c) => c.id !== sel.customer));
                    setCoaSel(null);
                    setCoaV({ ...EMPTY_COA });
                    toast.success(`Account ${sel.acc_id} deleted.`);
                } catch (err: any) {
                    toast.error(String(err?.response?.data?.detail || 'Could not delete the account.'), { duration: 7000 });
                } finally { setCoaBusy(false); }
            },
        });
    };

    const exportAccounts = () => downloadXlsx('chart-of-accounts', 'Chart of Accounts',
        ['Main Account', '2nd Level Acc.', '3rd Level Acc.', 'Account ID', 'Acc. Name', 'Area', 'Cell No', 'Contact Person', 'Status'],
        coaRows.map((a) => [a.main_name, a.level2_name, a.group_name, a.acc_id, a.name, a.area_name || '', a.cell_no, a.contact_person, a.address || '', a.status]));

    /* ── Sub Area › View — its own window: District · Main Area · Area ID · Area Name. */
    const [showAreaView, setShowAreaView] = useState(false);
    const [areaV, setAreaV] = useState({ name: '', district: '', main: '' });
    const [areaSel, setAreaSel] = useState<any | null>(null);
    const [areaSearch, setAreaSearch] = useState('');
    const [areaBusy, setAreaBusy] = useState(false);
    const areaById = useMemo(() => new Map(areas.map((a) => [String(a.id), a])), [areas]);
    const mainAreasOf = (district: string) =>
        areas.filter((a) => areaKind(a) === 'A' ? false : areaKind(a) === 'M' && (!district || String(a.parent) === district));

    const subAreaRows = useMemo(() => {
        const q = areaSearch.trim().toLowerCase();
        const byLevel = !areaSel;
        return areas
            .filter((a) => areaKind(a) === 'A')
            .map((a) => {
                const main = areaById.get(String(a.parent));
                const dist = main ? areaById.get(String(main.parent)) : undefined;
                return { a, id: parseInt(String(a.code).slice(1), 10) || 0, main, dist };
            })
            .filter((r) =>
                (!byLevel || !areaV.district || String(r.dist?.id) === areaV.district) &&
                (!byLevel || !areaV.main || String(r.main?.id) === areaV.main) &&
                (!q || String(r.a.name).toLowerCase().includes(q) || String(r.id).includes(q)))
            .sort((x, y) => String(x.dist?.name || '').localeCompare(String(y.dist?.name || ''))
                || String(x.main?.name || '').localeCompare(String(y.main?.name || ''))
                || x.id - y.id);
    }, [areas, areaById, areaV.district, areaV.main, areaSearch, areaSel]);

    const viewAreas = () => {
        setAreaV({ name: '', district: '', main: '' });
        setAreaSel(null);
        setAreaSearch('');
        setShowAreaView(true);
    };

    const pickAreaRow = (r: any) => {
        setAreaSel(r);
        setAreaV({ name: r.a.name, district: r.dist ? String(r.dist.id) : '', main: r.main ? String(r.main.id) : '' });
    };

    const areaAddNew = () => {
        setShowAreaView(false);
        setSubArea({ name: '', district: areaV.district, main: areaV.main });
    };

    const updateArea = async () => {
        if (!areaSel || areaBusy) return;
        const name = areaV.name.trim();
        if (!name) { toast.error('Enter the Sub Area Name.'); return; }
        if (!areaV.main) { toast.error('Select the Main Area.'); return; }
        setAreaBusy(true);
        try {
            await api.patch(`v1/company/areas/${areaSel.a.id}/`, { name, parent: Number(areaV.main) });
            await loadAreas();
            setAreaSel(null);
            toast.success(`Sub area ${areaSel.id} updated.`);
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not update the sub area.'));
        } finally { setAreaBusy(false); }
    };

    const deleteArea = () => {
        if (!areaSel) return;
        const sel = areaSel;
        const used = Number(sel.a.customer_count || 0);
        if (used > 0) {
            toast.error(`${sel.a.name} has ${used} customer(s), so it cannot be deleted.`, { duration: 6000 });
            return;
        }
        setAsk({
            msg: `Do you want to Delete sub area ${sel.id} — ${sel.a.name} ?`,
            yes: async () => {
                setAreaBusy(true);
                try {
                    await api.delete(`v1/company/areas/${sel.a.id}/`);
                    await loadAreas();
                    setAreaSel(null);
                    setAreaV({ name: '', district: '', main: '' });
                    toast.success(`Sub area ${sel.id} deleted.`);
                } catch (err: any) {
                    toast.error(String(err?.response?.data?.detail || 'Could not delete the sub area.'));
                } finally { setAreaBusy(false); }
            },
        });
    };

    const exportAreas = () => downloadXlsx('sub-areas', 'Sub Areas', ['District', 'Main Area', 'Area ID', 'Area Name'],
        subAreaRows.map((r) => [r.dist?.name || '', r.main?.name || '', r.id, r.a.name]));

    /* Shared form bodies — the entry window and its View window show the same form. */
    type CoaState = typeof EMPTY_COA;
    const coaForm = (f: CoaState, setF: React.Dispatch<React.SetStateAction<CoaState>>, accId: string, onEnter: () => void, focus: boolean) => (
        <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
            <legend className="px-1.5 text-[20px] font-black tracking-tight text-[#1f2bd6]">Chart of Accounts</legend>
            <div className="grid grid-cols-[112px_1fr_98px_1fr_96px_1fr] items-center gap-x-2.5 gap-y-3">
                <span className={LABEL}>Main Account</span>
                <select value={f.main} onChange={(e) => setF((c) => ({ ...c, main: e.target.value, l2: '', l3: '' }))} className={COA_SELECT}>
                    <option value="">Select any one</option>
                    {groupsAt(1, '').map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
                </select>
                <span className={LABEL}>Acc.2nd Level</span>
                <select value={f.l2} onChange={(e) => setF((c) => ({ ...c, l2: e.target.value, l3: '' }))} disabled={!f.main} className={COA_SELECT}>
                    <option value="">Select any one</option>
                    {groupsAt(2, f.main).map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
                </select>
                <span className={LABEL}>Acc 3rd Level</span>
                <select value={f.l3} onChange={(e) => setF((c) => ({ ...c, l3: e.target.value }))} disabled={!f.l2} className={COA_SELECT}>
                    <option value="">Select any one</option>
                    {groupsAt(3, f.l2).map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
                </select>

                <span className={LABEL}>Account ID</span>
                <ReadBox value={<span className="font-mono">{accId}</span>} />
                <span className={LABEL}>Cell No</span>
                <input value={f.cell} onChange={(e) => setF((c) => ({ ...c, cell: e.target.value }))} inputMode="tel" className={`${EDIT} w-full`} />
                <span className={`${LABEL} flex items-center justify-between gap-1`}>
                    Area
                    <button type="button" onClick={addArea}
                        className="h-7 rounded border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] px-2 text-[12px] font-bold text-slate-800 hover:to-[#ffcf9a]">Add</button>
                </span>
                <select value={f.area} onChange={(e) => setF((c) => ({ ...c, area: e.target.value }))} className={COA_SELECT}>
                    <option value="">Select any one</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name}{a.parent_name ? `  (${a.parent_name})` : ''}</option>)}
                </select>

                <span className={LABEL}>Acc. Name</span>
                <input autoFocus={focus} value={f.name} onChange={(e) => setF((c) => ({ ...c, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') onEnter(); }} className={`${EDIT} col-span-3 w-full`} />
                {/* Address: a block beside Acc. Name, two rows tall. */}
                <span className={`${LABEL} row-span-2 self-start pt-2`}>Address</span>
                <textarea value={f.address} onChange={(e) => setF((c) => ({ ...c, address: e.target.value }))} rows={3} maxLength={1000}
                    placeholder="Shop / house no., street, area, city"
                    className={`${EDIT} row-span-2 h-full min-h-[76px] w-full resize-none py-1.5 leading-snug`} />

                <span className={LABEL}>Contact Person</span>
                <input value={f.contact} onChange={(e) => setF((c) => ({ ...c, contact: e.target.value }))} className={`${EDIT} w-full`} />
                <span className={LABEL}>Status</span>
                <select value={f.status} onChange={(e) => setF((c) => ({ ...c, status: e.target.value }))} className={COA_SELECT}>
                    <option value="">Select any One</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
        </fieldset>
    );

    type AreaFormState = { name: string; district: string; main: string };
    const subAreaForm = (f: AreaFormState, setF: React.Dispatch<React.SetStateAction<AreaFormState>>, idText: string, onEnter: () => void, focus: boolean) => (
        <fieldset className="rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-4 pt-1">
            <legend className="px-1.5 text-[20px] font-black tracking-tight text-[#1f2bd6]">Sub Area</legend>
            <div className="grid grid-cols-[124px_1fr_92px_1fr] items-center gap-x-3 gap-y-3">
                <span className={LABEL}>Sub Area ID</span>
                <ReadBox value={idText} className="justify-center font-mono" />
                <span className="col-span-2" />
                <span className={LABEL}>Sub Area Name</span>
                <input autoFocus={focus} value={f.name} onChange={(e) => setF((a) => ({ ...a, name: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') onEnter(); }} className={`${EDIT} w-full`} />
                <span className="col-span-2" />
                <span className={LABEL}>District</span>
                <select value={f.district} onChange={(e) => setF((a) => ({ ...a, district: e.target.value, main: '' }))} className={COA_SELECT}>
                    <option value="">Select any one</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <span className={LABEL}>Main Area</span>
                <select value={f.main} onChange={(e) => setF((a) => ({ ...a, main: e.target.value }))} className={COA_SELECT}>
                    <option value="">Select any one</option>
                    {mainAreasOf(f.district).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>
        </fieldset>
    );

    const saveNewCustomer = async () => {
        if (savingCust) return;
        const name = coa.name.trim();
        if (!coa.l3) { toast.error('Select the Acc 3rd Level.'); return; }
        if (!name) { toast.error('Enter the Acc. Name.'); return; }
        setSavingCust(true);
        try {
            const { data } = await api.post('v1/company/ledger-accounts/', {
                group: coa.l3, name, cell_no: coa.cell.trim(), contact_person: coa.contact.trim(), address: coa.address.trim(),
                area: coa.area || null, status: coa.status || 'active',
            });
            toast.success(`Account ${data.acc_id} — ${name} saved.`);
            if (data.customer_record && mode === 'coa') {
                // Standalone Chart of Account: keep the window open for the next account.
                setCustomers((cs) => [data.customer_record, ...cs]);
                setCoa((c) => ({ ...c, name: '', cell: '', contact: '', address: '' }));
                api.get('v1/company/ledger-accounts/next_id/', { params: { group: coa.l3 } })
                    .then(({ data: n }) => setNextAccId(n.acc_id || '')).catch(() => {});
            } else if (data.customer_record) {
                // A receivables account is a customer: put it straight on the invoice.
                setCustomers((cs) => [data.customer_record, ...cs]);
                setAddingCust(false);
                pickCustomer(data.customer_record);
            } else {
                setCoa((c) => ({ ...c, name: '', cell: '', contact: '', address: '' }));
                api.get('v1/company/ledger-accounts/next_id/', { params: { group: coa.l3 } })
                    .then(({ data: n }) => setNextAccId(n.acc_id || '')).catch(() => {});
            }
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the account.'), { duration: 6000 });
        } finally { setSavingCust(false); }
    };

    // Find Account serves the invoice and the Sale Records filter.
    const custTarget = useRef<'invoice' | 'records' | 'return'>('invoice');
    const closeFindCustomer = () => { setShowFindCust(false); setAddingCust(false); custTarget.current = 'invoice'; };
    const [custSel, setCustSel] = useState(-1);
    const custGridRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (showFindCust) setCustSel(-1); }, [showFindCust]);

    // Saleman options — the legacy Staff list (all kept for Sale Records;
    // only active ones are offered on a new invoice).
    const [allStaff, setAllStaff] = useState<{ id: string; name: string; status: string }[]>([]);
    useEffect(() => {
        api.get('v1/sales/orders/staff_list/').then(({ data }) => {
            const list = (data || []).map((x: any) => ({ id: String(x.id), name: x.name, status: x.status }));
            setAllStaff(list);
            setStaff(list.filter((x: any) => x.status === 'active'));
        }).catch(() => { setAllStaff([]); setStaff([]); });
    }, []);

    useEffect(() => {
        if (!customer) { setPrevBal(0); return; }
        orderService.getCustomerBalance(String(customer.id))
            .then((b: any) => setPrevBal(num(b?.previous_balance)))
            .catch(() => setPrevBal(0));
    }, [customer]);

    // Closing the pop-up with the browser's own X (or refreshing) asks first,
    // like every window's own Close / Cancel. Our confirmed closes pass through.
    useEffect(() => guardWindowClose(), []);

    /* ── customer ── */
    const pickCustomer = (c: any) => {
        if (custTarget.current === 'return') {
            custTarget.current = 'invoice';
            setShowFindCust(false); setCustQuery('');
            setRrCustomer(c);
            return;
        }
        if (custTarget.current === 'records') {
            custTarget.current = 'invoice';
            setSrCust(c); setSrCustInput(custCode(c));
            setShowFindCust(false); setCustQuery('');
            return;
        }
        setCustomer(c);
        setCustInput(custCode(c));
        setShowFindCust(false);
        setCustQuery('');
        setTimeout(() => codeRef.current?.focus(), 0);
    };

    const resolveCustomer = () => {
        const q = custInput.trim().toLowerCase();
        if (!q) { setShowFindCust(true); return; }
        const hit = customers.find((c) => custCode(c).toLowerCase() === q);
        if (hit) pickCustomer(hit);
        else { setCustQuery(custInput.trim()); setShowFindCust(true); }
    };

    // Customers sit under Current assets › Accounts Receivable in the chart of accounts.
    useEffect(() => {
        if (showFindCust && !groups.length) api.get('v1/company/account-groups/').then(({ data }) => setGroups(data)).catch(() => {});
    }, [showFindCust]); // eslint-disable-line react-hooks/exhaustive-deps
    const custGroupNames = useMemo(() => ({
        l2: groups.find((g) => g.code === 12)?.name || 'Current assets',
        l3: groups.find((g) => g.code === CUSTOMER_GROUP)?.name || 'Accounts Receivable',
    }), [groups]);
    const custMatches = useMemo(() => {
        const q = custQuery.trim().toLowerCase();
        const list = customers.filter((c) => c.is_active !== false);
        if (!q) return list.slice(0, 200);
        return list.filter((c) =>
            custCode(c).toLowerCase().includes(q) || custName(c).toLowerCase().includes(q) ||
            String(c.area_name || '').toLowerCase().includes(q) || String(c.phone || '').includes(q)).slice(0, 200);
    }, [customers, custQuery]);
    const custGridKeys = (e: React.KeyboardEvent) => {
        const n = custMatches.length;
        if (!n) return;
        if (e.key === 'Enter') { e.preventDefault(); pickCustomer(custMatches[custSel < 0 ? 0 : custSel]); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const i = Math.min(n - 1, Math.max(0, custSel + (e.key === 'ArrowDown' ? 1 : -1)));
        setCustSel(i);
        custGridRef.current?.querySelectorAll('tbody tr')[i]?.scrollIntoView({ block: 'nearest' });
    };

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
        setEntry((e) => ({ ...EMPTY_ENTRY, unit: e.unit === 'CARTON' && p.carton > 0 ? 'CARTON' : 'PIECE', shelfPct: e.shelfPct }));
        applyBatch(p, first?.id || '');
        setShowFindProd(false);
        if (!p.batches.length) toast.error(`${p.name} has no stock to sell.`);
        setTimeout(() => unitRef.current?.focus(), 0);
    };

    const resolveCode = async () => {
        const code = entry.code.trim();
        if (!code) { openFindProduct(); return; }
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code } });
            if (data.length) loadProduct(data[0]);
            else { openFindProduct(code); }
        } catch { toast.error('Product lookup failed.'); }
    };

    /* ── Find Product window (legacy Trade 1.0): filters on top, available stock
       (one row per in-stock batch) in the middle, and below it what the selected
       customer has bought from us before. ── */
    const [fpCompany, setFpCompany] = useState('');
    const [fpName, setFpName] = useState('');
    const [fpBarcode, setFpBarcode] = useState('');
    const [companies, setCompanies] = useState<any[]>([]);
    const [stockRows, setStockRows] = useState<any[]>([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [histRows, setHistRows] = useState<any[]>([]);
    const [fpSel, setFpSel] = useState('');
    // Who asked for Find Product: the invoice entry row, or the Sale Return history filter.
    const fpTarget = useRef<'invoice' | 'return'>('invoice');
    const [fpHistSel, setFpHistSel] = useState(-1);
    const fpStockRef = useRef<HTMLDivElement>(null);
    const fpHistRef = useRef<HTMLDivElement>(null);
    const [showProdDetail, setShowProdDetail] = useState(false);

    const loadCompanies = async () => {
        const all: any[] = [];
        try {
            for (let page = 1; page <= 20; page++) {
                const { data } = await api.get('v1/company/companies/', { params: { page, page_size: 100 } });
                if (Array.isArray(data)) { all.push(...data); break; }
                all.push(...(data.results || []));
                if (!data.next) break;
            }
        } catch { /* company filter is optional */ }
        setCompanies(all.sort((a, b) => String(a.name).localeCompare(String(b.name))));
    };

    const openFindProduct = (name = '', target: 'invoice' | 'return' = 'invoice') => {
        fpTarget.current = target;
        setFpName(name); setFpBarcode(''); setFpSel(''); setFpHistSel(-1);
        setShowFindProd(true);
        if (!companies.length) loadCompanies();
        if (customer) {
            api.get('v1/sales/orders/customer_items/', { params: { customer: customer.id } })
                .then(({ data }) => setHistRows(data)).catch(() => setHistRows([]));
        } else setHistRows([]);
    };

    // Nothing is listed until there is something to search by.
    const fpSearching = !!(fpCompany || fpName.trim() || fpBarcode.trim());

    // Purchase history narrows by the chosen company and the typed name too.
    const histShown = useMemo(() => {
        const q = fpName.trim().toLowerCase();
        return histRows.filter((r) =>
            (!fpCompany || String(r.company_id) === fpCompany) &&
            (!q || String(r.name).toLowerCase().includes(q) || String(r.pid).includes(q)));
    }, [histRows, fpCompany, fpName]);

    // Available stock follows the filters (debounced).
    useEffect(() => {
        if (!showFindProd) return;
        if (!fpSearching) { setStockRows([]); setStockLoading(false); return; }
        setStockLoading(true);
        const t = setTimeout(() => {
            const params: any = {};
            if (fpCompany) params.company = fpCompany;
            if (fpName.trim()) params.q = fpName.trim();
            if (fpBarcode.trim()) params.barcode = fpBarcode.trim();
            api.get('v1/products/items/stock_list/', { params })
                .then(({ data }) => setStockRows(data))
                .catch(() => setStockRows([]))
                .finally(() => setStockLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [showFindProd, fpCompany, fpName, fpBarcode, fpSearching]);

    // Keyboard handler is bound once; route F3 to the latest opener.
    const openFpRef = useRef(openFindProduct);
    openFpRef.current = openFindProduct;

    // Pick a stock row: load that product into the entry row on that exact batch.
    /* Grid keys (legacy): click selects, Enter adds the selected row — same as a
       double-click — and Up/Down move the selection. */
    useEffect(() => { setFpHistSel(-1); }, [histShown]);

    const gridKeys = (count: number, at: number, select: (i: number) => void, pick: (i: number) => void, box: React.RefObject<HTMLDivElement | null>) =>
        (e: React.KeyboardEvent) => {
            if (!count) return;
            if (e.key === 'Enter') { e.preventDefault(); pick(at < 0 ? 0 : at); return; }
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();
            const i = Math.min(count - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)));
            select(i);
            box.current?.querySelectorAll('tbody tr')[i]?.scrollIntoView({ block: 'nearest' });
        };

    const pickForReturn = (pid: string) => {
        fpTarget.current = 'invoice';
        setShowFindProd(false);
        setRrProduct(pid);
        loadRrHistory(rrCust, rrInvoice, pid);
    };

    const pickStockRow = async (r: any) => {
        if (fpTarget.current === 'return') { pickForReturn(r.pid); return; }
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: r.pid } });
            const prod: LookupProduct | undefined = data.find((x: any) => x.id === r.product_id) || data[0];
            if (!prod) { toast.error('Product not found.'); return; }
            loadProduct(prod);
            if (prod.batches.some((b) => b.id === r.batch_id)) applyBatch(prod, r.batch_id);
        } catch { toast.error('Could not load the product.'); }
    };

    // Pick a history row: same product again, with the discount given last time.
    const pickHistoryRow = async (r: any) => {
        if (!r.pid) return;
        if (fpTarget.current === 'return') { pickForReturn(r.pid); return; }
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: r.pid } });
            const prod: LookupProduct | undefined = data.find((x: any) => x.id === r.product_id) || data[0];
            if (!prod) { toast.error('This product is no longer available.'); return; }
            loadProduct(prod);
            if (num(r.tp_pct) > 0) setEntry((e) => ({ ...e, discPct: String(num(r.tp_pct)) }));
            if (num(r.shelf_pct) > 0) setEntry((e) => ({ ...e, shelfPct: String(num(r.shelf_pct)) }));
        } catch { toast.error('Could not load the product.'); }
    };

    // Barcode: Enter picks the product straight away when it matches one batch.
    const onBarcodeEnter = async () => {
        const code = fpBarcode.trim();
        if (!code) return;
        try {
            const { data } = await api.get('v1/products/items/stock_list/', { params: { barcode: code } });
            setStockRows(data);
            if (data.length === 1) pickStockRow(data[0]);
            else if (!data.length) toast.error('No product in stock with that barcode.');
        } catch { toast.error('Barcode lookup failed.'); }
    };

    /* ── entry maths ── */
    const p = entry.product;
    const batch = p?.batches.find((b) => b.id === entry.batchId) || null;
    const packing = p?.packing || 1;
    const cartonPcs = p?.carton || 0;
    // With no product loaded the chosen unit is kept for the next one.
    const unit: SaleUnit = entry.unit === 'CARTON' && (!p || cartonPcs > 0) ? 'CARTON' : 'PIECE';
    const perQty = unit === 'CARTON' ? cartonPcs || 1 : packing;
    const totalUnits = num(entry.qtyP) * perQty + num(entry.qtyU);
    const bonus = num(entry.bonus);
    const tp = num(entry.tp);
    const discPct = num(entry.discPct);
    const shelfPct = num(entry.shelfPct);
    const subTotal = totalUnits * tp;
    const discAmt = subTotal * (discPct / 100);
    const shelfAmt = subTotal * (shelfPct / 100);
    const entryNet = subTotal - discAmt - shelfAmt;
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
            discPct, shelfPct, cost: purRate, unit, carton: cartonPcs,
        }]);
        // The next line starts with the same unit and shelf rate (one shop's shelf).
        setEntry({ ...EMPTY_ENTRY, unit: entry.unit, shelfPct: entry.shelfPct });
        setSelected(-1);
        codeRef.current?.focus();
    };

    const removeLine = () => {
        if (selected < 0 || selected >= lines.length) { toast.error('Select a line in the grid to remove.'); return; }
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
            applyBatch(prod, l.batchId, { qtyU: String(l.qty), bonus: l.bonus ? String(l.bonus) : '', discPct: l.discPct ? String(l.discPct) : '', shelfPct: l.shelfPct ? String(l.shelfPct) : '' });
            setEntry((e) => ({ ...e, tp: String(l.tp) }));
            setTimeout(() => qtyURef.current?.focus(), 0);
        } catch { toast.error('Could not load that line.'); }
    };

    /* ── invoice totals ── */
    const amountBilled = lines.reduce((s, l) => s + lineGross(l), 0);
    const totalSpecial = lines.reduce((s, l) => s + lineSpecial(l), 0);
    const totalShelf = lines.reduce((s, l) => s + lineShelf(l), 0);
    const totalDisc = totalSpecial + totalShelf;
    // Pieces on the invoice (10 pcs + 3 pcs = 13), not the number of lines.
    const totalPieces = lines.reduce((s, l) => s + l.qty, 0);
    const totalBonus = lines.reduce((s, l) => s + l.bonus, 0);
    const netAmount = amountBilled - totalDisc;
    const paid = Math.max(0, num(paidCash));
    const netBalance = prevBal + netAmount - paid;
    const invPurValue = lines.reduce((s, l) => s + lineCost(l), 0);
    const invProfit = netAmount - invPurValue;
    const invProfitPct = invPurValue > 0 ? (invProfit / invPurValue) * 100 : 0;

    /* ── save ── */
    const resetInvoice = () => {
        setLines([]); setSelected(-1); setEntry({ ...EMPTY_ENTRY });
        setCustomer(null); setCustInput(''); setPrevBal(0);
        setPaidCash(''); setBackDate(false); setSaleDate(today());
        loadInvoiceNo();
        setTimeout(() => custRef.current?.focus(), 0);
    };

    const newInvoice = () => {
        if (lines.length && !window.confirm('Discard this invoice and start a new one?')) return;
        resetInvoice();
    };

    const closeWindow = () => {
        askClose(() => {
            setLines([]);
            closeTradeWindow();
        }, lines.length ? 'The invoice is not saved. Do you want to Close the Form ?' : undefined);
    };

    /* ── View → Sale / Sale-Return Records (legacy Trade 1.0 window) ── */
    const [srFrom, setSrFrom] = useState(today);
    const [srTo, setSrTo] = useState(today);
    const [srStaff, setSrStaff] = useState('');
    const [srType, setSrType] = useState('');
    const [srCust, setSrCust] = useState<any | null>(null);
    const [srCustInput, setSrCustInput] = useState('');
    const [srRows, setSrRows] = useState<any[] | null>(null);
    const [srLoading, setSrLoading] = useState(false);
    const [srSel, setSrSel] = useState('');
    // Clicking a record opens the legacy action box.
    const [srAction, setSrAction] = useState<any | null>(null);
    const [srChoice, setSrChoice] = useState<'print' | 'return_all' | 'return_some'>('print');
    const runSrAction = () => {
        const r = srAction;
        if (!r) return;
        setSrAction(null);
        if (srChoice === 'print') {
            if (!r.id) { toast.error('This record has no printable invoice.'); return; }
            openPopup(`/admin/trade/invoice/${r.id}?print=1`);
        } else if (!r.id) {
            toast.error('Pick a sale (not a return) to make a return from.');
        } else if (srChoice === 'return_all') {
            openReturnBill(r);
        } else {
            openReturnRandom(r);
        }
    };

    const openSaleRecords = (opts?: { type?: string; cust?: any }) => {
        setSrFrom(today()); setSrTo(today()); setSrStaff(''); setSrType(opts?.type || '');
        setSrCust(opts?.cust || null); setSrCustInput(opts?.cust ? custCode(opts.cust) : ''); setSrRows(null); setSrSel('');
        setShowView(true);
    };
    useEffect(() => { if (mode === 'records') openSaleRecords(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const closeSaleRecords = () => {
        if (mode !== 'records') { setShowView(false); return; }
        closeTradeWindow();
    };

    /* ═══ Sale returns (legacy "Sale Return Complete Bill" / "Sale Return (Random)") ═══
       Returned units go back into stock and the value is credited to the customer. */
    const loadNextReturnNo = async () => {
        try { const { data } = await api.get('v1/sales/trade-returns/next_no/'); return data.return_no as string; }
        catch { return '—'; }
    };
    const loadBalance = async (customerId: any) => {
        if (!customerId) return 0;
        try { const b: any = await orderService.getCustomerBalance(String(customerId)); return num(b?.previous_balance); }
        catch { return 0; }
    };
    const retLineGross = (l: any, q: number) => num(l.tp) * q;
    // A returned line gives back its Special Discount and Shelf Rate in proportion.
    const retLineShelf = (l: any, q: number) => retLineGross(l, q) * num(l.shelf_pct) / 100;
    const retLineDisc = (l: any, q: number) => retLineGross(l, q) * (num(l.disc_pct) + num(l.shelf_pct)) / 100;
    const saveErr = (err: any, fallback: string) => {
        const d = err?.response?.data;
        toast.error(String(d?.detail || (d && Object.values(d)[0]) || fallback), { duration: 7000 });
    };

    /* ── Complete Bill: return everything still returnable on one invoice ── */
    const [rb, setRb] = useState<null | { orderId: string; saleId: string; customerId: any; accId: string; accName: string; staff: string }>(null);
    const [rbLines, setRbLines] = useState<any[] | null>(null);
    const [rbNo, setRbNo] = useState('');
    const [rbPrev, setRbPrev] = useState(0);
    const [rbCash, setRbCash] = useState('');
    const [rbDateOn, setRbDateOn] = useState(false);
    const [rbDate, setRbDate] = useState(today);
    const [rbSaving, setRbSaving] = useState(false);

    const openReturnBill = async (r: any) => {
        setRb({ orderId: r.id, saleId: r.sale_id, customerId: r.customer_id, accId: r.acc_id, accName: r.acc_name, staff: r.staff });
        setRbLines(null); setRbCash(''); setRbDateOn(false); setRbDate(today()); setRbNo('…');
        try {
            const { data } = await api.get('v1/sales/trade-returns/order_lines/', { params: { order: r.id } });
            setRbLines(data.filter((l: any) => l.remaining_qty > 0 || l.remaining_bonus > 0));
        } catch { toast.error('Could not load the invoice.'); setRbLines([]); }
        setRbNo(await loadNextReturnNo());
        setRbPrev(await loadBalance(r.customer_id));
    };

    const rbTotals = useMemo(() => {
        const ls = rbLines || [];
        const bonus = ls.reduce((s2, l) => s2 + num(l.cost) * l.remaining_bonus, 0);
        const billed = ls.reduce((s2, l) => s2 + retLineGross(l, l.remaining_qty), 0);
        const disc = ls.reduce((s2, l) => s2 + retLineDisc(l, l.remaining_qty), 0);
        const shelf = ls.reduce((s2, l) => s2 + retLineShelf(l, l.remaining_qty), 0);
        const net = billed - disc;
        const cash = Math.max(0, num(rbCash));
        return { bonus, billed, disc, shelf, net, cash, balance: rbPrev - net + cash };
    }, [rbLines, rbCash, rbPrev]);

    const saveReturnBill = () => {
        if (!rb || !rbLines?.length || rbSaving) return;
        if (!rbDateOn) { toast.error('Tick Sale Ret.Date and choose the return date first.'); return; }
        setAsk({
            msg: `Do you want to return the complete bill ${rb.saleId} ?`,
            yes: async () => {
                setRbSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-returns/', {
                        kind: 'complete', customer: rb.customerId,
                        return_date: rbDateOn ? rbDate : today(),
                        cash_returned: round2(rbTotals.cash), prev_balance: round2(rbPrev),
                        items: rbLines.map((l) => ({ order_item: l.order_item, quantity: l.remaining_qty, bonus_quantity: l.remaining_bonus })),
                    });
                    toast.success(`Sale return ${data.return_no} saved — ${fmt(num(data.net_amount))} credited.`);
                    setRb(null);
                    if (showView) searchSaleRecords();
                } catch (err) { saveErr(err, 'Could not save the return.'); }
                finally { setRbSaving(false); }
            },
        });
    };

    /* ── Random: pick lines from the customer's sale history ── */
    const [rrOpen, setRrOpen] = useState(false);
    const [rrCust, setRrCust] = useState<any | null>(null);
    const [rrCustInput, setRrCustInput] = useState('');
    const [rrStaff, setRrStaff] = useState('');
    const [rrHist, setRrHist] = useState<any[] | null>(null);
    const [rrHistLoading, setRrHistLoading] = useState(false);
    const [rrProduct, setRrProduct] = useState('');
    const [rrInvoice, setRrInvoice] = useState('');
    const [rrFromOn, setRrFromOn] = useState(false);
    const [rrFrom, setRrFrom] = useState(today);
    const [rrToOn, setRrToOn] = useState(false);
    const [rrTo, setRrTo] = useState(today);
    const [rrPick, setRrPick] = useState<any | null>(null);
    const [rrQty, setRrQty] = useState('');
    const [rrLines, setRrLines] = useState<any[]>([]);
    const [rrSel, setRrSel] = useState(-1);
    const [rrLess, setRrLess] = useState('');
    const [rrCash, setRrCash] = useState('');
    const [rrDate, setRrDate] = useState(today);
    const [rrPrev, setRrPrev] = useState(0);
    const [rrNo, setRrNo] = useState('');
    const [rrSaving, setRrSaving] = useState(false);
    const rrQtyRef = useRef<HTMLInputElement>(null);

    const loadRrHistory = async (cust = rrCust, invoice = rrInvoice, product = rrProduct) => {
        if (!cust) { toast.error('Find a customer first.'); return; }
        setRrHistLoading(true);
        try {
            const params: any = { customer: cust.id };
            if (product.trim()) params.product = product.trim();
            if (invoice.trim()) params.invoice = invoice.trim();
            if (rrFromOn) params.date_from = rrFrom;
            if (rrToOn) params.date_to = rrTo;
            const { data } = await api.get('v1/sales/trade-returns/customer_lines/', { params });
            setRrHist(data);
        } catch { toast.error('Could not load the sale history.'); setRrHist([]); }
        finally { setRrHistLoading(false); }
    };

    const setRrCustomer = async (c: any, invoice = '') => {
        setRrCust(c); setRrCustInput(c ? custCode(c) : '');
        setRrPick(null); setRrQty(''); setRrLines([]); setRrSel(-1);
        setRrPrev(await loadBalance(c?.id));
        if (c) loadRrHistory(c, invoice);
    };

    const openReturnRandom = async (r?: any) => {
        setRrOpen(true);
        setRrHist(null); setRrPick(null); setRrQty(''); setRrLines([]); setRrSel(-1);
        setRrLess(''); setRrCash(''); setRrDate(today()); setRrStaff('');
        setRrProduct(''); setRrFromOn(false); setRrToOn(false);
        setRrInvoice(r?.sale_id || '');
        setRrNo('');
        const c = r?.customer_id ? customers.find((x) => String(x.id) === String(r.customer_id)) : null;
        if (c) setRrCustomer(c, r?.sale_id || '');
        else { setRrCust(null); setRrCustInput(''); setRrPrev(0); }
    };

    // The button always opens Find Account; Enter in the code box picks an exact code.
    const openReturnFindAccount = () => {
        custTarget.current = 'return';
        setCustQuery('');
        setShowFindCust(true);
    };
    // Standalone Sale Return window (dashboard): opens on load, closing it closes the pop-up.
    useEffect(() => { if (mode === 'return') openReturnRandom(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (mode === 'coa') openAddCustomer(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const closeCoaWindow = () => {
        if (mode !== 'coa') { setAddingCust(false); return; }
        closeTradeWindow();
    };
    const closeReturnRandom = () => {
        if (mode !== 'return') { setRrOpen(false); return; }
        closeTradeWindow();
    };
    // Sale Return › Find Product: all products, with or without a customer.
    const [showRrFindProd, setShowRrFindProd] = useState(false);
    const openRrFindProduct = () => { if (!companies.length) loadCompanies(); setShowRrFindProd(true); };
    const pickRrFindProduct = (r: any) => {
        setShowRrFindProd(false);
        setRrProduct(r.pid);
        if (rrCust) loadRrHistory(rrCust, rrInvoice, r.pid);
        else toast(`${r.pid} — ${r.name} selected. Now find the customer.`, { icon: 'ℹ️' });
    };
    const findReturnCustomer = (input = rrCustInput) => {
        const q = input.trim().toLowerCase();
        const hit = q ? customers.find((c) => custCode(c).toLowerCase() === q) : null;
        if (hit) { setRrCustomer(hit); return; }
        custTarget.current = 'return';
        setCustQuery(input.trim());
        setShowFindCust(true);
    };

    // Units of a sale line already on this return (so it is never over-returned).
    const rrUsed = (orderItem: number) => rrLines.filter((l) => l.order_item === orderItem)
        .reduce((a, l) => ({ q: a.q + l.ret_qty, b: a.b + l.ret_bonus }), { q: 0, b: 0 });

    const pickRrLine = (l: any) => { setRrPick(l); setRrQty(''); setTimeout(() => rrQtyRef.current?.focus(), 0); };

    const addRrLine = () => {
        if (!rrPick) { toast.error('Pick a product from the sale history first.'); return; }
        const used = rrUsed(rrPick.order_item);
        const leftQ = rrPick.remaining_qty - used.q;
        const leftB = rrPick.remaining_bonus - used.b;
        const q = Math.max(0, Math.floor(num(rrQty)));
        if (q <= 0 && leftQ > 0) { toast.error('Enter the Ret. Qty.'); rrQtyRef.current?.focus(); return; }
        if (q > leftQ) { toast.error(`Only ${leftQ} unit(s) of ${rrPick.name} can still be returned.`); return; }
        // Returning all that is left of a line brings its bonus units back too.
        const b = q === leftQ ? leftB : 0;
        if (q + b <= 0) { toast.error('Nothing left to return on this line.'); return; }
        setRrLines((ls) => [...ls, { ...rrPick, ret_qty: q, ret_bonus: b }]);
        setRrPick(null); setRrQty('');
    };

    const removeRrLine = () => {
        if (rrSel < 0) { toast.error('Select a line in the grid to remove.'); return; }
        setRrLines((ls) => ls.filter((_, i) => i !== rrSel));
        setRrSel(-1);
    };

    const rrTotals = useMemo(() => {
        const sale = rrLines.reduce((s2, l) => s2 + retLineGross(l, l.ret_qty), 0);
        const disc = rrLines.reduce((s2, l) => s2 + retLineDisc(l, l.ret_qty), 0);
        const shelf = rrLines.reduce((s2, l) => s2 + retLineShelf(l, l.ret_qty), 0);
        const net = sale - disc;
        const less = Math.max(0, num(rrLess));
        const cash = Math.max(0, num(rrCash));
        return { sale, disc, shelf, net, less, cash, balance: rrPrev - (net - less) + cash };
    }, [rrLines, rrLess, rrCash, rrPrev]);

    const saveReturnRandom = () => {
        if (rrSaving) return;
        if (!rrCust) { toast.error('Find a customer first.'); return; }
        if (!rrLines.length) { toast.error('Add at least one product to return.'); return; }
        setAsk({
            msg: `Do you want to save this sale return (${rrLines.length} product(s)) ?`,
            yes: async () => {
                setRrSaving(true);
                try {
                    const { data } = await api.post('v1/sales/trade-returns/', {
                        kind: 'random', customer: rrCust.id, staff: rrStaff || null, return_date: rrDate,
                        less_amount: round2(rrTotals.less), cash_returned: round2(rrTotals.cash), prev_balance: round2(rrPrev),
                        items: rrLines.map((l) => ({ order_item: l.order_item, quantity: l.ret_qty, bonus_quantity: l.ret_bonus })),
                    });
                    toast.success(`Sale return ${data.return_no} saved — ${fmt(num(data.credit))} credited.`);
                    setRrLines([]); setRrSel(-1); setRrLess(''); setRrCash(''); setRrPick(null); setRrQty('');
                    setRrNo(data.return_no);
                    setRrPrev(await loadBalance(rrCust.id));
                    loadRrHistory(rrCust);
                } catch (err) { saveErr(err, 'Could not save the return.'); }
                finally { setRrSaving(false); }
            },
        });
    };

    const searchSaleRecords = async () => {
        setSrLoading(true);
        try {
            const params: any = { date_from: srFrom, date_to: srTo };
            if (srStaff) params.staff = srStaff;
            if (srCust) params.customer = srCust.id;
            if (srType) params.type = srType;
            const { data } = await api.get('v1/sales/orders/sale_records/', { params });
            setSrRows(data);
            setSrSel('');
        } catch { toast.error('Could not load the records.'); setSrRows([]); }
        finally { setSrLoading(false); }
    };

    const findRecordsCustomer = () => {
        const q = srCustInput.trim().toLowerCase();
        const hit = q ? customers.find((c) => custCode(c).toLowerCase() === q) : null;
        if (hit) { setSrCust(hit); setSrCustInput(custCode(hit)); return; }
        custTarget.current = 'records';
        setCustQuery(srCustInput.trim());
        setShowFindCust(true);
    };

    // Save stays disabled until everything the invoice needs is filled in.
    const saveMissing = [
        !customer && 'Customer',
        !lines.length && 'at least one Product',
        !salesman && 'Saleman',
        !backDate && 'Sale Date (tick it)',
        paidCash.trim() === '' && 'Paid Cash (0 for credit)',
    ].filter(Boolean) as string[];
    const saveHint = saveMissing.length ? `To save, fill in: ${saveMissing.join(', ')}` : 'Save the invoice';

    const saveInvoice = async (print: boolean) => {
        if (saving) return;
        if (saveMissing.length) { toast.error(saveHint); return; }
        if (paid > netAmount + 0.001) { toast.error('Paid Cash is more than the Net Amount.'); return; }
        // Opened now, while the click still counts as a user action, so the
        // browser does not block it; it is pointed at the invoice once saved.
        const printWin = print ? window.open('', 'trade:invoice-print', 'popup=yes,width=1100,height=820') : null;
        printWin?.document.write('<p style="font:14px sans-serif;padding:24px">Saving invoice…</p>');
        setSaving(true);
        try {
            // Paid Cash settles the invoice fully, partly, or not at all (credit).
            const payStatus = paid <= 0 ? 'UNPAID' : paid + 0.001 >= netAmount ? 'PAID' : 'PARTIAL';
            const order: any = await orderService.create({
                customer: customer.id,
                customer_name: custName(customer),
                shipping_address: customer.address || customer.area_name || '-',
                phone_number: customer.phone || 'N/A',
                notes: 'Trade 1.0 Sale Invoice',
                status: 'DELIVERED',
                payment_method: 'SHOP',
                // Whatever isn't paid now stays on the customer's balance and is
                // settled later through receipts.
                payment_status: payStatus,
                amount_paid: round2(paid),
                discount: 0,
                shipping_cost: 0,
                staff: salesman || null,
                prev_balance: round2(prevBal),
                paid_at_sale: round2(paid),
                sale_date: backDate ? saleDate : today(),
                sale_invoice: true,
                items: lines.map((l) => ({
                    id: l.productId, batch_id: l.batchId,
                    quantity: l.qty, bonus_quantity: l.bonus, price: l.tp,
                    discount: round2(lineDisc(l)),
                    shelf_discount: round2(lineShelf(l)),
                    sale_unit: l.unit,
                })),
            } as any);
            const no = order?.order_number || order?.tracking_id || invoiceNo;
            // A part-payment is recorded as an installment so it shows in the
            // payment history (same as the POS screen does).
            if (payStatus === 'PARTIAL' && order?.id) {
                try {
                    await installmentService.create({
                        source_type: 'order', source_id: String(order.id), amount: round2(paid),
                        method: 'cash', status: 'confirmed', direction: 'inbound',
                        paid_at: new Date().toISOString(), reference: no,
                    });
                } catch {
                    toast.error('Invoice saved, but recording the cash paid failed — add it from Sale Records.', { duration: 7000 });
                }
            }
            toast.success(`Invoice ${no} saved.`);
            // Send the invoice to the customer's WhatsApp from the business number
            // (only does anything once WhatsApp Business is connected on the server).
            if (order?.id) {
                api.post(`v1/sales/orders/${order.id}/send_whatsapp_invoice/`, { base: window.location.origin })
                    .then(({ data }) => toast.success(data.message))
                    .catch(() => { /* not connected / no number: share from the invoice page */ });
            }
            if (print && order?.id) {
                const url = `/admin/trade/invoice/${order.id}?print=1&size=${printSize}`;
                if (printWin && !printWin.closed) printWin.location.href = url;
                else openPopup(url);
            }
            setShowPV(false);
            resetInvoice();
        } catch (err: any) {
            printWin?.close();
            const d = err?.response?.data;
            const msg = typeof d === 'string' ? d : (d?.detail || d?.error || (Array.isArray(d) ? d[0] : Object.values(d || {})[0]) || 'Could not save the invoice.');
            toast.error(String(msg), { duration: 6000 });
        } finally { setSaving(false); }
    };

    /* ── keyboard ── */
    useEffect(() => {
        if (mode !== 'invoice') return;
        const h = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); setShowFindCust(true); }
            else if (e.key === 'F3') { e.preventDefault(); openFpRef.current(); }
            else if (e.key === 'F9') { e.preventDefault(); setShowPV(true); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(false); }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);
    // Keyboard handler is bound once; route Ctrl+S to the latest saveInvoice.
    const saveRef = useRef(saveInvoice);
    saveRef.current = saveInvoice;

    const onEnter = (next: () => void) => (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); next(); }
    };
    const setE = (k: keyof Entry) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setEntry((x) => ({ ...x, [k]: e.target.value }));

    /* ───────────────────────── render ───────────────────────── */
    return (
        <div className="h-screen w-screen overflow-hidden bg-[#dcdcf7] font-sans text-slate-900 print:h-auto print:w-auto print:overflow-visible print:bg-white">

            {/* The whole form scales to fill the window (bigger on big screens,
                smaller on small ones) — always one glance, never a scrollbar. */}
            <div className={mode !== 'invoice' ? 'hidden' : 'print:hidden'}>
            <FitStage width={STAGE_W} height={STAGE_H} className="flex flex-col overflow-hidden">
            {/* Window caption */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#9da1d8] bg-gradient-to-r from-[#c9d6f5] via-[#dfe7fb] to-[#c9d6f5] px-3 py-1 print:hidden">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-[10px] font-black text-white">AQ</span>
                <span className="text-[13px] font-semibold text-slate-800">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( Sale Invoice )</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-2 pt-1.5">
                <h1 className="text-[24px] font-black leading-none tracking-tight text-[#1f2bd6]">Sale</h1>

                {/* Row 1 — customer / product / stock */}
                <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => setShowFindCust(true)}
                        className="h-8 shrink-0 rounded-md border-2 border-[#5c4a2a] bg-gradient-to-b from-[#fff1d6] to-[#f3d9a8] px-3 text-[13px] font-black text-[#3b2a10] shadow-sm hover:from-[#ffe7bd] active:translate-y-px">
                        Find Customer
                    </button>
                    <input ref={custRef} value={custInput} onChange={(e) => { setCustInput(e.target.value); if (customer) setCustomer(null); }}
                        onKeyDown={onEnter(resolveCustomer)} placeholder="Code" className={`${EDIT} w-[150px] shrink-0`} aria-label="Customer code" />
                    <ReadBox value={customer ? `${custName(customer)}${customer.area_name ? `  ·  ${customer.area_name}` : ''}` : ''} className="min-w-0 flex-[1.15]" />
                    <span className={`${LABEL} ml-2 text-[14.5px]`}>Product</span>
                    <ReadBox value={p?.name || ''} className="min-w-0 flex-1" />
                    <span className={`${LABEL} ml-2 text-[14.5px]`}>Stock</span>
                    <ReadBox value={p ? fmt(p.stock) : ''} className="w-[130px] shrink-0 justify-end" />
                </div>

                {/* Row 2/3 — entry labels + fields */}
                {/* Fixed small boxes (2-digit fields smallest); Product Code takes what is left. */}
                <div className="grid shrink-0 grid-cols-[64px_minmax(120px,1fr)_96px_56px_56px_72px_60px_50px_76px_52px_52px_76px_84px_84px_104px] items-end gap-x-1.5 gap-y-0.5 [&>span]:!whitespace-normal [&>span]:leading-[1.1]">
                    <span />
                    <span className={LABEL}>Product Code</span>
                    <span className={LABEL}>Unit</span>
                    <span className={LABEL}>{unit === 'CARTON' ? 'Qty(C)' : 'Qty(P)'}</span>
                    <span className={LABEL}>Qty(U)</span>
                    <span className={LABEL}>Total Units</span>
                    <span className={LABEL}>{unit === 'CARTON' ? 'Pcs/Ctn' : 'Packing'}</span>
                    <span className={LABEL}>Bon(U)</span>
                    <span className={LABEL}>Unit TP</span>
                    <span className={`${LABEL} text-[11px] !whitespace-normal leading-[1.1]`} title="Special Discount %">Special Disc %</span>
                    <span className={`${LABEL} text-[11px] !whitespace-normal leading-[1.1]`} title="Shelf Rent % — what the shop charges to keep the product on its shelf">Shelf Rent %</span>
                    <span className={LABEL}>Retail Rate</span>
                    <span className={LABEL} title="Special Discount amount">Disc Amt.</span>
                    <span className={`${LABEL} text-[11px]`} title="Shelf Rent amount">Shelf Rent Amt.</span>
                    <span className={LABEL}>Sub Total</span>

                    <button type="button" onClick={() => openFindProduct()}
                        className="h-8 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] text-[13px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px">
                        Find
                    </button>
                    <input ref={codeRef} value={entry.code} onChange={setE('code')} onKeyDown={onEnter(resolveCode)} className={`${EDIT} w-full`} aria-label="Product code" />
                    <select ref={unitRef} value={unit} aria-label="Sell by"
                        onChange={(e) => setEntry((x) => ({ ...x, unit: e.target.value as SaleUnit }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); qtyPRef.current?.focus(); } }}
                        title={p && !cartonPcs ? 'No carton size set for this product (Product Detail › Carton)' : undefined}
                        className={`${EDIT} w-full px-1.5`}>
                        <option value="PIECE">Piece</option>
                        <option value="CARTON" disabled={!!p && !cartonPcs}>Carton</option>
                    </select>
                    <input ref={qtyPRef} value={entry.qtyP} onChange={setE('qtyP')} onKeyDown={onEnter(() => qtyURef.current?.focus())} inputMode="numeric" className={`${EDIT} w-full`} aria-label={unit === 'CARTON' ? 'Quantity in cartons' : 'Quantity in packs'} />
                    <input ref={qtyURef} value={entry.qtyU} onChange={setE('qtyU')} onKeyDown={onEnter(() => bonRef.current?.focus())} inputMode="numeric" className={`${EDIT} w-full`} aria-label="Quantity in units" />
                    <ReadBox value={totalUnits ? fmt(totalUnits) : ''} className="justify-end" />
                    <ReadBox value={p ? perQty : ''} className="justify-end" />
                    <input ref={bonRef} value={entry.bonus} onChange={setE('bonus')} onKeyDown={onEnter(() => tpRef.current?.focus())} inputMode="numeric" className={`${EDIT} w-full`} aria-label="Bonus units" />
                    <input ref={tpRef} value={entry.tp} onChange={setE('tp')} onKeyDown={onEnter(() => discRef.current?.focus())} inputMode="decimal" className={`${EDIT} w-full`} aria-label="Unit trade price" />
                    <input ref={discRef} value={entry.discPct} onChange={setE('discPct')} onKeyDown={onEnter(() => shelfRef.current?.focus())} inputMode="decimal" className={`${EDIT} w-full`} aria-label="Special discount percent" />
                    <input ref={shelfRef} value={entry.shelfPct} onChange={setE('shelfPct')} onKeyDown={onEnter(addLine)} inputMode="decimal" className={`${EDIT} w-full`} aria-label="Shelf rate percent" />
                    <ReadBox value={p ? fmt(num(batch?.retail_price) || num(p.retail_price)) : ''} className="justify-end" />
                    <ReadBox value={discAmt ? fmt(discAmt) : ''} className="justify-end" />
                    <ReadBox value={shelfAmt ? fmt(shelfAmt) : ''} className="justify-end" />
                    <ReadBox value={subTotal ? fmt(subTotal) : ''} className="justify-end" />
                </div>

                {/* Grid + right panel */}
                <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-3">
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-400 bg-[#b9bccb] shadow-inner">
                        <div className="min-h-0 flex-1 overflow-auto">
                            {/* Widths are inline on <col> AND the header cells so the
                                fixed layout can never collapse Product Name. */}
                            <table className="w-full table-fixed border-collapse border-b border-slate-500 text-[12px]">
                                <colgroup>
                                    {GRID_COLS.map((c) => <col key={c.h} style={c.w ? { width: c.w } : undefined} />)}
                                </colgroup>
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-b from-white to-[#e9e9f1] text-left text-[12px] font-bold text-slate-800">
                                        {GRID_COLS.map((c) => (
                                            <th key={c.h} style={c.w ? { width: c.w } : undefined}
                                                className={`overflow-hidden whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 ${c.right ? 'text-right' : ''}${thFit(c.h)}`}>{c.h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, i) => (
                                        <tr key={i} onClick={() => setSelected(i)} onDoubleClick={() => editLine(i)}
                                            className={`cursor-pointer tabular-nums ${selected === i ? 'bg-[#2f5bd3] text-white' : i % 2 ? 'bg-[#f6f7ff]' : 'bg-white'} hover:outline hover:outline-1 hover:outline-[#2f5bd3]`}>
                                            {[i + 1, l.code, l.name, ymd(l.expiry), lineCartons(l), fmt(l.qty), l.bonus ? fmt(l.bonus) : '', fmt(l.tp), fmt(l.retail),
                                              fmt(lineGross(l)), l.discPct ? fmt(l.discPct) : '', l.shelfPct ? fmt(l.shelfPct) : '', lineDisc(l) ? fmt(lineDisc(l)) : '', fmt(lineNet(l))].map((v, k) => (
                                                <td key={k} title={k === 2 ? String(v) : undefined}
                                                    className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 ? 'font-semibold tracking-tight' : ''} ${k === 3 ? 'text-[11px] tracking-tight' : ''} ${GRID_COLS[k].right ? 'text-right' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {/* Blank entry row with column dividers, like the legacy grid. */}
                                    {!lines.length && (
                                        <tr className="bg-white">
                                            {GRID_COLS.map((c) => <td key={c.h} className="border-b border-r border-slate-300 px-1.5 py-1">&nbsp;</td>)}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Keyboard shortcuts — a quiet strip in the grid's background. */}
                        <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-400/40 px-3 py-1.5 text-[12px] font-medium text-slate-600/90">
                            {SHORTCUTS.map(([k, label]) => (
                                <span key={k} className="flex items-center gap-1.5">
                                    <kbd className="rounded border border-slate-400/70 bg-white/60 px-1.5 py-px font-sans text-[11px] font-bold text-slate-700 shadow-[0_1px_0_rgba(0,0,0,0.15)]">{k}</kbd>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right panel — compact so it always fits without scrolling */}
                    <div className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
                        <div className="grid grid-cols-[104px_1fr] items-center gap-x-2 gap-y-1.5">
                            <span className={LABEL}>Net Amount</span>
                            <ReadBox value={entryNet ? fmt(entryNet) : ''} className="justify-end" />
                            <span className={LABEL}>Expiry Date</span>
                            <select value={entry.batchId} disabled={!p || !p.batches.length}
                                onChange={(e) => p && applyBatch(p, e.target.value, { qtyP: entry.qtyP, qtyU: entry.qtyU, bonus: entry.bonus, discPct: entry.discPct })}
                                className={`${FIELD} w-full border-cyan-300 bg-[#d5fbff] text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:opacity-70`}
                                aria-label="Batch expiry date">
                                {!p && <option value="" />}
                                {p && !p.batches.length && <option value="">No stock batch</option>}
                                {p?.batches.map((b) => (
                                    <option key={b.id} value={b.id}>{ymd(b.expiry_date)}  —  {b.quantity - usedInBatch(b.id)} left</option>
                                ))}
                            </select>
                            <span className={LABEL}>Company</span>
                            <ReadBox value={p?.company || ''} />
                            <span className={LABEL}>Invoice No.</span>
                            <div className="flex h-9 items-center justify-center rounded-md border border-emerald-400 bg-[#c8fbc8] font-mono text-[18px] font-black tracking-wide text-[#1f2bd6]">
                                {invoiceNo}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            <button type="button" onClick={addLine} className={`${PANEL_BTN} border-amber-300 from-[#fffbd1] to-[#fff09a] text-slate-600 hover:to-[#ffe86a]`}>
                                <span className="underline">A</span>dd
                            </button>
                            <button type="button" onClick={removeLine} className={`${PANEL_BTN} border-amber-200 from-[#fffde8] to-[#f6f0c4] text-slate-500 hover:to-[#efe6ad]`}>
                                <span className="underline">R</span>emove
                            </button>
                            <button type="button" onClick={() => toggleRow('prRow')} aria-pressed={!prRow}
                                title={prRow ? 'Hide Product Pur. Rate / Profit' : 'Show Product Pur. Rate / Profit'}
                                className={`${PANEL_BTN} border-orange-300 from-[#ffe8d1] to-[#ffd0a3] text-slate-800 hover:to-[#ffc287] ${prRow ? '' : 'translate-y-px opacity-70 shadow-inner'}`}>
                                Product&nbsp;&nbsp;PR
                            </button>
                            <button type="button" onClick={() => toggleRow('pvRow')} aria-pressed={!pvRow}
                                title={pvRow ? 'Hide Invoice Pur.Value / Profit' : 'Show Invoice Pur.Value / Profit'}
                                className={`${PANEL_BTN} border-slate-300 from-white to-[#e8e8ee] text-slate-800 hover:to-[#dadae4] ${pvRow ? '' : 'translate-y-px opacity-70 shadow-inner'}`}>
                                Invoice PV
                            </button>
                        </div>

                        {prRow && (
                            <div className="grid grid-cols-[1.5fr_1fr_1fr] items-end gap-x-1.5 gap-y-0.5">
                                <span className={LABEL}>Product Pur. Rate</span>
                                <span className={LABEL}>Profit</span>
                                <span className={LABEL}>Profit %</span>
                                <ReadBox value={p ? fmt(purRate) : ''} className="justify-end !border-orange-200 !bg-[#ffe3c7]" />
                                <ReadBox value={totalUnits ? fmt(entryProfit) : ''} className={`justify-end !border-orange-200 !bg-[#ffe3c7] ${entryProfit < 0 ? '!text-rose-600' : ''}`} />
                                <ReadBox value={totalUnits && purRate ? `${fmt(entryProfitPct)}%` : ''} className="justify-end !border-orange-200 !bg-[#ffe3c7]" />
                            </div>
                        )}
                        {pvRow && (
                            <div className="grid grid-cols-[1.5fr_1fr_1fr] items-end gap-x-1.5 gap-y-0.5">
                                <span className={LABEL}>Invoice Pur.Value</span>
                                <span className={LABEL}>Profit</span>
                                <span className={LABEL}>Profit %</span>
                                <ReadBox value={fmt(invPurValue)} className="justify-center !bg-white" />
                                <ReadBox value={fmt(invProfit)} className={`justify-center !bg-white ${invProfit < 0 ? '!text-rose-600' : ''}`} />
                                <ReadBox value={invPurValue ? `${fmt(invProfitPct)}%` : ''} className="justify-center !bg-white" />
                            </div>
                        )}

                        <div className="rounded-md bg-black px-3 py-1.5 font-mono text-[13.5px] font-bold text-white">Total Products = {fmt(totalPieces)}{totalBonus ? ` (+${fmt(totalBonus)} bonus)` : ''}</div>
                    </div>
                </div>

                {/* Totals */}
                <div className="grid shrink-0 grid-cols-[1fr_0.9fr_0.9fr_1fr_1fr_1.4fr] gap-3">
                    <Led label="Amount Billed" value={fmt(amountBilled)} />
                    <Led label="Special Disc" value={fmt(totalSpecial)} />
                    <Led label="Shelf Rent" value={fmt(totalShelf)} />
                    <Led label="Net Amount" value={fmt(netAmount)} />
                    <Led label="Prev. Bal" value={customer ? fmt(prevBal) : ''} />
                    <Led label="Net Balance" value={fmt(netBalance)} tone="yellow" />
                </div>

                {/* Bottom bar — Paid Cash / Saleman / Sale Date / actions */}
                <div className="grid shrink-0 grid-cols-[1fr_1.2fr_1.1fr_auto] items-end gap-3">
                    <label className="flex flex-col gap-0.5">
                        <span className={`${LABEL} text-[15px]`}>Paid Cash</span>
                        <input value={paidCash} onChange={(e) => setPaidCash(e.target.value)} inputMode="decimal" placeholder="0"
                            className={`${EDIT} w-full text-right text-[15px]`} aria-label="Paid cash" />
                    </label>
                    <label className="flex flex-col gap-0.5">
                        <span className={`${LABEL} text-[15px]`}>Saleman</span>
                        <select value={salesman} onChange={(e) => setSalesman(e.target.value)}
                            className={`${FIELD} w-full border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`}>
                            <option value="">Select any one</option>
                            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </label>
                    <div className="flex flex-col gap-0.5">
                        <label className={`${LABEL} flex cursor-pointer items-center gap-1.5 text-[15px]`}>
                            <input type="checkbox" checked={backDate} onChange={(e) => { setBackDate(e.target.checked); if (!e.target.checked) setSaleDate(today()); }}
                                className="h-4 w-4 accent-[#3b3f8f]" />
                            Sale Date
                        </label>
                        <input type="date" value={saleDate} disabled={!backDate} max={today()} onChange={(e) => e.target.value && setSaleDate(e.target.value)}
                            className={`${FIELD} w-full ${backDate ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:ring-2 focus:ring-emerald-200' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`}
                            aria-label="Sale date" />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={newInvoice} className={ACTION_BTN}><span className="underline">N</span>ew Invoice</button>
                        <button type="button" onClick={() => saveInvoice(false)} disabled={saving || saveMissing.length > 0} title={saveHint} className={ACTION_BTN}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={() => openSaleRecords()} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={closeWindow} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                    </div>
                </div>
            </div>
            </FitStage>
            </div>

            {/* ─── Close / delete confirmation ─── */}
            {ask && <ConfirmBox msg={ask.msg} onNo={() => setAsk(null)} onYes={() => { const fn = ask.yes; setAsk(null); fn(); }} />}

            {/* ─── Find Customer (legacy "Find Account") ─── */}
            {showFindCust && (
                <Modal title="Find Account" onClose={() => askClose(closeFindCustomer)} wide>
                    <div className="flex items-center gap-3 border-b border-[#9da1d8] bg-[#c9c9f9] px-4 py-3">
                        <span className="text-[16px] font-semibold text-[#1b1f4b]">Account Name</span>
                        <input autoFocus value={custQuery} onChange={(e) => { setCustQuery(e.target.value); setCustSel(-1); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { const c = custMatches[custSel] || custMatches[0]; if (c) pickCustomer(c); }
                                else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') custGridKeys(e);
                            }}
                            placeholder="Name, code, area or phone" className={`${EDIT} h-9 flex-1 text-[15px]`} />
                        <button type="button" onClick={() => openAddCustomer()} className={`${ACTION_BTN} shrink-0`}>
                            <span className="underline">A</span>dd New
                        </button>
                    </div>
                    <div ref={custGridRef} tabIndex={0} onKeyDown={custGridKeys}
                        className="min-h-0 flex-1 overflow-auto bg-[#8a8a8a] outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]">
                        <table className="w-[94%] table-fixed border-collapse bg-white text-[13px]">
                            <colgroup><col style={{ width: '13%' }} /><col style={{ width: '35%' }} /><col style={{ width: '18%' }} /><col style={{ width: '15%' }} /><col style={{ width: '19%' }} /></colgroup>
                            <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                <tr>{['Account ID', 'Account Name', 'Area', 'Acc. 2nd Level', 'Acc. 3rd Level'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {custMatches.map((c, i) => (
                                    <tr key={c.id} onClick={() => setCustSel(i)} onDoubleClick={() => pickCustomer(c)} title="Click to select · Enter or double-click to pick"
                                        className={`cursor-pointer ${custSel === i ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                        {[custCode(c), custName(c), c.area_name || '', custGroupNames.l2, custGroupNames.l3].map((v, k) => (
                                            <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 0 ? 'font-mono tabular-nums' : ''} ${k === 1 ? 'font-semibold' : ''}`}>{v}</td>
                                        ))}
                                    </tr>
                                ))}
                                {!custMatches.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No accounts match.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                        <ReadBox value={`${custMatches.length}${custMatches.length === 200 ? '+' : ''} of ${customers.length} customers`} className="w-[280px] !text-[12.5px]" />
                        <button type="button" onClick={() => askClose(closeFindCustomer)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </Modal>
            )}

            {/* ─── Chart of Account — entry window (Find Account › Add New) ─── */}
            {addingCust && (
                <Modal title="Chart of Account" onClose={() => !savingCust && askClose(closeCoaWindow)} wide>
                    <div className="min-h-0 flex-1 overflow-auto bg-[#e4e4fb] p-4">
                        {coaForm(coa, setCoa, nextAccId, saveNewCustomer, true)}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#9da1d8] bg-[#e4e4fb] px-4 py-3">
                        <button type="button" onClick={saveNewCustomer} disabled={savingCust} className={ACTION_BTN}>
                            {savingCust ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={viewAccounts} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={() => askClose(closeCoaWindow)} disabled={savingCust} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </Modal>
            )}

            {/* ─── Chart of Account — View window ─── */}
            {showCoaView && (
                <Modal title="Chart of Account" onClose={() => askClose(() => setShowCoaView(false))} xl>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#e4e4fb] p-4">
                        {coaForm(coaV, setCoaV, coaSel ? coaSel.acc_id : '', updateAccount, false)}
                        <div className="min-h-[120px] flex-1 overflow-auto border border-slate-500 bg-[#9ea1ad]">
                            <table className="w-full min-w-[980px] table-fixed border-collapse bg-white text-[13px]">
                                <colgroup>{COA_VIEW_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{COA_VIEW_COLS.map((c) => <th key={c.h} className="overflow-hidden whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{c.h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {coaRows.map((a) => (
                                        <tr key={a.id} onClick={() => pickCoaRow(a)}
                                            className={`cursor-pointer ${coaSel?.id === a.id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                            {[a.main_name, a.level2_name, a.group_name, a.acc_id, a.name, a.area_name || '', a.cell_no || '-', a.contact_person || '0', a.address || ''].map((v, k) => (
                                                <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 3 ? 'font-mono' : ''}`}>{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!coaRows.length && (
                                        <tr><td colSpan={COA_VIEW_COLS.length} className="px-3 py-4 text-center text-slate-400">{coaList ? 'No accounts.' : 'Loading…'}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#9da1d8] bg-[#e4e4fb] px-4 py-3">
                        <span className={`${LABEL} text-[14px]`}>Search Account</span>
                        <input value={coaSearch} onChange={(e) => setCoaSearch(e.target.value)} placeholder="ID, name or area"
                            className={`${EDIT} w-[200px]`} />
                        <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {coaRows.length}</span>} className="w-[190px]" />
                        <span className="flex-1" />
                        <button type="button" onClick={exportAccounts} className={ACTION_BTN}>Export</button>
                        <button type="button" onClick={coaAddNew} className={ACTION_BTN}><span className="underline">A</span>dd New</button>
                        <button type="button" onClick={updateAccount} disabled={!coaSel || coaBusy} className={ACTION_BTN}><span className="underline">U</span>pdate</button>
                        <button type="button" onClick={deleteAccount} disabled={!coaSel || coaBusy} className={ACTION_BTN}><span className="underline">D</span>elete</button>
                        <button type="button" onClick={() => askClose(() => setShowCoaView(false))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </Modal>
            )}

            {/* ─── Sub Area — entry window (Chart of Account › Area › Add) ─── */}
            {showSubArea && (
                <Modal title="Sub Area" onClose={() => !savingArea && askClose(() => setShowSubArea(false))} wide>
                    <div className="min-h-0 flex-1 overflow-auto bg-[#e4e4fb] p-4">
                        {subAreaForm(subArea, setSubArea, String(nextSubAreaId), saveSubArea, true)}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#9da1d8] bg-[#e4e4fb] px-4 py-3">
                        <button type="button" onClick={saveSubArea} disabled={savingArea} className={ACTION_BTN}>
                            {savingArea ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={viewAreas} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={() => askClose(() => setShowSubArea(false))} disabled={savingArea} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </Modal>
            )}

            {/* ─── Sub Area — View window ─── */}
            {showAreaView && (
                <Modal title="Sub Area" onClose={() => askClose(() => setShowAreaView(false))} xl>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#e4e4fb] p-4">
                        {subAreaForm(areaV, setAreaV, areaSel ? String(areaSel.id) : '', updateArea, false)}
                        <div className="min-h-[120px] flex-1 overflow-auto border border-slate-500 bg-[#9ea1ad]">
                            <table className="w-[72%] table-fixed border-collapse bg-white text-[13px]">
                                <colgroup><col style={{ width: '24%' }} /><col style={{ width: '24%' }} /><col style={{ width: '17%' }} /><col style={{ width: '35%' }} /></colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{['District', 'Main Area', 'Area ID', 'Area Name'].map((h) => <th key={h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {subAreaRows.map((r) => (
                                        <tr key={r.a.id} onClick={() => pickAreaRow(r)}
                                            className={`cursor-pointer ${areaSel?.a.id === r.a.id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}>
                                            {[r.dist?.name || '', r.main?.name || '', r.id, r.a.name].map((v, k) => (
                                                <td key={k} title={String(v)} className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1">{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!subAreaRows.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No sub areas.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#9da1d8] bg-[#e4e4fb] px-4 py-3">
                        <span className={`${LABEL} text-[14px]`}>Sub Area</span>
                        <input value={areaSearch} onChange={(e) => setAreaSearch(e.target.value)} placeholder="Name or ID" className={`${EDIT} w-[200px]`} />
                        <ReadBox value={<span className="text-[#1f2bd6]">Total Records = {subAreaRows.length}</span>} className="w-[190px]" />
                        <span className="flex-1" />
                        <button type="button" onClick={exportAreas} className={ACTION_BTN}>Export</button>
                        <button type="button" onClick={areaAddNew} className={ACTION_BTN}>Add <span className="underline">N</span>ew</button>
                        <button type="button" onClick={updateArea} disabled={!areaSel || areaBusy} className={ACTION_BTN}><span className="underline">U</span>pdate</button>
                        <button type="button" onClick={deleteArea} disabled={!areaSel || areaBusy} className={ACTION_BTN}><span className="underline">D</span>elete</button>
                        <button type="button" onClick={() => askClose(() => setShowAreaView(false))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </Modal>
            )}

            {/* ─── Find Product (legacy Trade 1.0) ─── */}
            {showFindProd && (
                <Modal title="Find Product" onClose={() => askClose(() => setShowFindProd(false))} xl>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#e4e4fb] p-3">
                        {/* Filters + actions */}
                        <div className="grid shrink-0 grid-cols-[1.5fr_1.15fr_auto] gap-3">
                            <div className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-2 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 py-3">
                                <span className={LABEL}>Company Name</span>
                                <select value={fpCompany} onChange={(e) => setFpCompany(e.target.value)} className={COA_SELECT}>
                                    <option value="">Select any one</option>
                                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <span className={LABEL}>Product Name</span>
                                <input autoFocus value={fpName} onChange={(e) => setFpName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { const r = stockRows.find((x) => x.batch_id === fpSel) || stockRows[0]; if (r) pickStockRow(r); }
                                        else if (e.key === 'ArrowDown' && stockRows.length) { e.preventDefault(); if (!fpSel) setFpSel(stockRows[0].batch_id); fpStockRef.current?.focus(); }
                                    }}
                                    placeholder="Name or PID" className={`${EDIT} w-full`} />
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 py-3">
                                <span className={`${LABEL} leading-tight`}>Product<br />Bar Code</span>
                                <input value={fpBarcode} onChange={(e) => setFpBarcode(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onBarcodeEnter(); } }}
                                    placeholder="Scan or type, then Enter" className={`${FIELD} w-full border-slate-400 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200`} />
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                                <button type="button" onClick={() => setShowProdDetail(true)} className={`${ACTION_BTN} min-w-[170px]`}>
                                    <span className="underline">A</span>dd New Product
                                </button>
                                <button type="button" onClick={() => askClose(() => setShowFindProd(false))}
                                    className="flex h-9 min-w-[170px] items-center justify-center rounded-md border border-slate-400 bg-gradient-to-b from-[#f1f1f4] to-[#d6d6de] px-4 text-[14px] font-bold text-slate-700 shadow-sm hover:to-[#c9c9d4]">
                                    <span className="underline">C</span>ancel
                                </button>
                            </div>
                        </div>

                        {/* Available stock — one row per in-stock batch */}
                        <div className="flex min-h-[120px] flex-[3] flex-col overflow-hidden border border-slate-500 bg-[#9ea1ad]">
                            <div ref={fpStockRef} tabIndex={0} className="min-h-0 flex-1 overflow-auto outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]"
                                onKeyDown={gridKeys(stockRows.length, stockRows.findIndex((x) => x.batch_id === fpSel),
                                    (i) => setFpSel(stockRows[i].batch_id), (i) => pickStockRow(stockRows[i]), fpStockRef)}>
                                <table className="w-full min-w-[900px] table-fixed border-collapse bg-white text-[13px]">
                                    <colgroup>{FP_STOCK_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-[#ffe1b8] text-left">
                                        <tr>{FP_STOCK_COLS.map((c) => <th key={c.h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{c.h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {stockRows.map((r) => (
                                            <tr key={r.batch_id} onClick={() => setFpSel(r.batch_id)} onDoubleClick={() => pickStockRow(r)}
                                                className={`cursor-pointer tabular-nums ${fpSel === r.batch_id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}
                                                title="Click to select · Enter or double-click to add">
                                                {[r.pid, r.category, r.name, r.pack, ymd(r.expiry_date), fmt(num(r.qty)), fmt(num(r.tp)), fmt(num(r.retail)), r.company].map((v, k) => (
                                                    <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 ? 'font-semibold' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!stockRows.length && (
                                            <tr><td colSpan={FP_STOCK_COLS.length} className="px-3 py-4 text-center text-slate-500">{!fpSearching ? 'Pick a company, type a product name or scan a barcode to see the stock.' : stockLoading ? 'Loading…' : 'No stock matches.'}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="shrink-0 border-t border-slate-400 bg-[#ececfd] px-3 py-1 text-[12.5px] font-semibold text-[#1f2bd6]">
                                Available Stock — {fpSearching ? `${stockRows.length} batch(es)` : 'search to list'}{stockLoading ? ' · loading…' : ''} · click a row, then Enter (or double-click) to add it
                            </div>
                        </div>

                        {/* What this customer has bought from us */}
                        <div className="flex min-h-[100px] flex-[2] flex-col overflow-hidden border border-slate-500 bg-[#9ea1ad]">
                            <div ref={fpHistRef} tabIndex={0} className="min-h-0 flex-1 overflow-auto outline-none focus:ring-2 focus:ring-inset focus:ring-[#2f5bd3]"
                                onKeyDown={gridKeys(histShown.length, fpHistSel, setFpHistSel, (i) => pickHistoryRow(histShown[i]), fpHistRef)}>
                                <table className="w-full min-w-[900px] table-fixed border-collapse bg-[#ffffcf] text-[13px]">
                                    <colgroup>{FP_HIST_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-[#ffe1b8] text-left">
                                        <tr>{FP_HIST_COLS.map((c) => <th key={c.h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold${thFit(c.h)}`}>{c.h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {histShown.map((r, i) => (
                                            <tr key={i} onClick={() => setFpHistSel(i)} onDoubleClick={() => pickHistoryRow(r)}
                                                className={`cursor-pointer tabular-nums ${fpHistSel === i ? 'bg-[#7dfa7d]' : 'hover:bg-[#fff3a6]'}`}
                                                title={`Invoice ${r.invoice_no} · ${String(r.date).slice(0, 10)} — Enter or double-click to sell again`}>
                                                {[r.pid, r.category, r.name, r.pack, ymd(r.expiry_date), fmt(num(r.qty)), r.bonus ? fmt(num(r.bonus)) : '', fmt(num(r.tp)), num(r.tp_pct) ? fmt(num(r.tp_pct)) : '', num(r.shelf_pct) ? fmt(num(r.shelf_pct)) : '', fmt(num(r.retail))].map((v, k) => (
                                                    <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 ? 'font-semibold' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!histShown.length && (
                                            <tr><td colSpan={FP_HIST_COLS.length} className="px-3 py-4 text-center text-slate-500">
                                                {!customer ? 'Find a customer first to see what they have bought from us.'
                                                    : histRows.length ? 'Nothing bought from this company / product yet.'
                                                    : `${custName(customer)} has not bought anything from us yet.`}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="shrink-0 border-t border-slate-400 bg-[#ececfd] px-3 py-1 text-[12.5px] font-semibold text-[#1f2bd6]">
                                {customer
                                    ? `Purchase history — ${custName(customer)}${fpCompany ? ` · ${companies.find((c) => String(c.id) === fpCompany)?.name || ''}` : ''} · ${histShown.length} line(s)`
                                    : 'Purchase history — no customer selected'}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ─── Product Detail (Find Product › Add New Product) ─── */}
            {showRrFindProd && (
                <ReturnFindProductWindow companies={companies} askClose={askClose}
                    onPick={pickRrFindProduct} onClose={() => setShowRrFindProd(false)}
                    onAddNew={(nm) => { setFpName(nm); setShowProdDetail(true); }} />
            )}

            {showProdDetail && (
                <ProductDetailWindow companies={companies} reloadCompanies={loadCompanies} initialName={/^\d+$/.test(fpName.trim()) ? '' : fpName.trim()}
                    askClose={askClose} onClose={() => setShowProdDetail(false)} />
            )}

            {/* ─── Invoice preview (F9) → save / print ─── */}
            {showPV && (
                <Modal title={`Invoice Preview — ${invoiceNo}`} onClose={() => !saving && askClose(() => setShowPV(false))} wide>
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
                                    {['#', 'PID', 'Product', 'Expiry', 'Qty', 'Bon', 'TP', 'SubTotal', 'Special Disc', 'Shelf Rent', 'Net'].map((h) => <th key={h} className="px-1.5 py-1">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={i} className="border-b border-slate-200">
                                        <td className="px-1.5 py-1">{i + 1}</td><td className="px-1.5 py-1">{l.code}</td>
                                        <td className="px-1.5 py-1 font-medium">{l.name}</td><td className="px-1.5 py-1">{ymd(l.expiry)}</td>
                                        <td className="px-1.5 py-1 text-right">{fmt(l.qty)}</td><td className="px-1.5 py-1 text-right">{l.bonus ? fmt(l.bonus) : ''}</td>
                                        <td className="px-1.5 py-1 text-right">{fmt(l.tp)}</td><td className="px-1.5 py-1 text-right">{fmt(lineGross(l))}</td>
                                        <td className="px-1.5 py-1 text-right">{lineSpecial(l) ? fmt(lineSpecial(l)) : ''}</td><td className="px-1.5 py-1 text-right">{lineShelf(l) ? fmt(lineShelf(l)) : ''}</td>
                                        <td className="px-1.5 py-1 text-right font-semibold">{fmt(lineNet(l))}</td>
                                    </tr>
                                ))}
                                {!lines.length && <tr><td colSpan={11} className="px-2 py-4 text-center text-slate-400">No items.</td></tr>}
                            </tbody>
                        </table>
                        <div className="ml-auto mt-3 w-72 space-y-0.5 text-[13px] tabular-nums">
                            {[['Amount Billed', amountBilled], ['Special Discount', totalSpecial], ['Shelf Rent', totalShelf], ['Net Amount', netAmount], ['Prev. Balance', prevBal], ['Paid Cash', paid]].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between"><span className="text-slate-500">{k}</span><span>{fmt(v as number)}</span></div>
                            ))}
                            <div className="flex justify-between border-t border-slate-800 pt-1 text-[15px] font-black"><span>Net Balance</span><span>{fmt(netBalance)}</span></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 print:hidden">
                        <label className="mr-auto flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                            Print size
                            <select value={printSize} onChange={(e) => choosePrintSize(e.target.value as InvoiceSize)}
                                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-[13px] font-semibold text-slate-800">
                                {INVOICE_SIZES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                            </select>
                        </label>
                        <button type="button" onClick={() => askClose(() => setShowPV(false))} disabled={saving}
                            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-100">Close</button>
                        <button type="button" onClick={() => saveInvoice(false)} disabled={saving || saveMissing.length > 0} title={saveHint}
                            className="flex h-9 items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-4 text-[13px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Invoice
                        </button>
                        <button type="button" onClick={() => saveInvoice(true)} disabled={saving || saveMissing.length > 0} title={saveHint}
                            className="flex h-9 items-center gap-1.5 rounded-md border border-[#3b3f8f] bg-[#3b3f8f] px-4 text-[13px] font-bold text-white hover:bg-[#2f3278] disabled:opacity-50">
                            <Printer size={14} /> Save &amp; Print
                        </button>
                    </div>
                </Modal>
            )}

            {/* ─── View: Sale / Sale-Return Records (legacy Trade 1.0) ─── */}
            {showView && (
                <Modal title="Sale Records" onClose={() => askClose(closeSaleRecords)} xl>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-[#e4e4fb] p-3">
                        <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 pb-3 pt-1">
                            <legend className="px-1.5 text-[20px] font-black tracking-tight text-[#1f2bd6]">Sale / Sale-Return Records</legend>
                            <div className="grid grid-cols-[1fr_1fr_auto_auto_1.3fr] items-end gap-x-3 gap-y-2">
                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>From Sale Date</span>
                                    <input type="date" value={srFrom} onChange={(e) => e.target.value && setSrFrom(e.target.value)} className={`${EDIT} w-full`} />
                                </label>
                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>To Sale Date</span>
                                    <input type="date" value={srTo} onChange={(e) => e.target.value && setSrTo(e.target.value)} className={`${EDIT} w-full`} />
                                </label>
                                <button type="button" onClick={searchSaleRecords} disabled={srLoading} className={ACTION_BTN}>
                                    {srLoading ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>earch</>}
                                </button>
                                <button type="button" onClick={() => askClose(closeSaleRecords)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                                <ReadBox value={srRows ? <span className="text-[#1f2bd6]">Total Items = {srRows.length}</span> : ''} />

                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>Staff</span>
                                    <select value={srStaff} onChange={(e) => setSrStaff(e.target.value)} className={COA_SELECT}>
                                        <option value="">Select any one</option>
                                        {allStaff.map((x) => <option key={x.id} value={x.id}>{x.name}{x.status !== 'active' ? ' (inactive)' : ''}</option>)}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>Sale/Sale Return</span>
                                    <select value={srType} onChange={(e) => setSrType(e.target.value)}
                                        className={`${FIELD} w-full border-slate-400 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200`}>
                                        <option value="">Select any one</option>
                                        <option value="sale">Sale</option>
                                        <option value="return">Sale Return</option>
                                    </select>
                                </label>
                                <button type="button" onClick={findRecordsCustomer}
                                    className="h-8 shrink-0 rounded-md border-2 border-[#5c4a2a] bg-gradient-to-b from-[#fff1d6] to-[#f3d9a8] px-3 text-[13px] font-black text-[#3b2a10] shadow-sm hover:from-[#ffe7bd]">
                                    <span className="underline">F</span>ind Customer
                                </button>
                                <input value={srCustInput} placeholder="Code"
                                    onChange={(e) => { setSrCustInput(e.target.value); if (srCust) setSrCust(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') findRecordsCustomer(); }}
                                    className={`${FIELD} w-[130px] border-slate-400 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200`} />
                                <ReadBox value={srCust ? `${custName(srCust)}${srCust.area_name ? `  ·  ${srCust.area_name}` : ''}` : ''} />
                            </div>
                        </fieldset>

                        <div className="min-h-[120px] flex-1 overflow-auto border border-slate-500 bg-[#9ea1ad]">
                            <table className="w-full min-w-[1080px] table-fixed border-collapse bg-white text-[13px]">
                                <colgroup>{SR_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                    <tr>{SR_COLS.map((c) => <th key={c.h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-bold${thFit(c.h)}`}>{c.h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {(srRows || []).map((r, i) => (
                                        <tr key={r.sale_id + i} onClick={() => { setSrSel(r.sale_id); setSrChoice('print'); setSrAction(r); }}
                                            className={`cursor-pointer tabular-nums ${srSel === r.sale_id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}
                                            title={`${r.sale_id} — click for Print / Sale Return`}>
                                            {[r.sale_id, ymd(r.date), r.staff, r.acc_id, r.acc_name, num(r.cartons) ? fmt(num(r.cartons)) : '', fmt(num(r.amount)), num(r.disc) ? fmt(num(r.disc)) : '0', num(r.shelf) ? fmt(num(r.shelf)) : '0',
                                              fmt(num(r.net)), fmt(num(r.pre_bal)), fmt(num(r.total)), fmt(num(r.paid)), fmt(num(r.balance))].map((v, k) => (
                                                <td key={k} title={String(v)} className="overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 text-[11px] font-normal tracking-tight">{v}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {(!srRows || !srRows.length) && (
                                        <tr><td colSpan={SR_COLS.length} className="px-3 py-4 text-center text-slate-500">
                                            {srLoading ? 'Loading…' : srRows ? 'No records for this search.' : 'Choose the dates (and optionally staff, type or customer), then press Search.'}
                                        </td></tr>
                                    )}
                                </tbody>
                                {srRows && srRows.length > 0 && (
                                    <tfoot className="sticky bottom-0 bg-[#ececfd] text-[11.5px] font-semibold tabular-nums">
                                        <tr>
                                            <td colSpan={5} className="border-t border-slate-400 px-1.5 py-1.5 text-right text-[#1f2bd6]">Totals</td>
                                            <td className="border-t border-r border-slate-300 px-1.5 py-1.5">{fmt(srRows.reduce((s2, r) => s2 + num(r.cartons), 0)) || ''}</td>
                                            {(['amount', 'disc', 'shelf', 'net'] as const).map((k) => (
                                                <td key={k} className="border-t border-r border-slate-300 px-1.5 py-1.5">{fmt(srRows.reduce((s2, r) => s2 + num(r[k]), 0))}</td>
                                            ))}
                                            <td className="border-t border-r border-slate-300" />
                                            <td className="border-t border-r border-slate-300" />
                                            <td className="border-t border-r border-slate-300 px-1.5 py-1.5">{fmt(srRows.reduce((s2, r) => s2 + num(r.paid), 0))}</td>
                                            <td className="border-t border-slate-300" />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ─── Sale Records › row action box (legacy) ─── */}
            {srAction && (
                <Modal title={`Sale Records — ${srAction.sale_id}`} onClose={() => askClose(() => setSrAction(null))} small>
                    <div className="flex items-center gap-4 bg-[#e4e4fb] p-5">
                        <div className="flex flex-1 flex-col gap-3 rounded-lg border-2 border-[#3b3f8f] bg-[#ececfd] px-5 py-4">
                            {([['print', 'Print Sale Invoice'], ['return_all', 'Sale Return Complete Bill'], ['return_some', 'Sale Return Random']] as const).map(([v, label]) => (
                                <label key={v} className="flex cursor-pointer items-center gap-3 text-[16px] font-bold text-slate-800">
                                    <input type="radio" name="sr-action" checked={srChoice === v} onChange={() => setSrChoice(v)}
                                        className="h-4 w-4 accent-[#3b3f8f]" />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button type="button" autoFocus onClick={runSrAction} className={`${ACTION_BTN} min-w-[110px]`}><span className="underline">O</span>K</button>
                            <button type="button" onClick={() => askClose(() => setSrAction(null))} className={`${ACTION_BTN} min-w-[110px]`}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ─── Sale Return Complete Bill (legacy) ─── */}
            {rb && (
                <Modal title="Sale Return Complete Invoice" onClose={() => !rbSaving && askClose(() => setRb(null))} full>
                    <FitBox w={1440} h={700}>
                    <div className="flex h-full gap-3 p-3">
                        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                            <h2 className="text-[22px] font-black leading-none tracking-tight text-[#1f2bd6]">Sale Return Complete Bill</h2>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="text-[18px] font-black text-[#1b1f4b]">Customer</span>
                                <ReadBox value={<span className="w-full text-right font-mono text-[16px]">{rb.accId}</span>} className="w-[150px] !bg-white" />
                                <ReadBox value={<span className="font-semibold text-[#1f2bd6]">{rb.accName}</span>} className="min-w-0 flex-1" />
                                <span className="shrink-0 text-[12.5px] font-semibold text-slate-600">from invoice <b className="font-mono">{rb.saleId}</b></span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto border border-slate-500 bg-[#9ea1ad]">
                                <table className="w-full table-fixed border-collapse bg-white text-[13px]">
                                    <colgroup>{RET_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                        <tr>{RET_COLS.map((c) => <th key={c.h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-bold${thFit(c.h)}`}>{c.h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {(rbLines || []).map((l, i) => (
                                            <tr key={l.order_item} className="tabular-nums">
                                                {[i + 1, l.pid, l.name, ymd(l.expiry_date), l.remaining_qty, l.remaining_bonus, fmt(num(l.tp)), fmt(num(l.retail)),
                                                  fmt(retLineGross(l, l.remaining_qty)), fmt(num(l.disc_pct)), num(l.shelf_pct) ? fmt(num(l.shelf_pct)) : '', fmt(retLineDisc(l, l.remaining_qty)),
                                                  fmt(retLineGross(l, l.remaining_qty) - retLineDisc(l, l.remaining_qty))].map((v, k) => (
                                                    <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 ? 'font-semibold' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {(!rbLines || !rbLines.length) && (
                                            <tr><td colSpan={RET_COLS.length} className="px-3 py-4 text-center text-slate-500">
                                                {rbLines ? 'Everything on this invoice has already been returned.' : 'Loading…'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <div className="w-[300px] rounded-md bg-black px-3 py-1.5 text-[16px] font-bold text-white">Items= {(rbLines || []).length}</div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-3">
                                <span className={`${LABEL} text-[14px]`}>Invoice No.</span>
                                <ReadBox value={<span className="w-full text-center font-mono text-[16px] font-bold text-[#1f2bd6]">{rbNo}</span>} className="w-[170px] !border-orange-200 !bg-[#ffe3c7]" />
                                <span className={`${LABEL} text-[14px]`}>Staff</span>
                                <ReadBox value={<span className="w-full text-center font-bold text-[#1f2bd6]">{rb.staff || '—'}</span>} className="w-[190px] !border-orange-200 !bg-[#ffe3c7]" />
                                <label className={`${LABEL} ml-2 flex cursor-pointer items-center gap-1.5 text-[14px]`}>
                                    Sale Ret.Date
                                    <input type="checkbox" checked={rbDateOn} onChange={(e) => { setRbDateOn(e.target.checked); if (!e.target.checked) setRbDate(today()); }} className="h-4 w-4 accent-[#3b3f8f]" />
                                </label>
                                <input type="date" value={rbDate} disabled={!rbDateOn} max={today()} onChange={(e) => e.target.value && setRbDate(e.target.value)}
                                    className={`${FIELD} w-[170px] ${rbDateOn ? 'border-emerald-300 bg-[#e3fbe3] text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                            </div>
                        </div>

                        <div className="flex w-[330px] shrink-0 flex-col gap-2 overflow-hidden">
                            {[['Amt.Bonus', fmt(rbTotals.bonus), 'green'], ['Amt.Billed', fmt(rbTotals.billed), 'green'], ['Special Disc', fmt(rbTotals.disc - rbTotals.shelf), 'green'], ['Shelf Rent', fmt(rbTotals.shelf), 'green'],
                              ['Net Amount', fmt(rbTotals.net), 'yellow'], ['Prev.Bal', fmt(rbPrev), 'yellow']].map(([label, value, tone]) => (
                                <div key={label} className="grid grid-cols-[118px_1fr] items-center gap-2">
                                    <span className="text-[16px] font-black text-[#1b1f4b]">{label}</span>
                                    <div className={`flex h-11 items-center justify-end rounded-md border border-black bg-gradient-to-b from-[#0b0b0b] to-[#1c1c1c] px-3 font-mono text-[22px] font-black tabular-nums ${tone === 'yellow' ? 'text-[#ffe14d]' : 'text-[#3cff5a]'}`}>{value}</div>
                                </div>
                            ))}
                            <div className="grid grid-cols-[118px_1fr] items-center gap-2">
                                <span className="text-[16px] font-black text-[#1b1f4b]">Return Amt</span>
                                <input value={rbCash} onChange={(e) => setRbCash(e.target.value)} inputMode="decimal" placeholder="0"
                                    title="Cash handed back to the customer"
                                    className="h-11 w-full rounded-md border border-black bg-gradient-to-b from-[#0b0b0b] to-[#1c1c1c] px-3 text-right font-mono text-[22px] font-black tabular-nums text-[#ffe14d] outline-none placeholder:text-[#ffe14d]/50 focus:ring-2 focus:ring-amber-300" />
                            </div>
                            <div className="mt-3 grid grid-cols-[118px_1fr] items-center gap-2">
                                <span className="text-[16px] font-black text-[#1b1f4b]">Net Balance</span>
                                <div className="flex h-11 items-center justify-end rounded-md border border-black bg-gradient-to-b from-[#0b0b0b] to-[#1c1c1c] px-3 font-mono text-[22px] font-black tabular-nums text-[#ffe14d]">{fmt(rbTotals.balance)}</div>
                            </div>
                            <div className="mt-auto grid grid-cols-2 gap-3 pt-3">
                                <button type="button" onClick={saveReturnBill} disabled={rbSaving || !rbLines?.length || !rbDateOn}
                                    title={rbDateOn ? 'Return the complete bill' : 'Tick Sale Ret.Date and choose the date first'} className={ACTION_BTN}>
                                    {rbSaving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">R</span>eturn</>}
                                </button>
                                <button type="button" onClick={() => askClose(() => setRb(null))} disabled={rbSaving} className={ACTION_BTN}><span className="underline">C</span>lose</button>
                            </div>
                        </div>
                    </div>
                    </FitBox>
                </Modal>
            )}

            {/* ─── Sale Return (Random) (legacy) ─── */}
            {rrOpen && (
                <Modal title="Sale Return" onClose={() => !rrSaving && askClose(closeReturnRandom)} full>
                    <FitBox w={1440} h={780}>
                    <div className="flex h-full gap-3 p-3">
                        {/* Left: entry + grids */}
                        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                            <fieldset className="shrink-0 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-3 pb-2 pt-0">
                                <legend className="px-1.5 text-[20px] font-black tracking-tight text-[#1f2bd6]">Sale Return (Random)</legend>
                                <div className="grid grid-cols-[1.15fr_0.8fr_2fr_0.85fr_0.85fr_0.6fr_0.6fr] items-end gap-x-2 gap-y-0.5">
                                    <span className={LABEL}>Sale.Return Inv.</span><span className={LABEL}>Product ID</span><span className={LABEL}>Product Name</span>
                                    <span className={LABEL}>Sale Rate</span><span className={LABEL}>Retail Rate</span><span className={`${LABEL} text-[11px]`}>Special Disc %</span><span className={`${LABEL} text-[11px]`}>Shelf Rent %</span>
                                    <ReadBox value={rrPick?.invoice_no || ''} className="font-mono" />
                                    <ReadBox value={rrPick?.pid || ''} />
                                    <ReadBox value={rrPick?.name || ''} />
                                    <ReadBox value={rrPick ? fmt(num(rrPick.tp)) : ''} className="justify-end" />
                                    <ReadBox value={rrPick ? fmt(num(rrPick.retail)) : ''} className="justify-end" />
                                    <ReadBox value={rrPick ? fmt(num(rrPick.disc_pct)) : ''} className="justify-end" />
                                    <ReadBox value={rrPick ? fmt(num(rrPick.shelf_pct)) : ''} className="justify-end" />
                                </div>
                                <div className="mt-2 grid grid-cols-[auto_110px_auto_1fr_auto_1fr_auto_1.3fr] items-center gap-x-2">
                                    <span className={LABEL}>Ret. Qty</span>
                                    <input ref={rrQtyRef} value={rrQty} onChange={(e) => setRrQty(e.target.value)} inputMode="numeric"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRrLine(); } }}
                                        className={`${EDIT} w-full text-right`} aria-label="Return quantity" />
                                    <span className={LABEL}>Sale Qty</span>
                                    <ReadBox value={rrPick ? `${rrPick.qty}${rrPick.returned_qty ? `  (${rrPick.remaining_qty} left)` : ''}` : ''} className="justify-end" />
                                    <span className={LABEL}>Sale(Bons)</span>
                                    <ReadBox value={rrPick ? String(rrPick.bonus) : ''} className="justify-end" />
                                    <span className={LABEL}>Expiry</span>
                                    <ReadBox value={rrPick ? ymd(rrPick.expiry_date) : ''} />
                                </div>
                                <div className="mt-2 grid grid-cols-[auto_150px_1fr_auto_1fr] items-center gap-x-2">
                                    <button type="button" onClick={openReturnFindAccount}
                                        className="h-8 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] px-3 text-[13px] font-bold text-slate-800 hover:to-[#d9d9e6]">Find Customer</button>
                                    <input value={rrCustInput} onChange={(e) => setRrCustInput(e.target.value)} placeholder="Code"
                                        onKeyDown={(e) => { if (e.key === 'Enter') findReturnCustomer(); }} className={`${EDIT} w-full`} />
                                    <ReadBox value={rrCust ? `${custName(rrCust)}${rrCust.area_name ? `  ·  ${rrCust.area_name}` : ''}` : ''} />
                                    <span className={LABEL}>Staff</span>
                                    <select value={rrStaff} onChange={(e) => setRrStaff(e.target.value)} className={COA_SELECT}>
                                        <option value="">Select any one</option>
                                        {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                                    </select>
                                </div>
                            </fieldset>

                            {/* Products being returned */}
                            <div className="min-h-[90px] flex-[1.1] overflow-auto border border-slate-500 bg-[#9ea1ad]">
                                <table className="w-full table-fixed border-collapse bg-white text-[13px]">
                                    <colgroup>{RET_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                        <tr>{RET_COLS.map((c) => <th key={c.h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-bold${thFit(c.h)}`}>{c.h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {rrLines.map((l, i) => (
                                            <tr key={i} onClick={() => setRrSel(i)} className={`cursor-pointer tabular-nums ${rrSel === i ? 'bg-[#2f5bd3] text-white' : 'hover:bg-indigo-50'}`}>
                                                {[i + 1, l.pid, l.name, ymd(l.expiry_date), l.ret_qty, l.ret_bonus || '', fmt(num(l.tp)), fmt(num(l.retail)),
                                                  fmt(retLineGross(l, l.ret_qty)), fmt(num(l.disc_pct)), num(l.shelf_pct) ? fmt(num(l.shelf_pct)) : '', fmt(retLineDisc(l, l.ret_qty)),
                                                  fmt(retLineGross(l, l.ret_qty) - retLineDisc(l, l.ret_qty))].map((v, k) => (
                                                    <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 ? 'font-semibold' : ''}`}>{v}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {!rrLines.length && (
                                            <tr className="bg-white">{RET_COLS.map((c) => <td key={c.h} className="border-b border-r border-slate-300 px-1.5 py-1">&nbsp;</td>)}</tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* The customer's sale history — click a line to return from it */}
                            <div className="flex min-h-[110px] flex-[1.4] flex-col overflow-hidden border border-slate-500 bg-[#9ea1ad]">
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <table className="w-full table-fixed border-collapse bg-white text-[13px]">
                                        <colgroup>{RR_HIST_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                        <thead className="sticky top-0 z-10 bg-gradient-to-b from-white to-[#e9e9f1] text-left">
                                            <tr>{RR_HIST_COLS.map((c) => <th key={c.h} className={`whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold${thFit(c.h)}`}>{c.h}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {(rrHist || []).map((l) => (
                                                <tr key={l.order_item} onClick={() => pickRrLine(l)}
                                                    className={`cursor-pointer tabular-nums ${rrPick?.order_item === l.order_item ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}
                                                    title="Click to return from this line">
                                                    {[l.invoice_no, ymd(String(l.date)), l.pid, l.name, ymd(l.expiry_date), l.qty, l.bonus || '', l.returned_qty || '',
                                                      fmt(num(l.tp)), num(l.disc_pct) ? fmt(num(l.disc_pct)) : '', num(l.shelf_pct) ? fmt(num(l.shelf_pct)) : '', fmt(num(l.retail))].map((v, k) => (
                                                        <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 0 ? 'font-mono' : ''} ${k === 3 ? 'font-semibold' : ''}`}>{v}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {(!rrHist || !rrHist.length) && (
                                                <tr><td colSpan={RR_HIST_COLS.length} className="px-3 py-4 text-center text-slate-500">
                                                    {rrHistLoading ? 'Loading…' : !rrCust ? 'Find a customer, then press Sale. History.' : rrHist ? 'Nothing left to return for this search.' : 'Press Sale. History.'}
                                                </td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="shrink-0 border-t border-slate-400 bg-[#ececfd] px-3 py-1 text-[12.5px] font-semibold text-[#1f2bd6]">
                                    Sale history{rrCust ? ` — ${custName(rrCust)}` : ''} · {(rrHist || []).length} returnable line(s) · click a line, enter Ret. Qty, press Add
                                </div>
                            </div>
                        </div>

                        {/* Right: totals, actions, history filters */}
                        <div className="flex w-[380px] shrink-0 flex-col gap-2 overflow-hidden">
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-[#9da1d8] bg-[#ececfd] p-2.5">
                                {[['Sale Amount', fmt(rrTotals.sale)], ['Special Disc Amount', fmt(rrTotals.disc - rrTotals.shelf)], ['Shelf Rent Amount', fmt(rrTotals.shelf)], ['Net Sale Amount', fmt(rrTotals.net)], ['Previous Bal', fmt(rrPrev)]].map(([label, value]) => (
                                    <div key={label} className="flex flex-col gap-0.5">
                                        <span className={LABEL}>{label}</span>
                                        <div className="flex h-9 items-center justify-center rounded-md bg-black font-mono text-[18px] font-black tabular-nums text-[#3cff5a]">{value}</div>
                                    </div>
                                ))}
                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>Less Amount</span>
                                    <input value={rrLess} onChange={(e) => setRrLess(e.target.value)} inputMode="decimal" placeholder="0" className={`${EDIT} w-full text-right`} />
                                </label>
                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>Amount Return</span>
                                    <input value={rrCash} onChange={(e) => setRrCash(e.target.value)} inputMode="decimal" placeholder="0" title="Cash handed back to the customer"
                                        className={`${FIELD} w-full border-slate-400 bg-white text-right text-slate-900 focus:ring-2 focus:ring-indigo-200`} />
                                </label>
                                <label className="flex flex-col gap-0.5">
                                    <span className={LABEL}>Date</span>
                                    <input type="date" value={rrDate} max={today()} onChange={(e) => e.target.value && setRrDate(e.target.value)}
                                        className={`${FIELD} w-full border-slate-400 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200`} />
                                </label>
                                <div className="flex flex-col gap-0.5">
                                    <span className={LABEL}>Net Balance</span>
                                    <div className="flex h-8 items-center justify-center rounded-md bg-black font-mono text-[18px] font-black tabular-nums text-[#3cff5a]">{fmt(rrTotals.balance)}</div>
                                </div>
                                <button type="button" onClick={addRrLine} className={`${PANEL_BTN} mt-1 border-amber-300 from-[#fffbd1] to-[#fff09a] text-slate-700 hover:to-[#ffe86a]`}><span className="underline">A</span>dd</button>
                                <button type="button" onClick={removeRrLine} className={`${PANEL_BTN} mt-1 border-amber-200 from-[#fffde8] to-[#f6f0c4] text-slate-600 hover:to-[#efe6ad]`}><span className="underline">R</span>emove</button>
                                <span className={`${LABEL} col-span-2 mt-1 flex items-center gap-2`}>
                                    Voucher No
                                    <span className="flex h-8 flex-1 items-center justify-center rounded-md bg-black font-mono text-[16px] font-bold text-white">{rrNo}</span>
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={saveReturnRandom} disabled={rrSaving || !rrLines.length} className={`${ACTION_BTN} !min-w-0`}>
                                    {rrSaving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                                </button>
                                <button type="button" onClick={() => openSaleRecords({ type: 'return', cust: rrCust })} className={`${ACTION_BTN} !min-w-0`}><span className="underline">V</span>iew</button>
                                <button type="button" onClick={() => askClose(closeReturnRandom)} disabled={rrSaving} className={`${ACTION_BTN} !min-w-0`}><span className="underline">C</span>ancel</button>
                            </div>
                            <ReadBox value={<span className="w-full text-center font-bold text-[#1f2bd6]">Total Products = {rrLines.length}</span>} />

                            <div className="flex flex-col gap-2 rounded-lg border border-[#e6b98a] bg-[#ffe3c7] p-2.5">
                                <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                                    <button type="button" onClick={openReturnFindAccount} className="h-8 rounded border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] text-[13px] font-semibold text-slate-800">Find Cust.</button>
                                    <input value={rrCustInput} onChange={(e) => setRrCustInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') findReturnCustomer(); }} className={`${EDIT} w-full`} placeholder="Code" />
                                </div>
                                <ReadBox value={rrCust ? custName(rrCust) : ''} />
                                <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                                    <button type="button" onClick={() => { if (rrProduct.trim() && rrCust) loadRrHistory(); else openRrFindProduct(); }} className="h-8 rounded border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] text-[13px] font-semibold text-slate-800">Find Product</button>
                                    <input value={rrProduct} onChange={(e) => setRrProduct(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadRrHistory(); }} className={`${EDIT} w-full`} placeholder="PID or name" />
                                </div>
                                <div className="grid grid-cols-[96px_1fr] items-center gap-2">
                                    <span className={`${LABEL} text-center`}>Sale Invoice</span>
                                    <input value={rrInvoice} onChange={(e) => setRrInvoice(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadRrHistory(); }} className={`${EDIT} w-full`} placeholder="e.g. S26000911" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {([['From Date', rrFromOn, setRrFromOn, rrFrom, setRrFrom], ['To Date', rrToOn, setRrToOn, rrTo, setRrTo]] as const).map(([label, on, setOn, val, setVal]) => (
                                        <div key={label} className="flex flex-col gap-0.5">
                                            <label className={`${LABEL} flex cursor-pointer items-center gap-1.5`}>
                                                {label}
                                                <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 accent-[#3b3f8f]" />
                                            </label>
                                            <input type="date" value={val} disabled={!on} onChange={(e) => e.target.value && setVal(e.target.value)}
                                                className={`${FIELD} w-full ${on ? 'border-slate-400 bg-white text-slate-900' : 'border-slate-300 bg-[#ececf3] text-slate-500'}`} />
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => loadRrHistory()} disabled={rrHistLoading}
                                    className="h-9 rounded-md border border-cyan-400 bg-gradient-to-b from-[#c8f6ff] to-[#9fe9f7] text-[14px] font-bold text-slate-800 hover:to-[#86e0f2]">
                                    {rrHistLoading ? 'Loading…' : 'Sale. History'}
                                </button>
                            </div>
                        </div>
                    </div>
                    </FitBox>
                </Modal>
            )}


        </div>
    );
}
