'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import {
    BarChart3, Calendar, Printer, FileSpreadsheet,
    ListFilter, Search, Download, ClipboardList, Info, CheckCircle,
    ChevronRight, ChevronLeft, LayoutDashboard, AlertTriangle, Clock,
    ShoppingBag, Package, Boxes, RotateCcw,
    Truck, Tag, DollarSign
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    productService, orderService,
    purchaseService, supplierService, categoryService, userService, paymentService
} from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';
import { companyService } from '@/services/company.service';
import { authService } from '@/lib/auth';
import { exportToCSV, exportToExcel, formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - MANUAL REPORT GENERATOR
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;

// Grouped in a logical order: Sales → Purchases → Inventory → People → Finance.
// (The Category dropdown appends Income, Expense and System Users after these.)
const CATEGORIES = [
    // Sales
    { id: 'sales', label: 'Sale Order' },
    { id: 'returns', label: 'Returns' },
    // Purchases
    { id: 'purchases', label: 'Purchase Order' },
    { id: 'suppliers', label: 'Suppliers' },
    // Inventory
    { id: 'products', label: 'Products' },
    { id: 'stock', label: 'Stock' },
    // People
    { id: 'customers', label: 'Customers' },
    // Finance
    { id: 'payments', label: 'Payments' },
    // Delivery
    { id: 'delivery', label: 'Delivery' },
];

// When the "Personal" branch is selected, the report covers the Super Admin's own
// ledger (income / expense entries not tied to any branch) instead of a branch.
const PERSONAL_CATEGORIES = [
    { id: 'income', label: 'Income' },
    { id: 'expense', label: 'Expense' },
];

// Extra category shown for a branch / All Branches: the branch's system users (staff).
const SYSTEM_USER_CATEGORY = { id: 'system_users', label: 'System Users' };

const SUB_OPTIONS: Record<string, string[]> = {
    sales: ['Offline Sales', 'Online Sales'],
    purchases: ['Purchase Order By Date', 'Purchase Order By Invoice', 'By Supplier'],
    customers: ['Walk-in Customer', 'Registered Customer'],
    returns: ['Sales Returns', 'Purchase Returns'],
    payments: ['Sales Payment', 'Purchase Payment', 'Net Profit'],
    delivery: ['By Date Range'],
    suppliers: ['All Suppliers', 'By Category', 'Outstanding Balance'],
    products: ['All Products', 'By Category', 'By Supplier', 'By Price Range'],
    stock: ['By Date Range', 'Stock Status', 'By Product Name', 'By Supplier', 'By Price Range', 'By Brand'],
    income: ['All Records', 'By Date Range'],
    expense: ['All Records', 'By Date Range'],
    system_users: ['All Staff'],
};

const MODES: Record<string, string[]> = {
    'Offline Sales': ['By Date Range', 'By Invoice No', 'By Customer', 'By Salesman'],
    'Online Sales': ['By Date Range', 'By Invoice No', 'By Customer', 'By Salesman', 'Pending', 'Delivered', 'Cancelled'],
    'Walk-in Customer': ['All Customers', 'By Registration Date', 'By Area', 'Top Buyers'],
    'Registered Customer': ['All Customers', 'By Registration Date', 'By Area', 'Top Buyers'],
    'Sales Returns': ['By Date Range', 'By Original Invoice', 'By Reason'],
    'Purchase Returns': ['By Date Range', 'By Original Invoice', 'By Reason'],
    'Sales Payment': ['By Date Range', 'By Customer', 'By Invoice No', 'By Salesman'],
    'Purchase Payment': ['By Date Range', 'By Supplier', 'By Invoice No', 'By Account'],
    'By Product Name': [], // Handled dynamically in UI
    'Stock Status': ['Low Stock', 'Out of Stock'],
};

const VIEW_FIELDS: Record<string, string[]> = {
    'By Date Range': ['dateRange'],
    'By Registration Date': ['dateRange'],
    'By Supplier': ['supplierId'],
    'By Customer': ['customerId'],
    'By Category': ['categoryId'],
    'By Brand': ['brandSearch'],
    'By Price Range': ['priceRange'],
    'By Area': ['areaSearch'],
    'By Invoice No': ['invoiceNo'],
    'By Original Invoice': ['invoiceNo'],
    'By Salesman': ['salesmanSearch'],
    'By Account': ['accountSearch'],
    'By Reason': ['reasonSearch'],
    'Purchase Order By Date': ['dateRange'],
    'Purchase Order By Invoice': ['invoiceNo'],
    'Pending': ['dateRange'],
    'Delivered': ['dateRange'],
    'Cancelled': ['dateRange'],
    'Net Profit': ['dateRange'],
};

// Payment-category views that open a full dedicated report page instead of
// generating inline on this screen.
const NAV_VIEWS: Record<string, string> = {};

/* Defensive field readers — report rows come from many different endpoints. */
const rowDateVal = (r: any) => r.created_at || r.order_date || r.date || r.return_date || r.purchase_date || r.date_joined || r.updated_at || null;
const rowAmount = (r: any) => Number(r.total_amount ?? r.total_refund_amount ?? r.grand_total ?? r.price_per_item ?? r.price ?? r.selling_price ?? r.amount ?? 0);
const rowQty = (r: any): number => {
    if (Array.isArray(r.items) && r.items.length) return r.items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    return Number(r.total_quantity ?? r.stock_quantity ?? r.quantity ?? 0);
};
const rowTitle = (r: any) =>
    r.product_name || r.company ||
    [r.first_name, r.last_name].filter(Boolean).join(' ').trim() ||
    r.name || r.customer_display_name || r.customer_name || r.supplier_name || r.full_name || r.username ||
    r.category_name || r.payer_payee || r.description || 'Record';
const rowSubtitle = (r: any, category: string) => {
    // System users: surface the role (Sales Manager, etc.) + a contact.
    if (category === 'system_users') {
        return [r.role_name, r.email || r.phone].filter(Boolean).join(' · ') || 'Staff';
    }
    // Delivery: rider performance summary.
    if (category === 'delivery') {
        return `${r.delivered || 0} delivered · ${r.pending || 0} pending · ${r.total_orders || 0} orders`;
    }
    return r.return_number || r.order_number || r.purchase_number ||
        (r.warehouse_name ? `Warehouse: ${r.warehouse_name}` : '') ||
        r.reason || r.phone || r.email || r.tracking_id || r.payer_payee || r.reference_number || category;
};

// One line of the Net Profit panel.
function ProfitRow({ label, value, sub, bold, neg }: { label: string; value: number; sub?: string; bold?: boolean; neg?: boolean }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5">
            <div>
                <p className={bold ? 'text-[13px] font-bold text-slate-900' : 'text-[13px] font-medium text-slate-600'}>{label}</p>
                {sub && <p className="text-[10.5px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
            <p className={`text-[13.5px] tabular-nums ${bold ? 'font-black text-slate-900' : neg ? 'font-bold text-rose-600' : 'font-bold text-slate-700'}`}>
                {neg ? '− ' : ''}{formatCurrency(value)}
            </p>
        </div>
    );
}

function ReportsEngineInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    // Super-Admin branch scope: pick a branch and the whole report follows it.
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    // Per-customer profile (total bought / dues / orders) shown when a customer is picked.
    const [customerSummary, setCustomerSummary] = useState<any | null>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [filters, setFilters] = useState({
        branch: '',
        category: (searchParams.get('type') || '') as string,
        view: '',
        subView: '',
        dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
        productSearch: '',
        supplierId: '',
        customerId: '',
        categoryId: '',
        brandSearch: '',
        minPrice: '',
        maxPrice: '',
        areaSearch: '',
        invoiceNo: '',
        salesmanSearch: '',
        reasonSearch: '',
        accountSearch: '',
    });

    const [reportResult, setReportResult] = useState<any[]>([]);
    // Net Profit view produces a P&L summary instead of a row list.
    const [profitSummary, setProfitSummary] = useState<any | null>(null);

    const loadMeta = useCallback(async () => {
        setIsSuperAdmin(authService.isSuperAdmin());
        // Each lookup is independent — one failing endpoint (e.g. a 500 on
        // categories) must NOT blank out the others (suppliers, stock, branches).
        const [s, c, st, wh, u, cust] = await Promise.all([
            supplierService.getAll({ no_pagination: 'true' }).catch(() => [] as any[]),
            categoryService.getAll({ no_pagination: 'true' }).catch(() => [] as any[]),
            inventoryService.getInventory({ no_pagination: 'true' }).catch(() => [] as any[]),
            inventoryService.getWarehouses().catch(() => [] as any[]),
            userService.getAll?.().catch(() => [] as any[]) ?? Promise.resolve([] as any[]),
            companyService.getCustomers().catch(() => [] as any[]),
        ]);
        setSuppliers(Array.isArray(s) ? s : (s as any).results || []);
        setCategories(Array.isArray(c) ? c : (c as any).results || []);
        setStocks(st || []);
        setWarehouses(Array.isArray(wh) ? wh : (wh as any)?.results || []);
        setUsers(Array.isArray(u) ? u : (u as any)?.results || []);
        setCustomers(Array.isArray(cust) ? cust : (cust as any)?.results || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadMeta(); }, [loadMeta]);

    // Branches the Super Admin can scope to: only warehouses actually assigned to a
    // (non-super) admin. An unassigned branch has no admin running it, so showing it
    // here would just produce empty reports.
    const assignedWarehouses = useMemo(() => {
        const assigned = new Set<string>();
        users.forEach((u: any) => {
            if (u.is_super_admin) return;
            (u.warehouses || []).forEach((w: any) => assigned.add(String(typeof w === 'object' ? w?.id : w)));
        });
        return warehouses.filter((w: any) => assigned.has(String(w.id)));
    }, [warehouses, users]);

    // Net Profit mode: the Select Branch dropdown picks "Net Profit", and the second
    // dropdown becomes a SCOPE selector (All Branches / a branch / Personal), held in
    // filters.category. effectiveBranch is the branch the report is actually scoped to.
    const isNetProfitMode = filters.branch === 'netprofit';
    const effectiveBranch = isNetProfitMode ? filters.category : filters.branch;

    const isThreeLevel = !!MODES[filters.view];
    const activeFields = isNetProfitMode
        ? ['dateRange']
        : isThreeLevel
            ? (filters.subView ? (VIEW_FIELDS[filters.subView] || []) : [])
            : (filters.view ? (VIEW_FIELDS[filters.view] || []) : []);

    // Does a row belong to the chosen branch? (Super-Admin scope; rows with no
    // branch info — products/customers — always pass so those reports still work.)
    const inSelectedBranch = (r: any): boolean => {
        // 'personal' is the Super Admin's own ledger, scoped during fetch — skip here.
        if (!(isSuperAdmin && effectiveBranch && effectiveBranch !== 'all' && effectiveBranch !== 'personal')) return true;
        const bid = String(effectiveBranch);
        const bname = (warehouses.find((w: any) => String(w.id) === bid)?.name || '').toLowerCase();
        const raw = r.warehouse;
        const rwId = raw && typeof raw === 'object' ? raw.id : (raw ?? r.warehouse_id);
        const rwName = String(r.warehouse_name || '').toLowerCase();
        const hasBranch = (rwId !== undefined && rwId !== null && rwId !== '') || !!rwName;
        if (!hasBranch) return true;
        return String(rwId ?? '') === bid || (!!bname && rwName === bname);
    };

    // Is a row within the selected date range?
    const inDateRange = (r: any): boolean => {
        const from = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00').getTime() : -Infinity;
        const to = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : Infinity;
        const d = rowDateVal(r);
        if (!d) return true;
        const t = new Date(d).getTime();
        return isNaN(t) ? true : (t >= from && t <= to);
    };

    // Apply the selected filters on the client. The backend ignores several params
    // (e.g. date *ranges* on orders), so we narrow the fully-fetched dataset here to
    // guarantee every visible filter actually works.
    const applyClientFilters = (rows: any[]): any[] => {
        let out = Array.isArray(rows) ? [...rows] : [];
        const mode = isThreeLevel ? filters.subView : filters.view;

        // Super-Admin branch scope (see inSelectedBranch).
        out = out.filter(inSelectedBranch);

        if (activeFields.includes('dateRange') && (filters.dateFrom || filters.dateTo)) {
            const from = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00').getTime() : -Infinity;
            const to = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59').getTime() : Infinity;
            out = out.filter(r => {
                const d = rowDateVal(r);
                if (!d) return true;
                const t = new Date(d).getTime();
                return isNaN(t) ? true : (t >= from && t <= to);
            });
        }
        if (activeFields.includes('invoiceNo') && filters.invoiceNo.trim()) {
            const q = filters.invoiceNo.trim().toLowerCase();
            out = out.filter(r => `${r.order_number || ''} ${r.return_number || ''} ${r.invoice_number || ''} ${r.id || ''}`.toLowerCase().includes(q));
        }
        if (activeFields.includes('customerId') && filters.customerId.trim()) {
            const tokens = filters.customerId.trim().toLowerCase().split(/\s+/);
            out = out.filter(r => {
                const hay = `${r.customer_display_name || ''} ${r.customer_name || ''} ${r.full_name || ''} ${r.name || ''} ${r.username || ''} ${r.phone_number || ''} ${r.phone || ''}`.toLowerCase();
                return tokens.every(t => hay.includes(t));
            });
        }
        if (activeFields.includes('supplierId') && filters.supplierId) {
            const sid = String(filters.supplierId);
            const sname = (suppliers.find(s => String(s.id) === sid)?.name || '').toLowerCase();
            out = out.filter(r => String(r.supplier ?? r.supplier_id ?? '') === sid || (!!sname && (r.supplier_name || '').toLowerCase() === sname));
        }
        if (activeFields.includes('categoryId') && filters.categoryId) {
            const cid = String(filters.categoryId);
            const cname = (categories.find(c => String(c.id) === cid)?.name || '').toLowerCase();
            out = out.filter(r => String(r.category ?? r.category_id ?? '') === cid || (!!cname && (r.category_name || '').toLowerCase() === cname));
        }
        if (activeFields.includes('priceRange') && (filters.minPrice || filters.maxPrice)) {
            const min = filters.minPrice ? Number(filters.minPrice) : -Infinity;
            const max = filters.maxPrice ? Number(filters.maxPrice) : Infinity;
            out = out.filter(r => { const a = rowAmount(r); return a >= min && a <= max; });
        }
        if (activeFields.includes('brandSearch') && filters.brandSearch.trim()) {
            const q = filters.brandSearch.trim().toLowerCase();
            out = out.filter(r => `${r.brand || ''} ${r.product_name || ''} ${r.name || ''}`.toLowerCase().includes(q));
        }
        if (activeFields.includes('areaSearch') && filters.areaSearch.trim()) {
            const q = filters.areaSearch.trim().toLowerCase();
            out = out.filter(r => `${r.address || ''} ${r.city || ''} ${r.area || ''}`.toLowerCase().includes(q));
        }
        if (activeFields.includes('salesmanSearch') && filters.salesmanSearch.trim()) {
            const q = filters.salesmanSearch.trim().toLowerCase();
            out = out.filter(r => `${r.salesman || ''} ${r.created_by_name || ''} ${r.processed_by || ''} ${r.user_name || ''}`.toLowerCase().includes(q));
        }
        if (activeFields.includes('reasonSearch') && filters.reasonSearch.trim()) {
            const q = filters.reasonSearch.trim().toLowerCase();
            out = out.filter(r => `${r.reason || ''}`.toLowerCase().includes(q));
        }
        if (activeFields.includes('accountSearch') && filters.accountSearch.trim()) {
            const q = filters.accountSearch.trim().toLowerCase();
            out = out.filter(r => `${r.account || ''} ${r.payment_method || ''} ${r.bank || ''}`.toLowerCase().includes(q));
        }

        // Status modes (sales orders)
        if (mode === 'Pending') out = out.filter(r => (r.status || '').toLowerCase() === 'pending');
        else if (mode === 'Delivered') out = out.filter(r => (r.status || '').toLowerCase() === 'delivered');
        else if (mode === 'Cancelled') out = out.filter(r => (r.status || '').toLowerCase() === 'cancelled');

        // Stock status
        if (mode === 'Out of Stock') out = out.filter(r => rowQty(r) <= 0);
        else if (mode === 'Low Stock') out = out.filter(r => { const q = rowQty(r); return q > 0 && q <= Number(r.reorder_level ?? r.min_stock_level ?? r.low_stock_threshold ?? 10); });

        // By Product Name (stock) — subView carries the chosen product name
        if (filters.view === 'By Product Name' && filters.subView) out = out.filter(r => (r.product_name || '') === filters.subView);

        // Sales channel (Offline = Shop/POS, Online = COD/Online).
        // Done client-side so a mismatched server param can never silently empty the set.
        if (filters.category === 'sales') {
            const pm = (r: any) => String(r.payment_method || '').toUpperCase();
            if (filters.view === 'Offline Sales') out = out.filter(r => pm(r) === 'SHOP');
            else if (filters.view === 'Online Sales') out = out.filter(r => ['COD', 'ONLINE'].includes(pm(r)));
        }

        // Customer type (Registered = has an account, Walk-in = guest / no account)
        if (filters.category === 'customers') {
            const isRegistered = (r: any) => !!(r.email || r.username) && String(r.status || '').toLowerCase() !== 'guest';
            if (filters.view === 'Registered Customer') out = out.filter(isRegistered);
            else if (filters.view === 'Walk-in Customer') out = out.filter(r => !isRegistered(r));
        }

        // Top Buyers — sort by spend/orders descending
        if (mode === 'Top Buyers') {
            out = [...out].sort((a, b) =>
                Number(b.total_spent ?? b.total_purchases ?? b.orders_count ?? 0) -
                Number(a.total_spent ?? a.total_purchases ?? a.orders_count ?? 0));
        }

        // Suppliers with an outstanding balance (skipped if the data has no balance field)
        if (mode === 'Outstanding Balance') {
            const hasBal = out.some(r => r.balance !== undefined || r.outstanding !== undefined || r.outstanding_balance !== undefined);
            if (hasBal) out = out.filter(r => Number(r.balance ?? r.outstanding ?? r.outstanding_balance ?? 0) > 0);
        }

        return out;
    };

    const generateReport = async () => {
        if (isNetProfitMode) {
            if (!filters.category) {
                toast.error('Please select a scope (a branch, All Branches, or Personal).');
                return;
            }
        } else if (!filters.category || !filters.view) {
            toast.error('Please select both Category and View.');
            return;
        }

        // Statements / Receivables / Payables open their own dedicated report page.
        if (NAV_VIEWS[filters.view]) {
            router.push(NAV_VIEWS[filters.view]);
            return;
        }

        // Net Profit — a P&L summary (not a list). Triggered either by the Net Profit
        // view under Payments, or by the dedicated "Net Profit" branch mode whose scope
        // (All Branches / a branch / Personal) lives in filters.category.
        if (filters.view === 'Net Profit' || isNetProfitMode) {
            setGenerating(true);
            setHasGenerated(true);
            try {
                const arr = (x: any) => Array.isArray(x) ? x : (x?.results || []);

                // Personal scope: the Super Admin's own P&L = personal income − expense
                // (ledger entries with no branch attached).
                if (isNetProfitMode && effectiveBranch === 'personal') {
                    const [inc, exp] = await Promise.all([
                        paymentService.getAll({ payment_type: 'inbound', no_pagination: 'true' }),
                        paymentService.getAll({ payment_type: 'outbound', no_pagination: 'true' }),
                    ]);
                    const personalRows = (rows: any[]) => rows.filter((r: any) =>
                        !(r.warehouse ?? r.warehouse_id) && !r.warehouse_name && inDateRange(r));
                    const incRows = personalRows(arr(inc));
                    const expRows = personalRows(arr(exp));
                    const totalSales = incRows.reduce((s, r) => s + rowAmount(r), 0);
                    const totalPurchases = expRows.reduce((s, r) => s + rowAmount(r), 0);
                    setReportResult([]);
                    setProfitSummary({
                        personal: true,
                        totalSales, totalPurchases, salesReturns: 0, purchaseReturns: 0,
                        netSales: totalSales, netPurchases: totalPurchases,
                        netProfit: totalSales - totalPurchases,
                        counts: { sales: incRows.length, purchases: expRows.length, salesReturns: 0, purchaseReturns: 0 },
                    });
                    toast.success('Net profit calculated');
                    return;
                }

                // Branch / All Branches scope: P&L from transactions. Server filters by
                // ?warehouse for a super admin, so only the chosen branch's rows return.
                const branchParam = (isSuperAdmin && effectiveBranch && effectiveBranch !== 'all' && effectiveBranch !== 'personal') ? { warehouse: effectiveBranch } : {};
                const all = { no_pagination: 'true', ...branchParam };
                const axiosClient = (await import('@/lib/axios')).default;
                const [salesRes, purchaseRes, srRes, prRes] = await Promise.all([
                    orderService.getAll(all),
                    purchaseService.getAll(all),
                    axiosClient.get('v1/sales/returns/', { params: all }).then(r => r.data).catch(() => []),
                    axiosClient.get('v1/sales/purchase-returns/', { params: all }).then(r => r.data).catch(() => []),
                ]);
                const scoped = (rows: any[]) => rows.filter(r => inSelectedBranch(r) && inDateRange(r));
                const sum = (rows: any[]) => scoped(rows).reduce((s, r) => s + rowAmount(r), 0);

                const totalSales = sum(arr(salesRes));
                const totalPurchases = sum(arr(purchaseRes));
                const salesReturns = sum(arr(srRes));
                const purchaseReturns = sum(arr(prRes));
                const netSales = totalSales - salesReturns;
                const netPurchases = totalPurchases - purchaseReturns;
                const netProfit = netSales - netPurchases;

                setReportResult([]);
                setProfitSummary({
                    personal: false,
                    totalSales, totalPurchases, salesReturns, purchaseReturns,
                    netSales, netPurchases, netProfit,
                    counts: {
                        sales: scoped(arr(salesRes)).length,
                        purchases: scoped(arr(purchaseRes)).length,
                        salesReturns: scoped(arr(srRes)).length,
                        purchaseReturns: scoped(arr(prRes)).length,
                    },
                });
                toast.success('Net profit calculated');
            } catch (e) {
                console.error('Net profit failed:', e);
                toast.error('Could not calculate net profit.');
            } finally {
                setGenerating(false);
            }
            return;
        }

        // Customer profile: pick a customer → full history (bought, paid, dues, orders).
        if (filters.category === 'customers' && String(filters.view).startsWith('cust:')) {
            const custId = String(filters.view).slice(5);
            setGenerating(true);
            setHasGenerated(true);
            setProfitSummary(null);
            try {
                const ordRes: any = await orderService.getAll({ no_pagination: 'true' });
                const all = Array.isArray(ordRes) ? ordRes : ordRes?.results || [];
                const sameCustomer = (o: any) => {
                    const raw = o.customer;
                    const cid = raw && typeof raw === 'object' ? raw.id : (raw ?? o.customer_id);
                    return String(cid ?? '') === custId;
                };
                const orders = all.filter(sameCustomer)
                    .sort((a: any, b: any) => new Date(rowDateVal(b) || 0).getTime() - new Date(rowDateVal(a) || 0).getTime());
                const live = orders.filter((o: any) => String(o.status || '').toUpperCase() !== 'CANCELLED');
                // A fully-PAID order counts as paid in full even if amount_paid wasn't
                // recorded; partial/unpaid orders count only what was received.
                const paidOf = (o: any) => String(o.payment_status || '').toUpperCase() === 'PAID'
                    ? rowAmount(o) : Number(o.amount_paid || 0);
                const totalBought = live.reduce((s: number, o: any) => s + rowAmount(o), 0);
                const totalPaid = live.reduce((s: number, o: any) => s + paidOf(o), 0);
                const dues = Math.max(0, totalBought - totalPaid);
                const delivered = live.filter((o: any) => String(o.status || '').toUpperCase() === 'DELIVERED').length;
                const cust = customers.find((c: any) => String(c.id) === custId) || {};
                setReportResult(orders);
                setCustomerSummary({
                    name: [cust.first_name, cust.last_name].filter(Boolean).join(' ') || cust.full_name || cust.username || cust.email || 'Customer',
                    phone: cust.phone || '—', email: cust.email || '—',
                    address: [cust.address, cust.city].filter(Boolean).join(', ') || '—',
                    totalBought, totalPaid, dues,
                    orders: live.length, allOrders: orders.length, delivered,
                    lastOrder: orders.length ? rowDateVal(orders[0]) : null,
                });
                toast.success(`${orders.length} order(s) for ${[cust.first_name, cust.last_name].filter(Boolean).join(' ') || 'customer'}`);
            } catch (e) {
                console.error('Customer report failed:', e);
                toast.error('Could not load customer details.');
            } finally {
                setGenerating(false);
            }
            return;
        }

        setProfitSummary(null);
        setCustomerSummary(null);
        setGenerating(true);
        setHasGenerated(true);
        try {
            // Fetch the COMPLETE dataset for the chosen category, then apply every
            // visible filter on the client. No narrowing server params are sent, so a
            // backend that ignores (or mismatches) a param can never silently empty the
            // result before the client filters run.
            // Server-side branch scope: the backend filters branch-scoped models by
            // ?warehouse for a super admin, so only the selected branch's rows return.
            // (Products/customers/suppliers aren't warehouse-scoped, so they skip it.)
            const branchParam = (isSuperAdmin && filters.branch && filters.branch !== 'all' && filters.branch !== 'personal') ? { warehouse: filters.branch } : {};
            const all = { no_pagination: 'true' };
            const branchAll = { ...all, ...branchParam };
            const axiosClient = (await import('@/lib/axios')).default;
            let result: any[] = [];

            if (filters.category === 'system_users') {
                // A branch's system users (staff). Server returns the branch's staff +
                // owning admin when a warehouse is given, or everyone for All Branches.
                const params: any = { include_staff: 'true' };
                if (effectiveBranch && effectiveBranch !== 'all') params.warehouse = effectiveBranch;
                const res: any = await userService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'income' || filters.category === 'expense') {
                // Income/Expense ledger:
                //   • Personal     → the Super Admin's own entries (no branch attached)
                //   • A branch      → that branch's ledger (server filters by ?warehouse)
                //   • All Branches  → everything
                const ptype = filters.category === 'income' ? 'inbound' : 'outbound';
                // "All Branches" must aggregate across every branch — the payments
                // endpoint otherwise scopes a super admin to their OWN ledger only.
                const payParams: any = { payment_type: ptype, ...branchAll };
                if (filters.branch === 'all') payParams.scope = 'all';
                const res: any = await paymentService.getAll(payParams);
                const rows = Array.isArray(res) ? res : res.results || [];
                result = filters.branch === 'personal'
                    ? rows.filter((r: any) => !(r.warehouse ?? r.warehouse_id) && !r.warehouse_name)
                    : rows;
            } else if (filters.category === 'products') {
                const res: any = await productService.getAll(all);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'stock') {
                const res: any = await inventoryService.getInventory(branchAll);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'sales') {
                const res: any = await orderService.getAll(branchAll);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'purchases') {
                const res: any = await purchaseService.getAll(branchAll);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'customers') {
                result = await companyService.getCustomers();
            } else if (filters.category === 'suppliers') {
                result = await companyService.getSuppliers();
            } else if (filters.category === 'returns' && filters.view === 'Sales Returns') {
                const { data } = await axiosClient.get('v1/sales/returns/', { params: branchAll });
                result = data.results || data || [];
            } else if (filters.category === 'returns' && filters.view === 'Purchase Returns') {
                const { data } = await axiosClient.get('v1/sales/purchase-returns/', { params: branchAll });
                result = data.results || data || [];
            } else if (filters.category === 'payments' && filters.view === 'Sales Payment') {
                // Sales payments are derived from real orders (amount = order total).
                const res: any = await orderService.getAll(branchAll);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'payments' && filters.view === 'Purchase Payment') {
                // Purchase payments are derived from purchase orders (amount = paid amount).
                const res: any = await purchaseService.getAll(branchAll);
                result = (Array.isArray(res) ? res : res.results || [])
                    .map((r: any) => ({ ...r, total_amount: r.paid_amount ?? r.total_amount }));
            } else if (filters.category === 'delivery') {
                // Per-rider delivery performance (orders, delivered, pending, earnings).
                const params: any = { ...branchParam };
                if (filters.dateFrom) params.date_from = filters.dateFrom;
                if (filters.dateTo) params.date_to = filters.dateTo;
                const res: any = await axiosClient.get('v1/sales/reports/delivery/', { params });
                result = (res.data?.results || []).map((r: any) => ({
                    ...r,
                    name: r.delivery_person,
                    total_amount: r.earnings,
                }));
            }

            const filtered = applyClientFilters(Array.isArray(result) ? result : []);
            setReportResult(filtered);
            if (filtered.length > 0) toast.success(`${filtered.length} Items Found`);
            else toast('No records match the selected filters.', { icon: 'ℹ️' });
        } catch (e) {
            console.error('Report generation failed:', e);
            toast.error('Could not generate report.');
        } finally {
            setGenerating(false);
        }
    };

    // Quick date presets for reports (Daily / Weekly / Monthly / Yearly).
    const applyPreset = (preset: 'today' | 'week' | 'month' | 'year') => {
        const now = new Date();
        const iso = (d: Date) => d.toISOString().split('T')[0];
        let from = new Date(now);
        if (preset === 'today') from = now;
        else if (preset === 'week') from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)); // Monday
        else if (preset === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (preset === 'year') from = new Date(now.getFullYear(), 0, 1);
        setFilters(f => ({ ...f, dateFrom: iso(from), dateTo: iso(now) }));
        setHasGenerated(false);
    };

    const resetFilters = () => {
        setFilters({
            branch: '', category: '', view: '', subView: '',
            dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
            dateTo: new Date().toISOString().split('T')[0],
            productSearch: '', supplierId: '', customerId: '', categoryId: '',
            brandSearch: '', minPrice: '', maxPrice: '', areaSearch: '',
            invoiceNo: '', salesmanSearch: '', reasonSearch: '', accountSearch: '',
        });
        setReportResult([]);
        setProfitSummary(null);
        setCustomerSummary(null);
        setHasGenerated(false);
    };

    const sel = useTableSelection(reportResult, (r) => String(reportResult.indexOf(r)));

    if (loading) return <PageLoader />;

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto">

                <div className="hidden print:block mb-4">
                    <InvoiceHeader docTitle="Reports" date={formatDate(new Date().toISOString())} />
                </div>

                <div className="no-print">
                    <PageHeader
                        title="Reports & Analytics"
                        breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Reports' }]}
                        actions={
                            <>
                                <Button variant="outline" size="sm"
                                    onClick={() => profitSummary
                                        ? exportToExcel([
                                            { metric: 'Total Sales', amount: profitSummary.totalSales },
                                            { metric: 'Sales Returns', amount: profitSummary.salesReturns },
                                            { metric: 'Net Sales', amount: profitSummary.netSales },
                                            { metric: 'Total Purchases', amount: profitSummary.totalPurchases },
                                            { metric: 'Purchase Returns', amount: profitSummary.purchaseReturns },
                                            { metric: 'Net Purchases', amount: profitSummary.netPurchases },
                                            { metric: 'Net Profit', amount: profitSummary.netProfit },
                                        ], 'net-profit', 'Net Profit')
                                        : exportToExcel(reportResult, 'report', 'Report')}
                                    disabled={reportResult.length === 0 && !profitSummary}>
                                    <FileSpreadsheet size={14} /> Export Excel
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => window.print()} disabled={reportResult.length === 0 && !profitSummary}>
                                    <Printer size={14} /> Print / PDF
                                </Button>
                            </>
                        }
                    />
                </div>

                <Card className="p-6 mb-6 no-print">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-end">

                        {/* Super Admin: branch scope comes first — the report follows it. */}
                        {isSuperAdmin && (
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold text-slate-900">Select Branch</label>
                                <select
                                    value={filters.branch}
                                    onChange={e => { setFilters({ ...filters, branch: e.target.value, category: '', view: '', subView: '' }); setHasGenerated(false); setProfitSummary(null); setReportResult([]); }}
                                    className={inputCls}
                                >
                                    <option value="">Select Branch...</option>
                                    <option value="all">All Branches</option>
                                    {assignedWarehouses.map((w: any) => (
                                        <option key={w.id} value={String(w.id)}>{w.name}{w.area_name ? ` · ${w.area_name}` : ''}</option>
                                    ))}
                                    <option value="personal">Personal</option>
                                    <option value="netprofit">Net Profit</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-slate-900">{isNetProfitMode ? 'Select Scope' : '1. Select Category'}</label>
                            <select
                                value={filters.category}
                                onChange={e => { setFilters({ ...filters, category: e.target.value, view: '', subView: '' }); setHasGenerated(false); setProfitSummary(null); }}
                                disabled={isSuperAdmin && !filters.branch}
                                className={inputCls + " disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"}
                            >
                                {isNetProfitMode ? (
                                    <>
                                        <option value="">Select Scope...</option>
                                        <option value="all">All Branches</option>
                                        {assignedWarehouses.map((w: any) => (
                                            <option key={w.id} value={String(w.id)}>{w.name}{w.area_name ? ` · ${w.area_name}` : ''}</option>
                                        ))}
                                        <option value="personal">Personal</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="">{isSuperAdmin && !filters.branch ? 'Select a branch first…' : 'Choose Category...'}</option>
                                        {(filters.branch === 'personal' ? PERSONAL_CATEGORIES : [...CATEGORIES, ...PERSONAL_CATEGORIES, SYSTEM_USER_CATEGORY]).map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                    </>
                                )}
                            </select>
                        </div>

                        {!isNetProfitMode && (
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-slate-900">{filters.category === 'customers' ? '2. Select Customer' : '2. Select View'}</label>
                            <select
                                value={filters.view}
                                onChange={e => { setFilters({ ...filters, view: e.target.value, subView: '' }); setHasGenerated(false); setProfitSummary(null); setCustomerSummary(null); }}
                                disabled={!filters.category}
                                className={inputCls + " disabled:bg-slate-50 disabled:text-slate-400"}
                            >
                                {filters.category === 'customers' ? (
                                    <>
                                        <option value="">Select Customer...</option>
                                        <option value="__all__">All Customers</option>
                                        {customers.map((c: any) => {
                                            const nm = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.full_name || c.username || c.email || 'Customer';
                                            return <option key={c.id} value={`cust:${c.id}`}>{nm}{c.phone ? ` · ${c.phone}` : ''}</option>;
                                        })}
                                    </>
                                ) : (
                                    <>
                                        <option value="">Select Option...</option>
                                        {filters.category && SUB_OPTIONS[filters.category]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </>
                                )}
                            </select>
                        </div>
                        )}

                        {isThreeLevel && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[13px] font-bold text-slate-900">3. Select Filter</label>
                                <select
                                    value={filters.subView}
                                    onChange={e => { setFilters({ ...filters, subView: e.target.value }); setHasGenerated(false); }}
                                    className={inputCls}
                                >
                                    <option value="">{filters.view === 'By Product Name' ? 'Select Product...' : 'Select Mode...'}</option>
                                    {filters.view === 'By Product Name' && filters.category === 'stock' ? (
                                        stocks.map(s => <option key={s.id} value={s.product_name}>{s.product_name}</option>)
                                    ) : (
                                        MODES[filters.view]?.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                    )}
                                </select>
                            </div>
                        )}

                        {activeFields.map((field) => (
                            <div key={field} className="space-y-1.5 animate-in slide-in-from-left-2 duration-300">
                                {field === 'dateRange' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Date Range</label>
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={filters.dateFrom} onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setHasGenerated(false); }} className={inputCls + " min-w-0 flex-1 px-2"} />
                                            <span className="text-[12px] font-bold text-slate-400 shrink-0">to</span>
                                            <input type="date" value={filters.dateTo} onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setHasGenerated(false); }} className={inputCls + " min-w-0 flex-1 px-2"} />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {([['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year']] as const).map(([key, label]) => (
                                                <button key={key} type="button" onClick={() => applyPreset(key)}
                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {field === 'supplierId' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Select Supplier</label>
                                        <select value={filters.supplierId} onChange={e => { setFilters({ ...filters, supplierId: e.target.value }); setHasGenerated(false); }} className={inputCls}>
                                            <option value="">All Suppliers</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </>
                                )}
                                {field === 'categoryId' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Select Category</label>
                                        <select value={filters.categoryId} onChange={e => { setFilters({ ...filters, categoryId: e.target.value }); setHasGenerated(false); }} className={inputCls}>
                                            <option value="">All Categories</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </>
                                )}
                                {field === 'priceRange' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Price Range</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => { setFilters({ ...filters, minPrice: e.target.value }); setHasGenerated(false); }} className={inputCls + " min-w-0 flex-1"} />
                                            <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => { setFilters({ ...filters, maxPrice: e.target.value }); setHasGenerated(false); }} className={inputCls + " min-w-0 flex-1"} />
                                        </div>
                                    </>
                                )}
                                {field === 'customerId' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Search Customer</label>
                                        <input placeholder="Search name/ID..." value={filters.customerId} onChange={e => { setFilters({ ...filters, customerId: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'invoiceNo' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Invoice Number</label>
                                        <input placeholder="e.g. INV-001" value={filters.invoiceNo} onChange={e => { setFilters({ ...filters, invoiceNo: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'brandSearch' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Brand</label>
                                        <input placeholder="Search brand..." value={filters.brandSearch} onChange={e => { setFilters({ ...filters, brandSearch: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'areaSearch' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Area</label>
                                        <input placeholder="Search area/city..." value={filters.areaSearch} onChange={e => { setFilters({ ...filters, areaSearch: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'salesmanSearch' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Salesman</label>
                                        <input placeholder="Search salesman..." value={filters.salesmanSearch} onChange={e => { setFilters({ ...filters, salesmanSearch: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'reasonSearch' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Reason</label>
                                        <input placeholder="Search reason..." value={filters.reasonSearch} onChange={e => { setFilters({ ...filters, reasonSearch: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'accountSearch' && (
                                    <>
                                        <label className="text-[13px] font-bold text-slate-900">Account</label>
                                        <input placeholder="Search account..." value={filters.accountSearch} onChange={e => { setFilters({ ...filters, accountSearch: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                            </div>
                        ))}

                        <div className="flex items-end gap-2">
                            <Button
                                variant="primary"
                                onClick={generateReport}
                                disabled={generating || (isNetProfitMode ? !filters.category : !filters.view)}
                                className="flex-1"
                            >
                                <BarChart3 className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                                {NAV_VIEWS[filters.view] ? 'Open Report' : 'Generate Report'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={resetFilters}
                                disabled={generating}
                                title="Clear all filters"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Reset
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* ── CUSTOMER PROFILE SUMMARY (when a specific customer is picked) ── */}
                {customerSummary && (
                    <div className="animate-in fade-in duration-500 mb-6">
                        <Card className="overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 text-[16px] font-black">
                                    {(customerSummary.name || 'C').slice(0, 1).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-[16px] font-bold text-slate-900">{customerSummary.name}</h3>
                                    <p className="text-[12px] text-slate-500 truncate">{customerSummary.phone} · {customerSummary.email}{customerSummary.address !== '—' ? ` · ${customerSummary.address}` : ''}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100">
                                {[
                                    { label: 'Total Bought', value: formatCurrency(customerSummary.totalBought), tone: 'text-slate-900' },
                                    { label: 'Total Paid', value: formatCurrency(customerSummary.totalPaid), tone: 'text-emerald-600' },
                                    { label: 'Dues', value: formatCurrency(customerSummary.dues), tone: customerSummary.dues > 0 ? 'text-rose-600' : 'text-slate-900' },
                                    { label: 'Orders', value: String(customerSummary.allOrders), tone: 'text-slate-900' },
                                    { label: 'Delivered', value: String(customerSummary.delivered), tone: 'text-emerald-600' },
                                    { label: 'Last Order', value: customerSummary.lastOrder ? formatDate(customerSummary.lastOrder) : '—', tone: 'text-slate-700' },
                                ].map((m) => (
                                    <div key={m.label} className="px-5 py-4 text-center">
                                        <p className={`text-[18px] font-black tabular-nums ${m.tone}`}>{m.value}</p>
                                        <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{m.label}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {profitSummary ? (
                    <div className="animate-in fade-in duration-500">
                        <Card className="overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><DollarSign size={20} /></span>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900">Net Profit</h3>
                                    <p className="text-[12px] text-slate-500">
                                        {profitSummary.personal
                                            ? 'Personal'
                                            : (effectiveBranch && effectiveBranch !== 'all'
                                                ? (warehouses.find((w: any) => String(w.id) === String(effectiveBranch))?.name || 'Branch')
                                                : 'All Branches')} · {filters.dateFrom} → {filters.dateTo}
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-emerald-50/60 border-b border-slate-100 text-[12px] font-bold text-emerald-700 uppercase tracking-wider">{profitSummary.personal ? 'Income' : 'Sales'}</div>
                                        <div className="divide-y divide-slate-100">
                                            <ProfitRow label={profitSummary.personal ? 'Total Income' : 'Total Sales'} value={profitSummary.totalSales} sub={`${profitSummary.counts.sales} ${profitSummary.personal ? 'entry(s)' : 'order(s)'}`} />
                                            {!profitSummary.personal && <ProfitRow label="Sales Returns" value={profitSummary.salesReturns} sub={`${profitSummary.counts.salesReturns} return(s)`} neg />}
                                            <ProfitRow label={profitSummary.personal ? 'Net Income' : 'Net Sales'} value={profitSummary.netSales} bold />
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-amber-50/60 border-b border-slate-100 text-[12px] font-bold text-amber-700 uppercase tracking-wider">{profitSummary.personal ? 'Expense' : 'Purchases'}</div>
                                        <div className="divide-y divide-slate-100">
                                            <ProfitRow label={profitSummary.personal ? 'Total Expense' : 'Total Purchases'} value={profitSummary.totalPurchases} sub={`${profitSummary.counts.purchases} ${profitSummary.personal ? 'entry(s)' : 'order(s)'}`} />
                                            {!profitSummary.personal && <ProfitRow label="Purchase Returns" value={profitSummary.purchaseReturns} sub={`${profitSummary.counts.purchaseReturns} return(s)`} neg />}
                                            <ProfitRow label={profitSummary.personal ? 'Net Expense' : 'Net Purchases'} value={profitSummary.netPurchases} bold />
                                        </div>
                                    </div>
                                </div>
                                <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${profitSummary.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                    <div>
                                        <p className="text-[12px] font-bold uppercase tracking-wider text-slate-600">Net Profit</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{profitSummary.personal ? 'Income − Expense' : 'Net Sales − Net Purchases'}</p>
                                    </div>
                                    <p className={`text-[26px] font-black tabular-nums ${profitSummary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(profitSummary.netProfit)}</p>
                                </div>
                            </div>
                        </Card>
                        <style jsx global>{`@media print { .no-print { display: none !important; } @page { margin: 1.5cm; } }`}</style>
                    </div>
                ) : reportResult.length > 0 ? (
                    <div className="animate-in fade-in duration-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 mb-4 no-print">
                             <div className="flex items-center gap-2">
                                 <CheckCircle className="text-emerald-600 h-4 w-4" />
                                 <p className="text-[13px] text-slate-600 font-medium">
                                     Report Summary: <span className="font-bold text-slate-900">{reportResult.length} Items Found</span>
                                 </p>
                             </div>
                             <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                 <div className="text-[13px] text-slate-600 font-medium">
                                     Total Amount: <span className="text-indigo-600 font-black tabular-nums">{formatCurrency(reportResult.reduce((s, r) => s + rowAmount(r), 0))}</span>
                                 </div>
                                 <div className="text-[13px] text-slate-600 font-medium">
                                     Total Quantity: <span className="text-slate-900 font-black tabular-nums">{reportResult.reduce((s, r) => s + rowQty(r), 0)}</span>
                                 </div>
                             </div>
                         </div>

                         <Card className="overflow-x-auto no-print">
                             <table className="w-full text-left border-collapse">
                                 <thead>
                                     <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                         <SelectAllTh sel={sel} />
                                         <th className="px-4 py-2.5 w-16">ID</th>
                                         <th className="px-4 py-2.5 w-28">Date</th>
                                         <th className="px-4 py-2.5">Details / Description</th>
                                         <th className="px-4 py-2.5 text-center w-20">Status</th>
                                         <th className="px-4 py-2.5 text-right w-32">Amount</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {reportResult.map((row, idx) => (
                                         <tr key={idx} className="hover:bg-slate-50 transition-colors group text-[10px]">
                                             <RowCheckboxTd sel={sel} id={String(idx)} />
                                             <td className="px-4 py-2 font-bold text-indigo-600 tabular-nums">
                                                 #{row.return_number || row.order_number || row.id?.toString().slice(0, 8) || idx + 1}
                                             </td>
                                             <td className="px-4 py-2 text-slate-500 font-medium">
                                                 {formatDate(rowDateVal(row))}
                                             </td>
                                             <td className="px-4 py-2">
                                                 <div className="text-slate-900 font-bold uppercase tracking-tight text-[10.5px]">{rowTitle(row)}</div>
                                                 <div className="text-[9px] text-slate-400 mt-0.5 font-medium italic">
                                                     {rowSubtitle(row, filters.category)}
                                                 </div>
                                             </td>
                                             <td className="px-4 py-2 text-center">
                                                 <Badge tone={row.status === 'Completed' || row.status === 'Paid' || row.is_active ? 'green' : 'neutral'}>
                                                     {row.status || (row.is_active ? 'Active' : 'Pending')}
                                                 </Badge>
                                             </td>
                                             <td className="px-4 py-2 text-right">
                                                 <div className="font-black text-slate-900 text-[11px] tabular-nums">{formatCurrency(rowAmount(row))}</div>
                                                 {rowQty(row) > 0 && (
                                                     <div className="text-[8.5px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5 italic tabular-nums">Qty: {rowQty(row)}</div>
                                                 )}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </Card>

                        <div className="no-print">
                            <BulkBar
                                sel={sel}
                                entity="rows"
                                onExport={() => exportToCSV(
                                    sel.selectedItems.map((row: any) => ({
                                        id: row.return_number || row.order_number || (row.id != null ? String(row.id).slice(0, 8) : ''),
                                        date: formatDate(rowDateVal(row)),
                                        details: rowTitle(row),
                                        description: rowSubtitle(row, filters.category),
                                        status: row.status || (row.is_active ? 'Active' : 'Pending'),
                                        amount: rowAmount(row),
                                        quantity: rowQty(row),
                                    })),
                                    'report-selection.csv',
                                )}
                            />
                        </div>

                        {/* ── PRINT ONLY INVOICE STYLE REPORT ── */}
                        <div className="hidden print:block bg-white p-2">
                            {/* Metadata */}
                            <div className="grid grid-cols-4 gap-8 mb-10 border-y-2 border-black py-6">
                                <div className="col-span-2">
                                    <h3 className="text-[9px] font-black text-[#bbb] uppercase mb-3 tracking-widest border-b border-[#eee] pb-1">Report Logic</h3>
                                    <p className="text-[16px] font-black text-black leading-none">{filters.view} {filters.subView ? `/ ${filters.subView}` : ''}</p>
                                    <p className="text-[11px] text-gray-400 mt-2 italic">Official distribution summary for {filters.category} department.</p>
                                </div>
                                <div>
                                    <h3 className="text-[9px] font-black text-[#bbb] uppercase mb-3 tracking-widest border-b border-[#eee] pb-1">Report Period</h3>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-[#565959] font-bold">Timeline Coverage</p>
                                        <p className="text-[12px] font-black text-black">{filters.dateFrom} TO {filters.dateTo}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-[9px] font-black text-[#bbb] uppercase mb-3 tracking-widest border-b border-[#eee] pb-1">Dataset Status</h3>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-[#565959] font-bold">Volume Found</p>
                                        <div className="inline-block px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                                            {reportResult.length} RECORDS
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Report Table */}
                            <div className="mb-10 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-[1px] border-black text-[8.5px] font-black uppercase tracking-[0.2em] text-black bg-gray-50">
                                            <th className="py-3 px-2 w-12 text-center">#</th>
                                            <th className="py-3 px-3 w-28">Date</th>
                                            <th className="py-3 px-3">Description of Record</th>
                                            <th className="py-3 px-3 text-center w-20">Status</th>
                                            <th className="py-3 px-3 text-right w-32">Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[9px]">
                                        {reportResult.map((row, i) => (
                                            <tr key={i} className="border-b-[0.5px] border-gray-100">
                                                <td className="py-2 px-1 text-center text-gray-500 font-bold">{i + 1}</td>
                                                <td className="py-2 px-2 font-bold">{formatDate(rowDateVal(row))}</td>
                                                <td className="py-2 px-2">
                                                    <div className="font-black text-black uppercase text-[10px] tracking-tight">{rowTitle(row)}</div>
                                                    <div className="text-[8.5px] text-gray-500 mt-1 font-bold">
                                                        {rowSubtitle(row, filters.category)}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <span className="font-black uppercase text-[7.5px] bg-gray-100 px-2 py-0.5">
                                                        {row.status || (row.is_active ? 'Active' : 'N/A')}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 text-right font-black text-black text-[11px]">
                                                    {formatCurrency(rowAmount(row))}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Grand Total Row */}
                                        <tr className="border-t-[1px] border-black font-black text-black bg-gray-50/30">
                                            <td colSpan={4} className="py-5 px-4 text-right text-[9px] uppercase tracking-[0.3em]">Aggregate Total</td>
                                            <td className="py-5 px-2 text-right text-[14px]">
                                                {formatCurrency(reportResult.reduce((s, r) => s + rowAmount(r), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Branded stationery footer */}
                            <InvoiceFooter pinned={false} />
                        </div>

                        <style jsx global>{invoiceStyles}</style>
                        <style jsx global>{`
                            @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
                            
                            @media print {
                                .no-print { display: none !important; }
                                html, body { height: auto !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; background: white !important; }
                                .max-w-[1440px] { max-width: 100% !important; padding: 0 !important; margin: 0 !important; height: auto !important; overflow: visible !important; }
                                @page { margin: 1.5cm; }
                                .hidden.print\\:block { display: block !important; height: auto !important; overflow: visible !important; }
                            }

                            .urdu-text {
                                font-family: 'Noto Nastaliq Urdu', serif;
                                font-weight: 700;
                                line-height: 2.4;
                            }
                        `}</style>
                    </div>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-28 text-center px-10 no-print">
                        <div className="mb-4">
                            {hasGenerated ? <AlertTriangle size={60} className="mx-auto text-amber-400" /> : <BarChart3 size={60} className="mx-auto text-slate-300" />}
                        </div>
                        <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">
                            {hasGenerated ? "No items found for this selection." : "Report Generator"}
                        </h3>
                        <p className="text-[13px] text-slate-600 mt-2 max-w-sm leading-relaxed">
                            {hasGenerated
                                ? "We couldn't find any data matching your criteria. Please adjust your filters and try again."
                                : "Select your filters above and click **Generate Report** to see the results."
                            }
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function MasterReportsEngine() {
    return (
        <Suspense fallback={<PageLoader />}>
            <ReportsEngineInner />
        </Suspense>
    );
}
