"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
    Package, TrendingUp, Tag,
    Boxes, ChevronRight, Settings, UserCheck,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    Truck, Book, AlertTriangle, Globe,
    ScanLine, Receipt, Landmark, ClipboardList, PackagePlus, Warehouse, Building2
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks';

interface PageButton {
    name: string;
    desc?: string;
    href: string;
    icon: any;
    theme?: {
        border: string;
        iconBg: string;
        leftBar: string;
        chevron: string;
        hoverGlow: string;
    };
    keywords: string[];
}

interface GroupSection {
    title: string;
    items: Omit<PageButton, 'theme'>[];
}

export default function AdminDashboard() {
    const { stats, products, loading } = useAdminDashboard();

    // ── CORE OPERATIONS & KEY PAGES (PROMINENT BUTTONS) ──
    const corePages: PageButton[] = [
        {
            name: 'Point of Sale (POS)',
            desc: 'Sell at the counter',
            href: '/admin/sale',
            icon: ScanLine,
            theme: {
                border: 'hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
            },
            keywords: ['counter', 'cashier', 'barcode', 'checkout', 'pos', 'sales']
        },
        {
            name: 'New Purchase Order',
            desc: 'Restock your inventory',
            href: '/admin/purchases/add',
            icon: ShoppingCart,
            theme: {
                border: 'hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['draft', 'buy', 'stock order', 'procurement', 'purchase']
        },
        {
            name: 'Purchase Returns',
            desc: 'Return to supplier',
            href: '/admin/purchases/returns',
            icon: RefreshCcw,
            theme: {
                border: 'hover:border-lime-500',
                iconBg: 'bg-lime-50 border-lime-100 text-lime-700 group-hover:bg-lime-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(101,163,13,0.2)]',
                leftBar: 'bg-lime-600',
                chevron: 'text-lime-500 group-hover:text-lime-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(101,163,13,0.06)]'
            },
            keywords: ['refunds', 'damaged', 'shipback', 'purchase returns']
        },
        {
            name: 'Invoices',
            desc: 'Billing & receipts',
            href: '/admin/invoices',
            icon: Receipt,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['billing', 'receipts', 'print', 'invoice']
        },
        {
            name: 'Reports Center',
            desc: 'Analytics & insights',
            href: '/admin/reports',
            icon: BarChart3,
            theme: {
                border: 'hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['hub', 'audits', 'graphs', 'reports']
        },
        {
            name: 'Accounting & Finance',
            desc: 'Ledgers & cashflow',
            href: '/admin/reports/accounting',
            icon: Landmark,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(14,165,233,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(14,165,233,0.06)]'
            },
            keywords: ['p&l', 'cashflow', 'tax', 'finance', 'ledger']
        },
        {
            name: 'Order List',
            desc: 'Manage online orders',
            href: '/admin/orders',
            icon: ClipboardList,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['orders', 'shipping', 'list']
        },
        {
            name: 'Sale Returns',
            desc: 'Customer refunds',
            href: '/admin/sale-returns',
            icon: RotateCcw,
            theme: {
                border: 'hover:border-fuchsia-500',
                iconBg: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(192,38,211,0.2)]',
                leftBar: 'bg-fuchsia-600',
                chevron: 'text-fuchsia-400 group-hover:text-fuchsia-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(192,38,211,0.06)]'
            },
            keywords: ['returns', 'refunds', 'customer returns', 'sale returns']
        },
        {
            name: 'Product List',
            desc: 'Catalog & SKUs',
            href: '/admin/products',
            icon: Package,
            theme: {
                border: 'hover:border-teal-500',
                iconBg: 'bg-teal-50 border-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)]',
                leftBar: 'bg-teal-600',
                chevron: 'text-teal-400 group-hover:text-teal-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(20,184,166,0.06)]'
            },
            keywords: ['items', 'catalog', 'skus', 'edit']
        },
        {
            name: 'Add Product',
            desc: 'Create a new item',
            href: '/admin/products/add',
            icon: PackagePlus,
            theme: {
                border: 'hover:border-green-500',
                iconBg: 'bg-green-50 border-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(22,163,74,0.2)]',
                leftBar: 'bg-green-600',
                chevron: 'text-green-400 group-hover:text-green-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(22,163,74,0.06)]'
            },
            keywords: ['create', 'new item', 'upload', 'add product']
        },
        {
            name: 'Current Stocks',
            desc: 'Live stock levels',
            href: '/admin/inventory/list',
            icon: Boxes,
            theme: {
                border: 'hover:border-orange-500',
                iconBg: 'bg-orange-50 border-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(234,88,12,0.2)]',
                leftBar: 'bg-orange-600',
                chevron: 'text-orange-400 group-hover:text-orange-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(234,88,12,0.06)]'
            },
            keywords: ['volumes', 'quantities', 'adjustments', 'stock', 'inventory']
        },
        {
            name: 'Warehouses',
            desc: 'Storage locations',
            href: '/admin/inventory/warehouses',
            icon: Warehouse,
            theme: {
                border: 'hover:border-stone-500',
                iconBg: 'bg-stone-100 border-stone-200 text-stone-600 group-hover:bg-stone-700 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(87,83,78,0.2)]',
                leftBar: 'bg-stone-700',
                chevron: 'text-stone-400 group-hover:text-stone-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(87,83,78,0.06)]'
            },
            keywords: ['storage', 'depots', 'distribution', 'warehouse']
        },
        {
            name: 'Order Tracking',
            desc: 'Delivery & dispatch',
            href: '/admin/tracking',
            icon: Truck,
            theme: {
                border: 'hover:border-blue-500',
                iconBg: 'bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(37,99,235,0.2)]',
                leftBar: 'bg-blue-600',
                chevron: 'text-blue-400 group-hover:text-blue-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(37,99,235,0.06)]'
            },
            keywords: ['delivery', 'courier', 'dispatch', 'tracking']
        },
        {
            name: 'Supplier Registry',
            desc: 'Vendors & contacts',
            href: '/admin/company/suppliers',
            icon: Building2,
            theme: {
                border: 'hover:border-purple-500',
                iconBg: 'bg-purple-50 border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(147,51,234,0.2)]',
                leftBar: 'bg-purple-600',
                chevron: 'text-purple-400 group-hover:text-purple-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(147,51,234,0.06)]'
            },
            keywords: ['vendors', 'manufacturers', 'contacts', 'supplier']
        },
        {
            name: 'Customer Registry',
            desc: 'Clients & profiles',
            href: '/admin/company/customers',
            icon: Users,
            theme: {
                border: 'hover:border-pink-500',
                iconBg: 'bg-pink-50 border-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(219,39,119,0.2)]',
                leftBar: 'bg-pink-600',
                chevron: 'text-pink-400 group-hover:text-pink-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(219,39,119,0.06)]'
            },
            keywords: ['clients', 'profiles', 'ledger', 'customer']
        },
        {
            name: 'System Alerts',
            desc: 'Errors & warnings',
            href: '/admin/alerts',
            icon: AlertTriangle,
            theme: {
                border: 'hover:border-red-500',
                iconBg: 'bg-red-50 border-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(220,38,38,0.2)]',
                leftBar: 'bg-red-600',
                chevron: 'text-red-400 group-hover:text-red-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(220,38,38,0.06)]'
            },
            keywords: ['errors', 'warnings', 'alarms', 'alerts']
        },
        {
            name: 'Website CMS',
            desc: 'Storefront content & banners',
            href: '/admin/website-settings',
            icon: Globe,
            theme: {
                border: 'hover:border-cyan-500',
                iconBg: 'bg-cyan-50 border-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(6,182,212,0.2)]',
                leftBar: 'bg-cyan-600',
                chevron: 'text-cyan-400 group-hover:text-cyan-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(6,182,212,0.06)]'
            },
            keywords: ['slider', 'banners', 'content', 'seo', 'footer', 'cms', 'website', 'storefront', 'landing']
        },
        {
            name: 'System Settings',
            desc: 'Configure the system',
            href: '/admin/settings',
            icon: Settings,
            theme: {
                border: 'hover:border-slate-500',
                iconBg: 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-slate-700 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(71,85,105,0.2)]',
                leftBar: 'bg-slate-700',
                chevron: 'text-slate-400 group-hover:text-slate-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(71,85,105,0.06)]'
            },
            keywords: ['config', 'sidebar', 'site details', 'settings', 'configure']
        },
    ];

    // ── UTILITIES & LESS FREQUENT PAGES (SIMPLE LIST LINKS) ──
    const utilitySections: GroupSection[] = [
        {
            title: 'Sales & Orders',
            items: [
                { name: 'Sales History', href: '/admin/sales', icon: TrendingUp, keywords: ['sales list', 'transactions', 'revenue ledger'] },
                { name: 'Activity Logs', href: '/admin/sales/recent', icon: Activity, keywords: ['audit', 'logs', 'actions', 'history'] },
                { name: 'Order Tracking', href: '/admin/tracking', icon: Truck, keywords: ['delivery', 'courier', 'dispatch'] },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw, keywords: ['returns', 'refunds', 'customer returns'] },
            ]
        },
        {
            title: 'Inventory & Stock',
            items: [
                { name: 'Add Product', href: '/admin/products/add', icon: PlusIcon, keywords: ['create', 'new item', 'upload'] },
                { name: 'Product Categories', href: '/admin/products/categories', icon: Tag, keywords: ['taxonomies', 'groups', 'labels'] },
                { name: 'Product Sections', href: '/admin/products/sections', icon: ListFilter, keywords: ['blocks', 'sliders', 'banners'] },
                { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes, keywords: ['volumes', 'quantities', 'adjustments'] },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store, keywords: ['storage', 'depots', 'distribution'] },
            ]
        },
        {
            title: 'Purchases & Suppliers',
            items: [
                { name: 'Purchase History', href: '/admin/purchases', icon: History, keywords: ['expenses', 'vendor orders', 'invoices'] },
                { name: 'Supplier Catalog', href: '/admin/supplier-products', icon: Book, keywords: ['prices', 'vendor catalog', 'items'] },
                { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RefreshCcw, keywords: ['refunds', 'damaged', 'shipback'] },
            ]
        },
        {
            title: 'Staff & Security',
            items: [
                { name: 'Supplier Registry', href: '/admin/company/suppliers', icon: UserCheck, keywords: ['vendors', 'manufacturers', 'contacts'] },
                { name: 'Customer Registry', href: '/admin/company/customers', icon: Users, keywords: ['clients', 'profiles', 'ledger'] },
                { name: 'Internal Users', href: '/admin/users', icon: User, keywords: ['staff', 'logins', 'accounts'] },
                { name: 'Staff Roles', href: '/admin/users/roles', icon: ShieldCheck, keywords: ['groups', 'privileges', 'ranks'] },
                { name: 'Permissions', href: '/admin/users/permissions', icon: Lock, keywords: ['rules', 'gates', 'granular'] },
            ]
        },
        {
            title: 'Detailed Reports',
            items: [
                { name: 'Sales Reports', href: '/admin/reports/sales', icon: TrendingUp, keywords: ['revenue', 'growth', 'metrics'] },
                { name: 'Purchase Reports', href: '/admin/reports/purchases', icon: ShoppingCart, keywords: ['costs', 'purchases value'] },
                { name: 'Inventory Reports', href: '/admin/reports/inventory', icon: Boxes, keywords: ['valuation', 'stock level reports'] },
                { name: 'Customer Reports', href: '/admin/reports/customers', icon: Users, keywords: ['balances', 'rankings', 'activity'] },
                { name: 'Returns Reports', href: '/admin/reports/sales-returns', icon: RotateCcw, keywords: ['refunds', 'returns reasons'] },
                { name: 'Data Hub', href: '/admin/reports/data-hub', icon: BarChart3, keywords: ['consolidated grid', 'tables', 'custom reports'] },
            ]
        },
        {
            title: 'CMS & Settings',
            items: [
                { name: 'Website CMS', href: '/admin/website-settings', icon: Monitor, keywords: ['slider', 'banners', 'content', 'seo', 'footer'] },
                { name: 'Company Categories', href: '/admin/company/categories', icon: Tag, keywords: ['company tax categories', 'industry classifications'] },
                { name: 'Global Payments', href: '/admin/payments', icon: CreditCard, keywords: ['payment methods', 'stripe', 'paypal', 'banks'] },
                { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle, keywords: ['errors', 'warnings', 'alarms'] },
                { name: 'System Settings', href: '/admin/settings', icon: Settings, keywords: ['config', 'sidebar visibility', 'site details'] },
            ]
        }
    ];

    function PlusIcon(props: any) {
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
                <path d="M5 12h14" />
                <path d="M12 5v14" />
            </svg>
        );
    }

    // ── REMAINING PAGES (everything not already promoted to Core Operations) ──
    const otherPages = useMemo(() => {
        const coreHrefs = new Set(corePages.map(p => p.href));
        const seen = new Set<string>();
        const out: Omit<PageButton, 'theme'>[] = [];
        utilitySections.forEach(sec => sec.items.forEach(item => {
            if (coreHrefs.has(item.href) || seen.has(item.href)) return;
            seen.add(item.href);
            out.push(item);
        }));
        return out;
    }, []);

    // Low-stock products (at or below each product's own min count threshold)
    const DEFAULT_LOW_STOCK_MIN = 10;
    const lowStock = useMemo(() => {
        return (products || [])
            .map((p: any) => ({
                ...p,
                _qty: Number(p.total_quantity ?? p.available_quantity ?? 0),
                _min: Number(p.min_count ?? DEFAULT_LOW_STOCK_MIN),
            }))
            .filter((p: any) => p._qty <= p._min)
            .sort((a: any, b: any) => a._qty - b._qty)
            .slice(0, 60);
    }, [products]);

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-slate-800 animate-in fade-in duration-300">
            <div className="max-w-[1440px] mx-auto px-0 md:px-8 pt-1 md:pt-4">
                <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-stretch">

                {/* ── MAIN: DIRECTORY ── */}
                <div className="flex-1 min-w-0 space-y-12 animate-in fade-in duration-300 text-left">

                        {/* ── CORE OPERATIONS & KEY PAGES (PROMINENT ACCENT BUTTON-CARDS) ── */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                                {corePages.map((btn) => {
                                    const Icon = btn.icon;
                                    const isOrders = btn.href === '/admin/orders';
                                    const theme = btn.theme;
                                    return (
                                        <Link
                                            key={btn.href}
                                            href={btn.href}
                                            className="group relative flex items-center gap-2 sm:gap-3.5 overflow-hidden rounded-lg sm:rounded-xl border border-slate-200/80 bg-white px-2.5 sm:px-3.5 py-2 sm:py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(15,23,42,0.18)] transition-all duration-200"
                                        >
                                            <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border ring-1 ring-inset ring-white/40 transition-all duration-200 shrink-0 ${theme?.iconBg || 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                <Icon strokeWidth={1.75} className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform duration-200 group-hover:scale-110" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-[11px] sm:text-[13px] font-semibold text-slate-900 tracking-tight leading-tight line-clamp-2">
                                                    {btn.name}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isOrders && stats?.pendingOrders > 0 && (
                                                    <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm shadow-rose-600/30 select-none tabular-nums">
                                                        <span className="absolute inset-0 rounded-full bg-rose-500 opacity-40 motion-safe:animate-ping" style={{ animationDuration: '2.5s' }} />
                                                        <span className="relative">{stats.pendingOrders}</span>
                                                    </span>
                                                )}
                                                <ChevronRight className={`w-3.5 h-3.5 sm:w-[15px] sm:h-[15px] text-slate-300 group-hover:translate-x-0.5 transition-all ${theme?.chevron || 'group-hover:text-indigo-600'}`} />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: LOW STOCK ALERT ── */}
                    <aside className="w-full xl:w-[340px] shrink-0">
                        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col xl:h-full">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">Low Stock Alert</h3>
                                        <p className="text-[10.5px] text-slate-400 font-medium">At or below each product's min count</p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full shrink-0">{lowStock.length}</span>
                            </div>

                            <div className="flex items-center px-5 py-2 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                                <span className="flex-1">Product</span>
                                <span className="w-12 text-right">Qty</span>
                                <span className="w-12 text-right">Min</span>
                            </div>

                            <div className="flex-1 max-h-[calc(100vh-150px)] overflow-y-auto divide-y divide-slate-50">
                                {loading ? (
                                    <div className="px-5 py-10 text-center text-[12px] text-slate-400">Loading…</div>
                                ) : lowStock.length === 0 ? (
                                    <div className="px-5 py-10 text-center text-[12px] text-slate-400">
                                        <ShieldCheck size={20} className="mx-auto mb-2 text-emerald-500" />
                                        All products are well stocked.
                                    </div>
                                ) : (
                                    lowStock.map((p: any) => {
                                        // Clicking a low-stock product opens the New Purchase page
                                        // pre-filled with its last supplier + the product itself.
                                        const params = new URLSearchParams();
                                        if (p.supplier) params.set('supplier', String(p.supplier));
                                        if (p.sku) params.set('sku', String(p.sku));
                                        const pName = p.product_name || p.name || '';
                                        if (pName) params.set('product_name', pName);
                                        const qs = params.toString();
                                        return (
                                            <Link
                                                key={p.id}
                                                href={`/admin/purchases/add${qs ? `?${qs}` : ''}`}
                                                className="group flex items-center px-5 py-2.5 hover:bg-slate-50 transition-colors"
                                            >
                                                <span className="flex-1 min-w-0 truncate pr-2 text-[12px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                                                    {pName || 'Unnamed product'}
                                                </span>
                                                <span className={`w-12 text-right text-[12.5px] font-black tabular-nums ${p._qty <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                                    {p._qty}
                                                </span>
                                                <span className="w-12 text-right text-[12px] font-semibold text-slate-400 tabular-nums">{p._min}</span>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>

                            <Link
                                href="/admin/inventory/list"
                                className="flex items-center justify-center gap-1.5 px-5 py-3 text-[11.5px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 border-t border-slate-100 transition-colors"
                            >
                                View full inventory <ChevronRight size={13} />
                            </Link>
                        </div>
                    </aside>
                </div>

                {/* ── OTHER PAGES (FULL WIDTH) ── */}
                <div className="mt-10 border-t border-slate-200/70 pt-8 space-y-5">
                    <div className="flex items-center gap-3 select-none">
                        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">Other Pages</h2>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{otherPages.length}</span>
                        <div className="h-px flex-1 bg-slate-200/70" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-1">
                        {otherPages.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center justify-between py-2 px-2.5 rounded-lg group/link transition-colors duration-200"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-md bg-slate-50 text-slate-400 group-hover/link:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
                                            <ItemIcon size={13} className="transition-colors shrink-0" />
                                        </div>
                                        <span className="text-[12.5px] font-semibold text-slate-600 group-hover/link:text-slate-900 transition-colors truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                    <ChevronRight size={12} className="text-slate-300 group-hover/link:text-indigo-600 transition-all opacity-0 group-hover/link:opacity-100 transform group-hover/link:translate-x-0.5 shrink-0" />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
