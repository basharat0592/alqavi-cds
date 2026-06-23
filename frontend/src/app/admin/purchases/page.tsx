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
    const [statusFilter, setStatusFilter] = useState('active');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [supplierFilter, setSupplierFilter] = useState('All');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [payModal, setPayModal] = useState<{ open: boolean, purchase: any | null }>({ open: false, purchase: null });
    const [paying, setPaying] = useState(false);

    const [whModal, setWhModal] = useState<{ open: boolean, purchase: any | null }>({ open: false, purchase: null });
    const [assigningWh, setAssigningWh] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const params: any = {};
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
            toast.success('Payment recorded. Waiting for supplier verification.');
            setPayModal({ open: false, purchase: null });
            load();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to record payment');
        } finally {
            setPaying(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        if (newStatus === 'RECEIVED') {
            const p = filtered.find(x => x.id === id);
            setWhModal({ open: true, purchase: p });
            return;
        }
        try {
            await purchaseService.update(id, { status: newStatus });
            toast.success('Order status updated');
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
    const filtered = purchasesList;

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
                    <div className="flex flex-row gap-4 flex-1 md:flex-initial">
                        <div className="flex-1 md:w-[160px]">
                            <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Payment</label>
                            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className={inputCls + " cursor-pointer"}>
                                <option value="All">All Payments</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div className="flex-1 md:w-[180px]">
                            <label className="block text-[13px] font-bold text-slate-900 mb-1.5">Supplier</label>
                            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className={inputCls + " cursor-pointer w-full"}>
                                <option value="All">All Suppliers</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.company ? `${s.company} - ` : ''}{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end shrink-0">
                            <Button variant="outline" onClick={() => load()} disabled={loading} className="px-3.5">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Status Tabs */}
                <div className="flex gap-8 border-b border-slate-200 mb-6 px-1 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'active', label: 'Active Orders', icon: Clock },
                        { id: 'received', label: 'Received (Fulfilled)', icon: CheckCircle },
                        { id: 'cancelled', label: 'Cancelled', icon: AlertTriangle },
                        { id: 'all', label: 'Audit Trail (All)', icon: ListFilter }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id === 'all' ? 'All' : tab.id)}
                            className={`flex items-center gap-2 pb-3 text-[14px] font-medium transition-all relative whitespace-nowrap ${(statusFilter === 'All' && tab.id === 'all') || (statusFilter.toLowerCase() === tab.id) || (statusFilter === 'active' && tab.id === 'active')
                                ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {((statusFilter === 'All' && tab.id === 'all') || (statusFilter.toLowerCase() === tab.id) || (statusFilter === 'active' && tab.id === 'active')) && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600" />
                            )}
                        </button>
                    ))}
                </div>

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
                        filtered.map((p: any) => (
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
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Order Status</span>
                                        <StatusDropdown 
                                            status={p.status || 'PENDING'} 
                                            onStatusChange={(newStatus) => handleStatusChange(p.id, newStatus)} 
                                        />
                                        {p.status === 'RECEIVED' && (
                                            <div className={`text-[9px] font-bold uppercase flex items-center gap-1 mt-1 ${p.is_inventory_synced ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {p.is_inventory_synced ? (
                                                    <><Package size={10} /> {p.warehouse_name || 'Stock In'}</>
                                                ) : (
                                                    <><RefreshCw size={10} className="animate-pulse" /> Pending Sync</>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-right flex flex-col items-end">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Payment Status</span>
                                        {p.payment_status && p.payment_status.toUpperCase() !== 'UNPAID' && !p.payment_confirmed ? (
                                            <div className="flex flex-col gap-0.5 items-end">
                                                <span className="text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                                    Pending Verify
                                                </span>
                                                <span className="text-[8px] text-slate-400 font-semibold">
                                                    {p.payment_method?.replace('_', ' ') || 'CASH'} Submitted
                                                </span>
                                            </div>
                                        ) : (
                                            <div className={`text-[10px] font-bold uppercase tracking-widest ${p.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                {p.payment_status || 'UNPAID'} • {p.payment_method?.replace('_', ' ') || 'CASH'}
                                            </div>
                                        )}

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
                                            {p.payment_confirmed && <CheckCircle2 size={12} className="text-emerald-500" />}
                                        </div>
                                    </div>
                                )}

                                {/* Row 4: Action Controls */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => router.push(`/admin/tracking?q=${p.purchase_number}`)}
                                        className="text-[12px] font-bold text-slate-600 hover:underline"
                                    >
                                        Track
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={() => handleViewDetails(p.id)}
                                        className="text-[12px] font-bold text-slate-600 hover:underline"
                                    >
                                        View
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={() => p.status !== 'RECEIVED' && router.push(`/admin/purchases/add?id=${p.id}`)}
                                        disabled={p.status === 'RECEIVED'}
                                        title={p.status === 'RECEIVED' ? 'Received orders cannot be edited' : 'Edit purchase order'}
                                        className={`text-[12px] font-bold ${p.status === 'RECEIVED' ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-600 hover:underline'}`}
                                    >
                                        Edit
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

                {/* Desktop Table */}
                <Card className="hidden md:block text-left mb-6 relative z-10 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <SelectAllTh sel={sel} />
                                <th className="px-6 py-3 w-[80px]">Item</th>
                                <th className="px-6 py-3">Order #</th>
                                <th className="px-6 py-3">Order Status</th>
                                <th className="px-6 py-3">Payment Status</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && filtered.length === 0 ? <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-500">Loading purchases...</td></tr> : filtered.length === 0 ? (
                                <tr><td colSpan={7} className="py-20 text-center text-[13px] text-slate-500">No purchases found.</td></tr>
                            ) : (
                                filtered.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group text-[13px]">
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
                                            <div className="flex flex-col gap-1.5 min-h-[32px] justify-center">
                                                <StatusDropdown
                                                    status={p.status || 'PENDING'}
                                                    onStatusChange={(newStatus) => handleStatusChange(p.id, newStatus)}
                                                />
                                                {p.status === 'RECEIVED' && (
                                                    <div className={`text-[9px] font-bold uppercase flex items-center gap-1 mt-1 ${p.is_inventory_synced ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {p.is_inventory_synced ? (
                                                            <><Package size={10} /> {p.warehouse_name || 'Stock In'}</>
                                                        ) : (
                                                            <><RefreshCw size={10} className="animate-pulse" /> Pending Sync</>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                {p.payment_status && p.payment_status.toUpperCase() !== 'UNPAID' && !p.payment_confirmed ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full w-fit uppercase tracking-tighter animate-pulse">
                                                                Waiting for Confirmation
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-bold ml-0.5">
                                                            {p.payment_method?.replace('_', ' ') || 'CASH'} Submitted
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${p.payment_status?.toLowerCase() === 'paid' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                            {p.payment_status || 'UNPAID'} • {p.payment_method?.replace('_', ' ') || 'CASH'}
                                                        </div>
                                                        {p.payment_status?.toLowerCase() === 'partial' && (
                                                            <span className="text-[9px] text-slate-400 font-bold tabular-nums">
                                                                Paid {formatCurrency(p.paid_amount || 0)} of {formatCurrency(p.total_amount || 0)}
                                                            </span>
                                                        )}
                                                    </>
                                                )}

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
                                                    {p.payment_confirmed && (
                                                        <div title="Supplier Verified">
                                                            <CheckCircle2 size={12} className="text-emerald-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2.5 transition-opacity">
                                                <button onClick={() => router.push(`/admin/tracking?q=${p.purchase_number}`)} className="text-[12px] font-bold text-slate-600 hover:underline">Track</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => handleViewDetails(p.id)} className="text-[12px] font-bold text-slate-600 hover:underline">View</button>
                                                <span className="text-slate-300">|</span>
                                                <button
                                                    onClick={() => p.status !== 'RECEIVED' && router.push(`/admin/purchases/add?id=${p.id}`)}
                                                    disabled={p.status === 'RECEIVED'}
                                                    title={p.status === 'RECEIVED' ? 'Received orders cannot be edited' : 'Edit purchase order'}
                                                    className={`text-[12px] font-bold ${p.status === 'RECEIVED' ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-600 hover:underline'}`}
                                                >Edit</button>
                                                <span className="text-slate-300">|</span>
                                                <button onClick={() => setDeleteRow(p)} className="text-[12px] font-bold text-[#c40000] hover:underline">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Card>
            </div>

            <BulkBar
                sel={sel}
                entity="purchase orders"
                onDelete={bulkDelete}
                statusActions={[
                    { label: 'Mark Processing', apply: (ids) => bulkStatus(ids, 'PROCESSING') },
                    { label: 'Mark Shipped', apply: (ids) => bulkStatus(ids, 'SHIPPED') },
                    { label: 'Mark Delivered', apply: (ids) => bulkStatus(ids, 'DELIVERED') },
                    { label: 'Mark Cancelled', apply: (ids) => bulkStatus(ids, 'CANCELLED') },
                ]}
                onExport={() => exportToCSV(
                    sel.selectedItems.map((p: any) => ({
                        purchase_number: p.purchase_number,
                        supplier: p.supplier_name || '',
                        status: p.status || '',
                        payment_status: p.payment_status || 'UNPAID',
                        payment_method: p.payment_method || '',
                        total_amount: p.total_amount ?? 0,
                        paid_amount: p.paid_amount ?? 0,
                        remaining_amount: p.remaining_amount ?? 0,
                        date: formatDateTime(p.created_at || p.order_date || p.date),
                    })),
                    'purchases.csv',
                )}
            />

            {/* View Details Modal */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden text-left border border-slate-200">
                        <div className="border-b border-slate-100 p-6 flex justify-between items-center bg-white">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    Purchase Order Details
                                    <span className="text-indigo-600">#{viewRow.purchase_number}</span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[9px] font-bold uppercase tracking-tighter ml-2 animate-pulse">
                                        Last Updated: {new Date(viewRow.updated_at || viewRow.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-4">
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={12} className="text-slate-300" /> Created: {formatDateTime(viewRow.created_at || viewRow.order_date || viewRow.date)}
                                    </p>
                                    <div className="w-[1px] h-3 bg-slate-200" />
                                    <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <RefreshCw size={12} className="text-indigo-600/50" /> Updated: {formatDateTime(viewRow.updated_at || viewRow.created_at)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setViewRow(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8 flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <Card className="p-6">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Products</p>
                                    <table className="w-full text-[13px]">
                                        <thead><tr className="text-left text-slate-500"><th className="pb-3 px-2">Name</th><th className="pb-3 text-center">Qty</th><th className="pb-3 text-right">Unit Cost</th><th className="pb-3 text-right">Total</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viewRow.items?.map((item: any) => {
                                                const img = item.product_image;
                                                const price = parseFloat(item.price || 0);
                                                const qty = item.quantity || 0;
                                                const isCarton = item.packaging_type === 'CARTON';
                                                const units = item.total_units ?? (isCarton ? qty * (item.items_per_carton || 1) : qty);
                                                const subtotal = item.subtotal ?? (price * units);
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="py-3 px-2 font-bold text-slate-900">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center p-1">
                                                                    {img ? <img src={getImageUrl(img)} alt="" className="w-full h-full object-contain" /> : <Package size={16} className="text-slate-200" />}
                                                                </div>
                                                                <span>{item.product_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center tabular-nums">
                                                            {isCarton ? (
                                                                <div className="flex flex-col leading-tight">
                                                                    <span className="font-bold text-slate-900">{units} pcs</span>
                                                                    <span className="text-[10px] text-slate-400">{qty} ctn × {item.items_per_carton || 1}</span>
                                                                </div>
                                                            ) : (
                                                                <span>{qty}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-right text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                                                        <td className="py-3 text-right font-bold text-indigo-600 tabular-nums">{formatCurrency(subtotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                                <div className="grid grid-cols-3 gap-6">
                                    <Card className="p-6">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Supplier</p>
                                        <p className="font-bold text-slate-900">{viewRow.supplier_name || '—'}</p>
                                        <p className="text-[12px] text-slate-600 mt-1">{viewRow.supplier_phone || '—'}</p>
                                    </Card>

                                    <Card className="p-6">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status</p>
                                        <div className="flex flex-col gap-2">
                                            <div><StatusPill status={viewRow.status} /></div>
                                            <p className="text-[12px] font-bold text-emerald-600 uppercase tracking-widest">{viewRow.payment_status || 'UNPAID'}</p>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                            <aside className="w-full lg:w-[320px] space-y-6">
                                <Card className="p-6">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Summary</p>
                                    <div className="space-y-3 text-[13px]">
                                        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency((viewRow.total_amount || 0) - (viewRow.tax_amount || 0) - (viewRow.shipping_cost || 0))}</span></div>
                                        <div className="flex justify-between text-slate-600"><span>Shipping</span><span className="tabular-nums">{formatCurrency(viewRow.shipping_cost || 0)}</span></div>
                                        <div className="flex justify-between text-slate-600"><span>Tax</span><span className="tabular-nums">{formatCurrency(viewRow.tax_amount || 0)}</span></div>
                                        <div className="flex justify-between font-bold text-slate-900 pt-3 border-t border-slate-100 mt-3 text-[18px]"><span>Total</span><span className="text-indigo-600 tabular-nums">{formatCurrency(viewRow.total_amount || 0)}</span></div>
                                    </div>
                                    {(() => {
                                        const total = Number(viewRow.total_amount || 0);
                                        const paid = Number(viewRow.paid_amount || (viewRow.payment_status === 'PAID' ? viewRow.total_amount : 0) || 0);
                                        const due = Math.max(0, total - paid);
                                        const payDate = viewRow.payment_date
                                            ? formatDateTime(viewRow.payment_date)
                                            : '—';
                                        return (
                                            <div className="space-y-3 text-[13px] mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex justify-between text-slate-600"><span>Paid Amount</span><span className="tabular-nums font-bold text-emerald-600">{formatCurrency(paid)}</span></div>
                                                <div className="flex justify-between text-slate-600"><span>Remaining / Due</span><span className={`tabular-nums font-bold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(due)}</span></div>
                                                <div className="flex justify-between text-slate-600"><span>Payment Date</span><span className="font-bold text-slate-700">{payDate}</span></div>
                                                <div className="flex justify-between text-slate-600"><span>Method</span><span className="font-bold text-slate-700 capitalize">{(viewRow.payment_method || '—').toString().replace('_', ' ').toLowerCase()}</span></div>
                                                {viewRow.transaction_id && (
                                                    <div className="flex justify-between text-slate-600"><span>Transaction / Ref</span><span className="font-bold text-slate-700 font-mono">{viewRow.transaction_id}</span></div>
                                                )}
                                                {viewRow.payment_confirmed && (
                                                    <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-emerald-600 uppercase tracking-tighter"><CheckCircle2 size={12} /> Supplier Verified</div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </Card>
                                <Button className="w-full" onClick={() => router.push(`/admin/purchases/${viewRow.id}/invoice`)}><Printer size={16} /> View Invoice</Button>
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
        formData.append('payment_notes', paymentNotes);
        if (transactionId) formData.append('transaction_id', transactionId);
        if (paymentSlip) formData.append('payment_slip', paymentSlip);
        // Distributor just submitted/updated — supplier must verify again.
        formData.append('payment_confirmed', 'false');
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

                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-slate-900">Evidence / Receipt</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="payment-slip-modal"
                                        className="hidden"
                                        onChange={(e) => setPaymentSlip(e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor="payment-slip-modal"
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-white ${paymentSlip ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${paymentSlip ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                            {paymentSlip ? <CheckCircle size={20} /> : <Upload size={20} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[13px] font-bold ${paymentSlip ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                {paymentSlip ? paymentSlip.name : 'Upload Payment Slip / Receipt'}
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                {paymentSlip ? 'Click to change' : 'PNG, JPG or PDF up to 5MB'}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

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

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[13px] font-bold text-slate-900">
                                        {paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'Ref / Transaction ID'}
                                    </label>
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder={paymentMethod === 'CHEQUE' ? 'e.g. 001234' : 'e.g. CASH-102938'}
                                        value={transactionId}
                                        onChange={e => setTransactionId(e.target.value)}
                                    />
                                </div>

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

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[13px] font-bold text-slate-900">Internal Notes</label>
                                    <textarea
                                        className={inputCls + " h-20 py-2 resize-none"}
                                        placeholder="Add details about this payment..."
                                        value={paymentNotes}
                                        onChange={e => setPaymentNotes(e.target.value)}
                                    />
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
