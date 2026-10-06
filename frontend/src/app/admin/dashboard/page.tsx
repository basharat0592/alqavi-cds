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
    Package, Boxes, CalendarClock, ShoppingCart, ScanLine, History, RefreshCcw,
    TrendingUp, RotateCcw, ClipboardList, CreditCard, ArrowDownLeft, ArrowUpRight,
    BookOpen, Database, KeyRound, Receipt, Wallet, BarChart3, FileText, Users,
    ChevronDown,
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { useAdminDashboard } from '@/hooks';

/* ───────────────────────── Top menu bar (File / Product / …) ───────────────────────── */
type MenuLink = { label: string; href?: string; action?: 'logout' };
type Menu = { title: string; items: MenuLink[] };

const MENUS: Menu[] = [
    { title: 'File', items: [
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: 'Full Admin View', href: '/admin/products' },
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
        { label: 'Sale (POS)', href: '/admin/sale' },
        { label: 'Sale Records', href: '/admin/sales' },
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
        { label: "AL-QAVI TRADER'S — Trade 2.1", href: '/admin/dashboard' },
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
        if (it.href) router.push(it.href);
    };
    return (
        <div ref={ref} className="relative z-30 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/90 px-2 py-1 backdrop-blur">
            {MENUS.map((m) => (
                <div key={m.title} className="relative">
                    <button
                        type="button"
                        onClick={() => setOpen(open === m.title ? null : m.title)}
                        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${open === m.title ? 'bg-[#7A1420] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                        {m.title}
                        <ChevronDown size={13} className={`transition-transform ${open === m.title ? 'rotate-180' : ''}`} />
                    </button>
                    {open === m.title && (
                        <div className="absolute left-0 top-full mt-1 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-150">
                            {m.items.map((it) => (
                                <button
                                    key={it.label}
                                    type="button"
                                    onClick={() => go(it)}
                                    className="block w-full px-4 py-2 text-left text-[13px] font-medium text-slate-600 hover:bg-[#7A1420]/5 hover:text-[#7A1420]"
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

const THEMES: Record<string, Theme> = {
    product: { tile: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900', icon: 'bg-amber-500 text-white', ring: 'hover:ring-amber-300' },
    purchase: { tile: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-900', icon: 'bg-yellow-500 text-white', ring: 'hover:ring-yellow-300' },
    sale: { tile: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900', icon: 'bg-emerald-500 text-white', ring: 'hover:ring-emerald-300' },
    account: { tile: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-900', icon: 'bg-cyan-500 text-white', ring: 'hover:ring-cyan-300' },
    report: { tile: 'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900', icon: 'bg-sky-600 text-white', ring: 'hover:ring-sky-300' },
};

const COLUMNS: Group[] = [
    { theme: THEMES.product, buttons: [
        { name: 'Product Detail', href: '/admin/products', icon: Package },
        { name: 'Stock', href: '/admin/inventory/list', icon: Boxes },
        { name: 'Update Rates / Expiry', href: '/admin/products', icon: CalendarClock },
        { name: 'Backup Database', href: '/admin/settings', icon: Database },
    ] },
    { theme: THEMES.purchase, buttons: [
        { name: 'Purchase', href: '/admin/purchases/add', icon: ShoppingCart },
        { name: 'Purchase Order', href: '/admin/purchases', icon: ClipboardList },
        { name: 'Purchase Return', href: '/admin/purchases/returns', icon: RefreshCcw },
        { name: 'Change Password', href: '/admin/settings', icon: KeyRound },
    ] },
    { theme: THEMES.sale, buttons: [
        { name: 'Sale', href: '/admin/sale', icon: ScanLine },
        { name: 'Sale Records', href: '/admin/sales', icon: TrendingUp },
        { name: 'Sale Return', href: '/admin/sale-returns', icon: RotateCcw },
        { name: 'Orders', href: '/admin/orders', icon: History },
    ] },
    { theme: THEMES.account, buttons: [
        { name: 'Chart of Account', href: '/admin/payments', icon: BookOpen },
        { name: 'Receipt Voucher', href: '/admin/income', icon: ArrowDownLeft },
        { name: 'Payment Voucher', href: '/admin/payments', icon: Wallet },
        { name: 'Expense Voucher', href: '/admin/expense', icon: ArrowUpRight },
    ] },
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
            className={`group flex items-center gap-3 rounded-xl border ${theme.tile} ${theme.ring} px-3.5 ${big ? 'py-3.5' : 'py-3'} shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.25)] hover:ring-2`}
        >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.icon} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                <Icon size={18} strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-tight tracking-tight">{b.name}</span>
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
const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const toInputValue = (d: Date) => d.toISOString().slice(0, 10);
const pid = (p: any) => p.sku || p.product_code || p.id || '—';
const pname = (p: any) => p.product_name || p.name || 'Unnamed';
const pqty = (p: any) => Number(p.total_quantity ?? p.available_quantity ?? p.stock ?? p.quantity_in_stock ?? 0);
const pmin = (p: any) => Number(p.min_count ?? p.min ?? 10);
const pcompany = (p: any) => p.company_name || p.brand || (typeof p.company === 'string' ? p.company : '') || '—';

/* ───────────────────────── Page ───────────────────────── */
export default function AdminDashboard() {
    const { products, lowStock: serverLowStock, loading } = useAdminDashboard();

    // Default the expiry filter to 6 months out so near-term expiries show by default.
    const defaultBefore = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d; }, []);
    const [before, setBefore] = useState<string>(() => toInputValue(defaultBefore));

    const expiryRows = useMemo(() => {
        const beforeDate = new Date(before); beforeDate.setHours(23, 59, 59, 999);
        return (products || [])
            .map((p: any) => ({ p, exp: parseExpiry(p.expiry_date) }))
            .filter((r) => r.exp && r.exp.getTime() <= beforeDate.getTime())
            .sort((a, b) => a.exp!.getTime() - b.exp!.getTime());
    }, [products, before]);

    const lowStockRows = useMemo(() => {
        if (Array.isArray(serverLowStock) && serverLowStock.length > 0) {
            return serverLowStock
                .map((p: any) => ({ p, qty: Number(p.qty ?? pqty(p)), min: Number(p.min ?? pmin(p)) }))
                .sort((a, b) => a.qty - b.qty);
        }
        return (products || [])
            .map((p: any) => ({ p, qty: pqty(p), min: pmin(p) }))
            .filter((r) => r.qty <= r.min)
            .sort((a, b) => a.qty - b.qty);
    }, [serverLowStock, products]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-50 to-slate-100 font-sans text-slate-800">
            <div className="mx-auto max-w-[1500px] px-3 py-3 md:px-6 md:py-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
                    <MenuBar />

                    <div className="grid grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-[1fr_440px]">
                        {/* ─── Left: brand + action grid ─── */}
                        <div>
                            <div className="mb-5 flex items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7A1420] to-[#C0392B] text-lg font-black text-white shadow-md">AQ</span>
                                <div>
                                    <h1 className="bg-gradient-to-r from-[#7A1420] to-[#C0392B] bg-clip-text text-[30px] font-black leading-none tracking-tight text-transparent md:text-[38px]">
                                        AL-QAVI TRADER&apos;S
                                    </h1>
                                    <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trade 2.1 · Management Console</p>
                                </div>
                            </div>

                            {/* Colour-coded button columns (matches the legacy layout) */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {COLUMNS.map((g, gi) => (
                                    <div key={gi} className="flex flex-col gap-3">
                                        {g.buttons.map((b) => (
                                            <ActionTile key={b.name + b.href} b={b} theme={g.theme} />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Reports row */}
                            <h2 className="mb-3 mt-6 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                <BarChart3 size={15} /> Reports
                            </h2>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {REPORTS.map((b) => (
                                    <ActionTile key={b.name} b={b} theme={THEMES.report} big />
                                ))}
                            </div>
                        </div>

                        {/* ─── Right rail: Expiry + Low stock ─── */}
                        <div className="flex flex-col gap-5">
                            {/* Expiry list */}
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-rose-50/60 px-4 py-3">
                                    <h3 className="flex items-center gap-2 text-[15px] font-black text-rose-700">
                                        <CalendarClock size={17} /> Expiry List on / Before
                                    </h3>
                                    <input
                                        type="date"
                                        value={before}
                                        onChange={(e) => setBefore(e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                                    />
                                </div>
                                <div className="max-h-[340px] overflow-auto">
                                    <table className="w-full text-left text-[12px]">
                                        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 font-bold">P ID</th>
                                                <th className="px-3 py-2 font-bold">Product</th>
                                                <th className="px-3 py-2 text-right font-bold">Qty</th>
                                                <th className="px-3 py-2 font-bold">Exp Date</th>
                                                <th className="px-3 py-2 font-bold">Company</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                                            ) : expiryRows.length === 0 ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No items expiring on or before this date.</td></tr>
                                            ) : expiryRows.map(({ p, exp }, i) => {
                                                const soon = exp!.getTime() <= Date.now() + 30 * 86400000;
                                                return (
                                                    <tr key={i} className="hover:bg-rose-50/40">
                                                        <td className="px-3 py-1.5 font-mono text-slate-500">{pid(p)}</td>
                                                        <td className="px-3 py-1.5 font-medium text-slate-800">{pname(p)}</td>
                                                        <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{pqty(p)}</td>
                                                        <td className={`px-3 py-1.5 font-semibold ${soon ? 'text-rose-600' : 'text-slate-600'}`}>{fmtDate(exp!)}</td>
                                                        <td className="px-3 py-1.5 text-slate-500">{pcompany(p)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[12px] font-bold text-slate-600">
                                    Total Records = {expiryRows.length}
                                </div>
                            </section>

                            {/* Stock minimum range */}
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="border-b border-slate-100 bg-amber-50/60 px-4 py-3">
                                    <h3 className="flex items-center gap-2 text-[15px] font-black text-amber-700">
                                        <Boxes size={17} /> Stock Minimum Range List
                                    </h3>
                                </div>
                                <div className="max-h-[320px] overflow-auto">
                                    <table className="w-full text-left text-[12px]">
                                        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 font-bold">P ID</th>
                                                <th className="px-3 py-2 font-bold">Product</th>
                                                <th className="px-3 py-2 font-bold">Company</th>
                                                <th className="px-3 py-2 text-right font-bold">Min</th>
                                                <th className="px-3 py-2 text-right font-bold">Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {loading ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
                                            ) : lowStockRows.length === 0 ? (
                                                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">All stock above minimum. 🎉</td></tr>
                                            ) : lowStockRows.map(({ p, qty, min }, i) => (
                                                <tr key={i} className="hover:bg-amber-50/40">
                                                    <td className="px-3 py-1.5 font-mono text-slate-500">{pid(p)}</td>
                                                    <td className="px-3 py-1.5 font-medium text-slate-800">{pname(p)}</td>
                                                    <td className="px-3 py-1.5 text-slate-500">{pcompany(p)}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">{min}</td>
                                                    <td className={`px-3 py-1.5 text-right font-bold tabular-nums ${qty <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>{qty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[12px] font-bold text-slate-600">
                                    Total Records = {lowStockRows.length}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
