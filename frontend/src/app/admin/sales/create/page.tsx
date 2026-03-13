'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productService, orderService, userService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
    ArrowLeft, User, Package, Calculator, Save, Loader2,
    ShoppingBag, Search, X, Trash2, Plus, CheckCircle, Tag, Globe, Truck, DollarSign, Receipt
} from 'lucide-react';

// ── Components ────────────────────────────────────────────────────────────────
const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon?: any }) => (
    <div className="bg-[#f6f6f6] dark:bg-slate-800 px-4 py-2 border-b border-[#ddd] dark:border-slate-800 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
        <span className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{title}</span>
    </div>
);

const INPUT = (err?: boolean) =>
    `w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded text-sm outline-none transition-all
    focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-gray-400
    ${err ? 'border-red-600' : 'border-[#a6a6a6] dark:border-slate-700'}`;

const LABEL = 'block text-xs font-bold text-gray-900 dark:text-gray-200 mb-1';

interface OrderItem {
    product: any;
    quantity: number;
    price: number;
}

export default function CreateOrderPage() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState('');

    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
    const [notes, setNotes] = useState('');
    const [market, setMarket] = useState('Pakistan');
    const [shippingMethod, setShippingMethod] = useState('Standard Delivery');
    const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [p, c] = await Promise.all([
                    productService.getAll?.() ?? Promise.resolve([]),
                    userService.getAll?.() ?? Promise.resolve([])
                ]);
                setProducts(Array.isArray(p) ? p : []);
                setCustomers(Array.isArray(c) ? c.filter((u: any) => (u.role_name || '').toLowerCase() === 'customer' || !u.role_name) : []);
            } catch { }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const subtotal = useMemo(() => selectedItems.reduce((s, i) => s + (i.price * i.quantity), 0), [selectedItems]);

    const addItem = (id: string) => {
        const prod = products.find(p => String(p.id) === id);
        if (!prod) return;
        const exists = selectedItems.find(i => i.product.id === prod.id);
        if (exists) {
            setSelectedItems(prev => prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setSelectedItems(prev => [...prev, { product: prod, quantity: 1, price: parseFloat(prod.price || 0) }]);
        }
    };

    const updateQty = (id: any, q: number) => {
        if (q < 1) return;
        setSelectedItems(prev => prev.map(i => i.product.id === id ? { ...i, quantity: q } : i));
    };

    const removeItem = (id: any) => setSelectedItems(prev => prev.filter(i => i.product.id !== id));

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handleSave = async () => {
        if (!selectedCustomer) return alert('Select a customer profile.');
        if (selectedItems.length === 0) return alert('Add items to order manifest.');

        setIsSaving(true);
        try {
            await orderService.create({
                order_number: `ORD-${Date.now().toString().slice(-6)}`,
                total_amount: subtotal,
                status: 'pending',
                customer: selectedCustomer.id,
                payment_method: paymentMethod,
                shipping_method: shippingMethod,
                market,
                notes,
                items: selectedItems.map(i => ({ product_id: i.product.id, quantity: i.quantity, price: i.price }))
            });
            showToast('Order recorded successfully.');
            setTimeout(() => router.push('/admin/sales'), 1500);
        } catch {
            alert('Sync failure. Profile not saved.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin" strokeWidth={3} />
        </div>
    );

    return (
        <div className="max-w-[1000px] mx-auto py-8 px-4 font-sans">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-normal text-gray-900 dark:text-white flex items-center gap-3">
                    <ShoppingBag className="w-6 h-6 text-[#FF9900]" /> New Sales Entry
                </h1>
                <Link href="/admin/sales" className="text-xs font-bold text-gray-400 hover:text-[#C45500] hover:underline flex items-center gap-1 uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4" /> Back to ledger
                </Link>
            </div>

            <SectionCard>
                <SectionHeader title="Transaction Manifest" icon={Receipt} />
                <div className="p-6 space-y-8">

                    {/* Customer Info */}
                    <div>
                        <label className={LABEL}>Customer Profile <span className="text-red-700">*</span></label>
                        <select
                            value={selectedCustomer?.id || ''}
                            onChange={e => setSelectedCustomer(customers.find(c => String(c.id) === e.target.value))}
                            className={INPUT()}
                        >
                            <option value="">Select registry entry...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                            ))}
                        </select>
                    </div>

                    {/* Items Section */}
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <label className={LABEL}>Product Assignment</label>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedItems.length} Entries</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select
                                    onChange={e => { if (e.target.value) { addItem(e.target.value); e.target.value = ''; } }}
                                    className={`${INPUT()} pl-10`}
                                >
                                    <option value="">Quick Add Product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedItems.length > 0 ? (
                            <div className="border border-[#ddd] dark:border-slate-800 rounded overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-[#f6f6f6] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-800 text-[10px] uppercase font-bold text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2">Item</th>
                                            <th className="px-4 py-2 text-center">Qty</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2 text-right">Subtotal</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {selectedItems.map((item, i) => (
                                            <tr key={i} className="text-xs">
                                                <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-200">{item.product.name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={e => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 text-center bg-gray-50 dark:bg-slate-800 border-none outline-none font-bold"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                                                <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.price * item.quantity)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => removeItem(item.product.id)} className="text-gray-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-10 text-center bg-gray-50 dark:bg-slate-800/20 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No assigned items in this manifest.</p>
                            </div>
                        )}
                    </div>

                    {/* Logistics & Payment */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <div>
                            <label className={LABEL}>Market Axis</label>
                            <select value={market} onChange={e => setMarket(e.target.value)} className={INPUT()}>
                                <option value="Pakistan">Pakistan (Local)</option>
                                <option value="International">International</option>
                            </select>
                        </div>
                        <div>
                            <label className={LABEL}>Logistic Mode</label>
                            <select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className={INPUT()}>
                                <option value="Standard Delivery">Standard</option>
                                <option value="Express Logistics">Express</option>
                            </select>
                        </div>
                        <div>
                            <label className={LABEL}>Payment Instrument</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={INPUT()}>
                                <option value="Cash on Delivery">Cash on Delivery</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                        <label className={LABEL}>Memo / Internal Registry Notes</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className={`${INPUT()} resize-none`}
                            placeholder="Add registry context or delivery instructions..."
                        />
                    </div>
                </div>

                <div className="bg-[#f6f6f6] dark:bg-slate-800/50 px-6 py-6 border-t border-[#ddd] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Payload Valuation</p>
                        <p className="text-3xl font-black text-[#FF9900] tracking-tighter">{formatCurrency(subtotal)}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.back()} disabled={isSaving} className="px-5 py-2 bg-white dark:bg-slate-700 border border-[#adb1b8] dark:border-slate-600 rounded text-xs font-bold shadow-sm transition-colors">
                            Cancel Registry
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || selectedItems.length === 0 || !selectedCustomer}
                            className="px-8 py-2 bg-[#f0c14b] hover:bg-[#ebae1e] border border-[#a88734] rounded text-xs font-bold text-[#111] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Commit Transaction
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* Toast Feedback */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-[#131921] text-white px-5 py-3 rounded shadow-2xl flex items-center gap-3 min-w-[240px] border-l-4 border-[#FF9900] z-[100] animate-in slide-in-from-bottom-5">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-bold uppercase tracking-tight">{toast}</span>
                </div>
            )}
        </div>
    );
}
