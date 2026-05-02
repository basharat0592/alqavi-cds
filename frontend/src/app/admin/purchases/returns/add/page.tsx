'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, RefreshCw, X, CheckCircle, AlertTriangle, Loader2, Package, ChevronRight, ArrowLeft, RefreshCcw, Save
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - ADD RETURN
   ───────────────────────────────────────────────────────────────────────────── */
const Btn = ({ children, onClick, loading, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
    const styles = {
        primary: 'bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border-[#a88734] hover:from-[#f5d78e] hover:to-[#eeb933] text-[#0f1111]',
        secondary: 'bg-gradient-to-b from-[#f7f8fa] to-[#e7e9ec] border-[#adb1b8] hover:from-[#eef1f3] hover:to-[#dce0e4] text-[#0f1111]',
    };
    return (
        <button type={type} onClick={onClick} disabled={loading || disabled}
            className={`h-[35px] px-6 rounded-[3px] text-[14px] font-medium border transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${styles[variant as keyof typeof styles]} ${className}`}>
            {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );
};

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";
const selectCls = `${inputCls} cursor-pointer`;

const EMPTY_FORM = {
    return_number: '', supplier_name: '', return_date: new Date().toISOString().slice(0, 10),
    purchase_order: '', status: 'WAITING_FOR_SUPPLIER', reason: '',
};

type LineItem = { product: string; product_name: string; quantity: number; refund_price: number };

export default function AddPurchaseReturnPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM, return_number: `PR-${Date.now().toString().slice(-6)}` });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: 1, refund_price: 0 }]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [po, stockRes, supRes, userRes] = await Promise.allSettled([
                purchaseService.getAll(),
                inventoryService.getInventory(),
                companyService.getSuppliers(),
                userService.getAll()
            ]);

            const poArr = po.status === 'fulfilled' ? (Array.isArray(po.value) ? po.value : (po.value as any)?.results || []) : [];
            const stArr = stockRes.status === 'fulfilled' ? (Array.isArray(stockRes.value) ? stockRes.value : (stockRes.value as any)?.results || []) : [];

            setPurchases(poArr);
            setStocks(stArr);

            // Mappings for suppliers dropdown
            const fromUsers = userRes.status === 'fulfilled' ? (Array.isArray(userRes.value) ? userRes.value : []).filter((u: any) => (u.role_name || '').toLowerCase().includes('supplier')).map((u: any) => ({
                id: u.id, name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
            })) : [];

            const fromCompany = supRes.status === 'fulfilled' ? (Array.isArray(supRes.value) ? supRes.value : []).map((s: any) => ({
                id: s.id, name: s.company || s.name
            })) : [];

            const mergedSuppliers = Array.from(new Map([...fromCompany, ...fromUsers].map(s => [s.name, s])).values());
            setSuppliers(mergedSuppliers);

        } catch (err) {
            console.error(err);
            toast.error('Failed to load shared data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        // Validate items
        const validItems = items.filter(i => i.product && i.quantity > 0).map(i => ({
            ...i,
            product: i.product
        }));
        if (validItems.length === 0) {
            toast.error('Please select at least one product to return');
            return;
        }

        setSaving(true);
        try {
            await purchaseService.createReturn({
                ...form,
                items: validItems
            });
            toast.success('Return record created successfully');
            router.push('/admin/purchases/returns');
        } catch (e: any) {
            toast.error(e?.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, refund_price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const sItem = stocks.find(s => String(s.product) === String(val));
                return { ...item, product: val, product_name: sItem?.product_name || '', refund_price: sItem?.price_per_item ? parseFloat(sItem.price_per_item) : item.refund_price };
            }
            return { ...item, [field]: val };
        }));
    };

    // Filtered products based on supplier and stock levels
    const availableProducts = stocks.filter(s =>
        String(s.supplier_name).toLowerCase() === String(form.supplier_name).toLowerCase() &&
        Number(s.total_quantity) > 0
    );

    const refundTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.refund_price || 0), 0);

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-20 font-sans text-[#0f1111]">
            <div className="max-w-[1100px] mx-auto px-6 pt-5">

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-2">
                    <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/purchases" className="hover:text-[#c45500] hover:underline">Purchases</Link>
                    <ChevronRight size={10} />
                    <Link href="/admin/purchases/returns" className="hover:text-[#c45500] hover:underline">Returns</Link>
                    <ChevronRight size={10} />
                    <span className="text-[#c45500]">New Return</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[22px] font-normal italic">New Purchase Return</h1>
                    <button onClick={() => router.back()} className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1">
                        <ArrowLeft size={14} /> Back to List
                    </button>
                </div>
                <div className="border-b border-[#ddd] mb-6" />

                {loading ? (
                    <div className="py-20 text-center text-[#565959] text-[14px]">Loading return form...</div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 items-start">

                        {/* LEFT: Form Body */}
                        <div className="flex-1 min-w-0 space-y-6">

                            {/* Return Info */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Return Information</h2>
                                    <p className="text-[12px] text-[#565959]">Basic details for identifying this return record.</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">Return ID</label>
                                        <input className={inputCls + " bg-gray-50 opacity-70"} value={form.return_number} disabled />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">Supplier *</label>
                                        <select
                                            className={selectCls}
                                            value={form.supplier_name}
                                            onChange={e => {
                                                setForm(f => ({ ...f, supplier_name: e.target.value }));
                                                setItems([{ product: '', product_name: '', quantity: 1, refund_price: 0 }]); // Reset items when supplier changes
                                            }}
                                        >
                                            <option value="">Select Supplier...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">Return Date *</label>
                                        <input type="date" className={inputCls} value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[13px] font-bold">Status</label>
                                        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                            <option value="WAITING_FOR_SUPPLIER">Waiting for Supplier</option>
                                            <option value="ACCEPTED">Accepted</option>
                                            <option value="REJECTED">Rejected</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[13px] font-bold">Purchase Order Ref (Optional)</label>
                                        <select className={selectCls} value={form.purchase_order} onChange={e => setForm(f => ({ ...f, purchase_order: e.target.value }))}>
                                            <option value="">None / Standalone</option>
                                            {purchases.map(p => <option key={p.id} value={p.id}>{p.purchase_number}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa]">
                                    <h2 className="text-[14px] font-bold">Reason for Return</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <select 
                                        className={selectCls}
                                        onChange={e => {
                                            if (e.target.value !== 'manual') {
                                                setForm(f => ({ ...f, reason: e.target.value }));
                                            } else {
                                                setForm(f => ({ ...f, reason: '' }));
                                            }
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>-- Select a Reason Preset (Optional) --</option>
                                        <option value="Damaged items received">Damaged items received</option>
                                        <option value="Expired product batch">Expired product batch</option>
                                        <option value="Incorrect quantity delivered">Incorrect quantity delivered</option>
                                        <option value="Incorrect items delivered">Incorrect items delivered</option>
                                        <option value="Quality issues / Defects">Quality issues / Defects</option>
                                        <option value="manual">Manual Entry / Other</option>
                                    </select>
                                    
                                    <textarea
                                        className="w-full h-24 px-3 py-2 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] resize-none"
                                        value={form.reason}
                                        onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                        placeholder="Write detailed manual reason here..."
                                    />
                                </div>
                            </div>

                            {/* Table of Items */}
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#ddd] bg-[#f7f8fa] flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[14px] font-bold">Return Items</h2>
                                        <p className="text-[12px] text-[#565959]">Specify the products being returned and their refund prices.</p>
                                    </div>
                                    <button onClick={addItem} className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline font-bold flex items-center gap-1">
                                        <Plus size={14} /> ADD ITEM
                                    </button>
                                </div>
                                <div className="p-0 table-fixed w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#fcfcfc] border-b border-[#eee]">
                                            <tr className="text-[11px] font-bold uppercase tracking-wider text-[#565959]">
                                                <th className="px-6 py-2.5">Product Selector (In Stock)</th>
                                                <th className="px-4 py-2.5 text-center w-24">Qty</th>
                                                <th className="px-4 py-2.5 text-right w-32">Refund/Item</th>
                                                <th className="px-4 py-2.5 text-right w-32">Subtotal</th>
                                                <th className="px-6 py-2.5 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#eee]">
                                            {items.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <select
                                                            className={selectCls}
                                                            value={item.product}
                                                            onChange={e => updateItem(i, 'product', e.target.value)}
                                                            disabled={!form.supplier_name}
                                                        >
                                                            <option value="">{form.supplier_name ? 'Select product...' : 'Select supplier first...'}</option>
                                                            {availableProducts.filter(s => s.product).map(s => (
                                                                <option key={s.id} value={s.product}>
                                                                    {s.product_name} ({s.total_quantity} Unit{s.total_quantity !== 1 ? 's' : ''} in stock)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="number" className={inputCls + " text-center"} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} min="1" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="number" className={inputCls + " text-right font-bold text-[#111]"} value={item.refund_price} onChange={e => updateItem(i, 'refund_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-[14px] font-bold text-[#b12704]">{formatCurrency((item.quantity || 0) * (item.refund_price || 0))}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <button onClick={() => removeItem(i)} className="text-[#888] hover:text-red-600 transition-colors"><X size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-[#f7f8fa] border-t border-[#ddd]">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-3 text-right text-[13px] font-bold">Total Refund Amount:</td>
                                                <td className="px-4 py-3 text-right text-[18px] font-black text-[#b12704]">{formatCurrency(refundTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Actions Summary */}
                        <div className="w-full lg:w-[280px] shrink-0 space-y-4 sticky top-6">
                            <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm p-5 space-y-4">
                                <h3 className="text-[16px] font-bold border-b border-[#eee] pb-2">Finalize Record</h3>
                                <p className="text-[11px] text-[#565959]">Please ensure all return quantities and refund values are verified with the supplier.</p>

                                <Btn className="w-full" onClick={handleSave} loading={saving}>
                                    <Save size={16} /> Save Record
                                </Btn>

                                <button onClick={() => router.back()} className="w-full text-[13px] text-[#565959] hover:text-[#c45500] hover:underline text-center">
                                    Cancel & Discard
                                </button>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-[4px] p-4 flex gap-3 items-start">
                                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-700 leading-normal">
                                    Creating a return record will not automatically revert stock. Please manually adjust warehouse inventory if physical items were returned.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
