"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Edit2,
    X, CheckCircle, AlertTriangle, Package, Loader2, Filter,
    Users, Clock, CreditCard, FileText, Lock, Calendar, FileSpreadsheet, Printer,
    ChevronLeft, Truck, History, ListFilter, Building2, MapPin, Mail, Phone,
    Upload, CheckCircle2, Info, Warehouse as WarehouseIcon, ShieldCheck, Banknote,
    Check, X as XIcon, ChevronDown
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { installmentService } from '@/services/payment.service';
import { companyService } from '@/services/company.service';
import { productService } from '@/services/product.service';
import { formatDate, formatDateTime, formatCurrency, exportToCSV, getImageUrl } from '@/lib/utils';
import { inventoryService } from '@/services/inventory.service';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { WarehouseSelectionModal } from '@/components/admin/WarehouseSelectionModal';
import { PageHeader, Card, Button, Modal, ui, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - PURCHASES (indigo accent, slate neutrals)
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any; dot: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
    PROCESSING: { label: 'Processing', cls: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', icon: RefreshCw },
    SHIPPED: { label: 'Shipped', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', icon: Truck },
    DELIVERED: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
    RECEIVED: { label: 'Received', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Package },
    CANCELLED: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', icon: XIcon },
};

const StatusDropdown = ({ status, onStatusChange }: { status: string; onStatusChange: (newStatus: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const current = STATUS_CONFIG[status.toUpperCase()] || STATUS_CONFIG.PENDING;
    const Icon = current.icon;
    const MENU_W = 208;
    const MENU_H = 330;

    useEffect(() => {
        if (!isOpen) return;
        const close = () => setIsOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [isOpen]);

    const toggle = () => {
        if (isOpen) { setIsOpen(false); return; }
        const r = btnRef.current?.getBoundingClientRect();
        if (r) {
            const openUp = r.bottom + MENU_H > window.innerHeight && r.top > MENU_H;
            setCoords({
                top: openUp ? r.top - 8 : r.bottom + 8,
                left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8)),
                openUp,
            });
        }
        setIsOpen(true);
    };

    return (
        <div className="inline-block text-left">
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                className={`
                    flex items-center gap-2.5 py-1.5 px-4 border rounded-full text-[10px] font-bold uppercase transition-all
                    shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.12)]
                    active:scale-95 group relative tracking-widest border-opacity-60
                    ${current.cls}
                `}
            >
                <div className="relative">
                    <Icon size={13} className={`${status.toUpperCase() === 'PROCESSING' ? 'animate-spin' : 'group-hover:rotate-12 transition-transform duration-300'}`} strokeWidth={2.5} />
                    <div className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full border border-white shadow-sm ${current.dot} animate-pulse`} />
                </div>
                <span>{current.label}</span>
                <ChevronDown size={12} className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : 'opacity-40 group-hover:opacity-100'}`} />
            </button>

            {isOpen && coords && createPortal(
                <>
                    <div className="fixed inset-0 z-[1090]" onClick={() => setIsOpen(false)} />
                    <div
                        style={{
                            top: coords.top,
                            left: coords.left,
                            width: MENU_W,
                            transform: coords.openUp ? 'translateY(-100%)' : undefined,
                        }}
                        className="fixed z-[1100] bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="px-5 py-3 border-b border-slate-100 mb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Select New Status</p>
                        </div>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                            const ItemIcon = cfg.icon;
                            const isActive = status.toUpperCase() === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        onStatusChange(key);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-4 px-5 py-2.5 text-[12px] font-bold text-left transition-all
                                        ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:pl-7'}
                                    `}
                                >
                                    <div className={`p-2 rounded-xl border shadow-sm transition-transform ${cfg.cls} ${isActive ? 'scale-110 shadow-md' : 'group-hover:scale-105'}`}>
                                        <ItemIcon size={14} className={key === 'PROCESSING' ? 'animate-spin' : ''} />
                                    </div>
                                    <span className="uppercase tracking-wider text-[11px]">{cfg.label}</span>
                                    {isActive && (
                                        <div className="ml-auto bg-indigo-600 p-1 rounded-full shadow-sm">
                                            <Check size={10} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

const StatusPill = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status.toUpperCase()] || STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-bold capitalize ${cfg.cls}`}>
            <Icon size={12} />
            {(status || '').replace('_', ' ')}
        </span>
    );
};

export default function PurchasesPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [supplierFilter, setSupplierFilter] = useState('All');
    const [companyFilter, setCompanyFilter] = useState('All');
    const [companies, setCompanies] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [viewPayments, setViewPayments] = useState<any[]>([]);
    const [viewPaymentsLoading, setViewPaymentsLoading] = useState(false);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [payModal, setPayModal] = useState<{ open: boolean, purchase: any | null }>({ open: false, purchase: null });
    const [paying, setPaying] = useState(false);

    const [whModal, setWhModal] = useState<{ open: boolean, purchase: any | null }>({ open: false, purchase: null });
    const [assigningWh, setAssigningWh] = useState(false);

    // Custom dropdown states
    const [paymentDropdownOpen, setPaymentDropdownOpen] = useState(false);
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Reset pagination to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, paymentFilter, supplierFilter, companyFilter]);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params: any = { no_pagination: 'true' };
            if (statusFilter && statusFilter !== 'All') {
                if (statusFilter === 'active') {
                    params.exclude_received = 'true';
                } else {
                    params.status = statusFilter;
                }
            }
            if (paymentFilter && paymentFilter !== 'All') params.payment_status = paymentFilter;
            if (supplierFilter && supplierFilter !== 'All') params.supplier = supplierFilter;
            if (searchTerm) params.search = searchTerm;
            const [data, supData, catProdData] = await Promise.all([
                purchaseService.getAll(params),
                !silent && suppliers.length === 0 ? companyService.getSuppliers() : Promise.resolve(suppliers),
                !silent && catalogProducts.length === 0 ? productService.getAllSupplier({ no_pagination: 'true' }) : Promise.resolve(catalogProducts)
            ]);
            setPurchases(data || []);
            if (supData && supData.length > 0) setSuppliers(supData);
            if (catProdData) setCatalogProducts(Array.isArray(catProdData) ? catProdData : catProdData?.results || []);
        } catch (err: any) {
            console.error(err);
            if (!silent) {
                const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to load purchases';
                toast.error(msg);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [statusFilter, paymentFilter, supplierFilter, searchTerm, suppliers.length, catalogProducts.length]);

    useEffect(() => { load(); }, [load]);

    // Companies for the filter dropdown.
    useEffect(() => {
        (companyService as any).getCompanies?.()
            .then((r: any) => setCompanies(Array.isArray(r) ? r : r?.results || []))
            .catch(() => { });
    }, []);

    // REAL-TIME AUTO-SYNC: Refresh list every 2s
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !viewRow) {
                load(true);
            }
        }, 2000); // 2 seconds
        return () => clearInterval(interval);
    }, [load, loading, viewRow]);

    const handleViewDetails = async (id: string) => {
        try {
            const data = await purchaseService.getById(id);
            setViewRow(data);
            // Load the individual payment records (installments) for this purchase so
            // each payment shows separately with its own date/time/amount/method.
            setViewPayments([]);
            setViewPaymentsLoading(true);
            installmentService.list('purchaseorder', id)
                .then((rows: any[]) => setViewPayments(Array.isArray(rows) ? rows : []))
                .catch(() => setViewPayments([]))
                .finally(() => setViewPaymentsLoading(false));
        } catch { toast.error('Failed to load details'); }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.delete(deleteRow.id);
            setDeleteRow(null); load(); toast.success('Purchase deleted');
        } catch { toast.error('Delete failed'); } finally { setDeleting(false); }
    };

    const handlePaymentSubmit = async (formData: FormData) => {
        if (!payModal.purchase) return;
        setPaying(true);
        try {
            await purchaseService.update(payModal.purchase.id, formData);
            toast.success('Payment recorded.');
            setPayModal({ open: false, purchase: null });
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to record payment');
        } finally {
            setPaying(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        // RECEIVED deposits the purchase stock straight into the PO's own branch
        // warehouse (set when the PO was created) and into Current Stocks — no
        // warehouse picker popup.
        try {
            await purchaseService.update(id, { status: newStatus });
            toast.success(newStatus === 'RECEIVED' ? 'Stock received — added to Current Stocks' : 'Order status updated');
            load(true);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update status');
            load(true);
        }
    };

    const handleWarehouseConfirm = async (warehouseId: string) => {
        if (!whModal.purchase) return;
        setAssigningWh(true);
        try {
            await purchaseService.update(whModal.purchase.id, {
                status: 'RECEIVED',
                warehouse: warehouseId
            });
            toast.success('Stock received in warehouse successfully');
            setWhModal({ open: false, purchase: null });
            load(true);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to assign warehouse');
        } finally {
            setAssigningWh(false);
        }
    };

    const purchasesList: any[] = Array.isArray(purchases) ? purchases : (purchases as any)?.results ? (purchases as any).results : [];
    // Company filter (client-side): keep purchases that contain an item from the
    // selected company (matched by the company's name, exposed on each item).
    const filtered = (() => {
        if (companyFilter === 'All') return purchasesList;
        const cname = (companies.find((c: any) => String(c.id) === String(companyFilter))?.name || '').toLowerCase();
        if (!cname) return purchasesList;
        return purchasesList.filter((p: any) => (p.items || []).some((it: any) => (it.company_name || '').toLowerCase() === cname));
    })();
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

    const sel = useTableSelection(filtered);

    const bulkDelete = async (ids: string[]) => {
        await Promise.allSettled(ids.map(id => purchaseService.delete(id)));
        toast.success(`${ids.length} purchase(s) deleted`);
        load(true);
    };

    const bulkStatus = async (ids: string[], status: string) => {
        await Promise.allSettled(ids.map(id => purchaseService.update(id, { status })));
        toast.success(`Marked ${ids.length} order(s) ${STATUS_CONFIG[status]?.label || status}`);
        load(true);
    };

    return (
        <div className="pb-20 text-slate-800">
            <PageHeader
                title="Purchases"
                subtitle="Manage stock purchases from suppliers"
                breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Purchases' }]}
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={() => exportToCSV(purchases, 'Purchases.csv')} className="whitespace-nowrap">
                            <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Export</span>
                        </Button>
                        <Button size="sm" onClick={() => router.push('/admin/purchases/add')} className="whitespace-nowrap">
                            <Plus size={14} /> New Purchase
                        </Button>
                    </>
                }
            />

            <div className="text-left">
                {/* Search & Filters */}
                <Card className="p-4 sm:p-5 mb-6 flex flex-col md:flex-row items-stretch md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search order # or supplier..."
                                className={inputCls + " pl-10"}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 flex-1 md:flex-initial">
                        {/* Custom Payment Dropdown */}
                        <div className="flex-1 md:w-[160px] relative">
                            <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Payment</label>
                            <button
                                type="button"
                                onClick={() => setPaymentDropdownOpen(!paymentDropdownOpen)}
                                className="w-full h-10 px-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer select-none text-left"
                            >
                                <span className="capitalize">{paymentFilter === 'All' ? 'All Payments' : paymentFilter}</span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </button>
                            {paymentDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-[100]" onClick={() => setPaymentDropdownOpen(false)} />
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[110] divide-y divide-slate-100 overflow-hidden text-[13px] font-semibold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {['All', 'unpaid', 'partial', 'paid'].map(val => (
                                            <div
                                                key={val}
                                                onClick={() => {
                                                    setPaymentFilter(val);
                                                    setPaymentDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors capitalize ${paymentFilter === val ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                            >
                                                {val === 'All' ? 'All Payments' : val}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Custom Company Dropdown */}
                        <div className="flex-1 md:w-[180px] relative">
                            <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Company</label>
                            <button
                                type="button"
                                onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                                className="w-full h-10 px-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 outline-none focus:border-indigo-400 transition-all cursor-pointer select-none text-left"
                            >
                                <span className="truncate block max-w-[140px]">
                                    {companyFilter === 'All' ? 'All Companies' : (companies.find((c: any) => String(c.id) === String(companyFilter))?.name || 'All Companies')}
                                </span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </button>
                            {supplierDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-[100]" onClick={() => setSupplierDropdownOpen(false)} />
                                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-[110] divide-y divide-slate-100 text-[13px] font-semibold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div
                                            onClick={() => { setCompanyFilter('All'); setSupplierDropdownOpen(false); }}
                                            className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${companyFilter === 'All' ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                        >
                                            All Companies
                                        </div>
                                        {companies.map((c: any) => (
                                            <div
                                                key={c.id}
                                                onClick={() => { setCompanyFilter(String(c.id)); setSupplierDropdownOpen(false); }}
                                                className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors truncate ${String(companyFilter) === String(c.id) ? 'bg-indigo-50 text-indigo-700' : ''}`}
                                            >
                                                {c.name}
                                            </div>
                                        ))}
                                        {companies.length === 0 && <div className="px-4 py-2.5 text-slate-400 italic">No companies yet</div>}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-end shrink-0">
                            <Button variant="outline" onClick={() => load()} disabled={loading} className="px-3.5 h-10">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="mb-6" />

                {/* ── Mobile Card List ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {loading && filtered.length === 0 ? (
                        <Card className="py-16 text-center">
                            <Loader2 size={32} className="animate-spin text-indigo-600 mx-auto mb-3" />
                            <p className="text-[13px] text-slate-600 font-medium italic">Loading purchases...</p>
                        </Card>
                    ) : filtered.length === 0 ? (
                        <Card className="py-16 text-center">
                            <p className="text-[13px] text-slate-600 italic">No purchases found.</p>
                        </Card>
                    ) : (
                        paginated.map((p: any) => (
                            <Card key={p.id} className="p-4 space-y-3 text-left">
                                {/* Row 1: First Item Image + Order # & Date */}
                                <div className="flex gap-3">
                                    <div className="w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                        {(() => {
                                            const img = p.items?.[0]?.product_image;
                                            return img ? (
                                                <img src={getImageUrl(img)} className="w-full h-full object-contain p-1" alt="" />
                                            ) : (
                                                <Package size={24} className="text-gray-200" />
                                            );
                                        })()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-[14px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer" onClick={() => handleViewDetails(p.id)}>
                                                #{p.purchase_number}
                                            </h3>
                                            <div className="text-[15px] font-bold text-slate-900 tabular-nums">{formatCurrency(p.total_amount)}</div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">
                                            {formatDateTime(p.created_at || p.order_date || p.date)}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Status Controls */}
                                <div className="grid grid-cols-2 gap-3 py-2.5 border-t border-b border-slate-100 items-center">
                                    <div className="space-y-1 min-w-0">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Products</span>
                                        {(p.items || []).length === 0 ? (
                                            <span className="text-slate-400 text-[12px]">—</span>
                                        ) : (
                                            <>
                                                <div className="font-semibold text-slate-800 text-[12px] truncate">{p.items[0]?.product_name || '—'}</div>
                                                {p.items.length > 1 && <div className="text-[9px] text-slate-400 font-bold">+{p.items.length - 1} more</div>}
                                            </>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-right flex flex-col items-end">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Payment Status</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${p.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : p.payment_status?.toLowerCase() === 'partial' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                            {p.payment_status || 'UNPAID'}
                                        </span>

                                        {(!p.payment_status || p.payment_status.toLowerCase() !== 'paid') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPayModal({ open: true, purchase: p }); }}
                                                className="mt-1 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-lg shadow-sm transition-all uppercase whitespace-nowrap"
                                            >
                                                {p.payment_status?.toLowerCase() === 'partial' ? 'Pay Bal' : 'Pay Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Row 3: Remaining Balance if any */}
                                {(p.remaining_amount > 0) && (
                                    <div className="flex items-center justify-between text-[11px] bg-rose-50/40 border border-rose-100 rounded-lg px-2.5 py-1.5">
                                        <span className="font-medium text-slate-600">Remaining Balance:</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-rose-600 tabular-nums">{formatCurrency(p.remaining_amount)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Row 4: Action Controls */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => handleViewDetails(p.id)}
                                        className="text-[12px] font-bold text-slate-600 hover:underline"
                                    >
                                        View
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={() => router.push(`/admin/purchases/${p.id}/invoice`)}
                                        className="text-[12px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                                    >
                                        <Printer size={12} /> Print
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={() => setDeleteRow(p)}
                                        className="text-[12px] font-bold text-[#c40000] hover:underline"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Mobile Pagination Footer Controls */}
                {filtered.length > 0 && (
                    <div className="md:hidden flex items-center justify-between gap-3 text-[11.5px] text-slate-500 bg-white p-3 rounded-xl border border-slate-150/60 shadow-sm mb-6 text-left">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded disabled:opacity-40 font-bold"
                        >
                            Previous
                        </button>
                        <span className="font-semibold text-slate-700">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded disabled:opacity-40 font-bold"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Desktop Table */}
                <Card className="hidden md:block text-left mb-6 relative z-10 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200/70 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                                <SelectAllTh sel={sel} />
                                <th className="px-6 py-3.5 w-[80px]">Item</th>
                                <th className="px-6 py-3">Order #</th>
                                <th className="px-6 py-3">Products</th>
                                <th className="px-6 py-3 text-right">Pur. Price</th>
                                <th className="px-6 py-3">Payment Status</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && filtered.length === 0 ? <tr><td colSpan={8} className="py-20 text-center text-[13px] text-slate-500">Loading purchases...</td></tr> : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="py-20 text-center text-[13px] text-slate-500">No purchases found.</td></tr>
                            ) : (
                                paginated.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors group text-[13px]">
                                        <RowCheckboxTd sel={sel} id={p.id} />
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center group-hover:border-indigo-400 transition-colors">
                                                {(() => {
                                                    const img = p.items?.[0]?.product_image;
                                                    return img ? (
                                                        <img src={getImageUrl(img)} className="w-full h-full object-contain p-1" alt="" />
                                                    ) : (
                                                        <Package size={20} className="text-gray-200" />
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer" onClick={() => handleViewDetails(p.id)}>#{p.purchase_number}</div>
                                            <div className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-tight">{formatDateTime(p.created_at || p.order_date || p.date)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="min-w-0 max-w-[240px]">
                                                {(p.items || []).length === 0 ? (
                                                    <span className="text-slate-400 text-[12px]">—</span>
                                                ) : (
                                                    <>
                                                        <div className="font-semibold text-slate-800 text-[12.5px] truncate">{p.items[0]?.product_name || '—'}</div>
                                                        {(p.items[0]?.company_name || p.items[0]?.category_name) && (
                                                            <div className="text-[10px] text-slate-400 font-semibold truncate">{[p.items[0]?.company_name, p.items[0]?.category_name].filter(Boolean).join(' · ')}</div>
                                                        )}
                                                        {p.items.length > 1 && (
                                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">+{p.items.length - 1} more product{p.items.length - 1 > 1 ? 's' : ''}</div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(p.items || []).length === 0 ? (
                                                <span className="text-slate-400">—</span>
                                            ) : (
                                                <>
                                                    <div className="font-bold text-slate-800 tabular-nums">{formatCurrency(p.items[0]?.price || 0)}</div>
                                                    {p.items.length > 1 && <div className="text-[9.5px] text-slate-400 font-bold">1st item</div>}
                                                </>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5 items-start">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${p.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : p.payment_status?.toLowerCase() === 'partial' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                                    {p.payment_status || 'UNPAID'}
                                                </span>

                                                {(!p.payment_status || p.payment_status.toLowerCase() !== 'paid') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPayModal({ open: true, purchase: p }); }}
                                                        className="mt-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg shadow-sm transition-all w-fit uppercase"
                                                    >
                                                        {p.payment_status?.toLowerCase() === 'partial' ? 'Pay Balance' : 'Pay Now'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-slate-900 tabular-nums">{formatCurrency(p.total_amount)}</div>
                                            {(p.remaining_amount > 0) && (
                                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-tighter tabular-nums">
                                                        Bal: {formatCurrency(p.remaining_amount)}
                                                    </div>
                                                </div>
                                            )}
                                            {p.remaining_amount > 0 && p.due_date && (
                                                <div className={`text-[9.5px] font-bold mt-0.5 tabular-nums ${p.is_overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                                                    {p.is_overdue ? `${p.days_overdue}d overdue` : `Due ${p.due_date}`}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2.5 transition-opacity">
                                                <button onClick={() => handleViewDetails(p.id)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => router.push(`/admin/purchases/${p.id}/invoice`)} className="text-[12px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"><Printer size={12} /> Print</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => setDeleteRow(p)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Desktop Pagination Footer Controls */}
                    {filtered.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border-t border-slate-100 text-[12px] text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5 order-2 sm:order-1 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                Showing <span className="font-semibold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                                <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{' '}
                                <span className="font-semibold text-slate-700">{filtered.length}</span> purchases
                            </div>
                            <div className="flex items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-350 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-slate-600 disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Previous
                                </button>
                                <div className="text-[11.5px] font-extrabold text-slate-800 tracking-wider tabular-nums px-2">
                                    {currentPage} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="flex-1 sm:flex-initial h-8 px-4 border border-slate-200 bg-white rounded-lg hover:border-slate-350 hover:bg-slate-50 active:scale-95 disabled:opacity-40 transition-all font-bold uppercase tracking-wider text-[10px] text-slate-600 disabled:pointer-events-none select-none flex items-center justify-center gap-1.5"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <BulkBar
                sel={sel}
                entity="purchase orders"
                onDelete={bulkDelete}
            />

            {/* View Details Modal */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden text-left border border-slate-200">
                        <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-white shrink-0">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    Purchase Order <span className="text-indigo-600">#{viewRow.purchase_number}</span>
                                </h2>
                                <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                                    <Calendar size={12} className="text-slate-300" /> {formatDateTime(viewRow.created_at || viewRow.order_date || viewRow.date)}
                                </p>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 flex flex-col lg:flex-row gap-8 overflow-y-auto text-[12px]">
                            {/* Left: products + supplier/status */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Products</p>
                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                    <table className="w-full text-[12px] min-w-[600px]">
                                        <thead>
                                            <tr className="text-left text-slate-400 text-[9.5px] uppercase tracking-wider bg-slate-50/70 border-b border-slate-100">
                                                <th className="px-3 py-2">Product</th>
                                                <th className="px-3 py-2 text-center">Qty</th>
                                                <th className="px-3 py-2 text-center">Bonus</th>
                                                <th className="px-3 py-2 text-right">Cost</th>
                                                <th className="px-3 py-2 text-right">Sale</th>
                                                <th className="px-3 py-2 text-right">Retail</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viewRow.items?.map((item: any) => {
                                                const img = item.product_image;
                                                const price = parseFloat(item.price || 0);
                                                const qty = item.quantity || 0;
                                                const isCarton = item.packaging_type === 'CARTON';
                                                const units = item.total_units ?? (isCarton ? qty * (item.items_per_carton || 1) : qty);
                                                const subtotal = item.subtotal ?? (price * units);
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center p-1">
                                                                    {img ? <img src={getImageUrl(img)} alt="" className="w-full h-full object-contain" /> : <Package size={14} className="text-slate-200" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-slate-900 truncate">{item.product_name}</p>
                                                                    <p className="text-[9.5px] text-slate-400 font-semibold truncate">
                                                                        {[item.company_name, item.category_name].filter(Boolean).join(' · ') || '—'}{item.barcode ? ` · ${item.barcode}` : ''}{item.expiry_date ? ` · Exp ${item.expiry_date}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center tabular-nums">
                                                            {isCarton ? (
                                                                <div className="flex flex-col leading-tight">
                                                                    <span className="font-bold text-slate-900">{units} pcs</span>
                                                                    <span className="text-[9px] text-slate-400">{qty} × {item.items_per_carton || 1}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="font-semibold text-slate-800">{units}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-emerald-700">{item.bonus_quantity || 0}</td>
                                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 font-semibold">{formatCurrency(price)}</td>
                                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(item.selling_price || 0)}</td>
                                                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatCurrency(item.retail_rate || 0)}</td>
                                                        <td className="px-3 py-2.5 text-right font-bold text-indigo-600 tabular-nums">{formatCurrency(subtotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-5 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company</p>
                                        <p className="font-bold text-slate-900 text-[13px] truncate">
                                            {[...new Set((viewRow.items || []).map((i: any) => i.company_name).filter(Boolean))].join(', ') || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</p>
                                        <p className="font-bold text-slate-900 text-[13px] truncate">
                                            {[...new Set((viewRow.items || []).map((i: any) => i.category_name).filter(Boolean))].join(', ') || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <StatusPill status={viewRow.status} />
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${(viewRow.payment_status || 'UNPAID').toLowerCase() === 'paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : (viewRow.payment_status || '').toLowerCase() === 'partial' ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>{viewRow.payment_status || 'UNPAID'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: summary + payment history (divider, not a box) */}
                            <aside className="w-full lg:w-[340px] lg:border-l lg:border-slate-100 lg:pl-8 shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Summary</p>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency((viewRow.total_amount || 0) - (viewRow.tax_amount || 0) - (viewRow.shipping_cost || 0))}</span></div>
                                    <div className="flex justify-between text-slate-600"><span>Shipping</span><span className="tabular-nums">{formatCurrency(viewRow.shipping_cost || 0)}</span></div>
                                    <div className="flex justify-between text-slate-600"><span>Tax</span><span className="tabular-nums">{formatCurrency(viewRow.tax_amount || 0)}</span></div>
                                    <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2 text-[15px]"><span>Total</span><span className="text-indigo-600 tabular-nums">{formatCurrency(viewRow.total_amount || 0)}</span></div>
                                </div>
                                {(() => {
                                    const total = Number(viewRow.total_amount || 0);
                                    const paid = Number(viewRow.paid_amount || (viewRow.payment_status === 'PAID' ? viewRow.total_amount : 0) || 0);
                                    const due = Math.max(0, total - paid);
                                    const payDate = viewRow.payment_date ? formatDateTime(viewRow.payment_date) : '—';
                                    return (
                                        <div className="space-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100">
                                            <div className="flex justify-between text-slate-600"><span>Paid Amount</span><span className="tabular-nums font-bold text-emerald-600">{formatCurrency(paid)}</span></div>
                                            <div className="flex justify-between text-slate-600"><span>Remaining / Due</span><span className={`tabular-nums font-bold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(due)}</span></div>
                                            <div className="flex justify-between text-slate-600"><span>Payment Date</span><span className="font-bold text-slate-700">{payDate}</span></div>
                                            <div className="flex justify-between text-slate-600"><span>Method</span><span className="font-bold text-slate-700 capitalize">{(viewRow.payment_method || '—').toString().replace('_', ' ').toLowerCase()}</span></div>
                                            {viewRow.transaction_id && (
                                                <div className="flex justify-between text-slate-600"><span>Ref</span><span className="font-bold text-slate-700 font-mono">{viewRow.transaction_id}</span></div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Individual payment records — each with its own date & time */}
                                <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment History</p>
                                    {viewPaymentsLoading ? (
                                        <p className="text-[11px] text-slate-400">Loading payments…</p>
                                    ) : viewPayments.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic">
                                            {Number(viewRow.paid_amount || 0) > 0 ? 'Amount was set on the order.' : 'No payments recorded yet.'}
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {viewPayments.map((pay: any) => (
                                                <div key={pay.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-bold text-emerald-700 tabular-nums">{formatCurrency(pay.amount || 0)}</p>
                                                        <p className="text-[10px] text-slate-500">{formatDateTime(pay.paid_at || pay.created_at)}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-semibold text-slate-600 capitalize">{(pay.method || '—').toString().replace('_', ' ').toLowerCase()}</p>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${pay.status === 'confirmed' ? 'text-emerald-600' : pay.status === 'pending' ? 'text-amber-600' : pay.status === 'rejected' ? 'text-rose-600' : 'text-slate-400'}`}>{pay.status || ''}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button className="w-full mt-4" onClick={() => router.push(`/admin/purchases/${viewRow.id}/invoice`)}><Printer size={16} /> View Invoice</Button>
                            </aside>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteRow && (
                <Modal open={!!deleteRow} onClose={() => setDeleteRow(null)} size="sm">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600 border border-rose-100 font-bold"><Trash2 size={32} /></div>
                        <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Delete Purchase?</h3>
                        <p className="text-[13px] text-slate-600 mt-3">Delete record <span className="font-bold text-slate-900">#{deleteRow.purchase_number}</span>? This cannot be undone.</p>
                        <div className="flex gap-3 mt-8">
                            <Button variant="ghost" className="flex-1" onClick={() => setDeleteRow(null)}>Cancel</Button>
                            <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Payment Modal */}
            {payModal.open && payModal.purchase && (
                <PaymentModal
                    isOpen={payModal.open}
                    purchase={payModal.purchase}
                    onClose={() => setPayModal({ open: false, purchase: null })}
                    onSubmit={handlePaymentSubmit}
                    loading={paying}
                />
            )}

            {/* Warehouse Selection Modal */}
            <WarehouseSelectionModal
                isOpen={whModal.open}
                onClose={() => setWhModal({ open: false, purchase: null })}
                onConfirm={handleWarehouseConfirm}
                loading={assigningWh}
                title={whModal.purchase?.status === 'RECEIVED' ? "Update Warehouse" : "Receive Stock in Warehouse"}
                description={`Select the warehouse where stock for ${whModal.purchase?.purchase_number} will be deposited.`}
            />

        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT VERIFICATION MODAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const PaymentModal = ({ isOpen, purchase, onClose, onSubmit, loading }: any) => {
    const [paymentStatus, setPaymentStatus] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
    const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [dueDate, setDueDate] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [thisPayment, setThisPayment] = useState(0); // amount paid in THIS transaction
    const [paymentNotes, setPaymentNotes] = useState('');

    const total = Number(purchase?.total_amount || 0);
    const alreadyPaid = Number(purchase?.paid_amount || 0);
    const remaining = Math.max(0, total - alreadyPaid);

    useEffect(() => {
        if (purchase && isOpen) {
            setPaymentStatus('');
            setPaymentMethod(purchase.payment_method?.toUpperCase() || 'CASH');
            setPaymentDate(new Date().toISOString().slice(0, 10));
            setDueDate(purchase.due_date || '');
            setTransactionId('');
            setThisPayment(0);
            setPaymentNotes(purchase.payment_notes || '');
            setPaymentSlip(null);
        }
    }, [purchase, isOpen]);

    if (!isOpen || !purchase) return null;

    // For a "Fully Paid" choice we settle the whole remaining balance; for partial we
    // add the entered amount on top of what was already paid.
    const payNow = paymentStatus === 'PAID' ? remaining : Math.max(0, Number(thisPayment) || 0);
    const newPaidTotal = Math.min(total, alreadyPaid + payNow);
    const newBalance = Math.max(0, total - newPaidTotal);
    const effectiveStatus = newPaidTotal >= total ? 'PAID' : 'PARTIAL';

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append('payment_status', effectiveStatus);
        formData.append('payment_method', paymentMethod);
        formData.append('paid_amount', newPaidTotal.toString());
        formData.append('payment_date', paymentDate);
        if (dueDate) formData.append('due_date', dueDate);
        formData.append('payment_notes', paymentNotes);
        if (transactionId) formData.append('transaction_id', transactionId);
        if (paymentSlip) formData.append('payment_slip', paymentSlip);
        // The branch admin records the payment directly — no supplier verification step.
        formData.append('payment_confirmed', 'true');
        onSubmit(formData);
    };

    const canSubmit = paymentStatus === 'PAID' ? remaining > 0 : payNow > 0;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col border border-slate-200">
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">Record Payment</h2>
                        <p className="text-[13px] text-slate-600 mt-0.5">
                            Purchase Order <span className="font-bold text-indigo-600">#{purchase.purchase_number}</span> • {formatCurrency(total)}
                            {remaining > 0 && remaining < total && (
                                <span className="text-rose-600 font-bold"> · Balance {formatCurrency(remaining)}</span>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-8 py-8 overflow-y-auto flex-1 scrollbar-hide bg-slate-50/50">
                    {/* Status Toggle */}
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-8 border border-slate-200">
                        <button
                            onClick={() => setPaymentStatus('PAID')}
                            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${paymentStatus === 'PAID' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Fully Paid
                        </button>
                        <button
                            onClick={() => setPaymentStatus('PARTIAL')}
                            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${paymentStatus === 'PARTIAL' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Partial Payment
                        </button>
                    </div>

                    {paymentStatus ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-slate-900">Payment Method</label>
                                    <select className={inputCls} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="ONLINE">Online / UPI</option>
                                        <option value="CREDIT">Credit</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-slate-900">Payment Date</label>
                                    <input type="date" className={inputCls} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                                </div>

                                {newBalance > 0 && (
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-[13px] font-bold text-slate-900">Balance Due Date <span className="text-slate-400 font-medium">— when the remaining {formatCurrency(newBalance)} must be cleared</span></label>
                                        <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                    </div>
                                )}

                                <div className="col-span-2 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                                    <div className="flex justify-between text-[12px]">
                                        <span className="font-bold uppercase tracking-tighter text-slate-500">Order Total</span>
                                        <span className="font-bold tabular-nums text-slate-900">{formatCurrency(total)}</span>
                                    </div>
                                    {alreadyPaid > 0 && (
                                        <div className="flex justify-between text-[12px]">
                                            <span className="font-bold uppercase tracking-tighter text-slate-500 flex items-center gap-1">
                                                Already Paid
                                                {purchase.payment_confirmed
                                                    ? <span className="text-emerald-600 normal-case tracking-normal">· verified</span>
                                                    : <span className="text-amber-600 normal-case tracking-normal">· pending</span>}
                                            </span>
                                            <span className="font-bold tabular-nums text-slate-900">{formatCurrency(alreadyPaid)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
                                            {paymentStatus === 'PAID' ? 'Paying Now (full balance)' : 'This Payment'}
                                        </span>
                                        {paymentStatus === 'PARTIAL' ? (
                                            <div className="flex items-center text-[20px] font-bold text-indigo-600">
                                                <span className="mr-1 text-[15px]">Rs.</span>
                                                <input
                                                    type="number"
                                                    autoFocus
                                                    max={remaining}
                                                    className="bg-transparent outline-none w-28 text-right border-b border-dotted border-indigo-500 focus:border-solid tabular-nums"
                                                    value={thisPayment || ''}
                                                    placeholder="0"
                                                    onChange={e => setThisPayment(Math.min(remaining, parseFloat(e.target.value) || 0))}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[20px] font-bold text-indigo-600 tabular-nums">{formatCurrency(remaining)}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">Remaining After</span>
                                        <span className={`text-[16px] font-bold tabular-nums ${newBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(newBalance)}
                                        </span>
                                    </div>
                                    {paymentStatus === 'PARTIAL' && newBalance === 0 && payNow > 0 && (
                                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                                            <CheckCircle2 size={13} /> This fully settles the order — it will be marked Paid.
                                        </p>
                                    )}
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 bg-white rounded-xl border border-dashed border-slate-200">
                            <Info size={20} className="text-slate-300" />
                            <p className="text-[13px] text-slate-600">Please select a payment type above to continue</p>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 flex gap-2 shrink-0 bg-slate-50/50 border-t border-slate-100 justify-end">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    {paymentStatus && (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !canSubmit}
                            className="min-w-[170px]"
                        >
                            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                            {effectiveStatus === 'PAID' ? 'Submit Full Payment' : `Submit ${formatCurrency(payNow)}`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
