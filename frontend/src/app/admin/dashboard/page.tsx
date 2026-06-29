"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package, TrendingUp,
    Boxes, ChevronRight, Settings, UserCheck,
    ShoppingCart, History, RefreshCcw,
    ShieldCheck, BarChart3, Store, RotateCcw, User, Users, CreditCard,
    Truck, AlertTriangle, Globe,
    ScanLine, Receipt, ClipboardList, PackagePlus,
    ArrowDownLeft, ArrowUpRight, Building2,
    MapPin, Bell, Bike
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks';
import { authService, sidebarVisibilityKey } from '@/lib/auth';
import { SUPER_ADMIN_HIDDEN_HREFS } from '@/lib/adminPages';
import { inventoryService, companyService, supplierService } from '@/lib/api';

// Dashboard cards/links only a Super Admin should see (cross-branch administration).
// Branch admins run day-to-day ops and don't manage branches, staff, roles or
// global config, so these are hidden from their dashboard.
const SUPER_ONLY_HREFS = new Set<string>([
    '/admin/branches',
    '/admin/users',
    '/admin/users/roles',
    '/admin/settings',
    '/admin/website-settings',
    '/admin/inventory/warehouses',
    '/admin/company/areas',
    '/admin/payments',
]);

// For a Branch Admin, only the day-to-day essentials stay as prominent cards; the
// rest drop into the "Other Pages" list. Tweak this set to change what's featured.
const BRANCH_ADMIN_IMPORTANT_HREFS = new Set<string>([
    // Sales & Orders
    '/admin/sale',            // Point of Sale
    '/admin/sales',           // Sales History
    '/admin/invoices',        // Invoices
    '/admin/sale-returns',    // Sale Returns
    '/admin/orders',          // Order List
    '/admin/tracking',        // Order Tracking
    // Purchasing & Inventory
    '/admin/purchases/add',   // New Purchase Order
    '/admin/inventory/list',  // Current Stocks
    '/admin/purchases',       // Purchase History
    '/admin/products',        // Product List
    '/admin/purchases/returns', // Purchase Returns
    '/admin/products/add',    // Add Product
    // Finance & Reports
    '/admin/income',          // Income
    '/admin/expense',         // Expense
    '/admin/reports',         // Reports Center
]);

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
    const { stats, products, lowStock: serverLowStock, loading } = useAdminDashboard();
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    // Pages this user may open (null = full access). Mirrors the sidebar so the
    // dashboard only shows cards for pages the user actually has access to.
    const [userPagePerms, setUserPagePerms] = useState<string[] | null>(null);
    useEffect(() => {
        setIsSuperAdmin(authService.isSuperAdmin());
        const u: any = authService.getUser();
        const role = (typeof u?.role === 'string' ? u.role : u?.role_name || '').toLowerCase();
        if (['admin', 'super admin', 'superadmin'].includes(role) || u?.is_superuser) {
            setUserPagePerms(null); // full access — no page restriction
        } else {
            const perms = u?.page_permissions;
            setUserPagePerms(Array.isArray(perms) && perms.length > 0 ? perms : null);
        }
    }, []);

    // Cross-branch counts for the Super Admin "Business Overview" panel. Branches,
    // customers and suppliers aren't in the dashboard stats payload, so fetch them
    // directly (products & employees come from the dashboard hook). null = still loading.
    const [overviewCounts, setOverviewCounts] = useState<{ branches: number | null; customers: number | null; suppliers: number | null }>({ branches: null, customers: null, suppliers: null });
    useEffect(() => {
        if (!isSuperAdmin) return;
        let cancelled = false;
        const len = (r: any) => (Array.isArray(r) ? r.length : (r?.results?.length ?? r?.count ?? 0));
        (async () => {
            const [wh, cust, sup] = await Promise.all([
                inventoryService.getWarehouses().catch(() => []),
                companyService.getCustomers().catch(() => []),
                supplierService.getAll().catch(() => []),
            ]);
            if (cancelled) return;
            setOverviewCounts({ branches: len(wh), customers: len(cust), suppliers: len(sup) });
        })();
        return () => { cancelled = true; };
    }, [isSuperAdmin]);

    // Sidebar-visibility toggles (System Settings → Sidebar Pages) hide pages here too.
    const [sidebarVisibility, setSidebarVisibility] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const load = () => {
            try { const s = localStorage.getItem(sidebarVisibilityKey()); setSidebarVisibility(s ? JSON.parse(s) : {}); }
            catch { setSidebarVisibility({}); }
        };
        load();
        window.addEventListener('sidebar_visibility_change', load);
        window.addEventListener('storage', load);
        return () => {
            window.removeEventListener('sidebar_visibility_change', load);
            window.removeEventListener('storage', load);
        };
    }, []);

    // A card/link is visible if it's not super-admin-only (or the viewer is a super
    // admin), it isn't an operational page hidden from the super admin, AND it isn't
    // toggled off in the sidebar-visibility settings.
    const canSee = (href: string) =>
        (isSuperAdmin || !SUPER_ONLY_HREFS.has(href)) &&
        !(isSuperAdmin && SUPER_ADMIN_HIDDEN_HREFS.includes(href)) &&
        sidebarVisibility[href] !== false &&
        (userPagePerms === null || userPagePerms.includes(href));

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
            name: 'Income',
            desc: 'Money coming in',
            href: '/admin/income',
            icon: ArrowDownLeft,
            theme: {
                border: 'hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['income', 'money in', 'revenue', 'earnings', 'inbound']
        },
        {
            name: 'Expense',
            desc: 'Money going out',
            href: '/admin/expense',
            icon: ArrowUpRight,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['expense', 'money out', 'spending', 'costs', 'outbound']
        },
        {
            name: 'Sales History',
            desc: 'Past sales & revenue',
            href: '/admin/sales',
            icon: TrendingUp,
            theme: {
                border: 'hover:border-teal-500',
                iconBg: 'bg-teal-50 border-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)]',
                leftBar: 'bg-teal-600',
                chevron: 'text-teal-400 group-hover:text-teal-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(20,184,166,0.06)]'
            },
            keywords: ['sales list', 'transactions', 'revenue ledger', 'sales history']
        },
        {
            name: 'Sale Returns',
            desc: 'Customer returns & refunds',
            href: '/admin/sale-returns',
            icon: RotateCcw,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['returns', 'refunds', 'customer returns', 'sale returns']
        },
        {
            name: 'Purchase History',
            desc: 'Past supplier orders',
            href: '/admin/purchases',
            icon: History,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['expenses', 'vendor orders', 'invoices', 'purchase history']
        },
        {
            name: 'Purchase Returns',
            desc: 'Return goods to suppliers',
            href: '/admin/purchases/returns',
            icon: RefreshCcw,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['refunds', 'damaged', 'shipback', 'purchase returns', 'supplier returns']
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
            name: 'Order Tracking',
            desc: 'Delivery & dispatch status',
            href: '/admin/tracking',
            icon: Truck,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(2,132,199,0.06)]'
            },
            keywords: ['delivery', 'courier', 'dispatch', 'order tracking']
        },
        {
            name: 'Internal Users',
            desc: 'Staff logins & accounts',
            href: '/admin/users',
            icon: User,
            theme: {
                border: 'hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['staff', 'logins', 'accounts', 'internal users']
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
            name: 'Add Listing',
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
        {
            name: 'Branches & Admins',
            desc: 'Assign warehouses to admins',
            href: '/admin/branches',
            icon: Building2,
            theme: {
                border: 'hover:border-indigo-500',
                iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.2)]',
                leftBar: 'bg-indigo-600',
                chevron: 'text-indigo-400 group-hover:text-indigo-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'
            },
            keywords: ['branch', 'branches', 'city', 'assign', 'warehouse admin', 'multi branch']
        },
        {
            name: 'Supplier Registry',
            desc: 'Vendors & manufacturers',
            href: '/admin/company/suppliers',
            icon: UserCheck,
            theme: {
                border: 'hover:border-amber-500',
                iconBg: 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.2)]',
                leftBar: 'bg-amber-600',
                chevron: 'text-amber-400 group-hover:text-amber-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(245,158,11,0.06)]'
            },
            keywords: ['vendors', 'manufacturers', 'contacts', 'supplier']
        },
        {
            name: 'Customer Registry',
            desc: 'Clients & profiles',
            href: '/admin/company/customers',
            icon: Users,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(2,132,199,0.06)]'
            },
            keywords: ['clients', 'profiles', 'ledger', 'customer']
        },
        {
            name: 'Warehouses',
            desc: 'Storage & distribution',
            href: '/admin/inventory/warehouses',
            icon: Store,
            theme: {
                border: 'hover:border-orange-500',
                iconBg: 'bg-orange-50 border-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(234,88,12,0.2)]',
                leftBar: 'bg-orange-600',
                chevron: 'text-orange-400 group-hover:text-orange-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(234,88,12,0.06)]'
            },
            keywords: ['storage', 'depots', 'distribution', 'warehouse']
        },
        {
            name: 'Areas / Territories',
            desc: 'Regions & zones',
            href: '/admin/company/areas',
            icon: MapPin,
            theme: {
                border: 'hover:border-sky-500',
                iconBg: 'bg-sky-50 border-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
                leftBar: 'bg-sky-600',
                chevron: 'text-sky-400 group-hover:text-sky-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(2,132,199,0.06)]'
            },
            keywords: ['area', 'territory', 'region', 'zone', 'locality']
        },
        {
            name: 'Global Payments',
            desc: 'Payment methods',
            href: '/admin/payments',
            icon: CreditCard,
            theme: {
                border: 'hover:border-emerald-500',
                iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.2)]',
                leftBar: 'bg-emerald-600',
                chevron: 'text-emerald-400 group-hover:text-emerald-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(16,185,129,0.06)]'
            },
            keywords: ['payment methods', 'stripe', 'paypal', 'banks', 'global payments']
        },
        {
            name: 'System Alerts',
            desc: 'Errors & warnings',
            href: '/admin/alerts',
            icon: AlertTriangle,
            theme: {
                border: 'hover:border-rose-500',
                iconBg: 'bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]',
                leftBar: 'bg-rose-600',
                chevron: 'text-rose-400 group-hover:text-rose-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(244,63,94,0.06)]'
            },
            keywords: ['errors', 'warnings', 'alarms', 'alerts']
        },
        {
            name: 'Notifications',
            desc: 'Events & updates',
            href: '/admin/notifications',
            icon: Bell,
            theme: {
                border: 'hover:border-violet-500',
                iconBg: 'bg-violet-50 border-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                leftBar: 'bg-violet-600',
                chevron: 'text-violet-400 group-hover:text-violet-600',
                hoverGlow: 'hover:shadow-[0_12px_24px_rgba(139,92,246,0.06)]'
            },
            keywords: ['alerts', 'events', 'inbox', 'updates', 'notifications']
        },
    ];

    // ── COMPLETE PAGE CATALOG ──
    // Every navigable admin page, grouped by category. This is the single source of
    // truth for the "All Pages" directory at the bottom. Anything already shown as a
    // prominent card up top is filtered out below so nothing appears twice. Add new
    // admin pages here and they automatically show under their category.
    const pageCatalog: GroupSection[] = [
        {
            title: 'Sales & Orders',
            items: [
                { name: 'Point of Sale (POS)', href: '/admin/sale', icon: ScanLine, keywords: ['counter', 'cashier', 'barcode', 'checkout', 'pos'] },
                { name: 'Sales History', href: '/admin/sales', icon: TrendingUp, keywords: ['sales list', 'transactions', 'revenue ledger'] },
                { name: 'Invoices', href: '/admin/invoices', icon: Receipt, keywords: ['billing', 'receipts', 'print', 'invoice'] },
                { name: 'Sale Returns', href: '/admin/sale-returns', icon: RotateCcw, keywords: ['returns', 'refunds', 'customer returns'] },
                { name: 'Order List', href: '/admin/orders', icon: ClipboardList, keywords: ['orders', 'shipping', 'list'] },
                { name: 'Order Tracking', href: '/admin/tracking', icon: Truck, keywords: ['delivery', 'courier', 'dispatch'] },
                { name: 'Delivery Persons', href: '/admin/delivery', icon: Bike, keywords: ['rider', 'riders', 'courier', 'driver', 'delivery boy'] },
            ]
        },
        {
            title: 'Purchasing & Suppliers',
            items: [
                { name: 'New Purchase Order', href: '/admin/purchases/add', icon: ShoppingCart, keywords: ['draft', 'buy', 'stock order', 'procurement'] },
                { name: 'Purchase History', href: '/admin/purchases', icon: History, keywords: ['expenses', 'vendor orders', 'invoices'] },
                { name: 'Purchase Returns', href: '/admin/purchases/returns', icon: RefreshCcw, keywords: ['refunds', 'damaged', 'shipback'] },
                { name: 'Supplier Registry', href: '/admin/company/suppliers', icon: UserCheck, keywords: ['vendors', 'manufacturers', 'contacts'] },
            ]
        },
        {
            title: 'Products & Inventory',
            items: [
                { name: 'Product List', href: '/admin/products', icon: Package, keywords: ['items', 'catalog', 'skus', 'edit'] },
                { name: 'Add Listing', href: '/admin/products/add', icon: PackagePlus, keywords: ['create', 'new item', 'upload'] },
                { name: 'Current Stocks', href: '/admin/inventory/list', icon: Boxes, keywords: ['volumes', 'quantities', 'adjustments', 'stock'] },
                { name: 'Warehouses', href: '/admin/inventory/warehouses', icon: Store, keywords: ['storage', 'depots', 'distribution'] },
            ]
        },
        {
            title: 'Customers',
            items: [
                { name: 'Customer Registry', href: '/admin/company/customers', icon: Users, keywords: ['clients', 'profiles', 'ledger'] },
                { name: 'Areas / Territories', href: '/admin/company/areas', icon: MapPin, keywords: ['area', 'territory', 'region', 'zone', 'locality'] },
            ]
        },
        {
            title: 'Finance',
            items: [
                { name: 'Income', href: '/admin/income', icon: ArrowDownLeft, keywords: ['income', 'money in', 'revenue', 'earnings', 'inbound'] },
                { name: 'Expense', href: '/admin/expense', icon: ArrowUpRight, keywords: ['expense', 'money out', 'spending', 'costs', 'outbound'] },
                { name: 'Global Payments', href: '/admin/payments', icon: CreditCard, keywords: ['payment methods', 'stripe', 'paypal', 'banks'] },
            ]
        },
        {
            title: 'Reports',
            items: [
                { name: 'Reports Center', href: '/admin/reports', icon: BarChart3, keywords: ['hub', 'audits', 'graphs', 'reports'] },
            ]
        },
        {
            title: 'Administration',
            items: [
                { name: 'Branches & Admins', href: '/admin/branches', icon: Building2, keywords: ['branch', 'branches', 'city', 'assign', 'warehouse admin', 'multi branch'] },
                { name: 'Internal Users', href: '/admin/users', icon: User, keywords: ['staff', 'logins', 'accounts'] },
                { name: 'Staff Roles', href: '/admin/users/roles', icon: ShieldCheck, keywords: ['groups', 'privileges', 'ranks'] },
            ]
        },
        {
            title: 'System & CMS',
            items: [
                { name: 'Website CMS', href: '/admin/website-settings', icon: Globe, keywords: ['slider', 'banners', 'content', 'seo', 'footer', 'storefront'] },
                { name: 'System Settings', href: '/admin/settings', icon: Settings, keywords: ['config', 'sidebar visibility', 'site details'] },
                { name: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle, keywords: ['errors', 'warnings', 'alarms'] },
                { name: 'Notifications', href: '/admin/notifications', icon: Bell, keywords: ['alerts', 'events', 'inbox', 'updates'] },
            ]
        },
    ];

    // Low-stock products. Prefer the branch-scoped feed from the server (driven by
    // this branch's actual warehouse stock); fall back to the global product
    // catalog only if the server didn't provide it.
    const DEFAULT_LOW_STOCK_MIN = 10;
    const lowStock = useMemo(() => {
        if (Array.isArray(serverLowStock) && serverLowStock.length > 0) {
            return serverLowStock.map((p: any) => ({
                ...p,
                _qty: Number(p.qty ?? 0),
                _min: Number(p.min ?? DEFAULT_LOW_STOCK_MIN),
            }));
        }
        return (products || [])
            .map((p: any) => ({
                ...p,
                _qty: Number(p.total_quantity ?? p.available_quantity ?? 0),
                _min: Number(p.min_count ?? DEFAULT_LOW_STOCK_MIN),
            }))
            .filter((p: any) => p._qty <= p._min)
            .sort((a: any, b: any) => a._qty - b._qty)
            .slice(0, 60);
    }, [serverLowStock, products]);

    // ── Group the core button-cards into labeled sections (order = display order) ──
    const CORE_GROUPS: { title: string; hrefs: string[] }[] = [
        { title: 'Sales & Orders', hrefs: ['/admin/sale', '/admin/invoices', '/admin/sales', '/admin/sale-returns', '/admin/orders', '/admin/tracking'] },
        { title: 'Purchasing & Inventory', hrefs: ['/admin/purchases/add', '/admin/purchases', '/admin/purchases/returns', '/admin/products', '/admin/products/add', '/admin/inventory/list'] },
        { title: 'Finance & Reports', hrefs: ['/admin/reports', '/admin/income', '/admin/expense'] },
        { title: 'Administration', hrefs: ['/admin/branches', '/admin/users', '/admin/website-settings', '/admin/settings', '/admin/company/suppliers', '/admin/company/customers'] },
    ];

    // The Super Admin sees only oversight pages, so the operational groups above would
    // each render as a lonely 1-card row. Give them their own balanced grouping that
    // fills rows cleanly. Every page here is shown as a prominent card (their dashboard
    // has no "All Pages" directory below).
    const SUPER_ADMIN_CORE_GROUPS: { title: string; hrefs: string[] }[] = [
        { title: 'Finance & Reports', hrefs: ['/admin/reports', '/admin/income', '/admin/expense', '/admin/payments'] },
        { title: 'Administration', hrefs: ['/admin/branches', '/admin/users', '/admin/company/suppliers', '/admin/company/customers', '/admin/company/areas'] },
        { title: 'System & CMS', hrefs: ['/admin/website-settings', '/admin/settings', '/admin/alerts', '/admin/notifications'] },
    ];
    const coreByHref = new Map(corePages.map((p) => [p.href, p]));

    // Whether a core card stays a big prominent button (vs dropping to the list):
    //  - Super admin → every page they can see is a prominent card (the "All Pages"
    //    directory is hidden for them, so the cards are their full menu).
    //  - Branch admin → only the day-to-day essential cards.
    const isPromoted = (_groupTitle: string, href: string) =>
        isSuperAdmin
            ? true
            : BRANCH_ADMIN_IMPORTANT_HREFS.has(href);

    const groupedCore = (isSuperAdmin ? SUPER_ADMIN_CORE_GROUPS : CORE_GROUPS)
        .map((g) => ({
            title: g.title,
            items: (g.hrefs.map((h) => coreByHref.get(h)).filter(Boolean) as PageButton[])
                // Super admin: every page in their groups is a prominent card. Branch
                // admin: only the day-to-day essentials stay prominent.
                .filter((p) => canSee(p.href) && (isSuperAdmin || isPromoted(g.title, p.href))),
        }))
        .filter((g) => g.items.length > 0);

    // Hrefs already shown as big prominent cards up top — excluded from the grouped
    // lists below so nothing appears twice.
    const promotedHrefs = new Set(groupedCore.flatMap((g) => g.items.map((i) => i.href)));

    // "All Pages": the full catalog grouped by category. Drop the prominent cards
    // already shown up top and any super-admin-only page a branch admin can't see,
    // then hide categories that end up empty.
    const groupedOther = pageCatalog
        .map((cat) => ({
            title: cat.title,
            items: cat.items.filter((item) => canSee(item.href) && !promotedHrefs.has(item.href)),
        }))
        .filter((cat) => cat.items.length > 0);
    const totalOtherCount = groupedOther.reduce((n, g) => n + g.items.length, 0);

    // Super-admin oversight panel (replaces the branch admin's Low Stock Alert).
    // Products & employees come from the dashboard hook; branches/customers/suppliers
    // from overviewCounts. `value` is null while that count is still loading.
    const businessOverview: { label: string; value: number | null; icon: any; color: string }[] = [
        { label: 'Total Branches', value: overviewCounts.branches, icon: Building2, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Total Employees', value: stats?.activeUsers ?? null, icon: User, color: 'bg-violet-50 text-violet-600' },
        { label: 'Total Products', value: stats?.totalProducts ?? null, icon: Package, color: 'bg-teal-50 text-teal-600' },
        { label: 'Total Customers', value: overviewCounts.customers, icon: Users, color: 'bg-sky-50 text-sky-600' },
        { label: 'Active Suppliers', value: overviewCounts.suppliers, icon: Truck, color: 'bg-amber-50 text-amber-600' },
    ];

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-24 font-sans text-slate-800 animate-in fade-in duration-300">
            <div className="max-w-[1440px] mx-auto px-0 md:px-8 pt-1 md:pt-4">
                <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-stretch">

                {/* ── MAIN: DIRECTORY ── */}
                <div className="flex-1 min-w-0 space-y-12 animate-in fade-in duration-300 text-left">

                        {/* ── CORE OPERATIONS & KEY PAGES (GROUPED ACCENT BUTTON-CARDS) ── */}
                        <div className="space-y-7">
                            {groupedCore.map((grp) => (
                                <div key={grp.title} className="space-y-3">
                                    <div className="flex items-center gap-3 select-none">
                                        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">{grp.title}</h2>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{grp.items.length}</span>
                                        <div className="h-px flex-1 bg-slate-200/70" />
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                                        {grp.items.map((btn) => {
                                            const Icon = btn.icon;
                                            const isOrders = btn.href === '/admin/orders';
                                            const theme = btn.theme;
                                            return (
                                                <Link
                                                    key={btn.href}
                                                    href={btn.href}
                                                    className={`group relative flex items-center gap-2.5 sm:gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white px-3 sm:px-3.5 py-1.5 sm:py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 ${theme?.border || 'hover:border-indigo-500'} ${theme?.hoverGlow || 'hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)]'}`}
                                                >
                                                    {/* accent rail — slides in on hover */}
                                                    <span className={`pointer-events-none absolute left-0 top-0 h-full w-[3px] origin-center scale-y-0 rounded-r-full transition-transform duration-300 ease-out group-hover:scale-y-100 ${theme?.leftBar || 'bg-indigo-600'}`} />
                                                    {/* soft sheen wash on hover */}
                                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-slate-100/0 transition-colors duration-300 group-hover:to-slate-100/70" />
                                                    {/* top edge highlight */}
                                                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-70" />

                                                    <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center border ring-1 ring-inset ring-white/40 transition-all duration-300 ease-out shrink-0 group-hover:scale-105 group-hover:-rotate-3 ${theme?.iconBg || 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                                        <Icon strokeWidth={1.75} className="w-4 h-4 sm:w-[17px] sm:h-[17px] transition-transform duration-300 group-hover:scale-110" />
                                                    </div>
                                                    <div className="relative min-w-0 flex-1">
                                                        <h3 className="text-[12px] sm:text-[13px] font-semibold text-slate-900 tracking-tight leading-tight truncate">
                                                            {btn.name}
                                                        </h3>
                                                        {btn.desc && (
                                                            <p className="hidden sm:block text-[10.5px] font-medium text-slate-400 leading-tight truncate mt-0.5 transition-colors duration-300 group-hover:text-slate-500">
                                                                {btn.desc}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="relative flex items-center gap-1.5 shrink-0">
                                                        {isOrders && (((stats as any)?.totalActive ?? stats?.pendingOrders ?? 0) > 0) && (
                                                            <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm shadow-rose-600/30 select-none tabular-nums">
                                                                <span className="absolute inset-0 rounded-full bg-rose-500 opacity-40 motion-safe:animate-ping" style={{ animationDuration: '2.5s' }} />
                                                                <span className="relative">{(stats as any)?.totalActive ?? stats?.pendingOrders}</span>
                                                            </span>
                                                        )}
                                                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-50 transition-all duration-300 group-hover:bg-white group-hover:shadow-sm">
                                                            <ChevronRight className={`w-3.5 h-3.5 sm:w-[15px] sm:h-[15px] text-slate-300 transition-all duration-300 group-hover:translate-x-0.5 ${theme?.chevron || 'group-hover:text-indigo-600'}`} />
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── RIGHT: SUPER ADMIN → BUSINESS OVERVIEW · BRANCH ADMIN → LOW STOCK ── */}
                    <aside className="w-full xl:w-[340px] shrink-0">
                        {isSuperAdmin ? (
                        <div className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col xl:h-full">
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <BarChart3 size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">Business Overview</h3>
                                    <p className="text-[10.5px] text-slate-400 font-medium">Across all branches</p>
                                </div>
                            </div>
                            <div className="flex-1 divide-y divide-slate-50">
                                {businessOverview.map((m) => {
                                    const MIcon = m.icon;
                                    return (
                                        <div key={m.label} className="flex items-center gap-3 px-5 py-3.5">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                                                <MIcon size={17} strokeWidth={1.75} />
                                            </div>
                                            <span className="flex-1 min-w-0 truncate text-[12.5px] font-semibold text-slate-600">{m.label}</span>
                                            <span className="text-[15px] font-black text-slate-900 tabular-nums">{m.value === null ? '—' : m.value.toLocaleString('en-US')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        ) : (
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
                        )}
                    </aside>
                </div>

                {/* ── ALL PAGES (CATEGORIES AS COLUMNS) ── */}
                {/* The super admin works from the prominent cards only — hide the full directory. */}
                {!isSuperAdmin && (
                <div className="mt-10 border-t border-slate-200/70 pt-8">
                    <div className="flex items-center gap-3 select-none mb-6">
                        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">All Pages</h2>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{totalOtherCount}</span>
                        <div className="h-px flex-1 bg-slate-200/70" />
                    </div>

                    {/* Each category is its own column; blocks flow into columns and never split. */}
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-x-8">
                        {groupedOther.map((grp) => (
                            <div key={grp.title} className="break-inside-avoid mb-7">
                                <div className="flex items-center gap-2 select-none mb-2 pb-2 border-b border-slate-200/70">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{grp.title}</h3>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{grp.items.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    {grp.items.map((item) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="flex items-center justify-between py-1.5 px-2 -mx-1 rounded-lg group/link transition-colors duration-200 hover:bg-slate-50"
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
                        ))}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
