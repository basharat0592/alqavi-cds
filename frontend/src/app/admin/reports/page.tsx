'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import {
    BarChart3, Calendar, Printer, FileStack, FileSpreadsheet,
    ListFilter, Search, Download, ClipboardList, Info, CheckCircle,
    ChevronRight, ChevronLeft, LayoutDashboard, AlertTriangle, Clock,
    User, CreditCard, ShoppingBag, Package, Boxes, TrendingUp, RotateCcw,
    Truck, Building2, Tag, DollarSign
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    productService, orderService,
    purchaseService, supplierService, categoryService
} from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';
import { companyService } from '@/services/company.service';
import { exportToCSV, formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - MANUAL REPORT GENERATOR
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;

const CATEGORIES = [
    { id: 'sales', label: 'Sale Order' },
    { id: 'purchases', label: 'Purchase Order' },
    { id: 'customers', label: 'Customers' },
    { id: 'returns', label: 'Returns' },
    { id: 'payments', label: 'Payments' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'products', label: 'Products' },
    { id: 'stock', label: 'Stock' },
];

const SUB_OPTIONS: Record<string, string[]> = {
    sales: ['Offline Sales', 'Online Sales'],
    purchases: ['Purchase Order By Date', 'Purchase Order By Invoice', 'By Supplier'],
    customers: ['Walk-in Customer', 'Registered Customer'],
    returns: ['Sales Returns', 'Purchase Returns'],
    payments: ['Sales Payment', 'Purchase Payment'],
    suppliers: ['All Suppliers', 'By Category', 'Outstanding Balance'],
    products: ['All Products', 'By Category', 'By Supplier', 'By Price Range'],
    stock: ['By Date Range', 'Stock Status', 'By Product Name', 'By Supplier', 'By Price Range', 'By Brand'],
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
};

/* Defensive field readers — report rows come from many different endpoints. */
const rowDateVal = (r: any) => r.created_at || r.order_date || r.date || r.return_date || r.purchase_date || r.date_joined || r.updated_at || null;
const rowAmount = (r: any) => Number(r.total_amount ?? r.total_refund_amount ?? r.grand_total ?? r.price_per_item ?? r.price ?? r.selling_price ?? 0);
const rowQty = (r: any): number => {
    if (Array.isArray(r.items) && r.items.length) return r.items.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
    return Number(r.total_quantity ?? r.stock_quantity ?? r.quantity ?? 0);
};
const rowTitle = (r: any) =>
    r.product_name || r.company ||
    [r.first_name, r.last_name].filter(Boolean).join(' ').trim() ||
    r.name || r.customer_display_name || r.customer_name || r.supplier_name || r.full_name || r.username || 'Record';
const rowSubtitle = (r: any, category: string) =>
    r.return_number || r.order_number || r.purchase_number ||
    (r.warehouse_name ? `Warehouse: ${r.warehouse_name}` : '') ||
    r.reason || r.phone || r.email || r.tracking_id || category;

function ReportsEngineInner() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);

    const [filters, setFilters] = useState({
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

    const loadMeta = useCallback(async () => {
        try {
            const [s, c, st] = await Promise.all([
                supplierService.getAll({ no_pagination: 'true' }),
                categoryService.getAll({ no_pagination: 'true' }),
                inventoryService.getInventory({ no_pagination: 'true' })
            ]);
            setSuppliers(Array.isArray(s) ? s : (s as any).results || []);
            setCategories(Array.isArray(c) ? c : (c as any).results || []);
            setStocks(st || []);
        } catch { console.error('Meta sync failure'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadMeta(); }, [loadMeta]);

    const isThreeLevel = !!MODES[filters.view];
    const activeFields = isThreeLevel
        ? (filters.subView ? (VIEW_FIELDS[filters.subView] || []) : [])
        : (filters.view ? (VIEW_FIELDS[filters.view] || []) : []);

    // Apply the selected filters on the client. The backend ignores several params
    // (e.g. date *ranges* on orders), so we narrow the fully-fetched dataset here to
    // guarantee every visible filter actually works.
    const applyClientFilters = (rows: any[]): any[] => {
        let out = Array.isArray(rows) ? [...rows] : [];
        const mode = isThreeLevel ? filters.subView : filters.view;

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
        if (!filters.category || !filters.view) {
            toast.error('Please select both Category and View.');
            return;
        }

        setGenerating(true);
        setHasGenerated(true);
        try {
            // Fetch the COMPLETE dataset for the chosen category, then apply every
            // visible filter on the client. No narrowing server params are sent, so a
            // backend that ignores (or mismatches) a param can never silently empty the
            // result before the client filters run.
            const all = { no_pagination: 'true' };
            const axiosClient = (await import('@/lib/axios')).default;
            let result: any[] = [];

            if (filters.category === 'products') {
                const res: any = await productService.getAll(all);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'stock') {
                const res: any = await inventoryService.getInventory(all);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'sales') {
                const res: any = await orderService.getAll(all);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'purchases') {
                const res: any = await purchaseService.getAll(all);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'customers') {
                result = await companyService.getCustomers();
            } else if (filters.category === 'suppliers') {
                result = await companyService.getSuppliers();
            } else if (filters.category === 'returns' && filters.view === 'Sales Returns') {
                const { data } = await axiosClient.get('v1/sales/returns/', { params: all });
                result = data.results || data || [];
            } else if (filters.category === 'returns' && filters.view === 'Purchase Returns') {
                const { data } = await axiosClient.get('v1/sales/purchase-returns/', { params: all });
                result = data.results || data || [];
            } else if (filters.category === 'payments' && filters.view === 'Sales Payment') {
                // Sales payments are derived from real orders (amount = order total).
                const res: any = await orderService.getAll(all);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'payments' && filters.view === 'Purchase Payment') {
                // Purchase payments are derived from purchase orders (amount = paid amount).
                const res: any = await purchaseService.getAll(all);
                result = (Array.isArray(res) ? res : res.results || [])
                    .map((r: any) => ({ ...r, total_amount: r.paid_amount ?? r.total_amount }));
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

    const resetFilters = () => {
        setFilters({
            category: '', view: '', subView: '',
            dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
            dateTo: new Date().toISOString().split('T')[0],
            productSearch: '', supplierId: '', customerId: '', categoryId: '',
            brandSearch: '', minPrice: '', maxPrice: '', areaSearch: '',
            invoiceNo: '', salesmanSearch: '', reasonSearch: '', accountSearch: '',
        });
        setReportResult([]);
        setHasGenerated(false);
    };

    if (loading) return <PageLoader />;

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto">

                <div className="no-print">
                    <PageHeader
                        title="Reports & Analytics"
                        breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Reports' }]}
                        actions={
                            <>
                                <Button variant="outline" size="sm" onClick={() => exportToCSV(reportResult, 'Report.csv')} disabled={reportResult.length === 0}>
                                    <FileSpreadsheet size={14} /> Export CSV
                                </Button>
                                <Button variant="primary" size="sm" onClick={() => window.print()} disabled={reportResult.length === 0}>
                                    <Printer size={14} /> Print Report
                                </Button>
                            </>
                        }
                    />
                </div>

                <Card className="p-6 mb-6 no-print">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-end">

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-slate-900">1. Select Category</label>
                            <select
                                value={filters.category}
                                onChange={e => { setFilters({ ...filters, category: e.target.value, view: '', subView: '' }); setHasGenerated(false); }}
                                className={inputCls}
                            >
                                <option value="">Choose Category...</option>
                                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-slate-900">2. Select View</label>
                            <select
                                value={filters.view}
                                onChange={e => { setFilters({ ...filters, view: e.target.value, subView: '' }); setHasGenerated(false); }}
                                disabled={!filters.category}
                                className={inputCls + " disabled:bg-slate-50 disabled:text-slate-400"}
                            >
                                <option value="">Select Option...</option>
                                {filters.category && SUB_OPTIONS[filters.category]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

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
                                disabled={generating || !filters.view}
                                className="flex-1"
                            >
                                <BarChart3 className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                                Generate Report
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

                {reportResult.length > 0 ? (
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

                        {/* ── PRINT ONLY INVOICE STYLE REPORT ── */}
                        <div className="hidden print:block bg-white p-2">
                            {/* Visual Header */}
                            <div className="flex justify-between items-start mb-10">
                                <div className="w-1/3">
                                    <Logo size="lg" className="!items-start" />
                                </div>

                                <div className="w-1/3 text-center">
                                    <h1 className="text-[32px] font-bold leading-[1.8] mb-1 text-[#111] urdu-text">
                                        القوی ٹریڈرز
                                    </h1>
                                    <p className="text-[11px] font-bold text-[#565959] uppercase tracking-widest urdu-text">
                                        کاسمیٹکس ڈیلر گلگت بلتستان
                                    </p>
                                </div>

                                <div className="w-1/3 text-right">
                                    <h2 className="text-[20px] font-black uppercase tracking-tighter text-[#111]">Report Console</h2>
                                    <div className="text-[11px] text-gray-500 mt-2 space-y-0.5 font-medium">
                                        <p>Syed Sakhawat & Associates</p>
                                        <p>0313-8692190 | 0335-1240190</p>
                                    </div>
                                    <p className="text-[13px] text-[#111] font-bold mt-4 tracking-tight uppercase">Category: {filters.category}</p>
                                    <p className="text-[11px] text-[#565959] font-medium">Generated: {formatDate(new Date().toISOString())}</p>
                                </div>
                            </div>

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

                            {/* Urdu Footer Note */}
                            <div className="mb-12 px-1">
                                <p className="text-[10px] leading-[2.1] text-justify text-[#444] urdu-text" dir="rtl">
                                    <span className="font-black border-b-2 ml-3 text-[14px]">نوٹ:-</span>
                                    یہ رپورٹ القوی ٹریڈرز کے آفیشل ڈیٹا بیس سے تیار کی گئی ہے۔ تمام دکاندار اور سپلائرز حضرات بل یا رپورٹ میں کسی بھی قسم کی کمی بیشی کی صورت میں فوری طور پر ہیڈ آفس سے رابطہ کریں۔ بغیر دستخط اور مہر کے یہ رپورٹ قانونی طور پر قابلِ قبول نہیں ہوگی۔ القوی ٹریڈرز گلگت کے ساتھ تعاون کا شکریہ--
                                </p>
                            </div>

                            {/* Signatures */}
                            <div className="mt-20 pt-12 border-t-2 border-dashed border-black">
                                <div className="flex justify-between items-start gap-32">
                                    <div className="flex-1 space-y-3">
                                        <p className="text-[12px] font-bold text-gray-500">Authorized Distribution Signature</p>
                                        <div className="w-full border-b border-black pt-8"></div>
                                        <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2">Reports In-charge</p>
                                    </div>
                                    <div className="flex-1 space-y-3 text-right">
                                        <p className="text-[12px] font-bold text-gray-500">Managing Director Stamp</p>
                                        <div className="w-full border-b border-black pt-8"></div>
                                        <p className="text-[13px] font-black uppercase tracking-widest text-black pt-2">Verification Area</p>
                                    </div>
                                </div>

                                <div className="mt-16 text-center border-t border-slate-100 pt-6">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">
                                        System Generated Official Report • Al-Qavi Traders Gilgit
                                    </p>
                                </div>
                            </div>
                        </div>

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
