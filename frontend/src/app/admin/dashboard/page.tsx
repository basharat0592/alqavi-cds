"use client";

/*
 * AL-QAVI TRADER'S — Admin Dashboard (Trade 2.1 style)
 * Rebuilt on the alqavi_old branch to mirror the legacy "Trade" desktop app:
 * a top menu bar, a big brand title, a grid of colour-coded action buttons up front,
 * and a right rail with the live "Expiry List" and "Stock Minimum Range" panels.
 * Buttons link to the existing admin routes; the two panels read live product data
 * from useAdminDashboard().
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Package, Boxes, CalendarClock, ShoppingCart, ScanLine, RefreshCcw,
    TrendingUp, RotateCcw, ClipboardList, CreditCard, ArrowDownLeft, ArrowUpRight,
    BookOpen, Database, KeyRound, Receipt, Wallet, BarChart3, FileText, Users,
    ChevronDown,
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { productService } from '@/lib/api';
import { openPopup } from '@/lib/popup';
import FitStage from '@/components/trade/FitStage';

/* ───────────────────────── Top menu bar (File / Product / …) ───────────────────────── */
// `inPlace` links navigate this window; every other item opens its screen in a
// pop-up window, like the legacy desktop app.
type MenuLink = { label: string; href?: string; action?: 'logout'; inPlace?: boolean };
type Menu = { title: string; items: MenuLink[] };

const MENUS: Menu[] = [
    { title: 'File', items: [
        { label: 'Dashboard', href: '/admin/dashboard', inPlace: true },
        { label: 'Full Admin View', href: '/admin/products', inPlace: true },
        { label: 'Backup Database', href: '/admin/settings' },
        { label: 'Logout', action: 'logout' },
    ] },
    { title: 'Product', items: [
        { label: 'Product Detail', href: '/admin/products' },
        { label: 'Add Product', href: '/admin/products/add' },
        { label: 'Stock', href: '/admin/inventory/list' },
        { label: 'Update Rates / Expiry', href: '/admin/products' },
    ] },
    { title: 'Sale', items: [
        { label: 'Sale Invoice', href: '/admin/trade/sale-invoice' },
        { label: 'Sale (POS)', href: '/admin/sale' },
        { label: 'Sale Records', href: '/admin/trade/sale-records' },
        { label: 'Sale Return', href: '/admin/sale-returns' },
        { label: 'Orders', href: '/admin/orders' },
    ] },
    { title: 'Accounts', items: [
        { label: 'Chart of Account', href: '/admin/payments' },
        { label: 'Receipt Voucher', href: '/admin/income' },
        { label: 'Payment Voucher', href: '/admin/payments' },
        { label: 'Expense Voucher', href: '/admin/expense' },
    ] },
    { title: 'Setup', items: [
        { label: 'System Settings', href: '/admin/settings' },
        { label: 'Suppliers', href: '/admin/company/suppliers' },
        { label: 'Customers', href: '/admin/company/customers' },
        { label: 'Areas / Territories', href: '/admin/company/areas' },
        { label: 'Users', href: '/admin/users' },
        { label: 'Website CMS', href: '/admin/website-settings' },
    ] },
    { title: 'Reports', items: [
        { label: 'Reports Center', href: '/admin/reports' },
        { label: 'Income', href: '/admin/income' },
        { label: 'Expense', href: '/admin/expense' },
    ] },
    { title: 'About', items: [
        { label: "AL-QAVI TRADER'S — Trade 2.1", href: '/admin/dashboard', inPlace: true },
    ] },
];

