'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ChevronRight, AlertTriangle, CalendarDays, ShoppingCart, ArrowRight,
    SlidersHorizontal, TrendingUp, BarChart3, PackageSearch, Repeat, Monitor,
} from 'lucide-react';
import { orderService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   Branch-admin console.

   Palette is deliberately narrow: one brand blue for anything actionable, a
   red only for stock that needs attention, and neutral slate for everything
   else. Cards are white on a cool grey page with a hairline border.
   ─────────────────────────────────────────────────────────────────────────── */
export const BRAND = '#1877C2';
const INK = '#0F1A2B';
const MUTED = '#64748B';
const LINE = '#E7ECF2';

export type DashTile = { name: string; href: string; icon: any; note?: string; badge?: number };

/** Small rounded-square icon chip used on tiles and card headers. */
function IconChip({ icon: Icon, size = 40, tone = 'brand' }: { icon: any; size?: number; tone?: 'brand' | 'red' | 'amber' }) {
    const tones = {
        brand: 'bg-[#E8F2FB] text-[#1877C2]',
        red: 'bg-[#FDECEC] text-[#DC2626]',
        amber: 'bg-[#FEF3E2] text-[#D97706]',
    } as const;
    return (
        <span
            className={`shrink-0 rounded-xl flex items-center justify-center ${tones[tone]}`}
            style={{ width: size, height: size }}
        >
            <Icon size={Math.round(size * 0.45)} strokeWidth={2} />
        </span>
    );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border border-[#E7ECF2] ${className}`}>{children}</div>
    );
}

/** Card header: chip + title/subtitle on the left, anything else on the right. */
function CardHead({ icon, title, subtitle, right }: { icon?: any; title: string; subtitle?: string; right?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 pb-3">
            <div className="flex items-start gap-3 min-w-0">
                {icon && <IconChip icon={icon} size={38} />}
                <div className="min-w-0">
                    <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#0F1A2B] leading-tight">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-[12.5px] text-[#64748B] leading-snug">{subtitle}</p>}
                </div>
            </div>
            {right && <div className="shrink-0">{right}</div>}
        </div>
    );
}

/* ── Quick-action tile ──────────────────────────────────────────────────── */
function Tile({ t }: { t: DashTile }) {
    return (
        <Link
            href={t.href}
            className="group flex items-center gap-3 bg-white rounded-2xl border border-[#E7ECF2] px-3.5 py-3 transition-all hover:border-[#1877C2]/40 hover:shadow-[0_6px_18px_-10px_rgba(24,119,194,0.45)]"
        >
            <IconChip icon={t.icon} size={40} />
            <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#0F1A2B] truncate">{t.name}</span>
                {t.note && <span className="block text-[11.5px] text-[#94A3B8] font-mono truncate">{t.note}</span>}
            </span>
            {t.badge ? (
                <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#1877C2] text-white text-[11.5px] font-bold flex items-center justify-center tabular-nums">
                    {t.badge}
                </span>
            ) : (
                <ChevronRight size={17} className="shrink-0 text-[#CBD5E1] group-hover:text-[#1877C2] transition-colors" />
            )}
        </Link>
    );
}

/* ── Grouped bar chart, drawn directly so it matches the reference exactly ── */
function ProfitBars({ months }: { months: { m: string; profit: number; expenses: number }[] }) {
    const max = Math.max(1, ...months.flatMap(r => [r.profit, r.expenses]));
    return (
        <div className="px-5 pb-2">
            <div className="flex items-end justify-between gap-2 h-[200px]">
                {months.map((r) => {
                    const active = r.profit > 0 || r.expenses > 0;
                    return (
                        <div key={r.m} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                            <div className="flex-1 w-full flex items-end justify-center gap-1.5">
                                {/* A month with no movement shows a dot rather than a
                                    zero-height bar, so the axis stays readable. */}
                                {active ? (
                                    <>
                                        <span
                                            className="w-[9px] rounded-t-[3px] bg-[#0E7C99] transition-all"
                                            style={{ height: `${Math.max(2, (r.profit / max) * 100)}%` }}
                                            title={`Profit ${formatCurrency(r.profit)}`}
                                        />
                                        <span
                                            className="w-[9px] rounded-t-[3px] bg-[#DC2626] transition-all"
                                            style={{ height: `${Math.max(2, (r.expenses / max) * 100)}%` }}
                                            title={`Expenses ${formatCurrency(r.expenses)}`}
                                        />
                                    </>
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#DDE3EA] mb-1" />
                                )}
                            </div>
                            <span className={`text-[11px] font-semibold tracking-wide ${active ? 'text-[#0F1A2B]' : 'text-[#94A3B8]'}`}>
                                {r.m}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-5 pt-4 pb-1">
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" /> Expenses
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <span className="w-2 h-2 rounded-full bg-[#0E7C99]" /> Profit
                </span>
            </div>
        </div>
    );
}

/* ── Right rail: stock that needs attention ─────────────────────────────── */
function StockPanel({ lowStock, duesCount }: { lowStock: any[]; duesCount: number }) {
    const [tab, setTab] = useState<'low' | 'due'>('low');
    const rows = (lowStock || []).slice(0, 4);
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-[#F1F5F9]">
                <button
                    onClick={() => setTab('low')}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[13px] font-bold transition-colors ${tab === 'low' ? 'bg-[#FDECEC] text-[#DC2626]' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
                >
                    <AlertTriangle size={14} /> Low Stock ({lowStock?.length || 0})
                </button>
                <button
                    onClick={() => setTab('due')}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[13px] font-semibold transition-colors ${tab === 'due' ? 'bg-[#E8F2FB] text-[#1877C2]' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}
                >
                    <CalendarDays size={14} /> Payments Due{duesCount ? ` (${duesCount})` : ''}
                </button>
            </div>

            {tab === 'low' ? (
                <>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                        <span>Product</span><span className="text-right">Qty</span><span className="text-right">Min</span>
                    </div>
                    {rows.length === 0 ? (
                        <p className="px-5 py-6 text-[13px] text-[#94A3B8]">Every product is above its reorder point.</p>
                    ) : rows.map((p: any, i: number) => (
                        <div key={p.id ?? i} className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-5 py-3 border-t border-[#F4F7FA]">
                            <div className="min-w-0">
                                <p className="text-[14px] text-[#0F1A2B] truncate">{p.name || p.product_name || 'Unnamed product'}</p>
                                {(p.sku || p.code) && (
                                    <p className="text-[11.5px] text-[#94A3B8] font-mono truncate">{p.sku || p.code}</p>
                                )}
                            </div>
                            <span className="text-[14px] font-bold text-[#DC2626] tabular-nums text-right">
                                {Number(p.qty ?? p.total_quantity ?? 0)}
                            </span>
                            <span className="text-[14px] text-[#64748B] tabular-nums text-right">
                                {Number(p.min_stock ?? p.min ?? 0)}
                            </span>
                        </div>
                    ))}
                    <Link href="/admin/inventory/list" className="flex items-center justify-center gap-1.5 px-5 py-3.5 border-t border-[#F4F7FA] text-[14px] font-semibold text-[#1877C2] hover:bg-[#F8FBFE] transition-colors">
                        View full inventory <ChevronRight size={15} />
                    </Link>
                </>
            ) : (
                <div className="px-5 py-8 text-center">
                    <p className="text-[13.5px] text-[#64748B]">
                        {duesCount ? `${duesCount} sale${duesCount === 1 ? '' : 's'} awaiting settlement.` : 'Nothing outstanding right now.'}
                    </p>
                    <Link href="/admin/payments" className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1877C2] hover:underline">
                        Open payments <ChevronRight size={15} />
                    </Link>
                </div>
            )}
        </Card>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function BranchDashboard({
    stats, recentOrders, lowStock = [], tiles = [], branchName, adminName, loading,
}: {
    stats?: any;
    recentOrders?: any[];
    lowStock?: any[];
    tiles?: DashTile[];
    branchName?: string;
    adminName?: string;
    loading?: boolean;
}) {
    const [months, setMonths] = useState<{ m: string; profit: number; expenses: number }[]>([]);
    const [cats, setCats] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        let off = false;
        orderService.getAnalytics()
            .then((d: any) => {
                if (off) return;
                setMonths((d?.monthly || []).map((r: any) => ({
                    m: String(r.month || '').slice(0, 3).toUpperCase(),
                    profit: Number(r.profit || 0),
                    expenses: Number(r.expenses || 0),
                })));
                setCats((d?.categories || []).map((c: any) => ({ name: c.name, value: Number(c.value || 0) })));
            })
            .catch(() => { if (!off) { setMonths([]); setCats([]); } });
        return () => { off = true; };
    }, []);

    // ── Revenue over the last 7 delivered days ──
    const weekTotal = Number(stats?.totalRevenue || 0);

    // ── Pipeline, from the order statuses actually present ──
    const pipeline = useMemo(() => {
        const list = recentOrders || [];
        const count = (s: string) => list.filter((o: any) => (o.status || '').toUpperCase() === s).length;
        return {
            pending: Number(stats?.pendingOrders ?? count('PENDING')),
            shipped: count('SHIPPED'),
            delivered: Number(stats?.deliveredOrders ?? count('DELIVERED')),
        };
    }, [recentOrders, stats]);

    const duesCount = (recentOrders || []).filter((o: any) => Number(o.remaining_amount ?? 0) > 0).length;

    const catTotal = cats.reduce((s, c) => s + c.value, 0);
    const topCats = cats.slice(0, 3);

    // Shift start is the session the admin signed in on — the only real clock we have.
    const shiftStart = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const raw = sessionStorage.getItem('admin_session_start');
        if (!raw) return null;
        const d = new Date(Number(raw));
        return isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const riskItem = (lowStock || [])[0];

    return (
        <div className="space-y-5">
            {/* ═══ TITLE ROW ═══ */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-[34px] sm:text-[40px] leading-none font-bold tracking-[-0.03em] text-[#0F1A2B]">Dashboard</h1>
                    <p className="mt-2 text-[14.5px] text-[#64748B]">
                        Live operational &amp; inventory analytics{branchName ? ` · ${branchName}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className="hidden sm:inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border border-[#E7ECF2] text-[11.5px] font-bold uppercase tracking-wider text-[#64748B]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1877C2]" /> Terminal Active
                        <span className="font-mono text-[#0F1A2B]">#S01-POS</span>
                    </span>
                    <Link href="/admin/reports" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-white border border-[#E7ECF2] text-[13.5px] font-semibold text-[#0F1A2B] hover:bg-[#F8FAFC] transition-colors">
                        <SlidersHorizontal size={15} /> Filter Period
                    </Link>
                </div>
            </div>

            {/* ═══ QUICK ACTIONS ═══ */}
            {tiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {tiles.map(t => <Tile key={t.href} t={t} />)}
                </div>
            )}

            {/* ═══ MAIN GRID ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
                {/* left two-thirds */}
                <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Revenue */}
                    <Card className="flex flex-col">
                        <div className="flex items-start justify-between gap-3 p-5 pb-3">
                            <div className="flex items-start gap-3 min-w-0">
                                <IconChip icon={TrendingUp} size={38} />
                                <div>
                                    <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#0F1A2B]">Revenue Trend</h3>
                                    <p className="mt-0.5 text-[12.5px] text-[#64748B]">Delivered sales · last 7 days</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[26px] leading-none font-bold tracking-[-0.02em] text-[#0F1A2B] tabular-nums">
                                    {formatCurrency(weekTotal)}
                                </p>
                                <p className="mt-1 text-[11.5px] text-[#94A3B8]">7-day total</p>
                            </div>
                        </div>
                        <div className="mx-5 border-t border-dashed border-[#E2E8F0]" />
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8">
                            <p className="text-[15px] font-bold text-[#0F1A2B]">
                                {weekTotal > 0 ? 'Revenue is being recorded.' : 'No delivered orders in the last 7 days.'}
                            </p>
                            <p className="mt-2 text-[13px] text-[#94A3B8] leading-relaxed max-w-[280px]">
                                Only delivered sales count as revenue — mark orders delivered to see them here.
                            </p>
                        </div>
                        <div className="m-5 mt-0 grid grid-cols-2 gap-3 rounded-xl bg-[#F8FAFC] px-4 py-3">
                            <div>
                                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Audit cycle</p>
                                <p className="mt-0.5 text-[12.5px] font-semibold text-[#0F1A2B]">Weekly</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">Auto-refreshed</p>
                                <p className="mt-0.5 text-[12.5px] font-semibold text-[#0F1A2B]">every 30s</p>
                            </div>
                        </div>
                    </Card>

                    {/* Profitability */}
                    <Card>
                        <CardHead icon={BarChart3} title="Profitability Analysis" subtitle="Gross Profit vs. Expenses (6mo)" />
                        {months.length === 0 ? (
                            <p className="px-5 py-16 text-center text-[13px] text-[#94A3B8]">
                                {loading ? 'Loading…' : 'No profit data for this period yet.'}
                            </p>
                        ) : <ProfitBars months={months} />}
                    </Card>

                    {/* Top categories */}
                    <Card>
                        <CardHead
                            icon={PackageSearch}
                            title="Top Categories"
                            right={<span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">Live Stock</span>}
                        />
                        <div className="px-5 pb-4 space-y-3.5">
                            {topCats.length === 0 ? (
                                <p className="py-6 text-[13px] text-[#94A3B8]">No category sales recorded yet.</p>
                            ) : topCats.map((c) => {
                                const pct = catTotal ? Math.round((c.value / catTotal) * 100) : 0;
                                return (
                                    <div key={c.name}>
                                        <div className="flex items-center justify-between gap-3 mb-1.5">
                                            <span className="text-[13.5px] font-semibold text-[#0F1A2B] truncate">{c.name}</span>
                                            <span className="text-[13.5px] font-bold text-[#0F1A2B] tabular-nums">{pct}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-[#EEF2F6] overflow-hidden">
                                            <div className="h-full rounded-full bg-[#1877C2]" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#F4F7FA]">
                            <span className="text-[12.5px] text-[#94A3B8]">{cats.length} Active Classifications</span>
                            <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1877C2] hover:underline">
                                Manage Categories <ArrowRight size={14} />
                            </Link>
                        </div>
                    </Card>

                    {/* Pipeline */}
                    <Card>
                        <CardHead
                            icon={Repeat}
                            title="Order Pipeline"
                            right={<span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#F1F5F9] text-[11px] font-bold text-[#64748B]">Real-time</span>}
                        />
                        <div className="grid grid-cols-3 gap-3 px-5 pb-4">
                            {[
                                { k: 'Pending', v: pipeline.pending, note: 'Requires POS action', tone: 'text-[#DC2626]' },
                                { k: 'Shipped', v: pipeline.shipped, note: 'In transit', tone: 'text-[#0F1A2B]' },
                                { k: 'Delivered', v: pipeline.delivered, note: 'Past 7 days', tone: 'text-[#0F1A2B]' },
                            ].map(s => (
                                <div key={s.k} className="rounded-xl border border-[#EEF2F6] px-3 py-3.5 text-center">
                                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">{s.k}</p>
                                    <p className="mt-1.5 text-[28px] leading-none font-bold text-[#0F1A2B] tabular-nums">{s.v}</p>
                                    <p className={`mt-1.5 text-[11px] font-semibold ${s.tone}`}>{s.note}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#F4F7FA]">
                            <span className="text-[12.5px] text-[#94A3B8]">Fulfilment Station 01</span>
                            <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1877C2] hover:underline">
                                View Pipeline <ArrowRight size={14} />
                            </Link>
                        </div>
                    </Card>
                </div>

                {/* right rail */}
                <div className="space-y-5">
                    <StockPanel lowStock={lowStock} duesCount={duesCount} />

                    <Card>
                        <div className="flex items-start justify-between gap-3 p-5 pb-3">
                            <div className="flex items-start gap-3">
                                <IconChip icon={AlertTriangle} size={38} tone="red" />
                                <div>
                                    <h3 className="text-[16px] font-bold tracking-[-0.01em] text-[#0F1A2B]">Stock Risk</h3>
                                    <p className="mt-0.5 text-[12.5px] text-[#64748B]">At or below the reorder point</p>
                                </div>
                            </div>
                            <span className="text-[30px] leading-none font-bold text-[#0F1A2B] tabular-nums">{lowStock?.length || 0}</span>
                        </div>
                        {riskItem && (
                            <div className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#FDF7F7] px-3.5 py-3">
                                <span className="flex items-center gap-2 min-w-0">
                                    <AlertTriangle size={14} className="shrink-0 text-[#DC2626]" />
                                    <span className="text-[13.5px] text-[#0F1A2B] truncate">
                                        {riskItem.name || riskItem.product_name}
                                    </span>
                                </span>
                                <span className="shrink-0 flex items-center gap-2">
                                    <span className="text-[11.5px] text-[#94A3B8]">min {Number(riskItem.min_stock ?? riskItem.min ?? 0)}</span>
                                    <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FDECEC] text-[#DC2626] text-[11.5px] font-bold flex items-center justify-center tabular-nums">
                                        {Number(riskItem.qty ?? riskItem.total_quantity ?? 0)}
                                    </span>
                                </span>
                            </div>
                        )}
                        <div className="px-5 pb-5">
                            <Link href="/admin/purchases/add" className="flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1877C2] hover:bg-[#1567AB] text-white text-[14px] font-semibold transition-colors">
                                <ShoppingCart size={16} /> Create Stock Purchase Order
                            </Link>
                        </div>
                    </Card>

                    <Card>
                        <CardHead
                            icon={Monitor}
                            title="Terminal Station"
                            right={<span className="inline-flex items-center h-6 px-2.5 rounded-full bg-[#E7F7EF] text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">Online</span>}
                        />
                        <dl className="px-5 pb-4 divide-y divide-[#F4F7FA]">
                            <div className="flex items-center justify-between gap-3 py-2.5">
                                <dt className="text-[13px] text-[#64748B]">Active Cashier</dt>
                                <dd className="text-[13.5px] font-semibold text-[#0F1A2B] truncate">{adminName || '—'}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 py-2.5">
                                <dt className="text-[13px] text-[#64748B]">Organization</dt>
                                <dd className="text-[13.5px] font-semibold text-[#0F1A2B] truncate">{branchName || '—'}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3 py-2.5">
                                <dt className="text-[13px] text-[#64748B]">Shift Start</dt>
                                <dd className="text-[13.5px] font-semibold text-[#0F1A2B] font-mono">{shiftStart || '—'}</dd>
                            </div>
                        </dl>
                        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                            <Link href="/admin/sale" className="flex items-center justify-center h-10 rounded-xl border border-[#E7ECF2] text-[13.5px] font-semibold text-[#0F1A2B] hover:bg-[#F8FAFC] transition-colors">
                                Open POS
                            </Link>
                            <Link href="/admin/sales" className="flex items-center justify-center h-10 rounded-xl border border-[#E7ECF2] text-[13.5px] font-semibold text-[#0F1A2B] hover:bg-[#F8FAFC] transition-colors">
                                Sales Log
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
