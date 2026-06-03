"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    LayoutDashboard, Package, TrendingUp, Tag,
    Boxes, ChevronRight, Settings, UserCheck, ShoppingBag,
    Activity, ListFilter, ShoppingCart, History, RefreshCcw, Monitor,
    ShieldCheck, Lock, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    Truck, Book, FileText, AlertTriangle, Search, Star
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks';
import { PageHeader, Card } from '@/components/admin/ui';

interface PageButton {
    name: string;
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

export default function OverviewPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { stats } = useAdminDashboard();

    // ── CORE OPERATIONS & KEY PAGES (PROMINENT BUTTONS) ──
    const corePages: PageButton[] = [
        {
            name: 'Point of Sale (POS)',
            href: '/admin/sale',
            icon: Monitor,
            theme: {
                border: 'group-hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
            },
            keywords: ['counter', 'cashier', 'barcode', 'checkout', 'pos', 'sales']
        },
        {
            name: 'New Purchase Order',
            href: '/admin/purchases/add',
            icon: ShoppingCart,
            theme: {
                border: 'group-hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['draft', 'buy', 'stock order', 'procurement', 'purchase']
        },
        {
            name: 'Sales Invoices',
            href: '/admin/invoices',
            icon: FileText,
            theme: {
                border: 'group-hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
            },
            keywords: ['billing', 'receipts', 'print', 'invoice']
        },
        {
            name: 'Reports Center',
            href: '/admin/reports',
            icon: BarChart3,
            theme: {
                border: 'group-hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-650 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['hub', 'audits', 'graphs', 'reports']
        },
        {
            name: 'Accounting & Finance',
            href: '/admin/reports/accounting',
            icon: CreditCard,
            theme: {
                border: 'group-hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(14,165,233,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(14,165,233,0.06)]'
            },
            keywords: ['p&l', 'cashflow', 'tax', 'finance', 'ledger']
        },
        {
            name: 'Console Dashboard',
            href: '/admin/dashboard',
            icon: LayoutDashboard,
            theme: {
                border: 'group-hover:border-fuchsia-500',
                iconBg: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(217,70,239,0.2)]',
                leftBar: 'bg-fuchsia-600',
                chevron: 'text-fuchsia-400 group-hover:text-fuchsia-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(217,70,239,0.06)]'
            },
            keywords: ['stats', 'sales', 'live', 'dashboard']
        },
        {
            name: 'Order List',
            href: '/admin/orders',
            icon: ShoppingBag,
            theme: {
                border: 'group-hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['orders', 'shipping', 'list']
        },
        {
            name: 'Product List',
            href: '/admin/products',
            icon: Package,
            theme: {
                border: 'group-hover:border-teal-500',
                iconBg: 'bg-teal-50 border-teal-100 text-teal-650 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)]',
                leftBar: 'bg-teal-600',
                chevron: 'text-teal-400 group-hover:text-teal-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(20,184,166,0.06)]'
            },
            keywords: ['items', 'catalog', 'skus', 'edit']
        },
    ];

    const getButtonTheme = (href: string) => {
        const found = corePages.find(p => p.href === href);
        return found?.theme || {
            border: 'group-hover:border-indigo-500',
            iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
            leftBar: 'bg-indigo-600',
            chevron: 'text-indigo-400 group-hover:text-indigo-600',
            hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
        };
    };

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

    const filteredButtons = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();
        const results: { name: string; href: string; icon: any; category: string }[] = [];

        // Search in core pages
        corePages.forEach(item => {
            if (item.name.toLowerCase().includes(q) || item.keywords.some(k => k.includes(q))) {
                results.push({ name: item.name, href: item.href, icon: item.icon, category: 'Core Operations' });
            }
        });

        // Search in utility sections
        utilitySections.forEach(sec => {
            sec.items.forEach(item => {
                const matches = item.name.toLowerCase().includes(q) ||
                    sec.title.toLowerCase().includes(q) ||
                    item.keywords.some(k => k.includes(q));
                if (matches) {
                    if (!results.some(r => r.href === item.href)) {
                        results.push({
                            name: item.name,
                            href: item.href,
                            icon: item.icon,
                            category: sec.title
                        });
                    }
                }
            });
        });
        return results;
    }, [searchQuery, searchQuery]);

