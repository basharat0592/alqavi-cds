'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
    Plus, X, AlertTriangle, Save, ChevronDown, Search, Package
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { companyService } from '@/services/company.service';
import { userService } from '@/services/user.service';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, ui } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN DESIGN SYSTEM - ADD RETURN (indigo / slate)
   ───────────────────────────────────────────────────────────────────────────── */
const inputCls = ui.inputBase;
const selectCls = `${inputCls} cursor-pointer`;

const EMPTY_FORM = {
    return_number: '', supplier_name: '', return_date: new Date().toISOString().slice(0, 10),
    purchase_order: '', status: 'WAITING_FOR_SUPPLIER', reason: '',
};

type LineItem = { product: string; product_name: string; quantity: number | ''; refund_price: number; max_quantity?: number };

/* Professional searchable product picker (with image + stock). Renders its menu in a
   portal with fixed positioning so the table's overflow never clips it. */
const ProductSelector = ({ value, products, onSelect, disabled }: {
    value: string;
    products: any[];
    onSelect: (p: any) => void;
    disabled?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const reposition = () => {
        const r = anchorRef.current?.getBoundingClientRect();
        if (r) setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 340) });
    };

    useEffect(() => {
        if (!open) return;
        reposition();
        // Close on page scroll, but NOT when scrolling inside the dropdown's own list.
        const onScroll = (e: Event) => {
            if (popRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        const onResize = () => setOpen(false);
        const onClick = (e: MouseEvent) => {
            if (anchorRef.current?.contains(e.target as Node)) return;
            if (popRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        document.addEventListener('mousedown', onClick);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('mousedown', onClick);
        };
    }, [open]);

    const selected = products.find(p => String(p.product) === String(value));
    const filtered = products.filter(p => (p.product_name || '').toLowerCase().includes(search.toLowerCase()));

    return (
        <>
            <button
                type="button"
                ref={anchorRef}
                disabled={disabled}
                onClick={() => { if (!disabled) { setSearch(''); setOpen(o => !o); } }}
                className={selectCls + ' flex items-center justify-between gap-2 text-left disabled:opacity-60 disabled:cursor-not-allowed'}
            >
                <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
                    {selected ? `${selected.product_name} (${selected.total_quantity} in stock)` : (disabled ? 'Select supplier first...' : 'Select product...')}
                </span>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && coords && createPortal(
                <div
                    ref={popRef}
                    style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 1001 }}
                    className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
                >
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search products..."
                                className="w-full h-9 pl-8 pr-3 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-[13px] text-slate-400 italic">No matching products</div>
                        ) : filtered.map(p => (
                            <div
                                key={p.id}
                                onClick={() => { onSelect(p); setOpen(false); }}
                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50/50 cursor-pointer border-b last:border-0 border-slate-100"
                            >
                                <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {p.product_image ? (
                                        <img src={getImageUrl(p.product_image)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={16} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-slate-900 truncate">{p.product_name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        <span className={`font-bold ${Number(p.total_quantity) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{p.total_quantity}</span> in stock
                                        {p.sku ? ` · SKU: ${p.sku}` : ''}
                                    </p>
                                </div>
                                <span className="text-[13px] font-black text-slate-900 tabular-nums shrink-0">{formatCurrency(p.price_per_item || 0)}</span>
                            </div>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default function AddPurchaseReturnPage() {
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM, return_number: `PR-${Date.now().toString().slice(-6)}` });
    const [items, setItems] = useState<LineItem[]>([{ product: '', product_name: '', quantity: '', refund_price: 0 }]);

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
        const validItems = items
            .filter(i => i.product && Number(i.quantity) > 0)
            .map(({ max_quantity, ...i }) => ({ ...i, quantity: Number(i.quantity), product: i.product }));
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

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: '', refund_price: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const sItem = stocks.find(s => String(s.product) === String(val));
                const max = sItem ? Number(sItem.total_quantity) || 0 : 0;
                const q = typeof item.quantity === 'number' && max ? Math.min(item.quantity, max) : item.quantity;
                return {
                    ...item,
                    product: val,
                    product_name: sItem?.product_name || '',
                    refund_price: sItem?.price_per_item ? parseFloat(sItem.price_per_item) : item.refund_price,
                    max_quantity: max,
                    quantity: q,
                };
            }
            if (field === 'quantity') {
                if (val === '' || val === null || val === undefined) return { ...item, quantity: '' };
                const max = item.max_quantity || Infinity;
                return { ...item, quantity: Math.min(Math.max(1, Math.floor(Number(val)) || 1), max) };
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
        <div className="pb-20">
            <div className="max-w-[1100px] mx-auto">

                <PageHeader
                    title="New Purchase Return"
                    breadcrumbs={[
                        { label: 'Console', href: '/admin/dashboard' },
                        { label: 'Purchases', href: '/admin/purchases' },
                        { label: 'Returns', href: '/admin/purchases/returns' },
                        { label: 'New Purchase Return' },
                    ]}
                />

                {loading ? (
                    <div className="py-20 text-center text-slate-500 text-[14px]">Loading return form...</div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 items-start">

                        {/* LEFT: Form Body */}
                        <div className="flex-1 min-w-0 space-y-6">

                            {/* Return Info */}
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Return Information</h2>
                                    <p className="text-[12px] text-slate-500">Basic details for identifying this return record.</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-slate-700">Return ID</label>
                                        <input className={inputCls + " " + ui.inputDisabled} value={form.return_number} disabled />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-slate-700">Supplier *</label>
                                        <select
                                            className={selectCls}
                                            value={form.supplier_name}
                                            onChange={e => {
                                                setForm(f => ({ ...f, supplier_name: e.target.value }));
                                                setItems([{ product: '', product_name: '', quantity: '', refund_price: 0 }]); // Reset items when supplier changes
                                            }}
                                        >
                                            <option value="">Select Supplier...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-slate-700">Return Date *</label>
                                        <input type="date" className={inputCls} value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} />
                                    </div>
                                </div>
                            </Card>

                            {/* Reason */}
                            <Card>
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Reason for Return</h2>
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
                                        className="w-full h-24 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                                        value={form.reason}
                                        onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                        placeholder="Write detailed manual reason here..."
                                    />
                                </div>
                            </Card>

                            {/* Table of Items */}
                            <Card className="overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">Return Items</h2>
                                        <p className="text-[12px] text-slate-500">Specify the products being returned and their refund prices.</p>
                                    </div>
                                    <button onClick={addItem} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                                        <Plus size={14} /> ADD ITEM
                                    </button>
                                </div>
                                <div className="p-0 table-fixed w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/60 border-b border-slate-100">
                                            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                <th className="px-6 py-2.5">Product Selector (In Stock)</th>
                                                <th className="px-4 py-2.5 text-center w-24">Qty</th>
                                                <th className="px-4 py-2.5 text-right w-32">Refund/Item</th>
                                                <th className="px-4 py-2.5 text-right w-32">Subtotal</th>
                                                <th className="px-6 py-2.5 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.map((item, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <ProductSelector
                                                            value={item.product}
                                                            products={availableProducts.filter(s => s.product)}
                                                            onSelect={(p) => updateItem(i, 'product', p.product)}
                                                            disabled={!form.supplier_name}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            className={inputCls + " text-center tabular-nums"}
                                                            value={item.quantity}
                                                            onChange={e => updateItem(i, 'quantity', e.target.value)}
                                                            min="1"
                                                            max={item.max_quantity || undefined}
                                                            title={item.max_quantity ? `Max ${item.max_quantity} in stock` : undefined}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="number" className={inputCls + " text-right font-bold text-slate-900 tabular-nums"} value={item.refund_price} onChange={e => updateItem(i, 'refund_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-[14px] font-bold text-slate-900 tabular-nums">{formatCurrency((item.quantity || 0) * (item.refund_price || 0))}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-rose-600 transition-colors"><X size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50/60 border-t border-slate-200">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-3 text-right text-[13px] font-bold text-slate-700">Total Refund Amount:</td>
                                                <td className="px-4 py-3 text-right text-[18px] font-black text-slate-900 tabular-nums">{formatCurrency(refundTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* RIGHT: Actions Summary */}
                        <div className="w-full lg:w-[280px] shrink-0 space-y-4 sticky top-6">
                            <Card className="p-5 space-y-4">
                                <h3 className="text-[16px] font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-2">Finalize Record</h3>
                                <p className="text-[11px] text-slate-500">Please ensure all return quantities and refund values are verified with the supplier.</p>

                                <Button className="w-full" size="md" onClick={handleSave} disabled={saving}>
                                    <Save size={16} /> {saving ? 'Saving...' : 'Save Record'}
                                </Button>

                                <button onClick={() => router.back()} className="w-full text-[13px] text-slate-500 hover:text-slate-700 text-center">
                                    Cancel & Discard
                                </button>
                            </Card>

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
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
