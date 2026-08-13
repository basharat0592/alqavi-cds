"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, Clock, MapPin, LayoutDashboard, Globe, MoreHorizontal, User, Phone, CheckCircle2, XCircle, AlertCircle, AlertTriangle, RefreshCw, Filter, ArrowRight, Eye, Printer, Hash, CreditCard, ShoppingCart, ChevronDown, Loader2, Truck, X, CheckCircle, Info, Lock, Trash2, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { salesService, orderService, inventoryService } from '@/lib/api';
import { deliveryService } from '@/services/delivery.service';
import { authService } from '@/lib/auth';
import PageLoader from '@/components/ui/PageLoader';
import { Modal } from '@/components/ui/Modal';
import { PageHeader, Card, Button, Badge, ui } from '@/components/admin/ui';
import { formatDate, formatCurrency, exportToCSV } from '@/lib/utils';
import { toast } from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN ORDERS — brand cyan/amber, slate neutrals
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;

const STATUS_OPTIONS = [
    { label: 'Pending', value: 'PENDING', color: 'bg-amber-50 text-amber-700' },
    { label: 'Delivered', value: 'DELIVERED', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Cancelled', value: 'CANCELLED', color: 'bg-slate-100 text-slate-600' },
];

const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-teal-50 text-teal-700 border-teal-200',
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
    SHIPPED: 'bg-purple-50 text-purple-700 border-purple-200',
    DELIVERED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
    CANCEL_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_DOT: Record<string, string> = {
    PENDING: 'bg-amber-500', CONFIRMED: 'bg-teal-500', PROCESSING: 'bg-blue-500',
    SHIPPED: 'bg-purple-500', DELIVERED: 'bg-green-500', CANCELLED: 'bg-rose-500',
    CANCEL_REQUESTED: 'bg-amber-500',
};
const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

/** Professional status control:
 *  - PENDING  → static badge (must be Accepted first; no dropdown)
 *  - DELIVERED / CANCELLED → locked badge (finalised, not editable)
 *  - otherwise → styled dropdown rendered in a portal so it is never clipped. */
function StatusDropdown({ order, updating, onSelect }: { order: any; updating: boolean; onSelect: (status: string) => void; }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const status = (order.status || '').toUpperCase();
    const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 border-slate-200';

    const MENU_W = 176; // w-44

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    // Locked: finalised orders cannot be changed.
    if (status === 'DELIVERED' || status === 'CANCELLED') {
        return (
            <span className={`inline-flex items-center gap-1.5 min-w-[120px] justify-center rounded-full border px-3 py-1 font-bold text-[10px] uppercase tracking-wide ${style}`} title="This order is finalised and can no longer be changed">
                <Lock size={10} /> {status}
            </span>
        );
    }

    // Pending: no dropdown until the order is Accepted.
    if (status === 'PENDING') {
        return (
            <span className={`inline-flex items-center gap-1.5 min-w-[120px] justify-center rounded-full border px-3 py-1 font-bold text-[10px] uppercase tracking-wide ${style}`} title="Accept this order to unlock status changes">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} /> {status}
            </span>
        );
    }

    const toggle = () => {
        if (open) { setOpen(false); return; }
        const r = btnRef.current?.getBoundingClientRect();
        if (r) setCoords({ top: r.bottom + 6, left: Math.max(8, r.right - MENU_W) });
        setOpen(true);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                disabled={updating}
                onClick={toggle}
                className={`inline-flex items-center justify-between gap-2 min-w-[120px] rounded-full border px-3 py-1 font-bold text-[10px] uppercase tracking-wide transition-all hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${style}`}
            >
                <span className="flex items-center gap-1.5">
                    {updating ? <Loader2 size={11} className="animate-spin" /> : <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-slate-400'}`} />}
                    {status || 'N/A'}
                </span>
                <ChevronDown size={11} className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && coords && createPortal(
                <>
                    <div className="fixed inset-0 z-[1090]" onClick={() => setOpen(false)} />
                    <div
                        style={{ top: coords.top, left: coords.left, width: MENU_W }}
                        className="fixed z-[1100] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 py-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                        {STATUS_FLOW.map(s => {
                            const active = s === status;
                            return (
                                <button
                                    key={s}
                                    onClick={() => { setOpen(false); if (s !== status) onSelect(s); }}
                                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[11px] font-semibold text-left transition-colors ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                                    <span className="capitalize">{s.toLowerCase()}</span>
                                    {active && <CheckCircle2 size={13} className="ml-auto text-[#0E8CA8]" />}
                                </button>
                            );
                        })}
                    </div>
                </>,
                document.body
            )}
        </>
    );
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingRow, setUpdatingRow] = useState<string | null>(null);
    const pageSize = 10;

    // Delivery States
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [allStocks, setAllStocks] = useState<any[]>([]);
    const [deliveryModal, setDeliveryModal] = useState<{ orderId: string, status: string, order?: any } | null>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

    // Branch context of the logged-in admin (drives branch-isolated delivery:
    // a branch admin fulfils from their OWN branch, auto-selected — no picker).
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [myWarehouses, setMyWarehouses] = useState<any[]>([]);

    // Ship → assign rider (optional) modal
    const [shipModal, setShipModal] = useState<{ orderId: string; order?: any } | null>(null);
    const [shipMode, setShipMode] = useState<'specific' | 'all'>('all');
    const [shipRiderId, setShipRiderId] = useState<string>('');
    const [shipFee, setShipFee] = useState<string>('');
    const [shippingNow, setShippingNow] = useState(false);

    // Pickup point for an order = its branch (warehouse) address.
    const pickupOf = (order: any) => {
        const wid = order?.warehouse || order?.warehouse_id;
        const wh = warehouses.find((w: any) => String(w.id) === String(wid));
        const name = wh?.name || order?.warehouse_name || 'Branch';
        const loc = wh?.location || wh?.address || '';
        return { name, loc };
    };

    // Delete States
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // WhatsApp confirmation popup
    const [waModal, setWaModal] = useState<{ number: string; message: string; tracking: string } | null>(null);

    // Delivery riders (for assigning an order to a rider)
    const [riders, setRiders] = useState<any[]>([]);

    useEffect(() => {
        loadOrders();
        inventoryService.getWarehouses().then(setWarehouses).catch(() => []);
        inventoryService.getInventory().then(setAllStocks).catch(() => []);
        deliveryService.getAll().then(setRiders).catch(() => setRiders([]));
        // Resolve the admin's branch context (client-only — reads sessionStorage).
        setIsSuperAdmin(authService.isSuperAdmin());
        setMyWarehouses((authService.getUser() as any)?.warehouses || []);
        // Live sync: silently refresh so a rider's "reported delivered" (and any other
        // status change) shows up without a manual refresh.
        const id = setInterval(() => loadOrders(true), 12000);
        return () => clearInterval(id);
    }, []);

    const activeOrders = useMemo(() => {
        // Active orders are PENDING, CONFIRMED, PROCESSING, SHIPPED, CANCEL_REQUESTED (not DELIVERED/CANCELLED)
        return (orders || []).filter((o: any) =>
            (o.status || '').toUpperCase() !== 'DELIVERED' &&
            (o.status || '').toUpperCase() !== 'CANCELLED'
        );
    }, [orders]);

    const handleStatusUpdateWithLoading = async (id: string, newStatus: string) => {
        const order = orders.find((o: any) => o.id?.toString() === id.toString());
        if (newStatus.toLowerCase() === 'delivered') {
            // Super admin must pick which branch fulfils the order → show the picker.
            if (isSuperAdmin) {
                setSelectedWarehouse('');
                setDeliveryModal({ orderId: id, status: newStatus, order });
                return;
            }
            // Branch admin: deliver directly, NO popup. The backend auto-deducts
            // from their OWN branch and books the sale to their branch accounts.
            setUpdatingRow(id);
            try {
                await orderService.update(id, { status: 'DELIVERED' });
                toast.success('Order delivered & stock deducted');
                loadOrders();
            } catch (err: any) {
                const code = err?.response?.status;
                const msg = err?.response?.data?.error || 'Delivery update failed';
                // 400 = branch couldn't be auto-resolved (admin manages several) →
                // fall back to the picker so they can choose one of THEIR branches.
                if (code === 400) {
                    setSelectedWarehouse('');
                    setDeliveryModal({ orderId: id, status: newStatus, order });
                } else {
                    toast.error(msg);
                }
            } finally {
                setUpdatingRow(null);
            }
            return;
        }
        // Shipping out → dispatch modal: assign a specific rider OR offer to all riders.
        if (newStatus.toLowerCase() === 'shipped') {
            const hasRider = !!order?.delivery_person;
            setShipMode(hasRider ? 'specific' : 'all');
            setShipRiderId(hasRider ? String(order.delivery_person) : '');
            setShipFee(order?.delivery_fee && Number(order.delivery_fee) > 0 ? String(order.delivery_fee) : '');
            setShipModal({ orderId: id, order });
            return;
        }

        setUpdatingRow(id);
        try {
            await handleStatusUpdate(id, newStatus.toUpperCase());
        } finally {
            setUpdatingRow(null);
        }
    };

    // Confirm "Shipped": either assign to ONE rider, or offer to ALL riders (rider left
    // unassigned so it shows in every branch rider's feed to claim). The offered price
    // (delivery_fee) is saved either way so riders see what's on offer.
    const confirmShip = async () => {
        if (!shipModal) return;
        if (shipMode === 'specific' && !shipRiderId) { toast.error('Pick a rider, or switch to "Offer to all riders".'); return; }
        setShippingNow(true);
        setUpdatingRow(shipModal.orderId);
        try {
            // specific → assign that rider; all → clear rider (null) so it broadcasts.
            const riderId = shipMode === 'specific' ? shipRiderId : null;
            // System (salaried) riders carry no per-delivery charge.
            const isSystem = shipMode === 'specific' && !!riders.find((r: any) => String(r.id) === shipRiderId)?.is_system;
            await deliveryService.assignToOrder(shipModal.orderId, riderId, isSystem ? 0 : (shipFee || 0));
            await handleStatusUpdate(shipModal.orderId, 'SHIPPED');
            setShipModal(null);
            setShipRiderId('');
            setShipFee('');
        } catch {
            toast.error('Failed to ship order');
        } finally {
            setShippingNow(false);
            setUpdatingRow(null);
        }
    };

    const loadOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await salesService.getAdminOrders({ no_pagination: 'true' });
            setOrders(data || []);
        } catch (err) { if (!silent) toast.error("Failed to load orders"); } finally { if (!silent) setLoading(false); }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const data = await salesService.updateOrderStatus(id, newStatus);

            if (newStatus === 'CONFIRMED') {
                // Show a confirmation popup so the admin can review/edit the message
                // before sending it on WhatsApp.
                setWaModal({
                    number: data.whatsapp_number || data.phone_number || '',
                    message: data.whatsapp_message || '',
                    tracking: data.tracking_id || data.order_number || id,
                });
                toast.success('Order accepted!', { icon: '✅' });
            } else {
                toast.success(`Status updated to ${newStatus}`);
            }

            loadOrders();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const confirmDelivery = async () => {
        if (!deliveryModal || !selectedWarehouse) return;

        setIsSubmittingDelivery(true);
        setUpdatingRow(deliveryModal.orderId);
        try {
            await orderService.update(deliveryModal.orderId, {
                status: 'DELIVERED',
                warehouse_id: selectedWarehouse
            });
            toast.success('Order delivered & stock deducted');
            setDeliveryModal(null);
            setSelectedWarehouse('');
            loadOrders();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Delivery update failed';
            toast.error(msg);
        } finally {
            setIsSubmittingDelivery(false);
            setUpdatingRow(null);
        }
    };

    const sendWhatsApp = () => {
        if (!waModal) return;
        let cleanNumber = (waModal.number || '').replace(/\D/g, '');
        if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
            cleanNumber = '92' + cleanNumber.slice(1);
        } else if (cleanNumber.length === 10) {
            cleanNumber = '92' + cleanNumber;
        }
        const encodedMsg = encodeURIComponent(waModal.message || '');
        // Open in a NAMED window/tab ("whatsapp_session"). The browser reuses the same
        // tab on every send, so the chat opens inside the already-open WhatsApp Web tab
        // (or focuses it) instead of spawning a fresh tab each time.
        const url = `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodedMsg}`;
        const win = window.open(url, 'whatsapp_session');
        win?.focus();
        setWaModal(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await orderService.delete(deleteTarget.id?.toString());
            toast.success(`Order #${deleteTarget.tracking_id || deleteTarget.id} deleted`);
            setDeleteTarget(null);
            loadOrders();
        } catch {
            toast.error('Failed to delete order');
        } finally {
            setIsDeleting(false);
        }
    };

    const getWarehouseStockInfo = () => {
        if (!deliveryModal?.order || !selectedWarehouse) return [];
        const items = deliveryModal.order.items || [];
        return items.map((item: any) => {
            const stock = allStocks.find(s =>
                (s.product_name || '').toLowerCase().trim() === (item.product_name || '').toLowerCase().trim() &&
                s.warehouse?.toString() === selectedWarehouse.toString() &&
                (s.weight || '') === (item.weight || '') &&
                (s.size || '') === (item.size || '')
            );
            return {
                ...item,
                available: stock?.total_quantity || 0,
                insufficient: (stock?.total_quantity || 0) < item.quantity
            };
        });
    };

    const warehouseStockInfo = getWarehouseStockInfo();
    const hasEnoughStock = warehouseStockInfo.every((i: { insufficient: boolean }) => !i.insufficient);

    // The delivery picker only appears for the super admin (who chooses any
    // branch) or as a fallback when a multi-branch admin's branch couldn't be
    // auto-resolved — in which case limit the options to THEIR own branches.
    const deliveryWarehouseOptions = isSuperAdmin ? warehouses : myWarehouses;

    const filtered = (orders || []).filter(o => {
        const st = (o.status || '').toUpperCase();
        // 'ACTIVE' = the fulfilment pipeline (everything except finished orders).
        // Selecting DELIVERED / CANCELLED makes completed orders reachable here too.
        if (statusFilter === 'ACTIVE') return st !== 'DELIVERED' && st !== 'CANCELLED';
        if (statusFilter === 'ALL') return true;
        return st === statusFilter;
    });

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [statusFilter]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (loading && orders.length === 0) return <PageLoader />;

    return (
        <div className="pb-20">
            <div className="max-w-[1440px] mx-auto px-0 sm:px-6 pt-1 sm:pt-5">
                <PageHeader
                    title="Recent Orders"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Recent Orders' }]}
                    actions={
                        <Button variant="outline" onClick={() => loadOrders()} disabled={loading} className="w-full sm:w-auto">
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Pipeline
                        </Button>
                    }
                />

                {/* ── ACTIVE ORDERS HUB (DASHBOARD COMPONENT AT THE TOP) ── */}
                <Card className="overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Recent Orders</h2>
                            {activeOrders.filter(o => o.status === 'PENDING').length > 0 && (
                                <Badge tone="amber" className="animate-pulse">
                                    {activeOrders.filter(o => o.status === 'PENDING').length} Pending Acceptance
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="h-9 px-3 text-[12px] font-semibold bg-white border border-slate-200 rounded-lg outline-none focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/10 cursor-pointer"
                            >
                                <option value="ACTIVE">Active pipeline</option>
                                <option value="ALL">All orders</option>
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <span className="text-[12px] text-slate-500 font-semibold whitespace-nowrap">
                                {filtered.length} order{filtered.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>



                    {/* Active Orders List - Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="bg-slate-50/60 border-b border-slate-100">
                                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-3 text-left">Order Detail</th>
                                    <th className="px-6 py-3 text-right">Price</th>
                                    <th className="px-6 py-3 text-left">Current Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedData.length > 0 ? (
                                    paginatedData.map((order: any) => (
                                        <tr key={order.id} className={`transition-colors duration-200 ${(order.status || '').toUpperCase() === 'CANCEL_REQUESTED' ? 'bg-rose-50/30 border-l-4 border-l-rose-400' : 'hover:bg-slate-50'}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <Link href={`/admin/sales/${order.id}/invoice`} className="text-[13px] font-bold text-[#0E8CA8] hover:text-[#0A6F85] transition-colors">
                                                        #{order.tracking_id || order.id}
                                                    </Link>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-medium">
                                                        <span className="text-slate-900 font-semibold">{order.customer_name || 'Walk-in'}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-[13px] font-bold text-slate-900 tabular-nums">{formatCurrency(order.total_amount)}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{order.payment_method || 'C.O.D'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusDropdown
                                                    order={order}
                                                    updating={updatingRow === order.id?.toString()}
                                                    onSelect={(s) => handleStatusUpdateWithLoading(order.id?.toString(), s)}
                                                />
                                                {order.rider_reported_delivered && (order.status || '').toUpperCase() !== 'DELIVERED' && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600" title="The rider reported this order delivered — confirm by setting status to Delivered.">
                                                        <CheckCircle size={11} /> Rider reported delivered
                                                    </div>
                                                )}
                                                {order.rider_reported_cancelled && !['CANCELLED', 'DELIVERED'].includes((order.status || '').toUpperCase()) && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600" title="The customer cancelled at the door (reported by the rider) — confirm by setting status to Cancelled.">
                                                        <XCircle size={11} /> Cancel by customer
                                                    </div>
                                                )}
                                                {order.customer_reported_delivered && (order.status || '').toUpperCase() !== 'DELIVERED' && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600" title="The customer confirmed they received this order — confirm by setting status to Delivered.">
                                                        <CheckCircle size={11} /> Delivered to customer
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {(order.status || '').toUpperCase() === 'PENDING' && (
                                                        <Button
                                                            size="sm"
                                                            disabled={updatingRow === order.id?.toString()}
                                                            onClick={() => handleStatusUpdateWithLoading(order.id?.toString(), 'CONFIRMED')}
                                                        >
                                                            <CheckCircle2 size={12} /> Accept
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                                                    >
                                                        <Eye size={12} /> View
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDeleteTarget(order)}
                                                        className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-[12px] text-slate-400 italic">
                                            No orders match this filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View Card List */}
                    <div className="block md:hidden divide-y divide-slate-100">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((order: any) => {
                                const status = (order.status || '').toUpperCase();
                                return (
                                    <div key={order.id} className="py-3 px-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <Link href={`/admin/sales/${order.id}/invoice`} className="text-[13px] font-bold text-[#0E8CA8] hover:text-[#0A6F85] transition-colors">
                                                    #{order.tracking_id || order.id}
                                                </Link>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    <Clock size={10} className="inline mr-1" /> {new Date(order.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[13px] font-bold text-slate-900 tabular-nums">{formatCurrency(order.total_amount)}</div>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{order.payment_method || 'C.O.D'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                status === 'CONFIRMED' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {status}
                                            </span>
                                            <div className="flex gap-1.5">
                                                {status === 'PENDING' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStatusUpdateWithLoading(order.id?.toString(), 'CONFIRMED')}
                                                    >
                                                        Accept
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => { setSelectedOrder(order); setIsViewModalOpen(true); }}
                                                >
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-[12px] text-slate-400 italic">No orders match this filter.</div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
                            <span className="text-slate-500">
                                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Prev
                                </button>
                                <span className="text-slate-500 font-semibold">Page {currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </Card>

            </div>


            {/* Order Details Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={`Order Analysis: #${selectedOrder?.tracking_id || ''}`}
            >
                {selectedOrder && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                        {/* Status Header */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-[11px] font-bold uppercase text-slate-500">Order Placed: {formatDate(selectedOrder.created_at)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_OPTIONS.find(s => s.value === selectedOrder.status)?.color || 'bg-slate-100 text-slate-600'}`}>
                                {selectedOrder.status}
                            </span>
                        </div>

                        {/* Customer Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
                                    <User size={12} /> Customer Intel
                                </h4>
                                <div className="space-y-1">
                                    <p className="text-[13px] font-bold text-slate-900">{selectedOrder.customer_name}</p>
                                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5"><Phone size={10} /> {selectedOrder.phone_number}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
                                    <MapPin size={12} /> Logistics Point
                                </h4>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{selectedOrder.shipping_address}</p>
                            </div>
                        </div>

                        {/* Proof of delivery (rider photo + GPS location) */}
                        {selectedOrder.proof_image_url && (
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
                                    <MapPin size={12} /> Proof of Delivery
                                </h4>
                                <div className="flex items-start gap-3">
                                    <a href={selectedOrder.proof_image_url} target="_blank" rel="noreferrer">
                                        <img src={selectedOrder.proof_image_url} alt="Delivery proof" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                                    </a>
                                    <div className="text-[11px] text-slate-600 space-y-1">
                                        {selectedOrder.proof_at && <p>Captured: {formatDate(selectedOrder.proof_at)}</p>}
                                        {selectedOrder.proof_lat && selectedOrder.proof_lng ? (
                                            <a href={`https://maps.google.com/?q=${selectedOrder.proof_lat},${selectedOrder.proof_lng}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-semibold inline-flex items-center gap-1"><MapPin size={11} /> {selectedOrder.proof_lat}, {selectedOrder.proof_lng}</a>
                                        ) : <p className="text-slate-400">Location unavailable</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
                                <ShoppingCart size={12} /> SKU Breakdown
                            </h4>
                            <div className="border border-slate-200/70 rounded-xl overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/60 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                                            <th className="px-3 py-2">Item Detail</th>
                                            <th className="px-3 py-2 text-center w-16">Qty</th>
                                            <th className="px-3 py-2 text-right w-24">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[10px]">
                                        {selectedOrder.items?.map((item: any, i: number) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="px-3 py-2">
                                                    <p className="font-bold text-slate-900">{item.product_name}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold">SKU: {item.id || 'N/A'}</p>
                                                </td>
                                                <td className="px-3 py-2 text-center font-bold tabular-nums">{item.quantity}</td>
                                                <td className="px-3 py-2 text-right font-bold tabular-nums">{formatCurrency(item.price || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="space-y-2 pt-4 border-t border-dashed border-slate-200">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                                <span className="text-[11px] font-bold text-slate-900 tabular-nums">{formatCurrency(selectedOrder.total_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#0E8CA8]">
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Total Value</span>
                                <span className="text-[16px] font-bold tabular-nums">{formatCurrency(selectedOrder.total_amount)}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Link
                                href={`/admin/sales/${selectedOrder.id}/invoice`}
                                className="flex-1 h-10 bg-[#13B0D1] hover:bg-[#0E8CA8] text-white rounded-lg font-semibold text-[12px] flex items-center justify-center gap-2 uppercase tracking-wide shadow-sm shadow-[#13B0D1]/20 transition-all active:scale-[0.98] whitespace-nowrap"
                            >
                                <Printer size={14} /> Generate Invoice
                            </Link>
                            <Button variant="outline" className="flex-1" onClick={() => setIsViewModalOpen(false)}>
                                Close Dashboard
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Ship → choose rider (optional) */}
            {shipModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Dispatch Order</h3>
                                    <p className="text-[12px] text-slate-400 font-medium">
                                        Assign a rider or offer to all riders
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => { setShipModal(null); setShipRiderId(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <p className="text-[12.5px] text-slate-600">
                                Order <span className="font-bold text-slate-900">#{shipModal.order?.tracking_id || shipModal.order?.order_number}</span> will be marked <span className="font-bold text-sky-600">Shipped</span>.
                            </p>

                            {/* Auto-fetched pickup + delivery locations */}
                            {(() => { const p = pickupOf(shipModal.order); return (
                                <div className="grid grid-cols-1 gap-2.5">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                                            <MapPin size={12} /> Pickup
                                        </div>
                                        <p className="text-[12.5px] font-semibold text-slate-800">{p.name}</p>
                                        {p.loc && <p className="text-[11px] text-slate-500 leading-snug">{p.loc}</p>}
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1">
                                            <MapPin size={12} /> Delivery
                                        </div>
                                        <p className="text-[12.5px] font-semibold text-slate-800">{shipModal.order?.customer_name || 'Customer'}</p>
                                        <p className="text-[11px] text-slate-500 leading-snug">{shipModal.order?.shipping_address || '—'}</p>
                                    </div>
                                </div>
                            ); })()}

                            {/* Mode: specific rider vs offer to all */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Who delivers this?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setShipMode('specific')}
                                        className={`h-10 rounded-lg border text-[12px] font-bold transition-all ${shipMode === 'specific' ? 'border-[#13B0D1] bg-[#13B0D1]/10 text-[#0E8CA8] ring-1 ring-[#13B0D1]/25' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                        Specific rider
                                    </button>
                                    <button type="button" onClick={() => setShipMode('all')}
                                        className={`h-10 rounded-lg border text-[12px] font-bold transition-all ${shipMode === 'all' ? 'border-[#13B0D1] bg-[#13B0D1]/10 text-[#0E8CA8] ring-1 ring-[#13B0D1]/25' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                        All riders
                                    </button>
                                </div>
                            </div>

                            {shipMode === 'specific' ? (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Rider</label>
                                    <select value={shipRiderId} onChange={e => setShipRiderId(e.target.value)} className={inputCls}>
                                        <option value="">— Select a rider —</option>
                                        {[...riders].sort((a: any, b: any) => (b.is_system ? 1 : 0) - (a.is_system ? 1 : 0)).map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.is_system ? '★ ' : ''}{r.name}{r.is_system ? ' · system' : ''}{r.vehicle_type ? ` · ${r.vehicle_type}` : ''}{!r.is_active ? ' · inactive' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {riders.length === 0 && (
                                        <p className="text-[10.5px] text-slate-400 mt-1.5">
                                            No riders yet — create them in <Link href="/admin/delivery" className="text-[#0E8CA8] font-semibold hover:underline">Delivery Persons</Link>.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-500 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 leading-snug">
                                    This delivery will appear in <span className="font-semibold text-sky-700">every branch rider&apos;s feed</span> — the first one to accept it gets the job.
                                </p>
                            )}

                            {/* Price the admin offers — hidden for a System (salaried) rider */}
                            {!(shipMode === 'specific' && riders.find((r: any) => String(r.id) === shipRiderId)?.is_system) ? (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery price you offer (Rs)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rs</span>
                                        <input type="number" min="0" step="0.01" value={shipFee}
                                            onChange={e => setShipFee(e.target.value)}
                                            placeholder="0.00"
                                            className={inputCls + ' pl-9'} />
                                    </div>
                                    <p className="text-[10.5px] text-slate-400 mt-1.5">The payout offered to the rider for this delivery — shown to riders and counted toward their earnings.</p>
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-snug">
                                    System rider — no per-delivery charge (they&apos;re on salary).
                                </p>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => { setShipModal(null); setShipRiderId(''); }} disabled={shippingNow}
                                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                                Cancel
                            </button>
                            <button onClick={confirmShip} disabled={shippingNow}
                                className="h-10 px-5 rounded-lg bg-[#13B0D1] hover:bg-[#0E8CA8] text-white text-[13px] font-bold inline-flex items-center gap-2 disabled:opacity-50">
                                {shippingNow ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                                {shipMode === 'specific' ? 'Assign & Ship' : 'Offer & Ship'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deliveryModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#13B0D1]/10 text-[#0E8CA8] flex items-center justify-center">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Complete Delivery</h3>
                                    <p className="text-[12px] text-slate-400 font-medium">Select fulfillment warehouse</p>
                                </div>
                            </div>
                            <button onClick={() => setDeliveryModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-sky-50/60 border border-sky-100 p-4 rounded-xl flex gap-3">
                                <Info size={18} className="text-sky-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-sky-700 leading-relaxed font-semibold">
                                    Select fulfillment warehouse to proceed. Stock will be deducted immediately from the chosen location.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ordered Products</h4>
                                    {selectedWarehouse && (
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${hasEnoughStock ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                            {hasEnoughStock ? 'Stock Confirmed' : 'Insufficient Stock'}
                                        </span>
                                    )}
                                </div>
                                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-[12px] border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr className="text-[10px] font-bold text-slate-400 uppercase">
                                                <th className="px-3.5 py-2.5 text-left">Item Details</th>
                                                <th className="px-3.5 py-2.5 text-center">Qty</th>
                                                <th className="px-3.5 py-2.5 text-right">{selectedWarehouse ? 'Store' : 'Price'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(selectedWarehouse ? warehouseStockInfo : deliveryModal.order?.items || []).map((item: any, idx: number) => (
                                                <tr key={idx} className={item.insufficient ? 'bg-rose-50/20' : 'hover:bg-slate-50/50'}>
                                                    <td className="px-3.5 py-2.5">
                                                        <p className="font-semibold text-slate-800 leading-tight">{(item.product_name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}</p>
                                                        {(item.weight || item.size) && (
                                                            <p className="text-[9px] text-[#0E8CA8] font-bold uppercase tracking-wider mt-1">
                                                                {item.weight}{item.weight && item.size ? ' • ' : ''}{item.size}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-center font-bold text-slate-500">{item.quantity}</td>
                                                    <td className={`px-3.5 py-2.5 text-right font-bold ${selectedWarehouse ? (item.insufficient ? 'text-rose-600' : 'text-emerald-600') : 'text-slate-800'}`}>
                                                        {selectedWarehouse ? item.available : formatCurrency(item.price)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedWarehouse && !hasEnoughStock && (
                                    <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 flex items-center gap-2">
                                        <AlertTriangle size={14} className="shrink-0" /> Critical Error: Missing items in this warehouse.
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    Fulfillment Warehouse
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedWarehouse}
                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                        className="w-full h-11 px-4 border border-slate-200 rounded-lg text-[13.5px] font-semibold text-slate-800 outline-none focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/10 bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" className="text-slate-400">Choose a warehouse...</option>
                                        {deliveryWarehouseOptions.map((w: any) => (
                                            <option key={w.id} value={w.id} className="text-slate-800">{w.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setDeliveryModal(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={!selectedWarehouse || !hasEnoughStock || isSubmittingDelivery}
                                onClick={confirmDelivery}
                                className="flex-1"
                            >
                                {isSubmittingDelivery ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle size={16} /> Finish Delivery
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Confirmation Popup */}
            {waModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Send Confirmation</h3>
                                    <p className="text-[12px] text-slate-400 font-medium">Order #{waModal.tracking} accepted</p>
                                </div>
                            </div>
                            <button onClick={() => setWaModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl flex gap-3">
                                <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-emerald-700 leading-relaxed font-semibold">
                                    Review the message below, then send it to the customer on WhatsApp.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recipient Number</label>
                                <div className="flex items-center gap-2 h-10 px-3 border border-slate-200 rounded-lg focus-within:border-[#13B0D1] focus-within:ring-4 focus-within:ring-[#13B0D1]/10 transition-all">
                                    <Phone size={14} className="text-slate-400 shrink-0" />
                                    <input
                                        value={waModal.number}
                                        onChange={(e) => setWaModal(m => m ? { ...m, number: e.target.value } : m)}
                                        placeholder="03xx-xxxxxxx"
                                        className="w-full bg-transparent text-[13px] font-medium text-slate-800 outline-none border-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Message</label>
                                <textarea
                                    value={waModal.message}
                                    onChange={(e) => setWaModal(m => m ? { ...m, message: e.target.value } : m)}
                                    rows={5}
                                    className="w-full min-h-[120px] px-3.5 py-2.5 bg-white rounded-lg text-[13px] text-slate-800 outline-none border border-slate-200 focus:border-[#13B0D1] focus:ring-4 focus:ring-[#13B0D1]/10 transition-all resize-y leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setWaModal(null)}>
                                Skip
                            </Button>
                            <button
                                onClick={sendWhatsApp}
                                disabled={!waModal.number.trim() || !waModal.message.trim()}
                                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[12px] flex items-center justify-center gap-2 uppercase tracking-wide shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <Send size={14} /> Send on WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">Delete Order?</h3>
                            <p className="text-[13px] text-slate-500 font-medium mt-2 leading-relaxed">
                                You are about to permanently delete order <span className="font-bold text-slate-700">#{deleteTarget.tracking_id || deleteTarget.id}</span> for <span className="font-bold text-slate-700">{deleteTarget.customer_name || 'this customer'}</span>. This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                                Cancel
                            </Button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[12px] flex items-center justify-center gap-2 uppercase tracking-wide shadow-sm shadow-rose-600/20 transition-all active:scale-[0.98] disabled:opacity-60"
                            >
                                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={14} /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
