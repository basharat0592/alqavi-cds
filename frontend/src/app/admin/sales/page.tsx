'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { orderService, productService, userService, Order } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ShoppingBag, Search, X, RefreshCw, Eye,
    CheckCircle, Clock, DollarSign, Printer, Plus, Trash2, Edit,
    AlertTriangle, Loader2, Package, Save, XCircle
} from 'lucide-react';
import {
    PageWrapper, SectionCard, PageHeader, Toast, DeleteConfirmModal,
    AMZ_INPUT, ActionButton, SecondaryButton, PrimaryButton,
    FilterHub, AdminTable
} from '@/components/ui/AmazonStyles';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS = ['All', 'Ordered', 'Confirmed', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Rejected'];

// ── Modals ───────────────────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
    const items = order.items || [];
    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name
        ? `${c.first_name} ${c.last_name || ''}`.trim()
        : c?.username || c?.email || (typeof order.customer === 'string' ? order.customer : 'Guest'));

    const currency = order.currency || 'PKR';
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(String(item.price)) * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-[#f6f6f6] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-[#FF9900]" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                            Sale Order #{order.order_number || order.id}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Customer Identity</p>
                            {order.customer ? (
                                <Link
                                    href={`/admin/customers/edit/${typeof order.customer === 'object' ? order.customer.id : order.customer}`}
                                    className="text-sm font-bold text-[#007185] hover:text-[#C45500] hover:underline"
                                >
                                    {customerName}
                                </Link>
                            ) : (
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{customerName}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{c?.email || 'Guest Client'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Record Date</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(order.created_at, { dateStyle: 'long' })}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at, { timeStyle: 'short' })}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Fulfillment</p>
                            <StatusBadge status={order.status} />
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Paid: {order.payment_status || 'Pending'}</p>
                        </div>
                    </div>

                    <div className="border border-[#ddd] dark:border-slate-800 rounded overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#f6f6f6] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-800">
                                <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-2">Item Manifest</th>
                                    <th className="px-4 py-2 text-center">Qty</th>
                                    <th className="px-4 py-2 text-right">Price</th>
                                    <th className="px-4 py-2 text-right">Ext. Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {items.map((item: any, i: number) => (
                                    <tr key={i} className="text-xs text-gray-700 dark:text-gray-300">
                                        <td className="px-4 py-3 font-bold">
                                            {item.product?.id ? (
                                                <Link
                                                    href={`/admin/products/edit/${item.product.id}`}
                                                    className="text-[#007185] hover:text-[#C45500] hover:underline"
                                                >
                                                    {item.product_name || item.name || `Registry Item ${i + 1}`}
                                                </Link>
                                            ) : (
                                                item.product_name || item.name || `Registry Item ${i + 1}`
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(parseFloat(item.price || 0), currency)}</td>
                                        <td className="px-4 py-3 text-right font-bold">{formatCurrency((parseFloat(item.price || 0) * item.quantity), currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Logistic Cost:</span>
                                <span>{formatCurrency(parseFloat(String(order.shipping_cost || 0)), currency)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-[#FF9900] border-t border-[#ddd] pt-2">
                                <span>Total:</span>
                                <span>{formatCurrency(order.total_amount || 0, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#f6f6f6] dark:bg-slate-800/50 border-t border-[#ddd] dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-[#adb1b8] dark:border-slate-600 rounded text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-sm transition-colors">
                        Close
                    </button>
                    <Link
                        href={`/admin/sales/${order.id}/invoice`}
                        className="px-4 py-1.5 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded text-xs font-bold text-[#111] shadow-sm flex items-center gap-2"
                    >
                        <Printer className="h-3 w-3" /> View/Print Invoice
                    </Link>
                </div>
            </div>
        </div>
    );
}

function UpdateStatusModal({ order, onClose, onSuccess }: { order: Order, onClose: () => void, onSuccess: () => void }) {
    const [status, setStatus] = useState(order.status || 'pending');
    const [paymentStatus, setPaymentStatus] = useState(order.payment_status || 'pending');
    const [paymentMethod, setPaymentMethod] = useState(order.payment_method || 'Cash on Delivery');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await orderService.update(order.id as string, {
                status,
                payment_status: paymentStatus,
                payment_method: paymentMethod
            });
            onSuccess();
        } catch (error) {
            console.error("Update error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f6f6f6] dark:bg-slate-800/50 border-b border-[#ddd] dark:border-slate-700">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Record Update</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status Classification</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={AMZ_INPUT}>
                            <option value="ordered">Ordered</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className={AMZ_INPUT}>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div className="pt-2">
                        <ActionButton type="submit" disabled={loading} className="w-full justify-center">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Changes
                        </ActionButton>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToUpdate, setOrderToUpdate] = useState<Order | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(10);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stats, setStats] = useState<any>(null);

    const load = async (page = currentPage) => {
        setLoading(true);
        try {
            const params: any = {
                page,
                ordering: '-created_at',
                search: search || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined
            };
            if (statusFilter !== 'All') {
                params.status = statusFilter.toLowerCase();
            } else {
                params.exclude_status = 'ordered';
            }

            const [ordersData, statsData] = await Promise.all([
                orderService.getPaginated(params),
                orderService.getStats()
            ]);

            setOrders(ordersData.results);
            setTotalCount(ordersData.count);
            setStats(statsData);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setCurrentPage(1);
            load(1);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search, statusFilter, startDate, endDate]);

    useEffect(() => {
        load(currentPage);
    }, [currentPage]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleStatusMove = async (orderId: string, newStatus: string) => {
        setLoading(true);
        try {
            await orderService.update(orderId, { status: newStatus });
            showToast(`Order status set to ${newStatus}.`);
            load(currentPage);
        } catch {
            showToast("Update failed.");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        setDeleting(true);
        try {
            await orderService.delete(orderToDelete.id as string);
            showToast('Order record removed.');
            load(currentPage);
        } catch { }
        finally {
            setDeleting(false);
            setOrderToDelete(null);
        }
    };

    const handleViewOrder = async (order: Order) => {
        setLoading(true);
        try {
            const fullOrder = await orderService.getById(order.id as string);
            setSelectedOrder(fullOrder);
        } catch (error) {
            console.error("Error fetching order details", error);
            showToast("Failed to load order details.");
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <PageWrapper>

            {/* Amazon Style Toast */}
            <Toast message={toast} />

            {/* Simple Amazon Header */}
            <PageHeader
                title="Sale Order List"
                subtitle="Global sales record and order fulfillment tracking"
                icon={ShoppingBag}
                action={
                    <PrimaryButton href="/admin/sales/create">
                        <Plus className="h-4 w-4" /> Add Sale Order
                    </PrimaryButton>
                }
            />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Sale Orders', val: loading ? '...' : (stats?.total_orders || totalCount), icon: Package, color: 'text-blue-600' },
                    { label: 'Completed Sales', val: stats?.delivered_orders || 0, icon: CheckCircle, color: 'text-green-600' },
                    { label: 'Total Revenue', val: loading ? '...' : formatCurrency(stats?.total_revenue || 0), icon: DollarSign, color: 'text-[#FF9900]' },
                    { label: 'Pending Queue', val: stats?.pending_orders || 0, icon: Clock, color: 'text-yellow-600' }
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 p-4 rounded shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                            <p className={`text-xl font-bold tracking-tight ${s.color}`}>{s.val}</p>
                        </div>
                        <s.icon className={`h-6 w-6 ${s.color} opacity-20`} />
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <FilterHub
                onSearch={setSearch}
                searchValue={search}
                searchPlaceholder="Find by order # or customer..."
                loading={loading}
                onRefresh={() => load()}
                extraFilters={
                    <div className="flex flex-col md:flex-row gap-2 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className={AMZ_INPUT + " !py-1 !px-2 !w-32 text-xs"}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">To</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className={AMZ_INPUT + " !py-1 !px-2 !w-32 text-xs"}
                            />
                        </div>
                    </div>
                }
            >
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded border border-gray-200 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full">
                    {STATUS_FILTERS.map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors whitespace-nowrap ${statusFilter === f
                                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </FilterHub>

            {/* Order Table */}
            <AdminTable
                headers={['Reference #', 'Customer Profile', 'Valuation', 'Status Axis', 'Actions']}
                data={orders}
                loading={loading}
                emptyMessage="No transactions recorded in this axis."
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={setCurrentPage}
                renderRow={(o) => {
                    const c = o.customer as any;
                    const cName = (o as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || c?.email || 'Guest');
                    return (
                        <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3 font-bold text-gray-900 dark:text-white text-sm">
                                    #{o.order_number || String(o.id).slice(-6).toUpperCase()}
                                </div>
                                <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{formatDate(o.created_at)}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-200">{cName}</div>
                                <div className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{c?.email || 'Individual Sale'}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-black text-[#FF9900]">{formatCurrency(o.total_amount || 0)}</div>
                                <div className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{o.payment_status || 'Unpaid'}</div>
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={o.status} />
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                    {o.status === 'ordered' && (
                                        <>
                                            <button onClick={() => handleStatusMove(o.id as string, 'confirmed')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded bg-white border border-emerald-100 shadow-sm transition-all" title="Confirm Order">
                                                <CheckCircle className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleStatusMove(o.id as string, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-50 rounded bg-white border border-red-100 shadow-sm transition-all" title="Reject Order">
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => handleViewOrder(o)} className="p-1.5 text-gray-400 hover:text-[#FF9900]" title="View Details">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setOrderToUpdate(o)} className="p-1.5 text-gray-400 hover:text-blue-500" title="Edit Status">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => setOrderToDelete(o)} className="p-1.5 text-gray-400 hover:text-red-600" title="Remove Record">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                }}
            />

            {/* Amazon Style Delete Confirmation */}
            <DeleteConfirmModal
                isOpen={!!orderToDelete}
                itemName={orderToDelete?.order_number || String(orderToDelete?.id)}
                onCancel={() => setOrderToDelete(null)}
                onConfirm={confirmDelete}
                deleting={deleting}
            />

            {/* Modals Integration */}
            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
            {orderToUpdate && <UpdateStatusModal order={orderToUpdate} onClose={() => setOrderToUpdate(null)} onSuccess={() => { setOrderToUpdate(null); load(currentPage); }} />}
        </PageWrapper>
    );
}
