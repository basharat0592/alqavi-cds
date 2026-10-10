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
    ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { productService } from '@/lib/api';
import { openPopup } from '@/lib/popup';
import FitStage from '@/components/trade/FitStage';

/* ───────────────────────── Top menu bar (File / Product / …) ───────────────────────── */
// `inPlace` links navigate this window; every other item opens its screen in a
// pop-up window, like the legacy desktop app.
type MenuLink = { label?: string; href?: string; action?: 'logon' | 'logoff' | 'exit' | 'about'; inPlace?: boolean; disabled?: boolean; sub?: boolean; sep?: boolean; children?: MenuLink[] };
type Menu = { title: string; items: MenuLink[] };

// Same menus as the legacy Trade 1.0 console. Screens not built yet are greyed out.
const SEP: MenuLink = { sep: true };
const MENUS: Menu[] = [
    { title: 'File', items: [
        { label: 'Sale Man', href: '/admin/trade/staff' },
        SEP,
        { label: 'Log On', action: 'logon' },
        { label: 'Log Off', action: 'logoff' },
        { label: 'Exit', action: 'exit' },
    ] },
    { title: 'Product', items: [
        { label: 'Companies', href: '/admin/trade/companies' },
        { label: 'Product Category', href: '/admin/trade/product-category' },
        { label: 'Product Detail', href: '/admin/trade/product-detail' },
        SEP,
        { label: 'Purchase Order', href: '/admin/trade/purchase-order' },
        SEP,
        { label: 'Purchase Stock', href: '/admin/trade/purchase' },
        { label: 'Purchase Return', href: '/admin/trade/purchase-return' },
        SEP,
        { label: 'Product Stock Damage', href: '/admin/trade/damage-stock' },
        { label: 'Product Stock Damage Reverse', href: '/admin/trade/damage-reverse' },
        SEP,
        { label: 'Update Rates /  Expiry Date', href: '/admin/trade/update-rates' },
    ] },
    { title: 'Sale', items: [
        { label: 'Sale Invoice', href: '/admin/trade/sale-invoice' },
        { label: 'Sale and Sale Return Records', href: '/admin/trade/sale-records' },
        SEP,
        { label: 'Sale Return', href: '/admin/trade/sale-return' },
    ] },
    { title: 'Accounts', items: [
        { label: 'District', href: '/admin/trade/district' },
        { label: 'Main Area', href: '/admin/trade/main-area' },
        { label: 'Sub Area', href: '/admin/trade/sub-area' },
        { label: 'Accounts 2nd Level', href: '/admin/trade/accounts-2nd-level' },
        { label: 'Accounts 3rd Level', href: '/admin/trade/accounts-3rd-level' },
        { label: 'Chart of Accounts', href: '/admin/trade/chart-of-account' },
        SEP,
        { label: 'Financial Year', href: '/admin/trade/financial-year' },
        SEP,
        { label: 'Opening entries', sub: true, children: [
            { label: 'Opening Stock ( Add )', disabled: true },
            { label: 'Opening Stock ( Less )', disabled: true },
            SEP,
            { label: 'Opening Assets', disabled: true },
            { label: 'Opening Receivable', disabled: true },
            { label: 'Opening Liabilities', disabled: true },
        ] },
        SEP,
        { label: 'Receipt Voucher', href: '/admin/trade/receipt-voucher' },
        SEP,
        { label: 'Payment Voucher', href: '/admin/trade/payment-voucher' },
        SEP,
        { label: 'Expense Voucher', href: '/admin/trade/expense-voucher' },
        SEP,
        { label: 'Short / Excess', disabled: true, sub: true },
        SEP,
        { label: 'Bank', disabled: true, sub: true },
        SEP,
        { label: 'Post Voucher (Manually)', disabled: true },
        { label: 'Forward the Profit and Loss', disabled: true },
    ] },
    { title: 'Setup', items: [
        { label: 'New User', disabled: true },
        { label: 'Change Password', href: '/admin/trade/change-password' },
        SEP,
        { label: 'Backup Data Base', href: '/admin/trade/backup' },
        { label: 'Restore Data Base', disabled: true },
        SEP,
        { label: 'Distribution Setting', disabled: true },
        { label: 'User-Role Permissions', disabled: true },
    ] },
    { title: 'Reports', items: [
        { label: 'Data Reports', href: '/admin/reports' },
    ] },
    { title: 'About', items: [
        { label: 'About Me', action: 'about' },
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
    const [about, setAbout] = useState(false);
    const [flyout, setFlyout] = useState<string | null>(null);   // open sub-menu (Opening entries ›)
    useEffect(() => { setFlyout(null); }, [open]);
    const go = (it: MenuLink) => {
        if (it.disabled || it.sep) return;
        if (it.children) { setFlyout((f) => (f === it.label ? null : it.label!)); return; }
        setOpen(null);
        if (it.action === 'about') { setAbout(true); return; }
        if (it.action === 'logon' || it.action === 'logoff') { authService.logout(); router.push('/login'); return; }
        if (it.action === 'exit') {
            authService.logout();
            window.close();                       // closes when the console was opened as its own window
            setTimeout(() => router.push('/login'), 300);
            return;
        }
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
                        <div className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-slate-100 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-150">
                            {m.items.map((it, i) => (it.sep ? (
                                <div key={`sep${i}`} className="mx-3 my-1 border-t border-slate-200" />
                            ) : (
                                <div key={it.label} className="relative" onMouseEnter={() => setFlyout(it.children ? it.label! : null)}>
                                    <button
                                        type="button"
                                        onClick={() => go(it)}
                                        disabled={it.disabled}
                                        title={it.disabled ? 'Not available yet' : undefined}
                                        className={`flex w-full items-center px-4 py-1.5 text-left text-[14px] font-normal hover:bg-[#2B2F8F]/5 hover:text-[#2B2F8F] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-300 ${flyout === it.label ? 'bg-[#2B2F8F]/10 text-[#2B2F8F]' : 'text-slate-700'}`}
                                    >
                                        <span className="flex-1 whitespace-pre">{it.label}</span>
                                        {it.sub && <ChevronRight size={14} className="shrink-0" />}
                                    </button>
                                    {it.children && flyout === it.label && (
                                        <div className="absolute left-full top-0 z-40 ml-1 w-64 rounded-xl border border-slate-100 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)]">
                                            {it.children.map((c, k) => (c.sep ? (
                                                <div key={`csep${k}`} className="mx-3 my-1 border-t border-slate-200" />
                                            ) : (
                                                <button key={c.label} type="button" onClick={() => go(c)} disabled={c.disabled}
                                                    title={c.disabled ? 'Not available yet' : undefined}
                                                    className="flex w-full items-center px-4 py-1.5 text-left text-[14px] font-normal text-slate-700 hover:bg-[#2B2F8F]/5 hover:text-[#2B2F8F] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-300">
                                                    <span className="flex-1 whitespace-pre">{c.label}</span>
                                                </button>
                                            )))}
                                        </div>
                                    )}
                                </div>
                            )))}
                        </div>
                    )}
                </div>
            ))}
            {about && <AboutBox onClose={() => setAbout(false)} />}
        </div>
    );
}

