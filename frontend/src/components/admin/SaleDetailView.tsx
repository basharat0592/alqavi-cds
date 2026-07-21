"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { orderService } from '@/lib/api';
import { installmentService } from '@/services/payment.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
    Clock, Warehouse, Printer, Wallet, Package, Phone, MapPin, ArrowLeft, Trash2, User, FileText, Paperclip, ExternalLink
} from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import toast from 'react-hot-toast';
import { Card, Button, Badge, Modal } from '@/components/admin/ui';
import { PaymentModal } from '@/components/admin/PaymentPanel';

/**
 * Full sale-detail view. Rendered both by the Sales history route
 * (`/admin/sales/[id]`) and the Payments route (`/admin/payments/[id]`) so the
 * "View" experience is identical from either place — only the back link and the
 * post-delete redirect differ.
 */
export default function SaleDetailView({
    id,
    backHref = '/admin/sales',
    backLabel = 'Back to Sales',
    deleteRedirect = '/admin/sales',
}: {
    id: string;
    backHref?: string;
    backLabel?: string;
    deleteRedirect?: string;
}) {
    const router = useRouter();

    const [order, setOrder] = useState<any | null>(null);
    const [installments, setInstallments] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    // This customer's previous outstanding balance (other orders) + its due date.
    const [prevBalance, setPrevBalance] = useState(0);
    const [prevDueDate, setPrevDueDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<any | null>(null);

    const loadOrderData = useCallback(async () => {
        setLoading(true);
        try {
            const [orderData, paymentsData, whsData] = await Promise.all([
                orderService.getById(id),
                installmentService.list('order', id),
                inventoryService.getWarehouses().catch(() => [])
            ]);
            setOrder(orderData);
            setInstallments(paymentsData);
            setWarehouses(whsData);

            // Registered customer → fetch their previous outstanding balance (their
            // other unpaid orders, excluding this one) + earliest due date.
            const custId = (orderData as any)?.customer;
            if (custId) {
                try {
                    const bal = await orderService.getCustomerBalance(String(custId), String((orderData as any).id));
                    setPrevBalance(Number(bal?.previous_balance || 0));
                    setPrevDueDate(bal?.due_date || null);
                } catch { /* non-blocking */ }
            } else {
                setPrevBalance(0);
                setPrevDueDate(null);
            }

            // Keep selected installment reference up-to-date if modal is open
            if (selectedInstallment) {
                const updatedItem = paymentsData.find((p: any) => p.id === selectedInstallment.id);
                if (updatedItem) {
                    setSelectedInstallment(updatedItem);
                }
            }
        } catch (error) {
            toast.error("Failed to load sale details");
            router.push(deleteRedirect);
        } finally {
            setLoading(false);
        }
    }, [id, router, selectedInstallment, deleteRedirect]);

    useEffect(() => {
        loadOrderData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await orderService.delete(id);
            toast.success("Sale record deleted successfully");
            router.push(deleteRedirect);
        } catch (error) {
            toast.error("Failed to delete sale record");
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleConfirmPayment = async (payId: string | number) => {
        try {
            await installmentService.update(payId, { status: 'confirmed' });
            toast.success("Payment verified and confirmed successfully");
            setSelectedInstallment(null);
            loadOrderData();
        } catch (error) {
            toast.error("Failed to confirm payment");
        }
    };

    const handleRejectPayment = async (payId: string | number) => {
        try {
            await installmentService.update(payId, { status: 'rejected' });
            toast.success("Payment rejected successfully");
            setSelectedInstallment(null);
            loadOrderData();
        } catch (error) {
            toast.error("Failed to reject payment");
        }
    };

    const handleDeletePayment = async (payId: string | number) => {
        if (!confirm("Are you sure you want to delete this payment record?")) return;
        try {
            await installmentService.delete(payId);
            toast.success("Payment record deleted successfully");
            setSelectedInstallment(null);
            loadOrderData();
        } catch (error) {
            toast.error("Failed to delete payment record");
        }
    };

    // Go back without pushing a duplicate list entry onto the history stack
    // (a plain <Link> push would create list → detail → list and trap Back).
    const goBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push(backHref);
    };

    if (loading) return <PageLoader />;
    if (!order) return null;

    // Financial Computations
    const channel = order.payment_method === 'SHOP' ? 'POS' : 'Online';
    const total = Number(order.total_amount || 0);
    const paid = Number(order.amount_paid || 0);
    const remaining = Math.max(0, Number(order.remaining_amount ?? (total - paid)));
    const isOverdue = order.is_overdue;

    const getStatusTone = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'delivered') return 'green';
        if (s === 'cancelled') return 'red';
        if (s === 'pending') return 'amber';
        return 'indigo';
    };

    const getPaymentStatusBadge = () => {
        if (remaining <= 0) return <Badge tone="green">Paid</Badge>;
        if (paid > 0) return <Badge tone="amber">Partially Paid</Badge>;
        return <Badge tone="red">Unpaid</Badge>;
    };

    return (
        <div className="pb-24 text-left font-sans text-slate-800 bg-[#f8fafc] min-h-screen">
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-6">

                {/* Back — steps back in history instead of pushing a duplicate entry */}
                <button onClick={goBack} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-[13px] font-semibold mb-4 transition-colors">
                    <ArrowLeft size={15} /> {backLabel}
                </button>

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">
                            Sale #{order.order_number || order.tracking_id}
                        </h1>
                        <Badge tone={getStatusTone(order.status)}>{order.status}</Badge>
                        {getPaymentStatusBadge()}
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <Button variant="outline" className="h-9 text-[12.5px] font-bold" onClick={() => router.push(`/admin/sales/${order.id}/invoice`)}>
                            <Printer size={14} /> Print Invoice
                        </Button>
                        {remaining > 0 && (
                            <Button variant="primary" className="h-9 text-[12.5px] font-bold" onClick={() => setShowPayModal(true)}>
                                <Wallet size={14} /> Collect Payment
                            </Button>
                        )}
                        <Button variant="outline" className="h-9 text-[12.5px] font-bold text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 size={14} /> Delete
                        </Button>
                    </div>
                </div>

                {/* ── TWO-COLUMN DETAIL LAYOUT ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Products List Table Card */}
                        <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Package size={15} /> Items Summary
                                </h3>
                            </div>
                            <table className="w-full text-left text-[13px]">
                                <thead className="bg-slate-50/20 border-b border-slate-100 text-[10.5px] font-bold uppercase text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Product</th>
                                        <th className="px-3 py-3 text-center">Qty</th>
                                        <th className="px-3 py-3 text-center">Bonus</th>
                                        <th className="px-3 py-3 text-right">Unit Price</th>
                                        <th className="px-3 py-3 text-right">Disc</th>
                                        <th className="px-6 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(order.items || []).map((it: any, index: number) => {
                                        const disc = Number(it.discount || 0);
                                        const bonus = Number(it.bonus_quantity || 0);
                                        const net = it.line_net != null ? Number(it.line_net) : (Number(it.price) * Number(it.quantity) - disc);
                                        return (
                                        <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-900">{it.product_name || 'Unnamed Product'}</p>
                                                {(it.weight || it.size) && (
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase mt-0.5 tracking-wide">
                                                        {it.weight}{it.weight && it.size ? ' • ' : ''}{it.size}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-center text-slate-600 font-medium">{it.quantity}</td>
                                            <td className="px-3 py-4 text-center font-bold tabular-nums text-emerald-700">{bonus > 0 ? `+${bonus}` : '—'}</td>
                                            <td className="px-3 py-4 text-right text-slate-500 tabular-nums">{formatCurrency(it.price)}</td>
                                            <td className="px-3 py-4 text-right tabular-nums text-rose-600">{disc > 0 ? `-${formatCurrency(disc)}` : '—'}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(net)}</td>
                                        </tr>
                                    );})}
                                </tbody>
                            </table>

                            {/* Totals Summary */}
                            <div className="bg-slate-50/30 p-5 border-t border-slate-100 flex justify-end">
                                <div className="w-full sm:w-[280px] space-y-2 text-[12.5px]">
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span>Subtotal</span>
                                        <span className="font-semibold tabular-nums">
                                            {formatCurrency((order.items || []).reduce((s: number, it: any) => s + (it.line_net != null ? Number(it.line_net) : (Number(it.price) * Number(it.quantity) - Number(it.discount || 0))), 0))}
                                        </span>
                                    </div>
                                    {(order.items || []).reduce((s: number, it: any) => s + Number(it.bonus_quantity || 0), 0) > 0 && (
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Bonus Units</span>
                                            <span className="font-semibold text-emerald-700 tabular-nums">+{(order.items || []).reduce((s: number, it: any) => s + Number(it.bonus_quantity || 0), 0)} free</span>
                                        </div>
                                    )}
                                    {(order.items || []).reduce((s: number, it: any) => s + Number(it.discount || 0), 0) > 0 && (
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Line Discounts</span>
                                            <span className="font-semibold text-rose-600 tabular-nums">-{formatCurrency((order.items || []).reduce((s: number, it: any) => s + Number(it.discount || 0), 0))}</span>
                                        </div>
                                    )}
                                    {Number(order.shipping_cost || 0) > 0 && (
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Delivery Charges</span>
                                            <span className="font-semibold tabular-nums">+{formatCurrency(Number(order.shipping_cost))}</span>
                                        </div>
                                    )}
                                    {Number(order.discount || 0) > 0 && (
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Discount</span>
                                            <span className="font-semibold text-rose-600 tabular-nums">-{formatCurrency(Number(order.discount))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-[14.5px] pt-2 border-t border-slate-200/60 font-black text-slate-900">
                                        <span>Grand Total</span>
                                        <span className="text-indigo-600 tabular-nums">{formatCurrency(total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-600 font-semibold pt-1">
                                        <span>Amount Paid</span>
                                        <span className="tabular-nums">{formatCurrency(paid)}</span>
                                    </div>
                                    {remaining > 0 && (
                                        <div className="flex justify-between items-center text-rose-600 font-semibold">
                                            <span>Remaining Balance</span>
                                            <span className="tabular-nums">{formatCurrency(remaining)}</span>
                                        </div>
                                    )}
                                    {prevBalance > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-amber-600 font-semibold pt-2 border-t border-slate-200/60">
                                                <span>Previous Balance</span>
                                                <span className="tabular-nums">{formatCurrency(prevBalance)}</span>
                                            </div>
                                            {prevDueDate && (
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>Prev. Due Date</span>
                                                    <span className="tabular-nums">{formatDate(prevDueDate)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-[13.5px] font-black text-rose-700 pt-1 border-t border-slate-200/60">
                                                <span>Net Balance</span>
                                                <span className="tabular-nums">{formatCurrency(prevBalance + remaining)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Payment History Card */}
                        <Card className="p-0 overflow-hidden border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Clock size={15} /> Payment History
                                </h3>
                            </div>
                            {installments.length === 0 ? (
                                <div className="py-12 text-center text-[12.5px] text-slate-400 font-medium">
                                    No partial payments recorded. Total was settled at checkout.
                                </div>
                            ) : (
                                <table className="w-full text-left text-[12.5px]">
                                    <thead className="bg-slate-50/10 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                                        <tr>
                                            <th className="px-6 py-2.5">Date & Time</th>
                                            <th className="px-4 py-2.5">Reference</th>
                                            <th className="px-4 py-2.5">Method</th>
                                            <th className="px-4 py-2.5">Recorded By</th>
                                            <th className="px-4 py-2.5 text-center">Status</th>
                                            <th className="px-6 py-2.5 text-right">Amount</th>
                                            <th className="px-6 py-2.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {installments.map((pm: any) => (
                                            <tr
                                                key={pm.id}
                                                className="hover:bg-slate-50/30 transition-colors cursor-pointer"
                                                onClick={() => setSelectedInstallment(pm)}
                                            >
                                                <td className="px-6 py-3.5 text-slate-500 tabular-nums">
                                                    {formatDateTime(pm.paid_at || pm.created_at)}
                                                </td>
                                                <td className="px-4 py-3.5 font-medium text-slate-700">
                                                    {pm.reference || '—'}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200/50 text-[10px] font-bold uppercase text-slate-600 rounded">
                                                        {pm.method || 'cash'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-500">
                                                    {pm.created_by_name || 'System'}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                                                        pm.status === 'confirmed'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : pm.status === 'rejected'
                                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {pm.status === 'confirmed' ? 'Confirmed' : pm.status === 'rejected' ? 'Rejected' : 'Pending Verification'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(pm.amount)}
                                                </td>
                                                <td className="px-6 py-3.5 text-right space-x-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    {pm.slip_url && (
                                                        <a href={pm.slip_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600 inline-block align-middle" title="View Slip">
                                                            <Paperclip size={14} />
                                                        </a>
                                                    )}
                                                    {pm.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleConfirmPayment(pm.id)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-block align-middle animate-pulse" title="Verify & Confirm">
                                                                Verify
                                                            </button>
                                                            <button onClick={() => handleRejectPayment(pm.id)} className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline inline-block align-middle" title="Reject Payment">
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => handleDeletePayment(pm.id)} className="text-slate-300 hover:text-rose-600 inline-block align-middle" title="Delete Record">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">

                        {/* Customer Profile Card */}
                        <Card className="p-5 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
                                <User size={14} /> Customer Profile
                            </h3>
                            <div className="space-y-3.5 text-[13px]">
                                <div>
                                    <p className="font-bold text-slate-800">{order.customer_display_name || order.customer_name || 'Walk-in Customer'}</p>
                                    {order.customer_type === 'walkin' ? (
                                        <p className="text-[10px] text-slate-400 italic mt-0.5">Walk-in Account</p>
                                    ) : (
                                        <p className="text-[10.5px] text-emerald-600 font-semibold mt-0.5">Registered customer account</p>
                                    )}
                                </div>
                                {order.customer_phone || (order.phone_number && order.phone_number !== 'N/A') ? (
                                    <div className="flex items-center gap-2 text-slate-600 pt-2 border-t border-slate-100/60">
                                        <Phone size={13} className="text-slate-400 shrink-0" />
                                        <span>{order.customer_phone || order.phone_number}</span>
                                    </div>
                                ) : null}
                                {order.shipping_address && order.shipping_address !== 'Walk-in Store Selection' && (
                                    <div className="flex items-start gap-2 text-slate-600 pt-2 border-t border-slate-100/60">
                                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">{order.shipping_address}</span>
                                    </div>
                                )}
                                {order.proof_image_url && (
                                    <div className="pt-3 mt-1 border-t border-slate-100/60">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><MapPin size={12} /> Proof of Delivery</p>
                                        <div className="flex items-start gap-3">
                                            <a href={order.proof_image_url} target="_blank" rel="noreferrer">
                                                <img src={order.proof_image_url} alt="Delivery proof" className="w-24 h-24 rounded-lg object-cover border border-slate-200" />
                                            </a>
                                            <div className="text-[12px] text-slate-600 space-y-1">
                                                {order.proof_at && <p>Captured: {formatDate(order.proof_at)}</p>}
                                                {order.proof_lat && order.proof_lng ? (
                                                    <a href={`https://maps.google.com/?q=${order.proof_lat},${order.proof_lng}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-semibold inline-flex items-center gap-1"><MapPin size={12} /> {order.proof_lat}, {order.proof_lng}</a>
                                                ) : <p className="text-slate-400">Location unavailable</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Order Metadata Card */}
                        <Card className="p-5 border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-3.5 flex items-center gap-1.5">
                                <FileText size={14} /> Order Metadata
                            </h3>
                            <div className="space-y-3 text-[12.5px]">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Date & Time</span>
                                    <span className="font-semibold text-slate-700">{formatDateTime(order.created_at)}</span>
                                </div>
                                {order.sale_date && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-medium">Sale Date</span>
                                        <span className="font-semibold text-slate-700">{formatDate(order.sale_date)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Branch</span>
                                    <span className="font-semibold text-slate-700">{order.warehouse_name || 'Main Branch'}</span>
                                </div>
                                {order.salesperson_name && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-medium">Salesman</span>
                                        <span className="font-semibold text-slate-700">{order.salesperson_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Sales Channel</span>
                                    <span className="font-semibold text-slate-700">{channel} Counter</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-medium">Payment Method</span>
                                    <span className="font-semibold text-slate-700">{order.payment_method || 'Cash'}</span>
                                </div>
                                {order.due_date && (
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100/60">
                                        <span className="text-slate-400 font-medium">Due Date</span>
                                        <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                            {formatDate(order.due_date)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Delete Sale Record"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Yes, Delete'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 text-left">
                    <div className="flex justify-center mb-2">
                        <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center">
                            <Trash2 size={24} className="text-rose-600" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-[15px] font-bold text-slate-900 leading-snug">Permanently delete this order?</h3>
                        <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
                            You are about to delete Sale <strong>#{order.order_number || order.tracking_id}</strong>. This action is irreversible and will remove the record entirely.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Collect Payment Modal */}
            {showPayModal && (
                <PaymentModal
                    open={showPayModal}
                    onClose={() => setShowPayModal(false)}
                    title={`Collect Payment · Sale #${order.order_number || order.tracking_id}`}
                    sourceType="order"
                    sourceId={order.id}
                    total={total}
                    direction="inbound"
                    dueDate={order.due_date || ''}
                    onDueDateChange={async (d) => { try { await orderService.setDueDate(String(order.id), d); } catch { } }}
                    onChanged={() => {
                        setShowPayModal(false);
                        loadOrderData();
                    }}
                />
            )}

            {/* View Payment Details Modal */}
            {selectedInstallment && (
                <Modal
                    open={!!selectedInstallment}
                    onClose={() => setSelectedInstallment(null)}
                    title="Payment Record Details"
                    size="md"
                >
                    <div className="space-y-5 text-left text-sm font-sans text-slate-800">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payer Account</span>
                                <p className="font-bold text-slate-900 mt-0.5">{order.customer_name || 'Walk-in Customer'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sale Invoice</span>
                                <p className="font-bold text-slate-900 mt-0.5">Order #{order.tracking_id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Branch (Selected)</label>
                                <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                                    <Warehouse size={14} className="text-slate-400" />
                                    {warehouses.find(w => w.id === selectedInstallment.warehouse)?.name || 'Default Branch'}
                                </p>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                                <p className="font-semibold text-slate-800 mt-1 capitalize">{selectedInstallment.method || 'Cash'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Txn Reference / ID</label>
                                <p className="font-bold text-slate-900 mt-1">{selectedInstallment.reference || '—'}</p>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</label>
                                <p className="font-semibold text-slate-700 mt-1">{formatDateTime(selectedInstallment.paid_at || selectedInstallment.created_at)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid</label>
                                <p className="text-[15px] font-black text-emerald-600 mt-1">{formatCurrency(selectedInstallment.amount)}</p>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verification Status</label>
                                <div className="mt-1">
                                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded ${
                                        selectedInstallment.status === 'confirmed'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : selectedInstallment.status === 'rejected'
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        {selectedInstallment.status === 'confirmed' ? 'Confirmed' : selectedInstallment.status === 'rejected' ? 'Rejected' : 'Pending Verification'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {selectedInstallment.note && (
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Note</label>
                                <p className="text-slate-600 mt-1 italic">"{selectedInstallment.note}"</p>
                            </div>
                        )}

                        {selectedInstallment.slip_url && (
                            <div className="border-t border-slate-100 pt-4">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Receipt Proof Slip</label>
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col items-center">
                                    {selectedInstallment.slip_url.match(/\.(pdf)$/i) ? (
                                        <div className="py-6 flex flex-col items-center gap-2">
                                            <FileText size={40} className="text-slate-400" />
                                            <span className="text-xs text-slate-500 font-semibold">PDF Receipt Document</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={selectedInstallment.slip_url}
                                            alt="Receipt Proof"
                                            className="max-h-[220px] w-auto object-contain rounded shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
                                            onClick={() => window.open(selectedInstallment.slip_url, '_blank')}
                                        />
                                    )}
                                    <a href={selectedInstallment.slip_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                                        <ExternalLink size={13} /> View full receipt document
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center gap-3 border-t border-slate-100 pt-4">
                            <button onClick={() => handleDeletePayment(selectedInstallment.id)} className="h-10 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold border border-rose-200 rounded-lg text-xs sm:text-[13px] flex items-center gap-1.5 transition-colors">
                                <Trash2 size={14} /> Delete
                            </button>

                            <div className="flex gap-2">
                                <Button variant="secondary" className="h-10 text-[13px] font-bold" onClick={() => setSelectedInstallment(null)}>
                                    Close
                                </Button>
                                {selectedInstallment.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleRejectPayment(selectedInstallment.id)} className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs sm:text-[13px] transition-colors">
                                            Reject
                                        </button>
                                        <button onClick={() => handleConfirmPayment(selectedInstallment.id)} className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs sm:text-[13px] transition-colors">
                                            Confirm & Verify
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
