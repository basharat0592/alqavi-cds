"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Package, Loader2, Filter,
    Users, Clock, CreditCard, FileText, Lock, Calendar, FileSpreadsheet, Printer,
    ChevronRight, ChevronLeft, Truck, History, ListFilter, Building2, MapPin, Mail, Phone,
    Upload, CheckCircle2, Info, Warehouse as WarehouseIcon, ShieldCheck, Banknote,
    Check, X as XIcon, ChevronDown
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { companyService } from '@/services/company.service';
import { productService } from '@/services/product.service';
import { formatDate, formatDateTime, formatCurrency, exportToCSV, getImageUrl } from '@/lib/utils';
import { inventoryService } from '@/services/inventory.service';
import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { WarehouseSelectionModal } from '@/components/admin/WarehouseSelectionModal';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - PURCHASES
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[29px] px-4 rounded-[3px] text-[13px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any; dot: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: Clock },
    PROCESSING: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: RefreshCw },
    SHIPPED: { label: 'Shipped', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', icon: Truck },
    DELIVERED: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
    RECEIVED: { label: 'Received', cls: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500', icon: Package },
    CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: XIcon },
};

const StatusDropdown = ({ status, onStatusChange }: { status: string; onStatusChange: (newStatus: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const current = STATUS_CONFIG[status.toUpperCase()] || STATUS_CONFIG.PENDING;
    const Icon = current.icon;

    return (
        <div className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2.5 py-1.5 px-4 border rounded-full text-[10px] font-black uppercase transition-all
                    shadow-[0_2px_4px_rgba(0,0,0,0.02),0_1px_0_rgba(255,255,255,0.8)_inset] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12)] 
                    active:scale-95 group relative overflow-hidden tracking-widest border-opacity-60
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

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-2 w-52 bg-white/95 backdrop-blur-md border border-[#ddd] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[101] overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-3 border-b border-[#eee] mb-1">
                            <p className="text-[10px] font-black text-[#aaa] uppercase tracking-[0.2em]">Select New Status</p>
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
                                        ${isActive ? 'bg-[#f7f8fa] text-[#c45500]' : 'text-[#565959] hover:bg-[#f3f7f7] hover:text-[#111] hover:pl-7'}
                                    `}
                                >
                                    <div className={`p-2 rounded-xl border shadow-sm transition-transform ${cfg.cls} ${isActive ? 'scale-110 shadow-md' : 'group-hover:scale-105'}`}>
                                        <ItemIcon size={14} className={key === 'PROCESSING' ? 'animate-spin' : ''} />
                                    </div>
                                    <span className="uppercase tracking-wider text-[11px]">{cfg.label}</span>
                                    {isActive && (
                                        <div className="ml-auto bg-[#c45500] p-1 rounded-full shadow-sm">
                                            <Check size={10} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const StatusPill = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status.toUpperCase()] || STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] border text-[11px] font-bold capitalize ${cfg.cls}`}>
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

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-3 sm:px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Purchases</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h1 className="text-[20px] sm:text-[22px] font-normal text-[#111]">Purchases</h1>
                            <p className="text-[12px] sm:text-[13px] text-[#565959] mt-0.5">Manage stock purchases from suppliers</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Btn variant="secondary" onClick={() => exportToCSV(purchases, 'Purchases.csv')} className="whitespace-nowrap">
                                <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Export</span>
                            </Btn>
                            <Btn onClick={() => router.push('/admin/purchases/add')} className="whitespace-nowrap">
                                <Plus size={14} /> New Purchase
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-3 sm:px-6 mt-6 sm:mt-8 text-left">
                {/* Search & Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-4 sm:p-5 mb-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-[13px] font-bold text-[#111] mb-1.5">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search order # or supplier..."
                                className={inputCls + " pl-10 h-[35px]"}
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-4 flex-1 md:flex-initial">
                        <div className="flex-1 md:w-[160px]">
                            <label className="block text-[13px] font-bold text-[#111] mb-1.5">Payment</label>
                            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className={inputCls + " h-[35px] cursor-pointer"}>
                                <option value="All">All Payments</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div className="flex-1 md:w-[180px]">
                            <label className="block text-[13px] font-bold text-[#111] mb-1.5">Supplier</label>
                            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className={inputCls + " h-[35px] cursor-pointer w-full"}>
                                <option value="All">All Suppliers</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.company ? `${s.company} - ` : ''}{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end shrink-0">
                            <Btn variant="secondary" onClick={() => load()} loading={loading} className="h-[35px] px-3.5">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </Btn>
                        </div>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className="flex gap-8 border-b border-[#ddd] mb-6 px-1 overflow-x-auto scrollbar-hide">
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
                                ? 'text-[#c45500]' : 'text-[#565959] hover:text-[#111]'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {((statusFilter === 'All' && tab.id === 'all') || (statusFilter.toLowerCase() === tab.id) || (statusFilter === 'active' && tab.id === 'active')) && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#c45500]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Mobile Card List ── */}
                <div className="md:hidden space-y-3 mb-6">
                    {loading && filtered.length === 0 ? (
                        <div className="bg-white border border-[#ddd] rounded-[4px] py-16 text-center shadow-sm">
                            <Loader2 size={32} className="animate-spin text-[#c45500] mx-auto mb-3" />
                            <p className="text-[13px] text-[#565959] font-medium italic">Loading purchases...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white border border-[#ddd] rounded-[4px] py-16 text-center shadow-sm">
                            <p className="text-[13px] text-[#565959] italic">No purchases found.</p>
                        </div>
                    ) : (
                        filtered.map((p: any) => (
                            <div key={p.id} className="bg-white border border-[#ddd] rounded-[4px] shadow-sm p-4 space-y-3 text-left">
                                {/* Row 1: First Item Image + Order # & Date */}
                                <div className="flex gap-3">
                                    <div className="w-14 h-14 bg-white rounded border border-[#ddd] overflow-hidden flex items-center justify-center shrink-0">
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
                                            <h3 className="text-[14px] font-bold text-[#007185] hover:underline cursor-pointer" onClick={() => handleViewDetails(p.id)}>
                                                #{p.purchase_number}
                                            </h3>
                                            <div className="text-[15px] font-bold text-[#111]">{formatCurrency(p.total_amount)}</div>
                                        </div>
                                        <div className="text-[10px] text-[#565959] font-bold mt-1 uppercase tracking-tight">
                                            {formatDateTime(p.created_at || p.order_date || p.date)}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Status Controls */}
                                <div className="grid grid-cols-2 gap-3 py-2.5 border-t border-b border-[#eee] items-center">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Order Status</span>
                                        <StatusDropdown 
                                            status={p.status || 'PENDING'} 
                                            onStatusChange={(newStatus) => handleStatusChange(p.id, newStatus)} 
                                        />
                                        {p.status === 'RECEIVED' && (
                                            <div className={`text-[9px] font-black uppercase flex items-center gap-1 mt-1 ${p.is_inventory_synced ? 'text-emerald-600' : 'text-amber-600'}`}>
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
                                                <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-[2px] uppercase tracking-tighter animate-pulse">
                                                    Pending Verify
                                                </span>
                                                <span className="text-[8px] text-slate-400 font-semibold">
                                                    {p.payment_method?.replace('_', ' ') || 'CASH'} Submitted
                                                </span>
                                            </div>
                                        ) : (
                                            <div className={`text-[10px] font-bold uppercase tracking-widest ${p.payment_status?.toLowerCase() === 'paid' ? 'text-green-600' : 'text-[#c45500]'}`}>
                                                {p.payment_status || 'UNPAID'} • {p.payment_method?.replace('_', ' ') || 'CASH'}
                                            </div>
                                        )}
                                        
                                        {(!p.payment_status || p.payment_status.toLowerCase() !== 'paid') && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPayModal({ open: true, purchase: p }); }}
                                                className="mt-1 text-[9px] font-bold bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] px-2 py-0.5 rounded-[3px] shadow-sm transition-all uppercase whitespace-nowrap"
                                            >
                                                {p.payment_status?.toLowerCase() === 'partial' ? 'Pay Bal' : 'Pay Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Row 3: Remaining Balance if any */}
                                {(p.remaining_amount > 0) && (
                                    <div className="flex items-center justify-between text-[11px] bg-red-50/40 border border-red-100 rounded px-2.5 py-1.5">
                                        <span className="font-medium text-[#565959]">Remaining Balance:</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-red-600">{formatCurrency(p.remaining_amount)}</span>
                                            {p.payment_confirmed && <CheckCircle2 size={12} className="text-emerald-500" />}
                                        </div>
                                    </div>
                                )}

                                {/* Row 4: Action Controls */}
                                <div className="flex gap-2 pt-2 border-t border-[#eee]">
                                    <button
                                        onClick={() => router.push(`/admin/tracking?q=${p.purchase_number}`)}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-[30px] border border-[#ddd] rounded bg-white hover:bg-slate-50 text-blue-600 text-[12px] font-bold shadow-sm"
                                    >
                                        <Truck size={13} /> Track
                                    </button>
                                    <button
                                        onClick={() => handleViewDetails(p.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-[30px] border border-[#ddd] rounded bg-white hover:bg-slate-50 text-[#565959] text-[12px] font-bold shadow-sm"
                                    >
                                        <Eye size={13} /> View
                                    </button>
                                    <button
                                        onClick={() => setDeleteRow(p)}
                                        className="flex-1 flex items-center justify-center gap-1.5 h-[30px] border border-red-200 rounded bg-red-50/50 hover:bg-red-50 text-red-600 text-[12px] font-bold shadow-sm"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white border border-[#ddd] rounded-[4px] shadow-sm text-left mb-6 relative z-10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3 w-[80px]">Item</th>
                                <th className="px-6 py-3">Order #</th>
                                <th className="px-6 py-3">Order Status</th>
                                <th className="px-6 py-3">Payment Status</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {loading && filtered.length === 0 ? <tr><td colSpan={6} className="py-20 text-center text-[13px] text-[#565959]">Loading purchases...</td></tr> : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-[13px] text-[#565959]">No purchases found.</td></tr>
                            ) : (
                                filtered.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-white rounded border border-[#ddd] overflow-hidden flex items-center justify-center group-hover:border-[#e77600] transition-colors">
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
                                            <div className="font-bold text-[#007185] hover:underline cursor-pointer" onClick={() => handleViewDetails(p.id)}>#{p.purchase_number}</div>
                                            <div className="text-[11px] text-[#565959] font-bold mt-1 uppercase tracking-tight">{formatDateTime(p.created_at || p.order_date || p.date)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 min-h-[32px] justify-center">
                                                <StatusDropdown
                                                    status={p.status || 'PENDING'}
                                                    onStatusChange={(newStatus) => handleStatusChange(p.id, newStatus)}
                                                />
                                                {p.status === 'RECEIVED' && (
                                                    <div className={`text-[9px] font-black uppercase flex items-center gap-1 mt-1 ${p.is_inventory_synced ? 'text-emerald-600' : 'text-amber-600'}`}>
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
                                                            <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-[3px] w-fit uppercase tracking-tighter animate-pulse">
                                                                Waiting for Confirmation
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-bold ml-0.5">
                                                            {p.payment_method?.replace('_', ' ') || 'CASH'} Submitted
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${p.payment_status?.toLowerCase() === 'paid' ? 'text-green-600' : 'text-[#c45500]'}`}>
                                                        {p.payment_status || 'UNPAID'} • {p.payment_method?.replace('_', ' ') || 'CASH'}
                                                    </div>
                                                )}

                                                {(!p.payment_status || p.payment_status.toLowerCase() !== 'paid') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPayModal({ open: true, purchase: p }); }}
                                                        className="mt-1 text-[10px] font-bold bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111] px-2.5 py-1 rounded-[3px] shadow-sm transition-all w-fit uppercase"
                                                    >
                                                        {p.payment_status?.toLowerCase() === 'partial' ? 'Pay Balance' : 'Pay Now'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-[#111]">{formatCurrency(p.total_amount)}</div>
                                            {(p.remaining_amount > 0) && (
                                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                                    <div className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">
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
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                <button onClick={() => router.push(`/admin/tracking?q=${p.purchase_number}`)} className="flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:underline"><Truck size={14} /> Track</button>
                                                <button onClick={() => handleViewDetails(p.id)} className="flex items-center gap-1.5 text-[12px] font-bold text-[#565959] hover:underline"><Eye size={14} /> View</button>
                                                <button onClick={() => setDeleteRow(p)} className="flex items-center gap-1.5 text-[12px] font-bold text-red-600 hover:underline"><Trash2 size={14} /> Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details Modal */}
            {viewRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-4xl bg-[#fcfdff] rounded-[4px] shadow-2xl overflow-hidden text-left border border-[#ddd]">
                        <div className="border-b border-[#ddd] p-6 flex justify-between items-center bg-[#f7f8fa]">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="text-[16px] font-bold text-[#111] flex items-center gap-2">
                                    Purchase Order Details
                                    <span className="text-[#007185]">#{viewRow.purchase_number}</span>
                                    <span className="px-2 py-0.5 bg-amber-50 text-[#c45500] border border-amber-100 rounded-[3px] text-[9px] font-black uppercase tracking-tighter ml-2 animate-pulse">
                                        Last Updated: {new Date(viewRow.updated_at || viewRow.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </h2>
                                <div className="flex items-center gap-4">
                                    <p className="text-[11px] text-[#565959] font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={12} className="text-slate-300" /> Created: {formatDateTime(viewRow.created_at || viewRow.order_date || viewRow.date)}
                                    </p>
                                    <div className="w-[1px] h-3 bg-slate-200" />
                                    <p className="text-[11px] text-[#c45500] font-black uppercase tracking-widest flex items-center gap-1">
                                        <RefreshCw size={12} className="text-[#c45500]/50" /> Updated: {formatDateTime(viewRow.updated_at || viewRow.created_at)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setViewRow(null)} className="text-[#aaa] hover:text-[#111]"><X size={24} /></button>
                        </div>
                        <div className="p-8 flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <div className="bg-white border border-[#ddd] rounded-[4px] p-6">
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3 pb-2 border-b">Products</p>
                                    <table className="w-full text-[13px]">
                                        <thead><tr className="text-left text-[#565959]"><th className="pb-3 px-2">Name</th><th className="pb-3 text-center">Qty</th><th className="pb-3 text-right">Total</th></tr></thead>
                                        <tbody className="divide-y divide-[#eee]">
                                            {viewRow.items?.map((item: any) => {
                                                const img = item.product_image;
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="py-3 px-2 font-bold text-[#111]">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-white border border-[#eee] rounded-[2px] flex-shrink-0 flex items-center justify-center p-1">
                                                                    {img ? <img src={getImageUrl(img)} alt="" className="w-full h-full object-contain" /> : <Package size={16} className="text-gray-100" />}
                                                                </div>
                                                                <span>{item.product_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-center">{item.quantity}</td>
                                                        <td className="py-3 text-right font-bold text-[#007185]">{formatCurrency(item.subtotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-white border border-[#ddd] rounded-[4px] p-6">
                                        <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3">Supplier</p>
                                        <p className="font-bold text-[#111]">{viewRow.supplier_name || '—'}</p>
                                        <p className="text-[12px] text-[#565959] mt-1">{viewRow.supplier_phone || '—'}</p>
                                    </div>

                                    <div className="bg-white border border-[#ddd] rounded-[4px] p-6">
                                        <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3">Status</p>
                                        <div className="flex flex-col gap-2">
                                            <div><StatusPill status={viewRow.status} /></div>
                                            <p className="text-[12px] font-bold text-green-600 uppercase tracking-widest">{viewRow.payment_status || 'UNPAID'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <aside className="w-full lg:w-[320px] space-y-6">
                                <div className="bg-white border border-[#ddd] rounded-[4px] p-6">
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-4">Summary</p>
                                    <div className="space-y-3 text-[13px]">
                                        <div className="flex justify-between text-[#565959]"><span>Subtotal</span><span>{formatCurrency((viewRow.total_amount || 0) - (viewRow.tax_amount || 0) - (viewRow.shipping_cost || 0))}</span></div>
                                        <div className="flex justify-between text-[#565959]"><span>Shipping</span><span>{formatCurrency(viewRow.shipping_cost || 0)}</span></div>
                                        <div className="flex justify-between text-[#565959]"><span>Tax</span><span>{formatCurrency(viewRow.tax_amount || 0)}</span></div>
                                        <div className="flex justify-between font-bold text-[#111] pt-3 border-t mt-3 text-[18px]"><span>Total</span><span className="text-[#c45500]">{formatCurrency(viewRow.total_amount || 0)}</span></div>
                                    </div>
                                </div>
                                <Btn className="w-full h-[35px]" onClick={() => window.print()}><Printer size={16} /> Print Invoice</Btn>
                            </aside>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] w-full max-w-sm shadow-2xl p-8 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border border-red-100 font-bold"><Trash2 size={32} /></div>
                        <h3 className="text-[18px] font-bold text-[#111]">Delete Purchase?</h3>
                        <p className="text-[13px] text-[#565959] mt-3">Delete record <span className="font-bold">#{deleteRow.purchase_number}</span>? This cannot be undone.</p>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setDeleteRow(null)} className="flex-1 py-2 text-[13px] font-bold text-[#565959] hover:underline">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-600 text-white rounded-[3px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm">
                                {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
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
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => {
        if (purchase && isOpen) {
            setPaymentStatus(purchase.payment_status?.toUpperCase() === 'PARTIAL' ? 'PARTIAL' : '');
            setPaymentMethod(purchase.payment_method?.toUpperCase() || 'CASH');
            setPaymentDate(purchase.payment_date ? purchase.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
            setTransactionId(purchase.transaction_id || '');
            setPaidAmount(purchase.paid_amount || 0);
            setPaymentNotes(purchase.payment_notes || '');
            setPaymentSlip(null);
        }
    }, [purchase, isOpen]);

    if (!isOpen || !purchase) return null;

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append('payment_status', paymentStatus);
        formData.append('payment_method', paymentMethod);
        const finalPaid = paymentStatus === 'PAID' ? purchase.total_amount : paidAmount;
        formData.append('paid_amount', finalPaid.toString());
        formData.append('payment_date', paymentDate);
        formData.append('payment_notes', paymentNotes);
        if (transactionId) formData.append('transaction_id', transactionId);
        if (paymentSlip) formData.append('payment_slip', paymentSlip);
        // Explicitly set payment_confirmed to false when distributor submits/updates payment
        formData.append('payment_confirmed', 'false');
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
            <div className="w-full max-w-xl bg-white rounded-[4px] shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col border border-[#ddd]">
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center bg-[#f7f8fa] border-b border-[#ddd] shrink-0">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#111]">Verify Payment</h2>
                        <p className="text-[13px] text-[#565959] mt-0.5">Purchase Order <span className="font-bold text-[#c45500]">#{purchase.purchase_number}</span> • {formatCurrency(purchase.total_amount)}</p>
                    </div>
                    <button onClick={onClose} className="text-[#888] hover:text-[#111] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-8 py-8 overflow-y-auto flex-1 scrollbar-hide bg-[#fcfdff]">
                    {/* Status Toggle - Amazon Styled */}
                    <div className="bg-[#f3f3f3] p-1 rounded-[4px] flex gap-1 mb-8 border border-[#ddd]">
                        <button
                            onClick={() => setPaymentStatus('PAID')}
                            className={`flex-1 py-2.5 rounded-[3px] text-[13px] font-bold transition-all ${paymentStatus === 'PAID' ? 'bg-white text-[#111] shadow-sm border border-[#bbb]' : 'text-[#565959] hover:text-[#111]'}`}
                        >
                            Fully Paid
                        </button>
                        <button
                            onClick={() => setPaymentStatus('PARTIAL')}
                            className={`flex-1 py-2.5 rounded-[3px] text-[13px] font-bold transition-all ${paymentStatus === 'PARTIAL' ? 'bg-white text-[#111] shadow-sm border border-[#bbb]' : 'text-[#565959] hover:text-[#111]'}`}
                        >
                            Partial Payment
                        </button>
                    </div>

                    {paymentStatus ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-[#111]">Evidence / Receipt</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="payment-slip-modal"
                                        className="hidden"
                                        onChange={(e) => setPaymentSlip(e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor="payment-slip-modal"
                                        className={`flex items-center gap-4 p-4 rounded-[4px] border-2 border-dashed transition-all cursor-pointer bg-white ${paymentSlip ? 'border-green-500 bg-green-50/30' : 'border-[#ddd] hover:border-[#e77600] hover:bg-[#f3f7f7]'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center border ${paymentSlip ? 'bg-green-100 border-green-200 text-green-600' : 'bg-[#f7f8fa] border-[#ddd] text-gray-400'}`}>
                                            {paymentSlip ? <CheckCircle size={20} /> : <Upload size={20} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[13px] font-bold ${paymentSlip ? 'text-green-700' : 'text-[#111]'}`}>
                                                {paymentSlip ? paymentSlip.name : 'Upload Payment Slip / Receipt'}
                                            </span>
                                            <span className="text-[11px] text-[#565959]">
                                                {paymentSlip ? 'Click to change' : 'PNG, JPG or PDF up to 5MB'}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Payment Method</label>
                                    <select className={inputCls} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="ONLINE">Online / UPI</option>
                                        <option value="CREDIT">Credit</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Payment Date</label>
                                    <input type="date" className={inputCls} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                                </div>

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">
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

                                {paymentStatus === 'PARTIAL' && (
                                    <div className="col-span-2 p-5 bg-[#f7f8fa] rounded-[4px] border border-[#ddd] flex items-center justify-between shadow-sm">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-bold text-[#565959] uppercase tracking-tighter">Amount to Pay</label>
                                            <div className="flex items-center text-[22px] font-bold text-[#b12704]">
                                                <span className="mr-1 text-[16px]">Rs.</span>
                                                <input
                                                    type="number"
                                                    className="bg-transparent outline-none w-32 border-b border-dotted border-[#b12704] focus:border-solid"
                                                    value={paidAmount}
                                                    onChange={e => setPaidAmount(parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <span className="text-[11px] font-bold text-[#565959] uppercase tracking-tighter">Remaining Balance</span>
                                            <p className="text-[18px] font-bold text-[#111]">{formatCurrency((purchase.total_amount || 0) - (paidAmount || 0))}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[13px] font-bold text-[#111]">Internal Notes</label>
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
                        <div className="h-32 flex flex-col items-center justify-center text-center space-y-2 bg-[#fcfdff] rounded-[4px] border border-dashed border-[#ddd]">
                            <Info size={20} className="text-gray-300" />
                            <p className="text-[13px] text-[#565959]">Please select a payment type above to continue</p>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 flex gap-2 shrink-0 bg-[#f7f8fa] border-t border-[#ddd] justify-end">
                    <button onClick={onClose} disabled={loading} className="h-[29px] px-6 rounded-[3px] text-[13px] font-medium border border-[#adb1b8] bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]">
                        Cancel
                    </button>
                    {paymentStatus && (
                        <Btn
                            onClick={handleSubmit}
                            loading={loading}
                            className="min-w-[150px] !h-[29px]"
                        >
                            Confirm Payment
                        </Btn>
                    )}
                </div>
            </div>
        </div>
    );
};