/* About Me — who the program is for and who to call. */
function AboutBox({ onClose }: { onClose: () => void }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-6" onMouseDown={onClose}>
            <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 bg-[#2B2F8F] px-4 py-2 text-[13px] font-semibold text-white">
                    <span className="flex-1">About AL-QAVI TRADERS</span>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded p-0.5 hover:bg-white/15"><X size={15} /></button>
                </div>
                <div className="flex flex-col items-center gap-2 px-6 py-5 text-center">
                    <img src="/brand/aqt-monogram-card.png" alt="Al-Qavi Traders" className="h-16 w-auto" />
                    <div className="text-[18px] font-bold text-[#1F2370]">AL-QAVI TRADERS</div>
                    <div className="text-[13px] text-slate-600">Trade 1.0 — Distribution Management</div>
                    <div className="text-[13px] text-slate-600">Gilgit-Baltistan · Contact 03138692190</div>
                    <div className="text-[12px] text-slate-400">old.alqavitraders.com</div>
                </div>
                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                    <button type="button" autoFocus onClick={onClose} className="h-8 min-w-[88px] rounded-md border border-[#2B2F8F] bg-[#2B2F8F] px-4 text-[13px] font-semibold text-white hover:bg-[#1F2370]">OK</button>
                </div>
            </div>
        </div>
    );
}

