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
import FitStage from '@/components/trade/FitStage';

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
// No width here: callers size each field (w-full in grids, fixed px in rows) so
// two width utilities never fight over the same element.
const FIELD = 'h-8 min-w-0 rounded-md border px-2.5 text-[13.5px] font-semibold tabular-nums outline-none transition-shadow';
const EDIT = `${FIELD} border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`;
const READ = `${FIELD} border-slate-300 bg-[#ececf3] text-slate-700`;

const PANEL_BTN = 'h-9 rounded-md border bg-gradient-to-b text-[14.5px] font-bold shadow-sm active:translate-y-px';
const ACTION_BTN = 'flex h-9 min-w-[104px] items-center justify-center rounded-md border border-[#c9a77a] bg-gradient-to-b from-[#fff3e2] to-[#ffdcb5] px-4 text-[14px] font-bold text-slate-800 shadow-sm hover:to-[#ffcf9a] active:translate-y-px disabled:opacity-60';

/* Design size of the form. FitStage scales it to fill the window in proportion
   to the screen; this is the smallest area the whole form needs. */
const STAGE_W = 1240;
const STAGE_H = 760;

const COA_SELECT = `${FIELD} w-full border-emerald-300 bg-[#e3fbe3] text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60`;
const COA_VIEW_COLS = [
    { h: 'Main Account', w: '9%' }, { h: '2nd Level Acc.', w: '15%' }, { h: '3rd Level Acc.', w: '13%' },
    { h: 'Account ID', w: '9%' }, { h: 'Acc. Name', w: '20%' }, { h: 'Area', w: '12%' },
    { h: 'Cell No', w: '11%' }, { h: 'Contact Person', w: '11%' },
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
    { h: 'PID', w: '7%' }, { h: 'Category', w: '10%' }, { h: 'Product', w: '27%' }, { h: 'Pack', w: '6%' },
    { h: 'Expiry Date', w: '10%' }, { h: 'Qty(U)', w: '7%' }, { h: 'Qty(B)', w: '7%' }, { h: 'T.P', w: '9%' },
    { h: 'TP %', w: '7%' }, { h: 'Retail Rate', w: '10%' },
];

/* Sale / Sale-Return Records grid (legacy column order). */
const SR_COLS = [
    { h: 'SaleID', w: '9%' }, { h: 'Date Sale', w: '8%' }, { h: 'Staff', w: '10%' }, { h: 'Acc.ID', w: '8%' },
    { h: 'Acc.Name', w: '19%' }, { h: 'Amount', w: '7.5%' }, { h: 'Disc.', w: '6%' }, { h: 'Net.Amount', w: '7.5%' },
    { h: 'Pre. Bal.', w: '7%' }, { h: 'Total', w: '6.5%' }, { h: 'Paid', w: '5.5%' }, { h: 'Balance', w: '6%' },
];

/* Keyboard shortcuts shown in the grid footer. */
const SHORTCUTS: [string, string][] = [
    ['F2', 'Find Customer'], ['F3', 'Find Product'], ['Enter', 'Next field / Add'],
    ['Dbl-click', 'Edit line'], ['F9', 'Invoice PV'], ['Ctrl+S', 'Save'],
];

/* Sale grid columns — legacy order and proportions (as % of the grid width, so
   they scale with the window); headers and values left-aligned like Trade 1.0. */
const GRID_COLS: { h: string; w?: string; right?: boolean }[] = [
    { h: 'SNo', w: '4%' }, { h: 'PID', w: '6%' }, { h: 'Product Name', w: '24%' }, { h: 'Expiry', w: '8.5%' },
    { h: 'Qty', w: '5.5%' }, { h: 'Bonus', w: '5.5%' }, { h: 'TP', w: '7%' },
    { h: 'Retail', w: '7%' }, { h: 'SubTotal', w: '8.5%' }, { h: 'Disc%', w: '5.5%' },
    { h: 'Dis.Amt', w: '8%' }, { h: 'Net Amt', w: '10.5%' },
];

