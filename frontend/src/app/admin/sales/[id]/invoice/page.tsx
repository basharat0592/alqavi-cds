"use client";

import { useState, useEffect, use } from 'react';
import { orderService, Order } from '@/lib/api';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { Printer, Share2, Check } from 'lucide-react';
import PageLoader from '@/components/ui/PageLoader';
import { PageHeader, Button, useTableSelection, SelectAllTh, RowCheckboxTd, BulkBar } from '@/components/admin/ui';
import { InvoiceHeader, InvoiceFooter, invoiceStyles } from '@/components/admin/invoice/InvoiceParts';
import toast from 'react-hot-toast';

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [shared, setShared] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const data = await orderService.getById(id);
                setOrder(data);
            } catch (error) {
                console.error("Failed to load order", error);
            } finally {
                setLoading(false);
                // Auto-print if query param is present
                if (window.location.search.includes('print=true')) {
                    setTimeout(() => window.print(), 800);
                }
            }
        };
        fetchOrder();
    }, [id]);

    const handlePrint = () => { window.print(); };

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdatingStatus(true);
        try {
            await orderService.update(order!.id, { status: newStatus.toUpperCase() });
            setOrder({ ...order!, status: newStatus.toUpperCase() });
            toast.success('Status updated');
        } catch { toast.error('Update failed'); } finally { setUpdatingStatus(false); }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: `Invoice #${order?.order_number}`, url: url });
            } catch { }
        } else {
            navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    const items: any[] = order?.items || [];
    const sel = useTableSelection(items, (item) => String(items.indexOf(item)));

    if (loading) return <PageLoader />;
    if (!order) return <div className="p-20 text-center font-bold">Order not found.</div>;

    const c = order.customer as any;
    const customerName = (order as any).customer_name || (c?.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c?.username || 'Guest');
    const customerCell = c?.phone || c?.phone_number || '';
    const totalAmount = parseFloat(order.total_amount || '0');
    // Cancelled / rejected sales are void — no payment was collected (paid 0).
    const voided = ['CANCELLED', 'REJECTED'].includes(String((order as any).status || '').toUpperCase());
    // A PAID sale is settled in full — treat it as fully paid even on older rows
    // whose amount_paid field was never stamped. Otherwise read the real settlement
    // (`amount_paid`; fall back to legacy `paid_amount`) and server remaining.
    const isPaid = !voided && String((order as any).payment_status || 'PAID').toUpperCase() === 'PAID';
    const paidAmount = voided
        ? 0
        : (isPaid
            ? totalAmount
            : parseFloat((order as any).amount_paid ?? (order as any).paid_amount ?? '0'));
    const balance = (voided || isPaid)
        ? 0
        : ((order as any).remaining_amount != null
            ? Math.max(0, parseFloat((order as any).remaining_amount))
            : Math.max(0, totalAmount - paidAmount));

    return (
        <div className="pb-20 font-sans text-slate-900 text-left">

            {/* Integrated Action Bar */}
            <div className="max-w-[850px] mx-auto pt-2 px-4 print:hidden">
                <PageHeader
                    title="Sales Invoice"
                    breadcrumbs={[{ label: 'Console', href: '/admin/dashboard' }, { label: 'Sales', href: '/admin/sales' }, { label: 'Invoice' }]}
                    actions={
                        <>
                            <select
                                value={(order.status || '').toLowerCase()}
                                onChange={(e) => handleUpdateStatus(e.target.value)}
                                disabled={updatingStatus || (order.status || '').toUpperCase() === 'DELIVERED'}
                                className={`h-8 px-3 border border-slate-200 rounded-lg text-[12.5px] font-semibold outline-none cursor-pointer bg-white hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all disabled:opacity-60
                                    ${(order.status || '').toUpperCase() === 'DELIVERED' ? 'text-emerald-700' : 'text-slate-700'}`}
                            >
                                {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                            <Button variant="outline" size="sm" onClick={handleShare}>
                                {shared ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                                {shared ? 'Copied' : 'Share'}
                            </Button>
                            <Button variant="primary" size="sm" onClick={handlePrint}>
                                <Printer size={14} /> Print
                            </Button>
                        </>
                    }
                />
            </div>

            {/* Paper Container */}
            <div className="max-w-[850px] mx-auto bg-white p-6 flex flex-col min-h-screen print:min-h-0 print:border-none print:shadow-none print:p-0">

                <InvoiceHeader
                    docTitle="Sales Invoice"
                    metaLines={['Gilgit-Baltistan Distribution']}
                    refLabel="Invoice No"
                    refValue={order.order_number || String(order.id).split('-')[0]}
                    date={formatDate(order.created_at)}
                />

                {/* Customer & Metadata Grid — compact */}
                <div className="grid grid-cols-3 gap-6 mb-4 px-1 items-start">
                    <div className="col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bill To</p>
                        <p className="text-[15px] font-black text-slate-900 leading-tight">{customerName}</p>
                        {customerCell && <p className="text-[12px] font-medium text-slate-600 mt-0.5">{customerCell}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment</p>
                        <p className="text-[12px] font-black uppercase text-slate-900">{order.payment_method || 'Cash'}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                    <table className="w-full text-left border-collapse border border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_td]:border [&_td]:border-slate-200">
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                                <SelectAllTh sel={sel} className="print:hidden" />
                                <th className="py-1.5 px-2 w-12 text-center">#</th>
                                <th className="py-1.5 px-3">Item Description</th>
                                <th className="py-1.5 px-3 text-center w-28">Quantity</th>
                                <th className="py-1.5 px-3 text-right w-32">Unit Price</th>
                                <th className="py-1.5 px-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px]">
                            {items.map((item: any, i: number) => {
                                const price = parseFloat(item.price || item.unit_price || 0);
                                const qty = item.quantity || 1;
                                const amt = price * qty;
                                return (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <RowCheckboxTd sel={sel} id={String(i)} className="print:hidden" />
                                        <td className="py-1.5 px-1 text-center text-slate-400 tabular-nums">{i + 1}</td>
                                        <td className="py-1.5 px-3 font-bold text-slate-900 whitespace-nowrap">{item.product_name || item.name}</td>
                                        <td className="py-1.5 px-3 text-center tabular-nums">{qty}</td>
                                        <td className="py-1.5 px-3 text-right text-slate-600 tabular-nums">{formatCurrency(price)}</td>
                                        <td className="py-1.5 px-3 text-right font-black text-slate-900 tabular-nums">{formatCurrency(amt)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary: notes (left) + totals (right) */}
                <div className="flex justify-between items-start gap-6 mb-6">
                    <div className="flex-1 pt-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                        <p className="text-[11px] text-slate-500 italic max-w-xs leading-relaxed">{(order as any).notes || 'Thank you for your business.'}</p>
                    </div>
                    <div className="w-[280px] text-[12px] space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500 font-bold uppercase text-[11px]">Subtotal</span>
                            <span className="font-bold text-slate-700 tabular-nums">{formatCurrency(items.reduce((s, i) => s + (parseFloat(i.price || i.unit_price || 0) * (i.quantity || 1)), 0))}</span>
                        </div>
                        {parseFloat((order as any).shipping_cost || '0') > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Delivery Charges</span>
                                <span className="font-bold text-slate-700 tabular-nums">+{formatCurrency(parseFloat((order as any).shipping_cost))}</span>
                            </div>
                        )}
                        {parseFloat((order as any).discount || '0') > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Discount</span>
                                <span className="font-bold text-rose-600 tabular-nums">-{formatCurrency(parseFloat((order as any).discount))}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-900 font-black uppercase text-[12px]">Total Amount</span>
                            <span className="font-black text-indigo-600 text-[16px] tabular-nums">{formatCurrency(totalAmount)}</span>
                        </div>
                        {paidAmount > 0 && (
                            <div className="flex justify-between pt-1">
                                <span className="text-emerald-600 font-bold uppercase text-[11px]">Total Paid</span>
                                <span className="font-bold text-emerald-600 tabular-nums">{formatCurrency(paidAmount)}</span>
                            </div>
                        )}
                        {balance > 0 && (
                            <div className="flex justify-between">
                                <span className="text-rose-600 font-black uppercase text-[11px]">Remaining Balance</span>
                                <span className="font-black text-rose-600 tabular-nums">{formatCurrency(balance)}</span>
                            </div>
                        )}
                        {balance > 0 && (order as any).due_date && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-bold uppercase text-[11px]">Due Date</span>
                                <span className="font-bold text-slate-700 tabular-nums">{formatDate((order as any).due_date)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="print:hidden">
                    <BulkBar
                        sel={sel}
                        entity="line items"
                        onExport={() => exportToCSV(
                            sel.selectedItems.map((item: any, idx: number) => {
                                const price = parseFloat(item.price || item.unit_price || 0);
                                const qty = item.quantity || 1;
                                return {
                                    line: idx + 1,
                                    invoice: order.order_number || String(order.id),
                                    product: item.product_name || item.name || '',
                                    quantity: qty,
                                    unit_price: price,
                                    total: price * qty,
                                };
                            }),
                            `invoice-${order.order_number || order.id}-items.csv`,
                        )}
                    />
                </div>

                <InvoiceFooter />
            </div>

            <style jsx global>{invoiceStyles}</style>
        </div>
    );
}
