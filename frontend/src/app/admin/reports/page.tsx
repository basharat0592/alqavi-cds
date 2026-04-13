'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
// ... (rest of imports)

// ... (inside the component)
import {
    BarChart3, Calendar, RefreshCw, Printer, FileStack, FileSpreadsheet,
    ListFilter, Search, Download, ClipboardList, Info, CheckCircle
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { productService, orderService, userService, purchaseService } from '@/lib/api';
import { exportToCSV, formatCurrency, formatDate } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════
   TYPES & MAPPINGS
   ═══════════════════════════════════════════════ */
type ReportType = 'stock' | 'adjustments' | 'purchases' | 'sales' | 'sales_statements' | 'accounting';

const CATEGORIES = [
    { id: 'stock', label: 'Reports Stock' },
    { id: 'adjustments', label: 'Opening / Damage / Short / Excess Stock' },
    { id: 'purchases', label: 'Purchase Order / Purchase / Purchase Return' },
    { id: 'sales', label: 'Sale / Sale Return' },
    { id: 'sales_statements', label: 'Sale Statements' },
    { id: 'accounting', label: 'Accounting' },
];

const SUB_OPTIONS: Record<string, string[]> = {
    stock: [
        'Stock Taking List', 'Company-wise Stock of all Products', 'Company Stock (Specific)',
        'Product-wise Stock (Above Min Qty)', 'Product-wise Stock (Below Min Qty)',
        'Product-wise Stock (Non zero Qty)', 'Product-wise Stock (zero Qty)',
        'Stock Position', 'Company-wise Stock Summary'
    ],
    adjustments: [
        'Opening Stock Add By Date-wise', 'Opening Stock Add By Product-Wise',
        'Opening Stock Less By Date-wise', 'Opening Stock Less By Product-Wise',
        'Damage Stock By Date-wise', 'Damage Stock By Product-Wise',
        'Stock excess By Date-Wise', 'Stock short By Date-Wise'
    ],
    purchases: [
        'Purchase Order By Date-wise', 'Purchase Order By Invoice No', 'Purchase Order By Supplier-Wise',
        'Purchase Detail By Date-wise', 'Purchase Detail By Invoice No', 'Purchase Detail By Product-Wise',
        'Purchase Return By Date-wise', 'Purchase Return By Invoice No', 'Purchase / Pur.Return Summary'
    ],
    sales: [
        'Sale Invoice By Date', 'Sale Invoice By Invoice No', 'Sale Invoice By Customer',
        'Sale Return Invoice By Date', 'Sale Return Invoice By Invoice No',
        'Area-Wise Delivery Challan', 'Area-Wise Customer List', 'Sale Invoice List'
    ],
    sales_statements: [
        'Date-wise', 'Saleman Area-wise', 'Saleman Comp-wise', 'Customer-Wise',
        'Company-Wise', 'Area-Wise', 'Daily Sale Summary Order By Profit'
    ],
    accounting: [
        'Chart of Accounts', 'General Ledger', 'General Journal by Date', 'General Journal by voucher No',
        'Trial Balance(Detail)', 'Income Statement (Short)', 'Balance Sheet (Detail)'
    ]
};

function ReportsEngineInner() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // ── Filters State ───────────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
        type: (searchParams.get('type') as ReportType) || '' as any,
        subType: ''
    });

    const [data, setData] = useState<{ orders: any[], products: any[], buys: any[] }>({
        orders: [], products: [], buys: []
    });
    const [reportResult, setReportResult] = useState<any[]>([]);

    useEffect(() => {
        const type = searchParams.get('type') as ReportType;
        if (type) setFilters(f => ({ ...f, type, subType: '' }));
    }, [searchParams]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [o, p, pu] = await Promise.all([orderService.getAll(), productService.getAll(), purchaseService.getAll()]);
            setData({ orders: o || [], products: p || [], buys: pu || [] });
        } catch { toast.error('Failed to sync report data nodes.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const generateReport = async () => {
        if (!filters.type) { toast.error('Select a report category'); return; }
        if (!filters.subType) { toast.error('Select a specific view'); return; }

        setGenerating(true);
        try {
            const params = {
                start_date: filters.dateFrom,
                end_date: filters.dateTo,
                page_size: 5000, // Fetch broad dataset for report integrity
                type: filters.type,
                sub_type: filters.subType
            };

            let result = [];
            
            // ── Selective High-Density Fetching ──
            if (filters.type === 'sales' || filters.type === 'sales_statements') {
                const res: any = await orderService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.type === 'purchases') {
                const res: any = await purchaseService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            } else if (filters.type === 'stock') {
                const res: any = await productService.getAll({ all_items: 'true', ...params } as any);
                result = Array.isArray(res) ? res : res.results || [];
            } else {
                // Generic fallback node
                const res: any = await orderService.getAll(params);
                result = Array.isArray(res) ? res : res.results || [];
            }

            setReportResult(result);
            if (result.length > 0) toast.success(`Real Data Synced: ${result.length} Records Found`);
            else toast.error('No matching records found in database for these filters.');
        } catch (e: any) {
            toast.error('Failed to retrieve database records.');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-6 font-sans">
            <style jsx global>{`
                @media print {
                    nav, aside, header, .no-print, button, select, input, .filters-bar {
                        display: none !important;
                    }
                    .print-header {
                        display: block !important;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        font-size: 10pt;
                    }
                    .report-container {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #ddd !important;
                        padding: 8px !important;
                    }
                    .max-w-\[1400px\] {
                        max-width: 100% !important;
                    }
                }
                .print-header { display: none; }
            `}</style>

            {/* Standard "Only for Print" Header */}
            <div className="print-header">
                <h1 className="text-2xl font-bold">Business Operational Report</h1>
                <p className="text-sm">Category: {filters.type?.toUpperCase()} | Period: {filters.dateFrom} to {filters.dateTo}</p>
                <p className="text-[10px] text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* ── Page Header ── */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200 dark:border-white/10">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Business Analysis Reports</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate comprehensive operational and financial summaries</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadData} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] hover:border-[#F59E0B]/40 transition-all shadow-sm">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />
                    <button 
                        onClick={() => exportToCSV(reportResult, `Report_${filters.type}_${filters.dateFrom}_to_${filters.dateTo}.csv`)}
                        disabled={reportResult.length === 0}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-emerald-600 transition-all shadow-sm disabled:opacity-30" 
                        title="Export to CSV (Excel)"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => window.print()}
                        disabled={reportResult.length === 0}
                        className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F59E0B] transition-all shadow-sm disabled:opacity-30" 
                        title="Print / Save PDF"
                    >
                        <Printer className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── Filters Bar (Tiered Business Style) ── */}
            <div className="filters-bar no-print bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg p-5 mb-6 shadow-sm flex flex-col gap-5">

                {/* Row 1: Report Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">1. Report Category</label>
                        <select
                            value={filters.type}
                            onChange={e => setFilters({ ...filters, type: e.target.value as any, subType: '' })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                        >
                            <option value="">Select Category...</option>
                            {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">2. Specific Report View</label>
                        <select
                            value={filters.subType}
                            onChange={e => setFilters({ ...filters, subType: e.target.value })}
                            disabled={!filters.type}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-40"
                        >
                            <option value="">Select View Type...</option>
                            {filters.type && SUB_OPTIONS[filters.type]?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>

                {/* Divider Line */}
                <div className="h-px bg-slate-100 dark:bg-white/5 w-full" />

                {/* Row 2: Date Range & Action */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">3. Start Date</label>
                        <input
                            type="date" value={filters.dateFrom}
                            onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all font-medium text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 ml-1">4. End Date</label>
                        <input
                            type="date" value={filters.dateTo}
                            onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all font-medium text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={generateReport}
                            disabled={generating || !filters.subType}
                            className="w-full h-[38px] bg-[#F59E0B] hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table (Professional Style) ── */}
            {reportResult.length > 0 ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between px-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Total Records: <span className="font-semibold">{reportResult.length} Results</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Total Valuation: <span className="text-[#F59E0B] font-bold">{formatCurrency(reportResult.reduce((s, r) => s + Number(r.total_amount || r.price || 0), 0))}</span>
                        </p>
                    </div>

                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Reference Num</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Date</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Entity Name</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">Status</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {reportResult.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-3">
                                                <span className="text-[#F59E0B] font-medium text-sm">#{row.purchase_number || row.order_number || row.id.slice(0, 8)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm">
                                                {formatDate(row.created_at || row.order_date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-800 dark:text-slate-200 font-medium text-sm">{row.supplier_name || row.customer_name || row.guest_name || 'System Auto'}</span>
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{filters.type} Record</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold capitalize
                                                    ${row.status === 'received' || row.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'}`}>
                                                    {row.status || 'Verified'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                                {formatCurrency(row.total_amount || row.price || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1a252f] text-center px-10 shadow-sm">
                    <BarChart3 className="h-10 w-10 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Awaiting Configuration</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please select report criteria and generate to view records.</p>
                </div>
            )}
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