function ReadBox({ value, className = '' }: { value: React.ReactNode; className?: string }) {
    const sized = /(^|\s)(w-|flex-)/.test(className);
    return <div className={`${READ} ${sized ? '' : 'w-full'} flex items-center overflow-hidden whitespace-nowrap ${className}`}>{value}</div>;
}

function Led({ label, value, tone = 'green' }: { label: string; value: string; tone?: 'green' | 'yellow' }) {
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
function ConfirmBox({ msg, onYes, onNo }: { msg: string; onYes: () => void; onNo: () => void }) {
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

function Modal({ title, onClose, children, wide = false, xl = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; xl?: boolean }) {
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
            <div className={`flex max-h-[calc(100vh-2rem)] w-full ${xl ? 'h-[calc(100vh-2rem)] max-w-6xl' : wide ? 'max-w-4xl' : 'max-w-2xl'} flex-col overflow-hidden rounded-xl border border-slate-400 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.55)] print:max-h-none print:border-0 print:shadow-none`}>
                <div className="flex items-center justify-between bg-gradient-to-r from-[#3b3f8f] to-[#5a5fc4] px-4 py-2 text-white print:hidden">
                    <span className="text-[13.5px] font-semibold">AL-QAVI TRADERS&nbsp;&nbsp;&nbsp;Trade 1.0&nbsp;&nbsp;( {title} )</span>
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

    // Invoice
    const [invoiceNo, setInvoiceNo] = useState('…');
    const [showPR, setShowPR] = useState(false);
    const [showPV, setShowPV] = useState(false);
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
    const EMPTY_COA = { main: '', l2: '', l3: '', name: '', cell: '', contact: '', area: '', status: '' };
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

    const openAddCustomer = () => {
        const q = custQuery.trim();
        setCoa({ ...EMPTY_COA, main: '1', l2: '12', l3: String(CUSTOMER_GROUP), name: q && !/^\d+$/.test(q) ? q : '' });
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
            name: a.name || '', cell: a.cell_no || '', contact: a.contact_person || '',
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
                name: coaV.name.trim(), cell_no: coaV.cell.trim(), contact_person: coaV.contact.trim(),
                area: coaV.area || null, status: coaV.status || coaSel.status,
            });
            setCoaList((l) => (l || []).map((x) => (x.id === data.id ? data : x)));
            setCoaSel(data);
            if (data.customer) {
                setCustomers((cs) => cs.map((c) => (c.id === data.customer
                    ? { ...c, first_name: data.name, last_name: '', phone: data.cell_no, area: data.area, area_name: data.area_name, is_active: data.status === 'active' }
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
        coaRows.map((a) => [a.main_name, a.level2_name, a.group_name, a.acc_id, a.name, a.area_name || '', a.cell_no, a.contact_person, a.status]));

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
                <span className="col-span-2" />

                <span className={LABEL}>Contact Person</span>
                <input value={f.contact} onChange={(e) => setF((c) => ({ ...c, contact: e.target.value }))} className={`${EDIT} w-full`} />
                <span className={LABEL}>Status</span>
                <select value={f.status} onChange={(e) => setF((c) => ({ ...c, status: e.target.value }))} className={COA_SELECT}>
                    <option value="">Select any One</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <span className="col-span-2" />
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
                group: coa.l3, name, cell_no: coa.cell.trim(), contact_person: coa.contact.trim(),
                area: coa.area || null, status: coa.status || 'active',
            });
            toast.success(`Account ${data.acc_id} — ${name} saved.`);
            if (data.customer_record) {
                // A receivables account is a customer: put it straight on the invoice.
                setCustomers((cs) => [data.customer_record, ...cs]);
                setAddingCust(false);
                pickCustomer(data.customer_record);
            } else {
                setCoa((c) => ({ ...c, name: '', cell: '', contact: '' }));
                api.get('v1/company/ledger-accounts/next_id/', { params: { group: coa.l3 } })
                    .then(({ data: n }) => setNextAccId(n.acc_id || '')).catch(() => {});
            }
        } catch (err: any) {
            const d = err?.response?.data;
            toast.error(String(d?.detail || (d && Object.values(d)[0]) || 'Could not save the account.'), { duration: 6000 });
        } finally { setSavingCust(false); }
    };

    // Find Account serves the invoice and the Sale Records filter.
    const custTarget = useRef<'invoice' | 'records'>('invoice');
    const closeFindCustomer = () => { setShowFindCust(false); setAddingCust(false); custTarget.current = 'invoice'; };

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

    // Don't let a refresh/close silently drop an unsaved invoice.
    useEffect(() => {
        if (!lines.length) return;
        const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [lines.length]);

    /* ── customer ── */
    const pickCustomer = (c: any) => {
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
        if (!p.batches.length) toast.error(`${p.name} has no stock to sell.`);
        setTimeout(() => qtyPRef.current?.focus(), 0);
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

    const openFindProduct = (name = '') => {
        setFpName(name); setFpBarcode(''); setFpSel('');
        setShowFindProd(true);
        if (!companies.length) {
            (async () => {
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
            })();
        }
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
    const pickStockRow = async (r: any) => {
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
        try {
            const { data } = await api.get('v1/products/items/sale_lookup/', { params: { code: r.pid } });
            const prod: LookupProduct | undefined = data.find((x: any) => x.id === r.product_id) || data[0];
            if (!prod) { toast.error('This product is no longer available.'); return; }
            loadProduct(prod);
            if (num(r.tp_pct) > 0) setEntry((e) => ({ ...e, discPct: String(num(r.tp_pct)) }));
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
        setEntry({ ...EMPTY_ENTRY });
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
            applyBatch(prod, l.batchId, { qtyU: String(l.qty), bonus: l.bonus ? String(l.bonus) : '', discPct: l.discPct ? String(l.discPct) : '' });
            setEntry((e) => ({ ...e, tp: String(l.tp) }));
            setTimeout(() => qtyURef.current?.focus(), 0);
        } catch { toast.error('Could not load that line.'); }
    };

    /* ── invoice totals ── */
    const amountBilled = lines.reduce((s, l) => s + lineGross(l), 0);
    const totalDisc = lines.reduce((s, l) => s + lineDisc(l), 0);
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
            // Defer so the cleared lines drop the unsaved-invoice guard first.
            setTimeout(() => window.close(), 0);
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

    const openSaleRecords = () => {
        setSrFrom(today()); setSrTo(today()); setSrStaff(''); setSrType('');
        setSrCust(null); setSrCustInput(''); setSrRows(null); setSrSel('');
        setShowView(true);
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

    const saveInvoice = async (print: boolean) => {
        if (saving) return;
        if (!customer) { toast.error('Find a customer first.'); return; }
        if (!lines.length) { toast.error('Add at least one product.'); return; }
        if (paid > netAmount + 0.001) { toast.error('Paid Cash is more than the Net Amount.'); return; }
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
        } finally { setSaving(false); }
    };

    /* ── keyboard ── */
    useEffect(() => {
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
            <div className="print:hidden">
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
                <div className="grid shrink-0 grid-cols-[72px_2.1fr_1.05fr_1.05fr_1.25fr_0.85fr_0.85fr_1.2fr_0.95fr_1.3fr_1.35fr_1.7fr] items-end gap-x-1.5 gap-y-0.5">
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

                    <button type="button" onClick={() => openFindProduct()}
                        className="h-8 rounded-md border border-slate-400 bg-gradient-to-b from-white to-[#e6e6ee] text-[13px] font-bold text-slate-800 shadow-sm hover:to-[#d9d9e6] active:translate-y-px">
                        Find
                    </button>
                    <input ref={codeRef} value={entry.code} onChange={setE('code')} onKeyDown={onEnter(resolveCode)} className={`${EDIT} w-full`} aria-label="Product code" />
                    <input ref={qtyPRef} value={entry.qtyP} onChange={setE('qtyP')} onKeyDown={onEnter(() => qtyURef.current?.focus())} inputMode="numeric" className={`${EDIT} w-full`} aria-label="Quantity in packs" />
                    <input ref={qtyURef} value={entry.qtyU} onChange={setE('qtyU')} onKeyDown={onEnter(() => bonRef.current?.focus())} inputMode="numeric" className={`${EDIT} w-full`} aria-label="Quantity in units" />
                    <ReadBox value={totalUnits ? fmt(totalUnits) : ''} className="justify-end" />
                    <ReadBox value={p ? packing : ''} className="justify-end" />
                    <input ref={bonRef} value={entry.bonus} onChange={setE('bonus')} onKeyDown={onEnter(() => tpRef.current?.focus())} inputMode="numeric" className={`${EDIT} w-full`} aria-label="Bonus units" />
                    <input ref={tpRef} value={entry.tp} onChange={setE('tp')} onKeyDown={onEnter(() => discRef.current?.focus())} inputMode="decimal" className={`${EDIT} w-full`} aria-label="Unit trade price" />
                    <input ref={discRef} value={entry.discPct} onChange={setE('discPct')} onKeyDown={onEnter(addLine)} inputMode="decimal" className={`${EDIT} w-full`} aria-label="Discount percent" />
                    <ReadBox value={p ? fmt(num(batch?.retail_price) || num(p.retail_price)) : ''} className="justify-end" />
                    <ReadBox value={discAmt ? fmt(discAmt) : ''} className="justify-end" />
                    <ReadBox value={subTotal ? fmt(subTotal) : ''} className="justify-end" />
                </div>

                {/* Grid + right panel */}
                <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-3">
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-400 bg-[#b9bccb] shadow-inner">
                        <div className="min-h-0 flex-1 overflow-auto">
                            {/* Widths are inline on <col> AND the header cells so the
                                fixed layout can never collapse Product Name. */}
                            <table className="w-full table-fixed border-collapse border-b border-slate-500 text-[13px]">
                                <colgroup>
                                    {GRID_COLS.map((c) => <col key={c.h} style={c.w ? { width: c.w } : undefined} />)}
                                </colgroup>
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-b from-white to-[#e9e9f1] text-left text-[13px] font-bold text-slate-800">
                                        {GRID_COLS.map((c) => (
                                            <th key={c.h} style={c.w ? { width: c.w } : undefined}
                                                className={`overflow-hidden whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 ${c.right ? 'text-right' : ''}`}>{c.h}</th>
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
                                                    className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 2 ? 'font-semibold' : ''} ${GRID_COLS[k].right ? 'text-right' : ''}`}>{v}</td>
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
                            <button type="button" onClick={() => p ? setShowPR(true) : toast.error('Enter a product code first.')}
                                className={`${PANEL_BTN} border-orange-300 from-[#ffe8d1] to-[#ffd0a3] text-slate-800 hover:to-[#ffc287]`}>
                                Product&nbsp;&nbsp;PR
                            </button>
                            <button type="button" onClick={() => setShowPV(true)} className={`${PANEL_BTN} border-slate-300 from-white to-[#e8e8ee] text-slate-800 hover:to-[#dadae4]`}>
                                Invoice PV
                            </button>
                        </div>

                        <div className="grid grid-cols-[1.5fr_1fr_1fr] items-end gap-x-1.5 gap-y-0.5">
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

                        <div className="rounded-md bg-black px-3 py-1.5 font-mono text-[13.5px] font-bold text-white">LabItems = {lines.length}</div>
                    </div>
                </div>

                {/* Totals */}
                <div className="grid shrink-0 grid-cols-[1fr_1fr_0.95fr_1.1fr_1.5fr] gap-3">
                    <Led label="Amount Billed" value={fmt(amountBilled)} />
                    <Led label="Total Disc By%" value={fmt(totalDisc)} />
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
                        <button type="button" onClick={() => saveInvoice(false)} disabled={saving} className={ACTION_BTN}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={openSaleRecords} className={ACTION_BTN}><span className="underline">V</span>iew</button>
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
                    <div className="flex items-center gap-2 border-b border-slate-200 p-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-2.5 top-2 text-slate-400" />
                            <input autoFocus value={custQuery} onChange={(e) => setCustQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && custMatches[0]) pickCustomer(custMatches[0]); }}
                                placeholder="Code, name, area or phone…" className={`${EDIT} w-full pl-8`} />
                        </div>
                        <button type="button" onClick={openAddCustomer} className={`${ACTION_BTN} shrink-0`}>
                            <span className="underline">A</span>dd New
                        </button>
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
                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                        <ReadBox value={`${custMatches.length}${custMatches.length === 200 ? '+' : ''} of ${customers.length} customers`} className="w-[280px] !text-[12.5px]" />
                        <button type="button" onClick={() => askClose(closeFindCustomer)} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                    </div>
                </Modal>
            )}

            {/* ─── Chart of Account — entry window (Find Account › Add New) ─── */}
            {addingCust && (
                <Modal title="Chart of Account" onClose={() => !savingCust && askClose(() => setAddingCust(false))} wide>
                    <div className="min-h-0 flex-1 overflow-auto bg-[#e4e4fb] p-4">
                        {coaForm(coa, setCoa, nextAccId, saveNewCustomer, true)}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#9da1d8] bg-[#e4e4fb] px-4 py-3">
                        <button type="button" onClick={saveNewCustomer} disabled={savingCust} className={ACTION_BTN}>
                            {savingCust ? <Loader2 size={14} className="animate-spin" /> : <><span className="underline">S</span>ave</>}
                        </button>
                        <button type="button" onClick={viewAccounts} className={ACTION_BTN}><span className="underline">V</span>iew</button>
                        <button type="button" onClick={() => askClose(() => setAddingCust(false))} disabled={savingCust} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
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
                                            {[a.main_name, a.level2_name, a.group_name, a.acc_id, a.name, a.area_name || '', a.cell_no || '-', a.contact_person || '0'].map((v, k) => (
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
                                    onKeyDown={(e) => { if (e.key === 'Enter' && stockRows[0]) pickStockRow(stockRows[0]); }}
                                    placeholder="Name or PID" className={`${EDIT} w-full`} />
                            </div>
                            <div className="flex items-center gap-3 rounded-lg border border-[#9da1d8] bg-[#ececfd] px-4 py-3">
                                <span className={`${LABEL} leading-tight`}>Product<br />Bar Code</span>
                                <input value={fpBarcode} onChange={(e) => setFpBarcode(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onBarcodeEnter(); } }}
                                    placeholder="Scan or type, then Enter" className={`${FIELD} w-full border-slate-400 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200`} />
                            </div>
                            <div className="flex flex-col justify-center gap-2">
                                <button type="button" onClick={() => openPopup('/admin/products/add')} className={`${ACTION_BTN} min-w-[170px]`}>
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
                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[900px] table-fixed border-collapse bg-white text-[13px]">
                                    <colgroup>{FP_STOCK_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-[#ffe1b8] text-left">
                                        <tr>{FP_STOCK_COLS.map((c) => <th key={c.h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{c.h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {stockRows.map((r) => (
                                            <tr key={r.batch_id} onClick={() => setFpSel(r.batch_id)} onDoubleClick={() => pickStockRow(r)}
                                                className={`cursor-pointer tabular-nums ${fpSel === r.batch_id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}
                                                title="Double-click to select">
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
                                Available Stock — {fpSearching ? `${stockRows.length} batch(es)` : 'search to list'}{stockLoading ? ' · loading…' : ''} · double-click a row to select it
                            </div>
                        </div>

                        {/* What this customer has bought from us */}
                        <div className="flex min-h-[100px] flex-[2] flex-col overflow-hidden border border-slate-500 bg-[#9ea1ad]">
                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[900px] table-fixed border-collapse bg-[#ffffcf] text-[13px]">
                                    <colgroup>{FP_HIST_COLS.map((c) => <col key={c.h} style={{ width: c.w }} />)}</colgroup>
                                    <thead className="sticky top-0 z-10 bg-[#ffe1b8] text-left">
                                        <tr>{FP_HIST_COLS.map((c) => <th key={c.h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-semibold">{c.h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {histShown.map((r, i) => (
                                            <tr key={i} onDoubleClick={() => pickHistoryRow(r)} className="cursor-pointer tabular-nums hover:bg-[#fff3a6]"
                                                title={`Invoice ${r.invoice_no} · ${String(r.date).slice(0, 10)} — double-click to sell again`}>
                                                {[r.pid, r.category, r.name, r.pack, ymd(r.expiry_date), fmt(num(r.qty)), r.bonus ? fmt(num(r.bonus)) : '', fmt(num(r.tp)), num(r.tp_pct) ? fmt(num(r.tp_pct)) : '', fmt(num(r.retail))].map((v, k) => (
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

            {/* ─── Product PR (batch-wise purchase rates) ─── */}
            {showPR && p && (
                <Modal title={`Product PR — ${p.name}`} onClose={() => askClose(() => setShowPR(false))}>
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
                <Modal title={`Invoice PV — ${invoiceNo}`} onClose={() => !saving && askClose(() => setShowPV(false))} wide>
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
                            {[['Amount Billed', amountBilled], ['Total Discount', totalDisc], ['Net Amount', netAmount], ['Prev. Balance', prevBal], ['Paid Cash', paid]].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between"><span className="text-slate-500">{k}</span><span>{fmt(v as number)}</span></div>
                            ))}
                            <div className="flex justify-between border-t border-slate-800 pt-1 text-[15px] font-black"><span>Net Balance</span><span>{fmt(netBalance)}</span></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 print:hidden">
                        <button type="button" onClick={() => askClose(() => setShowPV(false))} disabled={saving}
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

            {/* ─── View: Sale / Sale-Return Records (legacy Trade 1.0) ─── */}
            {showView && (
                <Modal title="Sale Records" onClose={() => askClose(() => setShowView(false))} xl>
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
                                <button type="button" onClick={() => askClose(() => setShowView(false))} className={ACTION_BTN}><span className="underline">C</span>ancel</button>
                                <ReadBox value={srRows ? <span className="text-[#1f2bd6]">Total Records = {srRows.length}</span> : ''} />

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
                                    <tr>{SR_COLS.map((c) => <th key={c.h} className="whitespace-nowrap border-b border-r border-slate-400 px-1.5 py-1.5 font-bold">{c.h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {(srRows || []).map((r, i) => (
                                        <tr key={r.sale_id + i} onClick={() => setSrSel(r.sale_id)}
                                            onDoubleClick={() => r.id && openPopup(`/admin/sales/${r.id}/invoice`)}
                                            className={`cursor-pointer tabular-nums ${srSel === r.sale_id ? 'bg-[#7dfa7d]' : 'hover:bg-indigo-50'}`}
                                            title={r.id ? 'Double-click to open the invoice' : undefined}>
                                            {[r.sale_id, ymd(r.date), r.staff, r.acc_id, r.acc_name, fmt(num(r.amount)), num(r.disc) ? fmt(num(r.disc)) : '0',
                                              fmt(num(r.net)), fmt(num(r.pre_bal)), fmt(num(r.total)), fmt(num(r.paid)), fmt(num(r.balance))].map((v, k) => (
                                                <td key={k} title={String(v)} className={`overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-slate-300 px-1.5 py-1 ${k === 0 ? 'font-mono' : ''} ${k === 4 ? 'font-semibold' : ''}`}>{v}</td>
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
                                    <tfoot className="sticky bottom-0 bg-[#ececfd] font-bold tabular-nums">
                                        <tr>
                                            <td colSpan={5} className="border-t border-slate-400 px-1.5 py-1.5 text-right text-[#1f2bd6]">Totals</td>
                                            {(['amount', 'disc', 'net'] as const).map((k) => (
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
        </div>
    );
}