    return (
        <div className="pb-24 text-slate-800 animate-in fade-in duration-300">
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6">

                <PageHeader
                    title="Overview"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Overview' }]}
                />

                {/* ── SMART SEARCH BAR ── */}
                <div className="relative mb-10 max-w-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl border border-slate-200/70">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search for any action or page..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-11 pr-12 bg-white rounded-xl text-[13.5px] text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-400 border border-slate-200/70"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-black text-slate-400 hover:text-indigo-600 px-2 py-1"
                        >
                            CLEAR
                        </button>
                    )}
                </div>

                {/* ── DIRECTORY DISPLAY ── */}
                {filteredButtons !== null ? (
                    /* ── FILTERED BUTTONS GRID ── */
                    <div className="space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Search Results</h2>
                            <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold">{filteredButtons.length}</span>
                        </div>
                        {filteredButtons.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {filteredButtons.map((btn) => {
                                    const Icon = btn.icon;
                                    const theme = getButtonTheme(btn.href);
                                    return (
                                        <Link
                                            key={btn.href}
                                            href={btn.href}
                                            className={`flex items-center gap-3.5 p-4 bg-white border border-slate-200/80 rounded-xl transition-all duration-300 group relative overflow-hidden ${theme.border} ${theme.hoverGlow} hover:-translate-y-0.5 hover:bg-slate-50/30`}
                                        >
                                            <span className={`absolute left-0 top-0 bottom-0 w-[4px] transition-all transform scale-y-0 group-hover:scale-y-100 ${theme.leftBar}`} />
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${theme.iconBg}`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="text-left min-w-0 flex-1 pl-1">
                                                <h3 className="text-[13.5px] font-extrabold text-slate-800 group-hover:text-slate-900 transition-colors truncate flex items-center gap-1.5">
                                                    {btn.name}
                                                    {btn.href === '/admin/orders' && stats?.pendingOrders > 0 && (
                                                        <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 select-none shrink-0 ml-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                                            <span>{stats.pendingOrders}</span>
                                                        </span>
                                                    )}
                                                </h3>
                                                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block truncate">
                                                    {btn.category}
                                                </span>
                                            </div>
                                            <ChevronRight size={13} className={`transition-transform group-hover:translate-x-0.5 shrink-0 ${theme.chevron}`} />
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200/85 rounded-xl p-12 text-center text-slate-400 text-[13px] italic shadow-sm">
                                No matching console pages found.
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── MAIN DIRECTORY SEGMENTED HUB ── */
                    <div className="space-y-12 animate-in fade-in duration-300">

                        {/* ── CORE OPERATIONS & KEY PAGES (PROMINENT ACCENT BUTTON-CARDS) ── */}
                        <div className="space-y-4">
                            <h2 className="text-[12.5px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 border-b border-indigo-100 pb-2.5 select-none">
                                <Star size={14} className="fill-indigo-500 text-indigo-500 animate-pulse" /> Core Operations & Key Pages
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {corePages.map((btn) => {
                                    const Icon = btn.icon;
                                    const theme = btn.theme || getButtonTheme(btn.href);
                                    return (
                                        <Link
                                            key={btn.href}
                                            href={btn.href}
                                            className={`flex items-center gap-3.5 p-4 bg-white border border-slate-200/80 rounded-xl transition-all duration-300 group relative overflow-hidden ${theme.border} ${theme.hoverGlow} hover:-translate-y-0.5 hover:bg-slate-50/30`}
                                        >
                                            {/* Hover Left Accent Bar */}
                                            <span className={`absolute left-0 top-0 bottom-0 w-[4px] transition-all transform scale-y-0 group-hover:scale-y-100 ${theme.leftBar}`} />

                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${theme.iconBg}`}>
                                                <Icon size={16} />
                                            </div>
                                            <span className="text-[13.5px] font-extrabold text-slate-800 group-hover:text-slate-900 transition-colors truncate text-left flex-1 min-w-0 pl-1 flex items-center gap-1.5">
                                                {btn.name}
                                                {btn.href === '/admin/orders' && stats?.pendingOrders > 0 && (
                                                    <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 select-none shrink-0 ml-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                                        <span>{stats.pendingOrders}</span>
                                                    </span>
                                                )}
                                            </span>
                                            <ChevronRight size={13} className={`transition-transform group-hover:translate-x-0.5 shrink-0 ${theme.chevron}`} />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── OTHER UTILITIES & MINOR CHANNELS (COMPACT LIST LINKS AT THE BOTTOM) ── */}
                        <div className="border-t border-slate-200/80 pt-8 space-y-6">
                            <div>
                                <h2 className="text-[14px] font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                    <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
                                    Console Utilities & System Mappings
                                </h2>
                                <p className="text-[11.5px] text-slate-450 mt-0.5">Underlying administrative links, configurations, registry books, and sub-reports.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {utilitySections.map((sec) => (
                                    <Card key={sec.title} className="rounded-xl p-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-shadow duration-300">
                                        <h3 className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3 select-none flex items-center justify-between">
                                            <span>{sec.title}</span>
                                            <span className="text-[9.5px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                {sec.items.length} items
                                            </span>
                                        </h3>
                                        <div className="flex flex-col gap-1">
                                            {sec.items.map((item) => {
                                                const ItemIcon = item.icon;
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 group/link transition-all duration-200"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-6 h-6 rounded bg-slate-50 text-slate-400 group-hover/link:bg-indigo-50 group-hover/link:text-indigo-600 flex items-center justify-center transition-colors">
                                                                <ItemIcon size={12} className="transition-colors shrink-0" />
                                                            </div>
                                                            <span className="text-[12.5px] font-semibold text-slate-650 group-hover/link:text-slate-800 transition-colors truncate">
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <ChevronRight size={11} className="text-slate-300 group-hover/link:text-indigo-600 transition-all opacity-0 group-hover/link:opacity-100 transform group-hover/link:translate-x-0.5 shrink-0" />
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