/* ───────────────────────── Action button grid ───────────────────────── */
type Btn = { name: string; href: string; icon: any; disabled?: boolean };
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
        { name: 'Product Detail', href: '/admin/trade/product-detail', icon: Package },
        { name: 'Stock', href: '/admin/trade/purchase', icon: Boxes },
        { name: 'Update Rates / Expiry', href: '/admin/trade/update-rates', icon: CalendarClock },
    ] },
    { theme: THEMES.purchase, buttons: [
        { name: 'Purchase', href: '/admin/trade/purchase', icon: ShoppingCart },
        { name: 'Purchase Order', href: '/admin/trade/purchase-order', icon: ClipboardList },
        { name: 'Purchase Return', href: '/admin/trade/purchase-return', icon: RefreshCcw },
    ] },
    { theme: THEMES.sale, buttons: [
        { name: 'Sale', href: '/admin/trade/sale-invoice', icon: ScanLine },
        { name: 'Sale Records', href: '/admin/trade/sale-records', icon: TrendingUp },
        { name: 'Sale Return', href: '/admin/trade/sale-return', icon: RotateCcw },
    ] },
    { theme: THEMES.account, buttons: [
        { name: 'Chart of Account', href: '/admin/trade/chart-of-account', icon: BookOpen },
        { name: 'Receipt Voucher', href: '/admin/trade/receipt-voucher', icon: ArrowDownLeft },
        { name: 'Payment Voucher', href: '/admin/trade/payment-voucher', icon: Wallet },
    ] },
];

/* Bottom row, as in the legacy console: Backup DataBase spans the Product and
   Purchase columns, then Change Password (Sale column) and Expense Voucher. */
const BOTTOM_ROW: { b: Btn; theme: Theme; span?: boolean }[] = [
    { b: { name: 'Backup Database', href: '/admin/trade/backup', icon: Database }, theme: THEMES.backup, span: true },
    { b: { name: 'Change Password', href: '/admin/trade/change-password', icon: KeyRound }, theme: THEMES.sale },
    { b: { name: 'Expense Voucher', href: '/admin/trade/expense-voucher', icon: ArrowUpRight }, theme: THEMES.account },
];

const REPORTS: Btn[] = [
    { name: 'Stock Reports', href: '/admin/reports', icon: Boxes },
    { name: 'Sale & Sale Return Reports', href: '/admin/reports', icon: TrendingUp },
    { name: 'Party Ledger & Recovery Reports', href: '/admin/reports', icon: Users },
    { name: 'Purchase Order / Detail / Return Reports', href: '/admin/reports', icon: FileText },
    { name: 'Sale Statements Reports', href: '/admin/reports', icon: Receipt },
    { name: 'Trial Balance / Income Statement', href: '/admin/reports', icon: BarChart3 },
];

