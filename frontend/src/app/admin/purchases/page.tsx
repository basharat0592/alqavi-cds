"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Search, RefreshCw, Trash2, Eye, Edit2,
    X, CheckCircle, AlertTriangle, Package, Loader2, Filter,
    Users, Clock, CreditCard, FileText, Lock, Calendar, FileSpreadsheet, Printer,
    ChevronRight, ChevronLeft, Truck, History, ListFilter, Building2, MapPin, Mail, Phone
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { formatDate, formatCurrency, exportToCSV } from '@/lib/utils';
import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";

const statusStyle: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    ordered: 'bg-blue-50 text-blue-700 border-blue-200',
};

const StatusPill = ({ status }: { status: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded-[3px] border text-[11px] font-bold capitalize ${statusStyle[(status || '').toLowerCase()] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
        {(status || '').replace('_', ' ')}
    </span>
);

export default function PurchasesPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [paymentFilter, setPaymentFilter] = useState('All');

    const [viewRow, setViewRow] = useState<any | null>(null);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [deleteRow, setDeleteRow] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

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
            if (searchTerm) params.search = searchTerm;
            const data = await purchaseService.getAll(params);
            setPurchases(data || []);
        } catch (err: any) {
            console.error(err);
            if (!silent) {
                const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to load purchases';
                toast.error(msg);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [statusFilter, paymentFilter, searchTerm]);

    useEffect(() => { load(); }, [load]);

    // REAL-TIME AUTO-SYNC: Refresh list every 2s
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && !isUpdating && !editRow && !viewRow) {
                load(true);
            }
        }, 2000); // 2 seconds
        return () => clearInterval(interval);
    }, [load, loading, isUpdating, editRow, viewRow]);

    const handleViewDetails = async (id: string) => {
        try {
            const data = await purchaseService.getById(id);
            setViewRow(data);
        } catch { toast.error('Failed to load details'); }
    };

    const handleUpdateStatus = async () => {
        if (!editRow) return;
        setIsUpdating(true);
        try {
            const payload: any = { status: editRow.status };
            if (editRow.status !== 'cancelled') {
                if (editRow.payment_status) payload.payment_status = editRow.payment_status;
                if (editRow.payment_method) payload.payment_method = editRow.payment_method;
            }
            await purchaseService.update(editRow.id, payload);
            setEditRow(null);
            load();
            toast.success('Status updated');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.response?.data?.message || 'Update failed';
            toast.error(msg);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteRow) return;
        setDeleting(true);
        try {
            await purchaseService.delete(deleteRow.id);
            setDeleteRow(null); load(); toast.success('Purchase deleted');
        } catch { toast.error('Delete failed'); } finally { setDeleting(false); }
    };

    const purchasesList = Array.isArray(purchases) ? purchases : (purchases && purchases.results) ? purchases.results : [];
    const filtered = purchasesList;

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-[#0f1111]">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 text-left">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">Purchases</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">Purchases</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">Manage stock purchases from suppliers</p>
                        </div>
                        <div className="flex gap-2">
                            <Btn variant="secondary" onClick={() => exportToCSV(purchases, 'Purchases.csv')}>
                                <FileSpreadsheet size={14} /> Export
                            </Btn>
                            <Btn onClick={() => router.push('/admin/purchases/add')}>
                                <Plus size={14} /> New Purchase
                            </Btn>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 text-left">
                {/* Search & Filters */}
                <div className="bg-white border border-[#ddd] rounded-[4px] p-5 mb-6 shadow-sm flex items-end gap-4 overflow-x-auto">
                    <div className="flex-1 min-w-[300px]">
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
                    <div className="w-[160px]">
                        <label className="block text-[13px] font-bold text-[#111] mb-1.5">Payment</label>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className={inputCls + " h-[35px] cursor-pointer"}>
                            <option value="All">All Payments</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                    <Btn variant="secondary" onClick={load} loading={loading} className="h-[35px]">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Btn>
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

                {/* Table */}
                <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden text-left mb-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f8fa] border-b border-[#ddd] text-[12px] font-bold text-[#111]">
                                <th className="px-6 py-3">Order #</th>
                                <th className="px-6 py-3">Supplier</th>
                                <th className="px-6 py-3">Status & Payment</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eee]">
                            {loading && filtered.length === 0 ? <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">Loading purchases...</td></tr> : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-[13px] text-[#565959]">No purchases found.</td></tr>
                            ) : (
                                filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-[#fcfdff] transition-colors group text-[13px]">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#007185] hover:underline cursor-pointer" onClick={() => handleViewDetails(p.id)}>#{p.purchase_number}</div>
                                            <div className="text-[11px] text-[#aaa] mt-1">{formatDate(p.created_at)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#111]">{p.supplier_name}</div>
                                            <div className="text-[11px] text-[#565959] mt-1 flex items-center gap-1"><Phone size={10} /> {p.supplier_phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div><StatusPill status={p.status} /></div>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${p.payment_status === 'paid' ? 'text-green-600' : 'text-[#c45500]'}`}>
                                                        {p.payment_status || 'UNPAID'} • {p.payment_method?.replace('_', ' ') || 'CASH'}
                                                    </div>
                                                    {p.status === 'RECEIVED' && (
                                                        <div className={`text-[9px] font-black uppercase flex items-center gap-1 ${p.is_inventory_synced ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {p.is_inventory_synced ? (
                                                                <><Package size={10} /> Sync Complete</>
                                                            ) : (
                                                                <><RefreshCw size={10} className="animate-pulse" /> Pending Sync</>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-[#111]">
                                            {formatCurrency(p.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 transition-opacity">
                                                <button onClick={() => handleViewDetails(p.id)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-[#f7f8fa] text-[#565959]"><Eye size={14} /></button>
                                                <button onClick={() => setEditRow(p)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-amber-50 text-amber-600"><Edit2 size={14} /></button>
                                                <button onClick={() => setDeleteRow(p)} className="p-1.5 border border-[#ddd] rounded bg-white hover:bg-red-50 text-red-600"><Trash2 size={14} /></button>
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
                        <div className="bg-white border-b border-[#ddd] p-6 flex justify-between items-center bg-[#f7f8fa]">
                            <h2 className="text-[16px] font-bold text-[#111]">Purchase Order Details <span className="text-[#565959] font-normal ml-2">#{viewRow.purchase_number}</span></h2>
                            <button onClick={() => setViewRow(null)} className="text-[#aaa] hover:text-[#111]"><X size={24} /></button>
                        </div>
                        <div className="p-8 flex flex-col lg:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <div className="bg-white border border-[#ddd] rounded-[4px] p-6">
                                    <p className="text-[11px] font-bold text-[#aaa] uppercase tracking-widest mb-3 pb-2 border-b">Products</p>
                                    <table className="w-full text-[13px]">
                                        <thead><tr className="text-left text-[#565959]"><th className="pb-3 px-2">Name</th><th className="pb-3 text-center">Qty</th><th className="pb-3 text-right">Total</th></tr></thead>
                                        <tbody className="divide-y divide-[#eee]">
                                            {viewRow.items?.map((item: any) => (
                                                <tr key={item.id}><td className="py-3 px-2 font-bold text-[#111]">{item.product_name}</td><td className="py-3 text-center">{item.quantity}</td><td className="py-3 text-right font-bold text-[#007185]">{formatCurrency(item.subtotal)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
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

            {/* Edit Modal */}
            {editRow && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded-[4px] border border-[#ddd] w-full max-w-lg shadow-2xl overflow-hidden text-left">
                        <div className="p-6 border-b border-[#ddd] flex justify-between items-center bg-[#f7f8fa]">
                            <h3 className="text-[15px] font-bold text-[#111]">Update Status</h3>
                            <button onClick={() => setEditRow(null)} className="text-[#aaa] hover:text-[#111]"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div>
                                <label className="block text-[13px] font-bold text-[#111] mb-2">Order Status</label>
                                <select 
                                    disabled={editRow.status === 'RECEIVED' && editRow.is_inventory_synced}
                                    value={editRow.status} 
                                    onChange={(e: any) => setEditRow({ ...editRow, status: e.target.value })} 
                                    className={inputCls + " h-[35px] cursor-pointer" + (editRow.status === 'RECEIVED' && editRow.is_inventory_synced ? ' bg-gray-50 opacity-70' : '')}
                                >
                                    <option value="PENDING">Ordered</option>
                                    <option value="PROCESSING">Confirmed</option>
                                    <option value="SHIPPED">In Transit</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="RECEIVED">Received</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                {editRow.status === 'RECEIVED' && (
                                    <p className={`text-[11px] mt-1 italic ${editRow.is_inventory_synced ? 'text-[#565959]' : 'text-amber-600 font-bold'}`}>
                                        {editRow.is_inventory_synced 
                                            ? "Order is fulfilled and inventory reflects these quantities." 
                                            : "Inventory sync pending. Save to retry sync."}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#111] mb-2">Payment Status</label>
                                    <select value={editRow.payment_status || 'unpaid'} onChange={(e: any) => setEditRow({ ...editRow, payment_status: e.target.value })} className={inputCls + " h-[35px] cursor-pointer"}>
                                        <option value="unpaid">Unpaid</option>
                                        <option value="partial">Partial</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-[#111] mb-2">Payment Mode</label>
                                    <select value={editRow.payment_method || ''} onChange={(e: any) => setEditRow({ ...editRow, payment_method: e.target.value })} className={inputCls + " h-[35px] cursor-pointer"}>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="online_payment">Online Payment</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-[#f7f8fa] border-t border-[#ddd] flex justify-end gap-3">
                            <button onClick={() => setEditRow(null)} className="text-[13px] font-bold text-[#565959] hover:underline mr-4">Cancel</button>
                            <Btn onClick={handleUpdateStatus} loading={isUpdating} className="h-[35px] w-[120px]">Save</Btn>
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
        </div>
    );
}