function MenuBar() {
    const [open, setOpen] = useState<string | null>(null);
    const router = useRouter();
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const go = (it: MenuLink) => {
        setOpen(null);
        if (it.action === 'logout') { authService.logout(); router.push('/login'); return; }
        if (!it.href) return;
        if (it.inPlace) router.push(it.href);
        else openPopup(it.href);
    };
    return (
        <div ref={ref} className="sticky top-0 z-30 flex flex-wrap items-center gap-1 border-b-[3px] border-[#FFD21F] bg-[#2B2F8F] px-3 py-1.5">
            {MENUS.map((m) => (
                <div key={m.title} className="relative">
                    <button
                        type="button"
                        onClick={() => setOpen(open === m.title ? null : m.title)}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[16px] font-semibold transition-colors ${open === m.title ? 'bg-[#FFD21F] text-[#1F2370]' : 'text-white hover:bg-white/15'}`}
                    >
                        {m.title}
                        <ChevronDown size={15} className={`transition-transform ${open === m.title ? 'rotate-180' : ''}`} />
                    </button>
                    {open === m.title && (
                        <div className="absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-150">
                            {m.items.map((it) => (
                                <button
                                    key={it.label}
                                    type="button"
                                    onClick={() => go(it)}
                                    className="block w-full px-4 py-2.5 text-left text-[15px] font-medium text-slate-600 hover:bg-[#2B2F8F]/5 hover:text-[#2B2F8F]"
                                >
                                    {it.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ───────────────────────── Action button grid ───────────────────────── */
type Btn = { name: string; href: string; icon: any };
type Theme = { tile: string; icon: string; ring: string };
type Group = { theme: Theme; buttons: Btn[] };

/* Colours of the Al-Qavi visiting card: royal blue, green, yellow, sky blue and
   the logo's orange. Each legacy column keeps its own colour. */
const THEMES: Record<string, Theme> = {
    product: { tile: 'bg-[#eef0fb] hover:bg-[#e2e5f8] border-[#c9cdf0] text-[#1F2370]', icon: 'bg-[#2B2F8F] text-white', ring: 'hover:ring-[#9aa0e3]' },
    purchase: { tile: 'bg-[#fff8d6] hover:bg-[#fff1b3] border-[#f1dd7a] text-[#5c4700]', icon: 'bg-[#FFD21F] text-[#1F2370]', ring: 'hover:ring-[#f1d24f]' },
    sale: { tile: 'bg-[#e7f6ee] hover:bg-[#d6efe2] border-[#b2e0c6] text-[#0b5e38]', icon: 'bg-[#14935C] text-white', ring: 'hover:ring-[#7fcca1]' },
    account: { tile: 'bg-[#e8f3fc] hover:bg-[#d8eafa] border-[#b8d9f3] text-[#124f80]', icon: 'bg-[#2F8FD8] text-white', ring: 'hover:ring-[#8cc0ea]' },
    backup: { tile: 'bg-[#fdeee7] hover:bg-[#fbe1d5] border-[#f2c6b2] text-[#8a3a1b]', icon: 'bg-[#E9825A] text-white', ring: 'hover:ring-[#eda98a]' },
    report: { tile: 'bg-white hover:bg-[#f3f4fc] border-[#c9cdf0] text-[#1F2370]', icon: 'bg-gradient-to-br from-[#2B2F8F] to-[#2F8FD8] text-white', ring: 'hover:ring-[#9aa0e3]' },
};

const COLUMNS: Group[] = [
    { theme: THEMES.product, buttons: [
        { name: 'Product Detail', href: '/admin/products', icon: Package },
        { name: 'Stock', href: '/admin/inventory/list', icon: Boxes },
        { name: 'Update Rates / Expiry', href: '/admin/products', icon: CalendarClock },
    ] },
    { theme: THEMES.purchase, buttons: [
        { name: 'Purchase', href: '/admin/purchases/add', icon: ShoppingCart },
        { name: 'Purchase Order', href: '/admin/purchases', icon: ClipboardList },
        { name: 'Purchase Return', href: '/admin/purchases/returns', icon: RefreshCcw },
    ] },
    { theme: THEMES.sale, buttons: [
        { name: 'Sale', href: '/admin/trade/sale-invoice', icon: ScanLine },
        { name: 'Sale Records', href: '/admin/trade/sale-records', icon: TrendingUp },
        { name: 'Sale Return', href: '/admin/sale-returns', icon: RotateCcw },
    ] },
    { theme: THEMES.account, buttons: [
        { name: 'Chart of Account', href: '/admin/payments', icon: BookOpen },
        { name: 'Receipt Voucher', href: '/admin/income', icon: ArrowDownLeft },
        { name: 'Payment Voucher', href: '/admin/payments', icon: Wallet },
    ] },
];

/* Bottom row, as in the legacy console: Backup DataBase spans the Product and
   Purchase columns, then Change Password (Sale column) and Expense Voucher. */
const BOTTOM_ROW: { b: Btn; theme: Theme; span?: boolean }[] = [
    { b: { name: 'Backup Database', href: '/admin/settings', icon: Database }, theme: THEMES.backup, span: true },
    { b: { name: 'Change Password', href: '/admin/settings', icon: KeyRound }, theme: THEMES.sale },
    { b: { name: 'Expense Voucher', href: '/admin/expense', icon: ArrowUpRight }, theme: THEMES.account },
];

const REPORTS: Btn[] = [
    { name: 'Stock Reports', href: '/admin/reports', icon: Boxes },
    { name: 'Sale & Sale Return Reports', href: '/admin/reports', icon: TrendingUp },
    { name: 'Party Ledger & Recovery Reports', href: '/admin/reports', icon: Users },
    { name: 'Purchase Order / Detail / Return Reports', href: '/admin/reports', icon: FileText },
    { name: 'Sale Statements Reports', href: '/admin/reports', icon: Receipt },
    { name: 'Trial Balance / Income Statement', href: '/admin/reports', icon: BarChart3 },
];

function ActionTile({ b, theme, big }: { b: Btn; theme: Theme; big?: boolean }) {
    const Icon = b.icon;
    return (
        <Link
            href={b.href}
            // Open in a pop-up window (legacy desktop behaviour); a modifier/middle
            // click still opens a normal tab via the href.
            onClick={(e) => {
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                openPopup(b.href);
            }}
            className={`group flex items-center gap-3 rounded-xl border ${theme.tile} ${theme.ring} px-3.5 ${big ? 'py-3' : 'py-2.5'} lg:h-full shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.25)] hover:ring-2`}
        >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                <Icon size={20} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-tight tracking-tight">{b.name}</span>
        </Link>
    );
}

/* ───────────────────────── Right-rail data helpers ───────────────────────── */
function parseExpiry(v: any): Date | null {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
    const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d.getTime()) ? null : d; }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}
// Table dates as DD-MM-YYYY (compact, fully visible); the picker as 14-Apr-2027.
const pad2 = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDmy = (d: Date) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
// Column widths in `ch` (one digit's width in the table font) + cell padding, so
// IDs and dates always fit whatever font/zoom the browser renders with.
const chw = (chars: number) => ({ width: `calc(${chars}ch + 22px)` });
const fmtPicker = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return y && m && d ? `${pad2(d)}-${MONTHS[m - 1]}-${y}` : '—';
};

/* Dense, single-line grid in the legacy style: ~22px rows, cell borders, cream rows. */
const GRID_TABLE = 'w-full table-fixed border-collapse text-left text-[12.5px] leading-tight';
const GRID_TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-r border-slate-300 bg-slate-100 px-2.5 py-1.5 font-bold text-slate-700 last:border-r-0';
const GRID_TD = 'truncate whitespace-nowrap border-b border-r border-[#e6e2c4] px-2.5 py-[5px] last:border-r-0';
const GRID_ROW = 'bg-[#fffde8] hover:bg-[#fff6c2]';
const toInputValue = (d: Date) => d.toISOString().slice(0, 10);
const pid = (p: any) => p.sku || p.product_code || p.id || '—';
const pname = (p: any) => p.product_name || p.name || 'Unnamed';
const pqty = (p: any) => Number(p.total_quantity ?? p.available_quantity ?? p.stock ?? p.quantity_in_stock ?? 0);
const pmin = (p: any) => Number(p.min_count ?? p.min ?? 10);
const pcompany = (p: any) => p.company_name || p.brand || (typeof p.company === 'string' ? p.company : '') || '—';

/* ───────────────────────── Page ───────────────────────── */
export default function AdminDashboard() {
    const [lists, setLists] = useState<{ expiry: any[]; low_stock: any[] }>({ expiry: [], low_stock: [] });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        productService.getDashboardLists()
            .then((d) => { if (!cancelled) setLists({ expiry: d.expiry || [], low_stock: d.low_stock || [] }); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // Default the expiry filter to 6 months out so near-term expiries show by default.
    const defaultBefore = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d; }, []);
    const [before, setBefore] = useState<string>(() => toInputValue(defaultBefore));

    // Expiry rows: one per in-stock batch, already sorted by product name on the
    // server (like legacy); filtered here by the date picker. Each item:
    // { pid, name, qty, exp (ISO string), company }.
    const expiryRows = useMemo(() => {
        const beforeDate = new Date(before); beforeDate.setHours(23, 59, 59, 999);
        return (lists.expiry || [])
            .map((it: any) => ({ it, exp: parseExpiry(it.exp) }))
            .filter((r) => r.exp && r.exp.getTime() <= beforeDate.getTime());
    }, [lists, before]);

    // Low-stock rows. Each item: { pid, name, company, min, qty }.
    const lowStockRows = useMemo(() => (lists.low_stock || []), [lists]);

    return (
        // Desktop: scale the whole dashboard to the window in proportion to the
        // screen (same look on a laptop and a big monitor). Phones keep the
        // normal responsive layout.
        <FitStage width={1440} height={810} minViewport={1024}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white font-sans text-slate-800">
            <style>{"@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@700&display=swap');"}</style>
            <MenuBar />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 md:p-4 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:gap-6 lg:p-5">
                        {/* ─── Left: brand + action grid ─── */}
                        <div className="flex min-h-0 flex-col overflow-hidden">
                            {/* Brand banner in the visiting card's style */}
                            <div className="relative mb-3 flex h-[78px] shrink-0 items-stretch overflow-hidden rounded-2xl bg-gradient-to-r from-[#2B2F8F] to-[#1F2370] shadow-[0_8px_20px_-12px_rgba(31,35,112,0.8)]">
                                <div className="flex w-[190px] shrink-0 items-center justify-center rounded-r-[60px] bg-white pr-4 shadow-[4px_0_0_0_#FFD21F]">
                                    <img src="/brand/aqt-monogram-card.png" alt="Al-Qavi Traders" className="h-[58px] w-auto" />
                                </div>
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-6">
                                    <div className="min-w-0">
                                        <h1 className="text-[28px] font-black leading-none tracking-tight text-white">AL-QAVI TRADER&apos;S</h1>
                                        <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#c9cdf0]">Trade 2.1 · Management Console</p>
                                    </div>
                                    <div className="shrink-0 text-right" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                                        <div className="text-[30px] font-bold leading-[1.15] text-white">القوی ٹریڈرز</div>
                                        <div className="text-[15px] font-bold leading-snug text-[#FFD21F]">کاسمیٹکس ڈیلر گلگت بلتستان</div>
                                    </div>
                                </div>
                            </div>

                            {/* Colour-coded button columns (matches the legacy layout) */}
                            <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4 lg:min-h-0 lg:flex-[4] lg:grid-rows-4 lg:gap-4">
                                {COLUMNS.map((g, gi) => (
                                    <div key={gi} className="flex flex-col gap-3 lg:row-span-3 lg:grid lg:grid-rows-3 lg:gap-4">
                                        {g.buttons.map((b) => (
                                            <ActionTile key={b.name + b.href} b={b} theme={g.theme} />
                                        ))}
                                    </div>
                                ))}
                                {BOTTOM_ROW.map(({ b, theme, span }) => (
                                    <div key={b.name} className={span ? 'col-span-2' : ''}>
                                        <ActionTile b={b} theme={theme} />
                                    </div>
                                ))}
                            </div>

                            {/* Reports row */}
                            <h2 className="mb-2 mt-4 flex shrink-0 items-center gap-2 text-[13px] font-bold uppercase tracking-[0.15em] text-[#2B2F8F]">
                                <BarChart3 size={15} /> Reports
                            </h2>
                            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-[2] lg:grid-cols-3 lg:grid-rows-2 lg:gap-4">
                                {REPORTS.map((b) => (
                                    <ActionTile key={b.name} b={b} theme={THEMES.report} big />
                                ))}
                            </div>
                        </div>

                        {/* ─── Right rail: Expiry + Low stock ─── */}
                        <div className="flex min-h-0 flex-col gap-3 overflow-hidden lg:gap-5">
                            {/* Expiry list */}
                            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#c9cdf0] bg-white shadow-[0_6px_18px_-14px_rgba(31,35,112,0.7)]">
                                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-[#2B2F8F] px-3 py-1.5">
                                    <h3 className="flex items-center gap-2 text-[14px] font-black text-white">
                                        <CalendarClock size={16} /> Expiry List on / Before
                                    </h3>
                                    <label className="relative flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[12.5px] font-semibold tabular-nums text-slate-700 focus-within:border-[#FFD21F] focus-within:ring-2 focus-within:ring-[#FFD21F]/40">
                                        {fmtPicker(before)}
                                        <ChevronDown size={14} className="text-slate-500" />
                                        {/* Native picker sits invisibly on top so the label can show the legacy format. */}
                                        <input
                                            type="date"
                                            value={before}
                                            onChange={(e) => e.target.value && setBefore(e.target.value)}
                                            onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* older browsers */ } }}
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                            aria-label="Expiry on or before"
                                        />
                                    </label>
                                </div>
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <table className={GRID_TABLE}>
                                        <colgroup>
                                            <col style={chw(5.5)} /><col /><col style={chw(6.5)} /><col style={chw(10.5)} /><col style={{ width: 140 }} />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th className={GRID_TH}>P ID</th>
                                                <th className={GRID_TH}>Product Name</th>
                                                <th className={GRID_TH}>Qty(U)</th>
                                                <th className={GRID_TH}>Exp Date</th>
                                                <th className={GRID_TH}>Company</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                                            ) : expiryRows.length === 0 ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No items expiring on or before this date.</td></tr>
                                            ) : expiryRows.map(({ it, exp }, i) => {
                                                const expired = exp!.getTime() < Date.now();
                                                return (
                                                    <tr key={i} className={GRID_ROW}>
                                                        <td className={`${GRID_TD} tabular-nums text-slate-700`}>{it.pid}</td>
                                                        <td className={`${GRID_TD} text-slate-900`} title={it.name}>{it.name}</td>
                                                        <td className={`${GRID_TD} tabular-nums text-slate-700`}>{it.qty}</td>
                                                        <td className={`${GRID_TD} tabular-nums ${expired ? 'font-semibold text-rose-600' : 'text-slate-700'}`}
                                                            title={expired ? 'Already expired' : undefined}>{fmtDmy(exp!)}</td>
                                                        <td className={`${GRID_TD} text-slate-700`} title={it.company || ''}>{it.company || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-bold text-[#2B2F8F]">
                                    Total Records = {expiryRows.length}
                                </div>
                            </section>

                            {/* Stock minimum range */}
                            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#c9cdf0] bg-white shadow-[0_6px_18px_-14px_rgba(31,35,112,0.7)]">
                                <div className="shrink-0 bg-[#14935C] px-3 py-2">
                                    <h3 className="flex items-center gap-2 text-[14px] font-black text-white">
                                        <Boxes size={16} /> Stock Minimum Range List
                                    </h3>
                                </div>
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <table className={GRID_TABLE}>
                                        <colgroup>
                                            <col style={chw(5.5)} /><col /><col style={{ width: 140 }} /><col style={chw(8.5)} /><col style={chw(5.5)} />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th className={GRID_TH}>P ID</th>
                                                <th className={GRID_TH}>Product Name</th>
                                                <th className={GRID_TH}>Company</th>
                                                <th className={GRID_TH}>Min Limit</th>
                                                <th className={GRID_TH}>Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                                            ) : lowStockRows.length === 0 ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">All stock above minimum. 🎉</td></tr>
                                            ) : lowStockRows.map((it: any, i: number) => (
                                                <tr key={i} className={GRID_ROW}>
                                                    <td className={`${GRID_TD} tabular-nums text-slate-700`}>{it.pid}</td>
                                                    <td className={`${GRID_TD} text-slate-900`} title={it.name}>{it.name}</td>
                                                    <td className={`${GRID_TD} text-slate-700`} title={it.company || ''}>{it.company || '—'}</td>
                                                    <td className={`${GRID_TD} tabular-nums text-slate-700`}>{it.min}</td>
                                                    <td className={`${GRID_TD} tabular-nums ${it.qty <= 0 ? 'font-semibold text-rose-600' : 'text-slate-700'}`}>{it.qty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-bold text-[#2B2F8F]">
                                    Total Records = {lowStockRows.length}
                                </div>
                            </section>
                        </div>
                    </div>
        </div>
        </FitStage>
    );
}
