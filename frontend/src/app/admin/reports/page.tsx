'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import {
    BarChart3, Calendar, RefreshCw, Printer, FileStack, FileSpreadsheet,
    ListFilter, Search, Download, ClipboardList, Info, CheckCircle,
    ChevronRight, ChevronLeft, LayoutDashboard, AlertTriangle, Clock,
    User, CreditCard, ShoppingBag, Package, Boxes, TrendingUp, RotateCcw,
    Truck, Building2, Tag, DollarSign
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    productService, orderService, userService,
    purchaseService, supplierService, categoryService,
    paymentService
} from '@/lib/api';
import { inventoryService } from '@/services/inventory.service';
import { exportToCSV, formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - MANUAL REPORT GENERATOR
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] shadow-sm',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111] shadow-sm',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] ${styles[variant as keyof typeof styles]} ${className}`}>
            {children}
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all font-medium";

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
    'Online Sales': ['By Date Range', 'By Invoice No', 'By Customer', 'By Salesman'],
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
};

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

    const generateReport = async () => {
        if (!filters.category || !filters.view) {
            toast.error('Please select both Category and View.');
            return;
        }

        setGenerating(true);
        setHasGenerated(true);
        try {
            const params: any = {
                category: filters.categoryId || undefined,
                supplier: filters.supplierId || undefined,
                start_date: filters.dateFrom,
                end_date: filters.dateTo,
                search: ((filters.subView !== 'Low Stock' && filters.subView !== 'Out of Stock' ? filters.subView : '') ||
                    filters.areaSearch || filters.invoiceNo ||
                    filters.salesmanSearch || filters.brandSearch || filters.customerId ||
                    filters.reasonSearch || filters.accountSearch).trim() || undefined,
                status: (filters.subView === 'Low Stock' || filters.view === 'Low Stock') ? 'LOW' :
                    (filters.subView === 'Out of Stock' || filters.view === 'Out of Stock') ? 'OUT' : undefined,
                market: filters.view === 'Offline Sales' ? 'POS' : filters.view === 'Online Sales' ? 'Online' : undefined,
                payment_type: filters.view === 'Sales Payment' ? 'sale' : filters.view === 'Purchase Payment' ? 'purchase' : undefined,
                user_type: filters.view === 'Walk-in Customer' ? 'guest' : filters.view === 'Registered Customer' ? 'registered' : undefined,
                role: filters.category === 'customers' ? 'customer' : filters.category === 'suppliers' ? 'supplier' : undefined,
                min_price: filters.minPrice || undefined,
                max_price: filters.maxPrice || undefined,
                no_pagination: 'true'
            };

            let result = [];
            if (filters.category === 'stock' || filters.category === 'products') {
                const res: any = await inventoryService.getInventory(params);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'sales') {
                const res: any = await orderService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'returns' && filters.view === 'Sales Returns') {
                const { data } = await (await import('@/lib/axios')).default.get('v1/sales/returns/', { params });
                result = data.results || data || [];
            } else if (filters.category === 'customers' || filters.category === 'suppliers') {
                const res: any = await userService.getAll(params);
                const role = filters.category === 'customers' ? 'customer' : 'supplier';
                result = Array.isArray(res)
                    ? res.filter((u: any) => u.role === role || u.role_name === role)
                    : (res.results || []).filter((u: any) => u.role === role || u.role_name === role);
            } else if (filters.category === 'purchases') {
                const res: any = await purchaseService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.category === 'returns' && filters.view === 'Purchase Returns') {
                const { data } = await (await import('@/lib/axios')).default.get('v1/sales/purchase-returns/', { params });
                result = data.results || data || [];
            } else if (filters.category === 'payments') {
                const res: any = await paymentService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            }

            setReportResult(result);
            if (result.length > 0) toast.success(`${result.length} Items Found`);
        } catch {
            toast.error('Could not generate report.');
        } finally {
            setGenerating(false);
        }
    };

    const isThreeLevel = !!MODES[filters.view];
    const activeFields = isThreeLevel
        ? (filters.subView ? (VIEW_FIELDS[filters.subView] || []) : [])
        : (filters.view ? (VIEW_FIELDS[filters.view] || []) : []);

    if (loading) return <PageLoader />;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1440px] mx-auto px-6 pt-5">

                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2 no-print">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500] font-bold uppercase tracking-tight">Report Center</span>
                </div>

                <div className="flex items-center justify-between mb-4 no-print">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-[#111] h-5 w-5" />
                        <h1 className="text-[22px] font-normal text-[#111]">Reports & Analytics</h1>
                    </div>
                    <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => exportToCSV(reportResult, 'Report.csv')} disabled={reportResult.length === 0}>
                            <FileSpreadsheet size={14} /> Export CSV
                        </Btn>
                        <Btn variant="secondary" onClick={() => window.print()} disabled={reportResult.length === 0}>
                            <Printer size={14} /> Print Report
                        </Btn>
                    </div>
                </div>
                <div className="border-b border-[#ddd] mb-6 no-print" />

                <div className="bg-white border border-[#ddd] rounded-[4px] p-6 mb-6 shadow-sm no-print">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-end">

                        <div className="space-y-1.5">
                            <label className="text-[13px] font-bold text-[#0f1111]">1. Select Category</label>
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
                            <label className="text-[13px] font-bold text-[#0f1111]">2. Select View</label>
                            <select
                                value={filters.view}
                                onChange={e => { setFilters({ ...filters, view: e.target.value, subView: '' }); setHasGenerated(false); }}
                                disabled={!filters.category}
                                className={inputCls + " disabled:bg-[#f7f8fa]"}
                            >
                                <option value="">Select Option...</option>
                                {filters.category && SUB_OPTIONS[filters.category]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {isThreeLevel && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[13px] font-bold text-[#0f1111]">3. Select Filter</label>
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
                                        <label className="text-[13px] font-bold text-[#0f1111]">Date Range</label>
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={filters.dateFrom} onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                            <span className="text-[12px] font-bold text-[#565959]">to</span>
                                            <input type="date" value={filters.dateTo} onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                        </div>
                                    </>
                                )}
                                {field === 'supplierId' && (
                                    <>
                                        <label className="text-[13px] font-bold text-[#0f1111]">Select Supplier</label>
                                        <select value={filters.supplierId} onChange={e => { setFilters({ ...filters, supplierId: e.target.value }); setHasGenerated(false); }} className={inputCls}>
                                            <option value="">All Suppliers</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </>
                                )}
                                {field === 'categoryId' && (
                                    <>
                                        <label className="text-[13px] font-bold text-[#0f1111]">Select Category</label>
                                        <select value={filters.categoryId} onChange={e => { setFilters({ ...filters, categoryId: e.target.value }); setHasGenerated(false); }} className={inputCls}>
                                            <option value="">All Categories</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </>
                                )}
                                {field === 'priceRange' && (
                                    <>
                                        <label className="text-[13px] font-bold text-[#0f1111]">Price Range</label>
                                        <div className="flex items-center gap-2">
                                            <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => { setFilters({ ...filters, minPrice: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                            <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => { setFilters({ ...filters, maxPrice: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                        </div>
                                    </>
                                )}
                                {field === 'customerId' && (
                                    <>
                                        <label className="text-[13px] font-bold text-[#0f1111]">Search Customer</label>
                                        <input placeholder="Search name/ID..." value={filters.customerId} onChange={e => { setFilters({ ...filters, customerId: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                                {field === 'invoiceNo' && (
                                    <>
                                        <label className="text-[13px] font-bold text-[#0f1111]">Invoice Number</label>
                                        <input placeholder="e.g. INV-001" value={filters.invoiceNo} onChange={e => { setFilters({ ...filters, invoiceNo: e.target.value }); setHasGenerated(false); }} className={inputCls} />
                                    </>
                                )}
                            </div>
                        ))}

                        <div className="flex items-end">
                            <button
                                onClick={generateReport}
                                disabled={generating || !filters.view}
                                className="w-full h-[31px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] rounded-[3px] font-bold text-[13px] shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <BarChart3 className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                                Generate Report
                            </button>
                        </div>
                    </div>
                </div>

                {reportResult.length > 0 ? (
                    <div className="animate-in fade-in duration-700">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="text-green-600 h-4 w-4" />
                                <p className="text-[13px] text-[#565959] font-medium">
                                    Report Summary: <span className="font-bold text-[#111]">{reportResult.length} Items Found</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-[13px] text-[#565959] font-medium">
                                    Total Amount: <span className="text-[#B12704] font-black">{formatCurrency(reportResult.reduce((s, r) => s + Number(r.price_per_item || r.total_amount || r.total_refund_amount || r.price || 0), 0))}</span>
                                </div>
                                <div className="text-[13px] text-[#565959] font-medium">
                                    Total Quantity: <span className="text-[#111] font-black">{reportResult.reduce((s, r) => s + Number(r.total_quantity || r.stock_quantity || r.quantity || 0), 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[11px] font-bold text-[#565959] uppercase tracking-wider">
                                        <th className="px-6 py-3">ID</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Details</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {reportResult.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                            <td className="px-6 py-4 font-bold text-[#007185]">
                                                #{row.return_number || row.order_number || row.id?.toString().slice(0, 8) || idx + 1}
                                            </td>
                                            <td className="px-6 py-4 text-[#565959] font-medium">
                                                {formatDate(row.created_at || row.order_date || row.date_joined || row.updated_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[#111] font-bold uppercase">{row.product_name || row.company || row.name || row.customer_name || row.supplier_name || row.full_name || row.username || 'Record'}</div>
                                                <div className="text-[11px] text-[#565959] mt-0.5">
                                                    {row.reason || row.tracking_id || (row.warehouse_name ? `Warehouse: ${row.warehouse_name}` : row.city && row.country ? `${row.city}, ${row.country}` : filters.category)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase border ${row.status === 'Completed' || row.status === 'Paid' || row.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {row.status || (row.is_active ? 'Active' : 'Pending')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-[#B12704]">{formatCurrency(row.price_per_item || row.total_amount || row.total_refund_amount || row.price || row.selling_price || 0)}</div>
                                                {(row.total_quantity !== undefined || row.stock_quantity !== undefined || row.quantity !== undefined || (row.items && row.items.length > 0)) && (
                                                    <div className="text-[10px] text-[#565959] font-bold uppercase">Qty: {row.total_quantity || row.stock_quantity || row.quantity || row.items?.length || 0}</div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-28 bg-white border border-[#ddd] rounded-[4px] text-center px-10 shadow-sm">
                        <div className="opacity-10 mb-4">
                            {hasGenerated ? <AlertTriangle size={60} className="mx-auto text-orange-500" /> : <BarChart3 size={60} className="mx-auto" />}
                        </div>
                        <h3 className="text-[16px] font-bold text-[#111]">
                            {hasGenerated ? "No items found for this selection." : "Report Generator"}
                        </h3>
                        <p className="text-[13px] text-[#565959] mt-2 max-w-sm leading-relaxed">
                            {hasGenerated
                                ? "We couldn't find any data matching your criteria. Please adjust your filters and try again."
                                : "Select your filters above and click **Generate Report** to see the results."
                            }
                        </p>
                    </div>
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