function ActionTile({ b, theme, big, delay = 0 }: { b: Btn; theme: Theme; big?: boolean; delay?: number }) {
    const Icon = b.icon;
    if (b.disabled) {
        // Not built yet — shown greyed out and does nothing.
        return (
            <div aria-disabled="true" title="Not available yet" style={{ animationDelay: `${delay}ms` }}
                className={`aq-tile flex cursor-not-allowed select-none items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-3 ${big ? 'py-2.5' : 'py-2'} lg:h-full text-slate-400 opacity-70`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                    <Icon size={18} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight tracking-tight">{b.name}</span>
            </div>
        );
    }
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
            style={{ animationDelay: `${delay}ms` }}
            className={`aq-tile group flex items-center gap-3 rounded-xl border ${theme.tile} ${theme.ring} px-3 ${big ? 'py-2.5' : 'py-2'} lg:h-full shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.25)] hover:ring-2`}
        >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.icon} shadow-sm transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110`}>
                <Icon size={18} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight tracking-tight">{b.name}</span>
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

/* Dashboard motion: hero entrance, a slow sheen, drifting blobs, staggered tiles. */
const DASH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@700&display=swap');
@keyframes aq-pop { 0% { opacity: 0; transform: scale(.6) rotate(-8deg); } 70% { transform: scale(1.06) rotate(1deg); } 100% { opacity: 1; transform: none; } }
@keyframes aq-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes aq-in-l { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
@keyframes aq-in-r { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes aq-line { from { width: 0; } to { width: 100%; } }
@keyframes aq-sheen { 0%, 70% { transform: translateX(0); } 100% { transform: translateX(450%); } }
@keyframes aq-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, 18px); } }
@keyframes aq-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.aq-mono { animation: aq-pop .8s cubic-bezier(.2,.9,.3,1.2) both, aq-float 5s ease-in-out 1s infinite; }
.aq-rise-l { animation: aq-in-l .7s .15s ease-out both; }
.aq-rise-r { animation: aq-in-r .7s .25s ease-out both; }
.aq-line { animation: aq-line 1s .6s ease-out both; }
.aq-sheen { animation: aq-sheen 7s 1.2s ease-in-out infinite; }
.aq-blob { animation: aq-drift 14s ease-in-out infinite; }
.aq-blob-2 { animation-duration: 18s; animation-direction: reverse; }
.aq-tile { animation: aq-rise .45s ease-out both; }
.aq-hero:hover .aq-mono { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .aq-mono, .aq-rise-l, .aq-rise-r, .aq-line, .aq-sheen, .aq-blob, .aq-tile { animation: none !important; }
  .aq-line { width: 100%; }
}
`;

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
        <div className="flex min-h-full flex-col bg-white font-sans text-slate-800 lg:h-full lg:min-h-0 lg:overflow-hidden">
            <style>{DASH_CSS}</style>
            <MenuBar />

            <div className="grid flex-1 grid-cols-1 gap-4 p-3 md:p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden lg:p-5">
                        {/* ─── Left: brand + action grid ─── */}
                        <div className="flex flex-col lg:min-h-0 lg:overflow-hidden">
                            {/* Brand hero in the visiting card's style */}
                            <div style={{ containerType: 'inline-size' }} className="aq-hero relative mb-3 flex shrink-0 flex-col items-stretch overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2B2F8F] via-[#262a85] to-[#1A1D63] shadow-[0_18px_40px_-20px_rgba(31,35,112,0.9)] sm:flex-row lg:h-[138px]">
                                {/* drifting colour blobs + sheen */}
                                <span aria-hidden className="aq-blob pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#2F8FD8]/35 blur-3xl" />
                                <span aria-hidden className="aq-blob aq-blob-2 pointer-events-none absolute bottom-[-70px] left-[42%] h-44 w-44 rounded-full bg-[#14935C]/35 blur-3xl" />
                                <span aria-hidden className="aq-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                                {/* card's green strip */}
                                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[6px] bg-gradient-to-r from-[#14935C] via-[#1fb070] to-[#14935C]" />

                                <div className="relative z-10 flex shrink-0 items-center justify-center bg-white px-6 py-3 shadow-[5px_0_0_0_#FFD21F] sm:w-[clamp(170px,23cqw,250px)] sm:rounded-r-[90px] sm:py-0 sm:pr-[3cqw]">
                                    <img src="/brand/aqt-monogram-card.png" alt="Al-Qavi Traders" className="aq-mono h-[64px] w-auto sm:h-[clamp(58px,8.6cqw,92px)]" />
                                </div>

                                <div className="relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-3 px-5 py-4 text-center sm:flex-row sm:justify-between sm:gap-[2.5cqw] sm:px-[3cqw] sm:py-0 sm:text-left">
                                    <div className="aq-rise-l min-w-0">
                                        <h1 className="text-[30px] font-black leading-[0.95] tracking-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:whitespace-nowrap sm:text-[clamp(22px,4.1cqw,46px)]">
                                            AL-QAVI <span className="text-[#FFD21F]">TRADER&apos;S</span>
                                        </h1>
                                        <span aria-hidden className="aq-line mt-2 block h-[4px] rounded-full bg-gradient-to-r from-[#FFD21F] via-[#ffe680] to-transparent" />
                                        <p className="mt-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c9cdf0] sm:text-[clamp(8px,1.05cqw,12px)]">Trade 2.1 · Management Console</p>
                                    </div>
                                    <div className="aq-rise-r shrink-0 text-center sm:text-right" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>
                                        <div className="text-[34px] font-bold leading-[1.1] text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:text-[clamp(24px,4.1cqw,46px)]">القوی ٹریڈرز</div>
                                        <div className="mt-1 inline-block rounded-full bg-[#FFD21F] px-4 py-0.5 whitespace-nowrap text-[14px] font-bold leading-snug text-[#1F2370] sm:text-[clamp(11px,1.45cqw,16px)]">کاسمیٹکس ڈیلر گلگت بلتستان</div>
                                    </div>
                                </div>
                            </div>

                            {/* Colour-coded button columns (matches the legacy layout) */}
                            <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4 lg:min-h-0 lg:flex-[4] lg:grid-rows-4 lg:gap-3">
                                {COLUMNS.map((g, gi) => (
                                    <div key={gi} className="flex flex-col gap-3 lg:row-span-3 lg:grid lg:grid-rows-3 lg:gap-3">
                                        {g.buttons.map((b) => (
                                            <ActionTile key={b.name + b.href} b={b} theme={g.theme} delay={gi * 60 + g.buttons.indexOf(b) * 90} />
                                        ))}
                                    </div>
                                ))}
                                {BOTTOM_ROW.map(({ b, theme, span }, bi) => (
                                    <div key={b.name} className={span ? 'col-span-2' : ''}>
                                        <ActionTile b={b} theme={theme} delay={300 + bi * 60} />
                                    </div>
                                ))}
                            </div>

                            {/* Reports row */}
                            <h2 className="mb-1.5 mt-3 flex shrink-0 items-center gap-2 text-[13px] font-bold uppercase tracking-[0.15em] text-[#2B2F8F]">
                                <BarChart3 size={15} /> Reports
                            </h2>
                            <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-[2] lg:grid-cols-3 lg:grid-rows-2 lg:gap-3">
                                {REPORTS.map((b, ri) => (
                                    <ActionTile key={b.name} b={b} theme={THEMES.report} big delay={420 + ri * 50} />
                                ))}
                            </div>
                        </div>

                        {/* ─── Right rail: Expiry + Low stock ─── */}
                        <div className="flex flex-col gap-3 lg:min-h-0 lg:gap-5 lg:overflow-hidden">
                            {/* Expiry list */}
                            <section className="flex h-[380px] flex-col overflow-hidden rounded-xl border lg:h-auto lg:min-h-0 lg:flex-1 border-[#c9cdf0] bg-white shadow-[0_6px_18px_-14px_rgba(31,35,112,0.7)]">
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
                            <section className="flex h-[380px] flex-col overflow-hidden rounded-xl border lg:h-auto lg:min-h-0 lg:flex-1 border-[#c9cdf0] bg-white shadow-[0_6px_18px_-14px_rgba(31,35,112,0.7)]">
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
